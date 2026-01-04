use crate::kdbx::{Database, EntryData, GroupData, KdfInfo, DashboardStats};
use crate::state::AppState;
use rand::Rng;
use std::path::PathBuf;
use tauri::State;
use sha1::{Sha1, Digest};

#[tauri::command]
pub fn get_initial_file_path(state: State<AppState>) -> Option<String> {
    let initial_path = state.initial_file_path.lock().unwrap();
    initial_path.clone()
}

#[tauri::command]
pub fn clear_initial_file_path(state: State<AppState>) {
    let mut initial_path = state.initial_file_path.lock().unwrap();
    *initial_path = None;
}

#[tauri::command]
pub fn create_database(
    state: State<AppState>,
    path: String,
    password: String,
) -> Result<GroupData, String> {
    let db = Database::create(PathBuf::from(&path), password).map_err(|e| e.to_string())?;

    let root_group = db.get_root_group();

    let mut database_lock = state.database.lock().unwrap();
    *database_lock = Some(db);

    Ok(root_group)
}

#[tauri::command]
pub fn open_database(
    state: State<AppState>,
    path: String,
    password: String,
) -> Result<(GroupData, String), String> {
    let path_buf = PathBuf::from(&path);
    let db = Database::open(path_buf.clone(), password).map_err(|e| e.to_string())?;

    let root_group = db.get_root_group();

    let mut database_lock = state.database.lock().unwrap();
    *database_lock = Some(db);

    Ok((root_group, path))
}

#[tauri::command]
pub fn save_database(state: State<AppState>) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.save().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn close_database(state: State<AppState>) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();
    *database_lock = None;
    Ok(())
}

#[tauri::command]
pub fn get_kdf_info(state: State<AppState>) -> Result<KdfInfo, String> {
    let database_lock = state.database.lock().unwrap();
    if let Some(db) = database_lock.as_ref() {
        Ok(db.get_kdf_info())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn upgrade_kdf_parameters(state: State<AppState>) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();
    if let Some(db) = database_lock.as_mut() {
        db.upgrade_kdf_parameters().map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn get_groups(state: State<AppState>) -> Result<GroupData, String> {
    let database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_ref() {
        Ok(db.get_root_group())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn get_entries(state: State<AppState>, group_uuid: String) -> Result<Vec<EntryData>, String> {
    let database_lock = state.database.lock().unwrap();
    let db = database_lock
        .as_ref()
        .ok_or("Database not loaded".to_string())?;

    db.get_entries_in_group(&group_uuid).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_favorite_entries(state: State<AppState>) -> Result<Vec<EntryData>, String> {
    let database_lock = state.database.lock().unwrap();
    let db = database_lock
        .as_ref()
        .ok_or("Database not loaded".to_string())?;

    let all_entries = db.get_all_entries();
    let favorites: Vec<EntryData> = all_entries
        .into_iter()
        .filter(|entry| entry.is_favorite)
        .collect();

    Ok(favorites)
}

#[tauri::command]
pub fn get_entry(state: State<AppState>, entry_uuid: String) -> Result<EntryData, String> {
    let database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_ref() {
        db.get_entry(&entry_uuid).map_err(|e| e.to_string())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn create_entry(state: State<AppState>, entry: EntryData) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.create_entry(entry).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn update_entry(state: State<AppState>, entry: EntryData) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.update_entry(entry).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn delete_entry(state: State<AppState>, entry_uuid: String) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.delete_entry(&entry_uuid).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}


#[tauri::command]
pub fn create_group(
    state: State<AppState>,
    name: String,
    parent_uuid: Option<String>,
    icon_id: Option<u32>,
) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.create_group(name, parent_uuid, icon_id)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn rename_group(
    state: State<AppState>,
    group_uuid: String,
    new_name: String,
    icon_id: Option<u32>,
) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.rename_group(&group_uuid, new_name, icon_id)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn move_group(
    state: State<AppState>,
    group_uuid: String,
    new_parent_uuid: String,
) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.move_group(&group_uuid, &new_parent_uuid)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn reorder_group(
    state: State<AppState>,
    group_uuid: String,
    target_index: usize,
) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.reorder_group(&group_uuid, target_index)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn delete_group(state: State<AppState>, group_uuid: String) -> Result<(), String> {
    let mut database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_mut() {
        db.delete_group(&group_uuid).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn search_entries(state: State<AppState>, query: String) -> Result<Vec<EntryData>, String> {
    let database_lock = state.database.lock().unwrap();

    if let Some(db) = database_lock.as_ref() {
        Ok(db.search_entries(&query))
    } else {
        Err("No database loaded".to_string())
    }
}

#[tauri::command]
pub fn generate_password(
    length: usize,
    use_uppercase: bool,
    use_lowercase: bool,
    use_numbers: bool,
    use_symbols: bool,
) -> Result<String, String> {
    if length == 0 || length > 256 {
        return Err("Invalid password length".to_string());
    }

    let mut charset = String::new();
    if use_uppercase {
        charset.push_str("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if use_lowercase {
        charset.push_str("abcdefghijklmnopqrstuvwxyz");
    }
    if use_numbers {
        charset.push_str("0123456789");
    }
    if use_symbols {
        charset.push_str("!@#$%^&*()_+-=[]{}|;:,.<>?");
    }

    if charset.is_empty() {
        return Err("At least one character type must be selected".to_string());
    }

    let charset_vec: Vec<char> = charset.chars().collect();
    let mut rng = rand::thread_rng();

    let password: String = (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..charset_vec.len());
            charset_vec[idx]
        })
        .collect();

    Ok(password)
}

#[tauri::command]
pub fn get_dashboard_stats(state: State<AppState>) -> Result<DashboardStats, String> {
    let database_lock = state.database.lock().unwrap();
    
    if let Some(db) = database_lock.as_ref() {
        Ok(db.get_dashboard_stats())
    } else {
        Err("No database loaded".to_string())
    }
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct BreachedEntry {
    pub uuid: String,
    pub title: String,
    pub username: String,
    pub breach_count: u32,
}

#[tauri::command]
pub async fn check_breached_passwords(state: State<'_, AppState>) -> Result<Vec<BreachedEntry>, String> {
    // Extract all entries while holding the lock, then release it
    let all_entries = {
        let database_lock = state.database.lock().unwrap();
        
        if let Some(db) = database_lock.as_ref() {
            db.get_all_entries()
        } else {
            return Err("No database loaded".to_string());
        }
    }; // Lock is dropped here
    
    let mut breached_entries = Vec::new();
    let mut error_count = 0;
    
    for entry in all_entries {
        if entry.password.is_empty() {
            continue;
        }
        
        match check_password_breach(&entry.password).await {
            Ok(count) if count > 0 => {
                breached_entries.push(BreachedEntry {
                    uuid: entry.uuid,
                    title: entry.title,
                    username: entry.username,
                    breach_count: count,
                });
            }
            Ok(_) => {}
            Err(_) => {
                // Don't log entry-specific information to avoid leaking sensitive metadata
                error_count += 1;
            }
        }
    }
    
    if error_count > 0 {
        eprintln!("HIBP breach check: {} password(s) could not be checked due to API errors", error_count);
    }
    
    Ok(breached_entries)
}

async fn check_password_breach(password: &str) -> Result<u32, String> {
    // Hash the password using SHA-1
    let mut hasher = Sha1::new();
    hasher.update(password.as_bytes());
    let hash = hasher.finalize();
    let hash_hex = format!("{:X}", hash);
    
    // Use k-anonymity: send only first 5 characters
    let prefix = &hash_hex[..5];
    let suffix = &hash_hex[5..];
    
    // Query HIBP API
    let url = format!("https://api.pwnedpasswords.com/range/{}", prefix);
    let client = reqwest::Client::builder()
        .user_agent("Simple-Password-Manager")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client
        .get(&url)
        if response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
            let retry_after = response
                .headers()
                .get(reqwest::header::RETRY_AFTER)
                .and_then(|h| h.to_str().ok())
                .unwrap_or("unknown");
            return Err(format!("HIBP rate limited (Retry-After: {})", retry_after));
        }

        if !response.status().is_success() {
        .await
        .map_err(|e| format!("Failed to query HIBP API: {}", e))?;
    
    if !response.status().is_success() {
        return Err(format!("HIBP API returned status: {}", response.status()));
    }
    
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;
    
    // Parse response to find our hash suffix
    for line in body.lines() {
        if let Some((hash_part, count_str)) = line.split_once(':') {
            if hash_part == suffix {
                return count_str
                    .trim()
                    .parse::<u32>()
                    .map_err(|e| format!("Failed to parse count: {}", e));
            }
        }
    }
    
    // Not found in breaches
    Ok(0)
}
