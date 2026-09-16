@echo off
echo =========================================================
echo    Academia LMS - Starting Python Backend (Windows)
echo =========================================================
echo Checking Python installation...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] 'python' was not found in PATH.
    echo Please install Python 3 or ensure it is added to your environment variables.
    pause
    exit /b 1
)

echo Installing / verifying requirements from requirements.txt...
python -m pip install -r requirements.txt

echo.
echo Starting Flask Backend Server on http://localhost:5000...
python server_flask.py

pause
