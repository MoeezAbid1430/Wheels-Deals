@echo off
cd /d "%~dp0"
set BROWSER=none
node node_modules/react-scripts/bin/react-scripts.js start > web-dev.out.log 2> web-dev.err.log
