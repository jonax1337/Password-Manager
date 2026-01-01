// Utilities for persisting group tree state per database

interface GroupTreeState {
  expandedGroups: string[];
  selectedGroup: string | null;
}

const STORAGE_KEY_PREFIX = 'groupTreeState_';

export function saveGroupTreeState(dbPath: string, expandedGroups: Set<string>, selectedGroup: string | null) {
  if (!dbPath) return;
  
  // Don't save virtual folders like _favorites
  const groupToSave = selectedGroup?.startsWith('_') ? null : selectedGroup;
  
  const state: GroupTreeState = {
    expandedGroups: Array.from(expandedGroups),
    selectedGroup: groupToSave,
  };
  
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${dbPath}`, JSON.stringify(state));
}

// Helper to check if a UUID exists in the group tree
function groupExists(group: any, targetUuid: string): boolean {
  if (!group) return false;
  if (group.uuid === targetUuid) return true;
  
  if (group.children && Array.isArray(group.children)) {
    for (const child of group.children) {
      if (groupExists(child, targetUuid)) {
        return true;
      }
    }
  }
  
  return false;
}

export function loadGroupTreeState(dbPath: string, defaultRootUuid: string, rootGroup?: any): GroupTreeState {
  if (!dbPath) {
    return {
      expandedGroups: [defaultRootUuid],
      selectedGroup: defaultRootUuid,
    };
  }
  
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${dbPath}`);
  
  if (!stored) {
    return {
      expandedGroups: [defaultRootUuid],
      selectedGroup: defaultRootUuid,
    };
  }
  
  try {
    const state: GroupTreeState = JSON.parse(stored);
    
    // Validate that the saved group still exists in the current tree
    let validatedGroup = state.selectedGroup || defaultRootUuid;
    if (rootGroup && state.selectedGroup && !groupExists(rootGroup, state.selectedGroup)) {
      // Group was deleted, fall back to root
      validatedGroup = defaultRootUuid;
    }
    
    return {
      expandedGroups: state.expandedGroups || [defaultRootUuid],
      selectedGroup: validatedGroup,
    };
  } catch {
    return {
      expandedGroups: [defaultRootUuid],
      selectedGroup: defaultRootUuid,
    };
  }
}
