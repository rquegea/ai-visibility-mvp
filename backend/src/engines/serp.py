# backend/src/engines/serp.py (versión corregida)

import os
import logging
from serpapi import GoogleSearch

logger = logging.getLogger(__name__)

def get_search_results(query: str) -> list:
    """
    Devuelve una lista de resultados orgánicos de SERP API.
    Cada resultado es un diccionario con 'title', 'snippet', 'url', etc.
    """
    serpapi_key = os.getenv("SERPAPI_KEY")
    if not serpapi_key:
        logger.warning("⚠️ SERPAPI_KEY no está configurada. Saltando búsqueda.")
        return []

    params = {
        "q": query,
        "api_key": serpapi_key
    }
    try:
        search = GoogleSearch(params)
        results = search.get_dict()

        organic_results = results.get("organic_results", [])
        
        if not organic_results:
            logger.warning("⚠️ SerpAPI no devolvió resultados orgánicos para: '%s'", query)

        return organic_results

    except Exception as e:
        logger.exception("❌ Error en la llamada a SerpAPI: %s", e)
        return []

# Renombramos la función para que coincida con la llamada en poll.py
fetch_serp_response = get_search_results