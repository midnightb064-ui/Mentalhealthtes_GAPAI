import { NextResponse } from 'next/server'
import { checkAdminCredentials, createAdminSession } from '@/lib/admin-auth'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !checkAdminCredentials(String(body.username ?? ''), String(body.password ?? ''))) {
    return NextResponse.json({ error: 'Username atau password tidak sesuai.' }, { status: 401 })
  }
  await createAdminSession()
  return NextResponse.json({ success: true })
}
