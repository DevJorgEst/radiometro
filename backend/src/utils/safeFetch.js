import { Agent } from 'undici'
import { lookup } from 'node:dns/promises'
import { isBlockedIp } from './urlSecurity.js'

/**
 * Resuelve dentro del conector: la IP que se valida es exactamente la que se
 * va a usar para conectar. Sin esto, entre `isBlockedByDns()` y el `fetch()`
 * hay una segunda resolución DNS que un atacante puede devolver distinta
 * (DNS rebinding: pública en la comprobación, 127.0.0.1 en la conexión).
 */
export function safeLookup(hostname, options, callback) {
  lookup(hostname, { all: true, verbatim: true })
    .then((addresses) => {
      const safe = addresses.filter(({ address }) => !isBlockedIp(address))
      // Igual que la validación previa: si alguna IP es privada se rechaza el
      // host entero. Fallar cerrado es más simple que elegir "la buena".
      if (safe.length === 0) {
        callback(new Error('URL no permitida'))
        return
      }
      // Node conecta con `all: true` (happy eyeballs); el resto es el API
      // clásico de `dns.lookup`.
      if (options?.all) {
        callback(null, safe)
      } else {
        callback(null, safe[0].address, safe[0].family)
      }
    })
    .catch(callback)
}

export const safeAgent = new Agent({ connect: { lookup: safeLookup } })

/**
 * undici envuelve el fallo del conector en `TypeError: fetch failed` con la
 * causa real colgando de `cause`. Para responder 400 (validación) en vez de
 * 502 (fallo de red) hay que mirar la cadena.
 */
export function isBlockedByConnector(err) {
  for (let current = err; current; current = current.cause) {
    if (current instanceof Error && current.message === 'URL no permitida') return true
  }
  return false
}
