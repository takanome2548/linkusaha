'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export async function signIn(formData) {
  const supabase = await createClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!email || !password) redirect('/login?error=Lengkapi email dan kata sandi.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent('Email atau kata sandi tidak sesuai.')}`);
  redirect('/dashboard');
}
export async function signUp(formData) {
  const supabase = await createClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();
  if (!name || !email || password.length < 8) redirect('/register?error=Isi nama, email, dan kata sandi minimal 8 karakter.');
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name }, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback` } });
  if (error) redirect(`/register?error=${encodeURIComponent(error.message)}`);
  if (data.session) redirect('/dashboard');
  redirect('/login?message=Periksa email untuk konfirmasi akun sebelum masuk.');
}
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
export async function requestPasswordReset(formData) {
  const supabase = await createClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) redirect('/forgot-password?error=Masukkan email.');
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password` });
  if (error) redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  redirect('/forgot-password?message=Jika email terdaftar, tautan pemulihan akan dikirim.');
}
export async function updatePassword(formData) {
  const supabase = await createClient();
  const password = String(formData.get('password') || '');
  if (password.length < 8) redirect('/reset-password?error=Kata sandi minimal 8 karakter.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect('/login?message=Kata sandi berhasil diperbarui. Silakan masuk.');
}

export async function updateAccountEmail(formData) {
  const supabase = await createClient();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) redirect('/dashboard/profil?error=Format email tidak valid.');
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?next=/dashboard/profil` });
  if (error) redirect(`/dashboard/profil?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard/profil?message=Periksa email baru untuk menyelesaikan verifikasi perubahan email.');
}
export async function updateAccountName(formData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const fullName = String(formData.get('full_name') || '').trim();
  if (!fullName || fullName.length > 100) redirect('/dashboard/profil?error=Nama harus diisi dan maksimal 100 karakter.');
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
  if (error) redirect(`/dashboard/profil?error=${encodeURIComponent(error.message)}`);
  redirect('/dashboard/profil?message=Nama akun berhasil diperbarui.');
}
