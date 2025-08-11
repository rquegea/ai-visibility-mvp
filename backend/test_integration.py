#!/usr/bin/env python3
"""
Script de pruebas de integración para AI Visibility MVP
"""

import requests
import json
import time
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:5050"
FRONTEND_URL = "http://localhost:3000"

def test_backend_endpoints():
    """Probar endpoints del backend directamente"""
    print("🧪 Probando endpoints del backend...")
    
    endpoints = [
        "/health",
        "/api/mentions",
        "/api/visibility",
        "/api/insights",
        "/api/topics",
        "/api/queries"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {endpoint} - Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   📊 Respuesta: {len(json.dumps(data))} caracteres")
        except Exception as e:
            print(f"❌ {endpoint} - Error: {str(e)}")
    
    print()

if __name__ == "__main__":
    print("🚀 Iniciando pruebas de integración AI Visibility MVP")
    print("=" * 60)
    
    test_backend_endpoints()
    
    print("🏁 Pruebas completadas!")
