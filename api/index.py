import sys
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root not in sys.path:
    sys.path.insert(0, root)

try:
    from backend.main import app
except Exception as e:
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/api/debug")
    def debug():
        return {"error": str(e), "sys_path": sys.path, "cwd": os.getcwd(), "files": os.listdir(root)}
