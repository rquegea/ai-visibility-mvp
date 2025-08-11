#!/usr/bin/env python3
"""
Script para inspeccionar el contenido real de los insights
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

print("🔍 INSPECCIÓN DETALLADA DE INSIGHTS")
print("=" * 50)

# Obtener 3 insights para ver su contenido exacto
cur.execute("""
    SELECT 
        i.id,
        i.query_id,
        i.payload,
        q.query
    FROM insights i
    JOIN queries q ON i.query_id = q.id
    ORDER BY i.created_at DESC
    LIMIT 3
""")

insights = cur.fetchall()

for i, row in enumerate(insights, 1):
    insight_id = row[0]
    query_id = row[1]
    payload = row[2]
    query_text = row[3]
    
    print(f"\n�� INSIGHT {i} (ID: {insight_id}, Query: {query_id})")
    print(f"Query: \"{query_text[:60]}...\"")
    print(f"Payload keys: {list(payload.keys()) if payload else 'None'}")
    
    if payload:
        # Mostrar contenido de cada categoría
        for category in ['opportunities', 'risks', 'trends']:
            if category in payload and payload[category]:
                items = payload[category]
                print(f"\n{category.upper()} ({len(items)} items):")
                for j, item in enumerate(items[:2], 1):  # Solo primeros 2
                    print(f"  {j}. \"{item[:80]}...\"" if len(item) > 80 else f"  {j}. \"{item}\"")
                if len(items) > 2:
                    print(f"  ... y {len(items) - 2} más")
            else:
                print(f"\n{category.upper()}: Sin datos")

print("\n🔍 ANÁLISIS:")
print("Si ves exactamente 4 items en cada categoría = Hay límite artificial")
print("Si ves contenido variado = Los insights son naturales")
print("Si ves texto repetitivo = Problema en generación de insights")

# Verificar si hay patrones en el contenido
print("\n📈 ESTADÍSTICAS DE LONGITUD:")
cur.execute("""
    SELECT 
        jsonb_array_length(payload->'opportunities') as opp_count,
        jsonb_array_length(payload->'risks') as risk_count,
        jsonb_array_length(payload->'trends') as trend_count
    FROM insights 
    WHERE payload ? 'opportunities' AND payload ? 'risks' AND payload ? 'trends'
    LIMIT 10
""")

stats = cur.fetchall()
for i, row in enumerate(stats, 1):
    print(f"  Insight {i}: Opp={row[0]}, Risks={row[1]}, Trends={row[2]}")

cur.close()
conn.close()

print(f"\n💡 RECOMENDACIÓN:")
print("Si todo tiene exactamente 4 items, buscar en:")
print("  - src/analysis/ (límites de generación)")
print("  - Prompts de LLM (plantillas fijas)")
print("  - Código que procesa las respuestas")
