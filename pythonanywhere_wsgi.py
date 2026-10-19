# =====================================================================
#  PythonAnywhere WSGI configuration for MovieBook
#  Copy everything in this file into the WSGI file that PythonAnywhere
#  shows on your Web tab (e.g. /var/www/yourusername_pythonanywhere_com_wsgi.py)
#  and change the three values marked CHANGE ME.
# =====================================================================
import os
import sys

# CHANGE ME 1: your PythonAnywhere username
USERNAME = "yourusername"

project_home = f"/home/{USERNAME}/MovieTicketWeb"
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# CHANGE ME 2: choose an admin password (or leave as admin123)
os.environ["ADMIN_PASSWORD"] = "admin123"

# CHANGE ME 3: any long random string to keep sessions secure
os.environ["SECRET_KEY"] = "moviebook-super-secret-key-production-change-me"

# PythonAnywhere sites use HTTPS, so keep session cookies secure
os.environ["COOKIE_SECURE"] = "1"

from app import app as application  # noqa: E402
