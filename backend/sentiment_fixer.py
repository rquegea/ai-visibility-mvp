#!/usr/bin/env python3
"""
Script para diagnosticar y reparar el sentiment analysis
"""
import os
import json
from dotenv import load_dotenv

def test_sentiment_step_by_step():
    """Probar sentiment paso a paso para encontrar el error exacto"""
    print("🔍 DIAGNÓSTICO PASO A PASO - SENTIMENT ANALYSIS")
    print("=" * 60)
    
    load_dotenv()
    
    # Paso 1: Verificar API Key
    api_key = os.getenv("OPENAI_API_KEY")
    print(f"\n📋 PASO 1: API Key")
    if not api_key:
        print("❌ OPENAI_API_KEY no encontrada")
        print("💡 Solución: Agregar OPENAI_API_KEY=tu_key en .env")
        return False
    else:
        print(f"✅ API Key encontrada: {api_key[:10]}...{api_key[-4:]}")
    
    # Paso 2: Probar importar OpenAI
    print(f"\n📋 PASO 2: Importar OpenAI")
    try:
        import openai
        from openai import OpenAI
        print("✅ OpenAI importado correctamente")
    except ImportError as e:
        print(f"❌ Error importando OpenAI: {e}")
        print("💡 Solución: pip install openai")
        return False
    
    # Paso 3: Crear cliente
    print(f"\n�� PASO 3: Crear cliente OpenAI")
    try:
        client = OpenAI(api_key=api_key)
        print("✅ Cliente OpenAI creado")
    except Exception as e:
        print(f"❌ Error creando cliente: {e}")
        return False
    
    # Paso 4: Probar llamada simple
    print(f"\n📋 PASO 4: Llamada simple de prueba")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Modelo más accesible
            messages=[{"role": "user", "content": "Di solo 'hola'"}],
            max_tokens=10
        )
        result = response.choices[0].message.content
        print(f"✅ Llamada exitosa: '{result}'")
    except Exception as e:
        print(f"❌ Error en llamada: {e}")
        print("💡 Posibles causas:")
        print("   - API Key inválida")
        print("   - Sin crédito/quota")
        print("   - Problema de conexión")
        return False
    
    # Paso 5: Probar análisis de sentiment real
    print(f"\n📋 PASO 5: Análisis de sentiment real")
    
    test_text = "The Core School es una excelente institución educativa con gran inserción laboral"
    
    prompt = f"""
Analiza el siguiente texto y devuelve:
- El sentimiento general como número entre -1 (muy negativo) y 1 (muy positivo).
- La emoción dominante entre: alegría, tristeza, enojo, miedo, sorpresa, neutral.
- Un nivel de confianza (confidence score) entre 0 y 1.

Texto:
\"\"\"{test_text}\"\"\"

Responde en JSON con las claves: sentiment, emotion, confidence.
"""
    
    try:
        print(f"📝 Texto de prueba: {test_text}")
        
        response = client.chat.completions.create(
            model="gpt-4",  # Mismo modelo que usa tu código
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        
        raw_content = response.choices[0].message.content.strip()
        print(f"📥 Respuesta raw de OpenAI:")
        print(f"   {raw_content}")
        
        # Intentar parsear JSON
        try:
            data = json.loads(raw_content)
            sentiment = float(data["sentiment"])
            emotion = data["emotion"]
            confidence = float(data["confidence"])
            
            print(f"✅ Parsing JSON exitoso:")
            print(f"   Sentiment: {sentiment}")
            print(f"   Emotion: {emotion}")
            print(f"   Confidence: {confidence}")
            
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ Error parseando JSON: {e}")
            print(f"💡 La respuesta no es JSON válido")
            return False
            
    except Exception as e:
        print(f"❌ Error en sentiment analysis: {e}")
        print(f"💡 Puede ser problema de modelo o API")
        return False

def fix_sentiment_module():
    """Crear versión corregida del módulo sentiment"""
    print(f"\n🔧 CREANDO VERSIÓN CORREGIDA DE SENTIMENT.PY")
    print("-" * 50)
    
    fixed_sentiment_code = '''import openai
import os
import json
import logging

# Configurar logging para debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cliente OpenAI
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_sentiment(text):
    """
    Versión mejorada con mejor manejo de errores y logging
    """
    prompt = f"""
Analiza el siguiente texto y devuelve el resultado en formato JSON exacto.

Texto a analizar:
\"\"\"{text}\"\"\"

Responde SOLO con este formato JSON (sin texto adicional):
{{"sentiment": 0.8, "emotion": "alegría", "confidence": 0.9}}

Donde:
- sentiment: número entre -1 (muy negativo) y 1 (muy positivo)  
- emotion: alegría, tristeza, enojo, miedo, sorpresa, neutral
- confidence: número entre 0 y 1
"""
    
    try:
        logger.info(f"Analizando sentiment para texto de {len(text)} caracteres")
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # Modelo más confiable y barato
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,  # Muy baja para consistencia
            max_tokens=100    # Suficiente para JSON simple
        )

        content = response.choices[0].message.content.strip()
        logger.info(f"Respuesta OpenAI: {content}")
        
        # Limpiar respuesta (remover markdown si existe)
        if content.startswith('```'):
            content = content.split('\\n')[1:-1]
            content = '\\n'.join(content)
        
        data = json.loads(content)
        
        sentiment = float(data.get("sentiment", 0))
        emotion = str(data.get("emotion", "neutral"))
        confidence = float(data.get("confidence", 0.5))
        
        logger.info(f"Resultado: sentiment={sentiment}, emotion={emotion}, confidence={confidence}")
        
        return sentiment, emotion, confidence

    except json.JSONDecodeError as e:
        logger.error(f"Error JSON: {e} | Respuesta: {content}")
        return 0.0, "neutral", 0.0
        
    except Exception as e:
        logger.error(f"Error OpenAI: {e}")
        return 0.0, "neutral", 0.0

if __name__ == "__main__":
    # Test del módulo
    test_texts = [
        "The Core School es excelente",
        "No me gusta nada esta escuela", 
        "Es una institución normal"
    ]
    
    for text in test_texts:
        result = analyze_sentiment(text)
        print(f"Texto: {text}")
        print(f"Resultado: {result}")
        print("-" * 30)
'''
    
    # Guardar archivo corregido
    with open("src/engines/sentiment_fixed.py", "w") as f:
        f.write(fixed_sentiment_code)
    
    print("✅ Creado: src/engines/sentiment_fixed.py")
    print("💡 Para probarlo: python src/engines/sentiment_fixed.py")

def main():
    success = test_sentiment_step_by_step()
    
    if not success:
        print(f"\n❌ SENTIMENT ANALYSIS NO FUNCIONA")
        print("🔧 Problemas más comunes:")
        print("1. OPENAI_API_KEY faltante o inválida")
        print("2. Sin crédito en cuenta OpenAI") 
        print("3. Modelo gpt-4 no accesible (probar gpt-3.5-turbo)")
        print("4. Problema de conexión a internet")
    else:
        print(f"\n✅ SENTIMENT ANALYSIS FUNCIONA CORRECTAMENTE")
        print("🔧 El problema puede estar en:")
        print("1. Cómo se llama la función desde el sistema principal")
        print("2. Variables de entorno en el contexto de ejecución")
        print("3. Diferente API key entre prueba y producción")
    
    fix_sentiment_module()
    
    print(f"\n📋 PRÓXIMOS PASOS:")
    print("1. Ejecutar: python src/engines/sentiment_fixed.py")
    print("2. Si funciona, reemplazar sentiment.py con sentiment_fixed.py")
    print("3. Reiniciar el sistema completo")
    print("4. Volver a ejecutar query_1_analyzer.py para verificar")

if __name__ == "__main__":
    main()
