import psycopg2

def clean_database():
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="ai_visibility",
        user="postgres",
        password="postgres"
    )
    cur = conn.cursor()
    
    print("🧹 LIMPIEZA COMPLETA DE BASE DE DATOS")
    print("=" * 40)
    
    # Borrar TODO el contenido
    tables_to_clean = ['mentions', 'insights', 'citations', 'queries']
    
    for table in tables_to_clean:
        cur.execute(f"DELETE FROM {table};")
        cur.execute(f"ALTER SEQUENCE {table}_id_seq RESTART WITH 1;")  # Resetear IDs
        print(f"✅ Tabla '{table}' limpiada")
    
    conn.commit()
    
    # Verificar que está vacío
    for table in tables_to_clean:
        cur.execute(f"SELECT COUNT(*) FROM {table};")
        count = cur.fetchone()[0]
        print(f"   {table}: {count} registros")
    
    cur.close()
    conn.close()
    print("\n🎯 Base de datos completamente limpia")

if __name__ == "__main__":
    clean_database()
