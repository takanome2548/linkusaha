
import Link from 'next/link';
import { ActionButton } from '@/components/ui/action-button';
import {
  ArrowRight,
  Check,
  MessageCircle,
  Palette,
  Smartphone,
  Store,
  Zap,
  ShoppingBag,
  Utensils,
  Sparkles,
  Globe,
  MousePointerClick,
  Rocket,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';

const showcases = [
  {
    name: 'Kedai Senja',
    category: 'KEDAI KOPI',
    image: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=900&q=85',
    theme: '#9b6849',
    label: 'Kopi & Kuliner',
    className: 'showcase-main',
  },
  {
    name: 'Ruang Fashion',
    category: 'FASHION',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=85',
    theme: '#b47b85',
    label: 'Fashion',
    className: 'showcase-top',
  },
  {
    name: 'Dapur Ibu',
    category: 'MAKANAN',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=85',
    theme: '#d28b45',
    label: 'Kuliner',
    className: 'showcase-bottom',
  },
];

const features = [
  {
    icon: Store,
    title: 'Website usaha sendiri',
    description: 'Miliki halaman khusus untuk memperkenalkan usaha dan produkmu.',
  },
  {
    icon: MessageCircle,
    title: 'Pesanan via WhatsApp',
    description: 'Terima pertanyaan dan pesanan pelanggan langsung melalui WhatsApp.',
  },
  {
    icon: Palette,
    title: 'Tema sesuai identitas',
    description: 'Pilih warna website yang sesuai dengan karakter brand usahamu.',
  },
  {
    icon: Smartphone,
    title: 'Nyaman di smartphone',
    description: 'Tampilan website menyesuaikan perangkat pelanggan.',
  },
  {
    icon: Zap,
    title: 'Mudah dikelola',
    description: 'Perbarui informasi dan produk melalui dashboard sederhana.',
  },
  {
    icon: ShoppingBag,
    title: 'Pilihan keranjang',
    description: 'Aktifkan keranjang untuk pesanan beberapa produk sekaligus.',
  },
];

const steps = [
  {
    number: '01',
    icon: MousePointerClick,
    title: 'Buat akun',
    description: 'Daftar dan mulai isi informasi dasar tentang usahamu.',
  },
  {
    number: '02',
    icon: Store,
    title: 'Atur website',
    description: 'Tambahkan produk, foto, informasi usaha, dan pilih tema.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Publikasikan',
    description: 'Bagikan link website kepada pelanggan melalui media sosial atau WhatsApp.',
  },
];

const faqs = [
  {
    question: 'Apakah saya harus bisa coding?',
    answer: 'Tidak. Kamu cukup mengisi informasi usaha, menambahkan produk, dan memilih tampilan melalui dashboard LinkUsaha.',
  },
  {
    question: 'Berapa biaya menggunakan LinkUsaha?',
    answer: 'Biaya berlangganan LinkUsaha adalah Rp10.000 per bulan.',
  },
  {
    question: 'Bagaimana pelanggan memesan produk?',
    answer: 'Pelanggan dapat menghubungi pemilik usaha melalui WhatsApp. Kamu juga dapat mengaktifkan keranjang untuk mengirim beberapa produk dalam satu pesan.',
  },
  {
    question: 'Apakah website bisa dibuka melalui HP?',
    answer: 'Ya. Website LinkUsaha dirancang responsif sehingga dapat dibuka melalui smartphone, tablet, maupun komputer.',
  },
  {
    question: 'Apakah informasi dan produk bisa diubah?',
    answer: 'Ya. Pemilik usaha dapat mengelola informasi bisnis dan produk melalui dashboard.',
  },
];

function WebsiteShowcase() {
  return (
    <div className="website-showcase">
      <div className="showcase-decoration showcase-decoration-one" />
      <div className="showcase-decoration showcase-decoration-two" />

      <div className="showcase-floating-label">
        <Sparkles size={15} />
        <span>Website usaha impianmu</span>
      </div>

      {showcases.map((item) => (
        <div
          key={item.name}
          className={`showcase-card ${item.className}`}
          style={{ '--showcase-theme': item.theme }}
        >
          <div className="showcase-browser">
            <div className="showcase-browser-dots">
              <i /><i /><i />
            </div>
            <span>linkusaha.id/{item.name.toLowerCase().replaceAll(' ', '-')}</span>
          </div>

          <div className="showcase-image">
            <img src={item.image} alt={`Contoh website ${item.label}`} />
            <div className="showcase-image-overlay" />
            <div className="showcase-content">
              <span>{item.category}</span>
              <strong>{item.name}</strong>
              <small>Temukan yang kamu suka.</small>
            </div>
          </div>

          <div className="showcase-card-footer">
            <div>
              <strong>{item.name}</strong>
              <span>{item.label}</span>
            </div>
            <span className="showcase-shop-icon">
              <ShoppingBag size={16} />
            </span>
          </div>
        </div>
      ))}

      <div className="showcase-note">
        <span className="showcase-note-icon"><Globe size={17} /></span>
        <div>
          <strong>Satu link untuk usahamu</strong>
          <span>Profil, produk, dan WhatsApp</span>
        </div>
        <Check size={18} className="showcase-note-check" />
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="lu-section-heading">
      <div className="eyebrow">{eyebrow}</div>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <header className="container site-header">
        <Link href="/" className="brand">
          link<span>usaha</span>
        </Link>

        <nav className="lu-nav">
          <Link href="#fitur" className="muted">Fitur</Link>
          <Link href="#cara-kerja" className="muted">Cara kerja</Link>
          <Link href="#harga" className="muted">Harga</Link>
          <Link href="/login" className="muted">Masuk</Link>
          <Link href="/register" className="btn">
            Buat website <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="container hero hero-showcase">
          <div className="hero-copy">
            <div className="eyebrow">
              Website usaha sendiri, tanpa harus ribet.
            </div>

            <h1>
              Usahamu layak punya{' '}
              <span style={{ color: 'var(--green)' }}>website sendiri.</span>
            </h1>

            <p>
              Tampilkan produk, ceritakan usahamu, dan terima pesanan
              langsung lewat WhatsApp. Semua bisa kamu atur sendiri,
              tanpa perlu bisa coding.
            </p>

            <div className="hero-actions">
              <ActionButton asChild>
                <Link href="/register" className="btn">
                  Mulai buat website <ArrowRight size={17} />
                </Link>
              </ActionButton>
              <Link href="#harga" className="btn secondary">
                Lihat harga
              </Link>
            </div>

            <div className="hero-benefits">
              <span><Check size={15} /> Mudah dikelola</span>
              <span><Check size={15} /> Pesanan via WhatsApp</span>
              <span><Check size={15} /> Tampilan mobile</span>
            </div>
          </div>

          <WebsiteShowcase />
        </section>

        {/* TRUST STRIP */}
        <section className="lu-trust-strip">
          <div className="container lu-trust-inner">
            <span><ShieldCheck size={18} /> Dibuat untuk usaha kecil</span>
            <span><Smartphone size={18} /> Siap untuk pelanggan mobile</span>
            <span><MessageCircle size={18} /> Terhubung ke WhatsApp</span>
          </div>
        </section>

        {/* FEATURES */}
        <section className="section lu-section" id="fitur">
          <div className="container">
            <SectionHeading
              eyebrow="Fitur LinkUsaha"
              title="Semua kebutuhan dasar usahamu, dalam satu tempat."
              description="Tidak perlu membuat website dari nol. LinkUsaha membantu usahamu tampil lebih profesional dan mudah ditemukan pelanggan."
            />

            <div className="lu-feature-grid">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="lu-feature-card" key={feature.title}>
                    <div className="lu-feature-icon">
                      <Icon size={23} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="section lu-how-section" id="cara-kerja">
          <div className="container">
            <SectionHeading
              eyebrow="Cara kerja"
              title="Dari belum punya website hingga siap dibagikan."
              description="Proses sederhana yang bisa kamu lakukan sendiri."
            />

            <div className="lu-steps-grid">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <article className="lu-step-card" key={step.number}>
                    <div className="lu-step-top">
                      <span>{step.number}</span>
                      <Icon size={23} />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* SHOWCASE CATEGORIES */}
        <section className="section lu-category-section">
          <div className="container">
            <SectionHeading
              eyebrow="Untuk berbagai jenis usaha"
              title="Apa pun usahamu, tampilkan dengan lebih menarik."
              description="Mulai dari usaha makanan hingga toko produk, kamu bisa memiliki halaman website sendiri."
            />

            <div className="lu-category-grid">
              <article className="lu-category-card">
                <img
                  src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=700&q=85"
                  alt="Usaha restoran dan makanan"
                />
                <div><span>KULINER</span><h3>Makanan & minuman</h3></div>
              </article>

              <article className="lu-category-card">
                <img
                  src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&q=85"
                  alt="Usaha fashion"
                />
                <div><span>RETAIL</span><h3>Fashion & produk</h3></div>
              </article>

              <article className="lu-category-card">
                <img
                  src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=85"
                  alt="Usaha jasa dan profesional"
                />
                <div><span>JASA</span><h3>Jasa & profesional</h3></div>
              </article>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="section lu-pricing-section" id="harga">
          <div className="container">
            <SectionHeading
              eyebrow="Harga sederhana"
              title="Mulai punya website sendiri dengan biaya terjangkau."
              description="Satu harga berlangganan yang mudah dipahami untuk membantu usahamu tampil online."
            />

            <div className="lu-pricing-wrap">
              <article className="lu-pricing-card">
                <div className="lu-pricing-label">LINKUSAHA</div>
                <h3>Website Usaha</h3>
                <p className="lu-pricing-description">
                  Semua kebutuhan dasar untuk menampilkan usaha dan produkmu secara online.
                </p>

                <div className="lu-price">
                  <strong>Rp10.000</strong>
                  <span>/ bulan</span>
                </div>

                <div className="lu-pricing-divider" />

                <div className="lu-pricing-includes">
                  <span><Check size={17} /> Website usaha dengan link sendiri</span>
                  <span><Check size={17} /> Profil dan informasi bisnis</span>
                  <span><Check size={17} /> Kelola daftar produk</span>
                  <span><Check size={17} /> Pilihan tema warna</span>
                  <span><Check size={17} /> Pesanan melalui WhatsApp</span>
                  <span><Check size={17} /> Tampilan responsif di HP</span>
                  <span><Check size={17} /> Dashboard pengelolaan</span>
                </div>

                <ActionButton asChild>
                  <Link href="/register" className="btn lu-pricing-button">
                    Mulai berlangganan <ArrowRight size={17} />
                  </Link>
                </ActionButton>

                <p className="lu-pricing-footnote">
                  Berlangganan Rp10.000 setiap bulan.
                </p>
              </article>

              <div className="lu-pricing-aside">
                <div className="lu-pricing-aside-icon">
                  <Sparkles size={24} />
                </div>
                <h3>Lebih mudah ditemukan dan dihubungi pelanggan.</h3>
                <p>
                  Bagikan satu alamat website di bio media sosial,
                  katalog WhatsApp, atau materi promosi usahamu.
                </p>
                <div className="lu-pricing-aside-note">
                  <Check size={17} />
                  <span>Mulai dari kebutuhan dasar usahamu.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section lu-faq-section" id="faq">
          <div className="container lu-faq-layout">
            <div className="lu-faq-intro">
              <div className="eyebrow">Pertanyaan umum</div>
              <h2>Ada yang ingin kamu ketahui?</h2>
              <p>
                Berikut beberapa hal yang sering ditanyakan tentang LinkUsaha.
              </p>
              <Link href="/register" className="lu-faq-link">
                Mulai buat website <ArrowRight size={16} />
              </Link>
            </div>

            <div className="lu-faq-list">
              {faqs.map((faq) => (
                <details className="lu-faq-item" key={faq.question}>
                  <summary>
                    <span>{faq.question}</span>
                    <ChevronDown size={18} />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="section lu-final-section">
          <div className="container">
            <div className="lu-final-card">
              <div className="lu-final-decoration" />
              <div className="lu-final-content">
                <div className="eyebrow">Saatnya usahamu tampil online</div>
                <h2>Mulai bangun website usahamu hari ini.</h2>
                <p>
                  Tampilkan produk, bagikan link, dan terima pesanan
                  pelanggan melalui WhatsApp.
                </p>
                <ActionButton asChild>
                  <Link href="/register" className="btn lu-final-button">
                    Buat website sekarang <ArrowRight size={17} />
                  </Link>
                </ActionButton>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer lu-footer">
        <div className="container lu-footer-inner">
          <div>
            <Link href="/" className="brand">link<span>usaha</span></Link>
            <p>Website usaha sendiri, tanpa harus ribet.</p>
          </div>

          <div className="lu-footer-links">
            <Link href="#fitur">Fitur</Link>
            <Link href="#cara-kerja">Cara kerja</Link>
            <Link href="#harga">Harga</Link>
            <Link href="#faq">FAQ</Link>
            <Link href="/login">Masuk</Link>
          </div>

          <div className="lu-footer-copy">
            © {new Date().getFullYear()} LinkUsaha.
          </div>
        </div>
      </footer>
    </>
  );
}
