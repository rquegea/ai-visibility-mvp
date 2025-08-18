#!/usr/bin/env python3
"""
Script para debuggear endpoints de Industry
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5050"

def test_endpoint(endpoint, description):
    """Probar un endpoint y mostrar resultado"""
    print(f"\n{'='*60}")
    print(f"🧪 PROBANDO: {description}")
    print(f"📡 URL: {BASE_URL}{endpoint}")
    print('='*60)
    
    try:
        response = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Respuesta exitosa")
            print(f"📊 Tamaño JSON: {len(json.dumps(data))} caracteres")
            
            # Mostrar estructura
            if isinstance(data, dict):
                print(f"🔑 Keys principales: {list(data.keys())}")
                
                # Análisis específico por endpoint
                if 'share-of-voice' in endpoint:
                    analyze_sov_data(data)
                elif 'competitors' in endpoint:
                    analyze_competitors_data(data)
                elif 'ranking' in endpoint:
                    analyze_ranking_data(data)
            
            # Mostrar primeras líneas del JSON
            print(f"\n📄 JSON (primeras 500 caracteres):")
            print(json.dumps(data, indent=2)[:500] + "...")
            
        else:
            print(f"❌ Error {response.status_code}")
            print(f"Respuesta: {response.text[:200]}")
            
    except Exception as e:
        print(f"❌ Error de conexión: {str(e)}")

def analyze_sov_data(data):
    """Analizar datos de Share of Voice"""
    print("\n🎯 ANÁLISIS SHARE OF VOICE:")
    
    if 'sov_data' in data:
        sov_data = data['sov_data']
        print(f"   📊 Días de datos: {len(sov_data)}")
        
        if len(sov_data) > 0:
            first_day = sov_data[0]
            print(f"   📅 Primer día: {first_day.get('date', 'N/A')}")
            
            # Contar marcas
            brands = []
            for key in first_day.keys():
                if key != 'date':
                    brands.append(key)
            print(f"   🏪 Marcas encontradas: {brands}")
            
            # Verificar si hay datos numéricos
            for brand in brands[:3]:  # Solo primeras 3 marcas
                value = first_day.get(brand, 0)
                print(f"      - {brand}: {value}%")
        else:
            print("   ⚠️  No hay datos de SOV")
    else:
        print("   ❌ Campo 'sov_data' no encontrado")

def analyze_competitors_data(data):
    """Analizar datos de competidores"""
    print("\n🎯 ANÁLISIS COMPETITORS:")
    
    if 'competitors' in data:
        competitors = data['competitors']
        print(f"   👥 Total competidores: {len(competitors)}")
        
        if len(competitors) > 0:
            for i, comp in enumerate(competitors[:5]):  # Solo primeros 5
                name = comp.get('name', 'N/A')
                mentions = comp.get('mentions', 0)
                sentiment = comp.get('sentiment_avg', 0)
                print(f"      {i+1}. {name}: {mentions} menciones, {sentiment:.3f} sentiment")
        else:
            print("   ⚠️  No hay competidores")
    else:
        print("   ❌ Campo 'competitors' no encontrado")

def analyze_ranking_data(data):
    """Analizar datos de ranking"""
    print("\n🎯 ANÁLISIS RANKING:")
    
    if 'ranking' in data:
        ranking = data['ranking']
        print(f"   🏆 Total en ranking: {len(ranking)}")
        
        if len(ranking) > 0:
            for i, brand in enumerate(ranking[:5]):  # Solo primeros 5
                name = brand.get('name', 'N/A')
                mentions = brand.get('mentions', 0)
                change = brand.get('change', 0)
                print(f"      {i+1}. {name}: {mentions} menciones, cambio: {change}%")
        else:
            print("   ⚠️  No hay datos de ranking")
    else:
        print("   ❌ Campo 'ranking' no encontrado")

def main():
    """Ejecutar todos los tests"""
    print("🚀 DIAGNÓSTICO DE ENDPOINTS INDUSTRY")
    print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test health check
    test_endpoint("/health", "Health Check")
    
    # Test industry endpoints
    test_endpoint("/api/industry/share-of-voice?range=30d", "Share of Voice (30d)")
    test_endpoint("/api/industry/competitors?range=30d", "Competitors (30d)")
    test_endpoint("/api/industry/ranking?range=30d", "Ranking (30d)")
    
    # Test con diferentes rangos
    test_endpoint("/api/industry/share-of-voice?range=7d", "Share of Voice (7d)")
    
    print(f"\n{'='*60}")
    print("🏁 DIAGNÓSTICO COMPLETADO")
    print("💡 Revisa los resultados arriba para identificar problemas")
    print('='*60)

if __name__ == "__main__":
    main()