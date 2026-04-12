@echo off
chcp 65001 > nul
cd /d "G:\マイドライブ\sns-bot\chatbot"
echo Chatbot server starting...
echo URL: http://localhost:5000
echo.
echo Test page: Open demo.html in your browser
echo Stop: Press Ctrl+C
echo.
python chatbot_server.py
pause
