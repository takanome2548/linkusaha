import Link from 'next/link';
import { ActionButton } from '@/components/ui/action-button';
import { signIn } from '@/lib/actions/auth';
import { AuthMessage } from '@/components/auth/auth-message';
export const metadata = { title: 'Masuk' };
export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  return <main className="auth-wrap"><section className="panel auth-card"><Link href="/" className="brand">link<span>usaha</span></Link><p className="eyebrow" style={{marginTop:28}}>Selamat datang kembali</p><h1 style={{fontSize:30,margin:'8px 0'}}>Masuk ke akun</h1><p className="muted">Kelola website usaha kamu dari satu tempat.</p><div style={{margin:'18px 0'}}><AuthMessage searchParams={params}/></div><form action={signIn} style={{display:'grid',gap:16}}><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" placeholder="nama@email.com"/></div><div className="field"><label htmlFor="password">Kata sandi</label><input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Masukkan kata sandi"/></div><div style={{textAlign:'right',fontSize:13}}><Link href="/forgot-password" style={{color:'var(--green)',fontWeight:700}}>Lupa kata sandi?</Link></div><ActionButton className="btn" type="submit">Masuk</ActionButton></form><p className="muted" style={{textAlign:'center',fontSize:14,marginTop:22}}>Belum punya akun? <Link href="/register" style={{color:'var(--green)',fontWeight:700}}>Daftar gratis</Link></p></section></main>;
}
