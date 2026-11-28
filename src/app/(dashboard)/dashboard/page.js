
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { saveBusiness, updatePublication } from '@/lib/actions/business';
import { DashboardLinkActions } from '@/components/dashboard/dashboard-link-actions';

export const metadata = { title: 'Dashboard' };

const themes = [
  { id: 'ocean-blue', name: 'Ocean Blue', color: '#2879c7' },
  { id: 'fresh-green', name: 'Fresh Green', color: '#16845b' },
  { id: 'warm-orange', name: 'Warm Orange', color: '#e78b35' },
  { id: 'soft-purple', name: 'Soft Purple', color: '#8766c5' },
  { id: 'rose', name: 'Rose', color: '#d65d83' },
];

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [{ data: business }, { data: profile }] = await Promise.all([
    supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(),
  ]);

  if (!business && ['admin', 'super_admin'].includes(profile?.role)) {
    redirect('/dashboard/admin');
  }

  // ONBOARDING: pengguna belum memiliki bisnis
  if (!business) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-welcome">
          <div className="eyebrow">SELAMAT DATANG DI LINKUSAHA</div>
          <h1>Yuk, buat website usahamu! 👋</h1>
          <p>
            Isi informasi dasar usaha kamu. Tidak perlu langsung sempurna,
            detail lainnya bisa dilengkapi nanti.
          </p>
        </div>

        {params?.error && (
          <div className="notice error dashboard-notice">
            {params.error}
          </div>
        )}

        <section className="panel dashboard-onboarding">
          <div className="dashboard-section-heading">
            <span className="dashboard-step">LANGKAH 1</span>
            <h2>Kenalan dengan usahamu</h2>
            <p>Informasi ini akan ditampilkan di website usaha kamu.</p>
          </div>

          <form action={saveBusiness} className="dashboard-form">
            <div className="dashboard-form-grid">
              <div className="field">
                <label htmlFor="name">Nama usaha *</label>
                <input
                  id="name"
                  name="name"
                  required
                  minLength="2"
                  placeholder="Contoh: Dapur Bu Sri"
                />
              </div>

              <div className="field">
                <label htmlFor="slug">Alamat website</label>
                <div className="dashboard-slug-input">
                  <span>linkusaha.vercel.app/</span>
                  <input
                    id="slug"
                    name="slug"
                    placeholder="dapur-bu-sri"
                    minLength="3"
                  />
                </div>
                <small className="muted">
                  Boleh dikosongkan. Link akan dibuat otomatis dari nama usaha.
                </small>
              </div>

              <div className="field">
                <label htmlFor="category">Kategori usaha</label>
                <select id="category" name="category">
                  <option>Makanan & Minuman</option>
                  <option>Fashion</option>
                  <option>Toko Kelontong</option>
                  <option>Kue & Katering</option>
                  <option>Kerajinan</option>
                  <option>Jasa</option>
                  <option>Lainnya</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="whatsapp_number">Nomor WhatsApp *</label>
                <input
                  id="whatsapp_number"
                  name="whatsapp_number"
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                />
                <small className="muted">
                  Gunakan nomor WhatsApp yang aktif.
                </small>
              </div>

              <div className="field dashboard-field-full">
                <label htmlFor="description">Tentang usaha</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Contoh: Menyediakan aneka makanan rumahan yang dibuat segar setiap hari."
                />
              </div>

              <div className="field">
                <label htmlFor="opening_hours">Jam operasional</label>
                <input
                  id="opening_hours"
                  name="opening_hours"
                  placeholder="Senin–Sabtu, 09.00–17.00"
                />
              </div>

              <div className="field">
                <label htmlFor="additional_contact">Kontak tambahan</label>
                <input
                  id="additional_contact"
                  name="additional_contact"
                  placeholder="Telepon atau informasi kontak lain"
                />
              </div>

              <div className="field">
                <label htmlFor="logo">Logo usaha</label>
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <small className="muted">
                  JPG, PNG, atau WebP. Maksimal 5 MB.
                </small>
              </div>

              <div className="field">
                <label htmlFor="cover">Foto sampul</label>
                <input
                  id="cover"
                  name="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <small className="muted">
                  Pilih foto yang menggambarkan usahamu.
                </small>
              </div>
            </div>

            <div className="dashboard-theme-field">
              <div>
                <strong>Pilih warna website</strong>
                <p className="muted">Kamu bisa mengubahnya nanti.</p>
              </div>

              <div className="dashboard-theme-options">
                {themes.map((theme, index) => (
                  <label key={theme.id} className="dashboard-theme-option">
                    <input
                      type="radio"
                      name="theme"
                      value={theme.id}
                      defaultChecked={index === 0}
                    />
                    <span style={{ background: theme.color }} />
                    {theme.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="dashboard-form-footer">
              <p className="muted">
                * Wajib diisi. Informasi lainnya bisa dilengkapi kemudian.
              </p>
              <button className="btn" type="submit">
                Buat website usaha →
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  // DASHBOARD: pengguna sudah memiliki bisnis
  const [{ count: productCount }, { data: settings }] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
    supabase
      .from('business_settings')
      .select('cart_enabled')
      .eq('business_id', business.id)
      .maybeSingle(),
  ]);

  const published = business.publication_status === 'published';

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL || 'https://linkusaha.vercel.app'
  ).replace(/\/+$/, '');

  const websiteUrl = `${appUrl}/${business.slug}`;

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome dashboard-welcome-existing">
        <div>
          <div className="eyebrow">BERANDA USAHA</div>
          <h1>Halo, {business.name}! 👋</h1>
          <p>
            Senang melihat usahamu berkembang. Apa yang ingin kamu kelola hari ini?
          </p>
        </div>

        <Link
          href="/dashboard/pengaturan"
          className="btn secondary dashboard-settings-button"
        >
          Pengaturan usaha
        </Link>
      </div>

      {params?.error && (
        <div className="notice error dashboard-notice">
          {params.error}
        </div>
      )}

      {params?.message && (
        <div className="notice success dashboard-notice">
          {params.message}
        </div>
      )}

      {/* WEBSITE USAHA: LINK DAN PUBLIKASI */}
      <section className="dashboard-website-card">
        <div className="dashboard-website-top">
          <div>
            <span className="dashboard-card-label">WEBSITE USAHAMU</span>

            <div className="dashboard-website-status">
              <span
                className={`dashboard-status-dot ${
                  published ? 'is-published' : ''
                }`}
              />
              {published
                ? 'Website aktif dan bisa dikunjungi pelanggan'
                : 'Website belum dipublikasikan'}
            </div>
          </div>

          <span
            className={`dashboard-status-badge ${
              published ? 'published' : 'draft'
            }`}
          >
            {published ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>

        <div className="dashboard-website-url">{websiteUrl}</div>

        <DashboardLinkActions url={websiteUrl} />

        <div className="dashboard-website-publication">
          <div>
            <strong>Publikasi website</strong>
            <p>
              {published
                ? 'Website kamu sedang ditampilkan kepada pelanggan.'
                : 'Aktifkan website agar pelanggan bisa mengunjunginya.'}
            </p>
          </div>

          <form action={updatePublication}>
            <input
              type="hidden"
              name="status"
              value={published ? 'unpublished' : 'published'}
            />

            <button
              className={`btn ${published ? 'secondary' : ''}`}
              type="submit"
            >
              {published ? 'Nonaktifkan Website' : 'Aktifkan Website'}
            </button>
          </form>
        </div>

        {!published && (
          <p className="dashboard-website-hint">
            Untuk mengaktifkan website, pastikan langganan kamu masih aktif.
            Jika belum berlangganan, kamu akan diarahkan ke halaman langganan.
          </p>
        )}
      </section>

      {/* RINGKASAN */}
      <div className="dashboard-section-title">
        <div>
          <h2>Ringkasan usahamu</h2>
          <p>Informasi singkat tentang website kamu.</p>
        </div>
      </div>

      <div className="dashboard-stats">
        <div className="panel dashboard-stat-card">
          <div className="dashboard-stat-icon green">↗</div>
          <span>Status website</span>
          <strong>{published ? 'Aktif' : 'Nonaktif'}</strong>
          <small>
            {published ? 'Bisa dilihat pelanggan' : 'Belum terlihat publik'}
          </small>
        </div>

        <div className="panel dashboard-stat-card">
          <div className="dashboard-stat-icon blue">▦</div>
          <span>Produk</span>
          <strong>{productCount || 0}</strong>
          <small>Produk dalam katalog</small>
        </div>

        <div className="panel dashboard-stat-card">
          <div className="dashboard-stat-icon orange">🛒</div>
          <span>Keranjang</span>
          <strong>{settings?.cart_enabled ? 'Aktif' : 'Nonaktif'}</strong>
          <small>Pesanan melalui WhatsApp</small>
        </div>
      </div>

      {/* MENU UTAMA */}
      <div className="dashboard-section-title">
        <div>
          <h2>Kelola usahamu</h2>
          <p>Pilih bagian yang ingin kamu ubah.</p>
        </div>
      </div>

      <div className="dashboard-manage-grid">
        <Link href="/dashboard/produk" className="dashboard-manage-card">
          <div className="dashboard-manage-icon green">▦</div>
          <div>
            <h3>Produk</h3>
            <p>Tambah foto, nama, harga, dan deskripsi produk.</p>
          </div>
          <span className="dashboard-manage-arrow">→</span>
        </Link>

        <Link href="/dashboard/pengaturan" className="dashboard-manage-card">
          <div className="dashboard-manage-icon blue">⌂</div>
          <div>
            <h3>Informasi usaha</h3>
            <p>Ubah nama, alamat, WhatsApp, dan jam buka.</p>
          </div>
          <span className="dashboard-manage-arrow">→</span>
        </Link>

        <Link href="/dashboard/pengaturan" className="dashboard-manage-card">
          <div className="dashboard-manage-icon purple">✦</div>
          <div>
            <h3>Tampilan website</h3>
            <p>Atur warna dan informasi yang tampil di website.</p>
          </div>
          <span className="dashboard-manage-arrow">→</span>
        </Link>

        <Link
          href={`/${business.slug}`}
          target="_blank"
          className="dashboard-manage-card"
        >
          <div className="dashboard-manage-icon orange">◉</div>
          <div>
            <h3>Pratinjau website</h3>
            <p>Lihat website sebagaimana pelanggan melihatnya.</p>
          </div>
          <span className="dashboard-manage-arrow">→</span>
        </Link>
      </div>

      <div className="dashboard-help-note">
        <strong>Butuh bantuan?</strong>
        <span>
          Pastikan harga dan ketersediaan produk selalu diperbarui.
          Konfirmasi pesanan tetap dilakukan langsung melalui WhatsApp.
        </span>
      </div>
    </div>
  );
}
