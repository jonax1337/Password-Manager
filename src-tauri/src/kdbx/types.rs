use serde::{Deserialize, Serialize};

#[derive(Clone, Serialize, Deserialize)]
pub struct CustomField {
    pub name: String,
    pub value: String,
    pub protected: bool,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct HistoryEntry {
    pub timestamp: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct EntryAttachment {
    pub key: String,
    pub data: Vec<u8>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct EntryData {
    pub uuid: String,
    pub title: String,
    pub username: String,
    pub password: String,
    pub url: String,
    pub notes: String,
    pub tags: String,
    pub group_uuid: String,
    pub icon_id: Option<usize>,
    pub is_favorite: bool,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub last_accessed: Option<String>,
    pub expiry_time: Option<String>,
    pub expires: bool,
    pub usage_count: usize,
    pub custom_fields: Vec<CustomField>,
    pub history: Vec<HistoryEntry>,
    pub attachments: Vec<EntryAttachment>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GroupData {
    pub uuid: String,
    pub name: String,
    pub parent_uuid: Option<String>,
    pub children: Vec<GroupData>,
    pub icon_id: Option<usize>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct KdfInfo {
    pub kdf_type: String,
    pub is_weak: bool,
    pub iterations: Option<u64>,
    pub memory: Option<u64>,
    pub parallelism: Option<u32>,
}

#[derive(Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_entries: usize,
    pub total_groups: usize,
    pub weak_passwords: usize,
    pub reused_passwords: usize,
    pub old_passwords: usize,
    pub expired_entries: usize,
    pub favorite_entries: usize,
    pub average_password_strength: f64,
}
