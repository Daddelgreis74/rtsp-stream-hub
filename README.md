# 🎥 RTSP Stream Hub

[![GitHub Release](https://img.shields.io/github/v/release/Daddelgreis74/rtsp-stream-hub?color=blue&logo=github)](https://github.com/Daddelgreis74/rtsp-stream-hub/releases)
[![Docker Image](https://img.shields.io/badge/docker-ghcr.io-blue?logo=docker)](https://github.com/Daddelgreis74/rtsp-stream-hub/pkgs/container/rtsp-stream-hub)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**RTSP Stream Hub** ist eine leichtgewichtige, eigenständige und dockerisierte Webanwendung zur Verwaltung und On-the-fly-Transcodierung von RTSP-Kamerastreams in browserkompatibles MJPEG. 

Sie wurde speziell entwickelt, um IP-Kamerastreams (z. B. Tapo, Reolink, Axis, Hikvision) nahtlos, latenzarm und ohne externe Abhängigkeiten in moderne SmartHome-Dashboards (wie Neo Deck oder Home Assistant) und Webbrowser einzubinden.

---

## ✨ Hauptfunktionen

* 🔄 **Autarke RTSP-zu-MJPEG Transcodierung:** Nutzt integriertes `ffmpeg` zur Konvertierung von RTSP (H.264) in flüssige MJPEG-Streams in Echtzeit.
* ⚡ **GPU-Hardwarebeschleunigung (VAAPI):** Automatische Erkennung und Nutzung von Intel-/AMD-Grafikkarten (`/dev/dri`), um die CPU-Last des Host-Servers drastisch zu reduzieren.
* 📡 **ONVIF Auto-Discovery:** Automatischer Netzwerk-Suchlauf nach IP-Kameras im lokalen Subnetz mit 1-Klick-Übernahme.
* 👥 **Multi-User & Rechteverwaltung:** Integriertes Admin-Panel mit feingranularer Rechtevergabe (z. B. nur Kameras ansehen vs. Kameras verwalten).
* 🔗 **Dauerhafte Dashboard-Links:** Generiert mit einem Klick permanente (20 Jahre gültige) Zugriffs-Links für SmartHome-Dashboards inklusive automatischem Zwischenablage-Kopierer (funktioniert auch über unverschlüsselte HTTP-Verbindungen).
* 💾 **Persistente SQLite-Datenbank:** Speichert alle Konfigurationen dateibasiert und updatesicher in einem gemounteten Volume.
* 🌓 **Modernes Bootstrap 5 Interface:** Responsives Webinterface mit umschaltbarem Light- und Dark-Mode.

---

## 🚀 Schnellstart

### 1. Mit Docker Compose (Empfohlen)

Erstelle eine `docker-compose.yml`:

```yaml
version: '3.8'

services:
  rtsp-stream-hub:
    image: ghcr.io/daddelgreis74/rtsp-stream-hub:latest
    container_name: rtsp-stream-hub
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/usr/src/app/data
    devices:
      - /dev/dri:/dev/dri  # Optional: Für GPU-Hardwarebeschleunigung
    environment:
      - PORT=8080
      - JWT_SECRET=dein-geheimer-schluessel-12345
      # - DISABLE_VAAPI=true # Einkommentieren, falls GPU-Beschleunigung deaktiviert werden soll
```

Starte den Container:
```bash
docker compose up -d
```

---

## 🎛️ Installation als Custom App auf TrueNAS SCALE

1. Öffne das TrueNAS Webinterface und gehe zu **Apps > Discover Apps > Custom App**.
2. **Application Name:** `rtsp-stream-hub`
3. **Image Repository:** `ghcr.io/daddelgreis74/rtsp-stream-hub`
4. **Image Tag:** `latest` (oder z. B. `v1.0.6` für eine feste Version)
5. **Port Forwarding:** 
   * Container Port: `8080`
   * Host Port: `8085` (oder ein anderer freier Port)
6. **Storage (Host Path für Datenbank):**
   * **Host Path:** `/mnt/Datensicherung/rtsp-stream-hub`
   * **Mount Path:** `/usr/src/app/data`
7. **GPU Configuration (Hardwarebeschleunigung):**
   * Aktiviere den Haken bei **Passthrough available (non-NVIDIA) GPUs** / weise 1 GPU zu.
8. **Portal Configuration:**
   * Port: `8085` (dein gewählter Host Port), Protokoll: `HTTP`, Pfad: `/`.
9. Klicke auf **Save**.

---

## 🔐 Standard-Zugangsdaten

Beim allerersten Start legt das System automatisch ein Standard-Administratorkonto an:

* **Benutzername:** `admin`
* **Passwort:** `admin`

> ⚠️ **Wichtig:** Bitte ändere das Passwort sofort nach dem ersten Login im Menü **Benutzerverwaltung**!

---

## ⚙️ Umgebungsvariablen (Environment Variables)

| Variable | Standardwert | Beschreibung |
| :--- | :--- | :--- |
| `PORT` | `8080` | Interner Webserver-Port |
| `JWT_SECRET` | `rtsp-stream-hub-secret-key-12345` | Geheimer Schlüssel zum Signieren der Auth-Tokens |
| `DISABLE_VAAPI` | `false` | Auf `true` setzen, um Hardware-Beschleunigung zu deaktivieren und reine CPU-Decodierung zu erzwingen |

---

## 📡 API Endpunkte

* `POST /api/auth/login` - Authentifizierung & JWT-Ausgabe
* `GET /api/cameras` - Liste aller gespeicherten Kameras
* `POST /api/cameras` - Neue Kamera hinzufügen
* `PUT /api/cameras/:id` - Kamera bearbeiten
* `DELETE /api/cameras/:id` - Kamera löschen
* `GET /api/cameras/discovery` - Startet den ONVIF-Netzwerk-Suchlauf
* `GET /api/cameras/:id/token` - Erstellt ein permanentes 20-Jahres-Token für die Kamera
* `GET /api/streams/mjpeg/:id?token=...` - Liefert den Live-MJPEG-Videostrom (`multipart/x-mixed-replace`)
* `GET /api/users` - Benutzerliste (nur Admin)
* `POST /api/users` - Benutzer anlegen (nur Admin)
* `PUT /api/users/:id/permissions` - Benutzerrechte anpassen (nur Admin)
* `DELETE /api/users/:id` - Benutzer löschen (nur Admin)

---

## 📄 Lizenz

Dieses Projekt steht unter der [MIT Lizenz](LICENSE).
