import 'server-only'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const cookieName = 'gapai-admin-session'
const signingKey = process.env.SUPABASE_JWT_SECRET ?? ''
const initialPassword = 'gapai2026'
const sessionLifetimeSeconds = 8 * 60 * 60

const sign = (value: string) =>
  createHmac('sha256', signingKey).update(value).digest('hex')

type AdminSettings = {
  password_hash: string
  session_version: number | string
}

function adminSettingsClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Supabase URL or service role key is missing.')
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function readAdminSettings() {
  return adminSettingsClient()
    .from('admin_settings')
    .select('password_hash, session_version')
    .eq('id', 1)
    .maybeSingle<AdminSettings>()
}

function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

function verifyPassword(password: string, storedHash: string) {
  const [algorithm, saltHex, hashHex, extra] = storedHash.split('$')
  if (
    algorithm !== 'scrypt' ||
    !saltHex ||
    !hashHex ||
    extra ||
    !/^[\da-f]{32}$/i.test(saltHex) ||
    !/^[\da-f]{128}$/i.test(hashHex)
  ) {
    return false
  }
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export async function verifyAdminCredentials(username: string, password: string) {
  if (username !== 'admin') return { valid: false, sessionVersion: 0 }
  const { data, error } = await readAdminSettings()
  if (error) throw error
  if (!data) {
    return { valid: password === initialPassword, sessionVersion: 0 }
  }
  return {
    valid: verifyPassword(password, data.password_hash),
    sessionVersion: Number(data.session_version),
  }
}

export async function verifyCurrentAdminPassword(password: string) {
  const { data, error } = await readAdminSettings()
  if (error) throw error
  return data ? verifyPassword(password, data.password_hash) : password === initialPassword
}

export async function updateAdminPassword(password: string) {
  const { data, error: readError } = await readAdminSettings()
  if (readError) throw readError
  const sessionVersion = Number(data?.session_version ?? 0) + 1
  const { error } = await adminSettingsClient()
    .from('admin_settings')
    .upsert({
      id: 1,
      password_hash: hashPassword(password),
      session_version: sessionVersion,
    })
  if (error) throw error
  return sessionVersion
}

export async function createAdminSession(sessionVersion: number) {
  if (!signingKey) {
    throw new Error('Admin session signing key is missing.')
  }
  const payload = `${Date.now() + sessionLifetimeSeconds * 1000}.${sessionVersion}`
  const jar = await cookies()
  jar.set(cookieName, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionLifetimeSeconds,
  })
}

export async function clearAdminSession() {
  const jar = await cookies()
  jar.delete(cookieName)
}

export async function isAdminSession() {
  if (!signingKey) return false
  const jar = await cookies()
  const [expiry, version, signature, extra] = (jar.get(cookieName)?.value ?? '').split('.')
  if (
    !expiry ||
    !version ||
    !signature ||
    extra ||
    !/^\d+$/.test(expiry) ||
    !/^\d+$/.test(version) ||
    Number(expiry) < Date.now()
  ) {
    return false
  }
  const payload = `${expiry}.${version}`
  const expected = sign(payload)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return false
  }
  const { data, error } = await readAdminSettings()
  if (error) return false
  return Number(data?.session_version ?? 0) === Number(version)
}