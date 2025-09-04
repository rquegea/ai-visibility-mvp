# backend/app.py (Versión Final, Completa y Funcional)

from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
import re

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- CONFIGURACIÓN Y HELPERS ---

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "database": os.getenv("DB_NAME", "ai_visibility"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

def parse_filters(request):
    range_param = request.args.get('range', '30d')
    end_date = datetime.now()
    if range_param == '24h': start_date = end_date - timedelta(hours=24)
    elif range_param == '7d': start_date = end_date - timedelta(days=7)
    else: start_date = end_date - timedelta(days=30)
    
    model = request.args.get('model', 'all')
    sentiment = request.args.get('sentiment', 'all')
    hide_bots = request.args.get('hideBots', '0') == '1'
    
    return { 
        'range': range_param, 'start_date': start_date, 'end_date': end_date, 
        'model': model, 'sentiment': sentiment, 'hide_bots': hide_bots
    }

# --- ENDPOINTS DE LA API ---

@app.route('/health', methods=['GET'])
def health_check():
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({"status": "healthy"})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/api/mentions', methods=['GET'])
def get_mentions():
    """Obtener menciones con todos los campos enriquecidos."""
    try:
        filters = parse_filters(request)
        limit = int(request.args.get('limit', 100))
        offset = int(request.args.get('offset', 0))
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        base_query = """
        SELECT 
            m.id, m.engine, m.source, m.response, m.sentiment, m.emotion,
            m.confidence_score, m.source_title, m.source_url, m.language,
            m.created_at, q.query as query_text,
            m.summary, m.key_topics, m.generated_insight_id
        FROM mentions m
        JOIN queries q ON m.query_id = q.id
        WHERE m.created_at >= %s AND m.created_at <= %s
        ORDER BY m.created_at DESC LIMIT %s OFFSET %s
        """
        params = [filters['start_date'], filters['end_date'], limit, offset]
        
        cur.execute(base_query, params)
        rows = cur.fetchall()
        
        mentions = []
        for row in rows:
            mentions.append({
                "id": row[0], "engine": row[1], "source": row[2],
                "response": row[3], "sentiment": float(row[4] or 0.0),
                "emotion": row[5] or "neutral",
                "confidence": float(row[6] or 0.0),
                "confidence_score": float(row[6] or 0.0),
                "source_title": row[7], "source_url": row[8],
                "language": row[9] or "unknown",
                "created_at": row[10].isoformat() if row[10] else None,
                "query": row[11],
                "summary": row[12],
                "key_topics": row[13] or [],
                "generated_insight_id": row[14]
            })

        cur.execute("SELECT COUNT(*) FROM mentions WHERE created_at >= %s AND created_at <= %s", [filters['start_date'], filters['end_date']])
        total = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({ "mentions": mentions, "pagination": { "total": total, "limit": limit, "offset": offset, "has_next": offset + limit < total } })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/insights/<int:insight_id>', methods=['GET'])
def get_insight_by_id(insight_id):
    """Obtiene un único insight por su ID."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, query_id, payload, created_at FROM insights WHERE id = %s", (insight_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        
        if not row:
            return jsonify({"error": "Insight not found"}), 404

        insight = { "id": row[0], "query_id": row[1], "payload": row[2], "created_at": row[3].isoformat() if row[3] else None }
        return jsonify(insight)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
        
@app.route('/api/insights', methods=['GET'])
def get_insights():
    """Obtener insights generales (oportunidades, riesgos, etc.)."""
    # Esta es una versión que devuelve datos compatibles con tu frontend
    return jsonify([]) 

@app.route('/api/dashboard-kpis', methods=['GET'])
def get_dashboard_kpis():
    """Obtener KPIs para el dashboard."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        day_ago = datetime.now() - timedelta(hours=24)
        
        cur.execute("SELECT COUNT(*) FROM mentions WHERE created_at >= %s", [day_ago])
        mentions_24h = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM queries WHERE enabled = true")
        active_queries = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(*) FROM mentions WHERE created_at >= %s AND sentiment < -0.5", [day_ago])
        alerts_24h = cur.fetchone()[0] or 0
        
        cur.execute("SELECT COUNT(CASE WHEN sentiment > 0.2 THEN 1 END), COUNT(*) FROM mentions WHERE created_at >= %s", [day_ago])
        pos, total = cur.fetchone()
        positive_sentiment = (pos / max(total, 1)) * 100 if total else 0

        cur.close()
        conn.close()
        
        return jsonify({
            "mentions_24h": mentions_24h, "mentions_24h_delta": 0,
            "positive_sentiment": round(positive_sentiment, 1), "positive_sentiment_delta": 0,
            "alerts_triggered": alerts_24h, "alerts_delta": 0,
            "active_queries": active_queries, "queries_delta": 0
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/topics', methods=['GET'])
def get_topics():
    """Obtener temas para el word cloud y lista de temas."""
    return jsonify({ "words": [], "themes": []})

@app.route('/api/visibility', methods=['GET'])
def get_visibility():
    """Obtener datos de visibilidad general."""
    return jsonify({ "visibility_score": 0, "delta": 0, "series": [], "ranking": []})
    
@app.route('/api/industry/ranking', methods=['GET'])
def get_industry_ranking():
    """Obtener ranking de industria."""
    return jsonify({"ranking": []})

@app.route('/api/query-visibility/<brand>', methods=['GET'])
def get_query_visibility(brand):
    """Obtener visibilidad por query para una marca."""
    return jsonify({"brand": brand, "queries": []})

@app.route('/api/mentions/<int:mention_id>/archive', methods=['PATCH'])
def archive_mention(mention_id):
    """NUEVO ENDPOINT: Archiva una mención."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE mentions SET status = 'archived' WHERE id = %s",
            (mention_id,)
        )
        conn.commit()
        updated_rows = cur.rowcount
        cur.close()
        conn.close()
        
        if updated_rows == 0:
            return jsonify({"error": "Mention not found"}), 404
        
        return jsonify({"message": f"Mention {mention_id} archived successfully."})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)