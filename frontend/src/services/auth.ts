const API_BASE = 'http://localhost:5000/api'

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
