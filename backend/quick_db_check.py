#!/usr/bin/env python3
"""
Script rápido para ver el contenido de la base de datos
"""

import psycopg2
from dotenv import load_dotenv
import os
import json

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 5433)),
    database=os.getenv('DB_NAME', 'ai_visibility'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)

cur = conn.cursor()

print("📊 CONTENIDO DE LA BASE DE DATOS")
print("=" * 50)

# 1. Queries
print("\n🔍 QUERIES:")
cur.execute("SELECT id, query, brand FROM queries LIMIT 10")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} (Marca: {row[2]})")

# 2. Menciones recientes con respuestas
print("\n💬 ÚLTIMAS 5 MENCIONES (con respuestas):")
cur.execute("""
    SELECT 
        m.id,
        m.response,
        m.sentiment,
        q.query
    FROM mentions m
    JOIN queries q ON m.query_id = q.id
    ORDER BY m.created_at DESC
    LIMIT 5
""")

for i, row in enumerate(cur.fetchall(), 1):
    print(f"\n  {i}. ID: {row[0]} | Sentiment: {row[3] or 'N/A'}")
    print(f"     Query: \"{row[3][:60]}...\"")
    print(f"     Respuesta: \"{row[1][:100]}...\"")

# 3. Estadísticas generales
print("\n📈 ESTADÍSTICAS:")
cur.execute("SELECT COUNT(*) FROM mentions")
total_mentions = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM mentions WHERE sentiment > 0.2")
positive_mentions = cur.fetchone()[0]

cur.execute("SELECT AVG(sentiment) FROM mentions WHERE sentiment IS NOT NULL")
avg_sentiment = cur.fetchone()[0]

print(f"  Total menciones: {total_mentions}")
print(f"  Menciones positivas (>0.2): {positive_mentions}")
print(f"  Sentiment promedio: {avg_sentiment:.3f}" if avg_sentiment else "  Sentiment promedio: N/A")

if total_mentions > 0:
    visibility = (positive_mentions / total_mentions) * 100
    print(f"  Visibility general: {visibility:.1f}%")

cur.close()
conn.close()
