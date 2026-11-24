import { NextResponse } from 'next/server'
import {
  isAdminSession,
  updateAdminPassword,
  verifyCurrentAdminPassword,
  createAdminSession,
} from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'Sesi admin tidak valid.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
    return NextResponse.json({ error: 'Data password tidak valid.' }, { status: 400 })
  }

  if (body.currentPassword.length > 256) {
    return NextResponse.json({ error: 'Password saat ini tidak valid.' }, { status: 400 })
  }

  if (body.newPassword.length < 8 || body.newPassword.length > 10){
    return NextResponse.json(
      { error: 'Password baru harus terdiri dari 8–128 karakter.' },
      { status: 400 }
    )
  }

  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: 'Password baru harus berbeda dari password saat ini.' },
      { status: 400 }
    )
  }

  try {
    if (!(await verifyCurrentAdminPassword(body.currentPassword))) {
      return NextResponse.json({ error: 'Password saat ini tidak sesuai.' }, { status: 400 })
    }

    const sessionVersion = await updateAdminPassword(body.newPassword)
    await createAdminSession(sessionVersion)

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json(
      { error: 'Password tidak dapat diperbarui saat ini.' },
      { status: 503 }
    )
  }
}