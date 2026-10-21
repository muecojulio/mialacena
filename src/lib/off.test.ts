import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { allergenLabels, categoryGuess, parseOffProduct } from "./off.ts";

/** Respuesta real (recortada) de la API v2 para Nutella 3017620422003. */
const NUTELLA = {
  code: "3017620422003",
  status: 1,
  product: {
    product_name: "Nutella",
    product_name_es: "Nutella",
    brands: "Nutella, Ferrero",
    image_url: "https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg",
    nutriscore_grade: "e",
    ecoscore_grade: "unknown",
    nova_group: 4,
    allergens_tags: ["en:milk", "en:nuts", "en:soybeans"],
    ingredients_text_es: "AZÚCAR, aceite vegetal, AVELLANAS (13%)",
    quantity: "400 g e",
    product_quantity: 400,
    product_quantity_unit: "g",
    categories_tags: ["en:spreads", "en:sweet-spreads"],
    nutriments: {
      "energy-kcal_100g": 539,
      sugars_100g: 56.3,
      salt_100g: 0.107,
      fat_100g: 30.9,
      proteins_100g: 6.3,
    },
  },
};

describe("parseOffProduct", () => {
  it("convierte la ficha v2 en producto + PublicFacts", () => {
    const parsed = parseOffProduct(NUTELLA, "2026-10-21T00:00:00.000Z");
    assert.ok(parsed);
    assert.equal(parsed.name, "Nutella");
    assert.equal(parsed.brand, "Nutella");
    assert.equal(parsed.packageSize, 400);
    assert.equal(parsed.packageUnit, "g");
    assert.equal(parsed.facts.nutriscore, "e");
    assert.equal(parsed.facts.ecoscore, undefined); // "unknown" no es grado
    assert.equal(parsed.facts.nova, 4);
    assert.deepEqual(parsed.facts.allergens, ["Leche", "Frutos secos", "Soya"]);
    assert.equal(parsed.facts.nutriments?.kcal, 539);
    assert.equal(parsed.facts.nutriments?.salt, 0.11);
    assert.ok(parsed.facts.imageUrl?.startsWith("https://"));
    assert.equal(parsed.facts.fetchedAt, "2026-10-21T00:00:00.000Z");
  });

  it("devuelve null cuando OFF no conoce el código", () => {
    assert.equal(parseOffProduct({ code: "7501020512130", status: 0 }), null);
    assert.equal(parseOffProduct(null), null);
    assert.equal(parseOffProduct("basura"), null);
  });

  it("tolera fichas incompletas sin inventar datos", () => {
    const parsed = parseOffProduct({ code: "12345", status: 1, product: {} });
    assert.ok(parsed);
    assert.equal(parsed.name, "Producto 2345");
    assert.equal(parsed.facts.nutriments, undefined);
    assert.equal(parsed.facts.allergens, undefined);
  });
});

describe("allergenLabels / categoryGuess", () => {
  it("traduce alérgenos conocidos y deja legibles los demás", () => {
    assert.deepEqual(allergenLabels(["en:eggs", "en:celery", "en:otra-cosa"]), [
      "Huevo",
      "Apio",
      "otra cosa",
    ]);
    assert.deepEqual(allergenLabels("nope"), []);
  });

  it("adivina la categoría de la despensa", () => {
    assert.equal(categoryGuess(["en:milks"]), "Lácteos y huevo");
    assert.equal(categoryGuess(["en:carbonated-drinks"]), "Bebidas");
    assert.equal(categoryGuess([]), undefined);
  });
});
