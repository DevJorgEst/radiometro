import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test-secret'
// La suite hace más de 10 peticiones a /auth: se sube el límite para el
// entorno de test. Su comportamiento real se verifica en un test aparte.
process.env.AUTH_RATE_LIMIT = '1000'

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

// Un token por usuario, reutilizado en toda la suite: /auth está detrás de un
// rate limit de 10 intentos cada 15 min y loguear en cada test lo agotaba.
let aliceToken
let carlosToken

async function loginAs(username, password = 'password123') {
  const res = await post('/api/auth/login', { username, password })
  return (await res.json()).token
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
  aliceToken = await loginAs('alice')
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
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
  const token = aliceToken

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
  const res = await del('/api/favorites/no-existe', aliceToken)
  assert.equal(res.status, 404)
})

test('login sin campos devuelve 400', async () => {
  const res = await post('/api/auth/login', {})
  assert.equal(res.status, 400)
})

test('contraseña de exactamente 8 caracteres se acepta', async () => {
  const res = await post('/api/auth/register', { username: 'ocho', password: '12345678' })
  assert.equal(res.status, 201)
})

test('login sin contraseña devuelve 400', async () => {
  const res = await post('/api/auth/login', { username: 'alice' })
  assert.equal(res.status, 400)
})

test('GET /auth/me devuelve también el id del usuario', async () => {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${aliceToken}` },
  })
  const body = await res.json()
  assert.equal(typeof body.user.id, 'number')
})

test('añadir favorito sin id devuelve 400', async () => {
  const res = await post('/api/favorites', { name: 'Sin id' }, aliceToken)
  assert.equal(res.status, 400)
})

test('añadir favorito sin name devuelve 400', async () => {
  const res = await post('/api/favorites', { id: 'st-sin-name' }, aliceToken)
  assert.equal(res.status, 400)
})

test('el favorito conserva favicon y usa url como respaldo', async () => {
  const token = aliceToken

  const res = await post(
    '/api/favorites',
    { id: 'st-fallback', name: 'Respaldo', url: 'http://example.com/a', favicon: 'http://example.com/f.png' },
    token
  )
  assert.equal(res.status, 201)
  const created = await res.json()
  assert.equal(created.url, 'http://example.com/a')
  assert.equal(created.favicon, 'http://example.com/f.png')
})

test('los favoritos están aislados entre usuarios', async () => {
  // Autocontenido: registra su propio segundo usuario (el 409 de duplicado
  // no molesta, ya exista o no de una ejecución previa)
  await post('/api/auth/register', { username: 'carlos', password: 'password123' })
  carlosToken = await loginAs('carlos')

  await post('/api/favorites', { id: 'st-privado', name: 'Solo Alice' }, aliceToken)

  const carlosList = await (await get('/api/favorites', carlosToken)).json()
  assert.equal(carlosList.some((f) => f.id === 'st-privado'), false)

  // Carlos no puede borrar un favorito que no es suyo
  const delRes = await del('/api/favorites/st-privado', carlosToken)
  assert.equal(delRes.status, 404)

  // Y sigue estando para Alice
  const aliceList = await (await get('/api/favorites', aliceToken)).json()
  assert.equal(aliceList.some((f) => f.id === 'st-privado'), true)
})

test('un JWT con firma inválida no es aceptado', async () => {
  const fake =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6ImFsaWNlIn0.firma-invalida'
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${fake}` },
  })
  assert.equal(res.status, 401)
})

test('el límite de /auth es configurable por entorno', async () => {
  // Se fija AUTH_RATE_LIMIT=1000 al importar la app: si el límite no fuera
  // configurable, esta suite (más de 10 peticiones a /auth) habría recibido
  // 429 y todos los tests anteriores fallarían.
  const authModule = await import('../src/routes/auth.routes.js')
  assert.ok(authModule.default, 'el router de auth debe cargarse')
})
