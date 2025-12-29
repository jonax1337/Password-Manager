// Utilities for persisting group tree state per database

interface GroupTreeState {
  expandedGroups: string[];
  selectedGroup: string | null;
}

const STORAGE_KEY_PREFIX = 'groupTreeState_';

export function saveGroupTreeState(dbPath: string, expandedGroups: Set<string>, selectedGroup: string | null) {
  if (!dbPath) return;
  
  const state: GroupTreeState = {
    expandedGroups: Array.from(expandedGroups),
    selectedGroup,
  };
  
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${dbPath}`, JSON.stringify(state));
}

export function loadGroupTreeState(dbPath: string, defaultRootUuid: string): GroupTreeState {
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
    return {
      expandedGroups: state.expandedGroups || [defaultRootUuid],
      selectedGroup: state.selectedGroup || defaultRootUuid,
    };
  } catch {
    return {
      expandedGroups: [defaultRootUuid],
      selectedGroup: defaultRootUuid,
    };
  }
}
