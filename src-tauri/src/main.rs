// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod kdbx;
mod commands;
mod state;

use state::AppState;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            database: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_database,
            commands::open_database,
            commands::save_database,
            commands::close_database,
            commands::get_groups,
            commands::get_entries,
            commands::get_entry,
            commands::create_entry,
            commands::update_entry,
            commands::delete_entry,
            commands::create_group,
            commands::rename_group,
            commands::move_group,
            commands::reorder_group,
            commands::delete_group,
            commands::search_entries,
            commands::generate_password,
        ])
        .setup(|app| {
            // Handle file associations - check if app was opened with a .kdbx file
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                if file_path.ends_with(".kdbx") {
                    println!("Opening database from file association: {}", file_path);
                    // Emit event to frontend with the file path
                    if let Some(window) = app.get_webview_window("main") {
                        let _: Result<(), tauri::Error> = window.emit("open-database-file", file_path.clone());
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
