import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { categoryFor, options, questions, type Participant } from '@/lib/assessment'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      participant: Participant
      answers: number[]
      duration: string
    }
    const { participant, answers, duration } = body
    if (
      !participant ||
      !participant.nama_lengkap?.trim() ||
      !Number.isInteger(participant.usia) || participant.usia < 15 || participant.usia > 100 ||
      !['Laki-laki', 'Perempuan'].includes(participant.jenis_kelamin) ||
      !participant.posisi?.trim() || !participant.no_wa?.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participant.email ?? '') ||
      !Array.isArray(answers) || answers.length !== questions.length ||
      answers.some((answer) => !options.some((option) => option.score === answer))
    ) {
      return NextResponse.json({ error: 'Data belum lengkap atau tidak valid.' }, { status: 400 })
    }
    const total = answers.reduce((sum, answer) => sum + answer, 0)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const { error } = await supabase.from('hasil_tes').insert({
      nama_lengkap: participant.nama_lengkap.trim().slice(0, 160),
      usia: participant.usia,
      jenis_kelamin: participant.jenis_kelamin,
      posisi: participant.posisi.trim().slice(0, 160),
      no_wa: participant.no_wa.trim().slice(0, 40),
      email: participant.email.trim().toLowerCase().slice(0, 254),
      total_skor: total,
      kategori: categoryFor(total),
      detail_jawaban: answers,
      durasi_pengerjaan: String(duration).slice(0, 30),
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Jawaban belum dapat disimpan. Silakan coba kembali.' }, { status: 500 })
  }
}
