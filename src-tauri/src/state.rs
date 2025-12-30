use crate::kdbx::Database;
use std::sync::Mutex;

pub struct AppState {
    pub database: Mutex<Option<Database>>,
    pub initial_file_path: Mutex<Option<String>>,
}
