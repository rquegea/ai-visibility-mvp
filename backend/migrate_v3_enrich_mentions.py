# Contenido para: backend/migrate_v3_enrich_mentions.py

import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

DB_CONFIG = dict(
    host=os.getenv("POSTGRES_HOST", "localhost"),
    port=int(os.getenv("POSTGRES_PORT", 5433)),
    database=os.getenv("POSTGRES_DB", "ai_visibility"),
    user=os.getenv("POSTGRES_USER", "postgres"),
    password=os.getenv("POSTGRES_PASSWORD", "postgres"),
)

def upgrade_schema():
    """Añade las nuevas columnas a la tabla mentions si no existen."""
    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                print("🚀 Aplicando migración para enriquecer la tabla 'mentions'...")

                # Añadir las nuevas columnas de forma segura
                cur.execute("""
                    ALTER TABLE mentions ADD COLUMN IF NOT EXISTS summary TEXT;
                    ALTER TABLE mentions ADD COLUMN IF NOT EXISTS key_topics TEXT[];
                    ALTER TABLE mentions ADD COLUMN IF NOT EXISTS generated_insight_id INTEGER;
                """)

                conn.commit()
                print("✅ ¡Esquema de la base de datos actualizado correctamente!")
                print("   Ahora la tabla 'mentions' puede guardar resúmenes y temas clave.")

    except psycopg2.Error as e:
        print(f"❌ Error al actualizar la base de datos: {e}")

if __name__ == "__main__":
    upgrade_schema()
