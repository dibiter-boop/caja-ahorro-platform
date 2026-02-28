-- Business rule safeguards and workflow RPCs

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_employee_profiles_updated_at on employee_profiles;
create trigger trg_employee_profiles_updated_at
before update on employee_profiles
for each row execute procedure set_updated_at();

create or replace function prevent_applied_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and old.estatus = 'APPLIED' then
    raise exception 'APPLIED transactions cannot be edited; use reverse entry.';
  end if;
  if tg_op = 'DELETE' and old.estatus = 'APPLIED' then
    raise exception 'APPLIED transactions cannot be deleted; use reverse entry.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_prevent_applied_update on ledger_transactions;
create trigger trg_prevent_applied_update
before update or delete on ledger_transactions
for each row execute procedure prevent_applied_ledger_mutation();

create or replace function public.periods_for_frequency(p_frequency text, p_term_months integer, p_weekly_factor numeric default (52.0/12.0))
returns integer
language sql
immutable
as $$
  select case
    when p_frequency = '004' then p_term_months
    when p_frequency = '003' then p_term_months * 2
    when p_frequency = '002' then round(p_term_months * p_weekly_factor)::integer
    else p_term_months
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
  update ledger_transactions
     set estatus = 'APPLIED'
   where batch_id = p_batch_id
     and tipo_txn = 'LOAN_PAYMENT'
     and estatus = 'PENDING';

  get diagnostics v_count = row_count;

  update payroll_batches
     set estatus = 'APPLIED'
   where id = p_batch_id;

  insert into audit_log(action, entity_type, entity_id, detail)
  values ('BATCH_APPLIED', 'payroll_batch', p_batch_id, jsonb_build_object('affected_transactions', v_count));

  return v_count;
end;
$$;

create or replace function public.autopay_sav_ext_to_loan(
  p_razon_social_id uuid,
  p_employee_id uuid,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_sav_ext numeric;
  v_transfer_id uuid := gen_random_uuid();
begin
  if p_amount <= 0 then
    raise exception 'Amount must be > 0';
  end if;

  select saldo into v_sav_ext
  from employee_bucket_balances
  where employee_id = p_employee_id and bucket_code = 'SAV_EXT';

  if coalesce(v_sav_ext, 0) < p_amount then
    raise exception 'Insufficient SAV_EXT balance';
  end if;

  insert into ledger_transactions(razon_social_id, employee_id, bucket_code, tipo_txn, monto_signed, fecha_movimiento, transfer_id, estatus)
  values
  (p_razon_social_id, p_employee_id, 'SAV_EXT', 'AUTOPAY_TRANSFER_OUT', -p_amount, current_date, v_transfer_id, 'APPLIED'),
  (p_razon_social_id, p_employee_id, 'LOAN', 'AUTOPAY_LOAN_PAYMENT', -p_amount, current_date, v_transfer_id, 'APPLIED');

  insert into audit_log(razon_social_id, action, entity_type, detail)
  values (p_razon_social_id, 'AUTOPAY_SAV_EXT_TO_LOAN', 'transfer', jsonb_build_object('employee_id', p_employee_id, 'transfer_id', v_transfer_id, 'amount', p_amount));

  return v_transfer_id;
end;
$$;

create or replace function public.generate_loan_schedule(
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
  v_payment numeric;
  v_outstanding numeric := p_amount;
  i integer;
  v_interest numeric;
  v_admin numeric;
  v_principal numeric;
  v_due_date date := p_first_due_date;
begin
  delete from loan_schedule where loan_id = p_loan_id;

  v_periods := periods_for_frequency(p_frequency, p_term_months);
  v_periods_per_year := case when p_frequency='004' then 12 when p_frequency='003' then 24 else 52 end;
  v_rate := p_annual_rate / v_periods_per_year;
  v_admin_rate := p_admin_fee_annual / v_periods_per_year;

  if v_rate = 0 then
    v_payment := p_amount / v_periods;
  else
    v_payment := (p_amount * v_rate) / (1 - power(1 + v_rate, -v_periods));
  end if;

  for i in 1..v_periods loop
    v_interest := round((v_outstanding * v_rate)::numeric, 2);
    v_admin := round((v_outstanding * v_admin_rate)::numeric, 2);
    v_principal := round(least(v_outstanding, v_payment - v_interest)::numeric, 2);

    insert into loan_schedule(loan_id, installment_no, due_date, interest_amount, principal_amount, admin_fee_amount, total_amount)
    values (p_loan_id, i, v_due_date, v_interest, v_principal, v_admin, round((v_principal + v_interest + v_admin)::numeric, 2));

    v_outstanding := round((v_outstanding - v_principal)::numeric, 2);
    v_due_date := case when p_frequency='004' then (v_due_date + interval '1 month')::date
                       when p_frequency='003' then (v_due_date + interval '15 day')::date
                       else (v_due_date + interval '7 day')::date end;
  end loop;

  return v_periods;
end;
$$;
