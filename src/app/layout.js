import { Provider } from '@/components/ui/provider';
import './globals.css';
export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'LinkUsaha — Website usaha sendiri, tanpa harus ribet', template: '%s | LinkUsaha' },
  description: 'Buat website usaha sendiri dengan mudah. Tampilkan produk, lokasi, dan terima pesanan langsung melalui WhatsApp.',
  applicationName: 'LinkUsaha',
};
export default function RootLayout({ children }) {
  return <html lang="id"><body><Provider>{children}</Provider></body></html>;
}
