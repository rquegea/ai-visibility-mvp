#!/usr/bin/env python3
import os, sys, traceback
print("🔧 Arrancando check_serpapi.py (pre-imports)", flush=True)

def log(s): 
    print(s, flush=True)

try:
    import psycopg2
    from datetime import datetime, timedelta
    log("✅ Imports OK (psycopg2, datetime)")

except Exception as e:
    log(f"❌ Error en imports tempranos: {e}")
    traceback.print_exc()
    sys.exit(1)

def check_serpapi_data():
    log("➡️  Entrando en check_serpapi_data()")
    DB_CFG = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': int(os.getenv('POSTGRES_PORT', 5433)),
        'database': os.getenv('POSTGRES_DB', 'ai_visibility'),
        'user': os.getenv('POSTGRES_USER', 'postgres'),
        'password': os.getenv('POSTGRES_PASSWORD', 'postgres')
    }
    log(f"🗃️  DB_CFG: {DB_CFG}")

    try:
        conn = psycopg2.connect(**DB_CFG)
        cur = conn.cursor()

        log("🔍 VERIFICANDO DATOS DE SERPAPI")
        log("=" * 50)

        cur.execute("""
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h
            FROM mentions 
            WHERE engine = 'serpapi'
        """)
        total, last_24h = cur.fetchone()
        log(f"📊 Menciones SerpAPI -> Total: {total} | Últimas 24h: {last_24h}")

        if total == 0:
            log("❌ NO HAY DATOS DE SERPAPI")
            log("💡 Posibles causas:\n   1) SERPAPI_KEY no configurada\n   2) poll no se ha ejecutado\n   3) Error en fetch_serp_response()")
            serpapi_key = os.getenv('SERPAPI_KEY')
            if serpapi_key:
                log(f"   ✅ SERPAPI_KEY configurada: {serpapi_key[:10]}...")
            else:
                log("   ❌ SERPAPI_KEY NO ENCONTRADA")
            cur.close(); conn.close()
            return False

        cur.execute("""
            SELECT query_id, source, response, sentiment, created_at
            FROM mentions 
            WHERE engine = 'serpapi'
            ORDER BY created_at DESC 
            LIMIT 3
        """)
        examples = cur.fetchall()
        log("📝 Ejemplos recientes:")
        for i, (qid, source, response, sentiment, created_at) in enumerate(examples, 1):
            preview = (response or "")[:100].replace("\n"," ")
            log(f"   {i}. Query {qid} | {created_at} | sent={sentiment} | {source} | {preview}...")

        cur.execute("SELECT id, query, enabled FROM queries ORDER BY id")
        queries = cur.fetchall()
        log(f"🎯 Queries configuradas: {len(queries)}")
        for qid, qtext, enabled in queries:
            log(f"   {'✅' if enabled else '❌'} ID {qid}: {qtext}")

        cur.execute("""
            SELECT 
                CASE 
                    WHEN sentiment > 0.1 THEN 'Positivo'
                    WHEN sentiment < -0.1 THEN 'Negativo'
                    ELSE 'Neutral'
                END as cat, COUNT(*) 
            FROM mentions 
            WHERE engine = 'serpapi'
            GROUP BY cat
        """)
        for cat, cnt in cur.fetchall():
            log(f"   {cat}: {cnt}")

        cur.close(); conn.close()
        log("✅ SerpAPI está funcionando correctamente!")
        return True

    except Exception as e:
        log(f"❌ Error conectando/consultando DB: {e}")
        traceback.print_exc()
        return False

def test_serpapi_directly():
    log("🧪 PROBANDO SERPAPI DIRECTAMENTE")
    try:
        from serpapi import GoogleSearch
        serpapi_key = os.getenv('SERPAPI_KEY')
        if not serpapi_key:
            log("❌ SERPAPI_KEY no encontrada en variables de entorno")
            return False

        params = {"q": "test search", "api_key": serpapi_key}
        search = GoogleSearch(params)
        results = search.get_dict()
        organic = results.get("organic_results", [])
        log(f"✅ SerpAPI responde. Resultados: {len(organic)}")
        if organic:
            first = organic[0]
            title = first.get("title","N/A")
            snip = (first.get("snippet","N/A") or "")[:100]
            log(f"📝 Primer resultado: {title} — {snip}...")
        return True

    except Exception as e:
        log(f"❌ Error probando SerpAPI: {e}")
        log("💡 Verifica: pip install google-search-results | SERPAPI_KEY válida")
        traceback.print_exc()
        return False

def main():
    from dotenv import load_dotenv
    log("📦 Cargando .env...")
    load_dotenv()
    log("🚀 DIAGNÓSTICO COMPLETO DE SERPAPI")
    log("=" * 60)

    api_ok = test_serpapi_directly()
    if api_ok:
        data_ok = check_serpapi_data()
        if not data_ok:
            log("\n🔧 SOLUCIÓN RECOMENDADA:")
            log('1) cd backend')
            log('2) python -c "from src.scheduler.poll import main; main(loop_once=True)"')
            log('3) Espera ~1-2 minutos y re-ejecuta este script')
    else:
        log("\n🔧 SOLUCIÓN RECOMENDADA:")
        log("1) Añade SERPAPI_KEY=tu_key en backend/.env")
        log("2) pip install google-search-results")
        log("3) Vuelve a ejecutar el script")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"💥 Excepción no capturada: {e}", flush=True)
        traceback.print_exc()
        sys.exit(1)
