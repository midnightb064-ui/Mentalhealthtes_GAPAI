'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, Download, Heart, Leaf, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, Users, X } from 'lucide-react'
import { options, questions, type AssessmentResult, type Participant } from '@/lib/assessment'

const emptyParticipant: Participant = { nama_lengkap: '', usia: 0, jenis_kelamin: '', posisi: '', no_wa: '', email: '' }
type Screen = 'home' | 'form' | 'test' | 'done' | 'admin'
const emptyAnswers = Array<number>(questions.length).fill(-1)

function Header({ onAdmin, onHome }: { onAdmin: () => void; onHome: () => void }) {
  return <header className="site-header"><button className="brand" onClick={onHome} aria-label="Kembali ke beranda"><Image className="brand-logo" src="/logo-gapai.png" alt="Logo Gapai Mentorship" width={38} height={38} priority /><span><b>GAPAI</b><small>MENTORSHIP</small></span></button><div className="header-title"><strong>Mental Health Test by Gapai Mentorship</strong><span>Sistem Skrining Kesejahteraan Mental - PT Gapai Cita Rahardjo</span></div><button className="admin-link" onClick={onAdmin}><LockKeyhole size={15} /> Login Admin</button></header>
}

export default function MentalHealthApp() {
  const [screen, setScreen] = useState<Screen>('home')
  const [participant, setParticipant] = useState<Participant>(emptyParticipant)
  const [answers, setAnswers] = useState<number[]>(emptyAnswers)
  const [seconds, setSeconds] = useState(300)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' })
  const [adminError, setAdminError] = useState('')
  const [results, setResults] = useState<AssessmentResult[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loadingResults, setLoadingResults] = useState(false)
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null)

  const loadResults = useCallback(async () => {
    setLoadingResults(true)
    try {
      const response = await fetch('/api/admin/results', { cache: 'no-store' })
      if (response.status === 401) { setIsAdmin(false); setScreen('admin'); return }
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResults(data)
      setIsAdmin(true)
    } catch (error) { setAdminError(error instanceof Error ? error.message : 'Data tidak dapat dimuat.') }
    finally { setLoadingResults(false) }
  }, [])

  useEffect(() => {
    if (screen === 'admin' && isAdmin) void loadResults()
  }, [screen, isAdmin, loadResults])

  const submitAssessment = useCallback(async () => {
    if (saving) return
    const completedAnswers = answers.map((answer) => answer < 0 ? 0 : answer)
    setSaving(true)
    setSubmitError('')
    const durationSeconds = startedAt ? Math.min(300, Math.max(0, Math.round((Date.now() - startedAt) / 1000))) : 0
    const response = await fetch('/api/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant, answers: completedAnswers, duration: `${Math.floor(durationSeconds / 60)} menit ${durationSeconds % 60} detik` }),
    }).catch(() => null)
    if (response?.ok) setScreen('done')
    else {
      const data = await response?.json().catch(() => null)
      setSubmitError(data?.error ?? 'Koneksi sedang bermasalah. Periksa internet lalu coba kirim lagi.')
    }
    setSaving(false)
  }, [answers, participant, saving, startedAt])

  useEffect(() => {
    if (screen !== 'test' || seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((current) => current - 1), 1000)
    return () => window.clearInterval(timer)
  }, [screen, seconds])

  useEffect(() => {
    if (screen === 'test' && seconds === 0 && answers.every((answer) => answer >= 0)) void submitAssessment()
  }, [answers, screen, seconds, submitAssessment])

  const startTest = () => { setAnswers(emptyAnswers); setSeconds(300); setStartedAt(Date.now()); setSubmitError(''); setScreen('test'); window.scrollTo(0, 0)}
  const begin = () => { setParticipant(emptyParticipant); setScreen('form'); window.scrollTo(0, 0) }
  const backHome = () => { setScreen('home'); setParticipant(emptyParticipant); setAnswers(emptyAnswers); window.scrollTo(0, 0) }
  const doAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault(); setAdminError('')
    try {
      const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adminCredentials) })
      if (!response.ok) throw new Error((await response.json()).error)
      setIsAdmin(true); setScreen('admin')
    } catch (error) { setAdminError(error instanceof Error ? error.message : 'Login gagal.') }
  }
  const logout = async () => { await fetch('/api/admin/logout', { method: 'POST' })
  setResults([])
  setAdminCredentials({username: '', password: ''})
    setIsAdmin(false)
    setScreen('home') 
  }
  const exportCsv = () => {
    const columns = ['Tanggal/Waktu','Nama Lengkap','Usia','Jenis Kelamin','Divisi / Posisi','No WA','Email','Durasi','Total Skor','Kategori']
    const rows = results.map((item) => [new Date(item.created_at).toLocaleString('id-ID'), item.nama_lengkap, item.usia, item.jenis_kelamin, item.posisi, item.no_wa, item.email, item.durasi_pengerjaan, item.total_skor, item.kategori])
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })); link.download = 'rekap-mental-health-gapai.csv'; link.click(); URL.revokeObjectURL(link.href)
  }
  const answered = answers.filter((answer) => answer >= 0).length
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const remainingSeconds = String(seconds % 60).padStart(2, '0')
  const averageScore = useMemo(() => results.length ? (results.reduce((sum, item) => sum + item.total_skor, 0) / results.length).toFixed(1) : '0', [results])
  const categoryCounts = useMemo(() => ({ stable: results.filter((x) => x.total_skor <= 15).length, mild: results.filter((x) => x.total_skor > 15 && x.total_skor <= 30).length, moderate: results.filter((x) => x.total_skor > 30 && x.total_skor <= 45).length, high: results.filter((x) => x.total_skor > 45).length }), [results])

  return <div className="app-shell"><Header onAdmin={() => { setAdminError(''); setScreen('admin') }} onHome={backHome} />
   {screen === 'home' && (
      <main className="home-page">
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> RUANG AMAN UNTUK DIRI ANDA
            </span>
            <h1>
              Kenali diri.<br />
              <em>Rawat kesejahteraan.</em>
            </h1>
            <p className="hero-description">
              Luangkan waktu sejenak untuk memahami kondisi diri dan kesejahteraan Anda. Setiap jawaban bersifat rahasia.
            </p>
            <button className="primary-button hero-cta" onClick={begin}>
              Mulai Tes Sekarang <ArrowRight size={18} />
            </button>
            <div className="hero-note">
              <ShieldCheck size={16} /> Rahasia · Aman · Untuk evaluasi internal HRD
            </div>
          </div>

          <div className="hero-art">
            <div className="flex flex-col items-center justify-center gap-4 -mt-30">
              <Image
                src="/logo-gapai.png"
                alt="Logo PT Gapai Cita Rahardjo"
                width={280}
                height={280}
                style={{ width: '280px', height: 'auto' }}
              />
              <div className="art-card">
                <span className="art-icon"><Heart size={18} /></span>
                <span>
                  <b>Jaga keseimbangan</b>
                  <small>Mulai dari memahami diri</small>
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="intro-strip">
          <div>
            <span className="strip-icon"><Clock3 size={18} /></span>
            <span><b>5 menit</b><small>Waktu pengerjaan</small></span>
          </div>
          <div>
            <span className="strip-icon green"><CheckCircle2 size={18} /></span>
            <span><b>20 pertanyaan</b><small>Refleksi keseharian</small></span>
          </div>
          <div>
            <span className="strip-icon yellow"><ShieldCheck size={18} /></span>
            <span><b>Privasi terjaga</b><small>Hasil hanya untuk HRD</small></span>
          </div>
        </section>

        <section className="disclaimer">
          <span className="disclaimer-line" />
          <p>
            Ini adalah skrining kesejahteraan, bukan diagnosis medis. Jika Anda membutuhkan dukungan lebih lanjut, silakan hubungi tenaga profesional.
          </p>
        </section>
      </main>
    )}

    {screen === 'form' && <main className="narrow-page"><button className="back-button" onClick={backHome}><ArrowLeft size={16} /> Kembali</button><div className="page-heading"><span className="step-label">LANGKAH 01 · SEBELUM MEMULAI</span><h1>Siapkan diri Anda</h1><p>Isi informasi berikut agar tim kami dapat menindaklanjuti dengan tepat.</p></div><section className="instruction-card"><span className="instruction-icon"><Heart size={19} /></span><div><b>Beberapa hal sebelum tes dimulai</b><p>Tes terdiri dari 20 pertanyaan dan waktu maksimal 5 menit. Pilih jawaban yang paling menggambarkan kondisi Anda dalam dua minggu terakhir. Jawaban akan terkirim otomatis saat waktu habis.</p></div></section><form className="participant-form" onSubmit={(event) => { event.preventDefault(); startTest() }}><div className="field-grid"><label className="field full"><span>Nama lengkap</span><input required maxLength={160} autoComplete="name" placeholder="Contoh: Nadia Putri" value={participant.nama_lengkap} onChange={(e) => setParticipant({ ...participant, nama_lengkap: e.target.value })} /></label><label className="field"><span>Usia</span><input required type="number" min={15} max={100} placeholder="25" value={participant.usia || ''} onChange={(e) => setParticipant({ ...participant, usia: Number(e.target.value) })} /></label><label className="field"><span>Jenis kelamin</span><select required value={participant.jenis_kelamin} onChange={(e) => setParticipant({ ...participant, jenis_kelamin: e.target.value })}><option value="" disabled>Pilih jenis kelamin</option><option>Laki-laki</option><option>Perempuan</option></select></label><label className="field full"><span>Divisi / posisi / status</span><input required maxLength={160} placeholder="Contoh: Karyawan, Live Talent, Pelamar" value={participant.posisi} onChange={(e) => setParticipant({ ...participant, posisi: e.target.value })} /></label><label className="field"><span>Nomor WhatsApp</span><input required type="tel" autoComplete="tel" placeholder="08xx xxxx xxxx" value={participant.no_wa} onChange={(e) => setParticipant({ ...participant, no_wa: e.target.value })} /></label><label className="field"><span>Email</span><input required type="email" autoComplete="email" placeholder="nama@email.com" value={participant.email} onChange={(e) => setParticipant({ ...participant, email: e.target.value })} /></label></div><button className="primary-button submit-button" type="submit">Mulai Mengerjakan Tes <ArrowRight size={18} /></button><p className="form-footnote"><LockKeyhole size={13} /> Informasi Anda disimpan secara rahasia.</p></form></main>}

    {screen === 'test' && <main className="test-page"><div className="test-sticky"><div className="test-sticky-inner"><div><span className="step-label">REFLEKSI DIRI · 2 MINGGU TERAKHIR</span><h1>Bagaimana kabar Anda?</h1></div><div className={`timer ${seconds < 60 ? 'timer-warning' : ''}`} aria-live="polite"><Clock3 size={17} /><span>{minutes}:{remainingSeconds}</span></div></div><div className="progress-meta"><span>Soal {Math.min(answered + 1, 20)} dari 20</span><span>{answered} terjawab</span></div><div className="progress-track"><span style={{ width: `${answered * 5}%` }} /></div></div><section className="questions-list">{questions.map((question, index) => <article className="question-card" key={question}><div className="question-number">{String(index + 1).padStart(2, '0')}</div><div className="question-content"><h2>{question}</h2><div className="options-grid" role="radiogroup" aria-label={`Jawaban soal ${index + 1}`}>{options.map((option) => <button key={option.score} type="button" role="radio" aria-checked={answers[index] === option.score} className={`option-button ${answers[index] === option.score ? 'option-selected' : ''}`} onClick={() => setAnswers((current) => current.map((value, i) => i === index ? option.score : value))}><span className="radio-mark">{answers[index] === option.score && <span />}</span><span>{option.label}</span></button>)}</div></div></article>)}</section><div className="test-footer"><div className="footer-progress">{answered === 20 ? <><Check size={16} /> Semua pertanyaan sudah terjawab</> : `Masih ${20 - answered} pertanyaan belum dijawab`}</div><button className="primary-button" disabled={answered !== 20 || saving} onClick={() => void submitAssessment()}>{saving ? 'Mengirim jawaban…' : 'Selesai & Kirim Jawaban'} <ArrowRight size={17} /></button></div>{submitError && <p className="error-message" role="alert">{submitError}</p>}</main>}

    {screen === 'done' && <main className="done-page"><div className="done-icon"><CheckCircle2 size={44} /></div><span className="step-label">TES SELESAI</span><h1>Terima kasih telah menyelesaikan Mental Health Test by Gapai Mentorship.</h1><p>Jawaban Anda telah tersimpan secara rahasia dan akan dievaluasi oleh tim HRD PT Gapai Cita Rahardjo.</p><button className="primary-button" onClick={backHome}>Kembali ke Beranda <ArrowRight size={17} /></button><small>Skor dan kategori hasil hanya dapat diakses oleh tim HRD.</small></main>}

    {screen === 'admin' && <main className="admin-page">{!isAdmin && <section className="admin-login"><div className="login-icon"><LockKeyhole size={21} /></div><span className="step-label">AREA TERBATAS · HRD</span><h1>Login Admin</h1><p>Masuk untuk mengelola data skrining kesejahteraan.</p><form onSubmit={(event) => void doAdminLogin(event)}><label className="field"><span>Username</span><input required autoComplete="username" value={adminCredentials.username} onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })} placeholder="Username admin" /></label><label className="field"><span>Password</span><input required type="password" autoComplete="current-password" value={adminCredentials.password} onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })} placeholder="Masukkan password" /></label>{adminError && <p className="error-message" role="alert">{adminError}</p>}<button className="primary-button submit-button">Masuk ke Dashboard <ArrowRight size={17} /></button></form><button className="back-button login-back" onClick={backHome}><ArrowLeft size={15} /> Kembali ke beranda</button></section>}{isAdmin && <section className="dashboard"><div className="dashboard-heading"><div><span className="step-label">RUANG KERJA HRD</span><h1>Dashboard peserta</h1><p>Ringkasan hasil skrining kesejahteraan mental.</p></div><div className="dashboard-actions"><button className="secondary-button" onClick={() => void loadResults()} disabled={loadingResults}><RefreshCw size={15} className={loadingResults ? 'spin' : ''} /> Refresh Data</button><button className="secondary-button" onClick={exportCsv}><Download size={15} /> Export CSV</button><button className="secondary-button logout-button" onClick={() => void logout()}>Keluar</button></div></div><div className="stats-grid"><div className="stat-card"><span className="stat-icon purple"><Users size={18} /></span><small>Total Peserta</small><b>{results.length}</b></div><div className="stat-card"><span className="stat-icon green"><Heart size={18} /></span><small>Rata-rata Skor</small><b>{averageScore}<i> / 60</i></b></div>{Object.entries(categoryCounts).map(([key, count]) => <div className="stat-card category-stat" key={key}><span className={`status-dot ${key}`} /><small>{key === 'stable' ? 'Stabil' : key === 'mild' ? 'Stres Ringan' : key === 'moderate' ? 'Stres Sedang' : 'Stres Tinggi'}</small><b>{count}</b></div>)}</div><div className="table-card"><div className="table-heading"><div><h2>Daftar peserta</h2><p>Data diurutkan dari pengisian terbaru.</p></div><span className="result-count">{results.length} data</span></div><div className="table-scroll"><table><thead><tr><th>Tanggal / Waktu</th><th>Nama Lengkap</th><th>Usia</th><th>Jenis Kelamin</th><th>Divisi / Posisi</th><th>No. WhatsApp</th><th>Email</th><th>Durasi</th><th>Skor</th><th>Kategori</th><th>Detail</th></tr></thead><tbody>{results.map((item) => <tr key={item.id}><td>{new Date(item.created_at).toLocaleString('id-ID')}</td><td><b>{item.nama_lengkap}</b></td><td>{item.usia}</td><td>{item.jenis_kelamin}</td><td>{item.posisi}</td><td>{item.no_wa}</td><td>{item.email}</td><td>{item.durasi_pengerjaan}</td><td><b>{item.total_skor}</b></td><td><span className={`category-badge ${item.total_skor <= 15 ? 'stable' : item.total_skor <= 30 ? 'mild' : item.total_skor <= 45 ? 'moderate' : 'high'}`}>{item.kategori}</span></td><td><button className="detail-button" onClick={() => setSelectedResult(item)}>Lihat Detail</button></td></tr>)}</tbody></table>{results.length === 0 && <div className="empty-state">Belum ada data peserta.</div>}</div></div><p className="clinical-note">Hasil skrining bukan diagnosis klinis. Gunakan dengan bijak dan jaga kerahasiaan data peserta.</p></section>}</main>}

    {selectedResult && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedResult(null) }}><section className="answer-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-header"><div><span className="step-label">DETAIL HASIL PESERTA</span><h2 id="modal-title">{selectedResult.nama_lengkap}</h2><p>{selectedResult.email} · Skor {selectedResult.total_skor} · {selectedResult.kategori}</p></div><button className="icon-button" onClick={() => setSelectedResult(null)} aria-label="Tutup detail"><X size={19} /></button></div><div className="answer-list">{questions.map((question, index) => { const selected = options.find((option) => option.score === selectedResult.detail_jawaban?.[index]); return <div className="answer-row" key={question}><span className="answer-index">{index + 1}</span><div><b>{question}</b><small>{selected?.label ?? 'Tidak tersedia'} · {selected?.score ?? 0} poin</small></div></div> })}</div></section></div>}
    <footer className="site-footer"><span>© 2026 PT Gapai Cita Rahardjo</span><span>Gapai Mentorship · Kesejahteraan dimulai dari kepedulian</span></footer>
  </div>
}
