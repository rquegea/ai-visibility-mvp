#!/bin/bash
# Script para verificar qué endpoints están devolviendo datos reales

echo "🔍 Verificando endpoints del backend..."
echo "=================================="

# 1. Health check
echo "1. Health Check:"
curl -s http://localhost:5050/health | jq -r '.status // "❌ Error"'
echo ""

# 2. Visibility endpoint
echo "2. Visibility endpoint:"
curl -s http://localhost:5050/api/visibility | jq -r '.visibility_score // "❌ No visibility_score"'
echo ""

# 3. Topics endpoint
echo "3. Topics endpoint:"
curl -s http://localhost:5050/api/topics | jq -r '.words // "❌ No words data"' | head -3
echo ""

# 4. Mentions endpoint
echo "4. Mentions endpoint:"
curl -s http://localhost:5050/api/mentions | jq -r '.mentions // "❌ No mentions"' | head -1
echo ""

# 5. Frontend proxies
echo "5. Frontend proxy test:"
curl -s http://localhost:3000/api/visibility | jq -r '.visibility_score // "❌ Frontend proxy error"'
echo ""

echo "🏁 Test completado!"
