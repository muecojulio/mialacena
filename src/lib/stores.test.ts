import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildOverpassQuery, formatDistance, haversineM, parseOverpassStores } from "./stores.ts";

/** Forma real de Overpass: nodos con lat/lon y vías con `center`. */
const OVERPASS = {
  elements: [
    {
      type: "node",
      id: 111,
      lat: 19.433,
      lon: -99.1335,
      tags: { shop: "convenience", name: "OXXO Zócalo", brand: "OXXO" },
    },
    {
      type: "way",
      id: 222,
      center: { lat: 19.44, lon: -99.14 },
      tags: { shop: "supermarket", name: "Bodega Aurrera", brand: "Bodega Aurrera" },
    },
    // Sin coordenadas útiles: se salta.
    { type: "relation", id: 333, tags: { shop: "supermarket", name: "Fantasma" } },
    // Sin nombre: usa la clase de tienda.
    {
      type: "node",
      id: 444,
      lat: 19.4328,
      lon: -99.1331,
      tags: { shop: "supermarket" },
    },
  ],
};

const ORIGIN = { lat: 19.4326, lon: -99.1332 }; // Zócalo, CDMX

describe("parseOverpassStores", () => {
  it("ordena por distancia y arma enlaces de mapa/ruta", () => {
    const stores = parseOverpassStores(OVERPASS, ORIGIN);
    assert.equal(stores.length, 3);
    assert.ok(stores[0].distanceM <= stores[1].distanceM);
    assert.ok(stores[1].distanceM <= stores[2].distanceM);
    const oxxo = stores.find((s) => s.name.startsWith("OXXO"));
    assert.equal(oxxo?.kind, "Tienda");
    assert.ok(oxxo?.mapUrl.endsWith("/node/111"));
    assert.ok(oxxo?.directionsUrl.includes("directions?to="));
    const unnamed = stores.find((s) => s.id === "node/444");
    assert.equal(unnamed?.name, "Súper");
  });

  it("respuesta vacía o rota = lista vacía", () => {
    assert.deepEqual(parseOverpassStores(null, ORIGIN), []);
    assert.deepEqual(parseOverpassStores({}, ORIGIN), []);
  });
});

describe("haversineM / formatDistance / buildOverpassQuery", () => {
  it("distancia cero y distancia conocida (~111 km por grado)", () => {
    assert.equal(haversineM(19.43, -99.13, 19.43, -99.13), 0);
    const oneDegree = haversineM(0, 0, 1, 0);
    assert.ok(oneDegree > 110_000 && oneDegree < 112_000);
  });

  it("formatea en m y km", () => {
    assert.equal(formatDistance(250), "250 m");
    assert.equal(formatDistance(1500), "1,5 km");
  });

  it("la consulta pide súpers/tiendas en el radio con salida `center`", () => {
    const q = buildOverpassQuery(19.43, -99.13, 2000);
    assert.match(q, /around:2000,19\.43,-99\.13/);
    assert.match(q, /supermarket/);
    assert.match(q, /out center/);
  });
});
