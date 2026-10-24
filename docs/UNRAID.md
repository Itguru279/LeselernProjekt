# Installation auf Unraid

Diese Anleitung bringt die Leselern-App als Docker-Container auf den Unraid-Server. Erreichbar ist sie danach im Heimnetz unter `http://UNRAID-IP:8080` und über Cloudflare unter deiner eigenen Adresse mit HTTPS.

## 1. Docker-Image bereitstellen

Bei jedem Push auf `main` baut GitHub Actions automatisch das Image `ghcr.io/itguru279/leselernprojekt:latest` (für Intel/AMD und ARM). Den Stand siehst du im Repository unter **Actions**.

Weil das Repository privat ist, ist auch das Image zunächst privat. Zwei Möglichkeiten:

- **Einfach:** Das Image öffentlich machen. Auf GitHub: Profil → *Packages* → `leselernprojekt` → *Package settings* → *Change visibility* → *Public*. Der Quellcode bleibt privat; im Image stecken keine Passwörter.
- **Privat lassen:** Auf Unraid einmal im Terminal anmelden. Dafür auf GitHub einen *Personal access token (classic)* mit dem Recht `read:packages` erstellen und dann ausführen:

  ```bash
  docker login ghcr.io -u Itguru279
  # als Passwort den Token einfügen
  ```

## 2. Container anlegen

### Variante A: über die Unraid-Oberfläche (empfohlen)

1. Vorlage auf den Server kopieren (Unraid-Terminal):

   ```bash
   wget -O /boot/config/plugins/dockerMan/templates-user/my-leselern.xml \
     https://raw.githubusercontent.com/Itguru279/LeselernProjekt/main/unraid/leselern.xml
   ```

   Ist das Repository privat, klappt `wget` ohne Anmeldung nicht. Dann den Inhalt von [`unraid/leselern.xml`](../unraid/leselern.xml) per Hand in diese Datei kopieren, oder Variante B nehmen.

2. In Unraid: **Docker → Add Container → Template:** `leselern` auswählen.
3. Prüfen bzw. ausfüllen:

   | Feld | Wert |
   | --- | --- |
   | Web-Port | `8080` (oder ein freier Port) |
   | Daten | `/mnt/user/appdata/leselern` |
   | Admin-Passwort | ein eigenes Passwort |
   | Name des Kindes | `Ben` |
   | Bilder-Code des Kindes | `hund,katze,frosch` |
   | Startbuchstaben | `a,m,l,o,i,e` |

4. **Apply**. Unraid lädt das Image und startet den Container.

Ohne Vorlage geht es genauso über *Add Container* mit leerer Vorlage: Repository `ghcr.io/itguru279/leselernprojekt:latest`, einen Port 8080 → 8080, einen Pfad `/mnt/user/appdata/leselern` → `/data` und die Variable `ADMIN_PASSWORD` anlegen.

### Variante B: mit Docker Compose

Mit dem Plugin **Docker Compose Manager** (Community Applications):

1. *Docker → Compose → Add New Stack*, Name `leselern`.
2. Inhalt von [`docker-compose.yml`](../docker-compose.yml) einfügen und `ADMIN_PASSWORD` ändern.
3. *Compose Up*.

## 3. Ausprobieren

- Im Browser `http://UNRAID-IP:8080` öffnen.
- Ben: auf „Ben“ tippen, dann 🐶 → 🐱 → 🐸.
- Erwachsene: auf „Erwachsene“ tippen, Passwort eingeben.

Wenn `ADMIN_PASSWORD` leer war, steht ein zufälliges Passwort im Log (Docker → Container-Icon → *Logs*). Beim Start zeigt das Log außerdem Version, Datenordner, Zeitzone, ob ein Admin-Passwort gesetzt ist und Bens Buchstaben.

## 4. Über Cloudflare erreichbar machen

Du nutzt bereits Cloudflare, deshalb kümmert sich Cloudflare um HTTPS. Im Cloudflare-Dashboard unter *Zero Trust → Networks → Tunnels* beim bestehenden Tunnel einen **Public Hostname** hinzufügen:

| Feld | Wert |
| --- | --- |
| Subdomain / Domain | z. B. `lesen.deine-domain.de` |
| Service Type | `HTTP` |
| URL | `UNRAID-IP:8080` |

Empfohlen: Unter *Zero Trust → Access → Applications* eine Anwendung für `lesen.deine-domain.de` anlegen und nur deine E-Mail-Adresse(n) erlauben (Anmeldung per E-Mail-Code). Dann sieht niemand außer euch die Seite. Auf dem Tablet bleibt die Anmeldung danach lange gültig.

Die App erkennt HTTPS über Cloudflare automatisch und setzt die Login-Cookies dann nur für sichere Verbindungen.

## 5. Auf dem Tablet oder Handy

Seite öffnen, Ben einmal anmelden (bleibt ein Jahr angemeldet). Für ein App-Gefühl: im Browser-Menü **„Zum Home-Bildschirm hinzufügen“**.

Für die Vorlesefunktion braucht das Gerät eine deutsche Stimme: Unter iOS *Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch*, unter Android *Einstellungen → Sprachausgabe* (Google Sprachausgabe mit Deutsch).

## Updates

Neue Version auf GitHub → Actions baut ein neues Image → in Unraid unter *Docker* bei `leselern` auf **Update** klicken (oder *Check for Updates*). Die Daten in `/mnt/user/appdata/leselern` bleiben erhalten.

## Sicherung

Alle Daten stecken in `/mnt/user/appdata/leselern/leselern.db` (plus `-wal`/`-shm`). Das Plugin *Appdata Backup* sichert den Ordner mit.

## Probleme

| Problem | Lösung |
| --- | --- |
| Admin-Login klappt nicht | Erst ins Log schauen (Docker → Container-Icon → *Logs*): Jeder Versuch steht dort mit Grund. Lösung fast immer: `ADMIN_PASSWORD` im Container auf ein neues Passwort setzen und *Apply* (Neustart). Im Log steht dann „Admin-Passwort auf ADMIN_PASSWORD gesetzt“. Ist Ben auf dem Gerät angemeldet, im Menü auf 🔑 *Erwachsene* tippen. Nach 5 Fehlversuchen ist der Login 60 Sekunden gesperrt. |
| Admin-Passwort vergessen | `ADMIN_PASSWORD` auf ein neues Passwort ändern, Container neu starten. Wenn `ADMIN_PASSWORD` gleich bleiben soll: zusätzlich `RESET_ADMIN_PASSWORD=true`, nach dem Start wieder entfernen. |
| Mehr Details im Log | Variable `LOG_LEVEL=debug` anlegen und neu starten. |
| Bens Bilder-Code vergessen | Als Admin anmelden → Einstellungen → Bilder-Code neu setzen. |
| „denied“ beim Image-Download | Image ist privat, siehe Schritt 1. |
| Neuer Tag beginnt zur falschen Zeit | Variable `TZ` prüfen (Standard `Europe/Berlin`). |
| Keine Vorlesestimme | Deutsche Stimme auf dem Gerät installieren (siehe Schritt 5). |
