import { Table } from '@/components/ui/table';

const batches = [
  { id: 'BAT-2026-002-01', razon: 'RS01', frec: '003', fecha: '2026-02-15', estatus: 'EXPORTED' },
  { id: 'BAT-2026-004-01', razon: 'RS02', frec: '004', fecha: '2026-02-28', estatus: 'GENERATED' }
];

export default function BatchesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Batches de nómina</h1>
      <p className="text-slate-600">Layout ANSA NS final: 21 columnas fijas, UTF-8, Fecha YYYY-MM-DD, Importe con 2 decimales, TAB por default configurable.</p>
      <p className="text-sm text-slate-500">APIs: POST /api/batches/:batchId/export y POST /api/batches/:batchId/results/import.</p>
      <Table>
        <thead><tr className="border-b text-left"><th className="py-2">Batch</th><th>Razón</th><th>Frec</th><th>Fecha pago</th><th>Estatus</th></tr></thead>
        <tbody>{batches.map((b) => <tr className="border-b" key={b.id}><td className="py-2">{b.id}</td><td>{b.razon}</td><td>{b.frec}</td><td>{b.fecha}</td><td>{b.estatus}</td></tr>)}</tbody>
      </Table>
    </div>
  );
}
