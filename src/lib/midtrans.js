
const isProduction =
  process.env.MIDTRANS_IS_PRODUCTION === 'true';

const MIDTRANS_API_URL = isProduction
  ? 'https://app.midtrans.com'
  : 'https://app.sandbox.midtrans.com';

// GET Status API menggunakan domain api, bukan app.
const MIDTRANS_STATUS_API_URL = isProduction
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

const REQUEST_TIMEOUT = 15000;

function getMidtransAuthorization() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  if (!serverKey) {
    throw new Error('MIDTRANS_SERVER_KEY belum dikonfigurasi.');
  }

  return `Basic ${Buffer
    .from(`${serverKey}:`)
    .toString('base64')}`;
}

export async function createSnapTransaction(payload) {
  const authorization = getMidtransAuthorization();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      `${MIDTRANS_API_URL}/snap/v1/transactions`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        'Respons Midtrans tidak valid atau bukan JSON.'
      );
    }

    if (!response.ok) {
      console.error('Midtrans Snap error:', {
        status: response.status,
        errors: result?.error_messages,
      });

      throw new Error(
        Array.isArray(result?.error_messages)
          ? result.error_messages.join(', ')
          : 'Gagal membuat transaksi pembayaran Midtrans.'
      );
    }

    if (
      typeof result?.token !== 'string' ||
      !result.token ||
      typeof result?.redirect_url !== 'string' ||
      !result.redirect_url
    ) {
      throw new Error(
        'Respons Midtrans tidak memiliki token atau redirect URL.'
      );
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request ke Midtrans mengalami timeout.');
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getMidtransTransactionStatus(orderId) {
  if (
    typeof orderId !== 'string' ||
    !orderId.trim() ||
    orderId.length > 100
  ) {
    throw new Error('Order ID Midtrans tidak valid.');
  }

  const authorization = getMidtransAuthorization();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(
      `${MIDTRANS_STATUS_API_URL}/v2/${encodeURIComponent(orderId)}/status`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    );

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        'Respons GET Status Midtrans bukan JSON yang valid.'
      );
    }

    if (!response.ok) {
      console.error('Midtrans GET Status error:', {
        status: response.status,
        order_id: orderId,
        status_message: result?.status_message,
      });

      throw new Error(
        result?.status_message ||
        `Gagal mengambil status transaksi Midtrans (${response.status}).`
      );
    }

    if (result?.order_id !== orderId) {
      throw new Error(
        'Order ID dari respons Midtrans tidak cocok.'
      );
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Request GET Status Midtrans mengalami timeout.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
