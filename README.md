# Unimate 🎬

Unimate is a modern, lightweight desktop video downloader for YouTube and TikTok. Originally built as a client-server web app, it has been completely rewritten as a native desktop application using **Tauri v2** and **Rust**.

## Architecture Overview

- **Frontend:** React + Vite (located in `/client`) styled with modern, responsive CSS featuring both dark and light modes.
- **Backend:** Rust (`/client/src-tauri`) managing processes, reading metadata, and coordinating downloads natively using the `tokio` asynchronous runtime.
- **Engine:** `yt-dlp` is invoked as a subprocess to extract video information and handle the downloading and format merging.
- **Native Integrations:** Uses the native OS file save dialogs via the Rust-based `rfd` library, and downloads are automatically cached in the application's local data directory before being saved.

---

## Prerequisites

To run or build this application, you must have the following installed on your system:

1. **Rust:** Install via [rustup](https://rustup.rs/).
2. **Node.js & npm:** Install via [nodejs.org](https://nodejs.org/).
3. **yt-dlp:** Must be installed and available in your system's PATH.
   - **Windows:** `winget install yt-dlp` or `pip install yt-dlp`
   - **macOS:** `brew install yt-dlp`
   - **Linux:** `sudo apt install yt-dlp` (or use pip)

---

## Getting Started

### 1. Install Frontend Dependencies

Navigate to the `client` directory and install the dependencies:

```bash
cd client
npm install
```

### 2. Run in Development Mode

Run the following command to start the hot-reloading development window:

```bash
npm run tauri dev
```

This starts the Vite local server and opens a native OS window running your application. Any changes to the frontend or Rust backend will automatically reload or rebuild the app.

### 3. Build for Production

To compile a production-ready installer (e.g., `.msi` or `.exe` on Windows, `.dmg` or `.app` on macOS, `.deb` or `.AppImage` on Linux):

```bash
npm run tauri build
```

The resulting installers will be located in `/client/src-tauri/target/release/bundle/`.

---

## License

This project is licensed under the MIT License.
