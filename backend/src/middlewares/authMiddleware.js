import jwt from 'jsonwebtoken'

if (!process.env.JWT_SECRET) {
  throw new Error('CRITICAL: JWT_SECRET environment variable is not defined!')
}
const JWT_SECRET = process.env.JWT_SECRET

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }

  const token = header.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = { id: decoded.user_id, username: decoded.username }
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}
