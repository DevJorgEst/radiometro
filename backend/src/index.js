import 'dotenv/config'

// El guard se ejecuta ANTES de importar app.js (y authController.js, que lanza
// su propio throw en import time): import dinámico + process.exit controlado.
if (!process.env.JWT_SECRET) {
  console.error(
    'CRITICAL: JWT_SECRET no está definida en process.env. El servidor NO arrancará.',
  )
  process.exit(1)
}

const { default: app } = await import('./app.js')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})
