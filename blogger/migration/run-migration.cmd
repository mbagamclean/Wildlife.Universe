@echo off
REM Auto-continue the Wildlife Universe -> Blogger post migration.
REM Runs one batch; migrate-posts.mjs is resumable + duplicate-safe, so this is
REM safe to run repeatedly. Logs to migration-run.log. Registered as a Windows
REM Scheduled Task (see register-task.ps1) so it survives session/agent restarts.
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" --env-file=.env migrate-posts.mjs --limit 120 >> migration-run.log 2>&1
