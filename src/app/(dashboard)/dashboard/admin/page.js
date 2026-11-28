
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Statistik Admin',
};

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(value || 0);
}

function formatDate(date) {
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getPaymentStatus(status) {
  const statuses = {
    settlement: {
      label: 'Berhasil',
      color: '#15803d',
      background: '#dcfce7',
    },
    capture: {
      label: 'Berhasil',
      color: '#15803d',
      background: '#dcfce7',
    },
    pending: {
      label: 'Menunggu',
      color: '#a16207',
      background: '#fef9c3',
    },
    cancel: {
      label: 'Dibatalkan',
      color: '#64748b',
      background: '#f1f5f9',
    },
    expire: {
      label: 'Kedaluwarsa',
      color: '#b91c1c',
      background: '#fee2e2',
    },
    deny: {
      label: 'Ditolak',
      color: '#b91c1c',
      background: '#fee2e2',
    },
    failure: {
      label: 'Gagal',
      color: '#b91c1c',
      background: '#fee2e2',
    },
    refund: {
      label: 'Refund',
      color: '#64748b',
      background: '#f1f5f9',
    },
    partial_refund: {
      label: 'Refund Sebagian',
      color: '#64748b',
      background: '#f1f5f9',
    },
    authorize: {
      label: 'Diotorisasi',
      color: '#2563eb',
      background: '#dbeafe',
    },
  };

  return statuses[status] || {
    label: status || 'Tidak diketahui',
    color: '#64748b',
    background: '#f1f5f9',
  };
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!['admin', 'super_admin'].includes(profile?.role)) {
    redirect('/dashboard');
  }

  // Ambil data menggunakan Supabase Admin Client.
  const admin = createAdminClient();

  const [
    profilesResult,
    businessesResult,
    subscriptionsResult,
    paymentsResult,
  ] = await Promise.all([
    admin
      .from('profiles')
      .select('id,role,created_at')
      .order('created_at', { ascending: false }),

    admin
      .from('businesses')
      .select('id,name,slug,publication_status,created_at')
      .order('created_at', { ascending: false }),

    admin
      .from('subscriptions')
      .select('business_id,status,expires_at,price,created_at'),

    admin
      .from('payment_transactions')
      .select(
        'id,order_id,business_id,amount,status,paid_at,created_at,payment_type'
      )
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const profiles = profilesResult.data || [];
  const businesses = businessesResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];

  const dataErrors = [
    profilesResult.error,
    businessesResult.error,
    subscriptionsResult.error,
    paymentsResult.error,
  ].filter(Boolean);

  // Statistik pengguna dan bisnis.
  const totalPengguna = profiles.length;
  const totalBisnis = businesses.length;

  const websiteAktif = businesses.filter(
    (business) => business.publication_status === 'published'
  ).length;

  const websiteNonaktif = totalBisnis - websiteAktif;

  // Hitung bisnis yang memiliki langganan aktif dan belum kedaluwarsa.
  const now = Date.now();

  const activeBusinessIds = new Set(
    subscriptions
      .filter(
        (subscription) =>
          subscription.status === 'active' &&
          subscription.expires_at &&
          new Date(subscription.expires_at).getTime() > now
      )
      .map((subscription) => subscription.business_id)
  );

  const langgananAktif = activeBusinessIds.size;

  // Transaksi pembayaran berhasil.
  const successfulPayments = payments.filter(
    (payment) =>
      ['settlement', 'capture'].includes(payment.status)
  );

  const totalPendapatan = successfulPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const pembayaranPending = payments.filter(
    (payment) => payment.status === 'pending'
  ).length;

  // Pendapatan bulan berjalan berdasarkan paid_at.
  const currentDate = new Date();

  const currentMonthStart = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    1
  );

  const nextMonthStart = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth() + 1,
    1
  );

  const pendapatanBulanIni = successfulPayments
    .filter((payment) => {
      if (!payment.paid_at) return false;

      const paidAt = new Date(payment.paid_at).getTime();

      return (
        paidAt >= currentMonthStart &&
        paidAt < nextMonthStart
      );
    })
    .reduce(
      (total, payment) => total + Number(payment.amount || 0),
      0
    );

  // Grafik pendapatan enam bulan terakhir.
  const monthlyRevenue = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(
      Date.UTC(
        currentDate.getUTCFullYear(),
        currentDate.getUTCMonth() - i,
        1
      )
    );

    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    const start = Date.UTC(year, month, 1);
    const end = Date.UTC(year, month + 1, 1);

    const revenue = successfulPayments
      .filter((payment) => {
        if (!payment.paid_at) return false;

        const paidAt = new Date(payment.paid_at).getTime();

        return paidAt >= start && paidAt < end;
      })
      .reduce(
        (total, payment) => total + Number(payment.amount || 0),
        0
      );

    monthlyRevenue.push({
      label: new Intl.DateTimeFormat('id-ID', {
        month: 'short',
        timeZone: 'UTC',
      }).format(date),
      revenue,
    });
  }

  const maxRevenue = Math.max(
    ...monthlyRevenue.map((item) => item.revenue),
    1
  );

  // Pemetaan nama bisnis untuk daftar transaksi.
  const businessMap = new Map(
    businesses.map((business) => [
      business.id,
      business,
    ])
  );

  const latestBusinesses = businesses.slice(0, 5);
  const latestPayments = payments.slice(0, 6);

  const stats = [
    {
      label: 'Total Pengguna',
      value: formatNumber(totalPengguna),
      icon: '👥',
      color: '#2563eb',
      background: '#eff6ff',
      href: '/dashboard/admin/pengguna',
    },
    {
      label: 'Total Bisnis',
      value: formatNumber(totalBisnis),
      icon: '🏢',
      color: '#7c3aed',
      background: '#f5f3ff',
      href: '/dashboard/admin/bisnis',
    },
    {
      label: 'Website Aktif',
      value: formatNumber(websiteAktif),
      icon: '🌐',
      color: '#16a34a',
      background: '#f0fdf4',
      href: '/dashboard/admin/bisnis',
    },
    {
      label: 'Langganan Aktif',
      value: formatNumber(langgananAktif),
      icon: '💳',
      color: '#0891b2',
      background: '#ecfeff',
      href: '/dashboard/admin/pembayaran',
    },
    {
      label: 'Pendapatan Bulan Ini',
      value: formatRupiah(pendapatanBulanIni),
      icon: '💰',
      color: '#16a34a',
      background: '#f0fdf4',
      href: '/dashboard/admin/pembayaran',
    },
    {
      label: 'Pembayaran Pending',
      value: formatNumber(pembayaranPending),
      icon: '⏳',
      color: '#d97706',
      background: '#fffbeb',
      href: '/dashboard/admin/pembayaran',
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 26 }}>
        <div className="eyebrow">AREA INTERNAL</div>

        <h1
          style={{
            fontSize: 30,
            fontWeight: 750,
            letterSpacing: '-0.8px',
            margin: '7px 0',
          }}
        >
          Statistik Admin
        </h1>

        <p className="muted" style={{ margin: 0 }}>
          Pantau perkembangan dan aktivitas platform LinkUsaha.
        </p>
      </div>

      {/* Error */}
      {dataErrors.length > 0 && (
        <div className="notice error" style={{ marginBottom: 18 }}>
          Sebagian data statistik gagal dimuat. Periksa kembali
          koneksi database dan hak akses tabel.
          <div style={{ fontSize: 12, marginTop: 5 }}>
            {dataErrors.map((error, index) => (
              <div key={index}>{error.message}</div>
            ))}
          </div>
        </div>
      )}

      {/* Statistik utama */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 22,
        }}
      >
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="panel"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              borderRadius: 14,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.2s ease',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                borderRadius: 12,
                background: stat.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 19,
              }}
            >
              {stat.icon}
            </div>

            <div style={{ minWidth: 0 }}>
              <div
                className="muted"
                style={{
                  fontSize: 12,
                  marginBottom: 6,
                }}
              >
                {stat.label}
              </div>

              <div
                style={{
                  fontSize: stat.label === 'Pendapatan Bulan Ini' ? 19 : 25,
                  fontWeight: 750,
                  lineHeight: 1.2,
                  color: stat.color,
                  overflowWrap: 'anywhere',
                }}
              >
                {stat.value}
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Grafik dan ringkasan */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(230px, 1fr)',
          gap: 16,
          marginBottom: 22,
        }}
      >
        

{/* Grafik pendapatan */}
<div className="panel" style={{ padding: 22, borderRadius: 16, minWidth: 0 }}>
  <div style={{ marginBottom: 24 }}>
    <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
      Pendapatan Platform
    </h2>
    <p className="muted" style={{ fontSize: 12, margin: '5px 0 0' }}>
      Tren pendapatan enam bulan terakhir.
    </p>
  </div>

  <div style={{ width: '100%', overflow: 'hidden' }}>
    <svg
      viewBox="0 0 600 220"
      width="100%"
      role="img"
      aria-label="Grafik garis pendapatan enam bulan terakhir"
      style={{ display: 'block', overflow: 'visible' }}
    >
      {[0, 1, 2, 3].map((tick) => (
        <line
          key={tick}
          x1="48"
          y1={20 + tick * 48}
          x2="580"
          y2={20 + tick * 48}
          stroke="var(--line)"
          strokeWidth="1"
          strokeDasharray="4 5"
        />
      ))}

      <polyline
        points={monthlyRevenue
          .map((item, index) => {
            const x = 55 + index * 104;
            const y = 164 - (item.revenue / maxRevenue) * 132;
            return `${x},${y}`;
          })
          .join(' ')}
        fill="none"
        stroke="#2563eb"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {monthlyRevenue.map((item, index) => {
        const x = 55 + index * 104;
        const y = 164 - (item.revenue / maxRevenue) * 132;

        return (
          <g key={`${item.label}-${index}`}>
            <circle
              cx={x}
              cy={y}
              r="5"
              fill="#2563eb"
              stroke="var(--panel, white)"
              strokeWidth="2"
            />
            <text
              x={x}
              y="194"
              textAnchor="middle"
              fontSize="12"
              fill="currentColor"
            >
              {item.label}
            </text>
            <title>{`${item.label}: ${formatRupiah(item.revenue)}`}</title>
          </g>
        );
      })}
    </svg>
  </div>

  <div
    style={{
      marginTop: 12,
      paddingTop: 16,
      borderTop: '1px solid var(--line)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
    }}
  >
    <span className="muted" style={{ fontSize: 12 }}>
      Total pendapatan tercatat
    </span>
    <strong style={{ fontSize: 15, color: '#16a34a' }}>
      {formatRupiah(totalPendapatan)}
    </strong>
  </div>
</div>



        {/* Ringkasan website */}
        <div
          className="panel"
          style={{
            padding: 22,
            borderRadius: 16,
          }}
        >
          <h2
            style={{
              fontSize: 17,
              fontWeight: 700,
              margin: '0 0 6px',
            }}
          >
            Status Website
          </h2>

          <p
            className="muted"
            style={{
              fontSize: 12,
              margin: '0 0 22px',
            }}
          >
            Ringkasan publikasi bisnis.
          </p>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 9,
                fontSize: 13,
              }}
            >
              <span>Website aktif</span>
              <strong style={{ color: '#16a34a' }}>
                {formatNumber(websiteAktif)}
              </strong>
            </div>

            <div
              style={{
                height: 9,
                background: 'var(--surface-secondary, #f1f5f9)',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${
                    totalBisnis > 0
                      ? (websiteAktif / totalBisnis) * 100
                      : 0
                  }%`,
                  height: '100%',
                  background: '#16a34a',
                  borderRadius: 20,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 9,
                fontSize: 13,
              }}
            >
              <span>Website nonaktif</span>
              <strong style={{ color: '#d97706' }}>
                {formatNumber(websiteNonaktif)}
              </strong>
            </div>

            <div
              style={{
                height: 9,
                background: 'var(--surface-secondary, #f1f5f9)',
                borderRadius: 20,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${
                    totalBisnis > 0
                      ? (websiteNonaktif / totalBisnis) * 100
                      : 0
                  }%`,
                  height: '100%',
                  background: '#d97706',
                  borderRadius: 20,
                }}
              />
            </div>
          </div>

          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--line)',
            }}
          >
            <div
              className="muted"
              style={{ fontSize: 12, marginBottom: 5 }}
            >
              Bisnis belum berlangganan
            </div>

            <strong style={{ fontSize: 22 }}>
              {formatNumber(
                Math.max(0, totalBisnis - langgananAktif)
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* Aktivitas terbaru */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Bisnis terbaru */}
        <div
          className="panel"
          style={{
            padding: 22,
            borderRadius: 16,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0 }}>
              Bisnis Terbaru
            </h2>

            <Link
              href="/dashboard/admin/bisnis"
              style={{
                fontSize: 12,
                color: 'var(--primary, #2563eb)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Lihat semua
            </Link>
          </div>

          {latestBusinesses.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Belum ada bisnis terdaftar.
            </p>
          ) : (
            latestBusinesses.map((business) => (
              <div
                key={business.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '12px 0',
                  borderTop: '1px solid var(--line)',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontSize: 13,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {business.name}
                  </strong>

                  <span
                    className="muted"
                    style={{ fontSize: 11 }}
                  >
                    {business.slug}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '5px 8px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                    background:
                      business.publication_status === 'published'
                        ? '#dcfce7'
                        : '#f1f5f9',
                    color:
                      business.publication_status === 'published'
                        ? '#15803d'
                        : '#64748b',
                  }}
                >
                  {business.publication_status === 'published'
                    ? 'Aktif'
                    : 'Nonaktif'}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Pembayaran terbaru */}
        <div
          className="panel"
          style={{
            padding: 22,
            borderRadius: 16,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              marginBottom: 14,
            }}
          >
            <h2 style={{ fontSize: 16, margin: 0 }}>
              Pembayaran Terbaru
            </h2>

            <Link
              href="/dashboard/admin/pembayaran"
              style={{
                fontSize: 12,
                color: 'var(--primary, #2563eb)',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Lihat semua
            </Link>
          </div>

          {latestPayments.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Belum ada transaksi pembayaran.
            </p>
          ) : (
            latestPayments.map((payment) => {
              const status = getPaymentStatus(payment.status);
              const business = businessMap.get(payment.business_id);

              return (
                <div
                  key={payment.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 0',
                    borderTop: '1px solid var(--line)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 13,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {business?.name || 'Bisnis'}
                    </strong>

                    <span
                      className="muted"
                      style={{ fontSize: 11 }}
                    >
                      {formatDate(payment.created_at)}
                    </span>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginTop: 3,
                      }}
                    >
                      {formatRupiah(payment.amount)}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '5px 8px',
                      borderRadius: 20,
                      whiteSpace: 'nowrap',
                      color: status.color,
                      background: status.background,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
