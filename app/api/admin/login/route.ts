import { NextResponse } from 'next/server'
import { createAdminSession, verifyAdminCredentials } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const auth = await verifyAdminCredentials(
      String(body?.username ?? ''),
      String(body?.password ?? '')
    )

    if (!auth.valid) {
      return NextResponse.json(
        { error: 'Username atau password tidak sesuai.' },
        { status: 401 }
      )
    }

    await createAdminSession(auth.sessionVersion)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { error: 'Login tidak dapat diproses saat ini.' },
      { status: 500 }
    )
  }
}