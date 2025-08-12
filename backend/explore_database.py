#!/usr/bin/env python3
"""
Script para explorar completamente la base de datos AI Visibility
"""

import psycopg2
import os
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Configuración DB
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "database": os.getenv("DB_NAME", "ai_visibility"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def explore_table_structure():
    """Explorar estructura de todas las tablas"""
    print("=" * 80)
    print("📊 ESTRUCTURA DE TABLAS")
    print("=" * 80)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Obtener todas las tablas
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    
    tables = [row[0] for row in cur.fetchall()]
    
    for table in tables:
        print(f"\n🔸 TABLA: {table}")
        print("-" * 50)
        
        # Estructura de la tabla
        cur.execute(f"""
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = '{table}'
            ORDER BY ordinal_position;
        """)
        
        columns = cur.fetchall()
        for col in columns:
            nullable = "NULL" if col[2] == "YES" else "NOT NULL"
            default = f"DEFAULT {col[3]}" if col[3] else ""
            print(f"  - {col[0]:<20} {col[1]:<15} {nullable:<8} {default}")
        
        # Contar registros
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        count = cur.fetchone()[0]
        print(f"  📈 Total registros: {count}")
    
    cur.close()
    conn.close()

def explore_mentions_data():
    """Explorar datos de la tabla mentions"""
    print("\n" + "=" * 80)
    print("🗣️ ANÁLISIS DETALLADO: TABLA MENTIONS")
    print("=" * 80)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Distribución por engine
    print("\n📊 DISTRIBUCIÓN POR ENGINE:")
    cur.execute("""
        SELECT engine, COUNT(*) as count, 
               MIN(created_at) as first_mention,
               MAX(created_at) as last_mention
        FROM mentions 
        GROUP BY engine 
        ORDER BY count DESC
    """)
    
    for row in cur.fetchall():
        print(f"  - {row[0]:<20} {row[1]:>3} mentions  ({row[2]} → {row[3]})")
    
    # 2. Distribución por sentiment
    print("\n💭 DISTRIBUCIÓN POR SENTIMENT:")
    cur.execute("""
        SELECT 
            CASE 
                WHEN sentiment > 0.2 THEN 'Positive (>0.2)'
                WHEN sentiment < -0.2 THEN 'Negative (<-0.2)'
                WHEN sentiment BETWEEN -0.2 AND 0.2 THEN 'Neutral (-0.2 to 0.2)'
                ELSE 'Unknown/NULL'
            END as sentiment_category,
            COUNT(*) as count,
            ROUND(AVG(sentiment)::numeric, 3) as avg_sentiment
        FROM mentions 
        GROUP BY sentiment_category
        ORDER BY count DESC
    """)
    
    for row in cur.fetchall():
        print(f"  - {row[0]:<25} {row[1]:>3} mentions  (avg: {row[2]})")
    
    # 3. Muestras de respuestas por engine
    print("\n📝 MUESTRAS DE RESPUESTAS POR ENGINE:")
    cur.execute("""
        SELECT engine, LEFT(response, 100) as sample, sentiment, emotion
        FROM mentions 
        ORDER BY engine, created_at DESC
    """)
    
    current_engine = None
    count = 0
    for row in cur.fetchall():
        if row[0] != current_engine:
            current_engine = row[0]
            count = 0
            print(f"\n  🔹 {current_engine}:")
        
        if count < 2:  # Solo 2 muestras por engine
            print(f"    └─ \"{row[1]}...\" (sentiment: {row[2]}, emotion: {row[3]})")
            count += 1
    
    cur.close()
    conn.close()

def explore_insights_data():
    """Explorar datos de la tabla insights"""
    print("\n" + "=" * 80)
    print("💡 ANÁLISIS DETALLADO: TABLA INSIGHTS")
    print("=" * 80)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Insights por query
    print("\n📈 INSIGHTS POR QUERY:")
    cur.execute("""
        SELECT q.query, COUNT(i.id) as insight_count,
               MIN(i.created_at) as first_insight,
               MAX(i.created_at) as last_insight
        FROM queries q
        LEFT JOIN insights i ON q.id = i.query_id
        GROUP BY q.id, q.query
        ORDER BY insight_count DESC
    """)
    
    for row in cur.fetchall():
        query_short = row[0][:50] + "..." if len(row[0]) > 50 else row[0]
        print(f"  - {query_short:<53} {row[1]:>2} insights")
    
    # 2. Estructura de payloads
    print("\n🔍 ESTRUCTURA DE PAYLOADS DE INSIGHTS:")
    cur.execute("SELECT payload FROM insights LIMIT 3")
    
    for i, row in enumerate(cur.fetchall(), 1):
        payload = row[0]
        print(f"\n  🔸 Insight {i} - Claves disponibles:")
        if isinstance(payload, dict):
            for key, value in payload.items():
                if isinstance(value, list):
                    print(f"    - {key}: {len(value)} items")
                    if value and len(value) > 0:
                        print(f"      └─ Ejemplo: \"{str(value[0])[:60]}...\"")
                else:
                    print(f"    - {key}: {type(value).__name__}")
        else:
            print(f"    - Payload type: {type(payload)}")
    
    # 3. Análisis de contenido específico
    print("\n📊 ANÁLISIS DE CONTENIDO:")
    cur.execute("""
        SELECT 
            COUNT(*) as total_insights,
            COUNT(CASE WHEN payload ? 'opportunities' THEN 1 END) as with_opportunities,
            COUNT(CASE WHEN payload ? 'risks' THEN 1 END) as with_risks,
            COUNT(CASE WHEN payload ? 'trends' THEN 1 END) as with_trends,
            COUNT(CASE WHEN payload ? 'calls_to_action' THEN 1 END) as with_ctas,
            COUNT(CASE WHEN payload ? 'topic_frequency' THEN 1 END) as with_topics
        FROM insights
    """)
    
    row = cur.fetchone()
    print(f"  - Total insights: {row[0]}")
    print(f"  - Con opportunities: {row[1]}")
    print(f"  - Con risks: {row[2]}")
    print(f"  - Con trends: {row[3]}")
    print(f"  - Con calls_to_action: {row[4]}")
    print(f"  - Con topic_frequency: {row[5]}")
    
    cur.close()
    conn.close()

def explore_queries_data():
    """Explorar datos de la tabla queries"""
    print("\n" + "=" * 80)
    print("❓ ANÁLISIS DETALLADO: TABLA QUERIES")
    print("=" * 80)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # 1. Todas las queries
    print("\n📝 TODAS LAS QUERIES:")
    cur.execute("""
        SELECT id, query, brand, topic, enabled, language, created_at
        FROM queries 
        ORDER BY id
    """)
    
    for row in cur.fetchall():
        status = "✅" if row[4] else "❌"
        print(f"  {row[0]:>2}. {status} \"{row[1][:60]}...\"")
        print(f"      └─ Brand: {row[2]}, Topic: {row[3]}, Lang: {row[5]}")
    
    cur.close()
    conn.close()

def main():
    print("🔍 EXPLORACIÓN COMPLETA DE BASE DE DATOS AI VISIBILITY")
    print(f"⏰ Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        explore_table_structure()
        explore_mentions_data()
        explore_insights_data()
        explore_queries_data()
        
        print("\n" + "=" * 80)
        print("✅ EXPLORACIÓN COMPLETADA")
        print("=" * 80)
        
    except Exception as e:
        print(f"❌ Error durante la exploración: {str(e)}")

if __name__ == "__main__":
    main()