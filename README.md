# Caja de Ahorro Platform

Implementación base de **Next.js App Router + Supabase + Postgres RLS** para operación interna de Caja de Ahorro con scope por razón social.

## Prioridad ejecutada (orden estricto)

1. Flujo completo de préstamos E2E: submit → approval/reject → creación deuda LOAN + amortización.
2. Batches y export final ANSA NS.
3. Import center completo.
4. Reportes RH (base, fase posterior).

## Implementado en esta versión

### 1) Préstamos E2E
- API submit préstamo: `POST /api/loans/request`.
- API aprobar préstamo: `POST /api/loans/approve`.
- API rechazar préstamo: `POST /api/loans/reject`.
- RPC SQL `approve_loan_request`:
  - Actualiza estatus del préstamo.
  - Crea transacción LOAN_DISBURSEMENT en bucket `LOAN` (APPLIED).
  - Genera `loan_schedule` con HALF-UP 2 decimales por periodo.
- RPC SQL `reject_loan_request` con auditoría.

### 2) Batches + Export ANSA NS
- RPC SQL `get_ansa_layout_rows` con orden fijo de 21 columnas.
- API export por batch: `POST /api/batches/:batchId/export`.
- Soporte `TXT` (UTF-8) y `XLSX`.
- Delimitador configurable (default `TAB`).
- Fecha de pago `YYYY-MM-DD`; importe con `2 decimales` y punto decimal.

### 3) Import Center
- Empleados: `POST /api/import/employees` (validaciones por fila, frecuencia activa, duplicados intraarchivo por razón social).
- Calendario: `POST /api/import/pay-calendar`.
- Saldos iniciales: `POST /api/import/opening-balances`.
- Resultados nómina: `POST /api/batches/:batchId/results/import`.
  - Líneas rechazadas → `CANCELLED`.
  - Transacciones relacionadas se quedan sin impacto en saldo.

### Reglas de negocio cerradas aplicadas
- Redondeo HALF-UP a 2 decimales.
- Amortización redondeada por periodo; último pago ajustado para cerrar saldo exacto.
- Zona horaria operativa: `America/Monterrey`.
- MVP nómina: transacciones `PENDING` sólo pasan a `APPLIED` al aplicar batch.

## Datos demo sembrados
- Razones sociales: `RS01`, `RS02`, `RS03`, `RS04`.
- Dataset demo de ~10 empleados ficticios con atributos SAP para layout.

> Nota: usuarios demo de Auth (`emp_rs01@test.com`, `comp_admin@test.com`, etc.) deben crearse en Supabase Auth; por FK a `auth.users` no se insertan directo desde migración SQL estándar.

## Migraciones
- `supabase/migrations/202602280001_init_cashbox.sql`
- `supabase/migrations/202602280002_business_rules.sql`
- `supabase/migrations/202602280003_e2e_loans_batches_imports.sql`

## Ejecutar localmente

```bash
npm install
npm run dev
```

Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
