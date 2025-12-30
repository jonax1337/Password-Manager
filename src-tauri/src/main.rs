// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod kdbx;
mod commands;
mod state;

use state::AppState;
use std::sync::Mutex;
use tauri::{Emitter, menu::*};

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
            let handle = app.handle();
            
            // Create View menu with zoom options
            let zoom_75 = MenuItemBuilder::with_id("zoom_75", "75%")
                .build(app)?;
            let zoom_85 = MenuItemBuilder::with_id("zoom_85", "85%")
                .build(app)?;
            let zoom_100 = MenuItemBuilder::with_id("zoom_100", "100%")
                .build(app)?;
            let zoom_110 = MenuItemBuilder::with_id("zoom_110", "110%")
                .build(app)?;
            let zoom_125 = MenuItemBuilder::with_id("zoom_125", "125%")
                .build(app)?;
            let zoom_150 = MenuItemBuilder::with_id("zoom_150", "150%")
                .build(app)?;
            
            let separator1 = PredefinedMenuItem::separator(app)?;
            
            let zoom_in = MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("Ctrl+=")
                .build(app)?;
            let zoom_out = MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("Ctrl+-")
                .build(app)?;
            let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Reset Zoom (Auto)")
                .accelerator("Ctrl+0")
                .build(app)?;
            
            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&zoom_75)
                .item(&zoom_85)
                .item(&zoom_100)
                .item(&zoom_110)
                .item(&zoom_125)
                .item(&zoom_150)
                .item(&separator1)
                .item(&zoom_in)
                .item(&zoom_out)
                .item(&zoom_reset)
                .build()?;
            
            let menu = MenuBuilder::new(app)
                .item(&view_menu)
                .build()?;
            
            app.set_menu(menu)?;
            
            // Handle menu events
            app.on_menu_event(move |app, event| {
                match event.id().as_ref() {
                    "zoom_75" => {
                        let _ = app.emit("zoom-set", 0.75);
                    }
                    "zoom_85" => {
                        let _ = app.emit("zoom-set", 0.85);
                    }
                    "zoom_100" => {
                        let _ = app.emit("zoom-set", 1.0);
                    }
                    "zoom_110" => {
                        let _ = app.emit("zoom-set", 1.1);
                    }
                    "zoom_125" => {
                        let _ = app.emit("zoom-set", 1.25);
                    }
                    "zoom_150" => {
                        let _ = app.emit("zoom-set", 1.5);
                    }
                    "zoom_in" => {
                        let _ = app.emit("zoom-in", ());
                    }
                    "zoom_out" => {
                        let _ = app.emit("zoom-out", ());
                    }
                    "zoom_reset" => {
                        let _ = app.emit("zoom-reset", ());
                    }
                    _ => {}
                }
            });
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
