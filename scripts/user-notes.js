/*
 * User Notes for Foundry VTT v14
 * Stores notes in window.localStorage per world and per user.
 */

const LBN_MODULE_ID = "user-notes";
const LBN_WINDOW_ID = "lbn-notes-window";
const LBN_BUTTON_ID = "lbn-open-notes";

let lbnSaveTimer = null;
let lbnObserverTimer = null;

function lbnStorageKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";
  return `${LBN_MODULE_ID}.${worldId}.${userId}.notes`;
}

function lbnPositionKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";
  return `${LBN_MODULE_ID}.${worldId}.${userId}.position`;
}

function lbnLoadNotes() {
  return window.localStorage.getItem(lbnStorageKey()) ?? "";
}

function lbnSaveNotes(value) {
  window.localStorage.setItem(lbnStorageKey(), value);
}

function lbnSetStatus(text) {
  const status = document.querySelector(`#${LBN_WINDOW_ID} .lbn-status`);
  if (status) status.textContent = text;
}

function lbnDebouncedSave(value) {
  window.clearTimeout(lbnSaveTimer);
  lbnSetStatus("Ungespeichert …");
  lbnSaveTimer = window.setTimeout(() => {
    lbnSaveNotes(value);
    lbnSetStatus("Gespeichert");
  }, 250);
}

function lbnRestorePosition(win) {
  try {
    const raw = window.localStorage.getItem(lbnPositionKey());
    if (!raw) return;
    const pos = JSON.parse(raw);
    if (Number.isFinite(pos.left)) win.style.left = `${pos.left}px`;
    if (Number.isFinite(pos.top)) win.style.top = `${pos.top}px`;
    if (Number.isFinite(pos.width)) win.style.width = `${pos.width}px`;
    if (Number.isFinite(pos.height)) win.style.height = `${pos.height}px`;
  } catch (err) {
    console.warn(`${LBN_MODULE_ID} | Could not restore note window position`, err);
  }
}

function lbnSavePosition(win) {
  const rect = win.getBoundingClientRect();
  window.localStorage.setItem(lbnPositionKey(), JSON.stringify({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }));
}

function lbnMakeDraggable(win) {
  const handle = win.querySelector(".lbn-titlebar");
  if (!handle) return;

  let drag = null;

  handle.addEventListener("pointerdown", event => {
    if (event.target.closest("button")) return;

    const rect = win.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top
    };

    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  handle.addEventListener("pointermove", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;

    const nextLeft = Math.max(0, Math.min(window.innerWidth - 80, drag.left + event.clientX - drag.startX));
    const nextTop = Math.max(0, Math.min(window.innerHeight - 40, drag.top + event.clientY - drag.startY));

    win.style.left = `${nextLeft}px`;
    win.style.top = `${nextTop}px`;
  });

  handle.addEventListener("pointerup", event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    lbnSavePosition(win);
  });
}

function lbnOpenNotes() {
  let win = document.getElementById(LBN_WINDOW_ID);

  if (win) {
    win.hidden = false;
    win.classList.add("active");
    win.querySelector("textarea")?.focus();
    return;
  }

  win = document.createElement("section");
  win.id = LBN_WINDOW_ID;
  win.className = "lbn-notes-window";
  win.innerHTML = `
    <header class="lbn-titlebar">
      <div class="lbn-title">
        <i class="fas fa-note-sticky" aria-hidden="true"></i>
        <span>User Notes</span>
      </div>
      <div class="lbn-controls">
        <span class="lbn-status">Gespeichert</span>
        <button type="button" class="lbn-save" title="Jetzt speichern">
          <i class="fas fa-save" aria-hidden="true"></i>
        </button>
        <button type="button" class="lbn-close" title="Schließen">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </header>
    <textarea class="lbn-textarea" spellcheck="true" placeholder="Notizen für diese Welt und diesen Benutzer …"></textarea>
  `;

  document.body.appendChild(win);

  const textarea = win.querySelector(".lbn-textarea");
  textarea.value = lbnLoadNotes();

  textarea.addEventListener("input", event => {
    lbnDebouncedSave(event.currentTarget.value);
  });

  win.querySelector(".lbn-save").addEventListener("click", () => {
    lbnSaveNotes(textarea.value);
    lbnSetStatus("Gespeichert");
  });

  win.querySelector(".lbn-close").addEventListener("click", () => {
    lbnSaveNotes(textarea.value);
    lbnSavePosition(win);
    win.hidden = true;
  });

  new ResizeObserver(() => lbnSavePosition(win)).observe(win);

  lbnRestorePosition(win);
  lbnMakeDraggable(win);
  textarea.focus();
}

function lbnAsHTMLElement(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];      // legacy jQuery-style hook argument
  if (html?.element instanceof HTMLElement) return html.element;
  return null;
}

function lbnFindPlayersElement(renderedElement = null) {
  return renderedElement?.id === "players"
    ? renderedElement
    : renderedElement?.querySelector?.("#players")
      ?? document.querySelector("#players")
      ?? document.querySelector("[data-application-id='players']")
      ?? document.querySelector(".players");
}

function lbnInjectButton(renderedElement = null) {
  const players = lbnFindPlayersElement(renderedElement);
  if (!players || players.querySelector(`#${LBN_BUTTON_ID}`)) return;

  const header =
    players.querySelector(".window-header")
    ?? players.querySelector("header")
    ?? players.querySelector("h3")
    ?? players.querySelector("h2")
    ?? players;

  const button = document.createElement("button");
  button.id = LBN_BUTTON_ID;
  button.type = "button";
  button.className = "lbn-player-note-button";
  button.title = "User Notes öffnen";
  button.setAttribute("aria-label", "User Notes öffnen");
  button.innerHTML = `<i class="fas fa-note-sticky" aria-hidden="true"></i>`;

  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    lbnOpenNotes();
  });

  header.appendChild(button);
}

Hooks.once("ready", () => {
  lbnInjectButton();

  // Fallback: Die Spieler-/Benutzerliste kann bei Theme-, Layout- oder Popout-Änderungen neu gerendert werden.
  const observer = new MutationObserver(() => {
    window.clearTimeout(lbnObserverTimer);
    lbnObserverTimer = window.setTimeout(() => lbnInjectButton(), 100);
  });

  observer.observe(document.body, { childList: true, subtree: true });
});

Hooks.on("renderApplicationV2", (app, html) => {
  const element = lbnAsHTMLElement(html) ?? app?.element ?? null;
  if (app?.constructor?.name === "Players" || lbnFindPlayersElement(element)) {
    window.queueMicrotask(() => lbnInjectButton(element));
  }
});

// Kompatibilitäts-Fallback für Installationen/Module, die noch einen spezifischen PlayerList-Hook auslösen.
Hooks.on("renderPlayerList", (_app, html) => {
  const element = lbnAsHTMLElement(html);
  window.queueMicrotask(() => lbnInjectButton(element));
});
