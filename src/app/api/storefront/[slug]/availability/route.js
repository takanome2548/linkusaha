import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request, { params }) {
  const { slug } = await params;
  const ids = (new URL(request.url).searchParams.get('ids') || '').split(',').filter(Boolean).slice(0,30);
  if (!ids.length || ids.some(id => !/^[0-9a-f-]{36}$/i.test(id))) return NextResponse.json({ error:'Daftar produk tidak valid.' },{status:400});
  const supabase = await createClient();
  const { data: business } = await supabase.from('business_storefronts').select('id').eq('slug',slug).maybeSingle();
  if (!business) return NextResponse.json({ error:'Website usaha tidak ditemukan.' },{status:404});
  const { data: products, error } = await supabase.from('products').select('id,name,price,is_active,is_available').eq('business_id',business.id).in('id',ids);
  if (error) return NextResponse.json({ error:'Tidak dapat memeriksa produk saat ini.' },{status:503});
  return NextResponse.json({ products:products || [] },{headers:{'Cache-Control':'no-store'}});
}
