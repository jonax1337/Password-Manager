use super::database::Database;
use super::types::EntryData;
use keepass::db::{Group, Node};

impl Database {
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

    pub fn search_entries_in_group(&self, query: &str, group_uuid: &str) -> Vec<EntryData> {
        let query_lower = query.to_lowercase();
        
        // Get all descendant group UUIDs
        let descendant_uuids = self.get_descendant_group_uuids(group_uuid);
        
        // Search in all entries and filter by group membership
        self.get_all_entries()
            .into_iter()
            .filter(|entry| {
                // Check if entry is in target group or any descendant
                let in_target_groups = entry.group_uuid == group_uuid || descendant_uuids.contains(&entry.group_uuid);
                
                // Check if matches search query
                let matches_query = entry.title.to_lowercase().contains(&query_lower)
                    || entry.username.to_lowercase().contains(&query_lower)
                    || entry.url.to_lowercase().contains(&query_lower)
                    || entry.notes.to_lowercase().contains(&query_lower)
                    || entry.tags.to_lowercase().contains(&query_lower);
                
                in_target_groups && matches_query
            })
            .collect()
    }

    fn get_descendant_group_uuids(&self, group_uuid: &str) -> Vec<String> {
        let mut result = Vec::new();
        
        // Use the existing find_group_by_uuid function
        if let Ok(group) = self.find_group_by_uuid(group_uuid) {
            self.collect_descendant_uuids(group, &mut result);
        }
        
        result
    }

    fn collect_descendant_uuids(&self, group: &Group, result: &mut Vec<String>) {
        for node in &group.children {
            if let Node::Group(child_group) = node {
                result.push(child_group.uuid.to_string());
                self.collect_descendant_uuids(child_group, result);
            }
        }
    }
}
