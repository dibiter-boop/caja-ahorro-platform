import { Card } from '@/components/ui/card';

const catalogs = [
  'Frecuencias de nómina (002/003/004 + altas/bajas)',
  'Buckets contables (SAV_ORD, SAV_EXT, INV_01, LOAN + futuros)',
  'Conceptos de nómina (incluye 4076)',
  'Parámetros cashbox con versionado',
  'Plantilla layout SAP ANSA NS (21 columnas)'
];

export default function CatalogosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Catálogos y parámetros</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {catalogs.map((item) => (
          <Card key={item}><p>{item}</p></Card>
        ))}
      </div>
    </div>
  );
}
