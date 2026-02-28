export default function AutopagoPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Autopago desde SAV_EXT</h1>
      <p className="text-slate-600">Endpoint: POST /api/transfers/autopay-sav-ext valida saldo y crea doble asiento con transfer_id.</p>
      <div className="rounded border bg-white p-4 text-sm text-slate-700">
        Reglas:
        <ul className="list-disc pl-5">
          <li>SAV_EXT disponible ≥ monto</li>
          <li>txn1: SAV_EXT monto_signed negativo</li>
          <li>txn2: LOAN monto_signed negativo</li>
          <li>Audit log obligatorio</li>
        </ul>
      </div>
    </div>
  );
}
