import psycopg2
import pandas as pd

# Conexión a PostgreSQL
conn = psycopg2.connect(
    host="localhost",
    port=5433,
    database="ai_visibility",
    user="postgres",
    password="postgres"
)

# Consulta SQL corregida
query = """
SELECT q.query, q.brand, m.engine, m.sentiment, m.response, m.created_at
FROM mentions m
JOIN queries q ON m.query_id = q.id
ORDER BY m.created_at DESC
LIMIT 20;
"""

# Ejecutar y mostrar resultados
df = pd.read_sql(query, conn)
print(df.to_string(index=False))
