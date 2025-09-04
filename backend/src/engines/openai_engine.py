# src/engines/openai_engine.py
"""
Wrapper de utilidades para la OpenAI Python >= 1.0.
Expone dos funciones:

    • fetch_response()    → texto “crudo” del modelo
    • extract_insights()  → JSON rico para dashboards

Todas las llamadas usan la nueva sintaxis v1 (`client.chat.completions.create`).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError

# ───────────────────────── Config ──────────────────────────
load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ─────────────────── Funciones del Engine ──────────────────
def fetch_response(
    prompt: str,
    *,
    model: str = "gpt-4o-mini",
    temperature: float = 0.3,
    max_tokens: int = 1_024,
) -> str:
    """
    Envía un prompt y devuelve la respuesta textual del modelo.
    Usa gpt-4o-mini por defecto por ser rápido y económico.
    """
    try:
        res = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente útil. Sigue exactamente las instrucciones del usuario.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
        answer: str = res.choices[0].message.content.strip()
        return answer
    except OpenAIError as exc:
        logger.exception("❌ OpenAI API error en fetch_response: %s", exc)
        raise


def extract_insights(text: str) -> Dict[str, Any]:
    """
    Analiza el CONTENIDO y devuelve un JSON listo para la tabla `insights`.
    Utiliza un modelo más potente (gpt-4o) para asegurar alta calidad en el análisis.
    """
    prompt = f"""
Eres un **analista senior de inteligencia de mercado**.

1️⃣ Lee atentamente el CONTENIDO.
2️⃣ Identifica **todas las MARCAS o productos** citados.
3️⃣ Cuenta cuántas veces aparece cada marca.
4️⃣ Evalúa el **sentimiento promedio** hacia cada marca (−1 a 1).
5️⃣ Detecta **competidores** relevantes.
6️⃣ Extrae **insights accionables** en: opportunities, risks, pain_points, trends.
7️⃣ Añade **hasta 3 QUOTES** literales (≤ 200 caracteres) que representen el tono.
8️⃣ Identifica los temas más importantes (top_themes) y su frecuencia (topic_frequency).
9️⃣ Si se citan dominios (ej. forbes.com), anótalos en source_mentions.
🔟 Extrae "calls_to_action", público objetivo (audience_targeting) y productos/features.

Devuelve SOLO un objeto **JSON** con este formato EXACTO:

{{
  "brands": [{{"name": "...", "mentions": <int>, "sentiment_avg": <float>}}],
  "competitors": ["...", "..."],
  "opportunities": ["...", "..."],
  "risks": ["...", "..."],
  "pain_points": ["...", "..."],
  "trends": ["...", "..."],
  "quotes": ["...", "..."],
  "top_themes": ["...", "..."],
  "topic_frequency": {{"keyword": <int>}},
  "source_mentions": {{"domain": <int>}},
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
    # Usamos gpt-4o explícitamente para la máxima calidad en el análisis
    raw = fetch_response(prompt, model="gpt-4o", temperature=0.2, max_tokens=2048)
    try:
        # Intenta limpiar la respuesta si viene en un bloque de código markdown
        if raw.startswith("```json"):
            raw = raw[7:-3].strip()
        data: Dict[str, Any] = json.loads(raw)
        return data
    except (json.JSONDecodeError, TypeError) as exc:
        logger.error("❌ Error extrayendo insights: %s\nRespuesta del modelo: %s", exc, raw)
        return {}