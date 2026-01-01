; NSIS Installer Hooks for Custom File Icon
; This overrides the default icon for .kdbx files set by Tauri's fileAssociations

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Override the DefaultIcon for "KeePass Database" file class
  ; Tauri's APP_ASSOCIATE macro creates this under HKCU\Software\Classes for currentUser installs
  ; The file class name comes from tauri.conf.json fileAssociations.name = "KeePass Database"
  WriteRegStr SHCTX "Software\Classes\KeePass Database\DefaultIcon" "" "$INSTDIR\icons\file-icon.ico,0"
  
  ; Refresh shell icons so the change takes effect immediately
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; No cleanup needed - Tauri handles the file class key removal
  ; Just refresh shell icons
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0x1000, p 0, p 0)'
!macroend
