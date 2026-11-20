import { detectGameCandidates } from "./detection";
import type { LookupGameMessage, LookupResponse } from "./types";

const HOST_ID = "bgg-linker-root";

function searchUrl(query: string): string {
  return `https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=${encodeURIComponent(query)}`;
}

function createLink(label: string, href: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function render(candidates: ReturnType<typeof detectGameCandidates>): {
  update(response: LookupResponse): void;
} {
  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "closed" });
  const topCandidate = candidates[0]!;

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .card { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; width: 290px;
      box-sizing: border-box; border: 1px solid #d8d0bd; border-radius: 12px; padding: 14px 16px;
      color: #252118; background: #fffdf7; box-shadow: 0 10px 32px rgba(33, 28, 17, .22);
      font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
    .top { display: flex; align-items: start; gap: 10px; }
    .brand { color: #6d4b17; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
    .title { margin-top: 3px; font-weight: 700; }
    .status { margin-top: 8px; color: #655f54; font-size: 12px; }
    .rating { margin-top: 8px; font-size: 20px; font-weight: 750; color: #28643c; }
    .actions { display: flex; align-items: center; gap: 12px; margin-top: 11px; }
    a { color: #76521e; font-weight: 700; text-decoration: none; }
    a:hover { text-decoration: underline; }
    button { margin-left: auto; border: 0; padding: 0; color: #766f63; background: transparent; cursor: pointer;
      font: 18px/1 system-ui, sans-serif; }
  `;

  const card = document.createElement("aside");
  card.className = "card";
  const top = document.createElement("div");
  top.className = "top";
  const copy = document.createElement("div");
  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = "BoardGameGeek";
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = topCandidate.name;
  const close = document.createElement("button");
  close.type = "button";
  close.title = "Dismiss";
  close.setAttribute("aria-label", "Dismiss BGG Linker");
  close.textContent = "×";
  close.addEventListener("click", () => host.remove());
  copy.append(brand, title);
  top.append(copy, close);

  const status = document.createElement("div");
  status.className = "status";
  status.textContent = "Looking for an exact match…";
  const actions = document.createElement("div");
  actions.className = "actions";
  actions.append(createLink("Search BGG ↗", searchUrl(topCandidate.name)));
  card.append(top, status, actions);
  shadow.append(style, card);
  document.documentElement.append(host);

  return {
    update(response) {
      if (response.status === "found") {
        title.textContent = `${response.game.name}${response.game.year ? ` (${response.game.year})` : ""}`;
        status.remove();
        const rating = document.createElement("div");
        rating.className = "rating";
        rating.textContent = response.game.average === undefined ? "Not yet rated" : `${response.game.average.toFixed(1)} / 10`;
        const details = document.createElement("div");
        details.className = "status";
        const parts = [
          response.game.usersRated ? `${response.game.usersRated.toLocaleString()} ratings` : undefined,
          response.game.rank ? `BGG rank #${response.game.rank}` : undefined
        ].filter(Boolean);
        details.textContent = parts.join(" · ");
        actions.replaceChildren(createLink("Open on BGG ↗", response.game.url));
        card.insertBefore(rating, actions);
        if (parts.length) card.insertBefore(details, actions);
        return;
      }

      if (response.status === "needs-token") {
        status.textContent = "Add a BGG application token in the extension settings to show ratings.";
      } else if (response.status === "not-found") {
        status.textContent = "No exact API match. Try the BGG search.";
      } else {
        status.textContent = response.message ?? "BGG lookup unavailable. The search link still works.";
      }
    }
  };
}

async function start(): Promise<void> {
  if (document.getElementById(HOST_ID)) return;
  const candidates = detectGameCandidates(document);
  if (candidates.length === 0) return;

  const view = render(candidates);
  const message: LookupGameMessage = { type: "lookup-game", candidates };
  try {
    const response = (await chrome.runtime.sendMessage(message)) as LookupResponse;
    view.update(response);
  } catch {
    view.update({ status: "error", message: "BGG lookup unavailable. The search link still works." });
  }
}

void start();
