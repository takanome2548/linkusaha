
'use client';

import { useMemo, useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  MessageCircle,
  MapPin,
  Clock,
  Instagram,
  Facebook,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

import {
  buildCartMessage,
  buildSingleProductMessage,
  calculateCart,
} from '@/lib/utils/ordering';

import { formatRupiah, whatsappUrl } from '@/lib/utils/format';

const themes = {
  'ocean-blue': {
    primary: '#2879c7',
    soft: '#edf5fc',
    text: '#174c7d',
  },
  'fresh-green': {
    primary: '#16845b',
    soft: '#eaf6ef',
    text: '#10583d',
  },
  'warm-orange': {
    primary: '#df812e',
    soft: '#fff3e7',
    text: '#874714',
  },
  'soft-purple': {
    primary: '#8766c5',
    soft: '#f3effb',
    text: '#523a82',
  },
  rose: {
    primary: '#d65d83',
    soft: '#fff0f4',
    text: '#8e3552',
  },
};

export function StorefrontClient({
  business,
  products,
  cartEnabled,
}) {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [note, setNote] = useState('');
  const [cartError, setCartError] = useState('');
  const [sending, setSending] = useState(false);

  const [liveProducts, setLiveProducts] = useState(products || []);
  const [directBusy, setDirectBusy] = useState('');
  const [directErrors, setDirectErrors] = useState({});

  const theme = themes[business.theme] || themes['ocean-blue'];

  const total = useMemo(
    () => calculateCart(cart),
    [cart]
  );

  const cartQuantity = cart.reduce(
    (quantity, item) => quantity + item.quantity,
    0
  );

  function add(product) {
    setCartError('');

    const found = cart.find((item) => item.id === product.id);

    if (found) {
      setCart((current) =>
        current.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + 1),
              }
            : item
        )
      );
      return;
    }

    if (cart.length >= 30) {
      setCartError('Keranjang maksimal 30 jenis produk.');
      setCartOpen(true);
      return;
    }

    setCart((current) => [
      ...current,
      {
        ...product,
        quantity: 1,
      },
    ]);
  }

  function change(id, delta) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: Math.min(99, item.quantity + delta),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id) {
    setCart((current) =>
      current.filter((item) => item.id !== id)
    );
    setCartError('');
  }

  async function orderDirect(product) {
    if (directBusy) return;

    const tab = window.open('about:blank', '_blank');

    if (!tab) {
      setDirectErrors((current) => ({
        ...current,
        [product.id]: 'Izinkan pop-up untuk membuka WhatsApp.',
      }));
      return;
    }

    tab.opener = null;

    setDirectBusy(product.id);

    setDirectErrors((current) => ({
      ...current,
      [product.id]: '',
    }));

    try {
      const response = await fetch(
        `/api/storefront/${business.slug}/availability?ids=${encodeURIComponent(product.id)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Tidak dapat memeriksa produk. Coba lagi.');
      }

      const result = await response.json();
      const fresh = result.products?.[0];

      if (
        !fresh ||
        !fresh.is_active ||
        !fresh.is_available
      ) {
        tab.close();

        setLiveProducts((current) =>
          current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  is_active: false,
                  is_available: false,
                }
              : item
          )
        );

        setDirectErrors((current) => ({
          ...current,
          [product.id]:
            'Produk sudah tidak tersedia. Silakan pilih produk lain.',
        }));

        return;
      }

      if (Number(fresh.price) !== Number(product.price)) {
        tab.close();

        setLiveProducts((current) =>
          current.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  ...fresh,
                  price: Number(fresh.price),
                }
              : item
          )
        );

        setDirectErrors((current) => ({
          ...current,
          [product.id]:
            'Harga produk baru saja berubah. Periksa harga terbaru, lalu tekan pesan kembali.',
        }));

        return;
      }

      tab.location.href = whatsappUrl(
        business.whatsapp_number,
        buildSingleProductMessage(fresh)
      );
    } catch (error) {
      tab.close();

      setDirectErrors((current) => ({
        ...current,
        [product.id]:
          error.message || 'Terjadi kesalahan. Coba lagi.',
      }));
    } finally {
      setDirectBusy('');
    }
  }

  async function sendCart() {
    if (!cart.length || sending) return;

    if (
      cart.some(
        (item) =>
          !item.is_active ||
          !item.is_available ||
          item.quantity < 1
      )
    ) {
      setCartError(
        'Ada produk yang tidak tersedia. Periksa keranjang terlebih dahulu.'
      );
      return;
    }

    const whatsappTab = window.open('about:blank', '_blank');

    if (!whatsappTab) {
      setCartError('Izinkan pop-up untuk membuka WhatsApp.');
      return;
    }

    whatsappTab.opener = null;

    setSending(true);
    setCartError('');

    try {
      const ids = cart.map((item) => item.id).join(',');

      const response = await fetch(
        `/api/storefront/${business.slug}/availability?ids=${encodeURIComponent(ids)}`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(
          'Tidak dapat memeriksa ketersediaan produk. Coba lagi.'
        );
      }

      const result = await response.json();

      const fresh = new Map(
        (result.products || []).map((item) => [
          item.id,
          item,
        ])
      );

      const missing = cart.filter(
        (item) => !fresh.has(item.id)
      );

      const changed = cart.filter(
        (item) =>
          fresh.has(item.id) &&
          Number(fresh.get(item.id).price) !== Number(item.price)
      );

      const unavailable = cart.filter(
        (item) =>
          fresh.has(item.id) &&
          (
            !fresh.get(item.id).is_available ||
            !fresh.get(item.id).is_active
          )
      );

      if (
        missing.length ||
        unavailable.length ||
        changed.length
      ) {
        setCart((current) =>
          current.map((item) => {
            if (!fresh.has(item.id)) {
              return {
                ...item,
                is_active: false,
                is_available: false,
              };
            }

            return {
              ...item,
              ...fresh.get(item.id),
              price: Number(fresh.get(item.id).price),
            };
          })
        );

        whatsappTab.close();

        setCartError(
          'Ada produk yang berubah, tidak tersedia, atau harganya diperbarui. Periksa keranjang sebelum mengirim kembali.'
        );

        return;
      }

      const message = buildCartMessage({
        businessName: business.name,
        items: cart,
        customerName,
        note,
      });

      whatsappTab.location.href = whatsappUrl(
        business.whatsapp_number,
        message
      );
    } catch (error) {
      whatsappTab.close();

      setCartError(
        error.message || 'Terjadi kesalahan. Coba lagi.'
      );
    } finally {
      setSending(false);
    }
  }

  
  return (
    <div
      className="storefront"
      style={{
        '--store-primary': theme.primary,
        '--store-soft': theme.soft,
        '--store-text': theme.text,
      }}
    >
      {/* HEADER */}
      <header className="store-header">
        <div className="container store-header-inner">
          <a
            href={`/${business.slug}`}
            className="store-brand"
            style={{ color: theme.text }}
          >
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={`Logo ${business.name}`}
                className="store-header-logo"
              />
            ) : (
              <span className="store-brand-monogram">
                {business.name?.trim()?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
            <span>{business.name}</span>
          </a>

          <nav className="store-nav" aria-label="Navigasi utama">
            {liveProducts.length > 0 && (
              <a href="#katalog">Produk</a>
            )}
            {business.description && (
              <a href="#tentang">Tentang</a>
            )}
            {(business.address || business.google_maps_url) && (
              <a href="#lokasi">Lokasi</a>
            )}
          </nav>

          <a
            href={whatsappUrl(
              business.whatsapp_number,
              `Halo ${business.name}, saya ingin bertanya.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn store-header-contact"
            style={{ background: theme.primary }}
          >
            <MessageCircle size={16} />
            <span>Hubungi kami</span>
          </a>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section
          className="store-hero"
          style={{ background: theme.soft }}
        >
          <div className="container store-hero-grid">
            <div className="store-hero-content">
              {business.category && (
                <div
                  className="store-hero-category"
                  style={{ color: theme.text }}
                >
                  <span style={{ background: theme.primary }} />
                  {business.category}
                </div>
              )}

              <h1 style={{ color: theme.text }}>
                {business.name}
              </h1>

              <p className="store-hero-description">
                {business.description ||
                  `Selamat datang di ${business.name}. Temukan produk dan layanan pilihan kami.`}
              </p>

              <div className="store-hero-actions">
                {liveProducts.length > 0 && (
                  <a
                    href="#katalog"
                    className="btn store-hero-primary"
                    style={{ background: theme.primary }}
                  >
                    <ShoppingBag size={17} />
                    Lihat produk
                    <ArrowUpRight size={16} />
                  </a>
                )}

                <a
                  href={whatsappUrl(
                    business.whatsapp_number,
                    `Halo ${business.name}, saya ingin bertanya.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn store-hero-secondary"
                >
                  <MessageCircle size={17} />
                  Hubungi kami
                </a>
              </div>

              <div className="store-hero-trust">
                <span
                  className="store-hero-trust-icon"
                  style={{
                    background: theme.primary,
                  }}
                >
                  <CheckCircle2 size={15} />
                </span>
                Pemesanan mudah dan langsung melalui WhatsApp
              </div>
            </div>

            <div className="store-hero-visual">
              <div className="store-hero-image">
                {business.cover_url ? (
                  <img
                    src={business.cover_url}
                    alt={`Sampul ${business.name}`}
                    fetchPriority="high"
                  />
                ) : (
                  <div
                    className="store-hero-placeholder"
                    style={{
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.text})`,
                    }}
                  >
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt=""
                      />
                    ) : (
                      <span>
                        {business.name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                )}

                <div className="store-hero-image-overlay" />

                <div className="store-hero-image-caption">
                  <span>SELAMAT DATANG DI</span>
                  <strong>{business.name}</strong>
                </div>
              </div>

              <div className="store-hero-floating">
                <div
                  className="store-hero-floating-icon"
                  style={{
                    background: theme.soft,
                    color: theme.primary,
                  }}
                >
                  <MessageCircle size={21} />
                </div>
                <div>
                  <strong>Pesan langsung</strong>
                  <span>Praktis melalui WhatsApp</span>
                </div>
                <ArrowUpRight
                  size={19}
                  className="store-hero-floating-arrow"
                />
              </div>
            </div>
          </div>
        </section>

        {/* BENEFITS */}
        <section className="store-benefits">
          <div className="container store-benefits-grid">
            <div className="store-benefit">
              <div
                className="store-benefit-icon"
                style={{ background: theme.soft, color: theme.primary }}
              >
                <ShoppingBag size={21} />
              </div>
              <div>
                <strong>Produk pilihan</strong>
                <span>Temukan produk yang sesuai kebutuhanmu.</span>
              </div>
            </div>

            <div className="store-benefit">
              <div
                className="store-benefit-icon"
                style={{ background: theme.soft, color: theme.primary }}
              >
                <MessageCircle size={21} />
              </div>
              <div>
                <strong>Pemesanan praktis</strong>
                <span>Hubungi usaha langsung melalui WhatsApp.</span>
              </div>
            </div>

            <div className="store-benefit">
              <div
                className="store-benefit-icon"
                style={{ background: theme.soft, color: theme.primary }}
              >
                <CheckCircle2 size={21} />
              </div>
              <div>
                <strong>Informasi transparan</strong>
                <span>Lihat harga dan informasi usaha dengan mudah.</span>
              </div>
            </div>
          </div>
        </section>

        {/* PRODUCT CATALOG */}
        {liveProducts.length > 0 && (
          <section
            id="katalog"
            className="store-catalog"
          >
            <div className="container">
              <div className="store-section-heading">
                <div>
                  <span
                    className="eyebrow"
                    style={{ color: theme.text }}
                  >
                    PILIHAN UNTUKMU
                  </span>
                  <h2>Jelajahi produk kami</h2>
                  <p>
                    Temukan produk pilihan dari {business.name}.
                  </p>
                </div>

                <span
                  className="store-catalog-count"
                  style={{
                    background: theme.soft,
                    color: theme.text,
                  }}
                >
                  {liveProducts.length} Produk
                </span>
              </div>

              <div className="store-products">
                {liveProducts.map((product) => (
                  <article
                    key={product.id}
                    className="store-product"
                  >
                    <div className="store-product-image">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className="store-product-placeholder"
                          style={{ background: theme.soft }}
                        >
                          <ShoppingBag
                            size={38}
                            style={{ color: theme.primary }}
                          />
                        </div>
                      )}

                      {!product.is_available || !product.is_active ? (
                        <span className="store-product-unavailable">
                          Tidak tersedia
                        </span>
                      ) : (
                        <span className="store-product-available">
                          <span
                            style={{ background: theme.primary }}
                          />
                          Tersedia
                        </span>
                      )}
                    </div>

                    <div className="store-product-body">
                      <div className="store-product-information">
                        <h3 className="store-product-name">
                          {product.name}
                        </h3>
                        <p className="store-product-description">
                          {product.description || 'Produk pilihan dari usaha kami.'}
                        </p>
                      </div>

                      <div className="store-product-footer">
                        <strong
                          className="store-product-price"
                          style={{ color: theme.text }}
                        >
                          {formatRupiah(product.price)}
                        </strong>

                        {!product.is_available || !product.is_active ? (
                          <button
                            className="btn store-product-button"
                            disabled
                          >
                            Sedang tidak tersedia
                          </button>
                        ) : cartEnabled ? (
                          <button
                            className="btn store-product-button"
                            style={{ background: theme.primary }}
                            onClick={() => add(product)}
                          >
                            <Plus size={16} />
                            Tambah ke keranjang
                          </button>
                        ) : (
                          <button
                            className="btn store-product-button"
                            style={{ background: theme.primary }}
                            disabled={directBusy === product.id}
                            onClick={() => orderDirect(product)}
                          >
                            <MessageCircle size={16} />
                            {directBusy === product.id
                              ? 'Memeriksa produk...'
                              : 'Pesan produk'}
                          </button>
                        )}

                        {directErrors[product.id] && (
                          <p className="notice error" role="alert">
                            {directErrors[product.id]}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ABOUT */}
        {business.description && (
          <section
            id="tentang"
            className="store-about"
          >
            <div className="container store-about-inner">
              <div className="store-about-mark">
                {business.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={`Logo ${business.name}`}
                    loading="lazy"
                  />
                ) : (
                  <span style={{ background: theme.soft, color: theme.text }}>
                    {business.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                )}
              </div>

              <div className="store-about-copy">
                <span
                  className="eyebrow"
                  style={{ color: theme.text }}
                >
                  TENTANG KAMI
                </span>
                <h2>Kenali {business.name} lebih dekat</h2>
                <p>{business.description}</p>
              </div>
            </div>
          </section>
        )}

        {/* BUSINESS INFORMATION & MAP */}
        {(business.address ||
          business.opening_hours?.display ||
          business.additional_contact ||
          business.google_maps_url) && (
          <section
            id="lokasi"
            className="store-information"
          >
            <div className="container">
              <div className="store-section-heading">
                <div>
                  <span
                    className="eyebrow"
                    style={{ color: theme.text }}
                  >
                    INFORMASI USAHA
                  </span>
                  <h2>Kunjungi dan hubungi kami</h2>
                  <p>
                    Informasi lokasi dan kontak {business.name}.
                  </p>
                </div>
              </div>

              <div className="store-information-layout">
                <div className="store-information-cards">
                  {business.address && (
                    <div className="store-information-card">
                      <div
                        className="store-information-icon"
                        style={{ background: theme.soft, color: theme.primary }}
                      >
                        <MapPin size={20} />
                      </div>
                      <div>
                        <strong>Alamat usaha</strong>
                        <p>{business.address}</p>
                      </div>
                    </div>
                  )}

                  {business.opening_hours?.display && (
                    <div className="store-information-card">
                      <div
                        className="store-information-icon"
                        style={{ background: theme.soft, color: theme.primary }}
                      >
                        <Clock size={20} />
                      </div>
                      <div>
                        <strong>Jam operasional</strong>
                        <p>{business.opening_hours.display}</p>
                      </div>
                    </div>
                  )}

                  {business.additional_contact && (
                    <div className="store-information-card">
                      <div
                        className="store-information-icon"
                        style={{ background: theme.soft, color: theme.primary }}
                      >
                        <MessageCircle size={20} />
                      </div>
                      <div>
                        <strong>Kontak tambahan</strong>
                        <p>{business.additional_contact}</p>
                      </div>
                    </div>
                  )}

                  {business.google_maps_url && (
                    <a
                      href={business.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn store-map-button"
                      style={{ background: theme.primary }}
                    >
                      <MapPin size={17} />
                      Buka petunjuk arah
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                </div>

                {business.address && (
                  <div className="store-map-wrapper">
                    <iframe
                      title={`Lokasi ${business.name} di Google Maps`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        business.address
                      )}&output=embed`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      allowFullScreen
                    />
                    <div className="store-map-caption">
                      <MapPin size={15} style={{ color: theme.primary }} />
                      <span>{business.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SOCIAL MEDIA */}
        {(business.instagram_url || business.facebook_url) && (
          <section className="store-social">
            <div className="container">
              <span
                className="eyebrow"
                style={{ color: theme.text }}
              >
                TERHUBUNG DENGAN KAMI
              </span>
              <h2>Ikuti aktivitas kami</h2>
              <p className="store-social-description">
                Temukan informasi dan kabar terbaru dari {business.name}.
              </p>

              <div className="store-social-links">
                {business.instagram_url && (
                  <a
                    href={business.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-social-link"
                    style={{ color: theme.text }}
                  >
                    <Instagram size={19} />
                    Instagram
                    <ArrowUpRight size={15} />
                  </a>
                )}

                {business.facebook_url && (
                  <a
                    href={business.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="store-social-link"
                    style={{ color: theme.text }}
                  >
                    <Facebook size={19} />
                    Facebook
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CONTACT CTA */}
        <section
          className="store-cta-section"
          style={{
            '--store-cta-bg': theme.primary,
          }}
        >
          <div className="container">
            <div className="store-cta-card">
              <div className="store-cta-content">
                <span>ADA YANG INGIN DITANYAKAN?</span>
                <h2>Kami siap membantu kamu.</h2>
                <p>
                  Hubungi {business.name} untuk bertanya mengenai produk
                  atau informasi lebih lanjut.
                </p>

                <a
                  href={whatsappUrl(
                    business.whatsapp_number,
                    `Halo ${business.name}, saya ingin bertanya.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn store-cta-button"
                >
                  <MessageCircle size={18} />
                  Hubungi melalui WhatsApp
                  <ArrowUpRight size={17} />
                </a>
              </div>

              <div className="store-cta-decoration">
                <MessageCircle size={110} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="store-footer">
        <div className="container store-footer-inner">
          <div className="store-footer-brand">
            {business.logo_url && (
              <img src={business.logo_url} alt="" />
            )}
            <strong>{business.name}</strong>
          </div>

          <span>
            Website usaha dibuat dengan{' '}
            <a href="/" style={{ color: theme.text }}>
              LinkUsaha
            </a>
          </span>
        </div>
      </footer>

      {/* CART FLOATING BUTTON */}
      {cartEnabled && cart.length > 0 && (
        <button
          className="btn cart-fab"
          style={{ background: theme.primary }}
          onClick={() => setCartOpen(true)}
        >
          <ShoppingBag size={18} />
          Keranjang ({cartQuantity}) · {formatRupiah(total)}
        </button>
      )}

      {/* CART DIALOG */}
      {cartEnabled && cartOpen && (
        <div
          className="cart-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Keranjang belanja"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setCartOpen(false);
            }
          }}
        >
          <div className="cart-content">
            <div className="store-cart-heading">
              <div>
                <span
                  className="eyebrow"
                  style={{ color: theme.text }}
                >
                  PESANAN KAMU
                </span>
                <h2>Keranjang pesanan</h2>
                <p className="muted">
                  Periksa pesanan sebelum dikirim.
                </p>
              </div>

              <button
                type="button"
                aria-label="Tutup keranjang"
                onClick={() => setCartOpen(false)}
                className="store-cart-close"
              >
                <X />
              </button>
            </div>

            {cartError && (
              <div className="notice error" role="alert">
                {cartError}
              </div>
            )}

            {cart.length === 0 ? (
              <div className="empty">
                <ShoppingBag size={34} />
                <p>Keranjang masih kosong.</p>
              </div>
            ) : (
              <>
                <div className="store-cart-items">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="store-cart-item"
                    >
                      <div className="store-cart-item-top">
                        <div>
                          <strong>{item.name}</strong>
                          <div className="muted">
                            {formatRupiah(item.price)} / produk
                          </div>
                        </div>
                        <strong>
                          {formatRupiah(item.price * item.quantity)}
                        </strong>
                      </div>

                      <div className="store-cart-controls">
                        <button
                          type="button"
                          className="btn secondary"
                          aria-label={`Kurangi ${item.name}`}
                          onClick={() => change(item.id, -1)}
                        >
                          <Minus size={15} />
                        </button>

                        <strong>{item.quantity}</strong>

                        <button
                          type="button"
                          className="btn secondary"
                          aria-label={`Tambah ${item.name}`}
                          disabled={item.quantity >= 99}
                          onClick={() => change(item.id, 1)}
                        >
                          <Plus size={15} />
                        </button>

                        <button
                          type="button"
                          className="store-cart-remove"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Hapus
                        </button>
                      </div>

                      {(!item.is_available || !item.is_active) && (
                        <p className="notice error">
                          Produk ini sudah tidak tersedia. Hapus dari
                          keranjang untuk melanjutkan.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="store-cart-form">
                  <div className="field">
                    <label htmlFor="customerName">
                      Nama pelanggan
                    </label>
                    <input
                      id="customerName"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(event.target.value)
                      }
                      placeholder="Nama kamu"
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="note">
                      Catatan (opsional)
                    </label>
                    <textarea
                      id="note"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Contoh: sambal dipisah"
                    />
                  </div>

                  <div className="store-cart-total">
                    <span>Estimasi total</span>
                    <strong>{formatRupiah(total)}</strong>
                  </div>

                  <p className="muted store-cart-disclaimer">
                    Harga dan ketersediaan akhir akan dikonfirmasi
                    oleh pemilik usaha melalui WhatsApp.
                  </p>

                  <button
                    type="button"
                    className="btn store-cart-submit"
                    style={{ background: theme.primary }}
                    disabled={
                      sending ||
                      cart.some(
                        (item) =>
                          !item.is_available ||
                          !item.is_active ||
                          item.quantity < 1
                      )
                    }
                    onClick={sendCart}
                  >
                    <MessageCircle size={17} />
                    {sending
                      ? 'Memeriksa produk...'
                      : 'Kirim pesanan ke WhatsApp'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

}
