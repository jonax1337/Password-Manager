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

        // Find the target group; if it doesn't exist, return no results.
        let Ok(group) = self.find_group_by_uuid(group_uuid) else {
            return Vec::new();
        };

        // Collect all entries from the target group and its descendants only.
        let mut entries_in_group = Vec::new();
        self.collect_entries(group, &mut entries_in_group);

        // Filter collected entries by the search query.
        entries_in_group
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
}
