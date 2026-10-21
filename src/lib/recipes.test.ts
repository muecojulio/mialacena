import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeName,
  pantryIngredients,
  parseMealList,
  rankRecipes,
  scoreRecipe,
  type PantryIngredient,
} from "./recipes.ts";
import type { PantryItem } from "./types.ts";

function item(partial: Partial<PantryItem>): PantryItem {
  return {
    id: partial.id ?? partial.name ?? "x",
    name: "Producto",
    brand: "",
    category: "Abarrotes",
    targetQty: 1,
    currentQty: 1,
    unit: "pza",
    usualPrice: 0,
    ...partial,
  };
}

describe("pantryIngredients", () => {
  it("traduce básicos, salta limpieza y ordena por caducidad", () => {
    const rows = pantryIngredients(
      [
        item({ name: "Huevo", expiresAt: "2026-10-25" }),
        item({ name: "Leche Entera 1L", expiresAt: "2026-10-23" }),
        item({ name: "Cloro", category: "Limpieza" }),
        item({ name: "Atún en agua", category: "Abarrotes" }),
        item({ name: "Café soluble", currentQty: 0 }),
        item({ name: "Cosa rara intraducible" }),
      ],
      null,
      "2026-10-21",
    );
    assert.deepEqual(
      rows.map((row) => row.en),
      ["milk", "egg", "tuna"],
    );
    assert.equal(rows[0].daysLeft, 2);
  });
});

/** Forma real de `lookup.php` de TheMealDB (recortada): pollo teriyaki. */
const MEAL = {
  meals: [
    {
      idMeal: "52772",
      strMeal: "Teriyaki Chicken Casserole",
      strCategory: "Chicken",
      strArea: "Japanese",
      strMealThumb: "https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg",
      strIngredient1: "soy sauce",
      strIngredient2: "water",
      strIngredient3: "brown sugar",
      strIngredient4: "ground ginger",
      strIngredient5: "chicken breasts",
      strIngredient6: "brown rice",
      strIngredient7: "",
    },
  ],
};

describe("scoreRecipe", () => {
  const pantry: PantryIngredient[] = [
    { en: "chicken", daysLeft: null, item: item({ name: "Pollo" }) },
    { en: "rice", daysLeft: null, item: item({ name: "Arroz" }) },
    { en: "sugar", daysLeft: null, item: item({ name: "Azúcar" }) },
  ];

  it("cruza ingredientes con la despensa y traduce faltantes", () => {
    const recipe = scoreRecipe(MEAL, pantry);
    assert.ok(recipe);
    assert.equal(recipe.title, "Teriyaki Chicken Casserole");
    // chicken breasts + brown rice + brown sugar (contiene sugar); el agua no cuenta.
    assert.equal(recipe.have.length, 3);
    assert.deepEqual(
      recipe.missing.map((m) => m.en),
      ["soy sauce", "ground ginger"],
    );
  });

  it("sin receta válida devuelve null", () => {
    assert.equal(scoreRecipe({ meals: null }, pantry), null);
    assert.equal(scoreRecipe(null, pantry), null);
  });
});

describe("parseMealList / rankRecipes / normalizeName", () => {
  it("lee filter.php y descarta filas incompletas", () => {
    const list = parseMealList({
      meals: [
        { idMeal: "1", strMeal: "Uno", strMealThumb: "https://x/y.jpg" },
        { idMeal: "", strMeal: "Sin id" },
        { idMeal: "2", strMeal: "" },
      ],
    });
    assert.deepEqual(list.map((m) => m.id), ["1"]);
    assert.deepEqual(parseMealList({ meals: null }), []);
  });

  it("ordena: más a la mano y menos faltantes primero", () => {
    const mk = (id: string, have: number, missing: number) => ({
      id,
      title: id,
      sourceUrl: "",
      have: Array(have).fill("x"),
      missing: Array(missing).fill({ en: "y", es: "y" }),
    });
    const ranked = rankRecipes([mk("a", 1, 5), mk("b", 4, 1), mk("c", 2, 2)]);
    assert.deepEqual(ranked.map((r) => r.id), ["b", "c", "a"]);
  });

  it("normaliza acentos y símbolos", () => {
    assert.equal(normalizeName("Atún en Agua 140g"), "atun en agua 140g");
  });
});
