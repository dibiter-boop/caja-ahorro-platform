import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Caja de Ahorro Platform',
  description: 'Herramienta intermedia para gestión de caja de ahorro'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <main className="min-h-screen p-6">{children}</main>
      </body>
    </html>
  );
}
