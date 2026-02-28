-- E2E loan workflow, payroll export/results and import center extensions

alter table payroll_items add column if not exists estatus text not null default 'PENDING';
alter table payroll_items add column if not exists error_message text;

alter table pay_calendar alter column cutoff_datetime set default ((date_trunc('day', now() at time zone 'America/Monterrey') + interval '11 hour') at time zone 'America/Monterrey');

insert into razon_sociales (clave, nombre, activo)
values
('RS01', 'Razón Social 01', true),
('RS02', 'Razón Social 02', true),
('RS03', 'Razón Social 03', true),
('RS04', 'Razón Social 04', true)
on conflict (clave) do nothing;

insert into employee_profiles (
  razon_social_id, empleado_num, nombre, frecuencia_codigo, sueldo_base_mensual,
  cabecera_imss, centro_trabajo, id_centro_costo, centro_costo,
  grupo, convenio, id_direccion, id_gerencia, id_puesto, categoria, ind_finiquito, id_ubicacion
)
select rs.id, e.empleado_num, e.nombre, e.frecuencia, e.sueldo,
       e.cabecera_imss, e.centro_trabajo, e.id_centro_costo, e.centro_costo,
       e.grupo, e.convenio, e.id_direccion, e.id_gerencia, e.id_puesto, e.categoria, e.ind_finiquito, e.id_ubicacion
from (
  values
  ('RS01','100001','Empleado Uno','003',25000,'H1','CTY1','CC001','Costo 1','G1','CONV1','D1','GR1','P1','CAT1','','UB1'),
  ('RS01','100002','Empleado Dos','002',18000,'H1','CTY1','CC002','Costo 2','G1','CONV1','D1','GR1','P2','CAT1','','UB1'),
  ('RS01','100003','Empleado Tres','004',32000,'H1','CTY2','CC003','Costo 3','G2','CONV1','D1','GR2','P3','CAT2','','UB1'),
  ('RS02','200001','Empleado Cuatro','003',26000,'H2','CTY3','CC004','Costo 4','G1','CONV2','D2','GR3','P4','CAT1','','UB2'),
  ('RS02','200002','Empleado Cinco','004',29500,'H2','CTY3','CC005','Costo 5','G2','CONV2','D2','GR3','P5','CAT2','','UB2'),
  ('RS03','300001','Empleado Seis','002',21000,'H3','CTY4','CC006','Costo 6','G3','CONV3','D3','GR4','P6','CAT1','','UB3'),
  ('RS03','300002','Empleado Siete','003',22000,'H3','CTY4','CC007','Costo 7','G3','CONV3','D3','GR4','P7','CAT2','','UB3'),
  ('RS03','300003','Empleado Ocho','004',34000,'H3','CTY4','CC008','Costo 8','G4','CONV3','D3','GR5','P8','CAT3','','UB3'),
  ('RS04','400001','Empleado Nueve','003',28000,'H4','CTY5','CC009','Costo 9','G1','CONV4','D4','GR6','P9','CAT1','','UB4'),
  ('RS04','400002','Empleado Diez','004',30500,'H4','CTY5','CC010','Costo 10','G1','CONV4','D4','GR6','P10','CAT2','','UB4')
) as e(razon, empleado_num, nombre, frecuencia, sueldo, cabecera_imss, centro_trabajo, id_centro_costo, centro_costo, grupo, convenio, id_direccion, id_gerencia, id_puesto, categoria, ind_finiquito, id_ubicacion)
join razon_sociales rs on rs.clave = e.razon
on conflict (razon_social_id, empleado_num) do nothing;

create or replace function round_half_up_2(p_value numeric)
returns numeric
language sql
immutable
as $$
  select round(p_value::numeric, 2);
$$;

create or replace function public.generate_loan_schedule_half_up(
  p_loan_id uuid,
  p_amount numeric,
  p_term_months integer,
  p_frequency text,
  p_annual_rate numeric,
  p_admin_fee_annual numeric,
  p_first_due_date date
)
returns integer
language plpgsql
security definer
as $$
declare
  v_periods integer;
  v_periods_per_year integer;
  v_rate numeric;
  v_admin_rate numeric;
  v_base_payment numeric;
  v_outstanding numeric := p_amount;
  v_due_date date := p_first_due_date;
  i integer;
  v_interest numeric;
  v_admin numeric;
  v_principal numeric;
  v_total numeric;
begin
  delete from loan_schedule where loan_id = p_loan_id;

  v_periods := periods_for_frequency(p_frequency, p_term_months);
  v_periods_per_year := case when p_frequency='004' then 12 when p_frequency='003' then 24 else 52 end;
  v_rate := p_annual_rate / v_periods_per_year;
  v_admin_rate := p_admin_fee_annual / v_periods_per_year;

  if v_rate = 0 then
    v_base_payment := p_amount / v_periods;
  else
    v_base_payment := (p_amount * v_rate) / (1 - power(1 + v_rate, -v_periods));
  end if;

  for i in 1..v_periods loop
    v_interest := round_half_up_2(v_outstanding * v_rate);
    v_admin := round_half_up_2(v_outstanding * v_admin_rate);

    if i = v_periods then
      v_principal := round_half_up_2(v_outstanding);
    else
      v_principal := round_half_up_2(least(v_outstanding, v_base_payment - v_interest));
    end if;

    v_total := round_half_up_2(v_principal + v_interest + v_admin);

    insert into loan_schedule(loan_id, installment_no, due_date, interest_amount, principal_amount, admin_fee_amount, total_amount)
    values (p_loan_id, i, v_due_date, v_interest, v_principal, v_admin, v_total);

    v_outstanding := round_half_up_2(v_outstanding - v_principal);
    v_due_date := case when p_frequency='004' then (v_due_date + interval '1 month')::date
                       when p_frequency='003' then (v_due_date + interval '15 day')::date
                       else (v_due_date + interval '7 day')::date
                  end;
  end loop;

  return v_periods;
end;
$$;

create or replace function public.approve_loan_request(
  p_loan_id uuid,
  p_approver_user_id uuid,
  p_approved_amount numeric,
  p_approver_comment text,
  p_first_due_date date
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_loan loans%rowtype;
begin
  select * into v_loan from loans where id = p_loan_id for update;

  if not found then
    raise exception 'Loan not found';
  end if;

  if v_loan.status not in ('SUBMITTED','PREVALIDATED') then
    raise exception 'Loan status % cannot be approved', v_loan.status;
  end if;

  update loans
     set status = 'ACTIVE',
         approved_amount = p_approved_amount,
         approver_user_id = p_approver_user_id,
         approver_comment = p_approver_comment,
         approved_at = now()
   where id = p_loan_id;

  insert into ledger_transactions(
    razon_social_id, employee_id, bucket_code, tipo_txn, monto_signed, fecha_movimiento, loan_id, estatus, created_by
  ) values (
    v_loan.razon_social_id, v_loan.employee_id, 'LOAN', 'LOAN_DISBURSEMENT', p_approved_amount, (now() at time zone 'America/Monterrey')::date, p_loan_id, 'APPLIED', p_approver_user_id
  );

  perform generate_loan_schedule_half_up(
    p_loan_id,
    p_approved_amount,
    v_loan.term_months,
    v_loan.payroll_frequency_code,
    v_loan.locked_loan_rate_annual,
    v_loan.locked_admin_fee_annual,
    p_first_due_date
  );

  insert into audit_log(razon_social_id, actor_user_id, action, entity_type, entity_id, detail)
  values (
    v_loan.razon_social_id,
    p_approver_user_id,
    'LOAN_APPROVED',
    'loan',
    p_loan_id,
    jsonb_build_object('approved_amount', p_approved_amount, 'first_due_date', p_first_due_date)
  );

  return p_loan_id;
end;
$$;

create or replace function public.reject_loan_request(
  p_loan_id uuid,
  p_approver_user_id uuid,
  p_comment text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_loan loans%rowtype;
begin
  select * into v_loan from loans where id = p_loan_id for update;
  if not found then
    raise exception 'Loan not found';
  end if;

  if v_loan.status not in ('SUBMITTED','PREVALIDATED') then
    raise exception 'Loan status % cannot be rejected', v_loan.status;
  end if;

  update loans
    set status = 'REJECTED', approver_user_id = p_approver_user_id, approver_comment = p_comment, approved_at = now()
  where id = p_loan_id;

  insert into audit_log(razon_social_id, actor_user_id, action, entity_type, entity_id, detail)
  values (v_loan.razon_social_id, p_approver_user_id, 'LOAN_REJECTED', 'loan', p_loan_id, jsonb_build_object('comment', p_comment));

  return p_loan_id;
end;
$$;

create or replace function public.apply_payroll_batch(p_batch_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update ledger_transactions lt
     set estatus = 'APPLIED'
   where lt.batch_id = p_batch_id
     and lt.tipo_txn = 'LOAN_PAYMENT'
     and lt.estatus = 'PENDING'
     and not exists (
       select 1
         from payroll_items pi
        where pi.batch_id = p_batch_id
          and pi.employee_id = lt.employee_id
          and pi.estatus = 'CANCELLED'
     );

  get diagnostics v_count = row_count;

  update payroll_batches set estatus = 'APPLIED' where id = p_batch_id;

  insert into audit_log(action, entity_type, entity_id, detail)
  values ('BATCH_APPLIED', 'payroll_batch', p_batch_id, jsonb_build_object('affected_transactions', v_count));

  return v_count;
end;
$$;

create or replace function public.import_payroll_batch_results(
  p_batch_id uuid,
  p_results jsonb
)
returns integer
language plpgsql
security definer
as $$
declare
  v_item record;
  v_updated integer := 0;
begin
  for v_item in
    select
      (r->>'employee_id')::uuid as employee_id,
      upper(coalesce(r->>'status','PENDING')) as status,
      coalesce(r->>'error_message','') as error_message
    from jsonb_array_elements(p_results) r
  loop
    if v_item.status = 'CANCELLED' then
      update payroll_items
         set estatus = 'CANCELLED', error_message = v_item.error_message
       where batch_id = p_batch_id
         and employee_id = v_item.employee_id;

      update ledger_transactions
         set estatus = 'CANCELLED'
       where batch_id = p_batch_id
         and employee_id = v_item.employee_id
         and tipo_txn = 'LOAN_PAYMENT'
         and estatus = 'PENDING';

      v_updated := v_updated + 1;
    end if;
  end loop;

  insert into audit_log(action, entity_type, entity_id, detail)
  values ('BATCH_RESULTS_IMPORTED', 'payroll_batch', p_batch_id, jsonb_build_object('cancelled_rows', v_updated));

  return v_updated;
end;
$$;

create or replace function public.get_ansa_layout_rows(p_batch_id uuid)
returns table(
  "Empleado" text,
  "Nombre" text,
  "Cabecera IMSS" text,
  "Centro de Trabajo" text,
  "Id.Centro de Costo" text,
  "Centro de Costo" text,
  "Concepto" text,
  "Descripción" text,
  "Importe" text,
  "Fecha de Pago" text,
  "Año Aplica" text,
  "Mes Aplica" text,
  "Grupo" text,
  "Convenio" text,
  "Frecuencia" text,
  "Id.Dirección" text,
  "Id.Gerencia" text,
  "Id.Puesto" text,
  "Categoria" text,
  "Ind Finiquito" text,
  "Id Ubicación" text
)
language sql
security definer
as $$
  select
    ep.empleado_num as "Empleado",
    ep.nombre as "Nombre",
    ep.cabecera_imss as "Cabecera IMSS",
    ep.centro_trabajo as "Centro de Trabajo",
    ep.id_centro_costo as "Id.Centro de Costo",
    ep.centro_costo as "Centro de Costo",
    pc.codigo as "Concepto",
    pc.descripcion as "Descripción",
    to_char(pi.importe, 'FM9999999990.00') as "Importe",
    to_char(pb.fecha_pago, 'YYYY-MM-DD') as "Fecha de Pago",
    extract(year from pb.fecha_pago)::text as "Año Aplica",
    lpad(extract(month from pb.fecha_pago)::text, 2, '0') as "Mes Aplica",
    coalesce(ep.grupo, '') as "Grupo",
    coalesce(ep.convenio, '') as "Convenio",
    pb.frecuencia_codigo as "Frecuencia",
    coalesce(ep.id_direccion, '') as "Id.Dirección",
    coalesce(ep.id_gerencia, '') as "Id.Gerencia",
    coalesce(ep.id_puesto, '') as "Id.Puesto",
    coalesce(ep.categoria, '') as "Categoria",
    coalesce(ep.ind_finiquito, '') as "Ind Finiquito",
    coalesce(ep.id_ubicacion, '') as "Id Ubicación"
  from payroll_items pi
  join payroll_batches pb on pb.id = pi.batch_id
  join employee_profiles ep on ep.id = pi.employee_id
  join payroll_concepts pc on pc.id = pi.concept_id
  where pi.batch_id = p_batch_id
    and coalesce(pi.estatus, 'PENDING') <> 'CANCELLED'
  order by ep.empleado_num;
$$;
