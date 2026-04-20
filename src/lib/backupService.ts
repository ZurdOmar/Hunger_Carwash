import JSZip from 'jszip';
import { supabase } from './supabase';

interface BackupProgress {
  currentTable: string;
  totalTables: number;
  percentage: number;
}

const TABLES_TO_BACKUP = [
  'ordenes_servicio',
  'turnos',
  'vehiculos',
  'clientes',
  'lavadores',
  'cajones',
  'perfiles',
  'servicios',
  'precios_base',
  'membresias',
  'sucursales',
  'reglas_promocion'
];

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const BOM = '\uFEFF';

  const csvHeaders = headers.map(h => `"${h}"`).join(',');
  const csvRows = data.map(row =>
    headers.map(h => {
      const value = row[h];
      if (value === null || value === undefined) return '';
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return typeof value === 'object' ? `"${JSON.stringify(value)}"` : `"${value}"`;
    }).join(',')
  );

  return BOM + csvHeaders + '\n' + csvRows.join('\n');
}

function convertToJSON(data: any[]): string {
  return JSON.stringify(data, null, 2);
}

export async function downloadDatabaseBackup(
  onProgress?: (progress: BackupProgress) => void
): Promise<void> {
  try {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupFolder = zip.folder(`backup-${timestamp}`);

    if (!backupFolder) throw new Error('No se pudo crear carpeta en ZIP');

    let tableIndex = 0;

    for (const tableName of TABLES_TO_BACKUP) {
      tableIndex++;

      if (onProgress) {
        onProgress({
          currentTable: tableName,
          totalTables: TABLES_TO_BACKUP.length,
          percentage: Math.round((tableIndex / TABLES_TO_BACKUP.length) * 100)
        });
      }

      try {
        const { data, error } = await (supabase
          .from(tableName as any)
          .select('*')
          .limit(50000) as any);

        if (error) {
          console.warn(`Tabla ${tableName} no encontrada o sin acceso:`, error.message);
          backupFolder.file(`${tableName}.txt`, `Error: ${error.message}`);
          continue;
        }

        if (data && data.length > 0) {
          const csv = convertToCSV(data);
          backupFolder.file(`${tableName}.csv`, csv);
        } else {
          backupFolder.file(`${tableName}.csv`, '');
        }
      } catch (err) {
        console.warn(`Error procesando tabla ${tableName}:`, err);
        backupFolder.file(`${tableName}.txt`, `Error al procesar esta tabla`);
      }
    }

    // Agregar metadata del respaldo
    const metadata = {
      timestamp: new Date().toISOString(),
      appVersion: '4.1.2',
      tablesCount: TABLES_TO_BACKUP.length,
      exportedTables: TABLES_TO_BACKUP
    };
    backupFolder.file('METADATA.json', JSON.stringify(metadata, null, 2));

    // Generar y descargar ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hunger-carwash-backup-${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error en respaldo de BD:', error);
    throw new Error(`Error al crear respaldo: ${error instanceof Error ? error.message : 'Desconocido'}`);
  }
}

export async function getBackupSize(): Promise<string> {
  try {
    let totalRecords = 0;

    for (const tableName of TABLES_TO_BACKUP) {
      const { count } = await (supabase
        .from(tableName as any)
        .select('*', { count: 'exact', head: true }) as any);

      totalRecords += count || 0;
    }

    return `~${totalRecords.toLocaleString()} registros`;
  } catch (error) {
    return 'Tamaño desconocido';
  }
}
