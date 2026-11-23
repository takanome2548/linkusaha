
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  saveBusiness,
  saveBusinessSettings,
} from '@/lib/actions/business';

export const metadata = { title: 'Pengaturan usaha' };

const themes = [
  { id: 'ocean-blue', name: 'Ocean Blue', color: '#2879c7' },
  { id: 'fresh-green', name: 'Fresh Green', color: '#16845b' },
  { id: 'warm-orange', name: 'Warm Orange', color: '#e78b35' },
  { id: 'soft-purple', name: 'Soft Purple', color: '#8766c5' },
  { id: 'rose', name: 'Rose', color: '#d65d83' },
];

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!business) redirect('/dashboard');

  const { data: settings } = await supabase
    .from('business_settings')
    .select('*')
    .eq('business_id', business.id)
    .maybeSingle();

  return (
    <div className="dashboard-page settings-page">
      <div className="dashboard-welcome">
        <div>
          <div className="eyebrow">PENGATURAN USAHA</div>
          <h1>Atur website usahamu</h1>
          <p>
            Perbarui informasi, tampilan, dan cara pelanggan memesan
            produk dari website kamu.
          </p>
        </div>
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

      {/* INFORMASI USAHA */}
      <section className="panel settings-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon green">⌂</div>
          <div>
            <h2>Informasi usaha</h2>
            <p>
              Informasi dasar yang akan dilihat pelanggan di website kamu.
            </p>
          </div>
        </div>

        <form action={saveBusiness} className="settings-form">
          <div className="settings-form-grid">
            <div className="field">
              <label htmlFor="business-name">Nama usaha *</label>
              <input
                id="business-name"
                name="name"
                defaultValue={business.name}
                required
                minLength="2"
                placeholder="Contoh: Dapur Bu Sri"
              />
            </div>

            <div className="field">
              <label htmlFor="business-slug">Alamat website *</label>
              <input
                id="business-slug"
                name="slug"
                defaultValue={business.slug}
                required
                minLength="3"
                placeholder="dapur-bu-sri"
              />
              <small className="muted">
                Gunakan huruf kecil, angka, dan tanda hubung.
              </small>
            </div>

            <div className="field">
              <label htmlFor="business-category">Kategori usaha</label>
              <select
                id="business-category"
                name="category"
                defaultValue={business.category}
              >
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
              <label htmlFor="business-whatsapp">Nomor WhatsApp *</label>
              <input
                id="business-whatsapp"
                name="whatsapp_number"
                type="tel"
                defaultValue={business.whatsapp_number}
                required
                placeholder="08xxxxxxxxxx"
              />
              <small className="muted">
                Pastikan nomor ini aktif dan bisa menerima pesan.
              </small>
            </div>

            <div className="field settings-field-full">
              <label htmlFor="business-description">Deskripsi usaha</label>
              <textarea
                id="business-description"
                name="description"
                defaultValue={business.description || ''}
                rows={4}
                placeholder="Ceritakan produk atau layanan yang ditawarkan usahamu."
              />
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-heading">
              <h3>Lokasi dan kontak</h3>
              <p>Permudah pelanggan menemukan dan menghubungi usahamu.</p>
            </div>

            <div className="settings-form-grid">
              <div className="field settings-field-full">
                <label htmlFor="business-address">Alamat usaha</label>
                <input
                  id="business-address"
                  name="address"
                  defaultValue={business.address || ''}
                  placeholder="Jalan, nomor, kecamatan, kota"
                />
              </div>

              <div className="field">
                <label htmlFor="business-maps">Link Google Maps</label>
                <input
                  id="business-maps"
                  name="google_maps_url"
                  type="url"
                  defaultValue={business.google_maps_url || ''}
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="field">
                <label htmlFor="business-hours">Jam operasional</label>
                <input
                  id="business-hours"
                  name="opening_hours"
                  defaultValue={business.opening_hours?.display || ''}
                  placeholder="Senin–Sabtu, 09.00–17.00"
                />
              </div>

              <div className="field">
                <label htmlFor="business-instagram">Instagram</label>
                <input
                  id="business-instagram"
                  name="instagram_url"
                  type="url"
                  defaultValue={business.instagram_url || ''}
                  placeholder="https://instagram.com/..."
                />
              </div>

              <div className="field">
                <label htmlFor="business-facebook">Facebook</label>
                <input
                  id="business-facebook"
                  name="facebook_url"
                  type="url"
                  defaultValue={business.facebook_url || ''}
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div className="field settings-field-full">
                <label htmlFor="business-contact">Kontak tambahan</label>
                <input
                  id="business-contact"
                  name="additional_contact"
                  defaultValue={business.additional_contact || ''}
                  placeholder="Telepon atau informasi kontak lainnya"
                />
              </div>
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-heading">
              <h3>Logo dan foto sampul</h3>
              <p>
                Gunakan gambar yang membantu pelanggan mengenali usahamu.
              </p>
            </div>

            <div className="settings-form-grid">
              <div className="field">
                <label htmlFor="business-logo">Ganti logo usaha</label>
                <input
                  id="business-logo"
                  name="logo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <small className="muted">
                  JPG, PNG, atau WebP. Maksimal 5 MB.
                </small>
              </div>

              <div className="field">
                <label htmlFor="business-cover">Ganti foto sampul</label>
                <input
                  id="business-cover"
                  name="cover"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
                <small className="muted">
                  JPG, PNG, atau WebP. Maksimal 5 MB.
                </small>
              </div>
            </div>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-heading">
              <h3>Warna website</h3>
              <p>Pilih warna utama yang mencerminkan karakter usahamu.</p>
            </div>

            <div className="settings-theme-grid">
              {themes.map((theme) => (
                <label
                  key={theme.id}
                  className="settings-theme-option"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme.id}
                    defaultChecked={business.theme === theme.id}
                  />
                  <span
                    className="settings-theme-swatch"
                    style={{ background: theme.color }}
                  />
                  <span className="settings-theme-name">
                    {theme.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-form-footer">
            <p>
              Perubahan informasi akan digunakan pada website usahamu.
            </p>
            <button className="btn" type="submit">
              Simpan informasi
            </button>
          </div>
        </form>
      </section>

      {/* SISTEM KERANJANG */}
      <section className="panel settings-section settings-cart-section">
        <div className="settings-section-heading">
          <div className="settings-section-icon orange">🛒</div>
          <div>
            <h2>Sistem keranjang</h2>
            <p>Atur bagaimana pelanggan memesan produk.</p>
          </div>
        </div>

        <div className="settings-cart-description">
          <div>
            <strong>Keranjang belanja</strong>
            <p>
              Pelanggan dapat memilih beberapa produk sekaligus,
              mengatur jumlah, lalu mengirim satu pesan pesanan
              melalui WhatsApp.
            </p>
          </div>
        </div>

        <form action={saveBusinessSettings} className="settings-cart-form">
          <label className="settings-cart-toggle">
            <input
              type="checkbox"
              name="cart_enabled"
              defaultChecked={Boolean(settings?.cart_enabled)}
            />
            <span className="settings-toggle-visual" />
            <span>
              <strong>Aktifkan sistem keranjang</strong>
              <small>
                {settings?.cart_enabled
                  ? 'Keranjang sedang aktif di website kamu.'
                  : 'Pelanggan memesan langsung dari masing-masing produk.'}
              </small>
            </span>
          </label>

          <button className="btn" type="submit">
            Simpan pengaturan keranjang
          </button>
        </form>
      </section>
    </div>
  );
}
