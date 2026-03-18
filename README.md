# ⬡ GPX-GreenScreen (Beta)

**GPX-GreenScreen** is a high-performance, browser-based tool designed to transform your GPX tracks into animated video overlays. Perfect for cycling, running, or automotive videos, it allows you to visualize telemetry data with professional-grade precision.

---

## 🚀 Key Features

- **Dynamic Overlays**: Speedometers (Gauge, Bar, HUD), Odometer, Mini Maps, Elevation Graphs, GPS Time, and Coordinates.
- **Professional Export Options**:
  - **PNG + ZIP (Alpha Channel)**: Export with **100% Transparency** for perfect integration into video editors (Premiere, DaVinci, CapCut) without chroma keying.
  - **MP4 (WebCodecs)**: Fast, hardware-accelerated video encoding directly in your browser.
- **Smooth Playback**: Advanced 60fps interpolation ensures fluid animations regardless of the recording interval or export frame rate.
- **Interactive UI**: Drag-and-drop overlays to reposition them, adjust scales, opacities, and colors in real-time.
- **Privacy Focused**: All processing is done locally. Your GPS data never leaves your computer.

## 🛠 How to Use

1. **Upload**: Drag and drop your `.gpx` file onto the dashboard.
2. **Configure**: Select the overlays you want to display from the right-hand panel.
3. **Customize**: 
   - Drag overlays on the canvas to set positions.
   - Use the **Timeframe Selector** to trim your activity to specific segments.
   - Adjust the **Opacity Slider** and **Font Scale** for the perfect look.
4. **Render**:
   - Choose **MP4** for a ready-to-use video file.
   - Choose **PNG + ZIP** and enable **"100% Transparent Background"** for high-end compositing.
5. **Download**: Save the rendered output and import it into your video editing software.

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
Created with ❤️ by **Masagus Zulham (Imsikruwi)** · 2026  
[☕ Support on Ko-fi](https://ko-fi.com/imsikruwi)
