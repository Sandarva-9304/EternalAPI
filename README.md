# Eternal IDE

<p>
  <img src="https://img.shields.io/badge/Tauri-v2-24C8DB?logo=tauri&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Desktop-Windows/Linux--Platform-success" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

<p align="center">
  <img src="logo.png" width="500" length="500" alt="Eternal IDE Logo" />
</p>
<p align="center">
  <strong>Eternal IDE</strong> is a modern, Windows/Linux desktop IDE built with <strong>Tauri</strong>, <strong>React</strong>, and <strong>TypeScript</strong>.
</p>
<p align="center">It combines a powerful code editor, real filesystem access, Git integration, real-time messaging, and audio/video calling — all inside a fast native desktop application.</p>

---

## ✨ What is Eternal IDE?

**Eternal IDE** is a **next-generation desktop development environment** designed to go beyond traditional code editors.

It combines:

- 🧑‍💻 A powerful code editor
- 📁 Native filesystem access
- 🌱 Built-in Git workflows
- 💬 Real-time messaging
- 📞 Audio & video calling

All inside a **lightweight, blazing-fast Tauri desktop app**.

---

## ✨ Features

- 🧑‍💻 **Code Editor**

  - CodeMirror-based editor with syntax highlighting
  - Multi-tab editing
  - Language detection & theming
  - Unsaved change tracking

- 📁 **Native File System**

  - Open folders & files
  - Create, rename, delete files and directories
  - Live filesystem watching via Tauri
  - Drag & drop support

- 🧪 **Integrated Terminal**

  - Native PTY powered terminal
  - Multiple terminal tabs
  - Git command awareness
  - Works directly inside the workspace

- 🌱 **Git Integration**

  - Repository status tracking
  - Branch & sync status
  - Commit graph visualization
  - Automatic refresh on Git actions

- 💬 **Real-Time Messaging**

  - Private & group chats
  - Message persistence
  - Notifications for new messages

- 📞 **Audio & Video Calling**

  - Peer-to-peer WebRTC calls
  - Audio & video toggle
  - Call notifications & controls

- 🔐 **Authentication**

  - GitHub authentication via Clerk
  - User presence & profiles

- 🪟 **Dockable Layout**
  - Resizable panels (left, right, bottom)
  - Keyboard shortcuts
  - Multi-window support

---

## 🧩 Tech Stack

### Frontend

- **React 19**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Radix UI**
- **Framer Motion**
- **CodeMirror 6**
- **XTerm.js**

### Desktop / Backend

- **Tauri v2**
- **Rust**
- **Tauri Plugins**
  - Filesystem
  - Dialogs
  - Shell
  - Notifications
  - PTY (terminal)

### Realtime

- **Socket.IO**
- **WebRTC**

---

## 📂 Project Structure

```txt
src/
├── components/        # UI & feature components
│   ├── Editor.tsx
│   ├── FileSystem.tsx
│   ├── Terminal.tsx
│   ├── ChatWindow.tsx
│   ├── Call.tsx
│   ├── Git.tsx
│   └── ...
├── contexts/          # Global state providers
├── lib/               # Socket & shared logic
├── utils/             # Editor, FS & message utilities
├── types/             # Global TypeScript types
└── main.tsx
src-tauri/
├── src/
│   ├── main.rs
│   └── lib.rs
├── tauri.conf.json
└── Cargo.toml
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18

- **Rust** (stable)

### 1️⃣ Install Dependencies

```bash
npm install
```

### 2️⃣ Environment Variables

Create a .env file in the root:

```env
VITE_CLERK_PUBLISHABLE_KEY=<your_clerk_publishable_key>
VITE_CLERK_SECRET_KEY=<your_clerk_secret_key>
VITE_BACKEND_URL=<your_backend_url>
```

### 3️⃣ Run in Development

```bash
npm tauri dev
```

### 4️⃣ Build for Production

```bash
npm tauri build
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut                | Action           |
| ----------------------- | ---------------- |
| `Ctrl + N`              | New File         |
| `Ctrl + O`              | Open File        |
| `Ctrl + backticks`      | Toggle Terminal  |
| `Ctrl + S`              | Save File        |
| `Ctrl + W`              | Close File       |
| `Ctrl + K` → `Ctrl + O` | Open Folder      |
| `Ctrl + K` → `F`        | Close Folder     |
| `Ctrl + Shift + N`      | New Window       |
| `Ctrl + Shift + E`      | File Explorer    |
| `Ctrl + Shift + G`      | Git Panel        |
| `Ctrl + Shift + F`      | Workspace Search |

---

## 🧪 Experimental / In-Progress

- Intellisense & AI-powered code completion

- Collaborative editing & Code Formatter

- Whiteboard & planning tools

- Plugin system

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo

2. Create a feature branch

3. Commit your changes

4. Open a pull request

---

## 📜 License

This project is licensed under the MIT License.

---

## 💡 Inspiration

Eternal IDE is inspired by modern developer tools like VS Code, Discord, and Notion, aiming to unify coding, collaboration, and communication into a single native desktop experience.

---

## 👨‍💻 Contributors

- **[Sandarva-9304](https://github.com/Sandarva-9304)**

- **[sahil-ansari-47](https://github.com/sahil-ansari-47)**

---
