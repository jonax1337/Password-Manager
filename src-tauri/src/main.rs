// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod kdbx;
mod commands;
mod state;

use state::AppState;
use std::sync::Mutex;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
