# GitHub Copilot Instructions for Simple Password Manager

This repository contains a modern KeePass-compatible password manager built with Tauri, Rust, and Next.js.

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript with strict mode enabled
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **Drag & Drop**: @dnd-kit for organizing entries and groups
- **Icons**: lucide-react + 69 built-in KeePass icons

### Backend
- **Framework**: Tauri 2.0
- **Language**: Rust (edition 2021)
- **Database**: keepass crate (v0.7) for KDBX 3 & 4 support
- **Security**: secrecy crate for sensitive data handling

## Project Structure

- `/app` - Next.js application pages and layouts
- `/components` - React components (UI components, password manager features)
- `/lib` - Utility functions, Tauri bindings, types, and helpers
- `/src-tauri/src` - Rust backend code
  - `main.rs` - Application entry point with Tauri setup
  - `commands.rs` - Tauri commands for frontend-backend communication
  - `kdbx.rs` - KeePass database operations and types
  - `state.rs` - Application state management

## Code Conventions

### TypeScript/React
- Use TypeScript with strict type checking
- Prefer functional components with hooks
- Use `"use client"` directive for client-side components in Next.js
- Import UI components from `@/components/ui/`
- Import types from `@/lib/` modules
- Use camelCase for variables and functions
- Use PascalCase for components and types
- Destructure props in component parameters
- Use optional chaining and nullish coalescing for safety

### Rust
- Follow Rust 2021 edition conventions
- Use `#[tauri::command]` attribute for Tauri commands
- Commands return `Result<T, String>` for error handling
- Use `State<AppState>` for accessing shared application state
- Lock mutexes with `.lock().unwrap()` pattern
- Convert errors to strings with `.map_err(|e| e.to_string())`
- Use `thiserror` for custom error types
- Handle sensitive data with the `secrecy` crate

### Tauri Communication
- Frontend calls backend via `invoke()` from `@tauri-apps/api/core`
- All Tauri bindings are in `/lib/tauri.ts`
- Use TypeScript interfaces that match Rust structs
- Backend commands use snake_case, frontend uses camelCase

## Security Practices

**CRITICAL**: This is a password manager. Security is paramount.

- **Never log sensitive data**: passwords, keys, or credentials
- **Use secrecy crate**: wrap sensitive strings in `SecretString`
- **Clear clipboard**: auto-clear after 30 seconds
- **Memory safety**: leverage Rust's memory safety guarantees
- **No network calls**: application is 100% local
- **Validate inputs**: check all user inputs before processing
- **Error messages**: avoid exposing sensitive information in errors

## Development Workflow

### Building and Running
```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build

# Lint code
npm run lint
```

### Testing Changes
- Test with actual KDBX databases (both v3 and v4)
- Verify KeePass compatibility
- Test all CRUD operations (create, read, update, delete)
- Test drag-and-drop functionality
- Verify clipboard auto-clear functionality
- Test theme switching (light/dark mode)

## Common Patterns

### Frontend State Management
- Use `useState` for component-local state
- Use `useEffect` for side effects and lifecycle
- Use `useRef` for values that persist without re-rendering
- Listen to Tauri events with `listen()` from `@tauri-apps/api/event`

### Error Handling
- Display user-friendly errors with toast notifications
- Use `useToast()` hook from shadcn/ui
- Provide context in error messages without exposing sensitive data

### Component Structure
- Keep components focused on single responsibility
- Extract reusable logic into custom hooks in `/lib`
- Use composition for complex UI components
- Separate business logic from presentation

## API Design

### Tauri Commands
All commands follow these patterns:
- Accept primitive types or serializable structs
- Return `Result<T, String>` for error handling
- Access database via `State<AppState>`
- Commands are registered in `main.rs` with `generate_handler!`

### Data Flow
1. User interaction in React component
2. Call function from `/lib/tauri.ts`
3. Function invokes Tauri command
4. Rust backend processes request
5. Returns result to frontend
6. Update UI state and display result

## UI/UX Guidelines

- **Icons**: Use lucide-react icons for UI, KeePass icons for entries/groups
- **Theming**: Support light and dark themes via next-themes
- **Accessibility**: Use semantic HTML and ARIA attributes
- **Responsive**: Design works on various window sizes
- **Context Menus**: Right-click support for common actions
- **Keyboard Shortcuts**: Support where appropriate

## Performance

- **Lazy Loading**: Load entries on-demand per group
- **Search**: Implement efficient search across all entries
- **State Persistence**: Save UI state (expanded groups) per database
- **Debouncing**: Debounce search input to avoid excessive calls

## Dependencies

### Adding New Dependencies
- Frontend: Use `npm install <package>`
- Backend: Add to `src-tauri/Cargo.toml`
- Prefer well-maintained, security-audited packages
- Avoid packages with native modules when possible

### Key Dependencies
- `@tauri-apps/api` - Tauri JavaScript API
- `keepass` - Core KeePass database functionality
- `shadcn/ui` - Pre-built accessible components
- `next-themes` - Theme management

## File Naming

- React components: kebab-case (e.g., `entry-editor.tsx`)
- Utility modules: kebab-case (e.g., `group-state.ts`)
- Rust modules: snake_case (e.g., `commands.rs`)
- Types/Interfaces: Use in same file or `/lib` modules

## Best Practices

1. **Type Safety**: Use TypeScript types and Rust type system rigorously
2. **Error Boundaries**: Handle errors gracefully at component level
3. **Validation**: Validate data at both frontend and backend
4. **Consistency**: Follow existing patterns in the codebase
5. **Documentation**: Comment complex logic, especially crypto operations
6. **Testing**: Manually test all changes with real KDBX files
7. **Security Review**: Consider security implications of all changes

## Known Patterns in Codebase

- UUID handling: String format in frontend, `Uuid` type in Rust
- Optional fields: Use `Option<T>` in Rust, optional `?` in TypeScript
- Icon IDs: Optional `usize` in Rust, optional `number` in TypeScript
- Group hierarchy: Recursive `GroupData` structure with `children` array
- Entry editing: Opens in separate window using `openEntryWindow()`

## Avoiding Common Pitfalls

- Don't expose internal database structure to frontend
- Don't assume database is always loaded (check `Option<Database>`)
- Don't forget to save database after modifications
- Don't break KeePass compatibility (test with KeePass/KeePassXC)
- Don't add telemetry or analytics (violates privacy promise)
