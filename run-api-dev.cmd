@echo off
cd /d "%~dp0"
node server/src/index.js > api-dev.out.log 2> api-dev.err.log
