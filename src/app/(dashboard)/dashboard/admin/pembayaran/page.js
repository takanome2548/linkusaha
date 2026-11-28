
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowLeft,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Langganan & Pembayaran',
};

const currency = (amount) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (date) => {
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

const paymentStatus = (status) => {
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
      color: '#b45309',
      background: '#ffedd5',
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
      color: '#7c3aed',
      background: '#ede9fe',
    },
    partial_refund: {
      label: 'Refund sebagian',
      color: '#7c3aed',
      background: '#ede9fe',
    },
    authorize: {
      label: 'Diotorisasi',
      color: '#0369a1',
      background: '#e0f2fe',
    },
  };

  return statuses[status] || {
    label: status || 'Tidak diketahui',
    color: '#64748b',
    background: '#f1f5f9',
  };
};

const subscriptionStatus = (subscription) => {
  if (!subscription) {
    return {
      label: 'Belum berlangganan',
      color: '#64748b',
      background: '#f1f5f9',
    };
  }

  const expired =
    !subscription.expires_at ||
    new Date(subscription.expires_at).getTime() <= Date.now();

  if (subscription.status === 'active' && !expired) {
    return {
      label: 'Aktif',
      color: '#15803d',
      background: '#dcfce7',
    };
  }

  if (subscription.status === 'active' && expired) {
    return {
      label: 'Kedaluwarsa',
      color: '#b45309',
      background: '#ffedd5',
    };
  }

  return {
    label: subscription.status || 'Tidak diketahui',
    color: '#64748b',
    background: '#f1f5f9',
  };
};

function StatusBadge({ status }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: 20,
        fontSize: 12,
        fontWeight: 600,
        color: status.color,
        background: status.background,
        whiteSpace: 'nowrap',
      }}
    >
      {status.label}
    </span>
  );
}

const cardStyle = {
  background: 'var(--card, #ffffff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 14,
  padding: 20,
};

export default async function AdminPaymentsPage({ searchParams }) {
  const params = await searchParams;

  const q = (params?.q || '').trim().toLowerCase();
  const paymentFilter = params?.payment || 'all';
  const subscriptionFilter = params?.subscription || 'all';

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

  const [
    { data: transactions, error: transactionError },
    { data: subscriptions, error: subscriptionError },
    { data: businesses, error: businessError },
  ] = await Promise.all([
    supabase
      .from('payment_transactions')
      .select(
        'id,business_id,user_id,order_id,amount,currency,status,midtrans_transaction_id,payment_type,fraud_status,paid_at,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('subscriptions')
      .select(
        'id,business_id,user_id,plan,status,price,started_at,expires_at,created_at'
      )
      .order('created_at', { ascending: false })
      .limit(1000),

    supabase
      .from('businesses')
      .select('id,name,slug,owner_id')
      .order('created_at', { ascending: false }),
  ]);

  const transactionRows = transactions || [];
  const subscriptionRows = subscriptions || [];
  const businessRows = businesses || [];

  const businessMap = new Map(
    businessRows.map((business) => [business.id, business])
  );

  const latestSubscriptionMap = new Map();

  for (const subscription of subscriptionRows) {
    const current = latestSubscriptionMap.get(subscription.business_id);

    if (
      !current ||
      new Date(subscription.created_at) >
        new Date(current.created_at)
    ) {
      latestSubscriptionMap.set(
        subscription.business_id,
        subscription
      );
    }
  }

  const paidStatuses = ['settlement', 'capture'];

  const successfulTransactions = transactionRows.filter((item) =>
    paidStatuses.includes(item.status)
  );

  const totalRevenue = successfulTransactions.reduce(
    (total, item) => total + (Number(item.amount) || 0),
    0
  );

  const pendingTransactions = transactionRows.filter(
    (item) => item.status === 'pending'
  );

  const activeSubscriptions = subscriptionRows.filter(
    (item) =>
      item.status === 'active' &&
      item.expires_at &&
      new Date(item.expires_at).getTime() > Date.now()
  );

  const filteredTransactions = transactionRows.filter((item) => {
    const business = businessMap.get(item.business_id);

    const matchesSearch =
      !q ||
      business?.name?.toLowerCase().includes(q) ||
      item.order_id?.toLowerCase().includes(q) ||
      item.midtrans_transaction_id?.toLowerCase().includes(q) ||
      item.payment_type?.toLowerCase().includes(q);

    const matchesStatus =
      paymentFilter === 'all' || item.status === paymentFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredSubscriptions = subscriptionRows.filter((item) => {
    const business = businessMap.get(item.business_id);
    const status = subscriptionStatus(item);

    const matchesSearch =
      !q ||
      business?.name?.toLowerCase().includes(q) ||
      business?.slug?.toLowerCase().includes(q);

    const matchesStatus =
      subscriptionFilter === 'all' ||
      (subscriptionFilter === 'active' && status.label === 'Aktif') ||
      (subscriptionFilter === 'inactive' && status.label !== 'Aktif');

    return matchesSearch && matchesStatus;
  });

  const inputStyle = {
    width: '100%',
    minWidth: 0,
    padding: '11px 13px',
    border: '1px solid var(--border, #e5e7eb)',
    borderRadius: 9,
    background: 'var(--input, #ffffff)',
    color: 'var(--foreground, #111827)',
    fontSize: 13,
  };

  const sectionTitle = {
    fontSize: 17,
    fontWeight: 700,
    margin: 0,
  };

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* HEADER */}
      <div>
        <Link
          href="/dashboard/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            color: 'var(--muted-foreground, #64748b)',
            fontSize: 13,
            textDecoration: 'none',
            marginBottom: 18,
          }}
        >
          <ArrowLeft size={16} />
          Kembali ke Admin Platform
        </Link>

        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 750,
              letterSpacing: '-0.7px',
              margin: 0,
            }}
          >
            Langganan & Pembayaran
          </h1>

          <p
            style={{
              color: 'var(--muted-foreground, #64748b)',
              fontSize: 14,
              marginTop: 7,
              marginBottom: 0,
            }}
          >
            Pantau transaksi dan status langganan seluruh bisnis LinkUsaha.
          </p>
        </div>
      </div>

      {/* ERROR */}
      {(transactionError || subscriptionError || businessError) && (
        <div
          style={{
            padding: 15,
            borderRadius: 10,
            background: '#fee2e2',
            color: '#991b1b',
            fontSize: 13,
          }}
        >
          Sebagian data gagal dimuat. Periksa izin SELECT dan kebijakan RLS
          untuk tabel transaksi, langganan, dan bisnis.
        </div>
      )}

      {/* STATISTIK */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 14,
        }}
      >
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
              Total Pendapatan
            </span>
            <Wallet size={19} color="#2563eb" />
          </div>
          <div style={{ fontSize: 23, fontWeight: 750, marginTop: 15 }}>
            {currency(totalRevenue)}
          </div>
          <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 12, marginTop: 5 }}>
            Dari pembayaran berhasil
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
              Total Transaksi
            </span>
            <CreditCard size={19} color="#7c3aed" />
          </div>
          <div style={{ fontSize: 23, fontWeight: 750, marginTop: 15 }}>
            {transactionRows.length}
          </div>
          <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 12, marginTop: 5 }}>
            Seluruh transaksi tercatat
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
              Menunggu Pembayaran
            </span>
            <Clock size={19} color="#d97706" />
          </div>
          <div style={{ fontSize: 23, fontWeight: 750, marginTop: 15 }}>
            {pendingTransactions.length}
          </div>
          <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 12, marginTop: 5 }}>
            Transaksi berstatus pending
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
              Langganan Aktif
            </span>
            <CheckCircle2 size={19} color="#16a34a" />
          </div>
          <div style={{ fontSize: 23, fontWeight: 750, marginTop: 15 }}>
            {activeSubscriptions.length}
          </div>
          <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 12, marginTop: 5 }}>
            Langganan belum kedaluwarsa
          </div>
        </div>
      </div>

      {/* TRANSAKSI */}
      <section style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <h2 style={sectionTitle}>Riwayat Pembayaran</h2>
          <p style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13, margin: '6px 0 0' }}>
            Maksimal 1.000 transaksi terbaru.
          </p>
        </div>

        <form
          method="GET"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, 220px) auto',
            gap: 10,
            padding: 16,
          }}
        >
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: 12,
                color: '#94a3b8',
              }}
            />
            <input
              name="q"
              defaultValue={params?.q || ''}
              placeholder="Cari bisnis atau ID transaksi..."
              style={{ ...inputStyle, paddingLeft: 36 }}
            />
          </div>

          <select
            name="payment"
            defaultValue={paymentFilter}
            style={inputStyle}
          >
            <option value="all">Semua pembayaran</option>
            <option value="settlement">Settlement</option>
            <option value="capture">Capture</option>
            <option value="pending">Pending</option>
            <option value="cancel">Cancel</option>
            <option value="expire">Expire</option>
            <option value="deny">Deny</option>
            <option value="failure">Failure</option>
            <option value="refund">Refund</option>
          </select>

          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 9,
              padding: '0 18px',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 850 }}>
            <thead>
             <tr
  style={{
    background: 'transparent',
    textAlign: 'left',
    borderBottom: '1px solid var(--border, #e5e7eb)',
  }}
>
                {['Bisnis / Order ID', 'Jumlah', 'Metode', 'Tanggal', 'Status'].map((label) => (
                  <th key={label} style={{
  padding: '15px 16px',
  fontSize: 11,
  color: 'var(--muted-foreground, #64748b)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((item) => {
                const business = businessMap.get(item.business_id);

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border, #e5e7eb)' }}>
                    <td style={{ padding: '15px 16px' }}>
                      <div style={{ fontWeight: 650, fontSize: 13 }}>
                        {business?.name || 'Bisnis tidak ditemukan'}
                      </div>
                      <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 11, marginTop: 4 }}>
                        {item.order_id}
                      </div>
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 13, fontWeight: 650, whiteSpace: 'nowrap' }}>
                      {currency(item.amount)}
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 13 }}>
                      {item.payment_type || '-'}
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 12, whiteSpace: 'nowrap', color: 'var(--muted-foreground, #64748b)' }}>
                      {formatDate(item.paid_at || item.created_at)}
                    </td>
                    <td style={{ padding: '15px 16px' }}>
                      <StatusBadge status={paymentStatus(item.status)} />
                    </td>
                  </tr>
                );
              })}

              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 35, color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
                    Tidak ada transaksi yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border, #e5e7eb)', fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>
          Menampilkan {filteredTransactions.length} dari {transactionRows.length} transaksi.
        </div>
      </section>

      {/* LANGGANAN */}
      <section style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 20, borderBottom: '1px solid var(--border, #e5e7eb)' }}>
          <h2 style={sectionTitle}>Daftar Langganan</h2>
          <p style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 13, margin: '6px 0 0' }}>
            Status paket dan masa aktif setiap bisnis.
          </p>
        </div>

        <form
          method="GET"
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1fr) minmax(150px, 220px) auto',
            gap: 10,
            padding: 16,
          }}
        >
          <input
            name="q"
            defaultValue={params?.q || ''}
            placeholder="Cari nama bisnis..."
            style={inputStyle}
          />

          <select
            name="subscription"
            defaultValue={subscriptionFilter}
            style={inputStyle}
          >
            <option value="all">Semua langganan</option>
            <option value="active">Aktif</option>
            <option value="inactive">Tidak aktif</option>
          </select>

          <button
            type="submit"
            style={{
              border: 0,
              borderRadius: 9,
              padding: '0 18px',
              background: '#2563eb',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Filter
          </button>
        </form>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr
  style={{
    background: 'transparent',
    textAlign: 'left',
    borderBottom: '1px solid var(--border, #e5e7eb)',
  }}
>
                {['Nama Bisnis', 'Paket', 'Harga', 'Mulai', 'Berakhir', 'Status'].map((label) => (
                  <th key={label}style={{
  padding: '15px 16px',
  fontSize: 11,
  color: 'var(--muted-foreground, #64748b)',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
}}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.map((item) => {
                const business = businessMap.get(item.business_id);

                return (
                  <tr key={item.id} style={{ borderTop: '1px solid var(--border, #e5e7eb)' }}>
                    <td style={{ padding: '15px 16px' }}>
                      <div style={{ fontWeight: 650, fontSize: 13 }}>
                        {business?.name || 'Bisnis tidak ditemukan'}
                      </div>
                      <div style={{ color: 'var(--muted-foreground, #64748b)', fontSize: 11, marginTop: 4 }}>
                        {business?.slug ? `/${business.slug}` : item.business_id}
                      </div>
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 13 }}>
                      {item.plan || '-'}
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {currency(item.price)}
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(item.started_at)}
                    </td>
                    <td style={{ padding: '15px 16px', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {formatDate(item.expires_at)}
                    </td>
                    <td style={{ padding: '15px 16px' }}>
                      <StatusBadge status={subscriptionStatus(item)} />
                    </td>
                  </tr>
                );
              })}

              {filteredSubscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 35, color: 'var(--muted-foreground, #64748b)', fontSize: 13 }}>
                    Tidak ada data langganan yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border, #e5e7eb)', fontSize: 12, color: 'var(--muted-foreground, #64748b)' }}>
          Menampilkan {filteredSubscriptions.length} dari {subscriptionRows.length} data langganan.
        </div>
      </section>
    </div>
  );
}
