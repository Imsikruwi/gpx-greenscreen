# ⬡ GPX-GreenScreen (Beta)

**[🌐 Try it Live: https://imsikruwi.github.io/gpx-greenscreen](https://imsikruwi.github.io/gpx-greenscreen)**

**GPX-GreenScreen** is a high-performance, browser-based tool designed to transform your GPX tracks into animated video overlays. Perfect for cycling, running, or automotive videos, it allows you to visualize telemetry data with professional-grade precision.

---

## 🚀 Key Features & Latest Updates

- **Instant Onboarding (New!)**: 
  - **One-Click Sample**: Test the tool instantly using the "Try Sample GPX" button right on the landing page.
  - **Example Video**: Watch a final rendered output via YouTube video link.
- **Preset Management System (New!)**:
  - **Instant Presets**: Load rich, pre-configured overlay layouts (like "Preset 1") with a single click, complete with smart loading indicators.
  - **Quick Default Reset**: Instantly revert all overlay positions, colors, and settings back to the standard layout using the "Default" button.
  - **Active State Syncing**: The UI intelligently tracks and highlights whether you are using the Default layout or a custom Preset.
- **Smart Rendering System**:
  - **Dynamic Render Controls**: The Render button seamlessly transforms into distinct Pause/Resume (White) and Cancel (Red) buttons during processing for clear, safe control.
  - **Pause & Resume**: Pause your rendering process at any time without losing progress.
  - **Total UI Lockdown**: Safely disables all UI interactions (Format, Aspect Ratio, Background Color, Fit Mode, Timeframe, etc.) during rendering to prevent accidental changes and video glitches.
  - **Auto-Download**: Automatically triggers the file download the moment your render is 100% complete.
  - **Tab Protection**: Warns you if you accidentally try to close or refresh the tab during a long render.
  - **Dynamic ETA**: Smart, human-readable time estimates and automatic limits (Soft limit for MP4, Hard limit for ZIP) to prevent browser memory crashes.
- **Advanced GPS Smoothing**: Implements a 5-point weighted moving average and strict "Stop Detection" to eliminate GPS drift (ghost speeds) when you are completely stationary.
- **Enhanced Timeframe Selector**: 
  - Displays the **Actual GPS Time** alongside duration to help you sync with your raw video files.
  - Features a live **Playhead indicator** (red line) to track your exact position during playback and rendering.
- **Dynamic Overlays**: Speedometers (Gauge, Bar, HUD), Odometer, Mini Maps, Elevation Graphs, GPS Time, and Coordinates.
- **Professional Export Options**:
  - **PNG + ZIP (Alpha Channel)**: Export with **100% Transparency** for perfect integration into video editors (Premiere, DaVinci, CapCut) without chroma keying.
  - **MP4 (WebCodecs)**: Fast, hardware-accelerated video encoding directly in your browser.
- **Interactive UI**: Drag-and-drop overlays to reposition them, adjust scales, opacities, and colors in real-time.
- **Privacy Focused**: All processing is done locally. Your GPS data never leaves your computer.

## 🛠 How to Use

1. **Upload**: Drag and drop your `.gpx` file onto the dashboard, or click "Try Sample GPX" to test.
2. **Configure**: Select the overlays you want to display from the right-hand panel.
3. **Customize**: 
   - Drag overlays on the canvas to set positions.
   - Use the **Timeframe Selector** to trim your activity to specific segments.
   - Adjust the **Opacity Slider** and **Font Scale** for the perfect look.
   - Try different **Presets** for quick styling.
4. **Render**:
   - Choose **MP4** for a ready-to-use video file.
   - Choose **PNG + ZIP** and enable **"100% Transparent Background"** for high-end compositing.
5. **Download**: The rendered output will download automatically. Import it into your video editing software.

## 💻 Technical Stack

- **Framework**: Vanilla JavaScript (ES6+) with a modular architecture.
- **Rendering**: HTML5 Canvas API with time-based interpolation.
- **Encoding**: WebCodecs API for low-latency video generation.
- **Map Engine**: Hybrid vector/tile system using OpenStreetMap and Overpass API.
- **Compression**: JSZip for efficient image sequence packaging.

## ⚠️ Beta Status (v0.9.x)

This project is currently in **Beta**. Core functions like rendering and transparency are stable, but we are still refining the experience. 
- **Memory Optimization**: Uses `toBlob` and backpressure control to prevent browser crashes during long renders.
- **Bug Reports**: If you encounter issues with specific GPX files, please report them via the Ko-fi page.

## 📜 License

Licensed under **CC BY-NC 4.0**. 
- **Free for non-commercial use** with attribution. 
- **Commercial use** is prohibited without prior permission.

---

### Support the Project
Created with ❤️ by **Masagus Zulham**. If this tool saves you hours of editing, consider supporting its development!
<br>
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/imsikruwi)