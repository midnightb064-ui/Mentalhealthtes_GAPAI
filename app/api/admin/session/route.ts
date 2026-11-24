import { NextResponse } from 'next/server'
import { isAdminSession } from '@/lib/admin-auth'

export async function GET() {
  try {
    const authenticated = await isAdminSession()
    return NextResponse.json(
      { authenticated },
      { status: authenticated ? 200 : 401, headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json(
      { authenticated: false },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}