!macro customUnInstall
  ; A pasta de dados (musicas, banco, logs) fica dentro da pasta de instalacao
  ; na subpasta "data". O NSIS ja remove a pasta de instalacao inteira,
  ; entao os dados sao removidos automaticamente.
  
  ; Limpar pasta de dados antiga no AppData (caso tenha usado versao anterior)
  RMDir /r "$LOCALAPPDATA\blue-karaoke"
  RMDir /r "$APPDATA\blue-karaoke"
  RMDir /r "$LOCALAPPDATA\Blue Karaoke"
  RMDir /r "$APPDATA\Blue Karaoke"
!macroend
