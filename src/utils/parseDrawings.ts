import JSZip from 'jszip';

const NS_SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';

export interface Shape {
  id: string;
  text: string;
  shapeType: string;
}

export interface Connector {
  startId: string;
  endId: string;
}

export interface DrawingData {
  shapes: Shape[];
  connectors: Connector[];
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function els(parent: Document | Element, ns: string, tag: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(ns, tag));
}

function el(parent: Document | Element, ns: string, tag: string): Element | null {
  return parent.getElementsByTagNameNS(ns, tag)[0] ?? null;
}

function getRId(element: Element): string {
  return element.getAttributeNS(NS_R, 'id') ?? element.getAttribute('r:id') ?? '';
}

function parseRels(xml: string, typeFilter: string): Map<string, string> {
  const doc = parseXml(xml);
  const map = new Map<string, string>();
  for (const rel of els(doc, NS_PKG, 'Relationship')) {
    const type = rel.getAttribute('Type') ?? '';
    if (type.endsWith(typeFilter)) {
      const id = rel.getAttribute('Id') ?? '';
      const target = rel.getAttribute('Target') ?? '';
      if (id) map.set(id, target);
    }
  }
  return map;
}

function resolveTarget(basePath: string, target: string): string {
  const baseDir = basePath.substring(0, basePath.lastIndexOf('/') + 1);
  const parts = (baseDir + target).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.') resolved.push(part);
  }
  return resolved.join('/');
}

function parseDrawingXml(xml: string): DrawingData {
  const doc = parseXml(xml);
  const shapes: Shape[] = [];
  const connectors: Connector[] = [];

  for (const sp of els(doc, NS_XDR, 'sp')) {
    const cNvPr = el(sp, NS_XDR, 'cNvPr');
    if (!cNvPr) continue;
    const id = cNvPr.getAttribute('id') ?? '';

    const prstGeom = el(sp, NS_A, 'prstGeom');
    const shapeType = prstGeom?.getAttribute('prst') ?? 'rect';

    const textParts: string[] = [];
    for (const t of els(sp, NS_A, 't')) {
      const txt = t.textContent?.trim();
      if (txt) textParts.push(txt);
    }

    shapes.push({ id, text: textParts.join(''), shapeType });
  }

  for (const cxn of els(doc, NS_XDR, 'cxnSp')) {
    const nvCxnSpPr = el(cxn, NS_XDR, 'nvCxnSpPr');
    if (!nvCxnSpPr) continue;
    const cNvCxnSpPr = el(nvCxnSpPr, NS_XDR, 'cNvCxnSpPr');
    if (!cNvCxnSpPr) continue;

    const stCxn = el(cNvCxnSpPr, NS_A, 'stCxn');
    const endCxn = el(cNvCxnSpPr, NS_A, 'endCxn');

    const startId = stCxn?.getAttribute('id') ?? '';
    const endId = endCxn?.getAttribute('id') ?? '';

    if (startId && endId) connectors.push({ startId, endId });
  }

  return { shapes, connectors };
}

// Returns a Map of sheet index (0-based) → DrawingData
export async function parseDrawingsFromBuffer(
  buffer: ArrayBuffer,
): Promise<Map<number, DrawingData>> {
  const result = new Map<number, DrawingData>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return result;
  }

  const workbookFile = zip.file('xl/workbook.xml');
  if (!workbookFile) return result;
  const workbookDoc = parseXml(await workbookFile.async('text'));

  const sheetEls = els(workbookDoc, NS_SS, 'sheet');
  const sheetRIds = sheetEls.map((s) => getRId(s));

  const workbookRelsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookRelsFile) return result;
  const sheetFileMap = parseRels(await workbookRelsFile.async('text'), 'worksheet');

  for (let i = 0; i < sheetRIds.length; i++) {
    const rId = sheetRIds[i];
    const sheetTarget = sheetFileMap.get(rId);
    if (!sheetTarget) continue;

    const sheetPath = `xl/${sheetTarget}`;
    const sheetFile = zip.file(sheetPath);
    if (!sheetFile) continue;

    const sheetDoc = parseXml(await sheetFile.async('text'));
    const drawingEl = el(sheetDoc, NS_SS, 'drawing');
    if (!drawingEl) continue;

    const drawingRId = getRId(drawingEl);
    if (!drawingRId) continue;

    const sheetName = sheetTarget.replace('worksheets/', '');
    const sheetRelsFile = zip.file(`xl/worksheets/_rels/${sheetName}.rels`);
    if (!sheetRelsFile) continue;

    const drawingFileMap = parseRels(await sheetRelsFile.async('text'), 'drawing');
    const drawingTarget = drawingFileMap.get(drawingRId);
    if (!drawingTarget) continue;

    const drawingPath = resolveTarget(`xl/worksheets/${sheetName}`, drawingTarget);
    const drawingFile = zip.file(drawingPath);
    if (!drawingFile) continue;

    const drawingData = parseDrawingXml(await drawingFile.async('text'));
    if (drawingData.shapes.length > 0) result.set(i, drawingData);
  }

  return result;
}
