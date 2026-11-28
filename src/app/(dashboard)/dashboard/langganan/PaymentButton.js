
'use client';

import { useState } from 'react';
import { CreditCard, LoaderCircle } from 'lucide-react';

export default function PaymentButton({ disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handlePayment() {
    if (loading || disabled) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/subscriptions/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || 'Gagal membuat transaksi pembayaran.'
        );
      }

      if (!result.redirect_url) {
        throw new Error('URL pembayaran tidak ditemukan.');
      }

      window.location.assign(result.redirect_url);
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan. Silakan coba kembali.');
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading || disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '13px 22px',
          borderRadius: '10px',
          border: 'none',
          background: loading || disabled ? '#94a3b8' : '#2563eb',
          color: '#fff',
          fontWeight: 600,
          fontSize: '14px',
          cursor: loading || disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? (
          <LoaderCircle size={18} className="animate-spin" />
        ) : (
          <CreditCard size={18} />
        )}

        {loading ? 'Menyiapkan pembayaran...' : 'Bayar Sekarang'}
      </button>

      {error && (
        <p
          role="alert"
          style={{
            color: '#dc2626',
            fontSize: '13px',
            marginTop: '12px',
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
