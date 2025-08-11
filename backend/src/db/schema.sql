-- Tabla de queries
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    brand TEXT,
    topic TEXT,  -- Nuevo campo opcional para subcategorías o productos
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de menciones
CREATE TABLE IF NOT EXISTS mentions (
    id SERIAL PRIMARY KEY,
    query_id INTEGER REFERENCES queries(id) ON DELETE CASCADE,
    engine TEXT NOT NULL,              -- Ej: gpt-4, gpt-3.5, claude, etc.
    source TEXT,                       -- Ej: openai, perplexity, serpapi
    response TEXT NOT NULL,
    sentiment FLOAT,
    source_url TEXT,
    language TEXT DEFAULT 'unknown',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar joins y filtros por query
CREATE INDEX IF NOT EXISTS idx_mentions_query_id ON mentions(query_id);

