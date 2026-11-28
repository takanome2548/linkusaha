
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const MAX_PRODUCT_IDS = 30;
const MAX_IDS_LENGTH = 1200;

function jsonResponse(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Cookie',
    },
  });
}

export async function GET(request, { params }) {
  try {
    const { slug } = await params;

    // Validasi slug
    if (
      !slug ||
      typeof slug !== 'string' ||
      slug.length > 100 ||
      !SLUG_REGEX.test(slug)
    ) {
      return jsonResponse(
        { error: 'Website usaha tidak ditemukan.' },
        404
      );
    }

    // Validasi parameter ID produk
    const url = new URL(request.url);
    const rawIds = url.searchParams.get('ids') || '';

    if (
      !rawIds ||
      rawIds.length > MAX_IDS_LENGTH
    ) {
      return jsonResponse(
        { error: 'Daftar produk tidak valid.' },
        400
      );
    }

    // Hapus ID duplikat
    const ids = [
      ...new Set(rawIds.split(',').filter(Boolean)),
    ];

    // Validasi jumlah dan format UUID
    if (
      !ids.length ||
      ids.length > MAX_PRODUCT_IDS ||
      ids.some((id) => !UUID_REGEX.test(id))
    ) {
      return jsonResponse(
        { error: 'Daftar produk tidak valid.' },
        400
      );
    }

    const supabase = await createClient();

    // Pastikan storefront tersedia untuk publik
    const { data: business, error: businessError } =
      await supabase
        .from('business_storefronts')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

    if (businessError) {
      console.error(
        'Storefront availability business error:',
        businessError
      );

      return jsonResponse(
        { error: 'Tidak dapat memeriksa website saat ini.' },
        503
      );
    }

    if (!business) {
      return jsonResponse(
        { error: 'Website usaha tidak ditemukan.' },
        404
      );
    }

    // Ambil produk hanya dari bisnis yang sesuai
    // Produk tidak aktif tidak dikembalikan
    const { data: products, error: productError } =
      await supabase
        .from('products')
        .select('id,name,price,is_active,is_available')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .in('id', ids);

    if (productError) {
      console.error(
        'Storefront availability products error:',
        productError
      );

      return jsonResponse(
        { error: 'Tidak dapat memeriksa produk saat ini.' },
        503
      );
    }

    return jsonResponse({
      products: products || [],
    });
  } catch (error) {
    console.error('Storefront availability error:', error);

    return jsonResponse(
      { error: 'Terjadi kesalahan pada server.' },
      500
    );
  }
}
