import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb } from '../config/db.js'

if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not defined!')
}
const JWT_SECRET = process.env.JWT_SECRET

export async function register(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son obligatorios' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' })
    }

    const db = await getDb()

    const existing = await db.get('SELECT id FROM users WHERE username = ?', username)
    if (existing) {
      return res.status(409).json({ error: 'El usuario ya existe' })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const result = await db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      username,
      hashedPassword
    )

    const token = jwt.sign(
      { user_id: result.lastID, username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ token, user: { id: result.lastID, username } })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: 'Error al registrar' })
  }
}

export async function login(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'username y password son obligatorios' })
    }

    const db = await getDb()

    const user = await db.get('SELECT id, username, password FROM users WHERE username = ?', username)
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const token = jwt.sign(
      { user_id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}
