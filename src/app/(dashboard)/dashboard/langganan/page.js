
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  CreditCard,
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertCircle,
} from 'lucide-react';
import PaymentButton from './PaymentButton';

export const dynamic = 'force-dynamic';

function formatDate(date) {
  if (!date) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default async function SubscriptionPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (businessError) {
    console.error('Subscription business error:', businessError);
  }

  if (!business) {
    return (
      <div className="dashboard-page">
        <h1>Langganan</h1>
        <p>Buat bisnis terlebih dahulu untuk menggunakan layanan langganan LinkUsaha.</p>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isSuperAdmin = profile?.role === 'super_admin';

  let subscription = null;
  let transactions = [];

  if (isSuperAdmin) {
    subscription = {
      status: 'active',
      expires_at: null,
      started_at: null,
      price: 0,
    };
  } else {
    const admin = createAdminClient();

    const [{ data: subscriptionData, error: subscriptionError }, { data: transactionData, error: transactionError }] =
      await Promise.all([
        admin
          .from('subscriptions')
          .select('status, started_at, expires_at, price, plan')
          .eq('business_id', business.id)
          .maybeSingle(),

        admin
          .from('payment_transactions')
          .select('order_id, amount, status, created_at, paid_at')
          .eq('business_id', business.id)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

    if (subscriptionError) {
      console.error('Subscription lookup error:', subscriptionError);
    }

    if (transactionError) {
      console.error('Transaction lookup error:', transactionError);
    }

    subscription = subscriptionData;
    transactions = transactionData || [];
  }

  const now = Date.now();

  const isActive =
    isSuperAdmin ||
    (subscription?.status === 'active' &&
      subscription?.expires_at &&
      new Date(subscription.expires_at).getTime() > now);

  const isExpired =
    subscription?.status === 'expired' ||
    (subscription?.expires_at &&
      new Date(subscription.expires_at).getTime() <= now);

  const statusLabel = isSuperAdmin
    ? 'Gratis permanen'
    : isActive
      ? 'Aktif'
      : isExpired
        ? 'Kedaluwarsa'
        : 'Belum berlangganan';

  const StatusIcon = isActive
    ? CheckCircle2
    : isExpired
      ? AlertCircle
      : Clock3;

  return (
    <div className="dashboard-page">
      <div style={{ marginBottom: '28px' }}>
        <h1>Langganan</h1>
        <p style={{ color: '#64748b', marginTop: '8px' }}>
          Kelola masa aktif website {business.name}.
        </p>
      </div>

      <section
        style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CreditCard size={22} />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
            Status langganan
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '24px' }}>
          <StatusIcon
            size={24}
            color={isActive ? '#16a34a' : isExpired ? '#dc2626' : '#d97706'}
          />
          <strong style={{ fontSize: '20px' }}>{statusLabel}</strong>
        </div>

        <p style={{ color: '#64748b', marginTop: '12px' }}>
          {isSuperAdmin
            ? 'Akun super admin mendapatkan akses gratis permanen.'
            : isActive
              ? 'Website kamu memiliki langganan aktif.'
              : 'Website publik belum dapat diakses. Kamu tetap bisa mengelola dan melihat pratinjau website.'}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              Harga langganan
            </div>
            <strong>{formatRupiah(10000)} / 30 hari</strong>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              Mulai berlangganan
            </div>
            <strong>
              {formatDate(subscription?.started_at)}
            </strong>
          </div>

          <div>
            <div style={{ color: '#64748b', fontSize: '13px' }}>
              Masa berlaku sampai
            </div>
            <strong>
              {isSuperAdmin
                ? 'Tidak terbatas'
                : formatDate(subscription?.expires_at)}
            </strong>
          </div>
        </div>

        {!isSuperAdmin && (
          <div style={{ marginTop: '24px' }}>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Pembayaran dilakukan melalui Midtrans. Langganan aktif otomatis
              setelah pembayaran berhasil diverifikasi.
            </p>
          </div>
        )}
      </section>

      {!isSuperAdmin && (
        <section
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
            Paket LinkUsaha
          </h2>

          <p style={{ color: '#64748b', marginTop: '8px' }}>
            Website usaha sendiri tanpa harus ribet.
          </p>

          <div style={{ fontSize: '30px', fontWeight: 800, marginTop: '20px' }}>
            Rp10.000
            <span style={{ fontSize: '14px', fontWeight: 400, color: '#64748b' }}>
              {' '} / 30 hari
            </span>
          </div>

          <ul style={{ paddingLeft: '20px', marginTop: '20px', lineHeight: 2 }}>
  <li>Website usaha dengan alamat sendiri di LinkUsaha</li>
  <li>Pengelolaan produk dan informasi bisnis</li>
  <li>Tampilan website sesuai tema pilihan</li>
  <li>Pemesanan langsung melalui WhatsApp</li>
  <li>Keranjang pesanan opsional</li>
</ul>

{isActive && (
  <p style={{
    color: '#16a34a',
    fontSize: '14px',
    marginTop: '20px',
    fontWeight: 600,
  }}>
    Langganan kamu masih aktif. Pembayaran berikutnya akan memperpanjang
    masa berlaku selama 30 hari setelah masa aktif saat ini berakhir.
  </p>
)}

<PaymentButton />

<p style={{ fontSize: '13px', color: '#64748b', marginTop: '16px' }}>
  Pembayaran aman melalui Midtrans. Website akan diperpanjang otomatis
  setelah pembayaran berhasil diverifikasi.
</p>
        </section>
      )}

      {!isSuperAdmin && (
        <section
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <CalendarDays size={21} />
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>
              Riwayat pembayaran
            </h2>
          </div>

          {transactions.length === 0 ? (
            <p style={{ color: '#64748b' }}>
              Belum ada riwayat pembayaran.
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 8px' }}>Tanggal</th>
                    <th style={{ padding: '12px 8px' }}>Nominal</th>
                    <th style={{ padding: '12px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => (
                    <tr key={transaction.order_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 8px' }}>
                        {formatDate(transaction.created_at)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {formatRupiah(transaction.amount)}
                      </td>
                      <td style={{ padding: '12px 8px' }}>
                        {transaction.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
