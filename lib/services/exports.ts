import ExcelJS from 'exceljs';

export const ANSA_COLUMNS = [
  'Empleado',
  'Nombre',
  'Cabecera IMSS',
  'Centro de Trabajo',
  'Id.Centro de Costo',
  'Centro de Costo',
  'Concepto',
  'Descripción',
  'Importe',
  'Fecha de Pago',
  'Año Aplica',
  'Mes Aplica',
  'Grupo',
  'Convenio',
  'Frecuencia',
  'Id.Dirección',
  'Id.Gerencia',
  'Id.Puesto',
  'Categoria',
  'Ind Finiquito',
  'Id Ubicación'
] as const;

function normalizeCell(value: string | number | null | undefined, column: string) {
  if (value === null || value === undefined) return '';
  if (column === 'Importe' && typeof value === 'number') return value.toFixed(2);
  return String(value);
}

export async function buildAnsaWorkbook(rows: Record<string, string | number | null | undefined>[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ANSA NS');
  ws.addRow(ANSA_COLUMNS);
  rows.forEach((row) => ws.addRow(ANSA_COLUMNS.map((column) => normalizeCell(row[column], column))));
  return wb.xlsx.writeBuffer();
}

export function buildDelimitedText(
  rows: Record<string, string | number | null | undefined>[],
  options?: { delimiter?: string }
) {
  const delimiter = options?.delimiter ?? '\t';
  const lines = [ANSA_COLUMNS.join(delimiter)];
  for (const row of rows) {
    lines.push(ANSA_COLUMNS.map((column) => normalizeCell(row[column], column)).join(delimiter));
  }
  return lines.join('\n');
}
