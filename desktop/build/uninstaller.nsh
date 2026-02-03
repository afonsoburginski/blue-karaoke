!macro customUnInstall
  ; Limpar pasta de dados no AppData (musicas, banco, logs, tudo)
  RMDir /r "$APPDATA\blue-karaoke"
  RMDir /r "$APPDATA\Blue Karaoke"
  RMDir /r "$LOCALAPPDATA\blue-karaoke"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke"
!macroend
