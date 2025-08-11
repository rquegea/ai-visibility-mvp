import openai
import os
import json

# Usa la nueva sintaxis del cliente OpenAI >=1.0
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_sentiment(text):
    prompt = f"""
Analiza el siguiente texto y devuelve:
- El sentimiento general como número entre -1 (muy negativo) y 1 (muy positivo).
- La emoción dominante entre: alegría, tristeza, enojo, miedo, sorpresa, neutral.
- Un nivel de confianza (confidence score) entre 0 y 1.

Texto:
\"\"\"{text}\"\"\"

Responde en JSON con las claves: sentiment, emotion, confidence.
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        content = response.choices[0].message.content
        data = json.loads(content)
        return float(data["sentiment"]), data["emotion"], float(data["confidence"])

    except Exception as e:
        print(f"⚠️ Sentiment error: {e}")
        return 0.0, "neutral", 0.0
