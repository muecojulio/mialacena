import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseNominatimPlace, reverseGeocodeUrl } from "./geo.ts";

/** Respuesta real (recortada) de Nominatim `reverse?format=jsonv2`. */
const COYOACAN = {
  place_id: 344321,
  display_name: "Calle Francisco Sosa, Santa Catarina, Coyoacán, Ciudad de México, 04010, México",
  address: {
    road: "Calle Francisco Sosa",
    neighbourhood: "Santa Catarina",
    suburb: "Coyoacán",
    city: "Ciudad de México",
    state: "Ciudad de México",
    country: "México",
    country_code: "mx",
  },
};

describe("parseNominatimPlace", () => {
  it("arma una etiqueta corta con colonia y ciudad", () => {
    const place = parseNominatimPlace(COYOACAN);
    assert.ok(place);
    assert.equal(place.short, "Santa Catarina, Ciudad de México");
    assert.match(place.display, /Coyoacán/);
  });

  it("usa la ciudad cuando no hay colonia y no repite estado", () => {
    const place = parseNominatimPlace({
      display_name: "X",
      address: { city: "Puebla", state: "Puebla" },
    });
    assert.ok(place);
    assert.equal(place.short, "Puebla");
  });

  it("rechaza errores y respuestas vacías", () => {
    assert.equal(parseNominatimPlace({ error: "Unable to geocode" }), null);
    assert.equal(parseNominatimPlace(null), null);
    assert.equal(parseNominatimPlace({}), null);
  });

  it("la URL pide JSON en español y coordenadas acotadas", () => {
    const url = new URL(reverseGeocodeUrl(19.3467, -99.1618));
    assert.equal(url.host, "nominatim.openstreetmap.org");
    assert.equal(url.searchParams.get("format"), "jsonv2");
    assert.equal(url.searchParams.get("accept-language"), "es");
    assert.equal(url.searchParams.get("lat"), "19.34670");
    assert.equal(url.searchParams.get("lon"), "-99.16180");
  });
});
