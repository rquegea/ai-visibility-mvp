import psycopg2
from tabulate import tabulate

def show_all():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="ai_visibility",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()

    # Mostrar tablas
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public';
    """)
    tables = cur.fetchall()
    print("\n📋 Tablas en la base de datos:")
    for table in tables:
        print(f" - {table[0]}")

    # Mostrar contenido de 'queries'
    print("\n📌 Contenido actual de 'queries':")
    cur.execute("SELECT id, query, brand, topic, language FROM queries ORDER BY id;")
    queries = cur.fetchall()
    print(tabulate(queries, headers=["ID", "Query", "Brand", "Topic", "Lang"], tablefmt="pretty"))

    # Mostrar contenido de 'mentions'
    print("\n🗂 Contenido actual de 'mentions':")
    cur.execute("""
        SELECT id, query_id, engine, sentiment, emotion, confidence_score, created_at, response
        FROM mentions
        ORDER BY created_at DESC
        LIMIT 10;
    """)
    mentions = cur.fetchall()
    print(tabulate(mentions, headers=[
        "ID", "Query ID", "Engine", "Sentiment", "Emotion", "Confidence", "Created At", "Response"
    ], tablefmt="pretty", maxcolwidths=[None, None, None, None, None, None, None, 80]))

    cur.close()
    conn.close()

if __name__ == "__main__":
    show_all()
