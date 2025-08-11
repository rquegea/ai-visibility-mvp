# scripts/view_insights.py

import psycopg2
import json
from datetime import datetime

DB_CFG = dict(
    host="localhost",
    port=5433,
    database="ai_visibility",
    user="postgres",
    password="postgres",
)

def main():
    with psycopg2.connect(**DB_CFG) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT i.id, q.query, i.payload, i.created_at
                FROM insights i
                JOIN queries q ON i.query_id = q.id
                ORDER BY i.id DESC
            """)
            rows = cur.fetchall()

            for row in rows:
                id_, query, payload, created_at = row
                print("="*80)
                print(f"[{id_}] {created_at.strftime('%Y-%m-%d %H:%M:%S')}")
                print(f"🔍 QUERY: {query}")
                print("📦 INSIGHTS:")
                print(json.dumps(payload, indent=2, ensure_ascii=False))
                print()

if __name__ == "__main__":
    main()

