import {
  USER_NOTES_MODULE_ID
} from "./user-notes-constants.js";

import {
  userNotesDecodeBase64,
  userNotesEncodeBase64,
  userNotesLoadAppearance,
  userNotesLoadNotes,
  userNotesLoadPosition,
  userNotesSaveAppearance,
  userNotesSaveNotes,
  userNotesSavePositionData
} from "./user-notes-storage.js";

import {
  userNotesEscapePlainTextAsHtml,
  userNotesSanitizeHtml
} from "./user-notes-sanitize.js";

const USER_NOTES_EXPORT_SCHEMA_VERSION = 2;

const USER_NOTES_APPEARANCE_DEFAULTS_FOR_BACKUP = {
  windowBackgroundColor: "#191813",
  windowBackgroundAlpha: 0.96,
  windowTextColor: "#f0f0e0",
  textareaBackgroundColor: "#ffffff",
  textareaBackgroundAlpha: 0.92,
  textareaTextColor: "#111111"
};

function userNotesDownloadJson(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function userNotesReadJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result ?? "")));
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function userNotesBuildExportData(options) {
  const data = {};

  if (options.includeNotes) {
    data.notes = {
      format: "html",
      encoding: "base64",
      data: userNotesEncodeBase64(
        userNotesSanitizeHtml(userNotesLoadNotes())
      )
    };
  }

  if (options.includeAppearance) {
    data.appearance = userNotesLoadAppearance(
      USER_NOTES_APPEARANCE_DEFAULTS_FOR_BACKUP
    );
  }

  if (options.includePosition) {
    const position = userNotesLoadPosition(null);

    if (position) {
      data.position = position;
    }
  }

  return {
    module: USER_NOTES_MODULE_ID,
    schemaVersion: USER_NOTES_EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data
  };
}

function userNotesNormalizeImportedNotes(notes) {
  if (typeof notes === "string") {
    return userNotesEscapePlainTextAsHtml(notes);
  }

  if (!notes || typeof notes !== "object") {
    return "";
  }

  if (notes.encoding === "base64") {
    return userNotesSanitizeHtml(
      userNotesDecodeBase64(notes.data ?? notes.content ?? "")
    );
  }

  if (notes.format === "html") {
    return userNotesSanitizeHtml(notes.content ?? notes.data ?? "");
  }

  if (notes.format === "text") {
    return userNotesEscapePlainTextAsHtml(notes.content ?? notes.data ?? "");
  }

  return userNotesSanitizeHtml(notes.content ?? notes.data ?? "");
}

function userNotesValidateImportData(importData) {
  if (!importData || typeof importData !== "object") {
    return false;
  }

  if (importData.module !== USER_NOTES_MODULE_ID) {
    return false;
  }

  if (!importData.data || typeof importData.data !== "object") {
    return false;
  }

  return true;
}

function userNotesApplyImportData(importData, options) {
  const data = importData?.data ?? {};

  let changed = false;

  if (options.importNotes && data.notes !== undefined) {
    const importedNotes = userNotesNormalizeImportedNotes(data.notes);

    if (options.noteMode === "append") {
      const existing = userNotesSanitizeHtml(userNotesLoadNotes());
      const separator = existing.trim() ? "<hr />" : "";

      userNotesSaveNotes(`${existing}${separator}${importedNotes}`);
    } else {
      userNotesSaveNotes(importedNotes);
    }

    changed = true;
  }

  if (options.importAppearance && data.appearance) {
    userNotesSaveAppearance(data.appearance);
    changed = true;
  }

  if (options.importPosition && data.position) {
    userNotesSavePositionData(data.position);
    changed = true;
  }

  if (!changed) {
    return false;
  }

  try {
    globalThis.UserNotes?.refresh?.({
      saveCurrentContent: false
    });
  } catch (err) {
    console.warn(
      "User Notes | Import was saved, but refreshing the open window failed",
      err
    );
  }

  return true;
}

class UserNotesExportSettings extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "user-notes-export-settings",
      title: "User Notes Export",
      template: null,
      width: 480,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  async _renderInner() {
    return $(`
      <div class="user-notes-backup-settings">
        <p class="notes">
          Exportiert ausgewählte lokale Browserdaten als JSON-Datei.
          Die Datei enthält keine Welt- oder Benutzerdaten und wird beim Import
          immer in den aktuell geöffneten Scope übernommen.
        </p>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-export-notes">Notizen exportieren</label>
          <input id="user-notes-export-notes" type="checkbox" name="includeNotes" checked>
        </div>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-export-appearance">Farben und Transparenz exportieren</label>
          <input id="user-notes-export-appearance" type="checkbox" name="includeAppearance" checked>
        </div>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-export-position">Fensterposition und Größe exportieren</label>
          <input id="user-notes-export-position" type="checkbox" name="includePosition" checked>
        </div>

        <footer class="sheet-footer user-notes-backup-footer">
          <button type="button" class="user-notes-export-now">
            <i class="fas fa-file-export"></i>
            Exportieren
          </button>
        </footer>
      </div>
    `);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", ".user-notes-export-now", event => {
      event.preventDefault();
      event.stopPropagation();

      const root = html[0];

      if (!root) {
        console.warn("User Notes | export settings root element not found");
        return false;
      }

      const options = {
        includeNotes: root.querySelector('[name="includeNotes"]')?.checked ?? false,
        includeAppearance: root.querySelector('[name="includeAppearance"]')?.checked ?? false,
        includePosition: root.querySelector('[name="includePosition"]')?.checked ?? false
      };

      if (!options.includeNotes && !options.includeAppearance && !options.includePosition) {
        ui.notifications?.warn("User Notes: Bitte mindestens einen Export-Inhalt auswählen.");
        return false;
      }

      const exportData = userNotesBuildExportData(options);
      const date = new Date().toISOString().slice(0, 10);

      userNotesDownloadJson(`user-notes-${date}.json`, exportData);

      ui.notifications?.info("User Notes: Export wurde erstellt.");
      this.close();

      return false;
    });
  }

  async _updateObject(_event, _formData) {
    // Nicht verwendet. Buttons verarbeiten den Export direkt.
  }
}

class UserNotesImportSettings extends FormApplication {
  constructor(...args) {
    super(...args);
    this.importData = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "user-notes-import-settings",
      title: "User Notes Import",
      template: null,
      width: 560,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false,
      submitOnClose: false
    });
  }

  async _renderInner() {
    const hasData = Boolean(this.importData?.data);
    const hasNotes = hasData && this.importData.data.notes !== undefined;
    const hasAppearance = hasData && Boolean(this.importData.data.appearance);
    const hasPosition = hasData && Boolean(this.importData.data.position);

    return $(`
      <div class="user-notes-backup-settings">
        <p class="notes">
          Importiert eine User-Notes-JSON-Datei in die aktuell geöffnete Welt
          und für den aktuell eingeloggten Benutzer.
        </p>

        <p class="notes warning">
          Sicherheits-Hinweis: Importiertes HTML wird streng bereinigt.
          Skripte, Eventhandler, eingebettete aktive Inhalte, unsichere URLs und
          nicht erlaubte HTML-Elemente werden entfernt. Dadurch können
          Formatierungen verloren gehen.
        </p>

        <div class="form-group">
          <label>JSON-Datei</label>
          <div class="form-fields">
            <input type="file" name="importFile" accept="application/json,.json">
          </div>
        </div>

        <hr>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-import-notes">Notizen importieren</label>
          <input id="user-notes-import-notes" type="checkbox" name="importNotes" ${hasNotes ? "checked" : ""} ${hasNotes ? "" : "disabled"}>
        </div>

        <div class="form-group">
          <label>Notizmodus</label>
          <div class="form-fields">
            <select name="noteMode" ${hasNotes ? "" : "disabled"}>
              <option value="overwrite">Vorhandene Notizen überschreiben</option>
              <option value="append">Importierte Notizen anhängen</option>
            </select>
          </div>
        </div>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-import-appearance">Farben und Transparenz importieren</label>
          <input id="user-notes-import-appearance" type="checkbox" name="importAppearance" ${hasAppearance ? "checked" : ""} ${hasAppearance ? "" : "disabled"}>
        </div>

        <div class="user-notes-checkbox-row">
          <label for="user-notes-import-position">Fensterposition und Größe importieren</label>
          <input id="user-notes-import-position" type="checkbox" name="importPosition" ${hasPosition ? "checked" : ""} ${hasPosition ? "" : "disabled"}>
        </div>

        <footer class="sheet-footer user-notes-backup-footer">
          <button type="button" class="user-notes-import-now" ${hasData ? "" : "disabled"}>
            <i class="fas fa-file-import"></i>
            Importieren
          </button>
        </footer>
      </div>
    `);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("change", 'input[name="importFile"]', async event => {
      const fileInput = event.currentTarget;
      const file = fileInput.files?.[0];

      if (!file) {
        return;
      }

      try {
        const json = await userNotesReadJsonFile(file);

        if (!userNotesValidateImportData(json)) {
          ui.notifications?.error("User Notes: Diese JSON-Datei ist kein gültiger User-Notes-Export.");
          return;
        }

        this.importData = json;

        console.log("User Notes | import file loaded", {
          hasNotes: json.data?.notes !== undefined,
          hasAppearance: Boolean(json.data?.appearance),
          hasPosition: Boolean(json.data?.position)
        });

        ui.notifications?.info("User Notes: Importdatei wurde gelesen.");
        this.render(true);
      } catch (err) {
        console.error("User Notes | Import failed while reading JSON", err);
        ui.notifications?.error("User Notes: JSON-Datei konnte nicht gelesen werden.");
      }
    });

    html.on("click", ".user-notes-import-now", event => {
      event.preventDefault();
      event.stopPropagation();

      const root = html[0];

      console.log("User Notes | import button clicked", {
        hasImportData: Boolean(this.importData)
      });

      if (!root) {
        console.warn("User Notes | import settings root element not found");
        return false;
      }

      if (!this.importData) {
        ui.notifications?.warn("User Notes: Bitte zuerst eine JSON-Datei auswählen.");
        return false;
      }

      const options = {
        importNotes: root.querySelector('[name="importNotes"]')?.checked ?? false,
        noteMode: root.querySelector('[name="noteMode"]')?.value ?? "overwrite",
        importAppearance: root.querySelector('[name="importAppearance"]')?.checked ?? false,
        importPosition: root.querySelector('[name="importPosition"]')?.checked ?? false
      };

      console.log("User Notes | import options", options);

      if (!options.importNotes && !options.importAppearance && !options.importPosition) {
        ui.notifications?.warn("User Notes: Bitte mindestens einen Import-Inhalt auswählen.");
        return false;
      }

      try {
        const changed = userNotesApplyImportData(this.importData, options);

        if (!changed) {
          ui.notifications?.warn("User Notes: Es wurden keine importierbaren Daten angewendet.");
          return false;
        }

        ui.notifications?.info("User Notes: Import wurde angewendet.");
        this.close();
      } catch (err) {
        console.error("User Notes | Import failed while applying data", err);
        ui.notifications?.error("User Notes: Import konnte nicht angewendet werden. Details stehen in der Browser-Konsole.");
      }

      return false;
    });
  }

  async _updateObject(_event, _formData) {
    // Nicht verwendet. Buttons verarbeiten den Import direkt.
  }
}

export function userNotesRegisterBackupSettings() {
  game.settings.registerMenu(USER_NOTES_MODULE_ID, "exportData", {
    name: "Export",
    label: "Notizen exportieren",
    hint: "Exportiert ausgewählte lokale User-Notes-Daten als JSON-Datei.",
    icon: "fas fa-file-export",
    type: UserNotesExportSettings,
    restricted: false
  });

  game.settings.registerMenu(USER_NOTES_MODULE_ID, "importData", {
    name: "Import",
    label: "Notizen importieren",
    hint: "Importiert Notizen, Darstellung und/oder Fensterposition aus einer JSON-Datei. Importiertes HTML wird aus Sicherheitsgründen streng bereinigt.",
    icon: "fas fa-file-import",
    type: UserNotesImportSettings,
    restricted: false
  });
}
