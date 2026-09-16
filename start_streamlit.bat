@echo off
TITLE AcademiaPro LMS - Streamlit Launcher
echo ========================================================
echo  AcademiaPro LMS - Python Streamlit Application
echo ========================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.10+ from python.org and tick 'Add Python to PATH'.
    pause
    exit /b 1
)

echo [1/3] Verifying Streamlit and database packages...
python -m pip install -r requirements.txt

echo.
echo [2/3] Launching AcademiaPro Streamlit Application...
echo.
echo The app will open in your browser automatically (http://localhost:8501)
echo.
streamlit run app_streamlit.py

pause
