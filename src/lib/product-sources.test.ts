import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_SOURCES,
  findProductByCode,
  parseCatalogSearch,
  productSourceLabel,
  sourceProductUrl,
  sourceSearchUrl,
} from "./product-sources.ts";

/** Respuesta de Open Beauty Facts (misma forma que Open Food Facts). */
const BEAUTY = {
  code: "7501020534605",
  status: 1,
  product: {
    product_name: "Jabón de tocador",
    brands: "Zest",
    image_url: "https://images.openbeautyfacts.org/images/products/750/102/053/4605/front_es.3.400.jpg",
    categories_tags: ["en:soaps"],
    quantity: "150 g",
    product_quantity: 150,
    product_quantity_unit: "g",
  },
};

describe("catálogo de servicios de la familia Open * Facts", () => {
  it("cotiza alimentos, higiene y limpieza, con la API de cada host", () => {
    assert.deepEqual(
      PRODUCT_SOURCES.map((row) => row.id),
      ["openfoodfacts", "openbeautyfacts", "openproductsfacts"],
    );
    assert.equal(
      sourceProductUrl("openbeautyfacts", "12345"),
      "https://world.openbeautyfacts.org/api/v2/product/12345.json?fields=" +
        new URL(sourceProductUrl("openbeautyfacts", "12345")).searchParams.get("fields"),
    );
    assert.match(sourceProductUrl("openproductsfacts", "999"), /^https:\/\/world\.openproductsfacts\.org\//);
    assert.match(sourceSearchUrl("openbeautyfacts", "jabón"), /cgi\/search\.pl/);
    assert.equal(productSourceLabel("openproductsfacts"), "Open Products Facts");
    assert.equal(productSourceLabel("openfoodfacts"), "Open Food Facts");
  });
});

describe("parseCatalogSearch", () => {
  it("entiende la búsqueda nueva de Open Food Facts", () => {
    const hits = parseCatalogSearch({
      hits: [
        { code: "1", product_name: "Leche Entera", brands: ["Lala"] },
        { code: "2", product_name: "Leche Entera", brands: ["Lala"] },
        { code: "3", product_name: "  ", brands: ["X"] },
        { code: "4", product_name: "Yogurt Natural", brands: "Danone, Otra" },
      ],
    });
    assert.equal(hits.length, 2);
    assert.deepEqual(hits[0], { code: "1", name: "Leche Entera", brand: "Lala" });
    assert.equal(hits[1].brand, "Danone");
  });

  it("entiende la búsqueda clásica y tope de 6", () => {
    const products = Array.from({ length: 12 }, (_, i) => ({
      code: String(i),
      product_name: `Producto ${i}`,
      brands: "Marca",
    }));
    const hits = parseCatalogSearch({ products });
    assert.equal(hits.length, 6);
    assert.deepEqual(parseCatalogSearch({}), []);
    assert.equal(parseCatalogSearch(null).length, 0);
  });
});

describe("findProductByCode", () => {
  it("sigue la cadena hasta el servicio que conoce el código", async () => {
    const asked: string[] = [];
    const fetcher = async (url: string) => {
      asked.push(new URL(url).host);
      if (url.includes("openfoodfacts.org")) return { status: 0 };
      if (url.includes("openbeautyfacts.org")) return BEAUTY;
      return null;
    };
    const found = await findProductByCode("7501020534605", fetcher);
    assert.ok(found.product);
    assert.equal(found.product.source, "openbeautyfacts");
    assert.equal(found.product.name, "Jabón de tocador");
    assert.match(found.product.webUrl, /openbeautyfacts\.org\/product\/7501020534605/);
    assert.deepEqual(asked, ["world.openfoodfacts.org", "world.openbeautyfacts.org"]);
  });

  it("distingue «no lo conozco» de «no hubo respuesta»", async () => {
    const unknown = await findProductByCode("111111", async () => ({ status: 0 }));
    assert.equal(unknown.product, null);
    assert.equal(unknown.answered, true);

    const offline = await findProductByCode("222222", async () => null);
    assert.equal(offline.product, null);
    assert.equal(offline.answered, false);
  });

  it("no repite la consulta de un código desconocido (caché negativa)", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { status: 0 };
    };
    await findProductByCode("333333", fetcher);
    const first = calls;
    await findProductByCode("333333", fetcher);
    assert.equal(calls, first);
  });
});
