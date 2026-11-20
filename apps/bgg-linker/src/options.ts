import type { StoredSettings, TestConnectionMessage, TestConnectionResponse } from "./types";

const form = document.querySelector<HTMLFormElement>("#settings-form")!;
const tokenInput = document.querySelector<HTMLInputElement>("#bgg-token")!;
const status = document.querySelector<HTMLElement>("#save-status")!;
const testButton = document.querySelector<HTMLButtonElement>("#test-connection")!;

function sendTestMessage(message: TestConnectionMessage): Promise<TestConnectionResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response: TestConnectionResponse | undefined) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response) {
        reject(new Error("The extension service worker returned no response."));
        return;
      }
      resolve(response);
    });
  });
}

async function load(): Promise<void> {
  const settings = (await chrome.storage.local.get("bggToken")) as StoredSettings;
  tokenInput.value = settings.bggToken ?? "";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void chrome.storage.local.set({ bggToken: tokenInput.value.trim() }).then(() => {
    status.dataset.state = "success";
    status.textContent = "Saved locally.";
    window.setTimeout(() => {
      status.textContent = "";
      delete status.dataset.state;
    }, 2_500);
  });
});

testButton.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (!token) {
    status.dataset.state = "error";
    status.textContent = "Enter a token first.";
    return;
  }

  testButton.disabled = true;
  status.dataset.state = "pending";
  status.textContent = "Testing connection…";
  const message: TestConnectionMessage = { type: "test-connection", token };
  void sendTestMessage(message)
    .then((response: TestConnectionResponse) => {
      status.dataset.state = response.ok ? "success" : "error";
      status.textContent = response.message;
    })
    .catch((error: unknown) => {
      status.dataset.state = "error";
      status.textContent = error instanceof Error ? error.message : "Could not contact the extension service worker.";
    })
    .finally(() => {
      testButton.disabled = false;
    });
});

void load();
