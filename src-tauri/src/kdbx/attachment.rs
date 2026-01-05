use keepass::db::{Value, HeaderAttachment};

use super::database::Database;
use super::error::DatabaseError;
use super::types::EntryAttachment;

impl Database {
    /// Get all attachments for an entry
    /// In KDBX4, attachments are stored in header_attachments and entries reference them
    /// Entry binary fields use format: Binary.{key} -> identifier
    pub fn get_entry_attachments(&self, entry_uuid: &str) -> Result<Vec<EntryAttachment>, DatabaseError> {
        let entry = self.find_entry_by_uuid(entry_uuid)?;
        let mut attachments = Vec::new();
        
        // Look for Binary.{key} fields in the entry
        for (field_name, value) in &entry.fields {
            if field_name.starts_with("Binary.") {
                let key = field_name.strip_prefix("Binary.").unwrap().to_string();
                
                // Get the identifier (reference to header_attachments)
                if let Some(identifier_str) = Self::get_value_as_string(value) {
                    // Parse identifier as index into header_attachments
                    if let Ok(idx) = identifier_str.parse::<usize>() {
                        if idx < self.db.header_attachments.len() {
                            let header_attachment = &self.db.header_attachments[idx];
                            attachments.push(EntryAttachment {
                                key,
                                data: header_attachment.content.clone(),
                            });
                        }
                    }
                }
            }
        }
        
        Ok(attachments)
    }
    
    /// Add an attachment to an entry
    pub fn add_entry_attachment(
        &mut self,
        entry_uuid: &str,
        key: String,
        data: Vec<u8>,
    ) -> Result<(), DatabaseError> {
        // Validate key doesn't contain invalid characters
        if key.contains('.') || key.is_empty() {
            return Err(DatabaseError::InvalidUuid); // Using existing error type
        }
        
        // Add to header_attachments first
        let attachment_idx = self.db.header_attachments.len();
        self.db.header_attachments.push(HeaderAttachment {
            flags: 1, // 1 = compressed (data will be compressed by keepass library)
            content: data,
        });
        
        // Now get entry and add reference
        let entry = self.find_entry_by_uuid_mut(entry_uuid)?;
        let field_name = format!("Binary.{}", key);
        entry.fields.insert(field_name, Value::Unprotected(attachment_idx.to_string()));
        
        Ok(())
    }
    
    /// Delete an attachment from an entry
    pub fn delete_entry_attachment(
        &mut self,
        entry_uuid: &str,
        key: &str,
    ) -> Result<(), DatabaseError> {
        let entry = self.find_entry_by_uuid_mut(entry_uuid)?;
        
        // Remove the Binary field from entry
        let field_name = format!("Binary.{}", key);
        entry.fields.remove(&field_name);
        
        // Note: We don't remove from header_attachments to maintain indices
        // This is how KeePass handles it - orphaned attachments remain but are not referenced
        
        Ok(())
    }
    
    /// Helper to extract string value from Value enum
    fn get_value_as_string(value: &Value) -> Option<String> {
        match value {
            Value::Unprotected(s) => Some(s.clone()),
            Value::Protected(s) => Some(String::from_utf8_lossy(s.unsecure()).to_string()),
            Value::Bytes(b) => Some(String::from_utf8_lossy(b).to_string()),
        }
    }
}
