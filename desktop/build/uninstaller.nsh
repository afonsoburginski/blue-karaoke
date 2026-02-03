!macro customUnInstall
  ; App portátil: pasta data fica junto do executável, o NSIS já remove tudo
  ; Limpar também AppData (fallback ou versões antigas)
  RMDir /r "$APPDATA\blue-karaoke"
  RMDir /r "$APPDATA\Blue Karaoke"
  RMDir /r "$LOCALAPPDATA\blue-karaoke"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke"
!macroend
