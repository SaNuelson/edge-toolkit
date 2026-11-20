import { chooseBestMatch, parseSearchXml, parseThingsXml } from "./bgg";
import type {
  LookupGameMessage,
  LookupResponse,
  StoredSettings,
  TestConnectionMessage,
  TestConnectionResponse
} from "./types";

const API_ROOT = "https://boardgamegeek.com/xmlapi2";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MIN_REQUEST_INTERVAL = 5_000;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestAt = 0;

interface CachedLookup {
  expiresAt: number;
  response: LookupResponse;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function throttledFetch(url: string, token: string): Promise<string> {
  let release!: () => void;
  const previous = requestQueue;
  requestQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    const wait = Math.max(0, MIN_REQUEST_INTERVAL - (Date.now() - lastRequestAt));
    if (wait) await delay(wait);
    lastRequestAt = Date.now();

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("BGG rejected the application token. Check it in the extension settings.");
      }
      throw new Error(`BGG returned HTTP ${response.status}.`);
    }
    return response.text();
  } finally {
    release();
  }
}

function cacheKey(query: string): string {
  return `lookup:${query.toLocaleLowerCase().replace(/\s+/g, " ").trim()}`;
}

async function lookupCandidate(query: string, token: string): Promise<LookupResponse> {
  const key = cacheKey(query);
  const stored = (await chrome.storage.local.get(key))[key] as CachedLookup | undefined;
  if (stored && stored.expiresAt > Date.now()) return stored.response;

  const searchUrl = `${API_ROOT}/search?query=${encodeURIComponent(query)}&type=boardgame,boardgameexpansion&exact=1`;
  const searchItems = parseSearchXml(await throttledFetch(searchUrl, token));
  if (searchItems.length === 0) return { status: "not-found" };

  const ids = searchItems.slice(0, 20).map((item) => item.id).join(",");
  const thingsUrl = `${API_ROOT}/thing?id=${ids}&stats=1`;
  const game = chooseBestMatch(query, parseThingsXml(await throttledFetch(thingsUrl, token)));
  if (!game) return { status: "not-found" };

  const response: LookupResponse = {
    status: "found",
    game: {
      id: game.id,
      name: game.name,
      year: game.year,
      average: game.average,
      bayesAverage: game.bayesAverage,
      usersRated: game.usersRated,
      rank: game.rank,
      url: `https://boardgamegeek.com/boardgame/${game.id}`
    }
  };
  await chrome.storage.local.set({ [key]: { expiresAt: Date.now() + CACHE_TTL, response } });
  return response;
}

async function handleLookup(message: LookupGameMessage): Promise<LookupResponse> {
  const settings = (await chrome.storage.local.get("bggToken")) as StoredSettings;
  const token = settings.bggToken?.trim();
  if (!token) return { status: "needs-token" };

  try {
    for (const candidate of message.candidates) {
      const response = await lookupCandidate(candidate.name, token);
      if (response.status === "found") return response;
    }
    return { status: "not-found" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "The BGG lookup failed."
    };
  }
}

async function testConnection(message: TestConnectionMessage): Promise<TestConnectionResponse> {
  const token = message.token.trim();
  if (!token) return { ok: false, message: "Enter a BGG application token first." };

  try {
    const games = parseThingsXml(await throttledFetch(`${API_ROOT}/thing?id=13`, token));
    if (games.length === 0) {
      return { ok: false, message: "BGG responded, but the validation response was empty." };
    }
    return { ok: true, message: "Connected to BGG successfully." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "The BGG connection test failed."
    };
  }
}

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (typeof message !== "object" || message === null) return false;

  if ((message as LookupGameMessage).type === "lookup-game") {
    void handleLookup(message as LookupGameMessage).then(sendResponse);
    return true;
  }
  if ((message as TestConnectionMessage).type === "test-connection") {
    void testConnection(message as TestConnectionMessage).then(sendResponse);
    return true;
  }
  return false;
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
