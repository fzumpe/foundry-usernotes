import {
  userNotesRegisterSettings
} from "./user-notes-settings.js";

import {
  userNotesRegisterTokenControl
} from "./user-notes-controls.js";

import {
  userNotesOpenNotes,
  userNotesRefreshOpenWindow,
  userNotesResetPositionAndSize
} from "./user-notes-window.js";

globalThis.UserNotes = {
  open: userNotesOpenNotes,
  refresh: userNotesRefreshOpenWindow,
  resetPosition: userNotesResetPositionAndSize
};

Hooks.once("init", () => {
  try {
    console.log("User Notes | application registered");

    userNotesRegisterSettings(userNotesResetPositionAndSize);

    console.log("User Notes | settings registered");
  } catch (err) {
    console.error("User Notes | error during init", err);

    ui.notifications?.error(
      "User Notes: Fehler beim Initialisieren. Details stehen in der Browser-Konsole."
    );
  }
});

Hooks.on("getSceneControlButtons", controls => {
  try {
    userNotesRegisterTokenControl(controls);
  } catch (err) {
    console.error("User Notes | error while registering token control", err);

    ui.notifications?.error(
      "User Notes: Fehler beim Registrieren des Token-Controls."
    );
  }
});