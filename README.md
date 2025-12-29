# Simple Password Manager

A modern, cross-platform desktop application for managing KeePass password databases. Built with Tauri 2.0, Rust, and Next.js.

## Features

- ✅ **100% KeePass Compatible** - Read and write KDBX 3 & 4 databases without data loss
- 🔒 **Secure** - No custom cryptography, uses battle-tested Rust KDBX libraries
- 🚫 **Local-First** - No cloud sync, no telemetry, your data stays on your device
- 🎨 **Modern UI** - Clean, responsive interface with light/dark mode
- 🔍 **Instant Search** - Quickly find entries across your entire database
- 🔑 **Password Generator** - Create strong, random passwords with customizable options
- 📋 **Clipboard Management** - Copy credentials with automatic clipboard clearing (30s)
- 📁 **Group Management** - Organize entries in a hierarchical folder structure
- ✏️ **Full CRUD** - Create, read, update, and delete entries and groups
- 🌍 **Cross-Platform** - Works on Windows, macOS, and Linux

## Tech Stack

### Frontend
- **Next.js 15** - React framework with static export
- **React 19** - UI library
- **shadcn/ui** - Beautiful, accessible component library
- **Tailwind CSS** - Utility-first CSS framework
- **lucide-react** - Icon library
- **next-themes** - Light/dark mode support

### Backend
- **Tauri 2.0** - Desktop application framework
- **Rust** - Systems programming language
- **keepass** - KDBX 3/4 database library
- **secrecy** - Secure secret handling
- **rand** - Random number generation for passwords

## Prerequisites

Before building, ensure you have the following installed:

- **Node.js** (v20 or later) - [Download](https://nodejs.org/)
- **npm** (v10 or later) - Comes with Node.js
- **Rust** (latest stable) - [Install via rustup](https://rustup.rs/)

### Platform-Specific Requirements

#### Windows
- Microsoft Visual Studio C++ Build Tools
- WebView2 (usually pre-installed on Windows 10/11)

#### macOS
- Xcode Command Line Tools: `xcode-select --install`

#### Linux (Debian/Ubuntu)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Linux (Fedora)
```bash
sudo dnf install webkit2gtk4.1-devel \
  openssl-devel \
  curl \
  wget \
  file \
  libappindicator-gtk3-devel \
  librsvg2-devel
sudo dnf group install "C Development Tools and Libraries"
```

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd password-wallet
```

2. **Install Node.js dependencies**
```bash
npm install
```

3. **Verify Rust installation**
```bash
rustc --version
cargo --version
```

## Development

Run the application in development mode with hot-reload:

```bash
npm run tauri:dev
```

This will:
1. Start the Next.js development server
2. Build the Rust backend
3. Launch the Tauri application

## Building for Production

Build the application for your current platform:

```bash
npm run tauri:build
```

The built application will be in `src-tauri/target/release/bundle/`.

### Build Output Locations

- **Windows**: `src-tauri/target/release/bundle/msi/` or `nsis/`
- **macOS**: `src-tauri/target/release/bundle/dmg/` or `macos/`
- **Linux**: `src-tauri/target/release/bundle/deb/` or `appimage/`

## Usage

### Opening a Database

1. Launch the application
2. Click the folder icon to select a `.kdbx` file
3. Enter your master password
4. Click "Unlock Database"

### Managing Entries

- **Create Entry**: Click the `+` icon in the entry list header
- **Edit Entry**: Click on an entry to view/edit details
- **Delete Entry**: Click the delete button in the entry editor
- **Copy Credentials**: Click the copy icon next to username/password fields

### Managing Groups

- **Create Group**: Click the `+` icon in the group tree header
- **Create Subgroup**: Hover over a group and click the `+` icon
- **Delete Group**: Hover over a group and click the trash icon

### Search

Type in the search box at the top to search across all entries by title, username, URL, notes, or tags.

### Password Generator

1. Click the `+` icon in the top toolbar
2. Adjust length and character type options
3. Click "Generate Password"
4. Copy to clipboard when ready

### Theme

Toggle between light and dark mode using the sun/moon icon in the top toolbar.

## Security Features

- **Memory Safety**: Secrets are stored using Rust's `secrecy` crate
- **No Logging**: Sensitive data is never logged
- **Clipboard Auto-Clear**: Copied passwords are automatically cleared after 30 seconds
- **Local Storage Only**: No data is sent to external servers
- **Secure File Handling**: Database files are read/written using secure file I/O

## Project Structure

```
password-wallet/
├── app/                      # Next.js app directory
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page
├── components/              # React components
│   ├── ui/                  # shadcn/ui components
│   ├── entry-editor.tsx     # Entry editing interface
│   ├── entry-list.tsx       # Entry list view
│   ├── group-tree.tsx       # Group tree navigation
│   ├── main-app.tsx         # Main application
│   ├── password-generator.tsx # Password generator
│   ├── theme-provider.tsx   # Theme context
│   └── unlock-screen.tsx    # Database unlock screen
├── lib/                     # Utility libraries
│   ├── tauri.ts            # Tauri command wrappers
│   └── utils.ts            # Utility functions
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands.rs     # Tauri commands
│   │   ├── kdbx.rs         # KDBX database operations
│   │   ├── main.rs         # Entry point
│   │   └── state.rs        # Application state
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── next.config.js          # Next.js configuration
├── package.json            # Node.js dependencies
└── tailwind.config.ts      # Tailwind CSS configuration
```

## Architecture

The application follows a clean separation between frontend and backend:

1. **Frontend (Next.js/React)**: Handles all UI rendering and user interactions
2. **Backend (Rust)**: Manages KDBX database operations, cryptography, and file I/O
3. **Bridge (Tauri)**: Provides secure IPC between frontend and backend via commands

### Key Design Decisions

- **Static Export**: Next.js is configured for static export to work with Tauri
- **No Server Components**: All components are client-side for Tauri compatibility
- **Command Pattern**: Frontend communicates with Rust via typed Tauri commands
- **State Management**: React hooks for local state, Rust Mutex for database state

## Troubleshooting

### Build Fails on Windows

Ensure you have Visual Studio C++ Build Tools installed. Download from [Microsoft](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

### WebView2 Missing on Windows

Download and install [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

### Permission Denied on Linux

Make sure the built binary has execute permissions:
```bash
chmod +x src-tauri/target/release/keepass-tauri
```

### Database Won't Open

- Verify the file is a valid `.kdbx` file
- Ensure the master password is correct
- Check that the file isn't corrupted (try opening in KeePass/KeePassXC)

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is provided as-is for educational and personal use.

## Acknowledgments

- [KeePass](https://keepass.info/) - Original password manager
- [Tauri](https://tauri.app/) - Desktop application framework
- [keepass-rs](https://github.com/sseemayer/keepass-rs) - Rust KDBX library
- [shadcn/ui](https://ui.shadcn.com/) - UI component library

## Security Notice

While this application uses established cryptographic libraries and follows security best practices, it has not undergone a professional security audit. Use at your own risk. For critical password management, consider using established applications like [KeePass](https://keepass.info/) or [KeePassXC](https://keepassxc.org/).

## Disclaimer

This is an independent implementation and is not affiliated with or endorsed by KeePass or any official KeePass project.
