# 🚀 MovieBook Deployment & Hosting Guide

MovieBook is a Flask-based web application with an SQLite database and pure vanilla HTML5/CSS3/JavaScript. It can be run locally or deployed for free on multiple cloud hosting platforms.

---

## 🔑 Default Credentials
- **Public Customer Website**: `/`
- **Admin Portal**: `/admin`
- **Admin Login**: `/admin/login`
- **Default Admin Password**: `admin123`
*(You can change this password anytime by setting the `ADMIN_PASSWORD` environment variable).*

---

## Option 1: Free Deployment on PythonAnywhere (Recommended - 100% Free, No Credit Card)

PythonAnywhere is ideal for hosting Flask applications with SQLite databases.

### Step 1: Create an Account
1. Go to [https://www.pythonanywhere.com](https://www.pythonanywhere.com) and click **Sign up** -> choose the **Create a Beginner account** (Free).
2. Your live website URL will be: `https://YOURUSERNAME.pythonanywhere.com`.

### Step 2: Upload Project Files
1. In your local project folder (`MovieTicketWeb`), compress the files into a ZIP archive, or upload the directory.
2. In the PythonAnywhere dashboard, open the **Files** tab.
3. Upload `MovieTicketWeb.zip` into `/home/YOURUSERNAME/`.
4. Go to the **Consoles** tab -> click **Bash**.
5. In the bash terminal, unzip the archive:
   ```bash
   unzip MovieTicketWeb.zip -d MovieTicketWeb
   ```
   Ensure your directory structure is `/home/YOURUSERNAME/MovieTicketWeb/app.py`.

### Step 3: Create the Web App
1. Go to the **Web** tab in PythonAnywhere.
2. Click **Add a new web app** -> Click **Next**.
3. Choose **Manual configuration** (or **Flask**) -> Select **Python 3.10** (or newest) -> Click **Next**.

### Step 4: Configure Paths & WSGI
1. Under **Code**:
   - **Source code**: `/home/YOURUSERNAME/MovieTicketWeb`
   - **Working directory**: `/home/YOURUSERNAME/MovieTicketWeb`
2. Under **WSGI configuration file**:
   - Click the link to open the file (e.g. `/var/www/YOURUSERNAME_pythonanywhere_com_wsgi.py`).
   - Clear existing content and paste the contents of `pythonanywhere_wsgi.py`:
     ```python
     import os
     import sys

     USERNAME = "YOURUSERNAME"  # Replace with your actual PythonAnywhere username

     project_home = f"/home/{USERNAME}/MovieTicketWeb"
     if project_home not in sys.path:
         sys.path.insert(0, project_home)

     os.environ["ADMIN_PASSWORD"] = "admin123"  # Change to your chosen admin password
     os.environ["SECRET_KEY"] = "your-custom-secret-key-phrase"
     os.environ["COOKIE_SECURE"] = "1"

     from app import app as application
     ```
   - Click **Save**.

### Step 5: Static Files Mapping
Under the **Static files** section on the Web tab, add an entry:
- **URL**: `/static/`
- **Directory**: `/home/YOURUSERNAME/MovieTicketWeb/static`

### Step 6: Reload & Go Live!
1. Click the green **Reload YOURUSERNAME.pythonanywhere.com** button at the top of the Web tab.
2. Open `https://YOURUSERNAME.pythonanywhere.com` in your browser!
3. Your web app is now fully live on the internet!

---

## Option 2: Free Deployment on Render.com (Cloud Container)

Render provides free hosting with automatic GitHub integration.

### Step 1: Push Code to GitHub
Push this repository or the `MovieTicketWeb` folder to your GitHub account:
```bash
git init
git add .
git commit -m "MovieBook production ready"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/MovieTicketWeb.git
git push -u origin main
```

### Step 2: Deploy on Render
1. Sign up for free at [https://render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Fill in the settings:
   - **Name**: `moviebook`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Plan**: `Free`
5. Under **Advanced** -> **Add Environment Variable**:
   - `ADMIN_PASSWORD` = `admin123` (or your chosen password)
   - `SECRET_KEY` = (click generate or type a random string)
6. Click **Create Web Service**.
7. Once deployment finishes, Render provides your live URL: `https://moviebook.onrender.com`.

---

## Option 3: Local Network Hosting (Use From Your Phone/Laptop On Wi-Fi)

You can run the web app on your computer and immediately use it from your mobile phone or another computer connected to the same Wi-Fi network:

1. Open PowerShell or Command Prompt in the `MovieTicketWeb` directory.
2. Run:
   ```powershell
   python app.py
   ```
3. Find your computer's local IP address (run `ipconfig` in Command Prompt, look for `IPv4 Address`, e.g. `192.168.1.15`).
4. On your smartphone or laptop browser, open:
   ```
   http://192.168.1.15:5000
   ```
5. You can book tickets, cancel tickets, and access the admin dashboard from any device!

---

## 🛠 Features & Verification Checklist
- [x] **Home Interface**: Hero banner, live navigation, instant jump to booking or movie exploration.
- [x] **Movies Interface**: Browse available movies, view genres, ticket prices, and click "Book Tickets" to launch booking.
- [x] **Booking Interface**: Select show date, theatre, language, timing, seat map (S1-S20), payment method, and instant live summary.
- [x] **Confirmation Interface**: Automatically renders a realistic movie ticket with customer details, barcode, print button, and navigation.
- [x] **Booking History**: Tracks device bookings, displays status, and provides 1-click "Cancel / Manage" button for each booking.
- [x] **Cancel Ticket Interface**: Search booking by ID, click seats to cancel with real-time recalculation of remaining amounts and status.
- [x] **Admin Dashboard**: Live statistics, manage movies, manage theatres, manage show schedules, search bookings, and revenue breakdown.
