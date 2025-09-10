# backend/src/engines/perplexity.py (versión mejorada)

import os
import requests
import re
import logging
from dotenv import load_dotenv

load_dotenv()

PPLX_KEY = os.getenv("PERPLEXITY_API_KEY")
API_URL  = "[https://api.perplexity.ai/chat/completions](https://api.perplexity.ai/chat/completions)"
HEADERS  = {
    "Authorization": f"Bearer {PPLX_KEY}",
    "Content-Type": "application/json"
}

logger = logging.getLogger(__name__)

def clean_response(text: str) -> str:
    """
    Elimina los bloques <think>...</think> y otros artefactos de Perplexity
    para obtener una respuesta limpia y directa.
    """
    cleaned_text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL)
    return cleaned_text.strip()

def fetch_perplexity_response(query: str) -> str:
    """
    Obtiene una respuesta del modelo online de Perplexity y la limpia.
    """
    body = {
        # Modelo "online" para respuestas más directas y basadas en búsqueda web.
        "model": "sonar-medium-online",
        "messages": [{"role": "user", "content": query}],
        # Temperatura baja para mayor consistencia en los resultados.
        "temperature": 0.3
    }
    try:
        resp = requests.post(API_URL, headers=HEADERS, json=body, timeout=45)
        if resp.status_code != 200:
            logger.error("🔴 PPLX error detail: %s", resp.text)
            resp.raise_for_status()

        data = resp.json()
        raw_response = data["choices"][0]["message"]["content"].strip()
        
        # Devolver la respuesta ya procesada y limpia.
        clean = clean_response(raw_response)
        logger.info("✓ Perplexity respondió y se limpió (largo: %d)", len(clean))
        return clean
    except requests.RequestException as e:
        logger.exception("❌ Error de red en Perplexity: %s", e)
        return f"Error de conexión con Perplexity: {e}"