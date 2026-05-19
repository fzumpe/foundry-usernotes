import {
  USER_NOTES_MODULE_ID
} from "./user-notes-constants.js";

export function userNotesStorageKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";

  return `${USER_NOTES_MODULE_ID}.${worldId}.${userId}.notes`;
}

export function userNotesPositionKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";

  return `${USER_NOTES_MODULE_ID}.${worldId}.${userId}.position`;
}

export function userNotesAppearanceKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";

  return `${USER_NOTES_MODULE_ID}.${worldId}.${userId}.appearance`;
}

export function userNotesLoadNotes() {
  return window.localStorage.getItem(userNotesStorageKey()) ?? "";
}

export function userNotesSaveNotes(value) {
  window.localStorage.setItem(userNotesStorageKey(), value);
}

export function userNotesRemoveSavedPosition() {
  window.localStorage.removeItem(userNotesPositionKey());
}

export function userNotesLoadAppearance(defaults) {
  try {
    const raw = window.localStorage.getItem(userNotesAppearanceKey());

    if (!raw) {
      return { ...defaults };
    }

    const parsed = JSON.parse(raw);

    return {
      ...defaults,
      ...parsed
    };
  } catch (err) {
    console.warn("User Notes | Could not load appearance settings", err);
    return { ...defaults };
  }
}

export function userNotesSaveAppearance(values) {
  window.localStorage.setItem(
    userNotesAppearanceKey(),
    JSON.stringify(values)
  );
}

export function userNotesRemoveSavedAppearance() {
  window.localStorage.removeItem(userNotesAppearanceKey());
}
