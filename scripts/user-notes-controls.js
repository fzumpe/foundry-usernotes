import {
  USER_NOTES_MODULE_ID,
  USER_NOTES_TOOL_ID
} from "./user-notes-constants.js";

import {
  userNotesOpenNotes
} from "./user-notes-window.js";

export function userNotesRegisterTokenControl(controls) {
  console.log("User Notes | registering token control", controls);

  const tokenControl = controls?.tokens;

  if (!tokenControl) {
    console.warn("User Notes | controls.tokens fehlt", controls);
    return;
  }

  if (!tokenControl.tools) {
    console.warn("User Notes | controls.tokens.tools fehlt", tokenControl);
    return;
  }

  tokenControl.tools[USER_NOTES_TOOL_ID] = {
    name: USER_NOTES_TOOL_ID,
    title: "User Notes öffnen",
    icon: "fa-solid fa-note-sticky",
    order: Object.keys(tokenControl.tools).length + 1,
    button: true,
    visible: true,

    onChange: (event, active) => {
      console.log("User Notes | onChange", { event, active });
      userNotesOpenNotes();
    },

    onClick: event => {
      console.log("User Notes | onClick", { event });
      userNotesOpenNotes();
    }
  };

  console.log(
    "User Notes | token control registered",
    tokenControl.tools[USER_NOTES_TOOL_ID]
  );
}
