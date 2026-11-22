import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

const cookieName = 'gapai-admin-session'
const signingKey = process.env.SUPABASE_JWT_SECRET ?? ''
const validUntil = () => String(Date.now() + 8 * 60 * 60 * 1000)
const sign = (value: string) => createHmac('sha256', signingKey).update(value).digest('hex')

export function checkAdminCredentials(username: string, password: string) {
  return username === 'admin' && password === 'gapai2026'
}

export async function createAdminSession() {
  const payload = validUntil()
  const jar = await cookies()
  jar.set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
}

export async function clearAdminSession() {
  const jar = await cookies()
  jar.delete(cookieName)
}

export async function isAdminSession() {
  if (!signingKey) return false
  const jar = await cookies()
  const [expiry, signature, extra] = (jar.get(cookieName)?.value ?? '').split('.')
  if (!expiry || !signature || extra || Number(expiry) < Date.now()) return false
  const expected = sign(expiry)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}
