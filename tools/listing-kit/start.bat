@echo off
rem Starts the Listing Kit test page on this machine. Close this window to stop it.
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8770/tools/listing-kit/"
python serve.py
