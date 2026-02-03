!macro customUnInstall
  ; Limpar pasta de dados do usuário (userData) completamente
  ; Isso remove banco de dados, músicas baixadas, logs, configurações, TUDO
  
  ; Variações do nome da pasta (userData do Electron pode usar qualquer uma)
  RMDir /r "$LOCALAPPDATA\blue-karaoke"
  RMDir /r "$APPDATA\blue-karaoke"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke"
  RMDir /r "$APPDATA\Blue Karaoke"
  RMDir /r "$LOCALAPPDATA\BlueKaraoke"
  RMDir /r "$APPDATA\BlueKaraoke"
  
  ; Pasta de músicas (caso esteja em local diferente)
  RMDir /r "$LOCALAPPDATA\blue-karaoke\musicas"
  RMDir /r "$APPDATA\blue-karaoke\musicas"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke\musicas"
  RMDir /r "$APPDATA\Blue Karaoke\musicas"
  
  ; Limpar cache do Electron (pode ter dados do app)
  RMDir /r "$LOCALAPPDATA\Electron"
!macroend
