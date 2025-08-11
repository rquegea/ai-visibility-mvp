#!/usr/bin/env python3
"""
Script para verificar si los datos de visibility coinciden con la base de datos
"""

import psycopg2
from dotenv import load_dotenv
import os
import json
import requests

load_dotenv()

# Conexión a DB
conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', 5433)),
    database=os.getenv('DB_NAME', 'ai_visibility'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'postgres')
)

cur = conn.cursor()

print("🔍 VERIFICACIÓN: DATOS DE VISIBILITY vs BASE DE DATOS")
print("=" * 60)

# 1. Verificar qué datos está devolviendo la API
print("\n📡 1. DATOS DE LA API:")
try:
    response = requests.get('http://localhost:5050/api/visibility/by-query')
    if response.status_code == 200:
        api_data = response.json()
        print(f"   Marca: {api_data.get('brand', 'N/A')}")
        print(f"   Número de queries: {len(api_data.get('queries', []))}")
        
        for query in api_data.get('queries', [])[:5]:
            print(f"   Query {query['query_id']}: {query['visibility_percentage']}% visibility")
            print(f"     Total: {query['total_mentions']}, Positivos: {query['brand_mentions']}")
    else:
        print(f"   ❌ Error API: {response.status_code}")
except Exception as e:
    print(f"   ❌ Error conectando API: {str(e)}")

# 2. Verificar datos reales en la base de datos
print("\n🗄️ 2. DATOS REALES EN LA BASE DE DATOS:")

# Verificar insights por query
print("\n   📊 INSIGHTS POR QUERY:")
cur.execute("""
    SELECT 
        q.id,
        q.query,
        COUNT(i.id) as insight_count,
        ARRAY_AGG(i.payload) as payloads
    FROM queries q
    LEFT JOIN insights i ON q.id = i.query_id
    WHERE q.enabled = true
    GROUP BY q.id, q.query
    ORDER BY q.id
    LIMIT 10
""")

insights_data = cur.fetchall()
for row in insights_data:
    query_id = row[0]
    query_text = row[1][:50] + "..." if len(row[1]) > 50 else row[1]
    insight_count = row[2]
    payloads = row[3]
    
    print(f"\n   Query {query_id}: \"{query_text}\"")
    print(f"     Insights: {insight_count}")
    
    if payloads and payloads[0]:  # Si hay al menos un insight
        opportunities = 0
        risks = 0
        trends = 0
        
        for payload in payloads:
            if payload:
                if 'opportunities' in payload:
                    opportunities += len(payload['opportunities'])
                if 'risks' in payload:
                    risks += len(payload['risks'])
                if 'trends' in payload:
                    trends += len(payload['trends'])
        
        total_elements = opportunities + risks + trends
        visibility_real = (opportunities / max(total_elements, 1)) * 100 if total_elements > 0 else 0
        
        print(f"     Opportunities: {opportunities}")
        print(f"     Risks: {risks}")
        print(f"     Trends: {trends}")
        print(f"     Visibility REAL: {visibility_real:.1f}%")
    else:
        print(f"     ❌ No hay insights para esta query")

# 3. Verificar total de insights
print("\n📈 3. ESTADÍSTICAS GENERALES:")
cur.execute("SELECT COUNT(*) FROM insights")
total_insights = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM queries WHERE enabled = true")
total_queries = cur.fetchone()[0]

print(f"   Total insights en DB: {total_insights}")
print(f"   Total queries activas: {total_queries}")

if total_insights == 0:
    print("   ⚠️  NO HAY INSIGHTS - El sistema está usando datos MOCK")
    print("   💡 Para generar insights reales, ejecuta:")
    print("      python -c \"from src.scheduler.poll import main; main(loop_once=True)\"")
else:
    print("   ✅ Hay insights en la DB")

# 4. Verificar si hay patrones sospechosos (como 33.3% repetido)
print("\n🚨 4. DETECCIÓN DE DATOS MOCK:")
if total_insights == 0:
    print("   ❌ CONFIRMADO: Los datos son MOCK porque no hay insights")
    print("   📊 El gráfico muestra datos de ejemplo, no reales")
else:
    print("   ✅ Hay datos reales, verificando cálculos...")

cur.close()
conn.close()

print("\n🎯 CONCLUSIÓN:")
print("   Si ves muchos 33.3% iguales = DATOS MOCK")
print("   Si ves porcentajes variados = DATOS REALES")
print("   Si no hay insights en DB = Sistema usa fallback mock")
