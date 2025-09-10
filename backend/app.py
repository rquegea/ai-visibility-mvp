# backend/app.py

from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

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
    
    return { 'range': range_param, 'start_date': start_date, 'end_date': end_date }

# --- ENDPOINTS DE LA API ---

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/api/mentions', methods=['GET'])
def get_mentions():
    """Obtener menciones, con filtro de estado (active/archived)."""
    try:
        filters = parse_filters(request)
        status = request.args.get('status', 'active')

        conn = get_db_connection()
        cur = conn.cursor()
        
        base_query = """
        SELECT 
            m.id, m.engine, m.source, m.response, m.sentiment, m.emotion,
            m.confidence_score, m.created_at, q.query as query_text,
            m.summary, m.key_topics, m.generated_insight_id
        FROM mentions m
        JOIN queries q ON m.query_id = q.id
        WHERE m.created_at >= %s AND m.created_at <= %s AND m.status = %s
        ORDER BY m.created_at DESC
        """
        params = [filters['start_date'], filters['end_date'], status]
        
        cur.execute(base_query, params)
        rows = cur.fetchall()
        
        mentions = []
        for row in rows:
            mentions.append({
                "id": row[0], "engine": row[1], "source": row[2],
                "response": row[3], "sentiment": float(row[4] or 0.0),
                "emotion": row[5] or "neutral",
                "confidence_score": float(row[6] or 0.0),
                "created_at": row[7].isoformat() if row[7] else None, "query": row[8],
                "summary": row[9], "key_topics": row[10] or [], "generated_insight_id": row[11]
            })
        
        return jsonify({ "mentions": mentions })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/mentions/<int:mention_id>/archive', methods=['PATCH'])
def archive_mention(mention_id):
    """Archiva o desarchiva una mención."""
    try:
        data = request.get_json()
        new_status = 'archived' if data.get('archive', True) else 'active'
        
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("UPDATE mentions SET status = %s WHERE id = %s", (new_status, mention_id))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"message": f"Mention {mention_id} status changed to {new_status}."})
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

# (Aquí puedes añadir el resto de tus endpoints si los necesitas)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5050, debug=True)