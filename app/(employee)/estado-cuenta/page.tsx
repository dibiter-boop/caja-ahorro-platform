import { Table } from '@/components/ui/table';
import { mockMovements } from '@/lib/data/mock';

export default function EstadoCuentaPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Estado de cuenta</h1>
      <p className="text-sm text-slate-600">Filtrado por bucket/fecha/tipo disponible en iteración UI siguiente.</p>
      <Table>
        <thead>
          <tr className="border-b text-left">
            <th className="py-2">Fecha</th>
            <th>Bucket</th>
            <th>Tipo</th>
            <th>Importe</th>
            <th>Estatus</th>
          </tr>
        </thead>
        <tbody>
          {mockMovements.map((row) => (
            <tr key={`${row.fecha}-${row.bucket}-${row.tipo}`} className="border-b">
              <td className="py-2">{row.fecha}</td>
              <td>{row.bucket}</td>
              <td>{row.tipo}</td>
              <td>{row.importe.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
              <td>{row.estatus}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
