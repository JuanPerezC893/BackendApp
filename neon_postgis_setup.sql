-- Habilitar extensión PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Tabla de Usuarios
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('PLAYER', 'OWNER')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Deportes
CREATE TABLE IF NOT EXISTS sports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 3. Tabla de Intereses de Jugadores
CREATE TABLE IF NOT EXISTS user_interests (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sport_id INTEGER REFERENCES sports(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, sport_id)
);

-- 4. Tabla de Canchas (Optimizada con GEOGRAPHY)
CREATE TABLE IF NOT EXISTS courts (
    id SERIAL PRIMARY KEY,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índice GIST para búsquedas espaciales
CREATE INDEX IF NOT EXISTS idx_courts_location ON courts USING GIST (location);

-- Inserción de deportes base
INSERT INTO sports (name) VALUES ('Padel'), ('Futbol'), ('Tennis'), ('Basquetbol') ON CONFLICT DO NOTHING;
