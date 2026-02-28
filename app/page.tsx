import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'EMPLOYEE Dashboard' },
  { href: '/estado-cuenta', label: 'EMPLOYEE Estado de cuenta' },
  { href: '/solicitar-prestamo', label: 'EMPLOYEE Solicitar préstamo' },
  { href: '/bandeja', label: 'COMP_APPROVER Bandeja' },
  { href: '/catalogos', label: 'COMP_ADMIN Catálogos' },
  { href: '/import-center', label: 'COMP_ADMIN Import Center' },
  { href: '/batches', label: 'COMP_ADMIN Batches' },
  { href: '/reportes', label: 'HR_REPORTS Reportes' }
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-3xl font-bold">Caja de Ahorro Platform</h1>
      <p className="text-slate-600">
        Herramienta intermedia para préstamos, subledger, aprobaciones centralizadas y generación de layout SAP ANSA NS.
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {links.map((item) => (
          <Link className="rounded-lg border bg-white p-3 hover:bg-slate-100" key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
