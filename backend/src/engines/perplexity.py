import os
import requests
from dotenv import load_dotenv

load_dotenv()

PPLX_KEY = os.getenv("PERPLEXITY_API_KEY")
API_URL  = "https://api.perplexity.ai/chat/completions"   #  ← ESTO Faltaba
HEADERS  = {
    "Authorization": f"Bearer {PPLX_KEY}",
    "Content-Type": "application/json"
}

def fetch_perplexity_response(query: str) -> str:
    body = {
        "model": "sonar-reasoning",                # modelo disponible en cuentas free
        "messages": [{"role": "user", "content": query}],
        "temperature": 0.7
    }
    resp = requests.post(API_URL, headers=HEADERS, json=body)
    if resp.status_code != 200:
        print("🔴 PPLX error detail:", resp.text)  # mostrará la causa exacta
        resp.raise_for_status()

    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()
