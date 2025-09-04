# backend/migrate_v4_add_archiving.py
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DB_CONFIG = {
    "host": os.getenv("DB_HOST"), "port": int(os.getenv("DB_PORT")),
    "database": os.getenv("DB_NAME"), "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

def upgrade_schema():
    try:
        with psycopg2.connect(**DB_CONFIG) as conn:
            with conn.cursor() as cur:
                print("🚀 Aplicando migración para archivado de menciones...")
                cur.execute("""
                    ALTER TABLE mentions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
                    CREATE INDEX IF NOT EXISTS idx_mentions_status ON mentions(status);
                """)
                conn.commit()
                print("✅ ¡Tabla 'mentions' actualizada con el campo 'status'!")
    except Exception as e:
        print(f"❌ Error al actualizar la base de datos: {e}")

if __name__ == "__main__":
    upgrade_schema()