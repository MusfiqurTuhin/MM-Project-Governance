import sys
import os

# Ensure project root is in path so `backend` package is importable
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root not in sys.path:
    sys.path.insert(0, root)

from backend.main import app
