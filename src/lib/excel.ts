import { lineAmount, mxn } from "@/lib/money";
import type { ShopList } from "@/lib/types";

function xml(value: string): string {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  return value.replace(/&/g, amp).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, quot);
}

function cell(value: string | number, style: string, type: "String" | "Number" = "String"): string {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="${type}">${
    type === "Number" ? value : xml(String(value))
  }</Data></Cell>`;
}

export function workbookXml(list: ShopList): string {
  const rows = list.lines
    .map((line, index) => {
      const style = index % 2 === 0 ? "base" : "alt";
      const amount = lineAmount(line.qty, line.unitPrice);
      return `<Row>
        ${cell(line.name, style)}
        ${cell(line.brand || "—", style)}
        ${cell(line.qty, "qty", "Number")}
        ${cell(line.unit, style)}
        ${cell(line.unitPrice, "money", "Number")}
        ${cell(line.inCart ? "Sí" : "No", line.inCart ? "yes" : style)}
        ${cell(amount, "money", "Number")}
      </Row>`;
    })
    .join("");

  const total = list.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0);
  const carried = list.lines
    .filter((line) => line.inCart)
    .reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0);
  const when = new Date(list.updatedAt).toLocaleString("es-MX");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="title"><Font ss:Bold="1" ss:Size="20" ss:FontName="Georgia" ss:Color="#1C1915"/></Style>
  <Style ss:ID="sub"><Font ss:Size="11" ss:FontName="Calibri" ss:Color="#6F695F"/></Style>
  <Style ss:ID="head"><Font ss:Bold="1" ss:FontName="Calibri" ss:Color="#FFF8F3"/><Interior ss:Color="#C4622D" ss:Pattern="Solid"/></Style>
  <Style ss:ID="base"><Font ss:FontName="Calibri" ss:Color="#1C1915"/><Interior ss:Color="#FFFDF8" ss:Pattern="Solid"/></Style>
  <Style ss:ID="alt"><Font ss:FontName="Calibri" ss:Color="#1C1915"/><Interior ss:Color="#F6F1E7" ss:Pattern="Solid"/></Style>
  <Style ss:ID="money"><Font ss:FontName="Calibri" ss:Color="#1C1915"/><NumberFormat ss:Format="$#,##0.00"/><Interior ss:Color="#FFFDF8" ss:Pattern="Solid"/></Style>
  <Style ss:ID="qty"><Font ss:FontName="Calibri" ss:Color="#1C1915"/><NumberFormat ss:Format="0.##"/></Style>
  <Style ss:ID="yes"><Font ss:Bold="1" ss:FontName="Calibri" ss:Color="#3F6B4E"/></Style>
  <Style ss:ID="total"><Font ss:Bold="1" ss:Size="12" ss:FontName="Calibri" ss:Color="#1C1915"/><Interior ss:Color="#EBE4D6" ss:Pattern="Solid"/></Style>
  <Style ss:ID="totaln"><Font ss:Bold="1" ss:Size="12" ss:FontName="Calibri" ss:Color="#1C1915"/><Interior ss:Color="#EBE4D6" ss:Pattern="Solid"/><NumberFormat ss:Format="$#,##0.00"/></Style>
</Styles>
<Worksheet ss:Name="Lista">
<Table>
  <Column ss:Width="160"/><Column ss:Width="120"/><Column ss:Width="70"/><Column ss:Width="70"/>
  <Column ss:Width="90"/><Column ss:Width="80"/><Column ss:Width="100"/>
  <Row ss:Height="28"><Cell ss:StyleID="title" ss:MergeAcross="6"><Data ss:Type="String">mialacena · ${xml(list.title)}</Data></Cell></Row>
  <Row><Cell ss:StyleID="sub" ss:MergeAcross="6"><Data ss:Type="String">${xml(when)} · Los precios los pusiste tú. Total visible también en la app: ${xml(mxn(total))}</Data></Cell></Row>
  <Row>
    ${cell("Producto", "head")}${cell("Marca", "head")}${cell("Cantidad", "head")}${cell("Unidad", "head")}
    ${cell("Precio", "head")}${cell("Ya lo llevo", "head")}${cell("Importe", "head")}
  </Row>
  ${rows}
  <Row>
    ${cell("Total de la lista", "total")}${cell("", "total")}${cell("", "total")}${cell("", "total")}
    ${cell("", "total")}${cell("", "total")}${cell(total, "totaln", "Number")}
  </Row>
  <Row>
    ${cell("Ya en el carrito", "total")}${cell("", "total")}${cell("", "total")}${cell("", "total")}
    ${cell("", "total")}${cell("", "total")}${cell(carried, "totaln", "Number")}
  </Row>
</Table>
</Worksheet>
</Workbook>`;
}

export function downloadExcel(list: ShopList): void {
  const blob = new Blob([workbookXml(list)], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = list.updatedAt.slice(0, 10);
  link.href = url;
  link.download = `mialacena-${day}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
