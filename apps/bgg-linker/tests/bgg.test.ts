import { describe, expect, it } from "vitest";
import { chooseBestMatch, parseSearchXml, parseThingsXml } from "../src/bgg";

describe("BGG XML parsing", () => {
  it("parses search results", () => {
    const games = parseSearchXml(`
      <items total="1">
        <item type="boardgame" id="224517">
          <name type="primary" value="Brass: Birmingham" />
          <yearpublished value="2018" />
        </item>
      </items>
    `);
    expect(games).toEqual([{ id: 224517, name: "Brass: Birmingham", year: 2018 }]);
  });

  it("reads ratings and matches an alternate localized name", () => {
    const games = parseThingsXml(`
      <items>
        <item type="boardgame" id="123">
          <name type="primary" value="The Crew" />
          <name type="alternate" value="Die Crew" />
          <yearpublished value="2019" />
          <statistics><ratings>
            <usersrated value="12345" />
            <average value="7.85" />
            <bayesaverage value="7.62" />
            <ranks><rank type="subtype" name="boardgame" value="42" /></ranks>
          </ratings></statistics>
        </item>
      </items>
    `);
    expect(chooseBestMatch("Die Crew", games)).toMatchObject({
      id: 123,
      average: 7.85,
      usersRated: 12345,
      rank: 42
    });
  });
});
