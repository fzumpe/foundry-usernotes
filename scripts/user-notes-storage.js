import {
  USER_NOTES_MODULE_ID
} from "./user-notes-constants.js";

const USER_NOTES_STORAGE_SCHEMA_VERSION = 2;

function userNotesBaseKey() {
  const worldId = game.world?.id ?? game.world?.data?.id ?? "unknown-world";
  const userId = game.user?.id ?? "unknown-user";

  return `${USER_NOTES_MODULE_ID}.${worldId}.${userId}`;
}

export function userNotesContentKey() {
  return `${userNotesBaseKey()}.content`;
}

export function userNotesStateKey() {
  return `${userNotesBaseKey()}.state`;
}

/**
 * Legacy keys from older versions.
 * Kept only for migration.
 */
export function userNotesStorageKey() {
  return `${userNotesBaseKey()}.notes`;
}

export function userNotesPositionKey() {
  return `${userNotesBaseKey()}.position`;
}

export function userNotesAppearanceKey() {
  return `${userNotesBaseKey()}.appearance`;
}

export function userNotesEncodeBase64(value) {
  const bytes = new TextEncoder().encode(String(value ?? ""));
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return window.btoa(binary);
}

export function userNotesDecodeBase64(value) {
  try {
    const binary = window.atob(String(value ?? ""));
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
  } catch (err) {
    console.warn("User Notes | Could not decode base64 content", err);
    return "";
  }
}

function userNotesRemoveLegacyStorageKeys() {
  window.localStorage.removeItem(userNotesStorageKey());
  window.localStorage.removeItem(userNotesPositionKey());
  window.localStorage.removeItem(userNotesAppearanceKey());
}

function userNotesReadJson(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (err) {
    console.warn(`User Notes | Could not parse localStorage key: ${key}`, err);
    return fallback;
  }
}

function userNotesWriteJson(key, value) {
  window.localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

function userNotesCreateEmptyContent() {
  return {
    schemaVersion: USER_NOTES_STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    notes: {
      format: "html",
      encoding: "base64",
      data: ""
    }
  };
}

function userNotesCreateEmptyState() {
  return {
    schemaVersion: USER_NOTES_STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    appearance: null,
    position: null
  };
}

function userNotesLoadContentObject() {
  const content = userNotesReadJson(
    userNotesContentKey(),
    null
  );

  if (content?.notes?.encoding === "base64") {
    return content;
  }

  const legacyNotes = window.localStorage.getItem(userNotesStorageKey());

  if (legacyNotes !== null) {
    const migrated = userNotesCreateEmptyContent();
    migrated.notes.data = userNotesEncodeBase64(legacyNotes);

    userNotesWriteJson(userNotesContentKey(), migrated);
    window.localStorage.removeItem(userNotesStorageKey());

    return migrated;
  }

  return userNotesCreateEmptyContent();
}

function userNotesLoadStateObject() {
  const state = userNotesReadJson(
    userNotesStateKey(),
    null
  );

  if (state && typeof state === "object") {
    return {
      ...userNotesCreateEmptyState(),
      ...state
    };
  }

  const migrated = userNotesCreateEmptyState();

  const legacyPosition = userNotesReadJson(
    userNotesPositionKey(),
    null
  );

  const legacyAppearance = userNotesReadJson(
    userNotesAppearanceKey(),
    null
  );

  if (legacyPosition) {
    migrated.position = legacyPosition;
  }

  if (legacyAppearance) {
    migrated.appearance = legacyAppearance;
  }

  if (legacyPosition || legacyAppearance) {
    userNotesWriteJson(userNotesStateKey(), migrated);
    window.localStorage.removeItem(userNotesPositionKey());
    window.localStorage.removeItem(userNotesAppearanceKey());
  }

  return migrated;
}

function userNotesSaveStateObject(state) {
  userNotesWriteJson(
    userNotesStateKey(),
    {
      ...userNotesCreateEmptyState(),
      ...state,
      schemaVersion: USER_NOTES_STORAGE_SCHEMA_VERSION,
      updatedAt: new Date().toISOString()
    }
  );

  userNotesRemoveLegacyStorageKeys();
}

export function userNotesLoadNotes() {
  const content = userNotesLoadContentObject();

  if (content?.notes?.encoding === "base64") {
    return userNotesDecodeBase64(content.notes.data);
  }

  return "";
}

export function userNotesSaveNotes(value) {
  const content = {
    schemaVersion: USER_NOTES_STORAGE_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    notes: {
      format: "html",
      encoding: "base64",
      data: userNotesEncodeBase64(value)
    }
  };

  userNotesWriteJson(userNotesContentKey(), content);
  userNotesRemoveLegacyStorageKeys();
}

export function userNotesLoadPosition(defaultValue = null) {
  const state = userNotesLoadStateObject();

  return state.position ?? defaultValue;
}

export function userNotesSavePositionData(position) {
  const state = userNotesLoadStateObject();

  state.position = position;

  userNotesSaveStateObject(state);
}

export function userNotesRemoveSavedPosition() {
  const state = userNotesLoadStateObject();

  state.position = null;

  userNotesSaveStateObject(state);
}

export function userNotesLoadAppearance(defaults) {
  const state = userNotesLoadStateObject();

  if (!state.appearance || typeof state.appearance !== "object") {
    return { ...defaults };
  }

  return {
    ...defaults,
    ...state.appearance
  };
}

export function userNotesSaveAppearance(values) {
  const state = userNotesLoadStateObject();

  state.appearance = values;

  userNotesSaveStateObject(state);
}

export function userNotesRemoveSavedAppearance() {
  const state = userNotesLoadStateObject();

  state.appearance = null;

  userNotesSaveStateObject(state);
}
