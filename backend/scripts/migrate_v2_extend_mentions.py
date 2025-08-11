import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="ai_visibility",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# Añadir nuevas columnas si no existen
cur.execute("ALTER TABLE mentions ADD COLUMN IF NOT EXISTS emotion TEXT;")
cur.execute("ALTER TABLE mentions ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION;")

conn.commit()
cur.close()
conn.close()

print("✅ Migración v2 aplicada con éxito.")

