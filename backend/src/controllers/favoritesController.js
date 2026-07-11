import { getDb } from '../config/db.js'

export async function getFavorites(req, res) {
  try {
    console.log('Cargando favoritos para el usuario:', req.user.id)
    const db = await getDb()
    const favorites = await db.all(
      'SELECT stationuuid AS id, name, favicon, url_resolved AS url FROM favorites WHERE user_id = ?',
      req.user.id
    )
    res.json(favorites)
  } catch (err) {
    console.error('Get favorites error:', err)
    res.status(500).json({ error: 'Error al obtener favoritos' })
  }
}

export async function addFavorite(req, res) {
  try {
    const { id: stationuuid, name, favicon, url_resolved } = req.body
    const url = req.body.url || req.body.url_resolved

    if (!stationuuid || !name) {
      return res.status(400).json({ error: 'id y name son obligatorios' })
    }

    const db = await getDb()

    await db.run(
      'INSERT INTO favorites (user_id, stationuuid, name, favicon, url_resolved) VALUES (?, ?, ?, ?, ?)',
      req.user.id,
      stationuuid,
      name,
      favicon || null,
      url_resolved || url || null
    )

    res.status(201).json({
      id: stationuuid,
      name,
      favicon,
      url: url_resolved || url,
    })
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ message: 'Esta emisora ya está en tus favoritos' })
    }
    console.error('Add favorite error:', err)
    res.status(500).json({ error: 'Error al añadir favorito' })
  }
}

export async function removeFavorite(req, res) {
  try {
    const { id } = req.params

    const db = await getDb()

    const result = await db.run(
      'DELETE FROM favorites WHERE stationuuid = ? AND user_id = ?',
      id,
      req.user.id
    )

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Favorito no encontrado' })
    }

    res.json({ message: 'Favorito eliminado' })
  } catch (err) {
    console.error('Remove favorite error:', err)
    res.status(500).json({ error: 'Error al eliminar favorito' })
  }
}
