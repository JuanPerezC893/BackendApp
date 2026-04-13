import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Registro/Login de Usuario
app.post('/api/users', async (req: Request, res: Response) => {
  const { email, role } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (email, role) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role RETURNING *',
      [email, role]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. Guardar Intereses de Deporte
app.post('/api/interests', async (req: Request, res: Response) => {
  const { userId, sports } = req.body; // sports es un array de nombres
  try {
    // Primero obtenemos los IDs de los deportes
    const sportsResult = await pool.query(
      'SELECT id FROM sports WHERE name = ANY($1)',
      [sports]
    );
    
    const sportIds = sportsResult.rows.map(r => r.id);
    
    // Insertamos los intereses (limpiando previos para simplicidad)
    await pool.query('DELETE FROM user_interests WHERE user_id = $1', [userId]);
    
    for (const sportId of sportIds) {
      await pool.query(
        'INSERT INTO user_interests (user_id, sport_id) VALUES ($1, $2)',
        [userId, sportId]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 3. Registrar Cancha (Owner)
app.post('/api/courts', async (req: Request, res: Response) => {
  const { ownerId, name, type, description, lat, lng } = req.body;
  try {
    const query = `
      INSERT INTO courts (owner_id, name, type, description, location)
      VALUES ($1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography)
      RETURNING *, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat;
    `;
    const result = await pool.query(query, [ownerId, name, type, description, lng, lat]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. Obtener Canchas Cercanas (Adaptado de Vercel)
app.get('/api/courts/nearby', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Latitude and Longitude are required and must be numbers' });
  }

  try {
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

    const result = await pool.query(query, [lng, lat]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
