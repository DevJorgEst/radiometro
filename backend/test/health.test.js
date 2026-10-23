import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'

process.env.DB_PATH = ':memory:'
process.env.JWT_SECRET = 'test-secret'

const { default: app } = await import('../src/app.js')

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
})

test('GET /api/health responde 200 sin depender de la base de datos', async () => {
  const res = await fetch(`${baseUrl}/api/health`)

  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: 'ok' })
})
