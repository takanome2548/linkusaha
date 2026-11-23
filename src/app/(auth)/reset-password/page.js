import Link from 'next/link';
import { ActionButton } from '@/components/ui/action-button';
import { updatePassword } from '@/lib/actions/auth';
import { AuthMessage } from '@/components/auth/auth-message';
export const metadata = { title: 'Atur kata sandi baru' };
export default async function ResetPasswordPage({ searchParams }) { const params = await searchParams; return <main className="auth-wrap"><section className="panel auth-card"><Link href="/" className="brand">link<span>usaha</span></Link><h1 style={{fontSize:28,marginTop:28}}>Buat kata sandi baru</h1><div style={{margin:'18px 0'}}><AuthMessage searchParams={params}/></div><form action={updatePassword} style={{display:'grid',gap:16}}><div className="field"><label htmlFor="password">Kata sandi baru</label><input id="password" name="password" type="password" minLength="8" required autoComplete="new-password"/></div><ActionButton className="btn" type="submit">Simpan kata sandi</ActionButton></form></section></main>; }
