use crate::kdbx::Database;
use std::sync::Mutex;
use std::collections::{HashMap, HashSet};
use std::time::Instant;

pub struct AppState {
    pub database: Mutex<Option<Database>>,
    pub initial_file_path: Mutex<Option<String>>,
    pub dismissed_breaches: Mutex<HashMap<String, HashSet<String>>>,
    pub last_hibp_check: Mutex<Option<Instant>>,
    pub hibp_enabled: Mutex<bool>,
}
