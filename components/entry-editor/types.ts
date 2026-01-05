import type { EntryData, CustomField } from "@/lib/tauri";

export interface EntryEditorProps {
  entry: EntryData;
  onClose: () => void;
  onRefresh: () => void;
  onHasChangesChange?: (hasChanges: boolean) => void;
}

export interface GeneralTabProps {
  formData: EntryData;
  repeatPassword: string;
  showPassword: boolean;
  showRepeatPassword: boolean;
  urlError: string | null;
  copiedUsername: boolean;
  copiedPassword: boolean;
  iconId: number;
  onFormChange: (field: keyof EntryData, value: string) => void;
  onRepeatPasswordChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onShowRepeatPasswordToggle: () => void;
  onCopy: (text: string, label: string, field: 'username' | 'password') => void;
  onGeneratePassword: (strength: string) => void;
  onIconChange: (iconId: number) => void;
  onExpiresChange: (checked: boolean) => void;
  onExpiryTimeChange: (value: string) => void;
  onExpiryPresetChange: (value: string) => void;
  setFormData: React.Dispatch<React.SetStateAction<EntryData>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface AdvancedTabProps {
  formData: EntryData;
  setFormData: React.Dispatch<React.SetStateAction<EntryData>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface HistoryTabProps {
  entry: EntryData;
  formData: EntryData;
  setFormData: React.Dispatch<React.SetStateAction<EntryData>>;
  setRepeatPassword: React.Dispatch<React.SetStateAction<string>>;
  setHasChanges: React.Dispatch<React.SetStateAction<boolean>>;
}

export type { EntryData, CustomField };
