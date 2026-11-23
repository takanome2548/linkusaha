# LinkUsaha

**Website usaha sendiri, tanpa harus ribet.**

LinkUsaha adalah SaaS sederhana untuk membantu UMKM Indonesia membuat website bisnis, menampilkan katalog produk, dan menerima pesanan melalui WhatsApp.

## Teknologi

- Next.js App Router (JavaScript)
- React 19
- Chakra UI v3 (provider/design-system foundation)
- Supabase Auth, PostgreSQL, Storage, dan Row Level Security
- Lucide React
- Vitest untuk unit tests

## Fitur yang sudah disiapkan dalam source

- Landing page marketing
- Register, login, logout, konfirmasi email, lupa/reset password
- Dashboard dengan onboarding bisnis
- Batas satu bisnis per akun melalui unique constraint database
- Pengaturan informasi bisnis, slug, status publikasi, dan lima preset tema
- CRUD produk dan upload gambar (JPG/PNG/WebP, maksimal 5 MB)
- Storefront publik berdasarkan slug
- Mode pemesanan langsung WhatsApp dan mode keranjang
- Pemeriksaan ulang ketersediaan/harga katalog sebelum mengirim keranjang
- SEO metadata, sitemap, dan robots
- Supabase RLS dan Storage policies

> Status pengembangan: initial implementation. Build dan integrasi Supabase belum dapat dinyatakan lulus sebelum dependency di-install dan project Supabase dikonfigurasi.

## Prasyarat

- Node.js 20.9 atau lebih baru
- npm
- Project Supabase baru

## Instalasi lokal

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` tidak diperlukan oleh runtime MVP. Jangan pernah menambahkan service role key ke variabel `NEXT_PUBLIC_*` atau source code.

## Supabase setup

1. Buat project Supabase baru.
2. Buka SQL Editor.
3. Jalankan `supabase/migrations/0001_initial_schema.sql` pada project kosong.
4. Pastikan tabel `profiles`, `businesses`, `business_settings`, dan `products` muncul.
5. Pastikan bucket `business-assets` dibuat oleh migration.
6. Di Authentication → URL Configuration, set Site URL ke `http://localhost:3000`.
7. Tambahkan redirect URL `http://localhost:3000/auth/callback` dan `http://localhost:3000/reset-password`.
8. Untuk production, tambahkan URL domain production dan callback/reset URL production.
9. Konfigurasikan SMTP/email provider sebelum uji email confirmation dan password reset di luar batas pengiriman bawaan Supabase.

Migration awal ditujukan untuk project baru. Jangan jalankan pada database production yang sudah berisi data tanpa meninjau SQL terlebih dahulu.

### Menetapkan platform admin

Role default setiap akun baru adalah `user`. Jangan sediakan UI untuk menaikkan role. Setelah akun admin dibuat, perubahan role awal hanya dilakukan oleh operator tepercaya melalui SQL Editor/administrasi database, misalnya:

```sql
update public.profiles
set role = 'super_admin'
where id = '<AUTH_USER_UUID>';
```

Jangan pernah memberikan akses SQL Editor atau service role key kepada pemilik bisnis biasa.

## Menjalankan aplikasi

```bash
npm run dev
```

Buka http://localhost:3000.

## Pemeriksaan

```bash
npm run lint
npm test
npm run build
```

## Deployment Vercel

1. Push repository ke Git provider.
2. Import project di Vercel.
3. Set environment variables `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy preview terlebih dahulu.
5. Set Site URL dan redirect URLs di Supabase ke domain Vercel/production yang benar.
6. Uji register, email confirmation, login, reset password, upload gambar, storefront, dan cart pada deployment preview.
7. Pasang custom domain setelah preview tervalidasi.

Tidak ada migration otomatis yang dijalankan oleh Vercel. Jalankan migration secara sadar melalui Supabase SQL Editor atau Supabase CLI setelah review.

## Catatan keamanan

- Semua tabel aplikasi mengaktifkan RLS.
- `businesses.owner_id` unik, sehingga satu user hanya dapat memiliki satu bisnis.
- Role platform dilindungi trigger dari perubahan oleh pengguna biasa.
- Storefront publik menggunakan view `business_storefronts` yang tidak mengekspos `owner_id`.
- Upload Storage harus berada di folder UUID bisnis milik pengguna yang login.
- Validasi MIME dan ukuran file dilakukan di server action.
- Cart browser bukan sistem transaksi; harga/ketersediaan diperiksa ulang sebelum membuka WhatsApp. Pemilik usaha tetap mengonfirmasi harga akhir.
- Rate limiting aplikasi belum dipasang pada tahap initial implementation. Tambahkan sebelum membuka registrasi publik berskala besar (mis. melalui Vercel Firewall/edge provider atau mekanisme terukur).

## Known limitations pada initial implementation

- Logo dan cover sudah dapat diunggah, tetapi editor crop/preview belum tersedia.
- Jam operasional dan kontak tambahan belum memiliki editor UI khusus.
- Drag/reorder produk belum tersedia; urutan dasar menggunakan `sort_order`.
- Belum ada dashboard admin platform.
- Belum ada billing/subscription, sesuai keputusan MVP.
- Email deliverability bergantung konfigurasi Supabase SMTP.
- E2E/browser testing dan verifikasi RLS memerlukan Supabase project aktif.
