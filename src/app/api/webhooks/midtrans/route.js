
import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const EXPECTED_AMOUNT = 10000;

const ALLOWED_STATUSES = [
  'pending',
  'authorize',
  'deny',
  'cancel',
  'expire',
  'failure',
  'refund',
  'partial_refund',
  'settlement',
  'capture',
];

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}

function isNonEmptyString(value, maxLength = 255) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maxLength
  );
}

function validateNotification(notification) {
  if (
    !notification ||
    typeof notification !== 'object' ||
    Array.isArray(notification)
  ) {
    return false;
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    transaction_id,
    payment_type,
    fraud_status,
  } = notification;

  if (
    !isNonEmptyString(order_id, 100) ||
    typeof status_code !== 'string' ||
    !/^\d{1,5}$/.test(status_code) ||
    typeof gross_amount !== 'string' ||
    !/^\d+(\.\d{1,2})?$/.test(gross_amount) ||
    !isNonEmptyString(signature_key, 128) ||
    !/^[a-fA-F0-9]{128}$/.test(signature_key) ||
    !isNonEmptyString(transaction_status, 50) ||
    !ALLOWED_STATUSES.includes(transaction_status)
  ) {
    return false;
  }

  if (
    transaction_id !== undefined &&
    transaction_id !== null &&
    !isNonEmptyString(transaction_id, 255)
  ) {
    return false;
  }

  if (
    payment_type !== undefined &&
    payment_type !== null &&
    !isNonEmptyString(payment_type, 100)
  ) {
    return false;
  }

  if (
    fraud_status !== undefined &&
    fraud_status !== null &&
    !isNonEmptyString(fraud_status, 50)
  ) {
    return false;
  }

  return true;
}

function verifySignature(notification) {
  const signatureKey = process.env.MIDTRANS_SIGNATURE_KEY;

  if (!signatureKey) {
    throw new Error(
      'MIDTRANS_SIGNATURE_KEY belum dikonfigurasi.'
    );
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
  } = notification;

  const expectedSignature = createHash('sha512')
    .update(
      `${order_id}${status_code}${gross_amount}${signatureKey}`
    )
    .digest();

  const receivedSignature = Buffer.from(
    signature_key,
    'hex'
  );

  return (
    expectedSignature.length === receivedSignature.length &&
    timingSafeEqual(expectedSignature, receivedSignature)
  );
}

export async function POST(request) {
  try {
    let notification;

    // 1. Parse JSON.
    try {
      notification = await request.json();
    } catch {
      return jsonResponse(
        { error: 'Format JSON tidak valid.' },
        400
      );
    }

    // 2. Validasi struktur payload.
    if (!validateNotification(notification)) {
      return jsonResponse(
        {
          error:
            'Format notifikasi tidak valid atau tidak lengkap.',
        },
        400
      );
    }

    // 3. Verifikasi signature Midtrans.
    if (!verifySignature(notification)) {
      console.warn(
        'Webhook Midtrans: signature tidak valid.'
      );

      return jsonResponse(
        { error: 'Signature tidak valid.' },
        401
      );
    }

    const {
      order_id,
      transaction_status,
      status_code,
      gross_amount,
      transaction_id,
      payment_type,
      fraud_status,
    } = notification;

    // 4. Ambil transaksi.
    const admin = createAdminClient();

    const { data: payment, error: paymentError } = await admin
      .from('payment_transactions')
      .select(
        'id, business_id, user_id, amount, currency, paid_at'
      )
      .eq('order_id', order_id)
      .maybeSingle();

    if (paymentError) {
      console.error(
        'Webhook payment lookup:',
        paymentError
      );

      return jsonResponse(
        { error: 'Gagal memeriksa transaksi.' },
        500
      );
    }

    if (!payment) {
      console.warn(
        'Webhook Midtrans: transaksi tidak ditemukan.',
        { order_id }
      );

      return jsonResponse({
        success: true,
        ignored: true,
        message: 'Transaksi tidak ditemukan.',
      });
    }

    // 5. Validasi nominal dan mata uang.
    const receivedAmount = Number(gross_amount);

    if (
      !Number.isFinite(receivedAmount) ||
      receivedAmount !== payment.amount ||
      payment.amount !== EXPECTED_AMOUNT ||
      payment.currency !== 'IDR'
    ) {
      console.error(
        'Webhook Midtrans: nominal tidak sesuai.',
        {
          order_id,
          gross_amount,
          expected_amount: payment.amount,
        }
      );

      return jsonResponse(
        { error: 'Nominal pembayaran tidak sesuai.' },
        400
      );
    }

    // 6. Proses refund penuh dan sebagian.
    if (
      transaction_status === 'refund' ||
      transaction_status === 'partial_refund'
    ) {
      if (status_code !== '200') {
        return jsonResponse(
          { error: 'Status kode refund tidak valid.' },
          400
        );
      }

      const {
        data: refundResult,
        error: refundError,
      } = await admin.rpc('process_midtrans_refund', {
        p_order_id: order_id,
        p_status: transaction_status,
        p_midtrans_transaction_id: transaction_id || null,
        p_payment_type: payment_type || null,
        p_fraud_status: fraud_status || null,
        p_payload: notification,
      });

      if (refundError) {
        console.error(
          'Webhook process refund:',
          refundError
        );

        return jsonResponse(
          { error: 'Gagal memproses refund.' },
          500
        );
      }

      return jsonResponse({
        success: true,
        refund: refundResult,
      });
    }

    // 7. Proses pembayaran berhasil.
    if (
      transaction_status === 'settlement' ||
      transaction_status === 'capture'
    ) {
      if (status_code !== '200') {
        return jsonResponse(
          { error: 'Status kode pembayaran tidak valid.' },
          400
        );
      }

      if (
        transaction_status === 'capture' &&
        fraud_status?.toLowerCase() !== 'accept'
      ) {
        return jsonResponse({
          success: true,
          message: 'Pembayaran capture belum diterima.',
        });
      }

      if (
        transaction_status === 'settlement' &&
        fraud_status &&
        fraud_status.toLowerCase() !== 'accept'
      ) {
        return jsonResponse({
          success: true,
          message: 'Status fraud belum diterima.',
        });
      }

      // Pemeriksaan awal idempotensi.
      // RPC tetap melakukan pemeriksaan ulang dengan row lock.
      if (payment.paid_at) {
        return jsonResponse({
          success: true,
          processed: false,
          message: 'Pembayaran sudah pernah diproses.',
        });
      }

      const {
        data: processed,
        error: processError,
      } = await admin.rpc('process_midtrans_payment', {
        p_order_id: order_id,
        p_status: transaction_status,
        p_payload: notification,
        p_midtrans_transaction_id: transaction_id || null,
        p_payment_type: payment_type || null,
        p_fraud_status: fraud_status || null,
      });

      if (processError) {
        console.error(
          'Webhook process payment:',
          processError
        );

        return jsonResponse(
          { error: 'Gagal memproses pembayaran.' },
          500
        );
      }

      return jsonResponse({
        success: true,
        processed: Boolean(processed),
      });
    }

    // 8. Simpan status transaksi non-berhasil melalui RPC atomik.
    const {
      data: statusUpdated,
      error: statusError,
    } = await admin.rpc(
      'process_midtrans_non_success_status',
      {
        p_order_id: order_id,
        p_status: transaction_status,
        p_midtrans_transaction_id: transaction_id || null,
        p_payment_type: payment_type || null,
        p_fraud_status: fraud_status || null,
        p_payload: notification,
      }
    );

    if (statusError) {
      console.error(
        'Webhook non-success status:',
        statusError
      );

      return jsonResponse(
        {
          error: 'Gagal memperbarui status transaksi.',
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      processed: Boolean(statusUpdated),
      message: statusUpdated
        ? 'Status transaksi berhasil diperbarui.'
        : 'Notifikasi lama atau status transaksi sudah diproses.',
    });
  } catch (error) {
    console.error(
      'Midtrans webhook error:',
      error
    );

    return jsonResponse(
      {
        error:
          'Terjadi kesalahan saat memproses webhook.',
      },
      500
    );
  }
}
