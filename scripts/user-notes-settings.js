import {
  USER_NOTES_MODULE_ID,
  USER_NOTES_WINDOW_ID
} from "./user-notes-constants.js";

import {
  userNotesLoadAppearance,
  userNotesSaveAppearance,
  userNotesRemoveSavedAppearance
} from "./user-notes-storage.js";

let resetPositionCallback = null;

const USER_NOTES_APPEARANCE_DEFAULTS = {
  windowBackgroundColor: "#191813",
  windowBackgroundAlpha: 0.96,
  windowTextColor: "#f0f0e0",
  textareaBackgroundColor: "#ffffff",
  textareaBackgroundAlpha: 0.92,
  textareaTextColor: "#111111"
};

function userNotesClampAlpha(value, fallback = 1) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, number));
}

function userNotesNormalizeHexColor(value, fallback) {
  const normalized = String(value ?? "").trim();

  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function userNotesHexToRgba(hex, alpha) {
  const normalized = userNotesNormalizeHexColor(hex, "#000000");
  const match = normalized.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);

  if (!match) {
    return `rgba(0, 0, 0, ${userNotesClampAlpha(alpha)})`;
  }

  const red = parseInt(match[1], 16);
  const green = parseInt(match[2], 16);
  const blue = parseInt(match[3], 16);

  return `rgba(${red}, ${green}, ${blue}, ${userNotesClampAlpha(alpha)})`;
}

function userNotesLoadValidatedAppearance() {
  const values = userNotesLoadAppearance(USER_NOTES_APPEARANCE_DEFAULTS);

  return {
    windowBackgroundColor: userNotesNormalizeHexColor(
      values.windowBackgroundColor,
      USER_NOTES_APPEARANCE_DEFAULTS.windowBackgroundColor
    ),
    windowBackgroundAlpha: userNotesClampAlpha(
      values.windowBackgroundAlpha,
      USER_NOTES_APPEARANCE_DEFAULTS.windowBackgroundAlpha
    ),
    windowTextColor: userNotesNormalizeHexColor(
      values.windowTextColor,
      USER_NOTES_APPEARANCE_DEFAULTS.windowTextColor
    ),
    textareaBackgroundColor: userNotesNormalizeHexColor(
      values.textareaBackgroundColor,
      USER_NOTES_APPEARANCE_DEFAULTS.textareaBackgroundColor
    ),
    textareaBackgroundAlpha: userNotesClampAlpha(
      values.textareaBackgroundAlpha,
      USER_NOTES_APPEARANCE_DEFAULTS.textareaBackgroundAlpha
    ),
    textareaTextColor: userNotesNormalizeHexColor(
      values.textareaTextColor,
      USER_NOTES_APPEARANCE_DEFAULTS.textareaTextColor
    )
  };
}

export function userNotesRegisterSettings(onResetPosition) {
  resetPositionCallback = onResetPosition;

  game.settings.registerMenu(USER_NOTES_MODULE_ID, "appearanceSettings", {
    name: "Darstellung",
    label: "Farben und Transparenz einstellen",
    hint: "Öffnet lokale Colorpicker für Fenster, Notizfeld und Schriftfarben. Die Werte werden nur im localStorage dieses Browsers gespeichert.",
    icon: "fas fa-palette",
    type: UserNotesAppearanceSettings,
    restricted: false
  });

  game.settings.registerMenu(USER_NOTES_MODULE_ID, "resetWindowPosition", {
    name: "Position und Größe zurücksetzen",
    label: "Jetzt zurücksetzen",
    hint: "Setzt nur Position und Größe des User-Notes-Fensters für diesen Browser zurück. Notizen, Farben und Transparenzwerte bleiben unverändert.",
    icon: "fas fa-undo",
    type: UserNotesDirectResetWindowPosition,
    restricted: false
  });
}

export function userNotesApplySettingsToOpenWindow() {
  const win = document.getElementById(USER_NOTES_WINDOW_ID);

  if (!win) {
    return;
  }

  userNotesApplyWindowSettings(win);
}

export function userNotesApplyWindowSettings(win) {
  const appearance = userNotesLoadValidatedAppearance();

  win.style.setProperty(
    "--user-notes-window-background",
    userNotesHexToRgba(
      appearance.windowBackgroundColor,
      appearance.windowBackgroundAlpha
    )
  );

  win.style.setProperty(
    "--user-notes-window-text-color",
    appearance.windowTextColor
  );

  win.style.setProperty(
    "--user-notes-textarea-background",
    userNotesHexToRgba(
      appearance.textareaBackgroundColor,
      appearance.textareaBackgroundAlpha
    )
  );

  win.style.setProperty(
    "--user-notes-textarea-color",
    appearance.textareaTextColor
  );
}

class UserNotesDirectResetWindowPosition extends FormApplication {
  render(_force, _options) {
    if (typeof resetPositionCallback === "function") {
      resetPositionCallback();
      ui.notifications?.info("User Notes: Position und Größe wurden zurückgesetzt.");
    } else {
      console.warn("User Notes | resetPositionCallback is not available");
      ui.notifications?.warn("User Notes: Reset-Funktion ist nicht verfügbar.");
    }

    return this;
  }
}

class UserNotesAppearanceSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "user-notes-appearance-settings",
      title: "User Notes Darstellung",
      template: null,
      width: 520,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  getData() {
    const appearance = userNotesLoadValidatedAppearance();

    return {
      ...appearance,
      windowBackgroundAlphaPercent: Math.round(appearance.windowBackgroundAlpha * 100),
      textareaBackgroundAlphaPercent: Math.round(appearance.textareaBackgroundAlpha * 100)
    };
  }

  async _renderInner(data) {
    const html = `
      <div class="user-notes-appearance-settings">
        <p class="notes">
          Diese Werte werden lokal im Browser gespeichert.
          Foundry-Settings werden dadurch nicht überschrieben und die Seite wird nicht neu geladen.
        </p>

        <fieldset>
          <legend>Fenster</legend>

          <div class="form-group">
            <label>Hintergrundfarbe</label>
            <div class="form-fields">
              <input type="color" name="windowBackgroundColor" value="${data.windowBackgroundColor}">
              <input type="text" name="windowBackgroundColorText" value="${data.windowBackgroundColor}">
            </div>
            <p class="hint">Farbe des äußeren Notizfensters.</p>
          </div>

          <div class="form-group">
            <label>Hintergrundtransparenz</label>
            <div class="form-fields user-notes-range-row">
              <input type="range" name="windowBackgroundAlpha" min="0" max="1" step="0.01" value="${data.windowBackgroundAlpha}">
              <output>${data.windowBackgroundAlphaPercent}%</output>
            </div>
            <p class="hint">0% ist vollständig transparent, 100% ist vollständig deckend.</p>
          </div>

          <div class="form-group">
            <label>Schriftfarbe</label>
            <div class="form-fields">
              <input type="color" name="windowTextColor" value="${data.windowTextColor}">
              <input type="text" name="windowTextColorText" value="${data.windowTextColor}">
            </div>
            <p class="hint">Farbe für Titelleiste, Status und Buttons.</p>
          </div>
        </fieldset>

        <fieldset>
          <legend>Notizfeld</legend>

          <div class="form-group">
            <label>Hintergrundfarbe</label>
            <div class="form-fields">
              <input type="color" name="textareaBackgroundColor" value="${data.textareaBackgroundColor}">
              <input type="text" name="textareaBackgroundColorText" value="${data.textareaBackgroundColor}">
            </div>
            <p class="hint">Farbe des eigentlichen Textfeldes.</p>
          </div>

          <div class="form-group">
            <label>Hintergrundtransparenz</label>
            <div class="form-fields user-notes-range-row">
              <input type="range" name="textareaBackgroundAlpha" min="0" max="1" step="0.01" value="${data.textareaBackgroundAlpha}">
              <output>${data.textareaBackgroundAlphaPercent}%</output>
            </div>
            <p class="hint">0% ist vollständig transparent, 100% ist vollständig deckend.</p>
          </div>

          <div class="form-group">
            <label>Schriftfarbe</label>
            <div class="form-fields">
              <input type="color" name="textareaTextColor" value="${data.textareaTextColor}">
              <input type="text" name="textareaTextColorText" value="${data.textareaTextColor}">
            </div>
            <p class="hint">Farbe des Textes innerhalb des Notizfeldes.</p>
          </div>
        </fieldset>

        <footer class="sheet-footer user-notes-appearance-footer">
          <div class="user-notes-primary-actions">
            <button type="button" class="user-notes-apply-appearance">
              <i class="fas fa-check"></i>
              Anwenden
            </button>

            <button type="button" class="user-notes-save-appearance">
              <i class="fas fa-save"></i>
              Speichern
            </button>
          </div>

          <button type="button" class="user-notes-reset-appearance">
            <i class="fas fa-undo"></i>
            Standardfarben
          </button>
        </footer>
      </div>
    `;

    return $(html);
  }

  activateListeners(html) {
    super.activateListeners(html);

    const root = html[0];

    if (!root) {
      console.warn("User Notes | appearance settings root element not found");
      return;
    }

    html.on("submit", event => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    });

    const syncColorPair = (colorName, textName) => {
      const colorInput = root.querySelector(`input[name="${colorName}"]`);
      const textInput = root.querySelector(`input[name="${textName}"]`);

      if (!colorInput || !textInput) {
        return;
      }

      colorInput.addEventListener("input", () => {
        textInput.value = colorInput.value;
      });

      textInput.addEventListener("input", () => {
        if (/^#[0-9a-f]{6}$/i.test(textInput.value)) {
          colorInput.value = textInput.value;
        }
      });
    };

    syncColorPair("windowBackgroundColor", "windowBackgroundColorText");
    syncColorPair("windowTextColor", "windowTextColorText");
    syncColorPair("textareaBackgroundColor", "textareaBackgroundColorText");
    syncColorPair("textareaTextColor", "textareaTextColorText");

    for (const range of root.querySelectorAll('input[type="range"]')) {
      const output = range
        .closest(".user-notes-range-row")
        ?.querySelector("output");

      const updateOutput = () => {
        if (output) {
          output.textContent = `${Math.round(Number(range.value) * 100)}%`;
        }
      };

      range.addEventListener("input", updateOutput);
      range.addEventListener("change", updateOutput);
      updateOutput();
    }

    root.querySelector(".user-notes-apply-appearance")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      this.userNotesSaveAppearanceFromDialog(root, {
        closeDialog: false,
        notify: true
      });
    });

    root.querySelector(".user-notes-save-appearance")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      this.userNotesSaveAppearanceFromDialog(root, {
        closeDialog: true,
        notify: true
      });
    });

    root.querySelector(".user-notes-reset-appearance")?.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      userNotesRemoveSavedAppearance();
      userNotesApplySettingsToOpenWindow();

      ui.notifications?.info("User Notes: Standardfarben wurden wiederhergestellt.");
      this.render(true);
    });
  }

  userNotesSaveAppearanceFromDialog(root, options = {}) {
    const closeDialog = options.closeDialog ?? true;
    const notify = options.notify ?? true;

    const getInputValue = name => {
      const input = root.querySelector(`[name="${name}"]`);
      return input?.value;
    };

    const appearance = {
      windowBackgroundColor: userNotesNormalizeHexColor(
        getInputValue("windowBackgroundColorText") || getInputValue("windowBackgroundColor"),
        USER_NOTES_APPEARANCE_DEFAULTS.windowBackgroundColor
      ),
      windowBackgroundAlpha: userNotesClampAlpha(
        getInputValue("windowBackgroundAlpha"),
        USER_NOTES_APPEARANCE_DEFAULTS.windowBackgroundAlpha
      ),
      windowTextColor: userNotesNormalizeHexColor(
        getInputValue("windowTextColorText") || getInputValue("windowTextColor"),
        USER_NOTES_APPEARANCE_DEFAULTS.windowTextColor
      ),
      textareaBackgroundColor: userNotesNormalizeHexColor(
        getInputValue("textareaBackgroundColorText") || getInputValue("textareaBackgroundColor"),
        USER_NOTES_APPEARANCE_DEFAULTS.textareaBackgroundColor
      ),
      textareaBackgroundAlpha: userNotesClampAlpha(
        getInputValue("textareaBackgroundAlpha"),
        USER_NOTES_APPEARANCE_DEFAULTS.textareaBackgroundAlpha
      ),
      textareaTextColor: userNotesNormalizeHexColor(
        getInputValue("textareaTextColorText") || getInputValue("textareaTextColor"),
        USER_NOTES_APPEARANCE_DEFAULTS.textareaTextColor
      )
    };

    userNotesSaveAppearance(appearance);
    userNotesApplySettingsToOpenWindow();

    if (notify) {
      ui.notifications?.info(
        closeDialog
          ? "User Notes: Darstellung wurde gespeichert."
          : "User Notes: Darstellung wurde angewendet."
      );
    }

    if (closeDialog) {
      this.close();
    }
  }

  async _updateObject(_event, _formData) {
    // Wird absichtlich nicht verwendet.
    // Die Buttons speichern direkt in localStorage, damit kein nativer GET-Submit stattfindet.
  }
}
