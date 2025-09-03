#!/usr/bin/env python3
"""
Script que genera un HTML con todos los datos de la base de datos
"""
import psycopg2
from dotenv import load_dotenv
import os
import json
from datetime import datetime
import html

load_dotenv()

def generate_html_report():
    # Conectar a la base de datos
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=int(os.getenv('DB_PORT', 5433)),
        database=os.getenv('DB_NAME', 'ai_visibility'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )
    
    cur = conn.cursor()
    
    # Obtener datos
    print("📊 Extrayendo datos de la base de datos...")
    
    # 1. Estadísticas generales
    cur.execute("SELECT COUNT(*) FROM queries")
    total_queries = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM mentions")
    total_mentions = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM insights")
    total_insights = cur.fetchone()[0]
    
    cur.execute("SELECT COUNT(*) FROM queries WHERE enabled = true")
    active_queries = cur.fetchone()[0]
    
    cur.execute("SELECT AVG(sentiment) FROM mentions WHERE sentiment IS NOT NULL")
    avg_sentiment = cur.fetchone()[0] or 0
    
    # 2. Queries
    cur.execute("""
        SELECT id, query, brand, enabled, created_at
        FROM queries 
        ORDER BY id
    """)
    queries = cur.fetchall()
    
    # 3. Menciones recientes
    cur.execute("""
        SELECT 
            m.id,
            m.query_id,
            m.source_url,
            m.source_title,
            m.response,
            m.source,
            m.engine,
            m.sentiment,
            m.created_at,
            q.query,
            q.brand
        FROM mentions m
        LEFT JOIN queries q ON m.query_id = q.id
        ORDER BY m.created_at DESC
        LIMIT 20
    """)
    mentions = cur.fetchall()
    
    # 4. Insights recientes
    cur.execute("""
        SELECT 
            i.id,
            i.query_id,
            i.payload,
            i.created_at,
            q.query,
            q.brand
        FROM insights i
        LEFT JOIN queries q ON i.query_id = q.id
        ORDER BY i.created_at DESC
        LIMIT 10
    """)
    insights = cur.fetchall()
    
    # 5. Estadísticas por query
    cur.execute("""
        SELECT 
            q.id,
            q.query,
            q.brand,
            COUNT(m.id) as total_mentions,
            COUNT(CASE WHEN m.sentiment > 0.2 THEN 1 END) as positive_mentions,
            AVG(m.sentiment) as avg_sentiment
        FROM queries q
        LEFT JOIN mentions m ON q.id = m.query_id
        GROUP BY q.id, q.query, q.brand
        ORDER BY total_mentions DESC
        LIMIT 15
    """)
    query_stats = cur.fetchall()
    
    cur.close()
    conn.close()
    
    # Generar HTML
    html_content = f"""
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Visibility - Reporte Completo de Base de Datos</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            text-align: center;
        }}
        
        .stat-number {{
            font-size: 3em;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 5px;
        }}
        
        .stat-label {{
            font-size: 1.1em;
            color: #666;
        }}
        
        .section {{
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }}
        
        .section h2 {{
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }}
        
        .table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        
        .table th,
        .table td {{
            padding: 12px 15px;
            text-align: left;
            border-bottom: 1px solid #eee;
        }}
        
        .table th {{
            background: #f8f9fa;
            font-weight: bold;
            color: #333;
        }}
        
        .table tr:hover {{
            background: #f8f9ff;
        }}
        
        .status-active {{
            color: #28a745;
            font-weight: bold;
        }}
        
        .status-inactive {{
            color: #dc3545;
            font-weight: bold;
        }}
        
        .mention-card {{
            background: #f8f9ff;
            border-left: 4px solid #667eea;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .mention-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }}
        
        .mention-id {{
            font-weight: bold;
            color: #667eea;
        }}
        
        .mention-date {{
            color: #666;
            font-size: 0.9em;
        }}
        
        .mention-content {{
            margin: 10px 0;
        }}
        
        .mention-response {{
            background: white;
            padding: 15px;
            border-radius: 6px;
            border: 1px solid #eee;
            font-size: 0.95em;
            line-height: 1.5;
        }}
        
        .insight-card {{
            background: linear-gradient(135deg, #e8f5e8, #f0f8f0);
            border-left: 4px solid #28a745;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .insight-content {{
            margin: 15px 0;
        }}
        
        .insight-section {{
            margin: 10px 0;
        }}
        
        .insight-title {{
            font-weight: bold;
            color: #28a745;
            margin-bottom: 5px;
        }}
        
        .insight-list {{
            background: white;
            padding: 10px;
            border-radius: 4px;
            margin: 5px 0;
        }}
        
        .problem-alert {{
            background: linear-gradient(135deg, #ffebee, #ffcdd2);
            border: 2px solid #f44336;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            color: #c62828;
        }}
        
        .success-alert {{
            background: linear-gradient(135deg, #e8f5e8, #c8e6c9);
            border: 2px solid #4caf50;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            color: #2e7d32;
        }}
        
        .footer {{
            text-align: center;
            color: white;
            padding: 20px;
            opacity: 0.8;
        }}
        
        .expandable {{
            cursor: pointer;
            background: #f0f0f0;
            padding: 10px;
            border-radius: 4px;
            margin: 5px 0;
        }}
        
        .expandable:hover {{
            background: #e0e0e0;
        }}
        
        .collapsed {{
            display: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AI Visibility - Reporte Completo</h1>
            <p>Generado: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{total_queries}</div>
                <div class="stat-label">Total Queries</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{active_queries}</div>
                <div class="stat-label">Queries Activas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{total_mentions}</div>
                <div class="stat-label">Total Menciones</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{total_insights}</div>
                <div class="stat-label">Total Insights</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">{avg_sentiment:.3f}</div>
                <div class="stat-label">Sentiment Promedio</div>
            </div>
        </div>
        
        {"<div class='problem-alert'><strong>⚠️ PROBLEMA DETECTADO:</strong> Sentiment promedio = 0. Todas las menciones tienen sentiment nulo, lo que afecta el cálculo de visibility.</div>" if avg_sentiment == 0 else "<div class='success-alert'><strong>✅ SISTEMA FUNCIONANDO:</strong> Sentiment analysis operativo.</div>"}
        
        <div class="section">
            <h2>Todas las Queries ({total_queries})</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Query</th>
                        <th>Marca</th>
                        <th>Estado</th>
                        <th>Creada</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    # Agregar queries
    for query in queries:
        qid, query_text, brand, enabled, created = query
        status = f"<span class='status-active'>✅ Activa</span>" if enabled else f"<span class='status-inactive'>❌ Inactiva</span>"
        created_str = created.strftime('%Y-%m-%d %H:%M') if created else 'N/A'
        
        html_content += f"""
                    <tr>
                        <td>{qid}</td>
                        <td>{html.escape(query_text[:100])}{'...' if len(query_text) > 100 else ''}</td>
                        <td>{html.escape(brand or 'N/A')}</td>
                        <td>{status}</td>
                        <td>{created_str}</td>
                    </tr>
        """
    
    html_content += """
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Estadísticas por Query</h2>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Query</th>
                        <th>Menciones</th>
                        <th>Positivas</th>
                        <th>Sentiment Avg</th>
                        <th>Visibility</th>
                    </tr>
                </thead>
                <tbody>
    """
    
    # Agregar estadísticas por query
    for stat in query_stats:
        qid, query_text, brand, total, positive, avg_sent = stat
        visibility = (positive / total * 100) if total > 0 else 0
        avg_sent_str = f"{avg_sent:.3f}" if avg_sent else "0.000"
        
        html_content += f"""
                    <tr>
                        <td>{qid}</td>
                        <td>{html.escape(query_text[:80])}{'...' if len(query_text) > 80 else ''}</td>
                        <td>{total}</td>
                        <td>{positive}</td>
                        <td>{avg_sent_str}</td>
                        <td>{visibility:.1f}%</td>
                    </tr>
        """
    
    html_content += f"""
                </tbody>
            </table>
        </div>
        
        <div class="section">
            <h2>Últimas {len(mentions)} Menciones</h2>
    """
    
    # Agregar menciones
    for i, mention in enumerate(mentions, 1):
        mid, qid, source_url, source_title, response, source, engine, sentiment, created, query_text, brand = mention
        created_str = created.strftime('%Y-%m-%d %H:%M:%S') if created else 'N/A'
        sentiment_str = f"{sentiment:.3f}" if sentiment else "0.000"
        
        html_content += f"""
            <div class="mention-card">
                <div class="mention-header">
                    <span class="mention-id">Mención #{i} (ID: {mid})</span>
                    <span class="mention-date">{created_str}</span>
                </div>
                <div class="mention-content">
                    <strong>Query:</strong> {html.escape(query_text[:100] if query_text else 'N/A')}<br>
                    <strong>Marca:</strong> {html.escape(brand or 'N/A')}<br>
                    <strong>Fuente:</strong> {html.escape(source or 'N/A')} | 
                    <strong>Motor:</strong> {html.escape(engine or 'N/A')}<br>
                    <strong>URL:</strong> {html.escape(source_url[:100] if source_url else 'N/A')}<br>
                    <strong>Título:</strong> {html.escape(source_title[:100] if source_title else 'N/A')}<br>
                    <strong>Sentiment:</strong> {sentiment_str}
                </div>
                
                <div class="expandable" onclick="toggleContent('response-{mid}')">
                    <strong>▼ Ver Respuesta IA</strong>
                </div>
                <div id="response-{mid}" class="collapsed">
                    <div class="mention-response">
                        {html.escape(response[:500] if response else 'Sin respuesta')}{'...' if response and len(response) > 500 else ''}
                    </div>
                </div>
            </div>
        """
    
    html_content += f"""
        </div>
        
        <div class="section">
            <h2>Últimos {len(insights)} Insights</h2>
    """
    
    # Agregar insights
    for i, insight in enumerate(insights, 1):
        iid, qid, payload, created, query_text, brand = insight
        created_str = created.strftime('%Y-%m-%d %H:%M:%S') if created else 'N/A'
        
        html_content += f"""
            <div class="insight-card">
                <div class="mention-header">
                    <span class="mention-id">Insight #{i} (ID: {iid})</span>
                    <span class="mention-date">{created_str}</span>
                </div>
                <div class="mention-content">
                    <strong>Query:</strong> {html.escape(query_text[:100] if query_text else 'N/A')}<br>
                    <strong>Marca:</strong> {html.escape(brand or 'N/A')}
                </div>
                
                <div class="expandable" onclick="toggleContent('insight-{iid}')">
                    <strong>▼ Ver Contenido del Insight</strong>
                </div>
                <div id="insight-{iid}" class="collapsed">
        """
        
        if payload:
            for category in ['opportunities', 'risks', 'trends', 'calls_to_action']:
                if category in payload and payload[category]:
                    items = payload[category]
                    if isinstance(items, list) and items:
                        html_content += f"""
                        <div class="insight-section">
                            <div class="insight-title">{category.upper().replace('_', ' ')} ({len(items)} items):</div>
                            <div class="insight-list">
                        """
                        for item in items[:5]:  # Máximo 5 items por categoría
                            html_content += f"• {html.escape(str(item))}<br>"
                        html_content += """
                            </div>
                        </div>
                        """
        else:
            html_content += "<p>Sin payload disponible</p>"
            
        html_content += """
                </div>
            </div>
        """
    
    html_content += """
        </div>
    </div>
    
    <div class="footer">
        <p>AI Visibility MVP - Reporte generado automáticamente desde base de datos PostgreSQL</p>
    </div>
    
    <script>
        function toggleContent(id) {
            const element = document.getElementById(id);
            const trigger = element.previousElementSibling;
            
            if (element.classList.contains('collapsed')) {
                element.classList.remove('collapsed');
                trigger.innerHTML = '<strong>▲ Ocultar</strong>';
            } else {
                element.classList.add('collapsed');
                trigger.innerHTML = '<strong>▼ Ver Contenido</strong>';
            }
        }
    </script>
</body>
</html>
    """
    
    # Guardar archivo HTML
    filename = f"database_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"✅ Reporte HTML generado: {filename}")
    print(f"📊 Estadísticas incluidas:")
    print(f"   - {total_queries} queries")
    print(f"   - {total_mentions} menciones")
    print(f"   - {total_insights} insights")
    print(f"   - Últimas 20 menciones detalladas")
    print(f"   - Últimos 10 insights completos")
    
    return filename

if __name__ == "__main__":
    try:
        filename = generate_html_report()
        print(f"\n🚀 Para ver el reporte:")
        print(f"   open {filename}")  # Mac
        print(f"   start {filename}")  # Windows  
        print(f"   xdg-open {filename}")  # Linux
        
    except Exception as e:
        print(f"❌ Error generando reporte: {e}")
        import traceback
        traceback.print_exc()
