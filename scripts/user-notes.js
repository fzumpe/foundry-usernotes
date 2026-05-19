import {
  userNotesRegisterSettings
} from "./user-notes-settings.js";

import {
  userNotesRegisterTokenControl
} from "./user-notes-controls.js";

import {
  userNotesOpenNotes,
  userNotesResetPositionAndSize,
  userNotesRefreshOpenWindow
} from "./user-notes-window.js";

console.log("User Notes | ES module loaded");

globalThis.UserNotes = {
  open: userNotesOpenNotes,
  resetPosition: userNotesResetPositionAndSize,
  refresh: userNotesRefreshOpenWindow
};

Hooks.once("init", () => {
  console.log("User Notes | init hook fired");

  try {
    userNotesRegisterSettings(userNotesResetPositionAndSize);
    console.log("User Notes | settings registered");
  } catch (err) {
    console.error("User Notes | error during init", err);
    ui.notifications?.error("User Notes: Fehler beim Initialisieren. Details stehen in der Browser-Konsole.");
  }
});

Hooks.on("getSceneControlButtons", controls => {
  console.log("User Notes | getSceneControlButtons fired");

  try {
    userNotesRegisterTokenControl(controls);
  } catch (err) {
    console.error("User Notes | error while registering token control", err);
    ui.notifications?.error("User Notes: Fehler beim Registrieren des Token-Controls.");
  }
});
