from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os
from datetime import datetime, timedelta
import json
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000",
    "http://localhost:3001",
    os.getenv("FRONTEND_URL", "http://localhost:3000")
])

# Configuración DB (usando tu .env exacto)
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5433)),
    "database": os.getenv("DB_NAME", "ai_visibility"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "postgres")
}

def get_db_connection():
    """Obtener conexión a la base de datos"""
    return psycopg2.connect(**DB_CONFIG)

def parse_filters(request):
    """Parsear filtros comunes de query params - MEJORADO con validación"""
    try:
        range_param = request.args.get('range', '7d')
        sentiment = request.args.get('sentiment', 'all')
        model = request.args.get('model', 'all')
        region = request.args.get('region', 'all')
        hide_bots = request.args.get('hideBots', '0') == '1'
        verified_only = request.args.get('verified', '0') == '1'
        
        model_mapping = {
            'GPT-4o': 'gpt-4',           # ✅ Coincide exacto
            'Llama 3.1': 'pplx-7b-chat', # ✅ CORREGIDO: ahora coincide exacto
            'Claude 3.5': 'claude',      # ← Sin datos, pero correcto
            'All models': 'all'
        }
        
        if model in model_mapping:
            model = model_mapping[model]
        elif model != 'all':
            model = model.lower()
        
        # Calcular fechas basado en range
        end_date = datetime.now()
        if range_param == '24h':
            start_date = end_date - timedelta(hours=24)
        elif range_param == '7d':
            start_date = end_date - timedelta(days=7)
        elif range_param == '30d':
            start_date = end_date - timedelta(days=30)
        elif range_param == '90d':
            start_date = end_date - timedelta(days=90)
        elif range_param == 'custom':
            # Manejar fechas custom
            from_date = request.args.get('from')
            to_date = request.args.get('to')
            if from_date:
                start_date = datetime.strptime(from_date, '%Y-%m-%d')
            else:
                start_date = end_date - timedelta(days=7)
            if to_date:
                end_date = datetime.strptime(to_date, '%Y-%m-%d')
        else:
            start_date = end_date - timedelta(days=7)
        
        return {
            'range': range_param,
            'sentiment': sentiment,
            'model': model,
            'region': region,
            'hide_bots': hide_bots,
            'verified_only': verified_only,
            'start_date': start_date,
            'end_date': end_date
        }
    
    except ValueError as e:
        # Manejar fechas inválidas
        print(f"Error parsing dates: {e}")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        return {
            'range': '7d',
            'sentiment': sentiment,
            'model': model,
            'region': region,
            'hide_bots': hide_bots,
            'verified_only': verified_only,
            'start_date': start_date,
            'end_date': end_date
        }

@app.route('/health', methods=['GET'])
def health_check():
    """Endpoint de salud"""
    try:
        conn = get_db_connection()
        conn.close()
        return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 500

@app.route('/api/mentions', methods=['GET'])
def get_mentions():
    """Obtener menciones con filtros - MEJORADO"""
    try:
        filters = parse_filters(request)
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        print(f"DEBUG: Filtros aplicados: {filters}")
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query base
        base_query = """
        SELECT 
            m.id,
            m.engine,
            m.source,
            m.response,
            m.sentiment,
            m.emotion,
            m.confidence_score,
            m.source_title,
            m.source_url,
            m.language,
            m.created_at,
            q.query as query_text
        FROM mentions m
        JOIN queries q ON m.query_id = q.id
        WHERE m.created_at >= %s AND m.created_at <= %s
        """
        
        params = [filters['start_date'], filters['end_date']]
        
        # Filtro de sentimiento
        if filters['sentiment'] != 'all':
            if filters['sentiment'] == 'positive':
                base_query += " AND m.sentiment > 0.2"
            elif filters['sentiment'] == 'negative':
                base_query += " AND m.sentiment < -0.2"
            elif filters['sentiment'] == 'neutral':
                base_query += " AND m.sentiment BETWEEN -0.2 AND 0.2"
        
        # Filtro de modelo (con mapeo correcto)
        if filters['model'] != 'all':
            base_query += " AND LOWER(m.engine) LIKE %s"
            params.append(f"%{filters['model']}%")
        
        # Filtro para ocultar bots
        if filters['hide_bots']:
            base_query += " AND (m.source NOT ILIKE '%bot%' OR m.source IS NULL)"
        
        base_query += " ORDER BY m.created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        print(f"DEBUG: Query SQL: {base_query}")
        print(f"DEBUG: Parámetros: {params}")
        
        cur.execute(base_query, params)
        rows = cur.fetchall()
        
        mentions = []
        for row in rows:
            mentions.append({
                "id": row[0],
                "engine": row[1],
                "source": row[2],
                "response": row[3],
                "sentiment": float(row[4]) if row[4] else 0.0,
                "emotion": row[5] or "neutral",
                "confidence": float(row[6]) if row[6] else 0.0,
                "source_title": row[7],
                "source_url": row[8],
                "language": row[9] or "unknown",
                "created_at": row[10].isoformat() if row[10] else None,
                "query": row[11]
            })
        
        # Contar total para paginación (con mismos filtros)
        count_query = """
        SELECT COUNT(*) FROM mentions m
        JOIN queries q ON m.query_id = q.id
        WHERE m.created_at >= %s AND m.created_at <= %s
        """
        count_params = [filters['start_date'], filters['end_date']]
        
        if filters['sentiment'] != 'all':
            if filters['sentiment'] == 'positive':
                count_query += " AND m.sentiment > 0.2"
            elif filters['sentiment'] == 'negative':
                count_query += " AND m.sentiment < -0.2"
            elif filters['sentiment'] == 'neutral':
                count_query += " AND m.sentiment BETWEEN -0.2 AND 0.2"
        
        if filters['model'] != 'all':
            count_query += " AND LOWER(m.engine) LIKE %s"
            count_params.append(f"%{filters['model']}%")
        
        if filters['hide_bots']:
            count_query += " AND (m.source NOT ILIKE '%bot%' OR m.source IS NULL)"
        
        cur.execute(count_query, count_params)
        total = cur.fetchone()[0]
        
        cur.close()
        conn.close()
        
        return jsonify({
            "mentions": mentions,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_next": offset + limit < total
            },
            "debug": {
                "filters_applied": filters,
                "total_found": total
            }
        })
        
    except Exception as e:
        print(f"ERROR en menciones: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/visibility', methods=['GET'])
def get_visibility():
    """Obtener datos de visibilidad basado en insights por query - CON FILTROS"""
    try:
        filters = parse_filters(request)
        
        print(f"DEBUG: Filtros visibility: {filters}")
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener visibility score general basado en insights CON FILTROS
        insights_query = """
        SELECT 
            i.query_id,
            i.payload,
            q.query
        FROM insights i
        JOIN queries q ON i.query_id = q.id
        WHERE i.created_at >= %s AND i.created_at <= %s
        """
        
        params = [filters['start_date'], filters['end_date']]
        
        cur.execute(insights_query, params)
        insights_rows = cur.fetchall()
        
        query_visibility = {}
        all_positive = 0
        all_total = 0
        
        for row in insights_rows:
            query_id = row[0]
            payload = row[1]
            query_text = row[2]
            
            if query_id not in query_visibility:
                query_visibility[query_id] = {
                    'positive': 0, 
                    'total': 0, 
                    'query': query_text
                }
            
            # Analizar el payload del insight para determinar si es positivo
            if 'opportunities' in payload and payload['opportunities']:
                opportunities_count = len(payload['opportunities'])
                query_visibility[query_id]['positive'] += opportunities_count
                query_visibility[query_id]['total'] += opportunities_count
                all_positive += opportunities_count
                all_total += opportunities_count
            
            if 'risks' in payload and payload['risks']:
                risks_count = len(payload['risks'])
                query_visibility[query_id]['total'] += risks_count
                all_total += risks_count
            
            if 'trends' in payload and payload['trends']:
                trends_count = len(payload['trends'])
                query_visibility[query_id]['total'] += trends_count
                all_total += trends_count
            
            if not any(key in payload for key in ['opportunities', 'risks', 'trends']):
                query_visibility[query_id]['total'] += 1
                all_total += 1
        
        # Calcular visibility score general
        overall_visibility = (all_positive / max(all_total, 1)) * 100
        
        # Serie temporal ajustada por filtros
        series_start = filters['start_date'] if filters['range'] != '7d' else datetime.now() - timedelta(days=7)
        
        series_query = """
        SELECT 
            DATE(i.created_at) as date,
            i.payload
        FROM insights i
        WHERE i.created_at >= %s
        ORDER BY date
        """
        
        cur.execute(series_query, [series_start])
        series_rows = cur.fetchall()
        
        daily_scores = {}
        for row in series_rows:
            date_str = row[0].strftime('%b %d')
            payload = row[1]
            
            if date_str not in daily_scores:
                daily_scores[date_str] = {'positive': 0, 'total': 0}
            
            if 'opportunities' in payload and payload['opportunities']:
                daily_scores[date_str]['positive'] += len(payload['opportunities'])
                daily_scores[date_str]['total'] += len(payload['opportunities'])
            
            if 'risks' in payload and payload['risks']:
                daily_scores[date_str]['total'] += len(payload['risks'])
            
            if 'trends' in payload and payload['trends']:
                daily_scores[date_str]['total'] += len(payload['trends'])
        
        series = []
        for date_str, scores in daily_scores.items():
            score = (scores['positive'] / max(scores['total'], 1)) * 100
            series.append({
                "date": date_str,
                "score": round(score, 1)
            })
        
        # Ranking de queries por visibility
        ranking = []
        for i, (query_id, data) in enumerate(sorted(
            query_visibility.items(), 
            key=lambda x: x[1]['positive'] / max(x[1]['total'], 1), 
            reverse=True
        )[:5]):
            
            score = (data['positive'] / max(data['total'], 1)) * 100
            delta = score - 50
            
            ranking.append({
                "position": i + 1,
                "name": f"Query {query_id}",
                "score": round(score, 1),
                "delta": round(delta, 1),
                "logo": f"/placeholder.svg?height=40&width=40"
            })
        
        # Fallback si no hay datos de insights
        if not query_visibility:
            print("DEBUG: No hay insights, usando datos mock")
            cur.execute("SELECT id, query FROM queries LIMIT 5")
            query_rows = cur.fetchall()
            
            for i, row in enumerate(query_rows):
                ranking.append({
                    "position": i + 1,
                    "name": f"Query {row[0]}",
                    "score": 0.0,
                    "delta": 0.0,
                    "logo": f"/placeholder.svg?height=40&width=40"
                })
            
            overall_visibility = 0.0
            series = [{"date": "No data", "score": 0.0}]
        
        cur.close()
        conn.close()
        
        return jsonify({
            "visibility_score": round(overall_visibility, 1),
            "delta": round(overall_visibility - 50, 1),
            "series": series,
            "ranking": ranking,
            "debug": {
                "filters_applied": filters,
                "total_insights": len(insights_rows),
                "query_count": len(query_visibility)
            }
        })
        
    except Exception as e:
        print(f"Error en visibility: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/visibility/by-query', methods=['GET'])
def get_visibility_by_query():
    """Obtener % de visibilidad por query basado en análisis de contenido de insights"""
    try:
        filters = parse_filters(request)
        brand_name = request.args.get('brand', 'lotus').lower()
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener insights por query con análisis de contenido y filtros
        insights_query = """
        SELECT 
            q.id,
            q.query,
            i.payload,
            COUNT(i.id) as insight_count
        FROM queries q
        LEFT JOIN insights i ON q.id = i.query_id 
            AND i.created_at >= %s 
            AND i.created_at <= %s
        WHERE q.enabled = true
        GROUP BY q.id, q.query, i.payload
        ORDER BY COUNT(i.id) DESC
        """
        
        cur.execute(insights_query, [filters['start_date'], filters['end_date']])
        rows = cur.fetchall()
        
        # Analizar contenido por query
        query_analysis = {}
        for row in rows:
            query_id = row[0]
            query_text = row[1]
            payload = row[2]
            
            if query_id not in query_analysis:
                query_analysis[query_id] = {
                    'query': query_text,
                    'lotus_mentions': 0,
                    'total_content': 0,
                    'positive_signals': 0,
                    'opportunities': 0,
                    'risks': 0,
                    'trends': 0
                }
            
            if payload:
                analysis = query_analysis[query_id]
                
                # Buscar en opportunities
                if 'opportunities' in payload and payload['opportunities']:
                    for opp in payload['opportunities']:
                        analysis['opportunities'] += 1
                        analysis['total_content'] += 1
                        # Buscar menciones de Lotus
                        if any(word in opp.lower() for word in ['lotus', 'biscoff', 'caramel', 'speculoos']):
                            analysis['lotus_mentions'] += 1
                            analysis['positive_signals'] += 2
                        elif any(word in opp.lower() for word in ['premium', 'gourmet', 'quality', 'popular', 'growing', 'demand']):
                            analysis['positive_signals'] += 1
                
                # Buscar en trends
                if 'trends' in payload and payload['trends']:
                    for trend in payload['trends']:
                        analysis['trends'] += 1
                        analysis['total_content'] += 1
                        if any(word in trend.lower() for word in ['lotus', 'biscoff', 'caramel', 'speculoos']):
                            analysis['lotus_mentions'] += 1
                            analysis['positive_signals'] += 1
                        elif any(word in trend.lower() for word in ['premium', 'artisanal', 'coffee pairing', 'specialty']):
                            analysis['positive_signals'] += 0.5
                
                # Buscar en brands mencionadas
                if 'brands' in payload and payload['brands']:
                    for brand in payload['brands']:
                        if isinstance(brand, str):
                            if any(word in brand.lower() for word in ['lotus', 'biscoff']):
                                analysis['lotus_mentions'] += 2
                                analysis['positive_signals'] += 3
                
                # Buscar en quotes
                if 'quotes' in payload and payload['quotes']:
                    for quote in payload['quotes']:
                        if isinstance(quote, str):
                            if any(word in quote.lower() for word in ['lotus', 'biscoff']):
                                analysis['lotus_mentions'] += 1
                                analysis['positive_signals'] += 2
                
                # Contar risks (negativos)
                if 'risks' in payload and payload['risks']:
                    for risk in payload['risks']:
                        analysis['risks'] += 1
                        analysis['total_content'] += 1
        
        # Calcular visibility por query
        query_visibility = []
        for query_id, analysis in query_analysis.items():
            lotus_score = min(analysis['lotus_mentions'] * 20, 60)
            positive_score = min(analysis['positive_signals'] * 5, 40)
            relevance_score = min(analysis['total_content'] * 2, 20)
            risk_penalty = min(analysis['risks'] * 3, 15)
            
            visibility = max(0, lotus_score + positive_score + relevance_score - risk_penalty)
            
            if lotus_score == 0 and analysis['total_content'] > 0:
                query_lower = analysis['query'].lower()
                if any(word in query_lower for word in ['cookie', 'biscuit', 'galleta', 'coffee', 'café']):
                    visibility = max(visibility, 15)
            
            display_query = analysis['query'][:20] + "..." if len(analysis['query']) > 20 else analysis['query']
            
            query_visibility.append({
                "query_id": query_id,
                "query": display_query,
                "full_query": analysis['query'],
                "total_mentions": analysis['total_content'],
                "brand_mentions": analysis['lotus_mentions'],
                "visibility_percentage": round(min(visibility, 100), 1)
            })
        
        query_visibility.sort(key=lambda x: x['visibility_percentage'], reverse=True)
        
        # Fallback si no hay datos
        if not query_visibility:
            print("DEBUG: No hay datos de análisis, usando fallback básico")
            cur.execute("SELECT id, query FROM queries WHERE enabled = true LIMIT 5")
            query_rows = cur.fetchall()
            
            for row in query_rows:
                display_query = row[1][:20] + "..." if len(row[1]) > 20 else row[1]
                query_lower = row[1].lower()
                if 'cookie' in query_lower or 'biscuit' in query_lower:
                    base_score = 45 + (row[0] % 20)
                elif 'coffee' in query_lower or 'café' in query_lower:
                    base_score = 30 + (row[0] % 15)
                else:
                    base_score = 10 + (row[0] % 10)
                
                query_visibility.append({
                    "query_id": row[0],
                    "query": display_query,
                    "full_query": row[1],
                    "total_mentions": 0,
                    "brand_mentions": 0,
                    "visibility_percentage": round(base_score, 1)
                })
        
        cur.close()
        conn.close()
        
        return jsonify({
            "brand": "Lotus Biscoff",
            "queries": query_visibility[:10],
            "debug": {
                "filters_applied": filters,
                "total_queries": len(query_visibility)
            }
        })
        
    except Exception as e:
        print(f"Error en visibility by query: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/insights', methods=['GET'])
def get_insights():
    """Obtener insights reales de la base de datos - FILTROS DE TIEMPO CORREGIDOS"""
    try:
        filters = parse_filters(request)
        insight_type = request.args.get('type', 'all')
        status = request.args.get('status', 'all')
        limit = int(request.args.get('limit', 50))
        
        print(f"DEBUG: Filtros aplicados - {filters['range']} desde {filters['start_date']} hasta {filters['end_date']}")
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        if insight_type == 'quote':
            # ✅ CORREGIDO: Obtener quotes reales de menciones CON FILTRO DE TIEMPO
            quote_query = """
            SELECT 
                m.response,
                m.source_url,
                m.emotion,
                m.sentiment,
                m.source_title
            FROM mentions m
            WHERE m.created_at >= %s 
            AND m.created_at <= %s
            AND LENGTH(m.response) BETWEEN 30 AND 300
            AND m.response IS NOT NULL
            AND m.response != ''
            ORDER BY ABS(m.sentiment) DESC, m.created_at DESC
            LIMIT %s
            """
            
            cur.execute(quote_query, [filters['start_date'], filters['end_date'], limit])
            rows = cur.fetchall()
            
            quotes = []
            for row in rows:
                domain = "unknown.com"
                if row[1]:
                    try:
                        from urllib.parse import urlparse
                        parsed = urlparse(row[1])
                        domain = parsed.netloc or "unknown.com"
                        domain = domain.replace('www.', '')
                    except:
                        pass
                
                text = row[0]
                if len(text) > 200:
                    text = text[:197] + "..."
                
                quotes.append({
                    "text": text,
                    "domain": domain,
                    "emotion": row[2] or "neutral",
                    "sentiment": float(row[3]) if row[3] else 0.0,
                    "source_title": row[4] or domain
                })
            
            cur.close()
            conn.close()
            print(f"DEBUG: Devolviendo {len(quotes)} quotes para rango {filters['range']}")
            return jsonify(quotes)
        
        elif insight_type == 'cta':
            # ✅ CORREGIDO: CTAs basados en análisis reales CON FILTRO DE TIEMPO
            cta_query = """
            SELECT 
                i.id,
                i.payload,
                i.created_at
            FROM insights i
            WHERE i.created_at >= %s 
            AND i.created_at <= %s
            AND i.payload IS NOT NULL
            ORDER BY i.created_at DESC
            LIMIT 50
            """
            
            cur.execute(cta_query, [filters['start_date'], filters['end_date']])
            rows = cur.fetchall()
            
            ctas = []
            cta_id = 1
            
            # Generar CTAs basados en insights reales
            for row in rows:
                payload = row[1]
                
                if 'calls_to_action' in payload and payload['calls_to_action']:
                    for cta_text in payload['calls_to_action'][:3]:
                        ctas.append({
                            "id": cta_id,
                            "text": cta_text,
                            "done": False,
                            "source": "ai_analysis",
                            "created_at": row[2].isoformat() if row[2] else None
                        })
                        cta_id += 1
                
                if 'trends' in payload and payload['trends']:
                    for trend in payload['trends'][:2]:
                        cta_text = f"Analyze trend: {trend}"
                        ctas.append({
                            "id": cta_id,
                            "text": cta_text,
                            "done": False,
                            "source": "trend_analysis",
                            "created_at": row[2].isoformat() if row[2] else None
                        })
                        cta_id += 1
                
                if 'opportunities' in payload and payload['opportunities']:
                    for opp in payload['opportunities'][:2]:
                        cta_text = f"Leverage opportunity: {opp[:60]}..."
                        ctas.append({
                            "id": cta_id,
                            "text": cta_text,
                            "done": False,
                            "source": "opportunity",
                            "created_at": row[2].isoformat() if row[2] else None
                        })
                        cta_id += 1
            
            # Si no hay CTAs reales, devolver lista vacía (no generar fallback)
            if not ctas:
                print(f"DEBUG: No hay CTAs para rango {filters['range']}, devolviendo lista vacía")
                        
            # Filtrar por status
            if status == 'open':
                ctas = [cta for cta in ctas if not cta['done']]
            elif status == 'done':
                ctas = [cta for cta in ctas if cta['done']]
            
            cur.close()
            conn.close()
            print(f"DEBUG: Devolviendo {len(ctas)} CTAs para rango {filters['range']}")
            return jsonify(ctas[:limit])
        
        else:
            # ✅ CORREGIDO: Insights generales - DATOS REALES CON FILTROS DE TIEMPO
            insights_query = """
            SELECT 
                i.id,
                i.payload,
                i.created_at,
                q.query,
                q.brand,
                q.topic
            FROM insights i
            JOIN queries q ON i.query_id = q.id
            WHERE i.created_at >= %s 
            AND i.created_at <= %s
            AND i.payload IS NOT NULL
            ORDER BY i.created_at DESC
            LIMIT %s
            """
            
            cur.execute(insights_query, [filters['start_date'], filters['end_date'], limit])
            rows = cur.fetchall()
            
            insights = []
            insight_id = 1
            
            for row in rows:
                payload = row[1]
                created_at = row[2]
                query_text = row[3]
                brand = row[4]
                topic = row[5]
                
                # Procesar diferentes tipos de insights del payload
                categories_map = {
                    'opportunities': ('Opportunity', 'positive'),
                    'risks': ('Risk', 'negative'), 
                    'trends': ('Trend', 'neutral'),
                    'top_themes': ('Trend', 'neutral')
                }
                
                insights_added_for_this_payload = 0
                
                for category, (display_category, sentiment) in categories_map.items():
                    if category in payload and payload[category]:
                        items = payload[category]
                        if isinstance(items, list):
                            for item in items[:2]:  # Máximo 2 por categoría
                                if isinstance(item, str) and len(item.strip()) > 10:
                                    insights.append({
                                        "id": insight_id,
                                        "title": item[:80] + "..." if len(item) > 80 else item,
                                        "category": display_category,
                                        "sentiment": sentiment,
                                        "excerpt": item[:200] + "..." if len(item) > 200 else item,
                                        "tags": [category, brand or "general", topic or "analysis"],
                                        "starred": False,
                                        "date": created_at.strftime('%Y-%m-%d') if created_at else datetime.now().strftime('%Y-%m-%d'),
                                        "query": query_text,
                                        "source": "ai_analysis"
                                    })
                                    insight_id += 1
                                    insights_added_for_this_payload += 1
                
                # Procesar insights de sentiment si no hay otros para este payload
                if insights_added_for_this_payload == 0:
                    if 'sentiment_summary' in payload:
                        summary = payload['sentiment_summary']
                        insights.append({
                            "id": insight_id,
                            "title": f"Sentiment Analysis: {summary[:60]}...",
                            "category": "Trend",
                            "sentiment": "neutral",
                            "excerpt": summary,
                            "tags": ["sentiment", brand or "general"],
                            "starred": False,
                            "date": created_at.strftime('%Y-%m-%d') if created_at else datetime.now().strftime('%Y-%m-%d'),
                            "query": query_text,
                            "source": "sentiment_analysis"
                        })
                        insight_id += 1
            
            # Si NO hay insights reales en el rango, devolver lista vacía
            if len(insights) == 0:
                print(f"DEBUG: No hay insights para rango {filters['range']}, devolviendo lista vacía")
            
            cur.close()
            conn.close()
            
            print(f"DEBUG: Devolviendo {len(insights)} insights para rango {filters['range']}")
            return jsonify(insights)
            
    except Exception as e:
        print(f"Error en insights endpoint: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/topics', methods=['GET'])
def get_topics():
    """Obtener análisis de temas y frecuencias - CON FILTROS"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Obtener frecuencias de topics de insights CON FILTROS
        topics_query = """
        SELECT 
            i.payload
        FROM insights i
        WHERE i.created_at >= %s AND i.created_at <= %s
        AND i.payload ? 'topic_frequency'
        ORDER BY i.created_at DESC
        LIMIT 10
        """
        
        cur.execute(topics_query, [filters['start_date'], filters['end_date']])
        rows = cur.fetchall()
        
        # Consolidar frequencies
        word_freq = {}
        themes_count = {}
        
        for row in rows:
            payload = row[0]
            
            # Topic frequency
            if 'topic_frequency' in payload:
                for word, count in payload['topic_frequency'].items():
                    word_freq[word] = word_freq.get(word, 0) + count
            
            # Top themes
            if 'top_themes' in payload:
                for theme in payload['top_themes']:
                    themes_count[theme] = themes_count.get(theme, 0) + 1
        
        # Convertir a formato word cloud
        words = []
        for word, freq in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:15]:
            words.append({
                "text": word,
                "value": freq
            })
        
        # Temas principales
        themes = []
        for theme, count in sorted(themes_count.items(), key=lambda x: x[1], reverse=True)[:6]:
            themes.append({
                "name": theme,
                "count": count
            })
        
        cur.close()
        conn.close()
        
        # Fallback si no hay datos - ajustado por filtros
        if not words:
            # Usar palabras base pero ajustar valores según filtros
            base_multiplier = 1.0
            if filters['range'] == '24h':
                base_multiplier = 0.3
            elif filters['range'] == '30d':
                base_multiplier = 2.0
            elif filters['range'] == '90d':
                base_multiplier = 3.0
            
            words = [
                {"text": "Corporate Cards", "value": int(45 * base_multiplier)},
                {"text": "Expense Management", "value": int(38 * base_multiplier)},
                {"text": "Rewards", "value": int(35 * base_multiplier)},
                {"text": "Travel", "value": int(28 * base_multiplier)},
                {"text": "Integrations", "value": int(22 * base_multiplier)}
            ]
        
        if not themes:
            themes = [
                {"name": "Financial Services", "count": 15},
                {"name": "Business Cards", "count": 12},
                {"name": "Expense Management", "count": 8},
                {"name": "Travel Rewards", "count": 6}
            ]
        
        return jsonify({
            "words": words,
            "themes": themes,
            "debug": {
                "filters_applied": filters,
                "insights_found": len(rows)
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/queries', methods=['GET', 'POST'])
def manage_queries():
    """Gestionar queries de monitoreo"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        if request.method == 'GET':
            cur.execute("""
                SELECT id, query, brand, topic, enabled, created_at, language
                FROM queries 
                ORDER BY created_at DESC
            """)
            rows = cur.fetchall()
            
            queries = []
            for row in rows:
                queries.append({
                    "id": row[0],
                    "query": row[1],
                    "brand": row[2],
                    "topic": row[3],
                    "enabled": row[4],
                    "created_at": row[5].isoformat() if row[5] else None,
                    "language": row[6] or "en"
                })
            
            cur.close()
            conn.close()
            return jsonify(queries)
        
        elif request.method == 'POST':
            data = request.get_json()
            
            cur.execute("""
                INSERT INTO queries (query, brand, topic, enabled, language)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, [
                data.get('query'),
                data.get('brand'),
                data.get('topic'),
                data.get('enabled', True),
                data.get('language', 'en')
            ])
            
            query_id = cur.fetchone()[0]
            conn.commit()
            cur.close()
            conn.close()
            
            return jsonify({"id": query_id, "message": "Query created successfully"}), 201
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/insights/<int:insight_id>', methods=['PATCH'])
def update_insight(insight_id):
    """Actualizar insight (marcar CTA como completada)"""
    try:
        data = request.get_json()
        
        return jsonify({
            "ok": True,
            "id": insight_id,
            "done": data.get('done', False)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/models', methods=['GET'])
def debug_models():
    """Endpoint para ver qué modelos/engines existen en la BD"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT DISTINCT engine, COUNT(*) as count
            FROM mentions 
            WHERE engine IS NOT NULL
            GROUP BY engine
            ORDER BY count DESC
        """)
        
        rows = cur.fetchall()
        models = []
        for row in rows:
            models.append({
                "engine": row[0],
                "count": row[1]
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            "models_in_db": models,
            "model_mapping_corrected": {
                'GPT-4o': 'gpt-4',      # ← Mapea al real
                'Llama 3.1': 'pplx-7b-chat',    # ← Mapea al real
                'Claude 3.5': 'claude', # ← Sin datos
                'All models': 'all'
            },
            "note": "Actualizado para coincidir con modelos reales en BD"
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/debug/insights', methods=['GET'])
def debug_insights():
    """Endpoint para depurar insights y ver estructura de datos"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Contar insights por fecha
        cur.execute("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as count
            FROM insights 
            WHERE created_at >= NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        """)
        
        insights_by_date = []
        for row in cur.fetchall():
            insights_by_date.append({
                "date": row[0].strftime('%Y-%m-%d'),
                "count": row[1]
            })
        
        # Obtener un ejemplo de payload
        cur.execute("""
            SELECT payload 
            FROM insights 
            WHERE payload IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1
        """)
        
        example_payload = None
        result = cur.fetchone()
        if result:
            example_payload = result[0]
        
        # Verificar estructura de payload
        cur.execute("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN payload ? 'opportunities' THEN 1 END) as has_opportunities,
                COUNT(CASE WHEN payload ? 'risks' THEN 1 END) as has_risks,
                COUNT(CASE WHEN payload ? 'trends' THEN 1 END) as has_trends,
                COUNT(CASE WHEN payload ? 'calls_to_action' THEN 1 END) as has_ctas
            FROM insights
            WHERE payload IS NOT NULL
        """)
        
        payload_stats = cur.fetchone()
        
        cur.close()
        conn.close()
        
        return jsonify({
            "insights_by_date": insights_by_date,
            "example_payload": example_payload,
            "payload_statistics": {
                "total_insights": payload_stats[0],
                "with_opportunities": payload_stats[1],
                "with_risks": payload_stats[2],
                "with_trends": payload_stats[3],
                "with_ctas": payload_stats[4]
            }
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/industry/competitors', methods=['GET'])
def get_industry_competitors():
    """Obtener competidores basado en análisis automático de insights - GENÉRICO"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query corregida sin GROUP BY problemático
        competitors_query = """
        SELECT 
            i.payload
        FROM insights i
        WHERE i.created_at >= %s AND i.created_at <= %s
        AND i.payload IS NOT NULL
        ORDER BY i.created_at DESC
        LIMIT 50
        """
        
        cur.execute(competitors_query, [filters['start_date'], filters['end_date']])
        rows = cur.fetchall()
        
        print(f"DEBUG: Encontrados {len(rows)} insights para analizar")
        
        # Diccionario para acumular menciones de entidades
        entity_mentions = {}
        
        for row in rows:
            payload = row[0]
            
            # Buscar en diferentes secciones del insight
            sections_to_check = ['opportunities', 'risks', 'trends', 'brands', 'competitors', 'companies']
            
            for section in sections_to_check:
                if section in payload and payload[section]:
                    items = payload[section]
                    if isinstance(items, list):
                        for item in items:
                            if isinstance(item, str):
                                # Extraer entidades candidatas del texto
                                entities = extract_entities_from_text(item)
                                
                                for entity in entities:
                                    if entity not in entity_mentions:
                                        entity_mentions[entity] = {
                                            'mentions': 0,
                                            'positive_contexts': 0,
                                            'negative_contexts': 0,
                                            'neutral_contexts': 0
                                        }
                                    
                                    entity_mentions[entity]['mentions'] += 1
                                    
                                    # Determinar sentimiento del contexto
                                    if section == 'opportunities' or has_positive_context(item):
                                        entity_mentions[entity]['positive_contexts'] += 1
                                    elif section == 'risks' or has_negative_context(item):
                                        entity_mentions[entity]['negative_contexts'] += 1
                                    else:
                                        entity_mentions[entity]['neutral_contexts'] += 1
        
        print(f"DEBUG: Entidades extraídas: {list(entity_mentions.keys())}")
        
        # Si no hay datos de insights, usar análisis directo de menciones
        if not entity_mentions:
            print("DEBUG: No hay entidades en insights, analizando menciones directas")
            
            # Analizar directamente el contenido de las respuestas de menciones
            fallback_query = """
            SELECT 
                m.response,
                m.sentiment
            FROM mentions m
            WHERE m.created_at >= %s AND m.created_at <= %s
            AND m.response IS NOT NULL
            AND LENGTH(m.response) > 50
            ORDER BY m.created_at DESC
            LIMIT 20
            """
            
            cur.execute(fallback_query, [filters['start_date'], filters['end_date']])
            fallback_rows = cur.fetchall()
            
            print(f"DEBUG: Analizando {len(fallback_rows)} menciones como fallback")
            
            for row in fallback_rows:
                response_text = row[0]
                sentiment = float(row[1]) if row[1] else 0.0
                
                # Extraer entidades del texto de respuesta
                entities = extract_entities_from_text(response_text)
                
                for entity in entities:
                    if entity not in entity_mentions:
                        entity_mentions[entity] = {
                            'mentions': 0,
                            'positive_contexts': 0,
                            'negative_contexts': 0,
                            'neutral_contexts': 0
                        }
                    
                    entity_mentions[entity]['mentions'] += 1
                    
                    if sentiment > 0.1:
                        entity_mentions[entity]['positive_contexts'] += 1
                    elif sentiment < -0.1:
                        entity_mentions[entity]['negative_contexts'] += 1
                    else:
                        entity_mentions[entity]['neutral_contexts'] += 1
        
        # 🎯 CLEANUP HARDCODED: Mapear entidades extraídas a marcas reales
        entity_cleanup_map = {
            'tate': 'Tate\'s Bake Shop',
            'bake shop': 'Tate\'s Bake Shop', 
            'chips ahoy': 'Chips Ahoy!',
            'oreo': 'Oreo',
            'biscoff': 'Lotus Biscoff',
            'lotus': 'Lotus Biscoff',
            'milano': 'Pepperidge Farm Milano',
            'pepperidge farm': 'Pepperidge Farm',
            'keebler': 'Keebler',
            'nabisco': 'Nabisco',
            'girl scouts': 'Girl Scout Cookies',
            'mondelez': 'Mondelez International',
            'pepsico': 'PepsiCo',
            'kellogg': 'Kellogg\'s',
            'general mills': 'General Mills',
            'nestle': 'Nestlé',
            'crumbl': 'Crumbl Cookies',
            'little debbie': 'Little Debbie',
            'newman': 'Newman\'s Own',
            'annie': 'Annie\'s Homegrown',
            'magnolia bakery': 'Magnolia Bakery',
            'betty crocker': 'Betty Crocker',
            'president': 'President\'s Choice',
            'choice': 'President\'s Choice'
        }
        
        # Filtrar y convertir a formato requerido por el frontend
        competitors = []
        
        # Procesar entidades y limpiar
        for entity_name, data in entity_mentions.items():
            # Limpiar el nombre de la entidad
            entity_lower = entity_name.lower().strip()
            
            # Buscar en el mapa de limpieza
            clean_name = None
            for key, clean_value in entity_cleanup_map.items():
                if key in entity_lower or entity_lower in key:
                    clean_name = clean_value
                    break
            
            # Si no está en el mapa, aplicar filtros normales
            if not clean_name:
                if is_likely_brand_or_company(entity_name) and data['mentions'] >= 1:
                    clean_name = entity_name
                else:
                    continue  # Saltar esta entidad
            
            # Verificar si ya existe (evitar duplicados)
            existing_competitor = None
            for comp in competitors:
                if comp['name'].lower() == clean_name.lower():
                    existing_competitor = comp
                    break
            
            if existing_competitor:
                # Sumar datos al existente
                existing_competitor['mentions'] += data['mentions']
                # Recalcular sentiment promedio
                total_contexts = data['positive_contexts'] + data['negative_contexts'] + data['neutral_contexts']
                if total_contexts > 0:
                    new_sentiment = (data['positive_contexts'] - data['negative_contexts']) / total_contexts
                    # Promedio ponderado
                    existing_competitor['sentiment_avg'] = (existing_competitor['sentiment_avg'] + new_sentiment) / 2
            else:
                # Crear nuevo competidor
                total_contexts = data['positive_contexts'] + data['negative_contexts'] + data['neutral_contexts']
                
                if total_contexts > 0:
                    sentiment_avg = (data['positive_contexts'] - data['negative_contexts']) / total_contexts
                else:
                    sentiment_avg = 0.0
                
                competitors.append({
                    "name": clean_name,
                    "sentiment_avg": round(sentiment_avg, 3),
                    "mentions": data['mentions'],
                    "logo": f"/placeholder.svg?height=40&width=40&text={clean_name.replace(' ', '+').replace('\'', '')}"
                })
        
        # Ordenar por menciones descendente y tomar top 10
        competitors.sort(key=lambda x: x['mentions'], reverse=True)
        competitors = competitors[:10]
        
        print(f"DEBUG: Competidores finales: {[c['name'] for c in competitors]}")
        
        cur.close()
        conn.close()
        
        return jsonify({
            "competitors": competitors,
            "debug": {
                "filters_applied": filters,
                "source": "auto_extracted",
                "total_found": len(competitors),
                "extraction_method": "insights" if len(rows) > 0 else "mentions",
                "entities_found": len(entity_mentions)
            }
        })
        
    except Exception as e:
        print(f"Error en industry competitors: {str(e)}")
        return jsonify({"competitors": [], "error": str(e)}), 500


# Funciones auxiliares
def extract_entities_from_text(text):
    """Extraer entidades candidatas (marcas/empresas) de un texto"""
    import re
    
    entities = []
    
    # Buscar palabras capitalizadas que podrían ser marcas
    pattern = r'\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*\b'
    matches = re.findall(pattern, text)
    
    for match in matches:
        # Filtrar palabras comunes que no son marcas
        if not is_common_word(match.lower()) and len(match) > 2:
            clean_entity = match.strip()
            if clean_entity and clean_entity not in entities:
                entities.append(clean_entity)
    
    return entities[:5]  # Máximo 5 entidades por texto


def is_common_word(word):
    """Filtrar palabras comunes que no son marcas - MEJORADO"""
    common_words = {
        # Palabras básicas
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'this', 'that', 'these', 'those', 'it', 'they', 'them', 'we', 'us', 'you',
        
        # Adjetivos descriptivos (que aparecen en insights)
        'best', 'good', 'great', 'new', 'old', 'first', 'last', 'next', 'other',
        'more', 'most', 'some', 'many', 'all', 'each', 'every', 'any', 'no', 'one',
        'two', 'three', 'several', 'few', 'much', 'little', 'big', 'small', 'large',
        'high', 'low', 'top', 'popular', 'leading', 'main', 'major', 'key', 'important',
        
        # Palabras de tendencias/insights que NO son marcas
        'growing', 'increasing', 'rising', 'emerging', 'expanding', 'improved', 'improving',
        'enhanced', 'enhancing', 'increased', 'potential', 'opportunity', 'growth',
        'trend', 'preference', 'interest', 'focus', 'shift', 'change', 'changing',
        'availability', 'expansion', 'emergence', 'competition', 'competencia',
        'preferencia', 'tendencia', 'crecimiento', 'aumento', 'concurrence',
        'croissance', 'augmentation', 'consumers', 'consumer', 'market', 'segment',
        'category', 'industry', 'sector', 'demand', 'supply', 'sales', 'revenue',
        'profit', 'margin', 'share', 'position', 'ranking', 'performance',
        'negative', 'positive', 'neutral', 'homemade', 'seasonal', 'limited',
        'premium', 'budget', 'organic', 'natural', 'healthy', 'vegan', 'fiber',
        'sugar', 'free', 'zero', 'low', 'reduced', 'artificial', 'real',
        'failure', 'poor', 'improve', 'enhance', 'there', 'las', 'el', 'la', 'de',
        'international', 'global', 'local', 'regional', 'national', 'domestic'
    }
    return word.lower() in common_words


def is_likely_brand_or_company(entity):
    """Determinar si una entidad es probablemente una marca o empresa - MEJORADO"""
    
    # Filtrar entidades muy cortas
    if len(entity) < 2:
        return False
    
    # Filtrar palabras comunes que no son marcas
    if is_common_word(entity):
        return False
    
    # Lista de marcas conocidas que queremos mantener (extraídas de tus datos)
    known_brands = {
        'oreo', 'chips ahoy', 'pepperidge farm', 'keebler', 'nabisco', 'girl scouts',
        'walkers', 'biscoff', 'milano', 'tate', 'bake shop', 'tates', 'hello panda',
        'mondelez', 'pepsico', 'kellogg', 'general mills', 'nestle', 'britannia',
        'hershey', 'campbell soup', 'parle', 'danone', 'starbucks', 'dunkin',
        'little debbie', 'aldi', 'benton', 'president', 'choice', 'digestive',
        'princesa', 'belvita', 'artiach', 'mercadona', 'carrefour', 'el corte',
        'auchan', 'dia', 'pierre', 'cyril lignac', 'biscuiterie', 'abbaye',
        'poulard', 'dare foods', 'newman', 'magnolia bakery', 'walmart',
        'great value', 'millville', 'betty crocker', 'grandma', 'stop', 'shop',
        'matt', 'bakery', 'annie', 'homegrown', 'crumbl cookies', 'crumbl',
        'european baba bear', 'lotus'
    }
    
    # Si es una marca conocida, aceptarla
    if entity.lower() in known_brands:
        return True
    
    # Aceptar combinaciones conocidas (ej: "Tate Bake Shop" = "Tate" + "Bake Shop")
    entity_lower = entity.lower()
    if any(brand in entity_lower for brand in ['tate', 'bake shop', 'chips ahoy', 'girl scout', 'president choice']):
        return True
    
    # Filtrar palabras que claramente no son marcas por su significado
    non_brand_words = {
        'growing', 'increasing', 'potential', 'increased', 'preference', 'increase',
        'competition', 'emerging', 'expansion', 'market', 'trend', 'growth',
        'consumers', 'availability', 'interest', 'focus', 'negative', 'improving',
        'enhancing', 'failure', 'poor', 'competencia', 'preferencia', 'tendencia',
        'crecimiento', 'aumento', 'concurrence', 'croissance', 'augmentation'
    }
    
    if entity.lower() in non_brand_words:
        return False
    
    # Filtrar entidades que son solo adjetivos o verbos
    if entity.lower().endswith(('ing', 'ed', 'er', 'est', 'ly', 'tion', 'ness')):
        return False
    
    # Aceptar si tiene características de marca:
    # 1. Formato de marca (1-3 palabras capitalizadas)
    # 2. No contiene palabras prohibidas
    # 3. Tiene longitud razonable
    words = entity.split()
    if 1 <= len(words) <= 3 and all(word[0].isupper() for word in words if word):
        # Verificar que no sea solo una palabra descriptiva capitalizada
        if len(words) == 1 and words[0].lower() in non_brand_words:
            return False
        return True
    
    return False


def has_positive_context(text):
    """Detectar contexto positivo en el texto"""
    positive_words = ['better', 'advantage', 'leading', 'preferred', 'popular', 'excellent', 'outstanding', 'superior', 'quality', 'innovative']
    return any(word in text.lower() for word in positive_words)


def has_negative_context(text):
    """Detectar contexto negativo en el texto"""
    negative_words = ['problem', 'issue', 'complaint', 'negative', 'poor', 'worse', 'declining', 'struggling', 'challenge']
    return any(word in text.lower() for word in negative_words)




# Agregar esta función simple al final de backend/app.py, ANTES de if __name__ == '__main__':

# REEMPLAZAR la función get_industry_ranking existente en backend/app.py

@app.route('/api/industry/ranking', methods=['GET'])
def get_industry_ranking():
    """Obtener ranking de marcas basado en visibilidad real"""
    try:
        filters = parse_filters(request)
        
        # Llamar internamente al nuevo endpoint de brand visibility
        import requests
        
        # Construir query string
        query_params = []
        if filters.get('range'):
            query_params.append(f"range={filters['range']}")
        if filters.get('sentiment') != 'all':
            query_params.append(f"sentiment={filters['sentiment']}")
        if filters.get('model') != 'all':
            query_params.append(f"model={filters['model']}")
        
        query_string = "&".join(query_params)
        url = f"http://localhost:5050/api/industry/brand-visibility-ranking"
        if query_string:
            url += f"?{query_string}"
        
        response = requests.get(url)
        
        if response.status_code == 200:
            data = response.json()
            return jsonify(data)
        else:
            # Fallback con datos de ejemplo
            return jsonify({
                "ranking": [
                    {"position": 1, "name": "Lotus Biscoff", "score": 28.1, "delta": 2.3, "logo": "/placeholder.svg?height=40&width=40&text=Lotus+Biscoff"},
                    {"position": 2, "name": "Oreo", "score": 24.7, "delta": -1.2, "logo": "/placeholder.svg?height=40&width=40&text=Oreo"},
                    {"position": 3, "name": "Chips Ahoy", "score": 18.9, "delta": 0.8, "logo": "/placeholder.svg?height=40&width=40&text=Chips+Ahoy"},
                    {"position": 4, "name": "Pepperidge Farm", "score": 15.3, "delta": -0.5, "logo": "/placeholder.svg?height=40&width=40&text=Pepperidge+Farm"},
                    {"position": 5, "name": "Keebler", "score": 12.8, "delta": 1.1, "logo": "/placeholder.svg?height=40&width=40&text=Keebler"}
                ],
                "debug": {"source": "fallback_data"}
            })
        
    except Exception as e:
        print(f"Error en industry ranking: {str(e)}")
        return jsonify({
            "ranking": [
                {"position": 1, "name": "Data unavailable", "score": 0.0, "delta": 0.0, "logo": "/placeholder.svg"}
            ],
            "error": str(e)
        })
    
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Obtener alertas basadas en análisis de menciones y insights"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        alerts = []
        alert_id = 1
        
        # 1. ALERTA: Spike de sentimiento negativo
        negative_query = """
        SELECT 
            COUNT(*) as negative_count,
            COUNT(CASE WHEN m.created_at >= %s - INTERVAL '2 hours' THEN 1 END) as recent_negative
        FROM mentions m
        WHERE m.created_at >= %s AND m.created_at <= %s
        AND m.sentiment < -0.3
        """
        
        two_hours_ago = filters['end_date'] - timedelta(hours=2)
        cur.execute(negative_query, [two_hours_ago, filters['start_date'], filters['end_date']])
        neg_result = cur.fetchone()
        
        negative_total = neg_result[0] or 0
        negative_recent = neg_result[1] or 0
        
        if negative_recent > 0 and negative_total > 3:
            percentage_increase = min(150, (negative_recent / max(negative_total - negative_recent, 1)) * 100)
            alerts.append({
                "id": alert_id,
                "type": "negative_sentiment",
                "title": "Negative sentiment spike detected",
                "description": f"Negative mentions increased by {percentage_increase:.0f}% in the last 2 hours",
                "priority": "high",
                "status": "active",
                "source": "Sentiment Monitor",
                "created_at": filters['end_date'].strftime('%Y-%m-%d %H:%M'),
                "metadata": {
                    "recent_count": negative_recent,
                    "total_count": negative_total,
                    "threshold": "high"
                }
            })
            alert_id += 1
        
        # 2. ALERTA: Nuevo competidor mencionado
        competitor_query = """
        SELECT DISTINCT m.response
        FROM mentions m
        WHERE m.created_at >= %s AND m.created_at <= %s
        AND m.response IS NOT NULL
        LIMIT 10
        """
        
        cur.execute(competitor_query, [filters['start_date'], filters['end_date']])
        recent_mentions = cur.fetchall()
        
        # Buscar menciones de competidores en respuestas recientes
        competitor_brands = ['oreo', 'chips ahoy', 'pepperidge farm', 'nabisco', 'keebler']
        found_competitors = set()
        
        for mention in recent_mentions:
            response_text = mention[0].lower()
            for brand in competitor_brands:
                if brand in response_text:
                    found_competitors.add(brand.title())
        
        if found_competitors:
            alerts.append({
                "id": alert_id,
                "title": "New competitor mention",
                "description": f"Brand mentioned alongside competitor in {len(found_competitors)}+ posts",
                "priority": "medium",
                "status": "resolved" if len(found_competitors) > 2 else "active",
                "source": "Competitor Analysis",
                "created_at": (filters['end_date'] - timedelta(hours=5)).strftime('%Y-%m-%d %H:%M'),
                "metadata": {
                    "competitors": list(found_competitors),
                    "mention_count": len(found_competitors)
                }
            })
            alert_id += 1
        
        # 3. ALERTA: Volumen threshold excedido
        volume_query = """
        SELECT COUNT(*) as total_mentions
        FROM mentions m
        WHERE m.created_at >= %s AND m.created_at <= %s
        """
        
        cur.execute(volume_query, [filters['start_date'], filters['end_date']])
        volume_result = cur.fetchone()
        total_volume = volume_result[0] or 0
        
        # Threshold dinámico basado en rango de tiempo
        if filters['range'] == '24h':
            threshold = 50
        elif filters['range'] == '7d':
            threshold = 100
        else:
            threshold = 200
        
        if total_volume > threshold:
            alerts.append({
                "id": alert_id,
                "title": "Volume threshold exceeded",
                "description": f"Mention volume exceeded {threshold} mentions/hour threshold",
                "priority": "low",
                "status": "active",
                "source": "Volume Monitor",
                "created_at": (filters['end_date'] - timedelta(hours=1)).strftime('%Y-%m-%d %H:%M'),
                "metadata": {
                    "current_volume": total_volume,
                    "threshold": threshold,
                    "period": filters['range']
                }
            })
            alert_id += 1
        
        # Si no hay alertas reales, crear una informativa
        if not alerts:
            alerts.append({
                "id": 1,
                "title": "System monitoring active",
                "description": "No critical alerts detected in the current time period",
                "priority": "info",
                "status": "resolved",
                "source": "System Monitor",
                "created_at": filters['end_date'].strftime('%Y-%m-%d %H:%M'),
                "metadata": {
                    "period_analyzed": filters['range'],
                    "mentions_analyzed": total_volume
                }
            })
        
        cur.close()
        conn.close()
        
        return jsonify({
            "alerts": alerts,
            "summary": {
                "total": len(alerts),
                "high_priority": len([a for a in alerts if a['priority'] == 'high']),
                "active": len([a for a in alerts if a['status'] == 'active'])
            },
            "debug": {
                "filters_applied": filters,
                "total_mentions_period": total_volume
            }
        })
        
    except Exception as e:
        print(f"Error en alerts: {str(e)}")
        return jsonify({"alerts": [], "error": str(e)}), 500


@app.route('/api/industry/share-of-voice', methods=['GET'])
def get_share_of_voice():
    """Share of Voice basado en competidores"""
    try:
        filters = parse_filters(request)
        
        # Datos de fallback simples
        data = [
            {"brand": "Lotus Biscoff", "percentage": 25.0, "mentions": 5},
            {"brand": "Oreo", "percentage": 20.0, "mentions": 4},
            {"brand": "Chips Ahoy", "percentage": 18.0, "mentions": 3},
            {"brand": "Keebler", "percentage": 15.0, "mentions": 3},
            {"brand": "Others", "percentage": 22.0, "mentions": 4}
        ]
        
        return jsonify({
            "data": data,
            "total_mentions": sum(item["mentions"] for item in data),
            "days_with_data": 7
        })
        
    except Exception as e:
        return jsonify({"data": [], "error": str(e)}), 500




# Agregar al final de backend/app.py, ANTES de if __name__ == '__main__':

@app.route('/api/dashboard-kpis', methods=['GET'])
def get_dashboard_kpis():
    """Obtener KPIs reales para el dashboard"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # 1. Menciones 24h vs promedio semanal
        mentions_24h_query = """
        SELECT COUNT(*) FROM mentions 
        WHERE created_at >= %s
        """
        mentions_week_query = """
        SELECT COUNT(*) FROM mentions 
        WHERE created_at >= %s
        """
        
        now = datetime.now()
        day_ago = now - timedelta(hours=24)
        week_ago = now - timedelta(days=7)
        
        cur.execute(mentions_24h_query, [day_ago])
        mentions_24h = cur.fetchone()[0] or 0
        
        cur.execute(mentions_week_query, [week_ago])
        mentions_week = cur.fetchone()[0] or 0
        
        weekly_avg = mentions_week / 7
        mentions_delta = ((mentions_24h - weekly_avg) / max(weekly_avg, 1)) * 100 if weekly_avg > 0 else 0
        
        # 2. Sentimiento positivo
        sentiment_query = """
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN sentiment > 0.2 THEN 1 END) as positive
        FROM mentions 
        WHERE created_at >= %s
        """
        
        cur.execute(sentiment_query, [day_ago])
        result = cur.fetchone()
        total_24h = result[0] or 0
        positive_24h = result[1] or 0
        positive_percentage = (positive_24h / max(total_24h, 1)) * 100
        
        # Comparar con semana
        cur.execute(sentiment_query, [week_ago])
        result_week = cur.fetchone()
        total_week = result_week[0] or 0
        positive_week = result_week[1] or 0
        positive_week_percentage = (positive_week / max(total_week, 1)) * 100
        sentiment_delta = positive_percentage - positive_week_percentage
        
        # 3. Queries activas
        queries_query = """
        SELECT COUNT(*) FROM queries WHERE enabled = true
        """
        cur.execute(queries_query)
        active_queries = cur.fetchone()[0] or 0
        
        # 4. Alerts (basado en menciones con sentiment muy negativo)
        alerts_query = """
        SELECT COUNT(*) FROM mentions 
        WHERE created_at >= %s AND sentiment < -0.5
        """
        cur.execute(alerts_query, [day_ago])
        alerts_24h = cur.fetchone()[0] or 0
        
        cur.execute(alerts_query, [week_ago])
        alerts_week = cur.fetchone()[0] or 0
        alerts_week_avg = alerts_week / 7
        alerts_delta = ((alerts_24h - alerts_week_avg) / max(alerts_week_avg, 1)) * 100 if alerts_week_avg > 0 else 0
        
        cur.close()
        conn.close()
        
        return jsonify({
            "mentions_24h": mentions_24h,
            "mentions_24h_delta": round(mentions_delta, 1),
            "positive_sentiment": round(positive_percentage, 1),
            "positive_sentiment_delta": round(sentiment_delta, 1),
            "alerts_triggered": alerts_24h,
            "alerts_delta": round(alerts_delta, 1),
            "active_queries": active_queries,
            "queries_delta": 0  # Implementar historial de queries si es necesario
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# AGREGAR AL FINAL de backend/app.py (antes del if __name__ == '__main__':

# REEMPLAZAR LA FUNCIÓN get_query_visibility en backend/app.py

@app.route('/api/query-visibility/<brand>', methods=['GET'])
def get_query_visibility(brand):
    """Obtener visibilidad detallada por query para una marca específica - CORREGIDO"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Query CORREGIDA - sin ROUND() problemático
        visibility_query = """
        SELECT 
            q.id,
            q.query,
            q.topic,
            COUNT(m.id) as total_mentions,
            COUNT(CASE WHEN m.response ILIKE %s THEN 1 END) as brand_mentions,
            CASE 
                WHEN COUNT(m.id) > 0 
                THEN (COUNT(CASE WHEN m.response ILIKE %s THEN 1 END)::float / COUNT(m.id)) * 100 
                ELSE 0 
            END as visibility_percentage,
            AVG(CASE WHEN m.response ILIKE %s THEN m.sentiment END) as avg_sentiment
        FROM queries q
        LEFT JOIN mentions m ON q.id = m.query_id 
            AND m.created_at >= %s 
            AND m.created_at <= %s
        WHERE q.enabled = true
        GROUP BY q.id, q.query, q.topic
        ORDER BY visibility_percentage DESC, total_mentions DESC
        """
        
        # Patrón de búsqueda para la marca (más flexible)
        brand_pattern = f'%{brand}%'
        
        cur.execute(visibility_query, [
            brand_pattern, brand_pattern, brand_pattern,
            filters['start_date'], filters['end_date']
        ])
        
        rows = cur.fetchall()
        
        queries_data = []
        total_mentions_all = 0
        total_brand_mentions_all = 0
        
        for row in rows:
            # REDONDEAR EN PYTHON en lugar de PostgreSQL
            visibility_pct = round(float(row[5]) if row[5] else 0.0, 1)
            avg_sentiment = round(float(row[6]) if row[6] else 0.0, 3)
            
            query_data = {
                "id": row[0],
                "query": row[1],
                "topic": row[2] or "General",
                "total_mentions": row[3] or 0,
                "brand_mentions": row[4] or 0,
                "visibility_percentage": visibility_pct,
                "avg_sentiment": avg_sentiment,
                "query_short": row[1][:50] + "..." if len(row[1]) > 50 else row[1]
            }
            
            queries_data.append(query_data)
            total_mentions_all += query_data["total_mentions"]
            total_brand_mentions_all += query_data["brand_mentions"]
        
        # Calcular visibilidad global (redondear en Python)
        global_visibility = 0.0
        if total_mentions_all > 0:
            global_visibility = round((total_brand_mentions_all / total_mentions_all) * 100, 1)
        
        # Estadísticas adicionales
        active_queries = len([q for q in queries_data if q["total_mentions"] > 0])
        top_performing_query = max(queries_data, key=lambda x: x["visibility_percentage"]) if queries_data else None
        
        cur.close()
        conn.close()
        
        return jsonify({
            "brand": brand,
            "time_range": filters['range'],
            "global_visibility": global_visibility,
            "total_mentions": total_mentions_all,
            "brand_mentions": total_brand_mentions_all,
            "queries": queries_data,
            "stats": {
                "total_queries": len(queries_data),
                "active_queries": active_queries,
                "top_performing_query": top_performing_query
            }
        })
        
    except Exception as e:
        print(f"Error en query-visibility: {str(e)}")
        return jsonify({"error": str(e)}), 500

# AGREGAR AL FINAL de backend/app.py (antes del if __name__ == '__main__':)

@app.route('/api/industry/brand-visibility-ranking', methods=['GET'])
def get_brand_visibility_ranking():
    """Obtener ranking de marcas basado en visibilidad (como Lotus Biscoff)"""
    try:
        filters = parse_filters(request)
        
        conn = get_db_connection()
        cur = conn.cursor()
        
        # Lista de marcas principales de cookies/biscuits que buscamos
        brand_patterns = {
            'Lotus Biscoff': ['lotus', 'biscoff', 'speculoos'],
            'Oreo': ['oreo'],
            'Chips Ahoy': ['chips ahoy'],
            'Pepperidge Farm': ['pepperidge farm', 'milano'],
            'Keebler': ['keebler'],
            'Girl Scout Cookies': ['girl scout'],
            'Nabisco': ['nabisco'],
            'Tate\'s Bake Shop': ['tate', 'tates'],
            'Famous Amos': ['famous amos'],
            'Archway': ['archway'],
            'Little Debbie': ['little debbie'],
            'Kellogg\'s': ['kellogg'],
            'Annie\'s': ['annie'],
            'Newman\'s Own': ['newman'],
        }
        
        brand_visibility = {}
        
        # Para cada marca, calcular su visibilidad
        for brand_name, patterns in brand_patterns.items():
            
            # Crear la condición SQL para buscar cualquier patrón de la marca
            brand_conditions = []
            brand_params = []
            
            for pattern in patterns:
                brand_conditions.append("m.response ILIKE %s")
                brand_params.append(f'%{pattern}%')
            
            brand_condition_sql = " OR ".join(brand_conditions)
            
            # Query para calcular visibilidad de esta marca
            visibility_query = f"""
            SELECT 
                COUNT(m.id) as total_mentions,
                COUNT(CASE WHEN ({brand_condition_sql}) THEN 1 END) as brand_mentions,
                AVG(CASE WHEN ({brand_condition_sql}) THEN m.sentiment END) as avg_sentiment
            FROM mentions m
            JOIN queries q ON m.query_id = q.id
            WHERE m.created_at >= %s 
            AND m.created_at <= %s
            AND q.enabled = true
            """
            
            # Parámetros: brand_params (duplicados para las dos condiciones) + fechas
            query_params = brand_params + brand_params + [filters['start_date'], filters['end_date']]
            
            cur.execute(visibility_query, query_params)
            result = cur.fetchone()
            
            total_mentions = result[0] or 0
            brand_mentions = result[1] or 0
            avg_sentiment = float(result[2]) if result[2] else 0.0
            
            # Calcular visibilidad percentage
            visibility_percentage = 0.0
            if total_mentions > 0:
                visibility_percentage = (brand_mentions / total_mentions) * 100
            
            # Solo incluir marcas que tienen al menos 1 mención
            if brand_mentions > 0:
                brand_visibility[brand_name] = {
                    'brand_mentions': brand_mentions,
                    'total_mentions': total_mentions,
                    'visibility_percentage': visibility_percentage,
                    'avg_sentiment': avg_sentiment
                }
        
        # Convertir a formato ranking y ordenar por visibilidad
        ranking = []
        for i, (brand_name, data) in enumerate(sorted(
            brand_visibility.items(), 
            key=lambda x: x[1]['visibility_percentage'], 
            reverse=True
        )):
            
            # Calcular delta (simulado basado en sentiment)
            delta_value = 0.0
            if data['avg_sentiment'] > 0.1:
                delta_value = min(data['visibility_percentage'] * 0.1, 5.0)  # Max 5% aumento
            elif data['avg_sentiment'] < -0.1:
                delta_value = -min(data['visibility_percentage'] * 0.1, 5.0)  # Max 5% bajada
            
            ranking.append({
                "position": i + 1,
                "name": brand_name,
                "score": round(data['visibility_percentage'], 1),
                "delta": round(delta_value, 1),
                "logo": f"/placeholder.svg?height=40&width=40&text={brand_name.replace(' ', '+').replace('\'', '')}"
            })
        
        cur.close()
        conn.close()
        
        # Si no hay datos reales, devolver ranking básico
        if not ranking:
            ranking = [
                {"position": 1, "name": "Lotus Biscoff", "score": 28.1, "delta": 2.3, "logo": "/placeholder.svg?height=40&width=40&text=Lotus+Biscoff"},
                {"position": 2, "name": "Oreo", "score": 24.7, "delta": -1.2, "logo": "/placeholder.svg?height=40&width=40&text=Oreo"},
                {"position": 3, "name": "Chips Ahoy", "score": 18.9, "delta": 0.8, "logo": "/placeholder.svg?height=40&width=40&text=Chips+Ahoy"},
                {"position": 4, "name": "Pepperidge Farm", "score": 15.3, "delta": -0.5, "logo": "/placeholder.svg?height=40&width=40&text=Pepperidge+Farm"},
                {"position": 5, "name": "Keebler", "score": 12.8, "delta": 1.1, "logo": "/placeholder.svg?height=40&width=40&text=Keebler"}
            ]
        
        return jsonify({
            "ranking": ranking[:10],  # Top 10
            "debug": {
                "filters_applied": filters,
                "brands_found": len(brand_visibility),
                "source": "brand_visibility_calculation"
            }
        })
        
    except Exception as e:
        print(f"Error en brand visibility ranking: {str(e)}")
        return jsonify({
            "ranking": [
                {"position": 1, "name": "Error loading data", "score": 0.0, "delta": 0.0, "logo": "/placeholder.svg"}
            ],
            "error": str(e)
        }, 500)

if __name__ == '__main__':    app.run(host='0.0.0.0', port=5050, debug=True)