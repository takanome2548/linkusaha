# LinkUsaha — Production checklist

## Supabase
- [ ] Project production terpisah dari development
- [ ] Initial migration direview dan dijalankan
- [ ] RLS aktif pada seluruh tabel aplikasi
- [ ] Storage bucket `business-assets` tersedia
- [ ] Storage policies diuji dengan dua akun berbeda
- [ ] Email confirmation aktif dan SMTP terkonfigurasi
- [ ] Site URL dan redirect URLs benar
- [ ] Backup/PITR disesuaikan dengan kebutuhan
- [ ] Platform admin role hanya diberikan melalui jalur tepercaya

## Vercel
- [ ] Environment variables disetel untuk Production, Preview, Development
- [ ] `NEXT_PUBLIC_APP_URL` sesuai domain deployment
- [ ] Build production berhasil
- [ ] Preview deployment diuji
- [ ] Domain dan HTTPS aktif
- [ ] Metadata, sitemap, robots diuji

## Functional & security
- [ ] Register, login, logout, email confirmation
- [ ] Forgot/reset password
- [ ] Satu bisnis per akun dan slug uniqueness
- [ ] User A tidak dapat membaca/mengubah bisnis User B
- [ ] Role platform tidak dapat dinaikkan dari client
- [ ] Draft/unpublished tidak bisa diakses publik
- [ ] Upload file menolak MIME/ukuran tidak valid
- [ ] Cart ON dan OFF
- [ ] Harga/ketersediaan cart divalidasi ulang
- [ ] Mobile, tablet, desktop
- [ ] Lint, unit tests, build, integration/E2E
