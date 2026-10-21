import { lineAmount, mxn } from "./money.ts";
import type { ShopList } from "./types.ts";

export function formatWhatsAppMessage(list: ShopList): string {
  const title = list.title || "Lista del súper";
  const lines = list.lines;
  
  if (lines.length === 0) {
    return `*${title}*\n(Lista vacía)`;
  }

  const carried = lines.filter((l) => l.inCart);
  const pending = lines.filter((l) => !l.inCart);
  const total = lines.reduce((sum, l) => sum + lineAmount(l.qty, l.unitPrice), 0);

  let msg = `🛒 *${title}*\n`;
  msg += `_mialacena_\n\n`;

  if (pending.length > 0) {
    msg += `*Por comprar (${pending.length}):*\n`;
    for (const item of pending) {
      const brandStr = item.brand ? ` (${item.brand})` : "";
      const priceStr = item.unitPrice > 0 ? ` - ${mxn(item.unitPrice)} c/u = ${mxn(lineAmount(item.qty, item.unitPrice))}` : "";
      const extraTag = item.isExtra ? " [Extra]" : "";
      const essTag = item.isEssential ? " ⚠️" : "";
      msg += `• ${item.qty} ${item.unit} ${item.name}${brandStr}${essTag}${extraTag}${priceStr}\n`;
    }
    msg += "\n";
  }

  if (carried.length > 0) {
    msg += `*Ya en el carrito (${carried.length}):*\n`;
    for (const item of carried) {
      const brandStr = item.brand ? ` (${item.brand})` : "";
      const sub = lineAmount(item.qty, item.unitPrice);
      msg += `✓ ~${item.qty} ${item.unit} ${item.name}${brandStr}~ ${sub > 0 ? `(${mxn(sub)})` : ""}\n`;
    }
    msg += "\n";
  }

  msg += `*Total estimado:* ${mxn(total)}`;
  if (list.spendingBudget && list.spendingBudget > 0) {
    msg += `\n*Tope de gasto:* ${mxn(list.spendingBudget)}`;
  }

  return msg;
}

export function shareViaWhatsApp(list: ShopList): void {
  const text = formatWhatsAppMessage(list);
  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/?text=${encoded}`;
  window.open(url, "_blank");
}
