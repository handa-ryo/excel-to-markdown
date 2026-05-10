import * as XLSX from 'xlsx';
import { parseDrawingsFromBuffer } from './parseDrawings';
import { drawingToMermaid } from './drawingToMermaid';

export interface SheetData {
  name: string;
  rows: string[][];
  mermaid?: string;
}

export interface WorkbookData {
  sheets: SheetData[];
}

export async function parseExcel(file: File): Promise<WorkbookData> {
  const buffer = await file.arrayBuffer();
  const [workbook, drawingMap] = await Promise.all([
    Promise.resolve(XLSX.read(buffer, { type: 'array' })),
    parseDrawingsFromBuffer(buffer),
  ]);

  const sheets: SheetData[] = workbook.SheetNames.map((name, idx) => {
    const sheet = workbook.Sheets[name];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as string[][];

    const drawing = drawingMap.get(idx);
    const mermaid = drawing ? drawingToMermaid(drawing) : undefined;

    return { name, rows, mermaid };
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

    const sectionParts: string[] = [];

    const table = sheetToMarkdown(sheet.rows);
    if (table) sectionParts.push(table);

    if (sheet.mermaid) {
      sectionParts.push(`\`\`\`mermaid\n${sheet.mermaid}\n\`\`\``);
    }

    if (sectionParts.length > 0) {
      parts.push(`## ${sheet.name}\n\n${sectionParts.join('\n\n')}`);
    }
  }

  return parts.join('\n\n');
}
