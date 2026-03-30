@echo off
title RYcode
chcp 65001 >nul

echo [RYcode] Checking environment...

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  [ERROR] Node.js not found.
  echo  Please install Node.js 18+ from https://nodejs.org
  echo  Then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [RYcode] First run: installing dependencies...
  call npm install --silent
)

if not exist "dev.db" (
  echo [RYcode] First run: initializing database...
  call npx prisma migrate deploy --skip-generate
)

echo [RYcode] Starting server...
echo [RYcode] Opening http://localhost:3001
echo.

start /B cmd /c "timeout /t 2 >nul ^&^& start http://localhost:3001"
call npm run dev:all
