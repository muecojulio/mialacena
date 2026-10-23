import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAiRecipes } from "./recipes-ai.ts";

describe("parseAiRecipes", () => {
  it("convierte las sugerencias del respaldo de IA en Recipe", () => {
    const recipes = parseAiRecipes({
      recipes: [
        {
          title: "Huevos rancheros",
          area: "Mexicana",
          category: "Desayuno",
          have: ["huevo", "jitomate", "tortillas"],
          missing: ["frijoles", "agua"],
        },
      ],
    });
    assert.equal(recipes.length, 1);
    const [recipe] = recipes;
    assert.equal(recipe.title, "Huevos rancheros");
    assert.equal(recipe.origin, "ai");
    assert.equal(recipe.sourceUrl, undefined);
    assert.deepEqual(recipe.have, ["huevo", "jitomate", "tortillas"]);
    // El agua nunca es un faltante.
    assert.deepEqual(recipe.missing, [{ en: "frijoles", es: "frijoles" }]);
    assert.match(recipe.id, /^ai-1-huevos-rancheros$/);
  });

  it("descarta basura, títulos cortos, duplicados y pasa de 4 recetas", () => {
    const recipes = parseAiRecipes({
      recipes: [
        { title: "Sopa de arroz", have: ["arroz", "arroz"], missing: [] },
        { title: "ab", have: [], missing: [] },
        "no soy una receta",
        { title: "Tacos de papa", have: ["papa"], missing: ["salsa"] },
        { title: "Quesadillas", have: ["queso"], missing: [] },
        { title: "Sincronizadas", have: ["jamón"], missing: [] },
        { title: "Extra que no cabe", have: [], missing: [] },
      ],
    });
    assert.equal(recipes.length, 4);
    assert.deepEqual(recipes[0].have, ["arroz"]);
    assert.equal(recipes[3].title, "Sincronizadas");
  });

  it("no se rompe con respuestas sin forma", () => {
    assert.deepEqual(parseAiRecipes(null), []);
    assert.deepEqual(parseAiRecipes({}), []);
    assert.deepEqual(parseAiRecipes({ recipes: "nada" }), []);
  });
});
