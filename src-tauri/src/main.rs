// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod kdbx;
mod commands;
mod state;

use state::AppState;
use std::sync::Mutex;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tauri::menu::{Menu, MenuItem};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            database: Mutex::new(None),
            initial_file_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_initial_file_path,
            commands::clear_initial_file_path,
            commands::create_database,
            commands::open_database,
            commands::save_database,
            commands::close_database,
            commands::get_kdf_info,
            commands::upgrade_kdf_parameters,
            commands::get_groups,
            commands::get_entries,
            commands::get_favorite_entries,
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
            commands::get_dashboard_stats,
        ])
        .setup(|app| {
            // Set up system tray
            let show_item = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Simple Password Manager")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Handle file associations - check if app was opened with a .kdbx file
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let file_path = &args[1];
                if file_path.ends_with(".kdbx") {
                    println!("Opening database from file association: {}", file_path);
                    
                    // Store the file path in app state so it can be retrieved by the frontend
                    if let Ok(mut initial_path) = app.state::<AppState>().initial_file_path.lock() {
                        *initial_path = Some(file_path.clone());
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
