import { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Configuración de la base de datos Neon (usando variables de entorno)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function (req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  try {
    const client = await pool.connect();
    
    // Consulta SQL con ST_DWithin para un radio de 5km (5000 metros)
    const query = `
      SELECT 
        id, 
        name, 
        type, 
        description, 
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat
      FROM courts
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        5000
      )
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      LIMIT 20;
    `;

    const result = await client.query(query, [lng, lat]);
    client.release();

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
