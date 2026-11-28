
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSnapTransaction } from '@/lib/midtrans';
import { randomUUID } from 'node:crypto';

export const dynamic = 'force-dynamic';

const SUBSCRIPTION_PRICE = 10000;

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}

export async function POST() {
  let admin;
  let orderId;

  try {
    // 1. Validasi session pengguna.
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse(
        { error: 'Silakan login terlebih dahulu.' },
        401
      );
    }

    // 2. Pastikan pengguna memiliki bisnis.
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, name, owner_id')
      .eq('owner_id', user.id)
      .maybeSingle();

    if (businessError) {
      console.error('Business lookup error:', businessError);

      return jsonResponse(
        { error: 'Gagal memeriksa data bisnis.' },
        500
      );
    }

    if (!business) {
      return jsonResponse(
        { error: 'Bisnis tidak ditemukan.' },
        404
      );
    }

    admin = createAdminClient();

    // 3. Buat order ID unik.
    const newOrderId =
      `LU-${business.id.slice(0, 8)}-${randomUUID().slice(0, 8)}`;

    // 4. Buat atau gunakan kembali payment intent secara atomik.
    const { data: intentData, error: intentError } = await admin.rpc(
      'create_payment_intent',
      {
        p_business_id: business.id,
        p_user_id: user.id,
        p_order_id: newOrderId,
      }
    );

    if (intentError) {
      console.error('Payment intent error:', intentError);

      return jsonResponse(
        { error: 'Gagal menyiapkan transaksi pembayaran.' },
        500
      );
    }

    const intent = intentData?.[0];

    if (!intent?.order_id) {
      return jsonResponse(
        { error: 'Data transaksi tidak valid.' },
        500
      );
    }

    orderId = intent.order_id;

    // 5. Gunakan URL pembayaran yang sudah tersedia.
    if (intent.redirect_url) {
      return jsonResponse({
        success: true,
        order_id: orderId,
        redirect_url: intent.redirect_url,
        reused: true,
      });
    }

    // Transaksi sebelumnya sedang diproses.
    if (intent.reused) {
      return jsonResponse(
        {
          error: 'Transaksi sebelumnya sedang diproses. Coba kembali beberapa saat lagi.',
        },
        409
      );
    }

    // 6. Batasi pembuatan transaksi Snap.
    const {
      data: allowed,
      error: rateLimitError,
    } = await admin.rpc('consume_api_rate_limit', {
      p_user_id: user.id,
      p_endpoint: 'create-subscription-payment',
      p_max_requests: 5,
      p_window_seconds: 600,
    });

    if (rateLimitError) {
      console.error('Payment rate limit error:', rateLimitError);

      return jsonResponse(
        {
          error: 'Tidak dapat memproses permintaan pembayaran saat ini.',
        },
        500
      );
    }

    if (allowed !== true) {
      return jsonResponse(
        {
          error: 'Terlalu banyak percobaan pembayaran. Silakan coba lagi dalam beberapa menit.',
        },
        429
      );
    }

    // 7. Siapkan URL aplikasi.
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    ).replace(/\/+$/, '');

    // 8. Buat transaksi Midtrans Snap.
    const snapResult = await createSnapTransaction({
      transaction_details: {
        order_id: orderId,
        gross_amount: SUBSCRIPTION_PRICE,
      },
      item_details: [
        {
          id: 'linkusaha-monthly',
          price: SUBSCRIPTION_PRICE,
          quantity: 1,
          name: 'Langganan LinkUsaha 30 Hari',
        },
      ],
      customer_details: {
        email: user.email,
        first_name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          'Pelanggan LinkUsaha',
      },
      callbacks: {
        finish: `${appUrl}/dashboard/langganan?payment=finish`,
      },
    });

    // 9. Pastikan respons Midtrans valid.
    if (!snapResult?.token || !snapResult?.redirect_url) {
      throw new Error('Respons Midtrans tidak lengkap.');
    }

    // 10. Simpan token dan URL pembayaran.
    const { error: updateError } = await admin
      .from('payment_transactions')
      .update({
        snap_token: snapResult.token,
        redirect_url: snapResult.redirect_url,
      })
      .eq('order_id', orderId)
      .eq('status', 'pending')
      .is('paid_at', null);

    if (updateError) {
      console.error('Payment update error:', updateError);

      return jsonResponse(
        {
          error: 'Transaksi dibuat, tetapi gagal menyimpan URL pembayaran.',
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      order_id: orderId,
      snap_token: snapResult.token,
      redirect_url: snapResult.redirect_url,
      reused: false,
    });
  } catch (error) {
    console.error('Create payment error:', error);

    // 11. Tandai transaksi gagal jika pembuatan Snap gagal.
    if (admin && orderId) {
      const { error: cleanupError } = await admin
        .from('payment_transactions')
        .update({
          status: 'failure',
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId)
        .eq('status', 'pending')
        .is('paid_at', null);

      if (cleanupError) {
        console.error('Payment cleanup error:', cleanupError);
      }
    }

    return jsonResponse(
      {
        error: 'Tidak dapat membuat pembayaran. Silakan coba kembali.',
      },
      500
    );
  }
}
