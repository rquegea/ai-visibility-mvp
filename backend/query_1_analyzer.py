#!/usr/bin/env python3
"""
Script para analizar específicamente la Query 1 y ver toda su información
"""
import psycopg2
from dotenv import load_dotenv
import os
import json
from datetime import datetime

load_dotenv()

def analyze_query_1():
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 5433)),
        database=os.getenv('DB_NAME', 'ai_visibility'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )
    
    cur = conn.cursor()
    
    print("🔍 ANÁLISIS COMPLETO DE QUERY 1")
    print("=" * 70)
    
    # 1. Información básica de la Query 1
    cur.execute("""
        SELECT id, query, brand, enabled, created_at, topic, language
        FROM queries 
        WHERE id = 1
    """)
    
    query_info = cur.fetchone()
    if not query_info:
        print("❌ Query 1 no encontrada")
        return
        
    qid, query_text, brand, enabled, created, topic, language = query_info
    
    print(f"📋 INFORMACIÓN BÁSICA:")
    print(f"   ID: {qid}")
    print(f"   Query: {query_text}")
    print(f"   Marca: {brand}")
    print(f"   Tema: {topic}")
    print(f"   Idioma: {language}")
    print(f"   Estado: {'✅ Activa' if enabled else '❌ Inactiva'}")
    print(f"   Creada: {created}")
    
    # 2. Menciones de Query 1
    cur.execute("""
        SELECT 
            m.id,
            m.source_url,
            m.source_title,
            m.response,
            m.source,
            m.engine,
            m.sentiment,
            m.emotion,
            m.confidence,
            m.created_at
        FROM mentions m
        WHERE m.query_id = 1
        ORDER BY m.created_at DESC
    """)
    
    mentions = cur.fetchall()
    print(f"\n💬 MENCIONES DE QUERY 1 ({len(mentions)} total):")
    print("-" * 50)
    
    for i, mention in enumerate(mentions, 1):
        mid, url, title, response, source, engine, sentiment, emotion, confidence, created = mention
        
        print(f"\n🔸 MENCIÓN #{i} (ID: {mid})")
        print(f"   📅 Fecha: {created}")
        print(f"   🤖 Motor: {engine}")
        print(f"   📡 Fuente: {source}")
        print(f"   🌐 URL: {url[:80] if url else 'N/A'}...")
        print(f"   📰 Título: {title[:80] if title else 'N/A'}...")
        print(f"   😊 Sentiment: {sentiment} | Emoción: {emotion} | Confianza: {confidence}")
        
        # Mostrar respuesta de IA (primeros 300 caracteres)
        if response:
            print(f"   🤖 Respuesta OpenAI:")
            print(f"      {response[:300]}...")
            print(f"      [Total: {len(response)} caracteres]")
        else:
            print(f"   🤖 Respuesta OpenAI: Sin respuesta")
    
    # 3. Insights de Query 1
    cur.execute("""
        SELECT 
            i.id,
            i.payload,
            i.created_at
        FROM insights i
        WHERE i.query_id = 1
        ORDER BY i.created_at DESC
    """)
    
    insights = cur.fetchall()
    print(f"\n🧠 INSIGHTS DE QUERY 1 ({len(insights)} total):")
    print("-" * 50)
    
    for i, insight in enumerate(insights, 1):
        iid, payload, created = insight
        
        print(f"\n🔸 INSIGHT #{i} (ID: {iid})")
        print(f"   📅 Fecha: {created}")
        
        if payload:
            print(f"   🗂️ Estructura del payload:")
            for key, value in payload.items():
                if isinstance(value, list):
                    print(f"      {key}: {len(value)} items")
                elif isinstance(value, dict):
                    print(f"      {key}: {len(value)} keys")
                else:
                    print(f"      {key}: {type(value).__name__}")
            
            # Mostrar contenido detallado de cada sección
            sections = ['opportunities', 'risks', 'trends', 'brands', 'quotes', 'calls_to_action']
            
            for section in sections:
                if section in payload and payload[section]:
                    items = payload[section]
                    print(f"\n   📊 {section.upper()}:")
                    
                    if isinstance(items, list):
                        for j, item in enumerate(items[:3], 1):  # Máximo 3 items
                            if isinstance(item, str):
                                preview = item[:100] + "..." if len(item) > 100 else item
                                print(f"      {j}. {preview}")
                            else:
                                print(f"      {j}. {item}")
                        if len(items) > 3:
                            print(f"      ... y {len(items) - 3} más")
                    
                    elif isinstance(items, dict):
                        for key, value in list(items.items())[:5]:  # Máximo 5 keys
                            print(f"      {key}: {value}")
        else:
            print(f"   ⚠️ Sin payload")
    
    # 4. Análisis de calidad de datos
    print(f"\n📈 ANÁLISIS DE CALIDAD:")
    print("-" * 30)
    
    # Sentiment analysis
    sentiment_values = [m[6] for m in mentions if m[6] is not None]
    if sentiment_values:
        avg_sentiment = sum(sentiment_values) / len(sentiment_values)
        print(f"   😊 Sentiment promedio: {avg_sentiment:.3f}")
        print(f"   📊 Distribución sentiment:")
        positive = len([s for s in sentiment_values if s > 0.2])
        negative = len([s for s in sentiment_values if s < -0.2])
        neutral = len(sentiment_values) - positive - negative
        print(f"      Positivo (>0.2): {positive}")
        print(f"      Neutral (-0.2 to 0.2): {neutral}")
        print(f"      Negativo (<-0.2): {negative}")
    else:
        print(f"   ❌ Sin datos de sentiment válidos")
    
    # Response length analysis
    response_lengths = [len(m[3]) for m in mentions if m[3]]
    if response_lengths:
        avg_length = sum(response_lengths) / len(response_lengths)
        print(f"   �� Longitud promedio respuesta: {avg_length:.0f} caracteres")
        print(f"   📏 Rango: {min(response_lengths)} - {max(response_lengths)} caracteres")
    
    # Insights quality
    if insights:
        payload_sizes = []
        for _, payload, _ in insights:
            if payload:
                total_items = 0
                for key, value in payload.items():
                    if isinstance(value, list):
                        total_items += len(value)
                payload_sizes.append(total_items)
        
        if payload_sizes:
            avg_payload = sum(payload_sizes) / len(payload_sizes)
            print(f"   🧠 Items promedio por insight: {avg_payload:.1f}")
    
    # 5. Recomendaciones específicas
    print(f"\n💡 RECOMENDACIONES PARA QUERY 1:")
    print("-" * 40)
    
    if not sentiment_values or all(s == 0 for s in sentiment_values):
        print("   🔧 CRÍTICO: Sentiment analysis no funciona")
        print("      → Verificar módulo src/engines/sentiment.py")
        print("      → Comprobar OPENAI_API_KEY")
    
    if not mentions:
        print("   🔧 Sin menciones: Query puede no estar siendo procesada")
        
    if not insights:
        print("   🔧 Sin insights: Sistema de análisis puede tener problemas")
    
    if response_lengths and max(response_lengths) < 100:
        print("   🔧 Respuestas muy cortas: Puede necesitar mejores prompts")
    
    cur.close()
    conn.close()

def compare_with_original_query():
    """Comparar datos actuales con la respuesta original esperada"""
    print(f"\n🔄 COMPARACIÓN CON DATOS ESPERADOS:")
    print("-" * 40)
    
    # Basado en tus datos reales, Query 1 debería tener:
    expected_data = {
        "mentions": 2,
        "insights": 2, 
        "sentiment_working": False,
        "query_text": "¿Cuál es la estimación del número de jóvenes en España interesados en carreras audiovisuales?"
    }
    
    print(f"   📊 Esperado vs Real:")
    print(f"      Query: {expected_data['query_text']}")
    print(f"      Menciones esperadas: {expected_data['mentions']}")
    print(f"      Insights esperados: {expected_data['insights']}")
    print(f"      Sentiment esperado: {'❌ No funciona' if not expected_data['sentiment_working'] else '✅ Funciona'}")

if __name__ == "__main__":
    try:
        analyze_query_1()
        compare_with_original_query()
        
        print(f"\n🏁 ANÁLISIS COMPLETADO")
        print(f"📊 Para ver más queries, cambiar 'WHERE id = 1' por el ID deseado")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
