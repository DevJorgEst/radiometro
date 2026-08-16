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

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('proxy-image rechaza URL sin esquema http/https', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=ftp://example.com/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image rechaza IP privada (SSRF)', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=http://127.0.0.1:5000/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image rechaza localhost por nombre', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image?url=http://localhost:5000/x.png`)
  assert.equal(res.status, 400)
})

test('proxy-image sin url devuelve 400', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-image`)
  assert.equal(res.status, 400)
})

test('proxy-stream rechaza IP privada (SSRF)', async () => {
  const res = await fetch(`${baseUrl}/api/proxy-stream?url=http://192.168.1.1:8000/stream`)
  assert.equal(res.status, 400)
})

test('rate limit devuelve 429 tras exceder intentos', async () => {
  let status
  for (let i = 0; i < 12; i++) {
    const res = await post('/api/auth/login', { username: 'ghost', password: 'password123' })
    status = res.status
  }
  assert.equal(status, 429)
})
