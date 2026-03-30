@echo off
title RYcode - AI Coding Tutor
chcp 65001 >nul
echo.
echo  =============================================
echo    RYcode - AI Powered Coding Tutor
echo  =============================================
echo.

if not exist ".env" (
  echo  [Setup] First run detected. Creating config file...
  if exist ".env.example" (
    copy .env.example .env >nul
  ) else (
    echo DATABASE_URL=file:./rycode.db > .env
    echo JWT_SECRET=rycode-secret-change-me >> .env
    echo GEMINI_API_KEY=your-key-here >> .env
  )
  echo.
  echo  [!] Please edit .env and add your AI API Key.
  echo  [!] You can also add API keys in the app Settings page after starting.
  echo.
  notepad .env
)

echo  [OK] Starting RYcode...
echo  [>>] Open http://localhost:3001 in your browser
echo.
start http://localhost:3001
rycode-win.exe
pause
