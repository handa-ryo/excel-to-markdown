import * as XLSX from 'xlsx';

export interface SheetData {
  name: string;
  rows: string[][];
}

export interface WorkbookData {
  sheets: SheetData[];
}

export async function parseExcel(file: File): Promise<WorkbookData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheets: SheetData[] = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][];
    return { name, rows };
  });

  return { sheets };
}

export function sheetToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return '';

  const nonEmptyRows = rows.filter((row) => row.some((cell) => String(cell).trim() !== ''));
  if (nonEmptyRows.length === 0) return '';

  const maxCols = Math.max(...nonEmptyRows.map((row) => row.length));
  const normalized = nonEmptyRows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('');
    return padded.map((cell) => String(cell).replace(/\|/g, '\\|'));
  });

  const header = normalized[0];
  const separator = header.map(() => '---');
  const body = normalized.slice(1);

  const toRow = (cells: string[]) => `| ${cells.join(' | ')} |`;

  return [toRow(header), toRow(separator), ...body.map(toRow)].join('\n');
}

export function generateMarkdown(workbookData: WorkbookData, selectedSheets: string[]): string {
  const parts: string[] = [];

  for (const sheet of workbookData.sheets) {
    if (!selectedSheets.includes(sheet.name)) continue;
    const table = sheetToMarkdown(sheet.rows);
    if (!table) continue;
    parts.push(`## ${sheet.name}\n\n${table}`);
  }

  return parts.join('\n\n');
}
