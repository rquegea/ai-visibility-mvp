import psycopg2

QUERIES = [
    # Inglés 🇬🇧
    ("What are the most popular cookie brands worldwide?", "Generic", "Global popularity", "en"),
    ("Top biscuit brands to pair with coffee in 2025", "Generic", "Consumption moment", "en"),
    ("Which cookie brands are best value for money according to consumers?", "Generic", "Value for money", "en"),
    ("Health-conscious shoppers: which cookies are considered the healthiest?", "Generic", "Health", "en"),

    # Español 🇪🇸
    ("¿Cuáles son las marcas de galletas más recomendadas para niños en España?", "Generic", "Kids target", "es"),
    ("Galletas sin azúcar: ¿qué marcas valoran más los consumidores españoles?", "Generic", "Sugar-free", "es"),

    # Francés 🇫🇷
    ("Quelles marques de biscuits haut de gamme apprécient le plus les Français ?", "Generic", "Premium", "fr"),
    ("Biscuits pour accompagner le thé : quelles marques dominent en 2025 ?", "Generic", "Consumption moment", "fr"),

    # Estilo SEO 🌐
    ("Best cookie brands 2025 list", "Generic", "SEO", "en"),

    # Precio/Calidad 💰
    ("Which cookies offer the best price-quality ratio in supermarkets?", "Generic", "Price-quality", "en"),

    # Experiencia de compra 🛠
    ("What complaints do customers have when buying cookies online?", "Generic", "Pain points", "en"),

    # Sostenibilidad 🌱
    ("Which cookie brands use the most sustainable packaging?", "Generic", "Sustainability", "en"),
]

def insert_queries():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="ai_visibility",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()

    # Añadir columna language si no existe
    try:
        cur.execute("ALTER TABLE queries ADD COLUMN language TEXT DEFAULT 'en';")
        conn.commit()
        print("✅ Columna 'language' añadida.")
    except psycopg2.errors.DuplicateColumn:
        conn.rollback()
        print("ℹ️ La columna 'language' ya existía.")

    # Insertar los queries
    for query, brand, topic, lang in QUERIES:
        cur.execute("""
            INSERT INTO queries (query, brand, topic, enabled, language)
            VALUES (%s, %s, %s, TRUE, %s)
            ON CONFLICT (query) DO NOTHING;
        """, (query, brand, topic, lang))

    conn.commit()
    print("✅ Insertados los 12 queries correctamente.\n")

    # Mostrar tablas existentes
    print("📋 Tablas en la base de datos:")
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
    """)
    tables = cur.fetchall()
    for table in tables:
        print(f" - {table[0]}")

    # Mostrar contenido de queries
    print("\n📌 Contenido actual de 'queries':")
    cur.execute("SELECT * FROM queries ORDER BY id;")
    queries_rows = cur.fetchall()
    for row in queries_rows:
        print(row)

    # Mostrar contenido de mentions
    print("\n🗂 Contenido actual de 'mentions':")
    cur.execute("SELECT * FROM mentions ORDER BY created_at DESC LIMIT 20;")
    mentions_rows = cur.fetchall()
    for row in mentions_rows:
        print(row)

    cur.close()
    conn.close()

if __name__ == "__main__":
    insert_queries()
