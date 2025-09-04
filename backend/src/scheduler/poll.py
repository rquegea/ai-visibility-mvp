# backend/src/scheduler/poll.py (Versión final y corregida)

import os
import time
import json
import logging
from datetime import datetime, timezone
from typing import Callable, Union, List, Tuple, Dict, Any

import psycopg2

from src.engines.openai_engine import fetch_response, extract_insights
from src.engines.perplexity import fetch_perplexity_response
from src.engines.serp import get_search_results as fetch_serp_response # <-- ÚNICA IMPORTACIÓN CORRECTA
from src.engines.sentiment import analyze_sentiment
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

def summarize_and_extract_topics(text: str) -> Tuple[str, List[str]]:
    prompt = f"""
Analiza el siguiente texto y devuelve un objeto JSON con dos claves:
1. "summary": Un resumen conciso y atractivo del texto en una sola frase (máximo 25 palabras).
2. "key_topics": Una lista de los 3 a 5 temas, marcas o conceptos más importantes mencionados.

Texto a analizar:
\"\"\"{text[:4000]}\"\"\"

Responde únicamente con el JSON.
"""
    try:
        raw_response = fetch_response(prompt, model="gpt-4o-mini", temperature=0.2, max_tokens=300)
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:-3].strip()
        data = json.loads(raw_response)
        summary = data.get("summary", "No se pudo generar un resumen.")
        key_topics = data.get("key_topics", [])
        return summary, key_topics
    except Exception as e:
        logging.error("❌ Error al generar resumen y temas: %s", e)
        return text[:150] + "...", []

def insert_mention(cur, data: Dict[str, Any]):
    cur.execute(
        """
        INSERT INTO mentions (
            query_id, engine, source, response, sentiment, emotion, 
            confidence_score, source_title, source_url, language, created_at,
            summary, key_topics, generated_insight_id
        )
        VALUES (
            %(query_id)s, %(engine)s, %(source)s, %(response)s, %(sentiment)s, %(emotion)s,
            %(confidence)s, %(source_title)s, %(source_url)s, 'auto', %(created_at)s,
            %(summary)s, %(key_topics)s, %(insight_id)s
        )
        RETURNING id
        """,
        data,
    )
    return cur.fetchone()[0]

def insert_insights(cur, query_id: int, insights_payload: dict) -> int:
    cur.execute(
        "INSERT INTO insights (query_id, payload) VALUES (%s, %s) RETURNING id",
        (query_id, json.dumps(insights_payload)),
    )
    return cur.fetchone()[0]

def run_engine(name: str, fetch_fn: Callable[[str], Union[str, list]],
               query_id: int, query_text: str, cur) -> None:
    logging.info("▶ %s | query «%s»", name, query_text)

    try:
        results = fetch_fn(query_text)
        response_text = ""
        source_title = None
        source_url = None

        if name == "serpapi":
            if not isinstance(results, list):
                logging.warning("⚠️ serpapi no devolvió una lista, probablemente por un error de API. Saltando.")
                return
            if not results:
                logging.warning("⚠️ serpapi sin resultados para: %s", query_text)
                return
            response_text = "\n\n".join([f"Fuente: {r.get('source', '')}\nTítulo: {r.get('title', '')}\nResumen: {r.get('snippet', '')}" for r in results[:3]])
            source_title = results[0].get("title")
            source_url = results[0].get("link")
        else:
            response_text = results

        if not response_text or not isinstance(response_text, str):
            logging.warning("⚠️ El motor %s no devolvió una respuesta de texto válida para: %s", name, query_text)
            return

        sentiment, emotion, confidence = analyze_sentiment(response_text)
        summary, key_topics = summarize_and_extract_topics(response_text)
        
        insight_id = None
        if name in {"gpt-4", "pplx-7b-chat"} or (name == "serpapi" and len(response_text) > 300):
            insights_payload = extract_insights(response_text)
            if insights_payload:
                insight_id = insert_insights(cur, query_id, insights_payload)

        mention_data = {
            "query_id": query_id, "engine": name, "source": name.lower(), "response": response_text,
            "sentiment": sentiment, "emotion": emotion, "confidence": confidence,
            "source_title": source_title, "source_url": source_url, "created_at": datetime.now(timezone.utc),
            "summary": summary, "key_topics": key_topics, "insight_id": insight_id
        }

        mention_id = insert_mention(cur, mention_data)

        if sentiment < SENTIMENT_THRESHOLD:
            send_slack_alert(query_text, sentiment, summary)

        logging.info("✓ %s guardado (mention_id=%s, insight_id=%s)", name, mention_id, insight_id)

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
                        ("gpt-4", lambda q: fetch_response(q, model="gpt-4o-mini")),
                        ("pplx-7b-chat", fetch_perplexity_response),
                        ("serpapi", fetch_serp_response),
                    ):
                        run_engine(name, fn, query_id, query_text, cur)
                conn.commit()

        logging.info("🛑 Polling cycle finished")
        if loop_once:
            break
        time.sleep(sleep_seconds)

if __name__ == "__main__":
    main(loop_once=True)