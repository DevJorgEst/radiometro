import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')
const { closeDb } = await import('../src/config/db.js')

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`
      resolve()
    })
  })
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await closeDb()
})

async function post(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

async function get(path, token) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${baseUrl}${path}`, { headers })
}

async function del(path, token) {
  return fetch(`${baseUrl}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
}

test('registro exitoso devuelve 201 con token y usuario', async () => {
  const res = await post('/api/auth/register', { username: 'alice', password: 'password123' })
  assert.equal(res.status, 201)
  const body = await res.json()
  assert.ok(body.token)
  assert.equal(body.user.username, 'alice')
})

test('registro con contraseña corta devuelve 400', async () => {
  const res = await post('/api/auth/register', { username: 'bob', password: 'abc' })
  assert.equal(res.status, 400)
})

test('registro con usuario duplicado devuelve 409', async () => {
  const res = await post('/api/auth/register', { username: 'alice', password: 'password123' })
  assert.equal(res.status, 409)
})

test('registro sin campos devuelve 400', async () => {
  const res = await post('/api/auth/register', {})
  assert.equal(res.status, 400)
})

test('login exitoso devuelve 200 con token', async () => {
  const res = await post('/api/auth/login', { username: 'alice', password: 'password123' })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.ok(body.token)
  assert.equal(body.user.username, 'alice')
})

test('login con credenciales inválidas devuelve 401', async () => {
  const res = await post('/api/auth/login', { username: 'alice', password: 'incorrecta' })
  assert.equal(res.status, 401)
})

test('login de usuario inexistente devuelve 401', async () => {
  const res = await post('/api/auth/login', { username: 'ghost', password: 'password123' })
  assert.equal(res.status, 401)
})

test('GET /auth/me con token válido devuelve el usuario', async () => {
  const loginRes = await post('/api/auth/login', { username: 'alice', password: 'password123' })
  const { token } = await loginRes.json()
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.equal(body.user.username, 'alice')
})

test('GET /auth/me sin token devuelve 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`)
  assert.equal(res.status, 401)
})

test('GET /auth/me con token inválido devuelve 401', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: 'Bearer token-invalido' },
  })
  assert.equal(res.status, 401)
})

test('GET favoritos sin token devuelve 401', async () => {
  const res = await get('/api/favorites')
  assert.equal(res.status, 401)
})

test('flujo completo de favoritos: añadir, listar y eliminar', async () => {
  const loginRes = await post('/api/auth/login', { username: 'alice', password: 'password123' })
  const { token } = await loginRes.json()

  const addRes = await post(
    '/api/favorites',
    { id: 'st-1', name: 'Radio Uno', url: 'http://example.com/radio', favicon: null },
    token
  )
  assert.equal(addRes.status, 201)

  const listRes = await get('/api/favorites', token)
  assert.equal(listRes.status, 200)
  const favorites = await listRes.json()
  assert.equal(favorites.length, 1)
  assert.equal(favorites[0].name, 'Radio Uno')
  assert.equal(favorites[0].id, 'st-1')

  const dupRes = await post(
    '/api/favorites',
    { id: 'st-1', name: 'Radio Uno', url: 'http://example.com/radio', favicon: null },
    token
  )
  assert.equal(dupRes.status, 409)

  const delRes = await del('/api/favorites/st-1', token)
  assert.equal(delRes.status, 200)

  const listRes2 = await get('/api/favorites', token)
  assert.equal((await listRes2.json()).length, 0)
})

test('eliminar favorito que no existe devuelve 404', async () => {
  const loginRes = await post('/api/auth/login', { username: 'alice', password: 'password123' })
  const { token } = await loginRes.json()
  const res = await del('/api/favorites/no-existe', token)
  assert.equal(res.status, 404)
})
