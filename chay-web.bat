@echo off
title Doan Truong - Confirm Bump Server
cd /d "d:\dowload2\confirmbump"
echo ====================================================================
echo    HE THONG XAC NHAN (CONFIRM) BUMP BAI DOAN TRUONG LOCALHOST
echo    Truy cap trinh duyet tai: http://localhost:5000
echo ====================================================================
node --experimental-sqlite server/index.js
pause
