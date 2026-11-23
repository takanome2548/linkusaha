import Link from 'next/link';
import { ActionButton } from '@/components/ui/action-button';
import { signUp } from '@/lib/actions/auth';
import { AuthMessage } from '@/components/auth/auth-message';
export const metadata = { title: 'Daftar' };
export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  return <main className="auth-wrap"><section className="panel auth-card"><Link href="/" className="brand">link<span>usaha</span></Link><p className="eyebrow" style={{marginTop:28}}>Mulai tanpa ribet</p><h1 style={{fontSize:30,margin:'8px 0'}}>Buat akun LinkUsaha</h1><p className="muted">Satu akun untuk satu website usaha milikmu.</p><div style={{margin:'18px 0'}}><AuthMessage searchParams={params}/></div><form action={signUp} style={{display:'grid',gap:16}}><div className="field"><label htmlFor="name">Nama lengkap</label><input id="name" name="name" required autoComplete="name" placeholder="Nama kamu"/></div><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com"/></div><div className="field"><label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" minLength="8" required autoComplete="new-password" placeholder="Minimal 8 karakter"/></div><ActionButton className="btn" type="submit">Buat akun</ActionButton></form><p className="muted" style={{textAlign:'center',fontSize:14,marginTop:22}}>Sudah punya akun? <Link href="/login" style={{color:'var(--green)',fontWeight:700}}>Masuk</Link></p></section></main>;
}
