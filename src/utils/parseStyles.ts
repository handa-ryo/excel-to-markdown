import JSZip from 'jszip';

const NS_SS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

export interface CellFont {
  bold: boolean;
  italic: boolean;
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

  const doc = new DOMParser().parseFromString(await stylesFile.async('text'), 'application/xml');

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
