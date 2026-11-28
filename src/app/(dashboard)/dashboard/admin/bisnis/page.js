
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { adminUpdatePublication } from '@/lib/actions/business';

export const metadata = { title: 'Manajemen Bisnis' };

function formatDate(date) {
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getStatusStyle(status) {
  if (status === 'published') {
    return {
      color: '#15803d',
      background: '#dcfce7',
      label: 'Published',
    };
  }

  if (status === 'draft') {
    return {
      color: '#a16207',
      background: '#fef9c3',
      label: 'Draft',
    };
  }

  return {
    color: '#64748b',
    background: '#f1f5f9',
    label: 'Unpublished',
  };
}

export default async function AdminPage({ searchParams }) {
  const params = await searchParams;
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

  // Ambil seluruh data bisnis
  const {
    data: businesses,
    error,
  } = await supabase
    .from('businesses')
    .select(
      'id,name,slug,owner_id,category,publication_status,created_at'
    )
    .order('created_at', { ascending: false });

  const businessList = businesses || [];

  // Ambil data langganan
  const {
    data: subscriptions,
    error: subscriptionError,
  } = await supabase
    .from('subscriptions')
    .select('business_id,status,expires_at');

  // Hitung statistik bisnis
  const totalBisnis = businessList.length;

  const websiteAktif = businessList.filter(
    (b) => b.publication_status === 'published'
  ).length;

  const websiteNonaktif = totalBisnis - websiteAktif;

  // Hitung bisnis yang memiliki langganan aktif
  const now = Date.now();

  const activeBusinessIds = new Set(
    (subscriptions || [])
      .filter(
        (s) =>
          s.status === 'active' &&
          s.expires_at &&
          new Date(s.expires_at).getTime() > now
      )
      .map((s) => s.business_id)
  );

  const langgananAktif = activeBusinessIds.size;

  const tidakBerlangganan = Math.max(
    0,
    totalBisnis - langgananAktif
  );

  // Statistik
  const stats = [
    {
      label: 'Total Bisnis',
      value: totalBisnis,
      icon: '🏢',
      color: '#2563eb',
      background: '#eff6ff',
    },
    {
      label: 'Website Aktif',
      value: websiteAktif,
      icon: '🌐',
      color: '#16a34a',
      background: '#f0fdf4',
    },
    {
      label: 'Website Nonaktif',
      value: websiteNonaktif,
      icon: '⏸',
      color: '#d97706',
      background: '#fffbeb',
    },
    {
      label: 'Langganan Aktif',
      value: langgananAktif,
      icon: '💳',
      color: '#7c3aed',
      background: '#f5f3ff',
    },
  ];

  // Pencarian dan filter
  const searchQuery =
    typeof params?.q === 'string' ? params.q.trim() : '';

  const allowedStatuses = [
    'published',
    'draft',
    'unpublished',
  ];

  const statusFilter = allowedStatuses.includes(params?.status)
    ? params.status
    : 'all';

  const subscriptionFilter = ['active', 'inactive'].includes(
    params?.subscription
  )
    ? params.subscription
    : 'all';

  const filteredBusinesses = businessList.filter((b) => {
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      !query ||
      b.name?.toLowerCase().includes(query) ||
      b.slug?.toLowerCase().includes(query);

    const matchesStatus =
      statusFilter === 'all' ||
      b.publication_status === statusFilter;

    const isSubscribed = activeBusinessIds.has(b.id);

    const matchesSubscription =
      subscriptionFilter === 'all' ||
      (subscriptionFilter === 'active' && isSubscribed) ||
      (subscriptionFilter === 'inactive' && !isSubscribed);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesSubscription
    );
  });

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
  Manajemen Bisnis
</h1>

      <p className="muted" style={{ margin: 0 }}>
  Pantau dan kelola seluruh bisnis yang terdaftar di LinkUsaha.
</p>
      </div>

      {/* Notifikasi */}
      {params?.error && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          {params.error}
        </div>
      )}

      {params?.message && (
        <div className="notice success" style={{ marginBottom: 16 }}>
          {params.message}
        </div>
      )}

      {error && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          Gagal mengambil data bisnis: {error.message}
        </div>
      )}

      {subscriptionError && (
        <div className="notice error" style={{ marginBottom: 16 }}>
          Gagal mengambil data langganan: {subscriptionError.message}
        </div>
      )}

      {/* Statistik */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
          marginBottom: 30,
        }}
      >
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="panel"
            style={{
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 15,
              borderRadius: 14,
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                minWidth: 46,
                borderRadius: 13,
                background: stat.background,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              {stat.icon}
            </div>

            <div>
              <div
                className="muted"
                style={{ fontSize: 12, marginBottom: 6 }}
              >
                {stat.label}
              </div>

              <div
                style={{
                  fontSize: 27,
                  fontWeight: 750,
                  lineHeight: 1,
                  color: stat.color,
                }}
              >
                {stat.value}
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Manajemen Bisnis */}
      <section
        className="panel"
        style={{
          padding: 22,
          borderRadius: 16,
        }}
      >
        {/* Judul */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Manajemen Bisnis
            </h2>

            <p
              className="muted"
              style={{
                fontSize: 13,
                margin: '5px 0 0',
              }}
            >
              Kelola data, publikasi, dan langganan bisnis.
            </p>
          </div>

          <div
            style={{
              padding: '7px 12px',
              borderRadius: 9,
              background: 'var(--surface-secondary, #f1f5f9)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {filteredBusinesses.length} dari {totalBisnis} bisnis
          </div>
        </div>

       {/* Pencarian dan filter */}
<form
  method="GET"
  action="/dashboard/admin/bisnis"
  style={{
    display: 'grid',
    gridTemplateColumns:
      'minmax(180px, 1fr) repeat(2, minmax(145px, 180px)) auto auto',
    gap: 10,
    marginBottom: 20,
  }}
>
  <input
    type="search"
    name="q"
    placeholder="Cari nama bisnis atau slug..."
    defaultValue={searchQuery}
    aria-label="Cari bisnis"
    style={{
      width: '100%',
      minHeight: 42,
      boxSizing: 'border-box',
      fontSize: 13,
    }}
  />

  <select
    name="status"
    defaultValue={statusFilter}
    aria-label="Filter status publikasi"
    style={{
      minHeight: 42,
      fontSize: 13,
    }}
  >
    <option value="all">Semua publikasi</option>
    <option value="published">Published</option>
    <option value="draft">Draft</option>
    <option value="unpublished">Unpublished</option>
  </select>

  <select
    name="subscription"
    defaultValue={subscriptionFilter}
    aria-label="Filter status langganan"
    style={{
      minHeight: 42,
      fontSize: 13,
    }}
  >
    <option value="all">Semua langganan</option>
    <option value="active">Berlangganan</option>
    <option value="inactive">Tidak berlangganan</option>
  </select>

  <button
    className="btn"
    type="submit"
    style={{
      minHeight: 42,
      padding: '0 18px',
      fontSize: 13,
    }}
  >
    Cari
  </button>

  <Link
    href="/dashboard/admin/bisnis"
    className="btn"
    style={{
      minHeight: 42,
      padding: '0 16px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      textDecoration: 'none',
      fontSize: 13,
      boxSizing: 'border-box',
    }}
  >
    Reset
  </Link>
</form>

        {/* Ringkasan langganan */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            padding: '12px 14px',
            background: 'var(--surface-secondary, #f8fafc)',
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 12,
          }}
        >
          <span className="muted">
            Ringkasan langganan:
          </span>

          <span style={{ color: '#15803d', fontWeight: 700 }}>
            ● {langgananAktif} Berlangganan
          </span>

          <span style={{ color: '#b91c1c', fontWeight: 700 }}>
            ● {subscriptionError ? '-' : tidakBerlangganan} Tidak berlangganan
          </span>
        </div>

        {/* Header daftar */}
        <div
          style={{
            borderTop: '1px solid var(--line)',
            paddingTop: 15,
            paddingBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            color: 'var(--muted)',
            fontSize: 12,
          }}
        >
          <span>INFORMASI BISNIS</span>
          <span>STATUS BISNIS</span>
        </div>

        {/* Daftar bisnis */}
        {!filteredBusinesses.length ? (
          <div
            style={{
              padding: '42px 15px',
              textAlign: 'center',
              borderTop: '1px solid var(--line)',
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 10 }}>
              🔎
            </div>

            <strong style={{ display: 'block', marginBottom: 5 }}>
              {businessList.length === 0
                ? 'Belum ada bisnis'
                : 'Bisnis tidak ditemukan'}
            </strong>

            <p
              className="muted"
              style={{ fontSize: 13, margin: 0 }}
            >
              {businessList.length === 0
                ? 'Bisnis yang terdaftar akan muncul di sini.'
                : 'Coba kata kunci atau filter yang berbeda.'}
            </p>
          </div>
        ) : (
          filteredBusinesses.map((b) => {
            const status = getStatusStyle(b.publication_status);
            const isSubscribed = activeBusinessIds.has(b.id);

            return (
              <article
                key={b.id}
                style={{
                  padding: '17px 0',
                  borderTop: '1px solid var(--line)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 18,
                  flexWrap: 'wrap',
                }}
              >
                {/* Informasi bisnis */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 13,
                    flex: '1 1 260px',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 43,
                      height: 43,
                      minWidth: 43,
                      borderRadius: 12,
                      background: 'var(--surface-secondary, #f1f5f9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 19,
                    }}
                  >
                    🏪
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      {b.name}
                    </strong>

                    <div
                      className="muted"
                      style={{
                        fontSize: 12,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {b.slug} · {b.category || 'Tanpa kategori'}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                      }}
                    >
                      Owner: {b.owner_id}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 11,
                        marginTop: 3,
                      }}
                    >
                      Terdaftar {formatDate(b.created_at)}
                    </div>
                  </div>
                </div>

                {/* Status dan kontrol */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {/* Status publikasi */}
                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: 20,
                      background: status.background,
                      color: status.color,
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {status.label}
                  </span>

                  {/* Status langganan */}
                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: 20,
                      background: subscriptionError
                        ? '#f1f5f9'
                        : isSubscribed
                          ? '#dcfce7'
                          : '#fee2e2',
                      color: subscriptionError
                        ? '#64748b'
                        : isSubscribed
                          ? '#15803d'
                          : '#b91c1c',
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {subscriptionError
                      ? 'Data tidak tersedia'
                      : isSubscribed
                        ? 'Berlangganan'
                        : 'Tidak berlangganan'}
                  </span>

                  {/* Ubah status publikasi */}
                  <form
                    action={adminUpdatePublication}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                    }}
                  >
                    <input
                      type="hidden"
                      name="business_id"
                      value={b.id}
                    />

                    <select
                      name="status"
                      defaultValue={b.publication_status || 'draft'}
                      aria-label={`Status ${b.name}`}
                      style={{
                        minHeight: 36,
                        fontSize: 12,
                        maxWidth: 140,
                      }}
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="unpublished">Unpublished</option>
                    </select>

                    <button
                      className="btn"
                      type="submit"
                      style={{
                        minHeight: 36,
                        padding: '0 13px',
                        fontSize: 12,
                      }}
                    >
                      Simpan
                    </button>
                  </form>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
