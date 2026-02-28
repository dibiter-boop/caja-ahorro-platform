export default function AplicarBatchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Aplicar batch</h1>
      <p className="text-slate-600">Al aplicar: LOAN_PAYMENT PENDING → APPLIED, y actualización de estatus del batch.</p>
      <p className="text-sm text-slate-500">API disponible: POST /api/batches/:batchId/apply.</p>
    </div>
  );
}
