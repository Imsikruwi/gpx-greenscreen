# 🗺 GPX-GreenScreen

**Turn your GPX tracks into video overlays — no software required.**

A browser-based tool that reads `.gpx` files and generates animated overlay videos ready for greenscreen compositing in any video editor.

> ⚠ **Early Beta** — Core features are working well, but there may be bugs and rough edges. Feedback welcome via [Ko-fi](https://ko-fi.com/imsikruwi)!

---

## 🚀 Live Demo

**[→ Try it now: imsikruwi.github.io/gpx-greenscreen](https://imsikruwi.github.io/gpx-greenscreen)**

---

## ✨ Features

### Overlays
- 🏎 **Speedometer** — Gauge, Bar, HUD, Vertical bar, Horizontal bar styles
- 🔢 **Odometer** — Animated drum-style digit display
- 🗺 **Mini Map** — GPX route with circle/square/none shape
- 🕐 **GPS Time** — HH:MM:SS or custom format
- 📍 **GPS Coordinates** — DMS or Decimal format
- 📊 **Info Panel** — Speed, distance, elevation summary
- ⭕ **Arc Progress** — Circular progress indicator
- 📈 **Elevation Graph** — Real-time elevation chart
- ━ **Progress Bar** — Full-width timeline bar
- ⚡ **G-Force Meter** — Acceleration visualization
- 🧭 **Compass** — Rose or bar style
- ⛰ **Road Grade** — Current incline percentage
- 🛣 **Road Name** — From OSM data

### Workflow
- **Drag & drop** overlays anywhere on the canvas
- **Preview** with real-time playback at 1×–100× speed
- **Export** as MP4 (H.264/VP9) or PNG+ZIP sequence
- **Save/Load** overlay presets as JSON files
- Supports **Landscape 16:9**, **Portrait 9:16**, **Square 1:1**
- Output resolutions: **720p** or **1080p**

---

## 📖 How to Use

1. **Upload** your `.gpx` file by dragging it onto the page
2. **Configure** overlays in the right panel — toggle on/off, drag to position
3. **Preview** your overlay using the playback controls
4. **Export** — click **RENDER** and wait for the video to generate
5. **Download** the `.mp4` or `.zip` file
6. **Composite** the video over your footage in any video editor using the greenscreen color

---

## 🎬 Greenscreen Compositing

The default background color is **chroma green (#00b140)**. In your video editor:

1. Import the rendered overlay video
2. Apply a **Chroma Key / Greenscreen** effect
3. Key out the green — your overlays will float over your footage

Supported video editors: DaVinci Resolve, Premiere Pro, Final Cut Pro, CapCut, and more.

---

## 📁 Supported GPX Sources

- Garmin devices & Garmin Connect
- Strava
- Komoot
- Wahoo
- Any standard `.gpx` file

---

## 🛠 Technical Details

- **100% browser-based** — no server, no install, no data uploaded
- Single HTML file — works offline after first load
- Uses **WebCodecs API** for hardware-accelerated MP4 encoding
- Canvas 2D rendering at full resolution

---

## ☕ Support & Feedback

If you find this tool useful, consider supporting the development:

**[☕ Ko-fi: ko-fi.com/imsikruwi](https://ko-fi.com/imsikruwi)**

Bug reports, feature requests, and general feedback are welcome via Ko-fi messages.

---

## 📄 License

**Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)**

- ✅ Free to use and modify for personal/educational purposes
- ✅ Attribution required — keep the original credit
- ❌ Commercial use prohibited without explicit permission

[View full license →](https://creativecommons.org/licenses/by-nc/4.0/)

**Created by Masagus Zulham (Imsikruwi) © 2026**
