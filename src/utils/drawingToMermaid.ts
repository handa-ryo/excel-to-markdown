import type { DrawingData } from './parseDrawings';

// [open, close] delimiters for each Excel shape type
const SHAPE_MAP: Record<string, [string, string]> = {
  rect: ['["', '"]'],
  roundRect: ['("', '")'],
  snip1Rect: ['["', '"]'],
  snipRoundRect: ['("', '")'],
  diamond: ['{"', '"}'],
  parallelogram: ['[/"', '"/]'],
  trapezoid: ['[/"', '"\\]'],
  ellipse: ['(("', '"))'],
  hexagon: ['{{"', '"}}'],
  cylinder: ['[("', '")]'],
  terminator: ['(["', '"])'],
  predefinedProcess: ['[["', '"]]'],
  flowChartProcess: ['["', '"]'],
  flowChartDecision: ['{"', '"}'],
  flowChartTerminator: ['(["', '"])'],
  flowChartConnector: ['(("', '"))'],
  flowChartDocument: ['["', '"]'],
  flowChartPredefinedProcess: ['[["', '"]]'],
  flowChartManualInput: ['[/"', '"/]'],
};

function nodeShape(shapeType: string, text: string): string {
  const [open, close] = SHAPE_MAP[shapeType] ?? ['["', '"]'];
  const safeText = (text || shapeType).replace(/"/g, "'");
  return `${open}${safeText}${close}`;
}

export function drawingToMermaid(drawing: DrawingData): string {
  const { shapes, connectors } = drawing;
  if (shapes.length === 0) return '';

  const lines: string[] = ['flowchart TD'];

  for (const shape of shapes) {
    lines.push(`    S${shape.id}${nodeShape(shape.shapeType, shape.text)}`);
  }

  if (connectors.length > 0) {
    lines.push('');
    for (const conn of connectors) {
      lines.push(`    S${conn.startId} --> S${conn.endId}`);
    }
  }

  return lines.join('\n');
}
