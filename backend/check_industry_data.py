#!/usr/bin/env python3
"""
Script para verificar qué datos tenemos para la página Industry
"""

import psycopg2
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

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

def check_mentions_data():
    """Verificar menciones existentes"""
    print("🔍 VERIFICANDO MENCIONES EN LA BASE DE DATOS")
    print("=" * 60)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Total de menciones
    cur.execute("SELECT COUNT(*) FROM mentions")
    total_mentions = cur.fetchone()[0]
    print(f"📊 Total menciones: {total_mentions}")
    
    if total_mentions == 0:
        print("❌ No hay menciones en la base de datos")
        cur.close()
        conn.close()
        return False
    
    # Menciones por fecha (últimos 7 días)
    cur.execute("""
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM mentions 
        WHERE created_at >= %s 
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    """, [datetime.now() - timedelta(days=7)])
    
    date_counts = cur.fetchall()
    print(f"\n📅 Menciones por día (últimos 7 días):")
    for date, count in date_counts:
        print(f"   {date}: {count} menciones")
    
    # Ver sample de menciones para identificar marcas
    cur.execute("""
        SELECT response, sentiment, engine, source
        FROM mentions 
        ORDER BY created_at DESC 
        LIMIT 10
    """)
    
    samples = cur.fetchall()
    print(f"\n📝 Muestra de menciones (para identificar marcas):")
    for i, (response, sentiment, engine, source) in enumerate(samples, 1):
        print(f"\n   {i}. Respuesta: {response[:100]}...")
        print(f"      Sentimiento: {sentiment}")
        print(f"      Engine: {engine}")
        print(f"      Source: {source}")
    
    cur.close()
    conn.close()
    return True

def analyze_brand_mentions():
    """Analizar menciones por marca"""
    print("\n\n🏢 ANALIZANDO MENCIONES POR MARCA")
    print("=" * 60)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Buscar marcas mencionadas en las respuestas
    brand_keywords = {
        'Rho': ['rho', 'rho business'],
        'Chase': ['chase', 'jp morgan chase', 'jpmorgan'],
        'American Express': ['american express', 'amex'],
        'Capital One': ['capital one'],
        'Brex': ['brex'],
        'Mercury': ['mercury', 'mercury bank'],
        'Stripe': ['stripe'],
        'Square': ['square'],
        'PayPal': ['paypal'],
        'Wells Fargo': ['wells fargo']
    }
    
    brand_counts = {}
    sentiment_by_brand = {}
    
    for brand_name, keywords in brand_keywords.items():
        # Crear condición WHERE para buscar cualquiera de las keywords
        conditions = " OR ".join([f"LOWER(response) LIKE LOWER('%{keyword}%')" for keyword in keywords])
        
        query = f"""
        SELECT 
            COUNT(*) as mentions,
            AVG(sentiment) as avg_sentiment,
            COUNT(CASE WHEN sentiment > 0.2 THEN 1 END) as positive,
            COUNT(CASE WHEN sentiment < -0.2 THEN 1 END) as negative,
            COUNT(CASE WHEN sentiment BETWEEN -0.2 AND 0.2 THEN 1 END) as neutral
        FROM mentions 
        WHERE {conditions}
        """
        
        cur.execute(query)
        result = cur.fetchone()
        
        if result and result[0] > 0:
            mentions, avg_sentiment, positive, negative, neutral = result
            brand_counts[brand_name] = {
                'mentions': mentions,
                'avg_sentiment': float(avg_sentiment) if avg_sentiment else 0.0,
                'positive': positive,
                'negative': negative,
                'neutral': neutral
            }
    
    # Mostrar resultados
    print("📈 Menciones por marca encontradas:")
    if not brand_counts:
        print("❌ No se encontraron menciones de marcas específicas")
        print("💡 Esto puede indicar que las respuestas no mencionan marcas específicas")
        print("   o que necesitamos ajustar los keywords de búsqueda")
    else:
        for brand, data in sorted(brand_counts.items(), key=lambda x: x[1]['mentions'], reverse=True):
            print(f"\n   🏢 {brand}:")
            print(f"      Menciones: {data['mentions']}")
            print(f"      Sentimiento promedio: {data['avg_sentiment']:.3f}")
            print(f"      Positivas: {data['positive']} | Neutrales: {data['neutral']} | Negativas: {data['negative']}")
    
    cur.close()
    conn.close()
    return brand_counts

def check_queries_and_responses():
    """Verificar qué queries tenemos y sus respuestas"""
    print("\n\n🔍 VERIFICANDO QUERIES Y RESPUESTAS")
    print("=" * 60)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # Ver queries configuradas
    cur.execute("SELECT id, query, brand, topic FROM queries ORDER BY created_at DESC")
    queries = cur.fetchall()
    
    print("📋 Queries configuradas:")
    for query_id, query_text, brand, topic in queries:
        print(f"   ID {query_id}: '{query_text}' (Marca: {brand}, Tema: {topic})")
    
    # Ver types de engines
    cur.execute("SELECT DISTINCT engine FROM mentions")
    engines = cur.fetchall()
    print(f"\n🤖 Engines/modelos usados: {[e[0] for e in engines]}")
    
    # Ver sources
    cur.execute("SELECT DISTINCT source FROM mentions LIMIT 10")
    sources = cur.fetchall()
    print(f"\n📡 Sources (muestra): {[s[0] for s in sources]}")
    
    cur.close()
    conn.close()

def generate_sample_industry_data():
    """Generar datos de ejemplo basados en lo que encontremos"""
    print("\n\n💡 RECOMENDACIONES PARA INDUSTRY PAGE")
    print("=" * 60)
    
    print("Basado en el análisis, deberías:")
    print("1. Crear endpoint /api/industry que analice menciones por marca")
    print("2. Implementar análisis de Share of Voice basado en conteo de menciones")
    print("3. Crear scatter plot de Sentimiento vs Menciones por marca")
    print("4. Mostrar ranking de marcas basado en datos reales")
    
    print("\n🔧 Próximos pasos:")
    print("1. Ejecutar este script para ver qué datos tienes")
    print("2. Ajustar keywords de marcas si es necesario")
    print("3. Crear endpoint /api/industry en Flask")
    print("4. Conectar frontend a datos reales")

if __name__ == "__main__":
    try:
        print("🚀 ANÁLISIS DE DATOS PARA INDUSTRY PAGE")
        print("=" * 60)
        
        # Verificar si hay datos
        has_data = check_mentions_data()
        
        if has_data:
            # Analizar menciones por marca
            brand_counts = analyze_brand_mentions()
            
            # Verificar queries y respuestas
            check_queries_and_responses()
            
            # Generar recomendaciones
            generate_sample_industry_data()
        else:
            print("\n❌ No hay datos suficientes en la base de datos")
            print("💡 Primero necesitas ejecutar el scheduler para recopilar datos:")
            print("   cd backend")
            print("   python -c \"from src.scheduler.poll import main; main(loop_once=True)\"")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("💡 Asegúrate de que PostgreSQL esté corriendo y las credenciales sean correctas")