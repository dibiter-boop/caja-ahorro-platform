import { Card } from '@/components/ui/card';

export default function ReportesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reportes RH (fase 4)</h1>
      <p className="text-sm text-slate-600">Este módulo queda después de préstamo E2E, batches/export e import center según prioridad definida.</p>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>Saldos totales por bucket (scope por razón social)</Card>
        <Card>Préstamos activos y antigüedad</Card>
        <Card>Morosidad por periodo</Card>
        <Card>Movimientos agregados exportables CSV</Card>
      </div>
    </div>
  );
}
