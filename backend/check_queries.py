import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)

cur = conn.cursor()
cur.execute("SELECT * FROM queries;")
rows = cur.fetchall()

print("🔎 Queries actuales en la tabla:")
for r in rows:
    print(r)

cur.close()
conn.close()

