
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMidtransTransactionStatus } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

const EXPECTED_AMOUNT = 10000;

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
    },
  });
}

export async function POST(request) {
  try {
    // 1. Validasi pengguna.
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

    // 2. Validasi input.
    let body;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(
        { error: 'Request body tidak valid.' },
        400
      );
    }

    const orderId = body?.order_id;

    if (
      typeof orderId !== 'string' ||
      !/^LU-[a-f0-9]{8}-[a-f0-9]{8}$/i.test(orderId)
    ) {
      return jsonResponse(
        { error: 'Order ID tidak valid.' },
        400
      );
    }

    const admin = createAdminClient();

    // 3. Pastikan transaksi milik bisnis pengguna.
    const { data: payment, error: paymentError } = await admin
      .from('payment_transactions')
      .select(`
        id,
        order_id,
        business_id,
        user_id,
        amount,
        currency,
        status,
        paid_at,
        businesses!inner (
          owner_id
        )
      `)
      .eq('order_id', orderId)
      .eq('user_id', user.id)
      .eq('businesses.owner_id', user.id)
      .maybeSingle();

    if (paymentError) {
      console.error('Reconcile payment lookup error:', paymentError);

      return jsonResponse(
        { error: 'Gagal memeriksa transaksi pembayaran.' },
        500
      );
    }

    if (!payment) {
      return jsonResponse(
        { error: 'Transaksi tidak ditemukan atau bukan milik Anda.' },
        404
      );
    }

    // 4. Jika sudah lunas, jangan proses ulang.
    if (payment.paid_at) {
      return jsonResponse({
        success: true,
        already_paid: true,
        order_id: orderId,
        message: 'Transaksi sudah tercatat lunas.',
      });
    }

    if (
      payment.amount !== EXPECTED_AMOUNT ||
      payment.currency !== 'IDR'
    ) {
      return jsonResponse(
        { error: 'Nominal atau mata uang transaksi tidak valid.' },
        400
      );
    }

    // 5. Ambil status langsung dari Midtrans.
    const midtrans = await getMidtransTransactionStatus(orderId);

    // 6. Validasi data Midtrans.
    if (
      midtrans.order_id !== orderId ||
      Number(midtrans.gross_amount) !== EXPECTED_AMOUNT ||
      midtrans.currency !== 'IDR'
    ) {
      console.error('Midtrans reconciliation mismatch:', {
        order_id: orderId,
        midtrans_order_id: midtrans.order_id,
        gross_amount: midtrans.gross_amount,
        currency: midtrans.currency,
      });

      return jsonResponse(
        { error: 'Data transaksi Midtrans tidak cocok.' },
        409
      );
    }

    // 7. Hanya capture/settlement yang dapat mengaktifkan langganan.
    if (
      !['capture', 'settlement'].includes(
        midtrans.transaction_status
      )
    ) {
      return jsonResponse(
        {
          success: false,
          order_id: orderId,
          transaction_status: midtrans.transaction_status,
          message: 'Pembayaran belum berstatus berhasil.',
        },
        409
      );
    }

    // 8. Validasi status fraud.
    if (
      midtrans.transaction_status === 'capture' &&
      midtrans.fraud_status !== 'accept'
    ) {
      return jsonResponse(
        { error: 'Pembayaran belum lolos pemeriksaan fraud.' },
        409
      );
    }

    if (
      midtrans.transaction_status === 'settlement' &&
      midtrans.fraud_status &&
      midtrans.fraud_status !== 'accept'
    ) {
      return jsonResponse(
        { error: 'Status fraud pembayaran tidak valid.' },
        409
      );
    }

    if (
      !midtrans.transaction_id ||
      !midtrans.status_code ||
      String(midtrans.status_code) !== '200'
    ) {
      return jsonResponse(
        { error: 'Data konfirmasi pembayaran Midtrans tidak lengkap.' },
        409
      );
    }

    // 9. Proses melalui RPC pembayaran yang sudah ada.
    const { data: processed, error: processError } = await admin.rpc(
      'process_midtrans_payment',
      {
        p_order_id: orderId,
        p_status: midtrans.transaction_status,
        p_payload: midtrans,
        p_midtrans_transaction_id: midtrans.transaction_id,
        p_payment_type: midtrans.payment_type || null,
        p_fraud_status: midtrans.fraud_status || null,
      }
    );

    if (processError) {
      console.error('Payment reconciliation RPC error:', {
        order_id: orderId,
        message: processError.message,
        code: processError.code,
      });

      return jsonResponse(
        { error: 'Gagal memproses konfirmasi pembayaran.' },
        500
      );
    }

    return jsonResponse({
      success: true,
      order_id: orderId,
      transaction_status: midtrans.transaction_status,
      processed,
      message: processed
        ? 'Pembayaran berhasil direkonsiliasi.'
        : 'Transaksi sebelumnya sudah diproses.',
    });
  } catch (error) {
    console.error('Payment reconciliation error:', error);

    return jsonResponse(
      { error: 'Terjadi kesalahan saat memeriksa pembayaran.' },
      500
    );
  }
}
