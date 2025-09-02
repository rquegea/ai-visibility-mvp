#!/bin/bash
echo "🗄️ Exportando base de datos AI Visibility..."

# Verificar que Docker esté corriendo
if ! docker-compose ps | grep -q "Up"; then
    echo "🚀 Levantando PostgreSQL..."
    docker-compose up -d
    sleep 5
fi

# Crear backup
echo "�� Creando backup SQL..."
docker-compose exec -T db pg_dump -U postgres ai_visibility > ai_visibility_backup_$(date +%Y%m%d_%H%M%S).sql

echo "✅ Backup creado: ai_visibility_backup_$(date +%Y%m%d_%H%M%S).sql"
echo "📁 Archivo listo para compartir!"
