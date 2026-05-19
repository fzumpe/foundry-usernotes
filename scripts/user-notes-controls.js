import {
  USER_NOTES_TOOL_ID
} from "./user-notes-constants.js";

import {
  userNotesOpenNotes
} from "./user-notes-window.js";

export function userNotesRegisterTokenControl(controls) {
  const tokenControl = controls?.tokens;

  if (!tokenControl) {
    console.warn("User Notes | controls.tokens is not available; token control was not registered");
    return;
  }

  if (!tokenControl.tools) {
    console.warn("User Notes | controls.tokens.tools is not available; token control was not registered");
    return;
  }

  tokenControl.tools[USER_NOTES_TOOL_ID] = {
    name: USER_NOTES_TOOL_ID,
    title: "User Notes öffnen",
    icon: "fa-solid fa-note-sticky",
    order: Object.keys(tokenControl.tools).length + 1,
    button: true,
    visible: true,

    onChange: () => {
      userNotesOpenNotes();
    },

    onClick: () => {
      userNotesOpenNotes();
    }
  };

  console.log("User Notes | token control button registered");
}
