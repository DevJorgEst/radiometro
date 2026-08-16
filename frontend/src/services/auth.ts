const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`

export async function register(
  username: string,
  password: string
): Promise<{ token: string; user: { id: number; username: string } }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  localStorage.setItem('token', data.token)
  return data
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: { id: number; username: string } }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Error ${res.status}`)
  }
  const data = await res.json()
  localStorage.setItem('token', data.token)
  return data
}

export async function validateToken(): Promise<{ user: { id: number; username: string } }> {
  const token = localStorage.getItem('token')
  if (!token) throw new Error('Sin sesión')

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    localStorage.removeItem('token')
    throw new Error(`Error ${res.status}`)
  }
  return res.json()
}
