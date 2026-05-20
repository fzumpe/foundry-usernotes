const USER_NOTES_ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CAPTION",
  "CODE",
  "COL",
  "COLGROUP",
  "DIV",
  "EM",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HR",
  "I",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "U",
  "UL"
]);

const USER_NOTES_ALLOWED_ATTRIBUTES = new Set([
  "class",
  "colspan",
  "href",
  "rel",
  "rowspan",
  "style",
  "target",
  "title"
]);

const USER_NOTES_ALLOWED_CSS_PROPERTIES = new Set([
  "background-color",
  "border",
  "border-bottom",
  "border-color",
  "border-left",
  "border-radius",
  "border-right",
  "border-style",
  "border-top",
  "border-width",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "margin-left",
  "padding",
  "text-align",
  "text-decoration"
]);

function userNotesSanitizeStyle(styleValue) {
  const safeRules = [];

  for (const rule of String(styleValue ?? "").split(";")) {
    const [rawProperty, ...rawValueParts] = rule.split(":");

    if (!rawProperty || rawValueParts.length === 0) {
      continue;
    }

    const property = rawProperty.trim().toLowerCase();
    const value = rawValueParts.join(":").trim();

    if (!USER_NOTES_ALLOWED_CSS_PROPERTIES.has(property)) {
      continue;
    }

    const lowered = value.toLowerCase();

    if (
      lowered.includes("url(") ||
      lowered.includes("expression(") ||
      lowered.includes("javascript:") ||
      lowered.includes("data:") ||
      lowered.includes("@import") ||
      lowered.includes("behavior:")
    ) {
      continue;
    }

    safeRules.push(`${property}: ${value}`);
  }

  return safeRules.join("; ");
}

function userNotesIsSafeHref(value) {
  const href = String(value ?? "").trim();

  if (!href) {
    return false;
  }

  if (href.startsWith("#")) {
    return true;
  }

  try {
    const url = new URL(href, window.location.origin);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch (_err) {
    return false;
  }
}

function userNotesSanitizeElement(element) {
  if (!USER_NOTES_ALLOWED_TAGS.has(element.tagName)) {
    const text = document.createTextNode(element.textContent ?? "");
    element.replaceWith(text);
    return;
  }

  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;

    if (name.startsWith("on")) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (!USER_NOTES_ALLOWED_ATTRIBUTES.has(name)) {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name === "href") {
      if (!userNotesIsSafeHref(value)) {
        element.removeAttribute(attribute.name);
      } else {
        element.setAttribute("rel", "noopener noreferrer");
        element.setAttribute("target", "_blank");
      }

      continue;
    }

    if (name === "target" && value !== "_blank") {
      element.removeAttribute(attribute.name);
      continue;
    }

    if (name === "style") {
      const sanitizedStyle = userNotesSanitizeStyle(value);

      if (sanitizedStyle) {
        element.setAttribute("style", sanitizedStyle);
      } else {
        element.removeAttribute(attribute.name);
      }
    }
  }
}

export function userNotesSanitizeHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html ?? "");

  for (const element of [...template.content.querySelectorAll("*")]) {
    userNotesSanitizeElement(element);
  }

  return template.innerHTML.replace(/<br>/gi, "<br />");
}

export function userNotesEscapePlainTextAsHtml(text) {
  const div = document.createElement("div");
  div.textContent = String(text ?? "");

  return div.innerHTML.replace(/\n/g, "<br />");
}

export function userNotesLooksLikeHtml(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value ?? ""));
}

export function userNotesNormalizeStoredNotesForEditor(value) {
  const content = String(value ?? "");

  if (!content) {
    return "";
  }

  if (userNotesLooksLikeHtml(content)) {
    return userNotesSanitizeHtml(content);
  }

  return userNotesEscapePlainTextAsHtml(content);
}