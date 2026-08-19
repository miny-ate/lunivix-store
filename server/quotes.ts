import PDFDocument from "pdfkit";
import { storagePut } from "./storage";

export type QuoteLine = { description: string; partNumber?: string; quantity: number; unitPrice: number };

function createQuotePdfBuffer(input: { reference: string; customerName: string; validity: string; items: QuoteLine[]; vatRate: number; deliveryNote?: string; leadTime?: string }) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 52, size: "A4" });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    const subtotal = input.items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
    const vat = subtotal * input.vatRate;
    const total = subtotal + vat;
    document.fillColor("#173e35").fontSize(26).text("Lunivix");
    document.fillColor("#61716a").fontSize(9).text("Genuine Commercial Equipment & Spare Parts");
    document.moveDown(3).fillColor("#1e2420").fontSize(19).text("QUOTATION");
    document.fontSize(10).fillColor("#61716a").text(`Reference: ${input.reference}`).text(`Prepared for: ${input.customerName}`).text(`Validity: ${input.validity}`);
    document.moveDown(2).fillColor("#173e35").fontSize(11).text("DESCRIPTION", 52, document.y, { continued: true }).text("QTY", 335, document.y, { continued: true }).text("UNIT PRICE", 400, document.y, { continued: true }).text("TOTAL", 490, document.y);
    document.moveTo(52, document.y + 7).lineTo(543, document.y + 7).strokeColor("#d8ddd7").stroke();
    for (const item of input.items) {
      const lineTop = document.y;
      document.moveDown(.8).fillColor("#1e2420").fontSize(10).text(item.description, 52, lineTop, { width: 265 });
      if (item.partNumber) document.fillColor("#61716a").fontSize(8).text(`Part no.: ${item.partNumber}`, 52, document.y + 2, { width: 265 });
      document.fillColor("#1e2420").fontSize(10).text(String(item.quantity), 345, lineTop).text(`KSh ${item.unitPrice.toLocaleString()}`, 400, lineTop).text(`KSh ${(item.quantity * item.unitPrice).toLocaleString()}`, 490, lineTop);
    }
    document.moveDown(2).moveTo(330, document.y).lineTo(543, document.y).strokeColor("#d8ddd7").stroke();
    const writeTotal = (label: string, amount: number) => { document.moveDown(.6).fillColor("#61716a").fontSize(10).text(label, 360, document.y, { continued: true }).fillColor("#173e35").font("Helvetica-Bold").text(`KSh ${amount.toLocaleString()}`, 490, document.y); document.font("Helvetica"); };
    writeTotal("Subtotal", subtotal); writeTotal(`VAT (${Math.round(input.vatRate * 100)}%)`, vat); writeTotal("TOTAL", total);
    document.moveDown(3).fillColor("#173e35").fontSize(11).text("Commercial notes");
    document.fillColor("#61716a").fontSize(9).text(`Lead time: ${input.leadTime ?? "To be confirmed"}`).text(`Delivery: ${input.deliveryNote ?? "Quoted separately where applicable"}`).text("This quotation is issued by Lunivix Technologies Limited. Supplier costs and internal margins are not disclosed.");
    document.end();
  });
}

export async function generateAndStoreQuotePdf(input: { reference: string; revision: number; customerName: string; validity: string; items: QuoteLine[]; vatRate: number; deliveryNote?: string; leadTime?: string }) {
  const data = await createQuotePdfBuffer(input);
  return storagePut(`quotations/${input.reference}/revision-${input.revision}.pdf`, data, "application/pdf");
}
