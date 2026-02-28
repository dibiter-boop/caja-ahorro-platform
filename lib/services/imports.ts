import Papa from 'papaparse';
import { z } from 'zod';

export const employeeImportRowSchema = z.object({
  razon_social_id: z.string().uuid(),
  empleado_num: z.string().min(1),
  nombre: z.string().min(1),
  frecuencia_codigo: z.string().min(3),
  sueldo_base_mensual: z.coerce.number().positive(),
  cabecera_imss: z.string().min(1),
  centro_trabajo: z.string().min(1),
  id_centro_costo: z.string().min(1),
  centro_costo: z.string().min(1),
  grupo: z.string().optional(),
  convenio: z.string().optional(),
  id_direccion: z.string().optional(),
  id_gerencia: z.string().optional(),
  id_puesto: z.string().optional(),
  categoria: z.string().optional(),
  ind_finiquito: z.string().optional(),
  id_ubicacion: z.string().optional()
});

export function parseCsvRows(csvRaw: string) {
  const parsed = Papa.parse<Record<string, string>>(csvRaw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length) {
    throw new Error(`CSV inválido: ${parsed.errors[0]?.message}`);
  }
  return parsed.data;
}

export function validateEmployeeRows(rows: Record<string, string>[], validFrequencies: string[]) {
  const ok: Record<string, unknown>[] = [];
  const errors: { row: number; message: string }[] = [];
  const dedupe = new Set<string>();

  rows.forEach((row, index) => {
    const parsed = employeeImportRowSchema.safeParse(row);
    if (!parsed.success) {
      errors.push({ row: index + 1, message: parsed.error.issues.map((issue) => issue.message).join(', ') });
      return;
    }

    const freq = parsed.data.frecuencia_codigo;
    if (!validFrequencies.includes(freq)) {
      errors.push({ row: index + 1, message: `frecuencia_codigo inválida: ${freq}` });
      return;
    }

    const key = `${parsed.data.razon_social_id}|${parsed.data.empleado_num}`;
    if (dedupe.has(key)) {
      errors.push({ row: index + 1, message: 'empleado_num duplicado dentro del archivo para la misma razón social' });
      return;
    }

    dedupe.add(key);
    ok.push(parsed.data);
  });

  return { ok, errors };
}
