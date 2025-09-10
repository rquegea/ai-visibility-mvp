# backend/src/engines/sentiment.py (versión final)

import openai
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_sentiment(text: str) -> tuple[float, str, float]:
    """
    Analiza el sentimiento de un texto usando un modelo rápido y económico.
    Devuelve una tupla con (sentiment, emotion, confidence).
    """
    prompt = f"""
Analiza el siguiente texto y devuelve el resultado en formato JSON exacto.

Texto a analizar:
\"\"\"{text[:4000]}\"\"\"  # Limita el texto para no exceder el límite de tokens

Responde SOLO con este formato JSON (sin texto adicional):
{{"sentiment": 0.8, "emotion": "alegría", "confidence": 0.9}}

Donde:
- sentiment: número entre -1 (muy negativo) y 1 (muy positivo)
- emotion: uno de [alegría, tristeza, enojo, miedo, sorpresa, neutral]
- confidence: número entre 0 y 1
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=150
        )

        content = response.choices[0].message.content.strip()
        
        # Limpieza robusta de la respuesta JSON
        if content.startswith('```json'):
            content = content[7:-3].strip()

        data = json.loads(content)
        
        sentiment = float(data.get("sentiment", 0.0))
        emotion = str(data.get("emotion", "neutral"))
        confidence = float(data.get("confidence", 0.5))
        
        logger.info(f"Análisis de sentimiento exitoso: sent={sentiment}, emo='{emotion}'")
        return sentiment, emotion, confidence

    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Error de JSON en sentiment: {e} | Respuesta: '{content}'")
        return 0.0, "neutral", 0.0
        
    except Exception as e:
        logger.exception(f"Error inesperado en OpenAI (sentiment): {e}")
        return 0.0, "neutral", 0.0