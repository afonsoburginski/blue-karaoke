!macro customUnInstall
  ; Limpar pasta de dados do usuário (userData) completamente
  ; Isso remove banco de dados, músicas baixadas, logs, configurações, TUDO
  RMDir /r "$LOCALAPPDATA\blue-karaoke"
  RMDir /r "$APPDATA\blue-karaoke"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke"
  RMDir /r "$APPDATA\Blue Karaoke"
  
  ; Limpar cache do Electron
  RMDir /r "$LOCALAPPDATA\Electron"
  
  ; Mensagem informando que foi limpo
  ; MessageBox MB_OK "Todos os dados do Blue Karaoke foram removidos."
!macroend
