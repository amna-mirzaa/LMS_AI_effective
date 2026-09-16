"""
Academia LMS - Smart Python Backend Launcher
Automatically verifies dependencies, installs missing packages using current Python executable,
and launches the server.
"""

import sys
import os
import subprocess

REQUIRED_PACKAGES = ["flask", "flask_cors", "sqlalchemy", "pymysql"]

def check_and_install():
    missing = []
    for pkg in REQUIRED_PACKAGES:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)

    if missing:
        print("=" * 60)
        print(" Academia LMS - Initializing Python Backend Environment")
        print("=" * 60)
        print(f"Missing packages detected: {', '.join(missing)}")
        print(f"Using Python interpreter: {sys.executable}")
        print("Installing required packages from requirements.txt...")
        print("-" * 60)

        req_file = os.path.join(os.path.dirname(__file__), "requirements.txt")
        cmd = [sys.executable, "-m", "pip", "install", "-r", req_file]
        
        try:
            res = subprocess.run(cmd, check=True)
            print("-" * 60)
            print("Dependencies installed successfully!\n")
        except Exception as e:
            print(f"\n[Warning] Automatic installation encountered an issue: {e}")
            print("Please manually run:")
            print(f"    {sys.executable} -m pip install -r requirements.txt")
            print("or:")
            print(f"    {sys.executable} -m pip install flask flask-cors sqlalchemy pymysql\n")

    # Now launch server_flask.py
    server_path = os.path.join(os.path.dirname(__file__), "server_flask.py")
    print(f"Starting Academia LMS Backend ({server_path})...\n")
    import server_flask
    server_flask.app.run(host="0.0.0.0", port=5000, debug=True)

if __name__ == "__main__":
    check_and_install()
