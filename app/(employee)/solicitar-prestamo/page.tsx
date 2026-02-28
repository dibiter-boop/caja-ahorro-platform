import { simulateLoan } from '@/lib/domain/loan';

export default function SolicitarPrestamoPage() {
  const simulation = simulateLoan({
    amount: 25000,
    termMonths: 12,
    annualRate: 0.13,
    annualAdminFee: 0.01,
    frequencyCode: '003'
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Solicitar préstamo</h1>
      <p className="text-slate-600">Simulación inicial según parámetros vigentes (rate/version lock al aprobar).</p>
      <div className="rounded border bg-white p-4">
        <p>Periodos estimados: {simulation.periods}</p>
        <p>Pago estimado por periodo: ${simulation.paymentEstimate.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <p>Interés total: ${simulation.totalInterest.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        <p>Admin fee total: ${simulation.totalAdminFee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
      </div>
      <p className="text-sm text-slate-500">El submit real se realiza vía API /api/loans/request.</p>
    </div>
  );
}
