# Leselern-App

Eine kleine, private Web-App für Leseanfänger. Jeden Tag bekommt das Kind 5 bis 10 kurze Leseaufgaben und eine Fortsetzungsgeschichte. Alles, was das Kind selbst lesen soll, besteht **nur aus Buchstaben, die es schon kennt**. Was es noch nicht lesen kann, liest ein Erwachsener vor (grau gedruckt).

Die App läuft komplett auf dem eigenen Server (zum Beispiel Unraid), ohne Cloud-Dienst, ohne KI-Schnittstelle und ohne externe npm-Pakete.

## Was die App kann

| Bereich | Inhalt |
| --- | --- |
| **Anmelden** | Ben tippt drei Tiere in der richtigen Reihenfolge (kein Lesen nötig). Erwachsene melden sich mit Passwort an. |
| **Heute lesen** | 5–10 Aufgaben pro Tag nacheinander: Leserutsche (Silben), Wort zu Bild, Bild zu Wort, Blitzlesen, Wörterkette, Buchstaben finden, „Womit fängt es an?“, Satz lesen und zum Schluss eine Geschichte mit Verständnisfrage. Am Ende gibt es einen Sticker. |
| **Lernen** | Lernrunde zu einem einzelnen freigeschalteten Buchstaben: Laut hören, Anlaut finden, Buchstaben finden, Silben, Wörter und Sätze mit genau diesem Buchstaben. Noch nicht freigeschaltete Buchstaben sind verschlossen. |
| **Üben** | Die heutigen Übungen einzeln oder alle nacheinander (ohne Geschichte). Zählt für den Sticker mit. |
| **Geschichte** | Nur die heutige Geschichte (Wahl zwischen zwei Folgen). |
| **Buchstaben** | Ben sieht seine Buchstaben und kann Silben und Wörter dazu anhören. Der Admin wählt hier aus, welche Buchstaben bekannt sind (Start: A M L O I E). |
| **Alle Geschichten** | Bücherregal (gelesene Folgen noch einmal lesen; der Admin sieht alle) und Archiv aller bisher erzeugten Tage mit Buchstaben-Filter. |
| **Einstellungen** (nur Admin) | Aufgaben pro Tag, Silbenbögen an/aus, Vorlesen beim Antippen (sofort / erst nach 15 Sekunden / aus), heutige Aufgaben neu erzeugen, Bilder-Code von Ben, Admin-Passwort. |

Jede Seite hat oben links einen großen **Zurück**-Knopf. In den Aufgaben geht er genau einen Bildschirm zurück (z. B. von der Geschichte zurück zur Auswahl); die Zurück-Geste des Tablets genauso.

Vorlesen und Hilfe nutzen die Sprachausgabe des Tablets oder Handys (Web Speech API), es wird nichts ins Internet geschickt.

## Installation auf Unraid

Die Schritt-für-Schritt-Anleitung steht in **[docs/UNRAID.md](docs/UNRAID.md)**. Kurz:

1. Das Docker-Image wird bei jedem Push auf `main` automatisch von GitHub Actions gebaut: `ghcr.io/itguru279/leselernprojekt:latest`.
2. In Unraid unter *Docker → Add Container* das Image eintragen, Port `8080`, Ordner `/mnt/user/appdata/leselern` → `/data`, `ADMIN_PASSWORD` setzen.
3. In Cloudflare (Tunnel) einen Hostnamen auf `http://UNRAID-IP:8080` zeigen lassen. Cloudflare Access davor wird empfohlen.

## Erste Anmeldung

| Wer | Wie |
| --- | --- |
| Ben | Auf „Ben“ tippen, dann 🐶 Hund → 🐱 Katze → 🐸 Frosch (änderbar in den Einstellungen oder per `CHILD_CODE`). |
| Admin | Auf „Erwachsene“ tippen, Passwort aus `ADMIN_PASSWORD`. Ist keins gesetzt, steht ein zufälliges Passwort im Container-Log. |

## Einstellungen über Umgebungsvariablen

| Variable | Standard | Bedeutung |
| --- | --- | --- |
| `ADMIN_PASSWORD` | (zufällig, im Log) | Admin-Passwort beim **ersten** Start |
| `RESET_ADMIN_PASSWORD` | – | `true` setzt das Passwort beim Start auf `ADMIN_PASSWORD` zurück (danach wieder entfernen) |
| `CHILD_NAME` | `Ben` | Name des Kindes (erster Start) |
| `CHILD_CODE` | `hund,katze,frosch` | Bilder-Code (erster Start). Tiere: hund, katze, maus, frosch, fuchs, baer, hase, loewe, pinguin |
| `START_LETTERS` | `a,m,l,o,i,e` | Bekannte Buchstaben beim ersten Start |
| `TZ` | `Europe/Berlin` | Zeitzone, bestimmt den Tageswechsel |
| `PORT` | `8080` | Port im Container |
| `DATA_DIR` | `/data` | Ort der SQLite-Datenbank |
| `PUID` / `PGID` | `99` / `100` | Besitzer der Dateien in `/data` (Unraid-Standard) |
| `COOKIE_SECURE` | – | `true` erzwingt sichere Cookies; hinter Cloudflare wird das automatisch erkannt |

## Wie die Texte entstehen (ohne KI)

- **Grapheme statt Buchstaben:** Die App kennt Laute wie `sch`, `ei`, `ie`, `ck` oder `st`/`sp` am Wortanfang als eigene Einheiten. „Stern“ ist erst lesbar, wenn `St` freigeschaltet ist.
- **Wortschatz** in [`src/content/words.ts`](src/content/words.ts): Wörter mit Bild (Emoji), Namen und kleine Wörter.
- **Geschichten** in [`src/content/stories.ts`](src/content/stories.ts): Fortsetzungsserien. Wörter in `[eckigen Klammern]` liest das Kind selbst, aber nur, wenn alle Laute bekannt sind. Sonst werden sie automatisch zum Vorlesetext. So passt jede Folge zu jedem Lernstand.
- **Lerninhalte je Buchstabe** in [`src/content/letters.ts`](src/content/letters.ts): Fibel-Reihenfolge A M L O I E U S F N W R T P, Laut-Hinweise und kurze Sätze.
- **Geschichten je Buchstabenstufe** in [`src/content/stories-stufen.ts`](src/content/stories-stufen.ts): je Stufe eine Serie mit 5 Folgen (Mimi, Lulu, Sisi, Fio, Finn, Wolfi, Rufus, Toni, Opa Pit). Jedes Klammer-Wort ist auf der eigenen Stufe lesbar, das prüfen die Tests. Angeboten wird bevorzugt die Serie des zuletzt freigeschalteten Buchstabens.
- **Generator** in [`src/generator/daily.ts`](src/generator/daily.ts): Baut die Tagesaufgaben mit festem Zufall (gleicher Tag = gleiche Aufgaben). Der zuletzt gelernte Buchstabe kommt häufiger vor, Wörter der letzten Tage seltener.
- **Prüfer:** Vor dem Speichern prüft `validateSet()` jedes Wort noch einmal. Die Tests erzeugen Aufgaben für 28 Lernstufen, 12 Tage und 3 Aufgabenmengen und prüfen, dass kein unlesbares Wort durchrutscht.

Neue Wörter oder Geschichten: siehe [docs/INHALTE.md](docs/INHALTE.md).

## Entwickeln

Voraussetzung: Node.js 22.18 oder neuer (führt TypeScript direkt aus). Es gibt keine Abhängigkeiten, also kein `npm install`.

```bash
npm run dev        # Server auf http://localhost:8080, Admin-Passwort "admin123"
npm test           # alle Tests
npm run vorschau -- a,m,l,o,i,e 2026-10-24 7   # Tagesaufgaben als Text ansehen
```

## Aufbau

```
src/
  server.ts            HTTP-Server und Routen
  app.ts               Nutzer, Tagesaufgaben, Ergebnisse, Sticker
  auth.ts              Bilder-Code, Passwörter (scrypt), Sitzungen
  db.ts                SQLite-Schema (node:sqlite)
  views.ts             HTML-Seiten
  generator/           Grapheme, Zufall, Geschichten, Tagesaufgaben
  content/             Wortschatz und Geschichten
public/                CSS, Browser-Skripte, Schrift Andika (SIL OFL)
test/                  Tests (node --test)
unraid/leselern.xml    Vorlage für Unraid
docs/                  Anleitungen
```

## Hintergrund

Die didaktischen Entscheidungen (Fibel-Reihenfolge, Silbenbögen als Schalter, kurze Einheiten, Wahl zwischen zwei Geschichten, Vorlesen durch Erwachsene) sind im Konzept begründet: [docs/KONZEPT.md](docs/KONZEPT.md).

Schrift: [Andika](https://software.sil.org/andika/) von SIL International, SIL Open Font License 1.1 (`public/fonts/OFL-Andika.txt`).
