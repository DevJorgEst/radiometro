import { resolve4 } from 'node:dns/promises'
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
  if (net.isIP(hostname) === 6) return true
  if (hostname.endsWith('.local')) return true

  return false
}

export async function isBlockedByDns(rawUrl) {
  if (isBlockedUrl(rawUrl)) return true
  const hostname = new URL(rawUrl).hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(hostname) !== 0) return false

  try {
    const addresses = await resolve4(hostname)
    return addresses.some(isPrivateIpv4)
  } catch {
    return true
  }
}