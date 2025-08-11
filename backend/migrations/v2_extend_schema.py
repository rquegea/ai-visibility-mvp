# scripts/v2_extend_schema.py

import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="ai_visibility",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

print("🧩 Extendiendo schema...")

# Nuevos campos en mentions
cur.execute("""
ALTER TABLE mentions
    ADD COLUMN IF NOT EXISTS source_name TEXT,
    ADD COLUMN IF NOT EXISTS origin_url TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS snippet TEXT,
    ADD COLUMN IF NOT EXISTS emotion TEXT,
    ADD COLUMN IF NOT EXISTS confidence_score REAL;
""")

# Crear tabla para alertas emitidas
cur.execute("""
CREATE TABLE IF NOT EXISTS alerts_emitted (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES queries(id),
    engine TEXT,
    alert_type TEXT,
    severity TEXT,
    emitted_at TIMESTAMP DEFAULT NOW()
);
""")

conn.commit()
cur.close()
conn.close()
print("✅ Esquema extendido correctamente.")

