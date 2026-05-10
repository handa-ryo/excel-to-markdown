import * as XLSX from 'xlsx';
import { parseDrawingsFromBuffer } from './parseDrawings';
import { drawingToMermaid } from './drawingToMermaid';
import { parseStylesFromBuffer, parseCellStyleIndices } from './parseStyles';

export interface CellData {
  value: string;
  bold: boolean;
  italic: boolean;
}

export interface SheetData {
  name: string;
  rows: CellData[][];
  mermaid?: string;
}

export interface WorkbookData {
  sheets: SheetData[];
}

export async function parseExcel(file: File): Promise<WorkbookData> {
  const buffer = await file.arrayBuffer();
  const [workbook, drawingMap, styleMap, cellStyleMap] = await Promise.all([
    Promise.resolve(XLSX.read(buffer, { type: 'array' })),
    parseDrawingsFromBuffer(buffer),
    parseStylesFromBuffer(buffer),
    parseCellStyleIndices(buffer),
  ]);

  const sheets: SheetData[] = workbook.SheetNames.map((name, idx) => {
    const sheet = workbook.Sheets[name];
    const rows: CellData[][] = [];
    const sheetStyleIndices = cellStyleMap.get(idx) ?? new Map<string, number>();

    const ref = sheet['!ref'];
    if (ref) {
      const range = XLSX.utils.decode_range(ref);
      for (let r = range.s.r; r <= range.e.r; r++) {
        const row: CellData[] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = sheet[addr];
          const value = cell ? (XLSX.utils.format_cell(cell) ?? '') : '';
          const styleIdx = sheetStyleIndices.get(addr) ?? 0;
          const font = styleMap.get(styleIdx) ?? { bold: false, italic: false };
          row.push({ value, bold: font.bold, italic: font.italic });
        }
        rows.push(row);
      }
    }

    const drawing = drawingMap.get(idx);
    const mermaid = drawing ? drawingToMermaid(drawing) : undefined;

    return { name, rows, mermaid };
  });

  return { sheets };
}

function formatCell(cell: CellData): string {
  let text = cell.value.replace(/\|/g, '\\|').replace(/\*/g, '\\*');
  if (cell.bold && cell.italic) return `***${text}***`;
  if (cell.bold) return `**${text}**`;
  if (cell.italic) return `*${text}*`;
  return text;
}

export function sheetToMarkdown(rows: CellData[][]): string {
  if (rows.length === 0) return '';

  const nonEmptyRows = rows.filter((row) => row.some((c) => c.value.trim() !== ''));
  if (nonEmptyRows.length === 0) return '';

  const maxCols = Math.max(...nonEmptyRows.map((row) => row.length));
  const normalized = nonEmptyRows.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push({ value: '', bold: false, italic: false });
    return padded.map(formatCell);
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
