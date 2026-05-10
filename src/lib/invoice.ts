// Génère une facture PDF en raw bytes — aucune dépendance externe.
// Compatible edge runtime / Cloudflare Workers.

export interface InvoiceParams {
  invoiceNumber: string;  // format YYYY-MM-DD_receiptNumber
  date: Date;
  customerEmail: string;
  customerName: string;
  customerCountry: string;
  documentTitle: string;
  amount: number;   // in cents
  currency: string; // 'usd' | 'eur'
  locale: 'en' | 'fr';
}

/**
 * Convertit une chaîne Unicode en hex PDF (WinAnsiEncoding).
 * Les accents français (é, à, ü…) et le symbole € sont correctement encodés.
 */
function toHex(str: string): string {
  const ext: Record<number, number> = {
    0x20AC: 0x80, // €
    0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89,
    0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E,
    0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94,
    0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
    0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F,
    0x00A0: 0x20, // espace insécable → espace normal
    0x202F: 0x20, // espace fine insécable → espace normal
  };
  let hex = '';
  for (const ch of str) {
    const cp = ch.charCodeAt(0);
    const byte = cp in ext ? ext[cp] : cp < 0x100 ? cp : 0x3F;
    hex += byte.toString(16).padStart(2, '0');
  }
  return `<${hex}>`;
}

export function generateInvoicePDF(params: InvoiceParams): Uint8Array {
  const {
    invoiceNumber, date, customerEmail, customerName,
    customerCountry, documentTitle, amount, currency, locale,
  } = params;

  const W = 595.28;   // largeur A4 (points)
  const H = 841.89;   // hauteur A4 (points)
  const L = 50;       // marge gauche
  const R = 545.28;   // marge droite
  const RC = 308;     // colonne droite (titre)

  const fmtAmount = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency', currency: currency.toUpperCase(),
  }).format(amount / 100);

  const dateStr = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);

  let docTitle = documentTitle;
  if (docTitle.length > 60) docTitle = docTitle.substring(0, 57) + '...';

  // ─── Helpers du content stream ───────────────────────────────────

  const ops: string[] = [];

  /** Texte à position absolue (x, y compté depuis le bas de la page). */
  const txt = (x: number, y: number, s: string, bold = false, size = 10) =>
    ops.push(`BT /${bold ? 'FB' : 'F'} ${size} Tf 1 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)} Tm ${toHex(s)} Tj ET`);

  /** Ligne horizontale. */
  const hline = (y: number, gray = 0.80, lw = 0.5) =>
    ops.push(`${gray.toFixed(2)} G ${lw} w ${L} ${y.toFixed(1)} m ${R.toFixed(1)} ${y.toFixed(1)} l S 0 G`);

  /** Rectangle plein. */
  const fillRect = (x: number, y: number, w: number, h: number, gray: number) =>
    ops.push(`${gray.toFixed(2)} g ${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f 0 g`);

  // ─── FOND GRIS LÉGER POUR ZONE D'EN-TÊTE ─────────────────────────
  fillRect(0, H - 145, W, 145, 0.95);

  // ─── VENDEUR (colonne gauche) ─────────────────────────────────────
  txt(L, H - 48,  'LA DOCUMENTATION TECHNIQUE',          true,  11);
  txt(L, H - 63,  'SHOP OF TECHNICAL DOCUMENTATIONS',    false,  9);
  txt(L, H - 77,  'Business Hub Lucenecka cesta 2266/6', false,  9);
  txt(L, H - 91,  '96096 ZVOLEN',                        false,  9);
  txt(L, H - 105, 'Slovaquie',                           false,  9);
  txt(L, H - 119, 'RCS 36807516',                        false,  9);

  // ─── TITRE + N° FACTURE (colonne droite) ─────────────────────────
  txt(RC, H - 55,  'FACTURE / INVOICE',           true,  20);
  txt(RC, H - 82,  `N° ${invoiceNumber}`,    true,  10);

  // ─── SÉPARATEUR EN-TÊTE ───────────────────────────────────────────
  hline(H - 145, 0.45, 1.0);

  // ─── DATE ────────────────────────────────────────────────────────
  txt(L, H - 168, (locale === 'fr' ? 'Date : ' : 'Date: ') + dateStr, false, 10);

  // ─── FACTURÉ À ───────────────────────────────────────────────────
  txt(L, H - 200, locale === 'fr' ? 'Facturé à :' : 'Billed to:', true, 10);
  let bY = H - 216;
  if (customerName && customerName !== 'Unknown') {
    txt(L, bY, customerName, false, 10); bY -= 14;
  }
  txt(L, bY, customerEmail, false, 10);
  if (customerCountry && customerCountry !== '—') {
    bY -= 14;
    txt(L, bY, customerCountry, false, 10);
  }

  // ─── TABLEAU ─────────────────────────────────────────────────────
  const tY = H - 330;

  // En-tête sombre
  fillRect(L, tY - 6, R - L, 24, 0.15);
  ops.push('1 g'); // texte blanc
  txt(60,  tY + 3, 'Description',                              true, 9);
  txt(388, tY + 3, locale === 'fr' ? 'Qté' : 'Qty',      true, 9);
  txt(458, tY + 3, locale === 'fr' ? 'Montant' : 'Amount',    true, 9);
  ops.push('0 g'); // reset noir

  // Fond alternance ligne article
  fillRect(L, tY - 42, R - L, 24, 0.97);

  // Ligne article
  txt(60,  tY - 32, docTitle,    false, 9);
  txt(393, tY - 32, '1',         false, 9);
  txt(458, tY - 32, fmtAmount,   false, 9);

  // Séparateur bas tableau
  hline(tY - 50);

  // Zone total (fond léger)
  fillRect(310, tY - 82, R - 310, 26, 0.93);

  // Total
  txt(322, tY - 72, locale === 'fr' ? 'Total payé :' : 'Total paid:',  true,  11);
  txt(458, tY - 72, fmtAmount,                                          true,  11);

  // ─── PIED DE PAGE ────────────────────────────────────────────────
  hline(55, 0.75, 0.75);
  txt(L, 40, 'LA DOCUMENTATION TECHNIQUE', true, 8);
  txt(L, 29, 'service-manuals-pro.com  |  service-manuels-pro.fr', false, 8);

  // ─── CONSTRUCTION DU PDF ─────────────────────────────────────────
  const enc = new TextEncoder();
  const streamStr = ops.join('\n');
  const streamBytes = enc.encode(streamStr);

  const obj = (n: number, body: string) => enc.encode(`${n} 0 obj\n${body}\nendobj\n`);

  const o1 = obj(1, '<</Type /Catalog /Pages 2 0 R>>');
  const o2 = obj(2, '<</Type /Pages /Kids [3 0 R] /Count 1>>');
  const o3 = obj(3, `<</Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources <</Font <</F 4 0 R /FB 5 0 R>>>> /Contents 6 0 R>>`);
  const o4 = obj(4, '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding>>');
  const o5 = obj(5, '<</Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding>>');
  const o6h = enc.encode(`6 0 obj\n<</Length ${streamBytes.length}>>\nstream\n`);
  const o6f = enc.encode('\nendstream\nendobj\n');

  const header = enc.encode('%PDF-1.4\n');

  // Calcul des offsets xref
  let off = header.length;
  const xo: number[] = [];
  for (const chunk of [o1, o2, o3, o4, o5]) { xo.push(off); off += chunk.length; }
  xo.push(off); // offset obj 6
  off += o6h.length + streamBytes.length + o6f.length;
  const xrefStart = off;

  // Table xref (chaque entrée = exactement 20 octets)
  const pad = (n: number) => n.toString().padStart(10, '0');
  let xref = `xref\n0 7\n0000000000 65535 f \n`;
  for (const o of xo) xref += `${pad(o)} 00000 n \n`;
  xref += `trailer\n<</Size 7 /Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF\n`;
  const xrefBytes = enc.encode(xref);

  // Assemblage
  const chunks = [header, o1, o2, o3, o4, o5, o6h, streamBytes, o6f, xrefBytes];
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const pdf = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { pdf.set(chunk, pos); pos += chunk.length; }

  return pdf;
}
