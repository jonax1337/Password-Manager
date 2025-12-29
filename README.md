# Simple Password Manager

Modern KeePass-compatible password manager built with Tauri, Rust, and Next.js.

## Features

- ✅ **KeePass Compatible** - Read/write KDBX 3 & 4 databases
- 🔒 **Secure & Local** - No cloud, no telemetry, battle-tested crypto
- 🎨 **Modern UI** - Clean interface with light/dark theme
- 🔍 **Search** - Find entries instantly across your database
- 🔑 **Password Generator** - Customizable strong password generation
- 📋 **Auto-Clipboard Clear** - Passwords cleared after 30 seconds
- 📁 **Drag & Drop** - Organize entries and groups with drag-and-drop
- 🖼️ **Custom Icons** - Choose from 69 built-in KeePass icons
- 💾 **State Persistence** - Remembers expanded folders per database
- 🖱️ **Context Menus** - Right-click anywhere for quick actions
- 🪟 **Multi-Window** - Edit entries in separate windows
- 🌍 **Cross-Platform** - Windows, macOS, and Linux

## Tech Stack

- **Frontend**: Next.js 15, React 19, shadcn/ui, Tailwind CSS, dnd-kit
- **Backend**: Tauri 2.0, Rust, keepass-rs, secrecy
- **Icons**: lucide-react + 69 KeePass built-in icons

## Prerequisites

- **Node.js** v20+ and **npm** v10+
- **Rust** (latest stable via [rustup](https://rustup.rs/))
- **Windows**: Visual Studio C++ Build Tools + WebView2
- **macOS**: Xcode Command Line Tools
- **Linux**: webkit2gtk, build tools (see [Tauri docs](https://tauri.app/v1/guides/getting-started/prerequisites))

## Quick Start

```bash
# Install dependencies
npm install

# Development
npm run tauri:dev

# Build for production
npm run tauri:build
```

Builds are located in `src-tauri/target/release/bundle/`

## Usage

- **Open Database**: Select `.kdbx` file and enter master password
- **Create Entry/Group**: Click `+` button or right-click empty area for context menu
- **Edit Entry**: Double-click entry or right-click → Edit (opens in new window)
- **Organize**: Drag entries between groups, drag groups to reorder
- **Search**: Type in top search bar to find entries
- **Icons**: Click folder/entry icon to choose from 69 KeePass icons
- **Copy**: Click copy icons for username/password (auto-clears in 30s)
- **Theme**: Toggle light/dark with sun/moon icon

## Security

- Memory-safe Rust with `secrecy` crate for secret handling
- No logging of sensitive data
- Clipboard auto-clears after 30 seconds
- 100% local, no network calls
- Battle-tested KDBX cryptography via keepass-rs

## Disclaimer

This software has not undergone a professional security audit. Use at your own risk. For critical password management, consider [KeePass](https://keepass.info/) or [KeePassXC](https://keepassxc.org/).

Not affiliated with or endorsed by the official KeePass project.
