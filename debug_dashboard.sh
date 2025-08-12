#!/bin/bash
# Script completo de depuración para el dashboard

echo "🔍 DEPURANDO DASHBOARD AI VISIBILITY"
echo "===================================="

# 1. Verificar servicios running
echo "1. 📋 Verificando servicios..."
echo "   PostgreSQL: $(docker ps --filter "name=postgres" --format "table {{.Status}}" | tail -n1)"
echo "   Backend Flask: $(ps aux | grep -v grep | grep 'python app.py' | wc -l) procesos"
echo "   Frontend Next: $(ps aux | grep -v grep | grep 'next-server' | wc -l) procesos"
echo ""

# 2. Test de conectividad básica
echo "2. 🌐 Test de conectividad..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5050/health)
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

echo "   Backend (5050): $BACKEND_STATUS"
echo "   Frontend (3000): $FRONTEND_STATUS"
echo ""

# 3. Test endpoints críticos
echo "3. 🔌 Test endpoints críticos..."

# Visibility
VIS_RESPONSE=$(curl -s http://localhost:5050/api/visibility)
VIS_SCORE=$(echo "$VIS_RESPONSE" | jq -r '.visibility_score // "ERROR"' 2>/dev/null)
echo "   /api/visibility → visibility_score: $VIS_SCORE"

# Topics  
TOPICS_RESPONSE=$(curl -s http://localhost:5050/api/topics)
TOPICS_COUNT=$(echo "$TOPICS_RESPONSE" | jq -r '.words | length // "ERROR"' 2>/dev/null)
echo "   /api/topics → words count: $TOPICS_COUNT"

# Mentions
MENTIONS_RESPONSE=$(curl -s http://localhost:5050/api/mentions?limit=1)
MENTIONS_TOTAL=$(echo "$MENTIONS_RESPONSE" | jq -r '.pagination.total // "ERROR"' 2>/dev/null)
echo "   /api/mentions → total: $MENTIONS_TOTAL"

# Rankings
RANKING_COUNT=$(echo "$VIS_RESPONSE" | jq -r '.ranking | length // "ERROR"' 2>/dev/null)
echo "   /api/visibility → ranking count: $RANKING_COUNT"
echo ""

# 4. Test frontend proxies
echo "4. 🌐 Test frontend proxies..."
PROXY_VIS=$(curl -s http://localhost:3000/api/visibility | jq -r '.visibility_score // "ERROR"' 2>/dev/null)
PROXY_TOPICS=$(curl -s http://localhost:3000/api/topics | jq -r '.words | length // "ERROR"' 2>/dev/null)
echo "   Frontend /api/visibility: $PROXY_VIS"
echo "   Frontend /api/topics: $PROXY_TOPICS"
echo ""

# 5. Verificar datos en base
echo "5. 🗄️ Verificación base de datos..."
cd backend 2>/dev/null || echo "   ⚠️ No se pudo acceder a /backend"

if [ -f "scripts/show_all.py" ]; then
    echo "   Ejecutando show_all.py..."
    python scripts/show_all.py 2>&1 | head -5
else
    echo "   ⚠️ scripts/show_all.py no encontrado"
fi
echo ""

# 6. Generar reporte de estado
echo "6. 📊 REPORTE DE ESTADO"
echo "======================"

# Calcular percentage de datos reales
REAL_DATA_COUNT=0
TOTAL_CHECKS=4

[ "$VIS_SCORE" != "ERROR" ] && [ "$VIS_SCORE" != "null" ] && ((REAL_DATA_COUNT++))
[ "$TOPICS_COUNT" != "ERROR" ] && [ "$TOPICS_COUNT" != "null" ] && [ "$TOPICS_COUNT" != "0" ] && ((REAL_DATA_COUNT++))
[ "$MENTIONS_TOTAL" != "ERROR" ] && [ "$MENTIONS_TOTAL" != "null" ] && [ "$MENTIONS_TOTAL" != "0" ] && ((REAL_DATA_COUNT++))
[ "$RANKING_COUNT" != "ERROR" ] && [ "$RANKING_COUNT" != "null" ] && [ "$RANKING_COUNT" != "0" ] && ((REAL_DATA_COUNT++))

PERCENTAGE=$((REAL_DATA_COUNT * 100 / TOTAL_CHECKS))

echo "   Datos reales en dashboard: $REAL_DATA_COUNT/$TOTAL_CHECKS ($PERCENTAGE%)"

if [ $PERCENTAGE -eq 100 ]; then
    echo "   ✅ DASHBOARD COMPLETAMENTE REAL"
elif [ $PERCENTAGE -ge 50 ]; then
    echo "   ⚠️ DASHBOARD PARCIALMENTE REAL - Revisar endpoints faltantes"
else
    echo "   ❌ DASHBOARD USANDO DATOS MOCK - Problema en backend"
fi

echo ""
echo "7. 🚀 PRÓXIMOS PASOS RECOMENDADOS"
echo "================================"

if [ $PERCENTAGE -lt 100 ]; then
    echo "   1. Verificar que el backend Flask esté corriendo"
    echo "   2. Verificar que PostgreSQL tenga datos"
    echo "   3. Ejecutar: cd backend && python -c \"from src.scheduler.poll import main; main(loop_once=True)\""
    echo "   4. Reemplazar el page.tsx del dashboard con la versión corregida"
    echo "   5. Reiniciar frontend: npm run dev"
fi

echo ""
echo "🏁 Depuración completada!"
