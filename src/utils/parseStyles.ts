import JSZip from 'jszip';

const NS_SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';

export interface CellFont {
  bold: boolean;
  italic: boolean;
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, 'application/xml');
}

function els(parent: Document | Element, tag: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS(NS_SS, tag));
}

// Returns a Map of style index → CellFont (bold/italic)
export async function parseStylesFromBuffer(
  buffer: ArrayBuffer,
): Promise<Map<number, CellFont>> {
  const result = new Map<number, CellFont>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return result;
  }

  const stylesFile = zip.file('xl/styles.xml');
  if (!stylesFile) return result;

  const doc = parseXml(await stylesFile.async('text'));

  // Build font list: index → { bold, italic }
  const fontList: CellFont[] = els(doc, 'font').map((f) => ({
    bold: f.getElementsByTagNameNS(NS_SS, 'b').length > 0,
    italic: f.getElementsByTagNameNS(NS_SS, 'i').length > 0,
  }));

  // Map cellXfs index → font properties
  const cellXfs = doc.getElementsByTagNameNS(NS_SS, 'cellXfs')[0];
  if (!cellXfs) return result;

  els(cellXfs, 'xf').forEach((xf, idx) => {
    const fontId = parseInt(xf.getAttribute('fontId') ?? '0', 10);
    result.set(idx, fontList[fontId] ?? { bold: false, italic: false });
  });

  return result;
}

// Returns Map<sheetIdx, Map<cellRef, styleIdx>>
// SheetJS CE does not expose the style index on cell.s, so we read the worksheet XML directly.
export async function parseCellStyleIndices(
  buffer: ArrayBuffer,
): Promise<Map<number, Map<string, number>>> {
  const result = new Map<number, Map<string, number>>();

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return result;
  }

  const workbookFile = zip.file('xl/workbook.xml');
  if (!workbookFile) return result;
  const workbookDoc = parseXml(await workbookFile.async('text'));
  const sheetEls = Array.from(workbookDoc.getElementsByTagNameNS(NS_SS, 'sheet'));
  const sheetRIds = sheetEls.map(
    (s) => s.getAttributeNS(NS_R, 'id') ?? s.getAttribute('r:id') ?? '',
  );

  const workbookRelsFile = zip.file('xl/_rels/workbook.xml.rels');
  if (!workbookRelsFile) return result;
  const relsDoc = parseXml(await workbookRelsFile.async('text'));
  const sheetPathMap = new Map<string, string>();
  for (const rel of Array.from(relsDoc.getElementsByTagNameNS(NS_PKG, 'Relationship'))) {
    const type = rel.getAttribute('Type') ?? '';
    if (type.endsWith('worksheet')) {
      sheetPathMap.set(rel.getAttribute('Id') ?? '', rel.getAttribute('Target') ?? '');
    }
  }

  for (let i = 0; i < sheetRIds.length; i++) {
    const sheetTarget = sheetPathMap.get(sheetRIds[i]);
    if (!sheetTarget) continue;

    const sheetFile = zip.file(`xl/${sheetTarget}`);
    if (!sheetFile) continue;

    const sheetDoc = parseXml(await sheetFile.async('text'));
    const cellMap = new Map<string, number>();

    for (const c of Array.from(sheetDoc.getElementsByTagNameNS(NS_SS, 'c'))) {
      const ref = c.getAttribute('r');
      const s = c.getAttribute('s');
      if (ref && s !== null) cellMap.set(ref, parseInt(s, 10));
    }

    result.set(i, cellMap);
  }

  return result;
}
