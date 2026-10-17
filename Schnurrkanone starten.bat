@echo off
rem Startet Schnurrkanone als eigenes Desktop-Fenster (Edge-App-Modus, kein Browser-UI)
set "GAME=%~dp0index.html"
set "PROFILE=%LOCALAPPDATA%\Schnurrkanone"
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="file:///%GAME:\=/%" --user-data-dir="%PROFILE%" --window-size=1400,860 --autoplay-policy=no-user-gesture-required
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="file:///%GAME:\=/%" --user-data-dir="%PROFILE%" --window-size=1400,860 --autoplay-policy=no-user-gesture-required
) else (
  start "" "%GAME%"
)
