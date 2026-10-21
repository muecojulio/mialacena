export type TicketItem = {
  name: string;
  price: number;
  qty?: number;
};

export type TicketParseResult = {
  items: TicketItem[];
  total?: number;
};

/**
 * Robust client-side ticket OCR parser that understands standard receipts
 * (supermercados: Walmart, Soriana, Chedraui, Oxxo, Bodega Aurrera, etc.)
 * Even if OCR is simulated or from uploaded text/images, this cleans and extracts lines.
 */
export function parseTicketText(text: string): TicketParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: TicketItem[] = [];
  let detectedTotal: number | undefined;

  // Patterns for prices: e.g. "$ 45.50", "45.50", "45,50", "120.00 MXN"
  const priceRegex = /(?:\$|\b)\s*(\d+(?:[.,]\d{2}))(?:\s*(?:MXN|PESOS|\$))?\s*$/i;
  const totalKeywords = /(total|importe total|total a pagar|total pagado|pago|monto)/i;
  const skipKeywords = /(cambio|iva|efectivo|tarjeta|subtotal|descuento|folio|rfc|ticket|caja|cajero|fecha|hora|gracias|bienvenido|telefono|articulos|piezas)/i;

  for (const line of lines) {
    if (totalKeywords.test(line) && !line.toLowerCase().includes("subtotal")) {
      const match = line.match(/(?:\$|\b)\s*(\d+(?:[.,]\d{2}))/);
      if (match) {
        detectedTotal = parseFloat(match[1].replace(",", "."));
      }
      continue;
    }

    if (skipKeywords.test(line)) {
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(",", ".");
      const price = parseFloat(priceStr);
      let namePart = line.slice(0, priceMatch.index).trim();
      namePart = namePart.replace(/^[\d\s*#xX.-]+/, "").trim(); // strip leading codes/qty

      if (namePart.length >= 2 && !isNaN(price) && price > 0) {
        items.push({
          name: namePart,
          price: Math.round(price * 100) / 100,
          qty: 1,
        });
      }
    }
  }

  return { items, total: detectedTotal };
}
