
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StorefrontClient } from '@/components/storefront/storefront-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pratinjau Website - LinkUsaha',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default async function PreviewPage() {
  const supabase = await createClient();

  // Wajib login.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Hanya mengambil bisnis milik pengguna yang login.
  // Tidak menggunakan view publik karena preview harus
  // tetap berfungsi untuk bisnis draft dan belum berlangganan.
  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (businessError) {
    throw new Error('Gagal memuat data bisnis.');
  }

  if (!business) {
    notFound();
  }

  const [
    { data: products, error: productsError },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('business_id', business.id)
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at'),

    supabase
      .from('business_settings')
      .select('cart_enabled')
      .eq('business_id', business.id)
      .maybeSingle(),
  ]);

  if (productsError) {
    throw new Error('Gagal memuat produk bisnis.');
  }

  const publicUrl = (path) =>
    path
      ? supabase.storage
          .from('business-assets')
          .getPublicUrl(path).data.publicUrl
      : null;

  const safeBusiness = {
    ...business,
    cover_url: publicUrl(business.cover_path),
    logo_url: publicUrl(business.logo_path),
  };

  const safeProducts = (products || []).map((product) => ({
    ...product,
    image_url: publicUrl(product.image_path),
  }));

  return (
    <StorefrontClient
      business={safeBusiness}
      products={safeProducts}
      cartEnabled={Boolean(settings?.cart_enabled)}
      previewMode={true}
    />
  );
}
