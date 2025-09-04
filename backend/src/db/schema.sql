-- backend/src/db/schema.sql (versión mejorada)

CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    brand TEXT,
    topic TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    language TEXT DEFAULT 'en'
);

CREATE TABLE IF NOT EXISTS mentions (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,
    source TEXT,
    response TEXT NOT NULL,
    sentiment FLOAT,
    emotion TEXT,
    confidence_score REAL,
    source_url TEXT,
    source_title TEXT,
    language TEXT DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- CAMPOS ENRIQUECIDOS PARA UN FRONTEND SUPERIOR --
    summary TEXT,                         -- Resumen generado por IA (1-2 frases).
    key_topics TEXT[],                    -- Array con los temas/marcas clave.
    generated_insight_id INTEGER         -- Enlace al insight detallado (si se generó).
);

CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,
    -- ... (el resto de tu tabla insights se mantiene igual)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_mentions_query_id ON mentions(query_id);
CREATE INDEX IF NOT EXISTS idx_insights_query_id ON insights(query_id);