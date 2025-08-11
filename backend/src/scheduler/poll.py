# src/scheduler/poll.py

import os
import time
import json
import logging
from datetime import datetime, timezone
from typing import Callable, Union

import psycopg2

from src.engines.openai import fetch_response, analyze_sentiment, extract_insights
from src.engines.perplexity import fetch_perplexity_response
from src.engines.serp import get_search_results as fetch_serp_response
from src.utils.slack import send_slack_alert

logging.basicConfig(
    filename="logs/poll.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

SENTIMENT_THRESHOLD = -0.3

DB_CFG = dict(
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", 5433)),
    database=os.getenv("POSTGRES_DB", "ai_visibility"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "postgres"),
)

# ────────────── helpers DB ─────────────────────
def insert_mention(cur, query_id: int, engine: str, source: str,
                   text: str, sentiment: float, emotion: str, confidence: float,
                   source_title: Union[str, None] = None,
                   source_url: Union[str, None] = None):
    cur.execute(
        """
        INSERT INTO mentions
            (query_id, engine, source, response,
             sentiment, emotion, confidence_score,
             language, created_at, source_title, source_url)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
        RETURNING id
        """,
        (
            query_id, engine, source, text,
            sentiment, emotion, confidence,
            "auto", datetime.now(timezone.utc),
            source_title, source_url
        ),
    )
    return cur.fetchone()[0]


def insert_insights(cur, query_id: int, insights_payload: dict):
    cur.execute(
        """
        INSERT INTO insights (query_id, payload)
        VALUES (%s, %s)
        """,
        (query_id, json.dumps(insights_payload)),
    )


def run_engine(name: str, fetch_fn: Callable[[str], Union[str, list]],
               query_id: int, query_text: str, cur) -> None:
    logging.info("▶ %s | query «%s»", name, query_text)

    try:
        if name == "serpapi":
            # fetch_serp_response devuelve lista de resultados
            results = fetch_fn(query_text)
            if not results:
                logging.warning("⚠️ serpapi sin resultados para: %s", query_text)
                return

            # Concatenar títulos/snippets para análisis
            response_text = ""
            for res in results[:5]:  # top 5
                title = res.get("title", "")
                snippet = res.get("snippet", "")
                source = res.get("source", "")
                response_text += f"Fuente: {source}\nTítulo: {title}\nResumen: {snippet}\n\n"

            # Datos del primer resultado para guardar en DB
            first_result = results[0]
            source_title = first_result.get("title", "")
            source_url = first_result.get("url", "")
        else:
            response_text = fetch_fn(query_text)
            source_title = None
            source_url = None

        sentiment, emotion, confidence = analyze_sentiment(response_text)
        mention_id = insert_mention(
            cur, query_id, name, name.lower(),
            response_text, sentiment, emotion, confidence,
            source_title, source_url,
        )

        if name in {"gpt-4", "pplx-7b-chat"} or (name == "serpapi" and len(response_text) > 400):
            insights = extract_insights(response_text)
            if insights:
                insert_insights(cur, query_id, insights)

        if sentiment < SENTIMENT_THRESHOLD:
            send_slack_alert(query_text, sentiment, response_text)

        logging.info("✓ %s guardado (mention_id=%s)", name, mention_id)

    except Exception as exc:
        logging.exception("❌ %s error: %s", name, exc)


def main(loop_once: bool = True, sleep_seconds: int = 6 * 3600):
    logging.info("🔄 Polling service started")
    while True:
        with psycopg2.connect(**DB_CFG) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id, query FROM queries WHERE enabled = TRUE")
                for query_id, query_text in cur.fetchall():
                    print(f"\n🔍 Buscando menciones para query: {query_text}")
                    for name, fn in (
                        ("gpt-4",        lambda q: fetch_response(q, model="gpt-4o-mini")),
                        ("pplx-7b-chat", fetch_perplexity_response),
                        ("serpapi",      fetch_serp_response),
                    ):
                        run_engine(name, fn, query_id, query_text, cur)
                conn.commit()

        logging.info("🛑 Polling cycle finished")
        if loop_once:
            break
        time.sleep(sleep_seconds)


if __name__ == "__main__":
    main(loop_once=True)
