import { resolve4, resolve6 } from 'node:dns/promises'
import net from 'node:net'

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal', 'metadata'])

function isPrivateIpv4(ip) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true
  const [a, b] = parts
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    a >= 224
  )
}

// Rangos privados/reservados IPv6 (loopback, unspecified, ULA fc00::/7,
// link-local fe80::/10, multicast) y direcciones IPv4 mapeadas (::ffff:a.b.c.d
// y su forma hexadecimal), que heredan las reglas IPv4.
function isPrivateIpv6(ip) {
  const lower = ip.toLowerCase().split('%')[0] // sin zona (zone id link-local)

  const mappedDotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(lower)
  if (mappedDotted) return isPrivateIpv4(mappedDotted[1])

  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16)
    const lo = parseInt(mappedHex[2], 16)
    return isPrivateIpv4(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }

  if (lower === '::' || lower === '::1') return true // unspecified + loopback
  if (/^f[cd]/.test(lower)) return true // fc00::/7 (ULA)
  if (/^fe[89ab]/.test(lower)) return true // fe80::/10 (link-local)
  if (lower.startsWith('ff')) return true // multicast

  return false
}

export function isBlockedUrl(rawUrl) {
  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return true
  }

  if (!['http:', 'https:'].includes(url.protocol)) return true

  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) return true
  if (net.isIP(hostname) === 4 && isPrivateIpv4(hostname)) return true
  // Literales IPv6: se permite el público (dominios/servidores IPv6-only son
  // válidos) y se bloquean los rangos privados (SSRF por IPv6).
  if (net.isIP(hostname) === 6 && isPrivateIpv6(hostname)) return true
  if (hostname.endsWith('.local')) return true

  return false
}

export async function isBlockedByDns(rawUrl) {
  if (isBlockedUrl(rawUrl)) return true
  const hostname = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(hostname) !== 0) return false

  // Se resuelven A y AAAA: un dominio IPv6-only (solo AAAA público) es
  // válido. Antes solo se consultaba resolve4; si fallaba (dominio sin
  // registro A, p.ej. 0nradio.com) el catch lo bloqueaba como si fuera SSRF
  // y devolvíamos 400 a un recurso público legítimo.
  const [a, aaaa] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)])
  const addresses = [
    ...(a.status === 'fulfilled' ? a.value : []),
    ...(aaaa.status === 'fulfilled' ? aaaa.value : []),
  ]

  // Ni A ni AAAA: dominio inexistente/no resoluble -> bloqueo (fail-closed)
  if (addresses.length === 0) return true

  return addresses.some((ip) => (net.isIP(ip) === 6 ? isPrivateIpv6(ip) : isPrivateIpv4(ip)))
}
