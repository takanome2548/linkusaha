import Link from 'next/link';
import { ActionButton } from '@/components/ui/action-button';
import { requestPasswordReset } from '@/lib/actions/auth';
import { AuthMessage } from '@/components/auth/auth-message';
export const metadata = { title: 'Lupa kata sandi' };
export default async function ForgotPasswordPage({ searchParams }) { const params = await searchParams; return <main className="auth-wrap"><section className="panel auth-card"><Link href="/" className="brand">link<span>usaha</span></Link><h1 style={{fontSize:28,marginTop:28}}>Pulihkan kata sandi</h1><p className="muted">Masukkan email akunmu. Kami akan mengirim tautan pemulihan jika email terdaftar.</p><div style={{margin:'18px 0'}}><AuthMessage searchParams={params}/></div><form action={requestPasswordReset} style={{display:'grid',gap:16}}><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required/></div><ActionButton className="btn" type="submit">Kirim tautan pemulihan</ActionButton></form><p style={{marginTop:20}}><Link href="/login">Kembali ke masuk</Link></p></section></main>; }
