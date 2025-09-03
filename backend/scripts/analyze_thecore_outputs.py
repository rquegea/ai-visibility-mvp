#!/usr/bin/env python3
"""
Script para analizar los outputs específicos de The Core
y recomendar optimizaciones para el frontend
"""
import requests
import json
import psycopg2
from datetime import datetime

def analyze_api_outputs():
    """Analizar qué devuelven las APIs para The Core"""
    base_url = "http://localhost:5050"
    
    print("🔍 ANÁLISIS DE OUTPUTS PARA THE CORE")
    print("=" * 50)
    
    # 1. Visibility Analysis
    print("\n📊 1. VISIBILITY ANALYSIS")
    print("-" * 30)
    try:
        response = requests.get(f"{base_url}/api/visibility")
        if response.status_code == 200:
            data = response.json()
            print(f"   Visibility Score: {data.get('visibility_score', 'N/A')}%")
            print(f"   Brand: {data.get('brand', 'N/A')}")
            print(f"   Ranking entries: {len(data.get('ranking', []))}")
            
            # Mostrar estructura del ranking
            ranking = data.get('ranking', [])
            if ranking:
                print("   Sample ranking entry structure:")
                sample = ranking[0]
                for key, value in sample.items():
                    print(f"     - {key}: {type(value).__name__}")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Connection error: {str(e)}")
    
    # 2. Mentions Analysis
    print("\n💬 2. MENTIONS ANALYSIS")
    print("-" * 30)
    try:
        response = requests.get(f"{base_url}/api/mentions?limit=3")
        if response.status_code == 200:
            data = response.json()
            mentions = data.get('mentions', [])
            total = data.get('pagination', {}).get('total', 0)
            
            print(f"   Total mentions: {total}")
            print(f"   Showing: {len(mentions)}")
            
            if mentions:
                print("   Sample mention structure:")
                sample = mentions[0]
                for key, value in sample.items():
                    if key == 'response':
                        print(f"     - {key}: {len(str(value))} chars")
                    else:
                        print(f"     - {key}: {value}")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Connection error: {str(e)}")
    
    # 3. Topics Analysis
    print("\n🏷️  3. TOPICS ANALYSIS")
    print("-" * 30)
    try:
        response = requests.get(f"{base_url}/api/topics")
        if response.status_code == 200:
            data = response.json()
            words = data.get('words', [])
            print(f"   Total topic words: {len(words)}")
            
            if words:
                print("   Top 5 topics:")
                for i, word in enumerate(words[:5], 1):
                    print(f"     {i}. {word.get('text', 'N/A')} (count: {word.get('count', 'N/A')})")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Connection error: {str(e)}")
    
    # 4. Insights Analysis
    print("\n💡 4. INSIGHTS ANALYSIS")
    print("-" * 30)
    try:
        response = requests.get(f"{base_url}/api/insights")
        if response.status_code == 200:
            insights = response.json()
            print(f"   Total insights: {len(insights)}")
            
            if insights:
                print("   Sample insight structure:")
                sample = insights[0]
                for key, value in sample.items():
                    if isinstance(value, dict):
                        print(f"     - {key}: dict with keys {list(value.keys())}")
                    elif isinstance(value, list):
                        print(f"     - {key}: list with {len(value)} items")
                    else:
                        print(f"     - {key}: {type(value).__name__}")
        else:
            print(f"   ❌ Error: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Connection error: {str(e)}")

def analyze_database_content():
    """Analizar contenido específico de The Core en la DB"""
    print("\n\n🗄️  DATABASE ANALYSIS FOR THE CORE")
    print("=" * 50)
    
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="ai_visibility",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()
    
    # 1. Query Topics Breakdown
    print("\n📝 1. QUERY TOPICS BREAKDOWN")
    print("-" * 35)
    cur.execute("""
        SELECT topic, COUNT(*) as query_count,
               AVG(CASE WHEN i.id IS NOT NULL THEN 1 ELSE 0 END) as avg_insights_per_query
        FROM queries q
        LEFT JOIN insights i ON q.id = i.query_id
        WHERE q.brand = 'The Core'
        GROUP BY topic
        ORDER BY query_count DESC
    """)
    
    for row in cur.fetchall():
        topic, count, avg_insights = row
        print(f"   {topic}: {count} queries, {avg_insights:.1f} avg insights")
    
    # 2. Content Analysis by Topic
    print("\n🎯 2. CONTENT THEMES BY TOPIC")
    print("-" * 35)
    cur.execute("""
        SELECT q.topic, q.query, 
               COUNT(DISTINCT m.id) as mention_count,
               COUNT(DISTINCT i.id) as insight_count
        FROM queries q
        LEFT JOIN mentions m ON q.id = m.query_id
        LEFT JOIN insights i ON q.id = i.query_id
        WHERE q.brand = 'The Core'
        GROUP BY q.id, q.topic, q.query
        ORDER BY q.topic, mention_count DESC
    """)
    
    current_topic = None
    for row in cur.fetchall():
        topic, query, mentions, insights = row
        if topic != current_topic:
            print(f"\n   📂 {topic}:")
            current_topic = topic
        
        query_preview = query[:60] + "..." if len(query) > 60 else query
        print(f"      - {query_preview}")
        print(f"        └─ {mentions} mentions, {insights} insights")
    
    # 3. Sentiment Analysis
    print("\n😊 3. SENTIMENT BREAKDOWN")
    print("-" * 25)
    cur.execute("""
        SELECT sentiment, emotion, COUNT(*) as count
        FROM mentions m
        JOIN queries q ON m.query_id = q.id
        WHERE q.brand = 'The Core'
        GROUP BY sentiment, emotion
        ORDER BY count DESC
    """)
    
    for row in cur.fetchall():
        sentiment, emotion, count = row
        print(f"   {sentiment} ({emotion}): {count} mentions")
    
    cur.close()
    conn.close()

def recommend_frontend_optimizations():
    """Recomendar optimizaciones específicas para el frontend"""
    print("\n\n🎨 RECOMENDACIONES PARA FRONTEND")
    print("=" * 40)
    
    print("\n1. 📊 DASHBOARD PRINCIPAL:")
    print("   - KPI de visibilidad general de The Core")
    print("   - Gráfico comparativo por topic (Target Audience, Competition, etc.)")
    print("   - Sentiment breakdown específico del sector audiovisual")
    print("   - Timeline de menciones por fecha")
    
    print("\n2. 🎯 PÁGINA DE ANÁLISIS POR TEMA:")
    print("   - Target Audience Research: Datos demográficos de jóvenes 16-25")
    print("   - Competitive Analysis: Comparativa con FP, universidades, academias")
    print("   - Parents Concerns: Pain points y argumentos persuasivos")
    print("   - Digital Marketing: Canales efectivos y formatos de contenido")
    
    print("\n3. 💡 INSIGHTS ESPECÍFICOS:")
    print("   - Oportunidades específicas para The Core")
    print("   - Riesgos identificados en el sector")
    print("   - Tendencias emergentes en formación audiovisual")
    print("   - Calls to action recomendadas")
    
    print("\n4. 🔍 BÚSQUEDA Y FILTROS:")
    print("   - Filtro por tema (Parents Concerns, Digital Marketing, etc.)")
    print("   - Filtro por tipo de insight (oportunidades, riesgos, tendencias)")
    print("   - Búsqueda por keywords del sector audiovisual")
    print("   - Exportar insights por tema")
    
    print("\n5. 📈 VISUALIZACIONES ESPECÍFICAS:")
    print("   - Word cloud de términos del sector audiovisual")
    print("   - Mapa de calor de temas más discutidos")
    print("   - Gráfico de barras de canales digitales efectivos")
    print("   - Timeline de triggers que interesan a jóvenes")

if __name__ == "__main__":
    analyze_api_outputs()
    analyze_database_content()
    recommend_frontend_optimizations()
    
    print("\n\n🚀 NEXT STEPS:")
    print("1. Ejecutar este script: python analyze_thecore_outputs.py")
    print("2. Modificar componentes del frontend según las recomendaciones")
    print("3. Crear vistas específicas para cada tema de The Core")
    print("4. Implementar filtros por topic y tipo de insight")