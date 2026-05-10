import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface InvoiceParams {
  receiptNumber: string;
  date: Date;
  customerEmail: string;
  customerName: string;
  customerCountry: string;
  documentTitle: string;
  amount: number;   // in cents
  currency: string; // 'usd' | 'eur'
  locale: 'en' | 'fr';
}

export async function generateInvoicePDF(params: InvoiceParams): Promise<Uint8Array> {
  const {
    receiptNumber, date, customerEmail, customerName,
    customerCountry, documentTitle, amount, currency, locale,
  } = params;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const black     = rgb(0,    0,    0);
  const darkGray  = rgb(0.25, 0.25, 0.25);
  const midGray   = rgb(0.5,  0.5,  0.5);
  const lightGray = rgb(0.88, 0.88, 0.88);
  const white     = rgb(1,    1,    1);

  // ─── VENDEUR (haut gauche) ────────────────────────────────────────
  let y = height - 55;
  page.drawText('LA DOCUMENTATION TECHNIQUE',          { x: 50, y, size: 12, font: bold,    color: black });
  y -= 15;
  page.drawText('SHOP OF TECHNICAL DOCUMENTATIONS',    { x: 50, y, size: 9,  font: regular, color: darkGray });
  y -= 13;
  // Note: "Lučenecká" simplifié en "Lucenecka" (caractères WinAnsi uniquement)
  page.drawText('Business Hub Lucenecka cesta 2266/6', { x: 50, y, size: 9,  font: regular, color: darkGray });
  y -= 13;
  page.drawText('96096 ZVOLEN',                        { x: 50, y, size: 9,  font: regular, color: darkGray });
  y -= 13;
  page.drawText('Slovaquie',                           { x: 50, y, size: 9,  font: regular, color: darkGray });
  y -= 13;
  page.drawText('RCS 36807516',                        { x: 50, y, size: 9,  font: regular, color: darkGray });

  // ─── TITRE DU DOCUMENT (centré) ───────────────────────────────────
  const titleText = 'FACTURE / INVOICE';
  const titleSize = 22;
  const titleW = bold.widthOfTextAtSize(titleText, titleSize);
  page.drawText(titleText, {
    x: (width - titleW) / 2,
    y: height - 88,
    size: titleSize,
    font: bold,
    color: black,
  });

  const numText = `n° ${receiptNumber}`;
  const numSize = 12;
  const numW = regular.widthOfTextAtSize(numText, numSize);
  page.drawText(numText, {
    x: (width - numW) / 2,
    y: height - 112,
    size: numSize,
    font: regular,
    color: darkGray,
  });

  // ─── SÉPARATEUR ──────────────────────────────────────────────────
  y = height - 140;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: lightGray });

  // ─── DATE ─────────────────────────────────────────────────────────
  y -= 22;
  const dateStr = new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(date);
  page.drawText((locale === 'fr' ? 'Date : ' : 'Date: ') + dateStr, {
    x: 50, y, size: 10, font: regular, color: darkGray,
  });

  // ─── FACTURÉ À ────────────────────────────────────────────────────
  y -= 28;
  page.drawText(locale === 'fr' ? 'Facturé à :' : 'Billed to:', {
    x: 50, y, size: 10, font: bold, color: black,
  });
  y -= 16;
  if (customerName && customerName !== 'Unknown') {
    page.drawText(customerName, { x: 50, y, size: 10, font: regular, color: darkGray });
    y -= 14;
  }
  page.drawText(customerEmail, { x: 50, y, size: 10, font: regular, color: darkGray });
  if (customerCountry && customerCountry !== '—') {
    y -= 14;
    page.drawText(customerCountry, { x: 50, y, size: 10, font: regular, color: darkGray });
  }

  // ─── TABLEAU DES ARTICLES ─────────────────────────────────────────
  y = height - 310;

  // En-tête du tableau
  page.drawRectangle({ x: 50, y: y - 6, width: width - 100, height: 24, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Description',                        { x: 60,  y, size: 9, font: bold, color: white });
  page.drawText(locale === 'fr' ? 'Qté' : 'Qty',{ x: 390, y, size: 9, font: bold, color: white });
  page.drawText(locale === 'fr' ? 'Montant' : 'Amount', { x: 460, y, size: 9, font: bold, color: white });

  // Ligne article
  y -= 28;
  const formattedAmount = new Intl.NumberFormat(locale === 'fr' ? 'fr-FR' : 'en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  // Tronquer le titre pour tenir dans la colonne
  let displayTitle = documentTitle;
  while (regular.widthOfTextAtSize(displayTitle, 9) > 310 && displayTitle.length > 10) {
    displayTitle = displayTitle.slice(0, -4) + '...';
  }

  page.drawText(displayTitle, { x: 60,  y, size: 9, font: regular, color: black });
  page.drawText('1',           { x: 398, y, size: 9, font: regular, color: black });
  page.drawText(formattedAmount, { x: 460, y, size: 9, font: regular, color: black });

  // Ligne de séparation sous l'article
  y -= 14;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: lightGray });

  // Total
  y -= 22;
  page.drawText(locale === 'fr' ? 'Total payé :' : 'Total paid:', {
    x: 330, y, size: 11, font: bold, color: black,
  });
  page.drawText(formattedAmount, { x: 460, y, size: 11, font: bold, color: black });

  // ─── PIED DE PAGE ─────────────────────────────────────────────────
  y = 55;
  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 0.5, color: lightGray });
  y -= 16;
  const footer = 'LA DOCUMENTATION TECHNIQUE — service-manuals-pro.com / service-manuels-pro.fr';
  const footerW = regular.widthOfTextAtSize(footer, 8);
  page.drawText(footer, { x: (width - footerW) / 2, y, size: 8, font: regular, color: midGray });

  return pdfDoc.save();
}
