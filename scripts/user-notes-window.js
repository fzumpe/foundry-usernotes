import {
  USER_NOTES_MODULE_ID,
  USER_NOTES_WINDOW_ID,
  USER_NOTES_DEFAULT_POSITION,
  USER_NOTES_MIN_WIDTH,
  USER_NOTES_MIN_HEIGHT,
  USER_NOTES_VIEWPORT_MARGIN
} from "./user-notes-constants.js";

import {
  userNotesLoadNotes,
  userNotesSaveNotes,
  userNotesPositionKey,
  userNotesRemoveSavedPosition
} from "./user-notes-storage.js";

import {
  userNotesApplyWindowSettings
} from "./user-notes-settings.js";

import {
  userNotesNormalizeStoredNotesForEditor,
  userNotesSanitizeHtml
} from "./user-notes-sanitize.js";

let userNotesSaveTimer = null;

export function userNotesSetStatus(text) {
  const status = document.querySelector(
    `#${USER_NOTES_WINDOW_ID} .user-notes-status`
  );

  if (status) {
    status.textContent = text;
  }
}

export function userNotesDebouncedSave(value) {
  window.clearTimeout(userNotesSaveTimer);
  userNotesSetStatus("Ungespeichert …");

  userNotesSaveTimer = window.setTimeout(() => {
    userNotesSaveNotes(userNotesSanitizeHtml(value));
    userNotesSetStatus("Gespeichert");
  }, 250);
}

export function userNotesApplyPosition(win, position) {
  win.style.left = `${position.left}px`;
  win.style.top = `${position.top}px`;
  win.style.width = `${position.width}px`;
  win.style.height = `${position.height}px`;
}

export function userNotesClampPosition(position) {
  const viewportWidth = Math.max(
    window.innerWidth,
    USER_NOTES_MIN_WIDTH + USER_NOTES_VIEWPORT_MARGIN
  );

  const viewportHeight = Math.max(
    window.innerHeight,
    USER_NOTES_MIN_HEIGHT + USER_NOTES_VIEWPORT_MARGIN
  );

  const maxWidth = Math.max(
    USER_NOTES_MIN_WIDTH,
    viewportWidth - USER_NOTES_VIEWPORT_MARGIN
  );

  const maxHeight = Math.max(
    USER_NOTES_MIN_HEIGHT,
    viewportHeight - USER_NOTES_VIEWPORT_MARGIN
  );

  const width = Math.max(
    USER_NOTES_MIN_WIDTH,
    Math.min(position.width, maxWidth)
  );

  const height = Math.max(
    USER_NOTES_MIN_HEIGHT,
    Math.min(position.height, maxHeight)
  );

  const maxLeft = Math.max(0, viewportWidth - width - 20);
  const maxTop = Math.max(0, viewportHeight - height - 20);

  const left = Math.max(0, Math.min(position.left, maxLeft));
  const top = Math.max(0, Math.min(position.top, maxTop));

  return {
    left,
    top,
    width,
    height
  };
}

export function userNotesRestorePosition(win) {
  try {
    const raw = window.localStorage.getItem(userNotesPositionKey());

    if (!raw) {
      userNotesApplyPosition(
        win,
        userNotesClampPosition(USER_NOTES_DEFAULT_POSITION)
      );
      return;
    }

    const pos = JSON.parse(raw);

    const restoredPosition = {
      left: Number.isFinite(pos.left) ? pos.left : USER_NOTES_DEFAULT_POSITION.left,
      top: Number.isFinite(pos.top) ? pos.top : USER_NOTES_DEFAULT_POSITION.top,
      width: Number.isFinite(pos.width) ? pos.width : USER_NOTES_DEFAULT_POSITION.width,
      height: Number.isFinite(pos.height) ? pos.height : USER_NOTES_DEFAULT_POSITION.height
    };

    userNotesApplyPosition(
      win,
      userNotesClampPosition(restoredPosition)
    );
  } catch (err) {
    console.warn(
      `${USER_NOTES_MODULE_ID} | Could not restore note window position`,
      err
    );

    userNotesApplyPosition(
      win,
      userNotesClampPosition(USER_NOTES_DEFAULT_POSITION)
    );
  }
}

export function userNotesSavePosition(win) {
  if (!win || win.hidden) {
    return;
  }

  const rect = win.getBoundingClientRect();

  if (rect.width < USER_NOTES_MIN_WIDTH || rect.height < USER_NOTES_MIN_HEIGHT) {
    return;
  }

  const position = userNotesClampPosition({
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  });

  window.localStorage.setItem(
    userNotesPositionKey(),
    JSON.stringify(position)
  );
}

export function userNotesResetPositionAndSize() {
  userNotesRemoveSavedPosition();

  const win = document.getElementById(USER_NOTES_WINDOW_ID);

  if (win) {
    userNotesApplyPosition(
      win,
      userNotesClampPosition(USER_NOTES_DEFAULT_POSITION)
    );

    userNotesSavePosition(win);
  }
}

export function userNotesBringToFront(win) {
  const currentTop = Number.parseInt(win.style.zIndex || "100000", 10);
  win.style.zIndex = String(Math.max(currentTop + 1, 100000));
}

export function userNotesMakeDraggable(win) {
  const handle = win.querySelector(".user-notes-titlebar");

  if (!handle) {
    return;
  }

  let drag = null;

  handle.addEventListener("pointerdown", event => {
    const target = event.target;

    if (target instanceof HTMLElement && target.closest("button")) {
      return;
    }

    const rect = win.getBoundingClientRect();

    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top
    };

    userNotesBringToFront(win);
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", event => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const rect = win.getBoundingClientRect();

    const clamped = userNotesClampPosition({
      left: drag.left + event.clientX - drag.startX,
      top: drag.top + event.clientY - drag.startY,
      width: rect.width,
      height: rect.height
    });

    win.style.left = `${clamped.left}px`;
    win.style.top = `${clamped.top}px`;
  });

  handle.addEventListener("pointerup", event => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    drag = null;
    userNotesSavePosition(win);
  });

  handle.addEventListener("pointercancel", event => {
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    drag = null;
    userNotesSavePosition(win);
  });
}

function userNotesGetEditorValue(win) {
  const editor = win.__userNotesEditor;

  if (editor) {
    return userNotesSanitizeHtml(editor.value);
  }

  const textarea = win.querySelector(".user-notes-editor");

  if (textarea instanceof HTMLTextAreaElement) {
    return userNotesSanitizeHtml(textarea.value);
  }

  return "";
}

function userNotesDestroyEditor(win) {
  const editor = win.__userNotesEditor;

  if (editor && typeof editor.destruct === "function") {
    editor.destruct();
  }

  win.__userNotesEditor = null;
}

function userNotesInsertSymbol(editor, symbol) {
  editor.s.insertHTML(`${symbol} `);
}

function userNotesCreateEditor(win, editorElement) {
  const initialContent = userNotesNormalizeStoredNotesForEditor(userNotesLoadNotes());

  if (!globalThis.Jodit) {
    console.warn("User Notes | Jodit is not available. Falling back to plain textarea.");

    editorElement.value = initialContent
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, "");

    editorElement.addEventListener("input", event => {
      userNotesDebouncedSave(event.currentTarget.value);
    });

    return null;
  }

  const editor = globalThis.Jodit.make(editorElement, {
    height: "100%",
    minHeight: 150,
    toolbarAdaptive: false,
    askBeforePasteHTML: false,
    askBeforePasteFromWord: false,
    defaultActionOnPaste: "insert_clear_html",
    disablePlugins: [
      "about",
      "add-new-line",
      "ai-assistant",
      "file",
      "image",
      "media",
      "paste-storage",
      "powered-by-jodit",
      "preview",
      "print",
      "source",
      "speech-recognize",
      "video"
    ],
    buttons: [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "|",
      "ul",
      "ol",
      "|",
      "font",
      "fontsize",
      "brush",
      "|",
      "table",
      "|",
      "undo",
      "redo",
      "|",
      {
        name: "checkbox-empty",
        tooltip: "Kästchen einfügen",
        icon: "☐",
        exec: editorInstance => userNotesInsertSymbol(editorInstance, "☐")
      },
      {
        name: "checkbox-checked",
        tooltip: "Angehaktes Kästchen einfügen",
        icon: "☑",
        exec: editorInstance => userNotesInsertSymbol(editorInstance, "☑")
      },
      {
        name: "checkmark",
        tooltip: "Haken einfügen",
        icon: "✓",
        exec: editorInstance => userNotesInsertSymbol(editorInstance, "✓")
      },
      {
        name: "crossmark",
        tooltip: "Kreuz einfügen",
        icon: "✗",
        exec: editorInstance => userNotesInsertSymbol(editorInstance, "✗")
      },
      {
        name: "bordered-text",
        tooltip: "Rahmen um markierten Text",
        icon: "▣",
        exec: editorInstance => {
          const selected = editorInstance.s.html || "&nbsp;";

          editorInstance.s.insertHTML(
            `<span style="border: 1px solid currentColor; padding: 2px 4px;">${selected}</span>`
          );
        }
      }
    ]
  });

  editor.value = initialContent;

  editor.events.on("change", () => {
    userNotesDebouncedSave(editor.value);
  });

  win.__userNotesEditor = editor;

  return editor;
}

export function userNotesOpenNotes() {
  let win = document.getElementById(USER_NOTES_WINDOW_ID);

  if (win) {
    win.hidden = false;
    userNotesRestorePosition(win);
    userNotesApplyWindowSettings(win);
    userNotesBringToFront(win);

    const editor = win.__userNotesEditor;

    if (editor) {
      editor.focus();
    } else {
      win.querySelector(".user-notes-editor")?.focus();
    }

    return;
  }

  win = document.createElement("section");
  win.id = USER_NOTES_WINDOW_ID;
  win.className = "user-notes-window";

  win.innerHTML = `
    <header class="user-notes-titlebar">
      <div class="user-notes-title">
        <i class="fas fa-note-sticky" aria-hidden="true"></i>
        <span>User Notes</span>
      </div>

      <div class="user-notes-controls">
        <span class="user-notes-status">Gespeichert</span>

        <button type="button" class="user-notes-save" title="Jetzt speichern">
          <i class="fas fa-save" aria-hidden="true"></i>
        </button>

        <button type="button" class="user-notes-close" title="Schließen">
          <i class="fas fa-times" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <main class="user-notes-content">
      <textarea class="user-notes-editor" spellcheck="true"></textarea>
    </main>
  `;

  document.body.appendChild(win);

  userNotesApplyWindowSettings(win);
  userNotesRestorePosition(win);

  const editorElement = win.querySelector(".user-notes-editor");

  if (!(editorElement instanceof HTMLTextAreaElement)) {
    console.error(`${USER_NOTES_MODULE_ID} | Notes editor could not be created.`);
    return;
  }

  userNotesCreateEditor(win, editorElement);

  win.querySelector(".user-notes-save")?.addEventListener("click", () => {
    userNotesSaveNotes(userNotesGetEditorValue(win));
    userNotesSetStatus("Gespeichert");
    userNotesSavePosition(win);
  });

  win.querySelector(".user-notes-close")?.addEventListener("click", () => {
    userNotesSaveNotes(userNotesGetEditorValue(win));
    userNotesSavePosition(win);
    win.hidden = true;
  });

  win.addEventListener("pointerdown", () => {
    userNotesBringToFront(win);
  });

  const resizeObserver = new ResizeObserver(() => {
    if (win.hidden) {
      return;
    }

    const rect = win.getBoundingClientRect();

    if (rect.width < USER_NOTES_MIN_WIDTH || rect.height < USER_NOTES_MIN_HEIGHT) {
      return;
    }

    userNotesSavePosition(win);
  });

  resizeObserver.observe(win);

  userNotesMakeDraggable(win);
  userNotesBringToFront(win);

  if (win.__userNotesEditor) {
    win.__userNotesEditor.focus();
  } else {
    editorElement.focus();
  }
}

export function userNotesRefreshOpenWindow() {
  const oldWin = document.getElementById(USER_NOTES_WINDOW_ID);

  if (!oldWin) {
    return;
  }

  userNotesSaveNotes(userNotesGetEditorValue(oldWin));
  userNotesSavePosition(oldWin);
  userNotesDestroyEditor(oldWin);
  oldWin.remove();

  userNotesOpenNotes();
}