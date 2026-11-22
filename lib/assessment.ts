export const questions = [
  'Dalam dua minggu terakhir, seberapa sering Anda merasa sedih, murung, atau kehilangan harapan?',
  'Seberapa sering Anda kehilangan minat atau kesenangan pada hal-hal yang biasanya Anda nikmati?',
  'Seberapa sering Anda merasa sulit memulai aktivitas karena energi terasa sangat rendah?',
  'Seberapa sering Anda mengalami perubahan pola tidur yang mengganggu keseharian?',
  'Seberapa sering Anda merasa sulit berkonsentrasi saat bekerja atau melakukan aktivitas rutin?',
  'Seberapa sering Anda merasa khawatir berlebihan tentang berbagai hal?',
  'Seberapa sering Anda merasa sulit menghentikan atau mengendalikan rasa khawatir?',
  'Seberapa sering Anda merasa gelisah, tegang, atau sulit untuk bersantai?',
  'Seberapa sering Anda merasa mudah tersinggung atau kesulitan mengendalikan emosi?',
  'Seberapa sering tuntutan pekerjaan terasa melebihi kemampuan Anda untuk mengatasinya?',
  'Seberapa sering Anda merasa kewalahan oleh banyaknya tugas atau tanggung jawab?',
  'Seberapa sering Anda merasa tidak punya cukup waktu untuk beristirahat dan memulihkan diri?',
  'Seberapa sering tekanan pekerjaan terbawa hingga mengganggu waktu pribadi Anda?',
  'Seberapa sering Anda merasa sulit mengambil keputusan karena pikiran terasa penuh?',
  'Seberapa sering Anda merasa lelah secara emosional setelah menjalani hari kerja?',
  'Seberapa sering Anda merasa kesulitan menghadapi masalah sehari-hari dengan tenang?',
  'Seberapa sering Anda merasa tidak bersemangat saat memulai hari?',
  'Seberapa sering Anda merasa aktivitas sehari-hari kehilangan makna atau tujuan?',
  'Seberapa sering Anda merasa kurang mendapatkan dukungan dari orang-orang di sekitar Anda?',
  'Seberapa sering Anda merasa tidak puas dengan keseimbangan antara pekerjaan dan kehidupan pribadi?',
] as const

export const options = [
  { score: 0, label: 'Tidak Pernah' },
  { score: 1, label: 'Beberapa Hari' },
  { score: 2, label: 'Lebih dari Separuh Waktu' },
  { score: 3, label: 'Hampir Setiap Hari' },
] as const

export type Participant = {
  nama_lengkap: string
  usia: number
  jenis_kelamin: string
  posisi: string
  no_wa: string
  email: string
}

export type AssessmentResult = {
  id: string
  created_at: string
  nama_lengkap: string
  usia: number
  jenis_kelamin: string
  posisi: string
  no_wa: string
  email: string
  total_skor: number
  kategori: string
  detail_jawaban: number[]
  durasi_pengerjaan: string
}

export function categoryFor(score: number) {
  if (score <= 15) return 'Kondisi Mental Sangat Baik / Stabil'
  if (score <= 30) return 'Stres Ringan / Perlu Perhatian Ringan'
  if (score <= 45) return 'Stres Sedang / Indikasi Kelelahan Mental'
  return 'Tingkat Stres Tinggi / Butuh Konsultasi Profesional'
}
