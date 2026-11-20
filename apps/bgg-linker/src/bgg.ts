import { XMLParser } from "fast-xml-parser";

export interface BggSearchItem {
  id: number;
  name: string;
  year?: number;
}

export interface BggThing extends BggSearchItem {
  alternateNames: string[];
  average?: number;
  bayesAverage?: number;
  usersRated?: number;
  rank?: number;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

function arrayOf<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function numberOf(value: unknown): number | undefined {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseSearchXml(xml: string): BggSearchItem[] {
  const root = parser.parse(xml) as { items?: { item?: unknown } };
  return arrayOf(root.items?.item as Record<string, unknown> | Record<string, unknown>[] | undefined)
    .map((item): BggSearchItem | undefined => {
      const names = arrayOf(item.name as Record<string, unknown> | Record<string, unknown>[] | undefined);
      const name = names.find((entry) => entry.type === "primary")?.value ?? names[0]?.value;
      const id = numberOf(item.id);
      if (!id || typeof name !== "string") return undefined;
      return { id, name, year: numberOf((item.yearpublished as Record<string, unknown> | undefined)?.value) };
    })
    .filter((item): item is BggSearchItem => Boolean(item));
}

export function parseThingsXml(xml: string): BggThing[] {
  const root = parser.parse(xml) as { items?: { item?: unknown } };
  return arrayOf(root.items?.item as Record<string, unknown> | Record<string, unknown>[] | undefined)
    .map((item): BggThing | undefined => {
      const names = arrayOf(item.name as Record<string, unknown> | Record<string, unknown>[] | undefined);
      const primary = names.find((entry) => entry.type === "primary")?.value;
      const id = numberOf(item.id);
      if (!id || typeof primary !== "string") return undefined;

      const statistics = item.statistics as Record<string, unknown> | undefined;
      const ratings = statistics?.ratings as Record<string, unknown> | undefined;
      const ranks = arrayOf((ratings?.ranks as Record<string, unknown> | undefined)?.rank as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | undefined);
      const boardGameRank = ranks.find((rank) => rank.name === "boardgame");

      return {
        id,
        name: primary,
        alternateNames: names
          .map((entry) => entry.value)
          .filter((value): value is string => typeof value === "string" && value !== primary),
        year: numberOf((item.yearpublished as Record<string, unknown> | undefined)?.value),
        average: numberOf((ratings?.average as Record<string, unknown> | undefined)?.value),
        bayesAverage: numberOf((ratings?.bayesaverage as Record<string, unknown> | undefined)?.value),
        usersRated: numberOf((ratings?.usersrated as Record<string, unknown> | undefined)?.value),
        rank: numberOf(boardGameRank?.value)
      };
    })
    .filter((item): item is BggThing => Boolean(item));
}

function comparable(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function chooseBestMatch(query: string, games: BggThing[]): BggThing | undefined {
  const normalizedQuery = comparable(query);
  const exact = games.find((game) =>
    [game.name, ...game.alternateNames].some((name) => comparable(name) === normalizedQuery)
  );
  return exact ?? games[0];
}
