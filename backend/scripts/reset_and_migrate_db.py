import os
import psycopg2

DB_CONFIG = {
    "host": "localhost",
    "port": 5433,
    "database": "ai_visibility",
    "user": "postgres",
    "password": "postgres"
}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

print("🧱 Crear tablas si no existen…")

# Tabla queries
cur.execute("""
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
""")

# Tabla mentions
cur.execute("""
CREATE TABLE IF NOT EXISTS mentions (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE,
    engine TEXT,
    source TEXT,
    response TEXT,
    sentiment REAL,
    visibility_score REAL,
    brand_presence TEXT,
    mention_type TEXT,
    source_url TEXT,
    language TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
""")

# Tabla citations
cur.execute("""
CREATE TABLE IF NOT EXISTS citations (
    id SERIAL PRIMARY KEY,
    mention_id INTEGER REFERENCES mentions(id) ON DELETE CASCADE,
    title TEXT,
    url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
""")

conn.commit()

print("⚠️  Vaciar tablas…")
TABLES = ["citations", "mentions", "queries"]
for table in TABLES:
    cur.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')
conn.commit()

cur.close()
conn.close()

print("✅ Base de datos reiniciada correctamente.")
