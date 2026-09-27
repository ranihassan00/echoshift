@echo off
setlocal
cd /d "%~dp0"
set "ECHOSHIFT_NODE=node"
where node >nul 2>&1
if errorlevel 1 set "ECHOSHIFT_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
"%ECHOSHIFT_NODE%" --env-file-if-exists=.env src/index.mjs
if errorlevel 1 (
  echo Could not start. This service requires Node 24 and installed dependencies. See README.md.
  pause
)
endlocal
