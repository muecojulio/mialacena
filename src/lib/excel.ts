import { zipStore } from "./zip.ts";
import { lineAmount, mxn } from "./money.ts";
import type { ShopList } from "./types.ts";

export type CategorySubtotal = {
  category: string;
  count: number;
  total: number;
  carried: number;
};

export const SUPERMARKET_AISLE_ORDER = [
  "Lácteos y huevo",
  "Frutas y verduras",
  "Abarrotes",
  "Bebidas",
  "Limpieza",
  "Botanas",
  "Otros",
] as const;

export function categoryTotals(list: ShopList): CategorySubtotal[] {
  const byCat = new Map<string, CategorySubtotal>();
  for (const line of list.lines) {
    const category = line.category?.trim() || "Abarrotes";
    const amount = lineAmount(line.qty, line.unitPrice);
    const current = byCat.get(category) ?? {
      category,
      count: 0,
      total: 0,
      carried: 0,
    };
    current.count += 1;
    current.total = Math.round((current.total + amount) * 100) / 100;
    if (line.inCart) {
      current.carried = Math.round((current.carried + amount) * 100) / 100;
    }
    byCat.set(category, current);
  }
  const orderOf = (cat: string) => {
    const idx = (SUPERMARKET_AISLE_ORDER as readonly string[]).indexOf(cat);
    return idx === -1 ? 999 : idx;
  };
  return Array.from(byCat.values()).sort((a, b) => orderOf(a.category) - orderOf(b.category));
}

export function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Column letters for the seven columns we always write. */
const COLS = ["A", "B", "C", "D", "E", "F", "G"];

const HEADERS = ["Producto", "Marca", "Cantidad", "Unidad", "Precio", "¿Ya lo llevo?", "Importe"];

// Style ids — must match the cellXfs order in styles.xml below.
const S = {
  title: 1,
  subtitle: 2,
  header: 3,
  base: 4,
  alt: 5,
  money: 6,
  moneyAlt: 7,
  qty: 8,
  qtyAlt: 9,
  yes: 10,
  yesAlt: 11,
  totalLabel: 12,
  totalMoney: 13,
} as const;

function textCell(ref: string, style: number, value: string): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function numCell(ref: string, style: number, value: number): string {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

function row(r: number, cells: string, height?: number): string {
  const ht = height ? ` ht="${height}" customHeight="1"` : "";
  return `<row r="${r}"${ht}>${cells}</row>`;
}

export function sheetXml(list: ShopList): string {
  const lines = list.lines;
  const firstDataRow = 5;
  const lastDataRow = firstDataRow + Math.max(lines.length, 1) - 1;
  const totalRow = lastDataRow + 2;
  const carriedRow = lastDataRow + 3;

  const total =
    Math.round(lines.reduce((sum, l) => sum + lineAmount(l.qty, l.unitPrice), 0) * 100) / 100;
  const carried =
    Math.round(
      lines.filter((l) => l.inCart).reduce((sum, l) => sum + lineAmount(l.qty, l.unitPrice), 0) *
        100,
    ) / 100;
  const when = new Date(list.updatedAt).toLocaleString("es-MX");

  const c = (index: number, r: number) => `${COLS[index]}${r}`;

  const dataRows = lines
    .map((line, index) => {
      const r = firstDataRow + index;
      const alt = index % 2 === 1;
      const amount = lineAmount(line.qty, line.unitPrice);
      const carried = line.inCart;
      return row(
        r,
        [
          textCell(c(0, r), alt ? S.alt : S.base, line.name),
          textCell(c(1, r), alt ? S.alt : S.base, line.brand || "—"),
          numCell(c(2, r), alt ? S.qtyAlt : S.qty, line.qty),
          textCell(c(3, r), alt ? S.alt : S.base, line.unit),
          numCell(c(4, r), alt ? S.moneyAlt : S.money, line.unitPrice),
          textCell(
            c(5, r),
            carried ? (alt ? S.yesAlt : S.yes) : alt ? S.alt : S.base,
            carried ? "Sí" : "No",
          ),
          numCell(c(6, r), alt ? S.moneyAlt : S.money, amount),
        ].join(""),
      );
    })
    .join("");

  const headerCells = HEADERS.map((label, index) => textCell(c(index, 4), S.header, label)).join(
    "",
  );

  const titleText = `mialacena · ${list.title}`;
  const subText = `${when} · ${lines.length} producto${lines.length === 1 ? "" : "s"} · los precios los pusiste tú · total en la app: ${mxn(total)}`;

  const catTotals = categoryTotals(list);
  const catHeaderRow = carriedRow + 2;
  const categoryBlock =
    catTotals.length > 0
      ? [
          row(
            catHeaderRow,
            [
              textCell(c(0, catHeaderRow), S.header, "Total por categoría"),
              textCell(c(1, catHeaderRow), S.header, ""),
              textCell(c(2, catHeaderRow), S.header, "Productos"),
              textCell(c(3, catHeaderRow), S.header, ""),
              textCell(c(4, catHeaderRow), S.header, ""),
              textCell(c(5, catHeaderRow), S.header, "En carrito"),
              textCell(c(6, catHeaderRow), S.header, "Importe"),
            ].join(""),
            20,
          ),
          ...catTotals.map((cat, idx) => {
            const r = catHeaderRow + 1 + idx;
            const alt = idx % 2 === 1;
            return row(
              r,
              [
                textCell(c(0, r), alt ? S.alt : S.base, cat.category),
                textCell(c(1, r), alt ? S.alt : S.base, ""),
                numCell(c(2, r), alt ? S.qtyAlt : S.qty, cat.count),
                textCell(c(3, r), alt ? S.alt : S.base, "art."),
                textCell(c(4, r), alt ? S.alt : S.base, ""),
                numCell(c(5, r), alt ? S.moneyAlt : S.money, cat.carried),
                numCell(c(6, r), alt ? S.moneyAlt : S.money, cat.total),
              ].join(""),
            );
          }),
        ].join("")
      : "";

  const finalRow = catTotals.length > 0 ? catHeaderRow + catTotals.length : carriedRow;

  const body = [
    row(1, textCell("A1", S.title, titleText), 34),
    row(2, textCell("A2", S.subtitle, subText), 18),
    row(4, headerCells, 22),
    dataRows,
    row(
      totalRow,
      [
        textCell(c(0, totalRow), S.totalLabel, "Total de la lista"),
        textCell(c(1, totalRow), S.totalLabel, ""),
        textCell(c(2, totalRow), S.totalLabel, ""),
        textCell(c(3, totalRow), S.totalLabel, ""),
        textCell(c(4, totalRow), S.totalLabel, ""),
        textCell(c(5, totalRow), S.totalLabel, ""),
        numCell(c(6, totalRow), S.totalMoney, total),
      ].join(""),
      20,
    ),
    row(
      carriedRow,
      [
        textCell(c(0, carriedRow), S.totalLabel, "Ya en el carrito"),
        textCell(c(1, carriedRow), S.totalLabel, ""),
        textCell(c(2, carriedRow), S.totalLabel, ""),
        textCell(c(3, carriedRow), S.totalLabel, ""),
        textCell(c(4, carriedRow), S.totalLabel, ""),
        textCell(c(5, carriedRow), S.totalLabel, ""),
        numCell(c(6, carriedRow), S.totalMoney, carried),
      ].join(""),
      20,
    ),
    categoryBlock,
  ].join("");

  // An empty list has no row 5, and Excel rejects an autoFilter over nothing.
  const filter = lines.length > 0 ? `\n<autoFilter ref="A4:G${lastDataRow}"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:G${finalRow}"/>
<sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>
<col min="1" max="1" width="34" customWidth="1"/>
<col min="2" max="2" width="22" customWidth="1"/>
<col min="3" max="3" width="11" customWidth="1"/>
<col min="4" max="4" width="10" customWidth="1"/>
<col min="5" max="5" width="14" customWidth="1"/>
<col min="6" max="6" width="14" customWidth="1"/>
<col min="7" max="7" width="16" customWidth="1"/>
</cols>
<sheetData>${body}</sheetData>${filter}
<mergeCells count="2"><mergeCell ref="A1:G1"/><mergeCell ref="A2:G2"/></mergeCells>
</worksheet>`;
}

export const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2">
<numFmt numFmtId="164" formatCode="$#,##0.00"/>
<numFmt numFmtId="165" formatCode="0.##"/>
</numFmts>
<fonts count="6">
<font><sz val="11"/><name val="Calibri"/><color rgb="FF1C1915"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFF8F3"/></font>
<font><b/><sz val="16"/><name val="Georgia"/><color rgb="FF1C1915"/></font>
<font><i/><sz val="10"/><name val="Calibri"/><color rgb="FF6F695F"/></font>
<font><b/><sz val="12"/><name val="Calibri"/><color rgb="FF1C1915"/></font>
<font><b/><sz val="11"/><name val="Calibri"/><color rgb="FF3F6B4E"/></font>
</fonts>
<fills count="6">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFC4622D"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFFDF8"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF6F1E7"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEBE4D6"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="14">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="0" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="165" fontId="0" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
<xf numFmtId="164" fontId="4" fillId="5" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"><alignment vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function workbookParts(list: ShopList): { name: string; data: string }[] {
  return [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Lista" sheetId="1" r:id="rId1"/></sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: "xl/styles.xml", data: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(list) },
  ];
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function xlsxBlob(list: ShopList): Blob {
  return zipStore(workbookParts(list), XLSX_MIME);
}

export function downloadExcel(list: ShopList): void {
  const url = URL.createObjectURL(xlsxBlob(list));
  const link = document.createElement("a");
  link.href = url;
  link.download = `mialacena-${list.updatedAt.slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
