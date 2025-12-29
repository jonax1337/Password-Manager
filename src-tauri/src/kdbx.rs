use keepass::{
    db::{Entry, Group, Node, Value},
    Database as KeepassDatabase, DatabaseKey,
};
use secrecy::{ExposeSecret, SecretString};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::PathBuf;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum DatabaseError {
    #[error("Failed to open database: {0}")]
    OpenError(String),
    #[error("Failed to save database: {0}")]
    SaveError(String),
    #[error("Database not loaded")]
    NotLoaded,
    #[error("Invalid password or keyfile")]
    InvalidCredentials,
    #[error("Entry not found")]
    EntryNotFound,
    #[error("Group not found")]
    GroupNotFound,
    #[error("Invalid UUID format")]
    InvalidUuid,
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
}

#[derive(Clone, Serialize, Deserialize)]
pub struct GroupData {
    pub uuid: String,
    pub name: String,
    pub parent_uuid: Option<String>,
    pub children: Vec<GroupData>,
    pub icon_id: Option<usize>,
}

pub struct Database {
    pub db: KeepassDatabase,
    pub path: PathBuf,
    pub password: SecretString,
}

impl Database {
    pub fn create(path: PathBuf, password: String) -> Result<Self, DatabaseError> {
        let secret_password = SecretString::new(password);
        
        // Extract database name from filename (without .kdbx extension)
        let db_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Root")
            .to_string();
        
        // Create database with default configuration (KDBX4 format)
        let mut db = KeepassDatabase::new(Default::default());
        db.root.name = db_name;
        
        let mut new_db = Self {
            db,
            path,
            password: secret_password,
        };
        
        new_db.save()?;
        
        Ok(new_db)
    }

    pub fn open(path: PathBuf, password: String) -> Result<Self, DatabaseError> {
        let secret_password = SecretString::new(password);
        
        let file = File::open(&path)
            .map_err(|e| DatabaseError::OpenError(format!("Failed to open file: {}", e)))?;

        let key = DatabaseKey::new().with_password(secret_password.expose_secret());
        
        let db = KeepassDatabase::open(&mut std::io::BufReader::new(file), key)
            .map_err(|e| {
                if e.to_string().contains("Invalid credentials") {
                    DatabaseError::InvalidCredentials
                } else {
                    DatabaseError::OpenError(e.to_string())
                }
            })?;

        Ok(Self {
            db,
            path,
            password: secret_password,
        })
    }

    pub fn save(&mut self) -> Result<(), DatabaseError> {
        let key = DatabaseKey::new().with_password(self.password.expose_secret());
        
        let file = File::create(&self.path)
            .map_err(|e| DatabaseError::SaveError(format!("Failed to create file: {}", e)))?;

        self.db
            .save(&mut std::io::BufWriter::new(file), key)
            .map_err(|e| DatabaseError::SaveError(e.to_string()))?;

        Ok(())
    }

    pub fn get_root_group(&self) -> GroupData {
        self.convert_group(&self.db.root, None)
    }

    fn convert_group(&self, group: &Group, parent_uuid: Option<String>) -> GroupData {
        let uuid = group.uuid.to_string();
        let children = group
            .children
            .iter()
            .filter_map(|node| match node {
                Node::Group(g) => Some(self.convert_group(g, Some(uuid.clone()))),
                _ => None,
            })
            .collect();

        GroupData {
            uuid,
            name: group.name.clone(),
            parent_uuid,
            children,
            icon_id: group.icon_id,
        }
    }

    pub fn get_entries_in_group(&self, group_uuid: &str) -> Result<Vec<EntryData>, DatabaseError> {
        let group = self.find_group_by_uuid(group_uuid)?;
        
        let entries: Vec<EntryData> = group
            .children
            .iter()
            .filter_map(|node| match node {
                Node::Entry(e) => Some(self.convert_entry(e, group_uuid)),
                _ => None,
            })
            .collect();

        Ok(entries)
    }

    pub fn get_all_entries(&self) -> Vec<EntryData> {
        let mut entries = Vec::new();
        self.collect_entries(&self.db.root, &mut entries);
        entries
    }

    fn collect_entries(&self, group: &Group, entries: &mut Vec<EntryData>) {
        let group_uuid = group.uuid.to_string();
        
        for node in &group.children {
            match node {
                Node::Entry(e) => entries.push(self.convert_entry(e, &group_uuid)),
                Node::Group(g) => self.collect_entries(g, entries),
            }
        }
    }

    fn convert_entry(&self, entry: &Entry, group_uuid: &str) -> EntryData {
        let uuid = entry.uuid.to_string();
        EntryData {
            uuid,
            title: entry.get_title().unwrap_or("").to_string(),
            username: entry.get_username().unwrap_or("").to_string(),
            password: entry.get_password().unwrap_or("").to_string(),
            url: entry.get("URL").unwrap_or("").to_string(),
            notes: entry.get("Notes").unwrap_or("").to_string(),
            tags: entry.get("Tags").unwrap_or("").to_string(),
            group_uuid: group_uuid.to_string(),
            icon_id: entry.icon_id,
        }
    }

    pub fn get_entry(&self, entry_uuid: &str) -> Result<EntryData, DatabaseError> {
        let entry = self.find_entry_by_uuid(entry_uuid)?;
        let group_uuid = self.find_entry_group_uuid(entry_uuid)?;
        Ok(self.convert_entry(entry, &group_uuid))
    }

    pub fn create_entry(&mut self, entry_data: EntryData) -> Result<(), DatabaseError> {
        let group = self.find_group_by_uuid_mut(&entry_data.group_uuid)?;
        
        let mut entry = Entry::default();
        // Use provided UUID or generate a new one
        entry.uuid = if entry_data.uuid.is_empty() {
            Uuid::new_v4()
        } else {
            Uuid::parse_str(&entry_data.uuid).map_err(|_| DatabaseError::InvalidUuid)?
        };
        
        entry.fields.insert("Title".to_string(), Value::Unprotected(entry_data.title));
        entry.fields.insert("UserName".to_string(), Value::Unprotected(entry_data.username));
        entry.fields.insert("Password".to_string(), Value::Protected(entry_data.password.into()));
        if !entry_data.url.is_empty() {
            entry.fields.insert("URL".to_string(), Value::Unprotected(entry_data.url));
        }
        if !entry_data.notes.is_empty() {
            entry.fields.insert("Notes".to_string(), Value::Unprotected(entry_data.notes));
        }
        if !entry_data.tags.is_empty() {
            entry.fields.insert("Tags".to_string(), Value::Unprotected(entry_data.tags));
        }
        
        // Set icon ID if provided
        if let Some(icon_id) = entry_data.icon_id {
            entry.icon_id = Some(icon_id);
        }
        
        group.add_child(entry);
        Ok(())
    }

    pub fn update_entry(&mut self, entry_data: EntryData) -> Result<(), DatabaseError> {
        let entry = self.find_entry_by_uuid_mut(&entry_data.uuid)?;
        
        entry.fields.insert("Title".to_string(), Value::Unprotected(entry_data.title));
        entry.fields.insert("UserName".to_string(), Value::Unprotected(entry_data.username));
        entry.fields.insert("Password".to_string(), Value::Protected(entry_data.password.into()));
        entry.fields.insert("URL".to_string(), Value::Unprotected(entry_data.url));
        entry.fields.insert("Notes".to_string(), Value::Unprotected(entry_data.notes));
        entry.fields.insert("Tags".to_string(), Value::Unprotected(entry_data.tags));
        
        // Update icon ID
        entry.icon_id = entry_data.icon_id;
        
        Ok(())
    }

    pub fn delete_entry(&mut self, entry_uuid: &str) -> Result<(), DatabaseError> {
        let group_uuid = self.find_entry_group_uuid(entry_uuid)?;
        let group = self.find_group_by_uuid_mut(&group_uuid)?;
        
        let uuid = Uuid::parse_str(entry_uuid).map_err(|_| DatabaseError::EntryNotFound)?;
        group.children.retain(|node| {
            if let Node::Entry(e) = node {
                e.uuid != uuid
            } else {
                true
            }
        });
        
        Ok(())
    }

    pub fn create_group(&mut self, name: String, parent_uuid: Option<String>, icon_id: Option<u32>) -> Result<(), DatabaseError> {
        let parent_group = if let Some(parent_id) = parent_uuid {
            self.find_group_by_uuid_mut(&parent_id)?
        } else {
            &mut self.db.root
        };

        let mut new_group = Group {
            name,
            ..Default::default()
        };
        
        // Generate a unique UUID for the new group
        new_group.uuid = Uuid::new_v4();
        
        // Set icon ID if provided
        if let Some(id) = icon_id {
            new_group.icon_id = Some(id as usize);
        }

        parent_group.add_child(new_group);
        Ok(())
    }

    pub fn rename_group(&mut self, group_uuid: &str, new_name: String, icon_id: Option<u32>) -> Result<(), DatabaseError> {
        let group = self.find_group_by_uuid_mut(group_uuid)?;
        group.name = new_name;
        
        // Update icon ID if provided
        if let Some(id) = icon_id {
            group.icon_id = Some(id as usize);
        }
        
        Ok(())
    }

    pub fn move_group(&mut self, group_uuid: &str, new_parent_uuid: &str) -> Result<(), DatabaseError> {
        // Can't move root group
        if group_uuid == self.db.root.uuid.to_string() {
            return Err(DatabaseError::GroupNotFound);
        }

        // Can't move into itself
        if group_uuid == new_parent_uuid {
            return Err(DatabaseError::GroupNotFound);
        }

        // Find and remove the group from its current parent
        let old_parent_uuid = self.find_group_parent_uuid(group_uuid)?;
        let group_to_move = {
            let old_parent = self.find_group_by_uuid_mut(&old_parent_uuid)?;
            let uuid = Uuid::parse_str(group_uuid).map_err(|_| DatabaseError::GroupNotFound)?;
            
            let mut group_to_move = None;
            old_parent.children.retain(|node| {
                if let Node::Group(g) = node {
                    if g.uuid == uuid {
                        group_to_move = Some(g.clone());
                        false
                    } else {
                        true
                    }
                } else {
                    true
                }
            });
            
            group_to_move.ok_or(DatabaseError::GroupNotFound)?
        };

        // Add to new parent
        let new_parent = self.find_group_by_uuid_mut(new_parent_uuid)?;
        new_parent.add_child(group_to_move);

        Ok(())
    }

    pub fn reorder_group(&mut self, group_uuid: &str, target_index: usize) -> Result<(), DatabaseError> {
        // Can't reorder root group
        if group_uuid == self.db.root.uuid.to_string() {
            return Err(DatabaseError::GroupNotFound);
        }

        // Find parent and current index
        let parent_uuid = self.find_group_parent_uuid(group_uuid)?;
        let parent = self.find_group_by_uuid_mut(&parent_uuid)?;
        
        let uuid = Uuid::parse_str(group_uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        
        // Find current index
        let current_index = parent.children.iter().position(|node| {
            if let Node::Group(g) = node {
                g.uuid == uuid
            } else {
                false
            }
        }).ok_or(DatabaseError::GroupNotFound)?;

        // Calculate new index (adjust if moving down)
        let new_index = if target_index > current_index {
            target_index.min(parent.children.len() - 1)
        } else {
            target_index
        };

        if current_index != new_index {
            let item = parent.children.remove(current_index);
            parent.children.insert(new_index, item);
        }

        Ok(())
    }

    pub fn delete_group(&mut self, group_uuid: &str) -> Result<(), DatabaseError> {
        if group_uuid == self.db.root.uuid.to_string() {
            return Err(DatabaseError::GroupNotFound);
        }

        let parent_uuid = self.find_group_parent_uuid(group_uuid)?;
        let parent = self.find_group_by_uuid_mut(&parent_uuid)?;
        
        let uuid = Uuid::parse_str(group_uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        parent.children.retain(|node| {
            if let Node::Group(g) = node {
                g.uuid != uuid
            } else {
                true
            }
        });
        
        Ok(())
    }

    pub fn search_entries(&self, query: &str) -> Vec<EntryData> {
        let query_lower = query.to_lowercase();
        self.get_all_entries()
            .into_iter()
            .filter(|entry| {
                entry.title.to_lowercase().contains(&query_lower)
                    || entry.username.to_lowercase().contains(&query_lower)
                    || entry.url.to_lowercase().contains(&query_lower)
                    || entry.notes.to_lowercase().contains(&query_lower)
                    || entry.tags.to_lowercase().contains(&query_lower)
            })
            .collect()
    }

    fn find_group_by_uuid(&self, uuid: &str) -> Result<&Group, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        self.find_group_recursive(&self.db.root, &uuid_parsed)
            .ok_or(DatabaseError::GroupNotFound)
    }

    fn find_group_by_uuid_mut(&mut self, uuid: &str) -> Result<&mut Group, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        let root_ptr = &mut self.db.root as *mut Group;
        unsafe { Self::find_group_recursive_mut_static(&mut *root_ptr, &uuid_parsed) }
            .ok_or(DatabaseError::GroupNotFound)
    }

    fn find_group_recursive<'a>(&'a self, group: &'a Group, uuid: &Uuid) -> Option<&'a Group> {
        if &group.uuid == uuid {
            return Some(group);
        }

        for node in &group.children {
            if let Node::Group(g) = node {
                if let Some(found) = self.find_group_recursive(g, uuid) {
                    return Some(found);
                }
            }
        }

        None
    }

    fn find_group_recursive_mut_static<'a>(
        group: &'a mut Group,
        uuid: &Uuid,
    ) -> Option<&'a mut Group> {
        if &group.uuid == uuid {
            return Some(group);
        }

        for node in &mut group.children {
            if let Node::Group(g) = node {
                if let Some(found) = Self::find_group_recursive_mut_static(g, uuid) {
                    return Some(found);
                }
            }
        }

        None
    }

    fn find_entry_by_uuid(&self, uuid: &str) -> Result<&Entry, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(uuid).map_err(|_| DatabaseError::EntryNotFound)?;
        self.find_entry_recursive(&self.db.root, &uuid_parsed)
            .ok_or(DatabaseError::EntryNotFound)
    }

    fn find_entry_by_uuid_mut(&mut self, uuid: &str) -> Result<&mut Entry, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(uuid).map_err(|_| DatabaseError::EntryNotFound)?;
        let root_ptr = &mut self.db.root as *mut Group;
        unsafe { Self::find_entry_recursive_mut_static(&mut *root_ptr, &uuid_parsed) }
            .ok_or(DatabaseError::EntryNotFound)
    }

    fn find_entry_recursive<'a>(&'a self, group: &'a Group, uuid: &Uuid) -> Option<&'a Entry> {
        for node in &group.children {
            match node {
                Node::Entry(e) if &e.uuid == uuid => return Some(e),
                Node::Group(g) => {
                    if let Some(found) = self.find_entry_recursive(g, uuid) {
                        return Some(found);
                    }
                }
                _ => {}
            }
        }
        None
    }

    fn find_entry_recursive_mut_static<'a>(
        group: &'a mut Group,
        uuid: &Uuid,
    ) -> Option<&'a mut Entry> {
        for node in &mut group.children {
            match node {
                Node::Entry(e) if &e.uuid == uuid => return Some(e),
                Node::Group(g) => {
                    if let Some(found) = Self::find_entry_recursive_mut_static(g, uuid) {
                        return Some(found);
                    }
                }
                _ => {}
            }
        }
        None
    }

    fn find_entry_group_uuid(&self, entry_uuid: &str) -> Result<String, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(entry_uuid).map_err(|_| DatabaseError::EntryNotFound)?;
        self.find_entry_group_uuid_recursive(&self.db.root, &uuid_parsed)
            .ok_or(DatabaseError::EntryNotFound)
    }

    fn find_entry_group_uuid_recursive(&self, group: &Group, uuid: &Uuid) -> Option<String> {
        for node in &group.children {
            match node {
                Node::Entry(e) if &e.uuid == uuid => return Some(group.uuid.to_string()),
                Node::Group(g) => {
                    if let Some(found) = self.find_entry_group_uuid_recursive(g, uuid) {
                        return Some(found);
                    }
                }
                _ => {}
            }
        }
        None
    }

    fn find_group_parent_uuid(&self, group_uuid: &str) -> Result<String, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(group_uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        self.find_group_parent_uuid_recursive(&self.db.root, &uuid_parsed)
            .ok_or(DatabaseError::GroupNotFound)
    }

    fn find_group_parent_uuid_recursive(&self, group: &Group, uuid: &Uuid) -> Option<String> {
        for node in &group.children {
            if let Node::Group(g) = node {
                if &g.uuid == uuid {
                    return Some(group.uuid.to_string());
                }
                if let Some(found) = self.find_group_parent_uuid_recursive(g, uuid) {
                    return Some(found);
                }
            }
        }
        None
    }
}
