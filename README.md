# User Notes

Foundry VTT v14 Modul: Fügt der Benutzerliste ein kleines Notiz-Icon hinzu.
Ein Klick öffnet ein lokales Notizfenster.

## Speicherung

Die Notizen werden im `window.localStorage` des Browsers gespeichert, getrennt nach:

- Modul-ID
- Welt-ID
- Benutzer-ID

Die Daten werden nicht auf dem Foundry-Server gespeichert und nicht zwischen Browsern synchronisiert.

## Installation

Ordner `user-notes` nach `{FoundryUserData}/Data/modules/` kopieren und das Modul in der Welt aktivieren.
