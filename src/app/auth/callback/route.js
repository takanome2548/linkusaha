import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') || '/dashboard';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard';
  if (code) { const supabase = await createClient(); const { error } = await supabase.auth.exchangeCodeForSession(code); if (error) return NextResponse.redirect(new URL('/login?error=Link%20verifikasi%20tidak%20valid%20atau%20sudah%20kedaluwarsa.', request.url)); }
  return NextResponse.redirect(new URL(next, request.url));
}
