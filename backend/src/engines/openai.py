# src/engines/openai.py
"""
Wrapper de utilidades para la **OpenAI Python >= 1.0**.
Expone tres funciones:

    • fetch_response()    → texto “crudo” del modelo
    • analyze_sentiment() → (sentiment, emotion, confidence)
    • extract_insights()  → JSON rico para dashboards

Todas las llamadas usan la nueva sintaxis v1 (`client.chat.completions.create`).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Tuple

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

# ───────────────────────── Config ──────────────────────────
load_dotenv()  # lee .env local o variables de VPS
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ─────────────────── Funciones auxiliares ──────────────────
def fetch_response(
    prompt: str,
    *,
    model: str = "gpt-4o-mini",
    temperature: float = 0.3,
    max_tokens: int = 1_024,
) -> str:
    """
    Envía un prompt y devuelve la **respuesta textual** del modelo.
    Deja trazas en el log para debugging.
    """
    try:
        res = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente útil. "
                        "Sigue exactamente las instrucciones del usuario."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        answer: str = res.choices[0].message.content.strip()
        return answer
    except OpenAIError as exc:  # errores propios del SDK
        logger.exception("❌ OpenAI API error: %s", exc)
        raise


def analyze_sentiment(text: str) -> Tuple[float, str, float]:
    """
    Devuelve (sentiment, emotion, confidence) a partir de un bloque de texto.
      • sentiment  ∈ [-1, 1]   (<0 negativo, >0 positivo)
      • emotion    ∈ {alegría, tristeza, …}
      • confidence ∈ [0, 1]
    """
    meta_prompt = (
        'Responde SOLO con JSON con tres campos: '
        '{"sentiment": -0.25, "emotion": "alegría", "confidence": 0.87}.\n\n'
        "Texto a analizar:\n"
    )
    raw = fetch_response(meta_prompt + text, temperature=0)
    try:
        obj = json.loads(raw)
        return (
            float(obj.get("sentiment", 0)),
            str(obj.get("emotion", "neutral")),
            float(obj.get("confidence", 0.5)),
        )
    except Exception as exc:
        logger.error("❌ Error parsing sentiment JSON: %s -- raw: %s", exc, raw)
        return 0.0, "neutral", 0.5


def extract_insights(text: str) -> Dict[str, Any]:
    """
    Analiza el CONTENIDO (p.ej. respuesta larga de GPT-4 / Perplexity / SERP)
    y devuelve un JSON listo para guardarse en la tabla **insights**.

    El prompt genera:
      • brands (nombre, nº menciones, sentimiento medio)
      • competitors
      • opportunities / risks / pain_points / trends
      • quotes
      • top_themes / topic_frequency / source_mentions / calls_to_action
      • audience_targeting / products_or_features
    """
    prompt = f"""
Eres un **analista senior de inteligencia de mercado**.

1️⃣ Lee atentamente el CONTENIDO.  
2️⃣ Identifica **todas las MARCAS o productos** citados.  
3️⃣ Cuenta cuántas veces aparece cada marca.  
4️⃣ Evalúa el **sentimiento promedio** hacia cada marca (−1 … 1).  
5️⃣ Detecta **competidores** relevantes.  
6️⃣ Extrae **insights accionables** agrupados en:
   • opportunities – crecimientos, tendencias favorables  
   • risks         – amenazas, críticas, quejas recurrentes  
   • pain_points   – fricciones (logística, precio, sabor…)  
   • trends        – comportamientos emergentes (healthy, vegan, premium…)  
7️⃣ Añade **hasta 3 QUOTES** literales (≤ 200 caracteres) que representen el tono.  
8️⃣ Identifica los temas más importantes tratados (top themes).  
9️⃣ Cuenta las **palabras clave frecuentes** (≥ 2 repeticiones).  
🔟 Si se citan dominios (ej. forbes.com, builtin.com), indica cuántas veces.  
1️⃣1️⃣ Si hay frases tipo *“las empresas deberían…”*, guárdalas como calls_to_action.  
1️⃣2️⃣ Si se infiere un público objetivo claro (ej. CFOs, startups), indícalo.  
1️⃣3️⃣ Lista funcionalidades o productos destacados (ej. Corporate Cards, AP Automation).

Devuelve SOLO un objeto **JSON** con este formato EXACTO:

{{
  "brands": [{{"name": "...", "mentions": <int>, "sentiment_avg": <float>}}, …],
  "competitors": ["...", "..."],
  "opportunities": ["...", "..."],
  "risks": ["...", "..."],
  "pain_points": ["...", "..."],
  "trends": ["...", "..."],
  "quotes": ["...", "..."],
  "top_themes": ["...", "..."],
  "topic_frequency": {{"keyword": <int>, ...}},
  "source_mentions": {{"domain": <int>, ...}},
  "calls_to_action": ["...", "..."],
  "audience_targeting": ["...", "..."],
  "products_or_features": ["...", "..."]
}}

No añadas texto fuera del JSON.
----------
CONTENIDO:
{text}
----------
"""
    raw = fetch_response(prompt, temperature=0.2, max_tokens=1800)
    try:
        data: Dict[str, Any] = json.loads(raw)
        return data
    except Exception as exc:
        logger.error("❌ Error extracting insights: %s\nRespuesta del modelo: %s", exc, raw)
        return {}


# ─────────────────────── Ejemplo CLI ───────────────────────
if __name__ == "__main__":
    SAMPLE = (
        "Rho ha aumentado su presencia en medios como Forbes y BuiltIn. "
        "Los CFOs destacan sus herramientas de automatización de pagos y tarjetas corporativas. "
        "Algunos piden mejoras en integraciones con ERPs. Las empresas deberían adoptar más soluciones integradas."
    )
    print(json.dumps(extract_insights(SAMPLE), indent=2, ensure_ascii=False))
