use crate::kdbx::Database;
use std::sync::Mutex;

pub struct AppState {
    pub database: Mutex<Option<Database>>,
}
