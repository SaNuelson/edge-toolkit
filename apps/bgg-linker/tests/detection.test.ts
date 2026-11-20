import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { cleanProductName, detectGameCandidates } from "../src/detection";

describe("product detection", () => {
  it("prefers a schema.org Product name", () => {
    const dom = new JSDOM(`
      <script type="application/ld+json">
        {"@context":"https://schema.org","@type":"Product","name":"Brass: Birmingham"}
      </script>
      <meta property="og:title" content="Brass: Birmingham | Example Shop">
      <meta property="og:type" content="product">
      <h1>Brass: Birmingham</h1>
    `);

    expect(detectGameCandidates(dom.window.document)[0]).toMatchObject({
      name: "Brass: Birmingham",
      confidence: 1,
      source: "schema.org Product"
    });
  });

  it("does not activate on an ordinary article", () => {
    const dom = new JSDOM(`<meta property="og:title" content="Top ten games"><h1>Top ten games</h1>`);
    expect(detectGameCandidates(dom.window.document)).toEqual([]);
  });

  it("removes a conventional vendor suffix", () => {
    expect(cleanProductName("Catan | Friendly Local Shop")).toBe("Catan");
  });
});
