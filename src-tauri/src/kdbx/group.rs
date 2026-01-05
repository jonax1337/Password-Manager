use keepass::db::{Group, Node};
use uuid::Uuid;

use super::database::Database;
use super::error::DatabaseError;
use super::types::GroupData;

impl Database {
    pub fn get_root_group(&self) -> GroupData {
        self.convert_group(&self.db.root, None)
    }

    pub(super) fn convert_group(&self, group: &Group, parent_uuid: Option<String>) -> GroupData {
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

    pub(super) fn find_group_by_uuid(&self, uuid: &str) -> Result<&Group, DatabaseError> {
        let uuid_parsed = Uuid::parse_str(uuid).map_err(|_| DatabaseError::GroupNotFound)?;
        self.find_group_recursive(&self.db.root, &uuid_parsed)
            .ok_or(DatabaseError::GroupNotFound)
    }

    pub(super) fn find_group_by_uuid_mut(&mut self, uuid: &str) -> Result<&mut Group, DatabaseError> {
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

    pub(super) fn find_group_parent_uuid(&self, group_uuid: &str) -> Result<String, DatabaseError> {
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
