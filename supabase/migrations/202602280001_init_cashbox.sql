-- Extensions
create extension if not exists "pgcrypto";

-- Enums
create type app_role as enum ('EMPLOYEE','COMP_ADMIN','COMP_APPROVER','HR_REPORTS','SUPERADMIN');
create type txn_status as enum ('PENDING','APPLIED','CANCELLED','REVERSED');
create type batch_status as enum ('DRAFT','GENERATED','EXPORTED','APPLIED','CANCELLED');
create type loan_status as enum ('DRAFT','SUBMITTED','PREVALIDATED','APPROVED','REJECTED','ACTIVE','CLOSED');
create type bucket_nature as enum ('ASSET','LIABILITY');

-- Helper functions for RLS
create or replace function public.current_app_role() returns app_role
language sql stable as $$
  select coalesce((auth.jwt() ->> 'role')::app_role, 'EMPLOYEE'::app_role);
$$;

create or replace function public.current_employee_num() returns text
language sql stable as $$
  select auth.jwt() ->> 'employee_num';
$$;

create or replace function public.allowed_razones() returns uuid[]
language sql stable as $$
  select coalesce(array(select jsonb_array_elements_text(coalesce(auth.jwt() -> 'app_metadata' -> 'razon_social_ids', '[]'::jsonb))::uuid), array[]::uuid[]);
$$;

create table razon_sociales (
  id uuid primary key default gen_random_uuid(),
  clave text unique not null,
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table user_profiles (
  id uuid primary key references auth.users(id),
  role app_role not null,
  display_name text,
  created_at timestamptz not null default now()
);

create table user_razon_social_scope (
  user_id uuid not null references user_profiles(id) on delete cascade,
  razon_social_id uuid not null references razon_sociales(id),
  primary key (user_id, razon_social_id)
);

create table payroll_frequencies (
  codigo_nomina text primary key,
  nombre text not null,
  periodos_por_anio integer not null,
  factor_prorrateo numeric(14,8) not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table pay_calendar (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  frecuencia_codigo text not null references payroll_frequencies(codigo_nomina),
  fecha_pago date not null,
  anio_aplica integer not null,
  mes_aplica integer not null,
  cutoff_datetime timestamptz not null,
  created_at timestamptz not null default now(),
  unique (razon_social_id, frecuencia_codigo, fecha_pago)
);

create table account_buckets (
  code text primary key,
  nombre text not null,
  naturaleza bucket_nature not null,
  activo boolean not null default true,
  allow_autopay boolean not null default false,
  created_at timestamptz not null default now()
);

create table employee_profiles (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  empleado_num text not null,
  nombre text not null,
  frecuencia_codigo text not null references payroll_frequencies(codigo_nomina),
  sueldo_base_mensual numeric(14,2) not null check (sueldo_base_mensual > 0),
  cabecera_imss text not null,
  centro_trabajo text not null,
  id_centro_costo text not null,
  centro_costo text not null,
  grupo text,
  convenio text,
  id_direccion text,
  id_gerencia text,
  id_puesto text,
  categoria text,
  ind_finiquito text,
  id_ubicacion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (razon_social_id, empleado_num)
);

create table employee_bucket_opening_balances (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  employee_id uuid not null references employee_profiles(id),
  bucket_code text not null references account_buckets(code),
  saldo_inicial numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (employee_id, bucket_code)
);

create table cashbox_parameters (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  version integer not null,
  effective_from date not null,
  loan_rate_annual numeric(8,6) not null,
  max_term_months integer not null default 18,
  max_active_loans integer not null default 2,
  min_cashbox_tenure_months integer not null default 6,
  admin_fee_annual numeric(8,6) not null default 0.01,
  rounding_mode text not null default 'HALF_UP',
  weekly_factor numeric(10,6) not null default 4.333333,
  biweekly_factor numeric(10,6) not null default 2,
  monthly_factor numeric(10,6) not null default 1,
  created_at timestamptz not null default now(),
  unique (razon_social_id, version)
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  employee_id uuid not null references employee_profiles(id),
  requested_amount numeric(14,2) not null,
  approved_amount numeric(14,2),
  term_months integer not null,
  payroll_frequency_code text not null references payroll_frequencies(codigo_nomina),
  status loan_status not null default 'SUBMITTED',
  parameter_version integer not null,
  locked_loan_rate_annual numeric(8,6) not null,
  locked_admin_fee_annual numeric(8,6) not null,
  approver_user_id uuid references user_profiles(id),
  approver_comment text,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table loan_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  installment_no integer not null,
  due_date date not null,
  interest_amount numeric(14,2) not null,
  principal_amount numeric(14,2) not null,
  admin_fee_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null,
  status text not null default 'PENDING',
  unique (loan_id, installment_no)
);

create table payroll_concepts (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descripcion text not null,
  tipo text not null,
  activo boolean not null default true
);

create table layout_templates (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  output_formats text[] not null,
  delimiter text not null default E'\t',
  mapping jsonb not null,
  created_at timestamptz not null default now()
);

create table payroll_batches (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  frecuencia_codigo text not null references payroll_frequencies(codigo_nomina),
  fecha_pago date not null,
  estatus batch_status not null default 'DRAFT',
  delimiter text not null default E'\t',
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now(),
  unique (razon_social_id, frecuencia_codigo, fecha_pago)
);

create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references payroll_batches(id) on delete cascade,
  razon_social_id uuid not null references razon_sociales(id),
  employee_id uuid not null references employee_profiles(id),
  concept_id uuid not null references payroll_concepts(id),
  importe numeric(14,2) not null,
  row_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table returns_batches (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  frecuencia_codigo text not null references payroll_frequencies(codigo_nomina),
  fecha_pago date not null,
  tasa_periodo numeric(8,6),
  monto_total numeric(14,2),
  metodo text not null default 'SALDO_CORTE',
  buckets text[] not null,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

create table ledger_transactions (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  employee_id uuid not null references employee_profiles(id),
  bucket_code text not null references account_buckets(code),
  tipo_txn text not null,
  monto_signed numeric(14,2) not null,
  fecha_movimiento date not null,
  loan_id uuid references loans(id),
  batch_id uuid references payroll_batches(id),
  transfer_id uuid,
  estatus txn_status not null default 'PENDING',
  metadata jsonb,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid references razon_sociales(id),
  actor_user_id uuid references user_profiles(id),
  actor_role app_role,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  razon_social_id uuid not null references razon_sociales(id),
  tipo text not null,
  status text not null default 'CREATED',
  source_file_name text,
  report jsonb,
  created_by uuid references user_profiles(id),
  created_at timestamptz not null default now()
);

create view employee_bucket_balances as
select
  e.id as employee_id,
  e.razon_social_id,
  b.code as bucket_code,
  coalesce(ob.saldo_inicial, 0) + coalesce(sum(case when lt.estatus = 'APPLIED' then lt.monto_signed else 0 end), 0) as saldo
from employee_profiles e
cross join account_buckets b
left join employee_bucket_opening_balances ob on ob.employee_id = e.id and ob.bucket_code = b.code
left join ledger_transactions lt on lt.employee_id = e.id and lt.bucket_code = b.code
where b.activo = true
group by e.id, e.razon_social_id, b.code, ob.saldo_inicial;

-- RLS
alter table employee_profiles enable row level security;
alter table loans enable row level security;
alter table loan_schedule enable row level security;
alter table ledger_transactions enable row level security;
alter table payroll_batches enable row level security;
alter table payroll_items enable row level security;
alter table pay_calendar enable row level security;
alter table returns_batches enable row level security;
alter table import_jobs enable row level security;
alter table audit_log enable row level security;

create policy p_employee_profiles_scope on employee_profiles
for all using (
  razon_social_id = any (allowed_razones())
  and (
    current_app_role() in ('COMP_ADMIN','COMP_APPROVER','HR_REPORTS','SUPERADMIN')
    or (current_app_role() = 'EMPLOYEE' and empleado_num = current_employee_num())
  )
);

create policy p_loans_scope on loans
for all using (
  razon_social_id = any (allowed_razones())
  and (
    current_app_role() in ('COMP_ADMIN','COMP_APPROVER','HR_REPORTS','SUPERADMIN')
    or (current_app_role() = 'EMPLOYEE' and employee_id in (
      select id from employee_profiles ep where ep.empleado_num = current_employee_num()
    ))
  )
);

create policy p_loan_schedule_scope on loan_schedule
for select using (
  loan_id in (select id from loans)
);

create policy p_ledger_scope on ledger_transactions
for all using (
  razon_social_id = any (allowed_razones())
  and (
    current_app_role() in ('COMP_ADMIN','COMP_APPROVER','HR_REPORTS','SUPERADMIN')
    or (current_app_role() = 'EMPLOYEE' and employee_id in (
      select id from employee_profiles ep where ep.empleado_num = current_employee_num()
    ))
  )
) with check (
  razon_social_id = any (allowed_razones())
);

create policy p_batch_scope on payroll_batches for all using (razon_social_id = any (allowed_razones()));
create policy p_items_scope on payroll_items for all using (razon_social_id = any (allowed_razones()));
create policy p_calendar_scope on pay_calendar for all using (razon_social_id = any (allowed_razones()));
create policy p_returns_scope on returns_batches for all using (razon_social_id = any (allowed_razones()));
create policy p_import_scope on import_jobs for all using (razon_social_id = any (allowed_razones()));
create policy p_audit_scope on audit_log for select using (razon_social_id = any (allowed_razones()));

-- Seed data
insert into payroll_frequencies (codigo_nomina, nombre, periodos_por_anio, factor_prorrateo, activo)
values
('002', 'Semanal', 52, 52, true),
('003', 'Quincenal', 24, 24, true),
('004', 'Mensual', 12, 12, true)
on conflict (codigo_nomina) do nothing;

insert into account_buckets (code, nombre, naturaleza, allow_autopay, activo)
values
('SAV_ORD', 'Ahorro ordinario', 'ASSET', false, true),
('SAV_EXT', 'Ahorro extraordinario', 'ASSET', true, true),
('INV_01', 'Inversión opción 1', 'ASSET', false, true),
('LOAN', 'Deuda préstamo', 'LIABILITY', false, true)
on conflict (code) do nothing;

insert into payroll_concepts (codigo, descripcion, tipo, activo)
values
('4076', 'Aportación Caja Ahorro', 'AHORRO', true),
('LOAN_DESC', 'Descuento préstamo', 'PRESTAMO', true),
('LOAN_FEE', 'Fee administrativo préstamo', 'FEE', true)
on conflict (codigo) do nothing;

insert into layout_templates (nombre, output_formats, delimiter, mapping)
values (
  'SAP Descuentos ANSA NS',
  array['XLSX','TXT'],
  E'\t',
  '{"1":"empleado_num","2":"nombre","3":"cabecera_imss","4":"centro_trabajo","5":"id_centro_costo","6":"centro_costo","7":"concepto","8":"descripcion","9":"importe","10":"fecha_pago","11":"anio_aplica","12":"mes_aplica","13":"grupo","14":"convenio","15":"frecuencia","16":"id_direccion","17":"id_gerencia","18":"id_puesto","19":"categoria","20":"ind_finiquito","21":"id_ubicacion"}'::jsonb
)
on conflict (nombre) do nothing;
