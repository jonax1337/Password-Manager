use super::database::Database;
use super::types::EntryData;

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
}
