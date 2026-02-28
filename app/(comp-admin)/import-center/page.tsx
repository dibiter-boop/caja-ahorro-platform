export default function ImportCenterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Import Center</h1>
      <ul className="list-disc pl-6 text-slate-700">
        <li>Empleados + 21 columnas SAP con validación de frecuencia/sueldo/duplicados</li>
        <li>Calendario de pago por razón social + frecuencia + cutoff</li>
        <li>Saldos iniciales por bucket</li>
        <li>Resultados de nómina (rechazos a CANCELLED para reintento)</li>
      </ul>
      <p className="text-sm text-slate-600">APIs: /api/import/employees, /api/import/pay-calendar, /api/import/opening-balances.</p>
    </div>
  );
}
