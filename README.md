# 🎟️ MovieBook - Online Movie Ticket Booking System

A modern, full-stack Movie Ticket Booking web application built with **Python Flask**, **SQLite**, and responsive vanilla **HTML5 / CSS3 / JavaScript**.

---

## ✨ Features

### 👤 Customer Experience
- **Interactive Single-Page Application (SPA)**: Smooth client-side view switching between Home, Movies, Booking, Ticket Confirmation, My Bookings, and Ticket Cancellation.
- **Movie Catalog**: Browse available movies with genre tags, ticket pricing, and one-click booking triggers.
- **Real-Time Seat Booking**: Interactive seat map (S1–S20) with live occupied seat detection, multiple seat selection, and price calculation.
- **E-Ticket Confirmation**: Generates a ticket pass complete with booking ID, theatre details, seat numbers, barcode, and print options.
- **Device-Based Booking History**: Keep track of user bookings locally with real-time status updates.
- **Seat-Level Ticket Cancellation**: Search bookings by ID and cancel individual or all booked seats with automatic refund calculation.

### 🛡️ Administrative Portal
- **Dashboard Overview**: Live analytics for active movies, partner theatres, scheduled shows, ticket sales, and total revenue.
- **Movie Management**: Add new movies, upload poster images, edit movie details, and toggle active status.
- **Theatre Management**: Configure theatres, locations, and seating capacities.
- **Show Scheduling**: Schedule shows with date, time (12-hour AM/PM or 24-hour), language, and pricing.
- **Booking Records & Search**: Search and view all customer bookings with status tracking.
- **Revenue Analytics**: Detailed financial breakdown by movie, theatre, and payment method.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.8+, Flask 2.2+, Werkzeug
- **Database**: SQLite3 (with WAL mode & atomic immediate transaction locking)
- **Frontend**: Vanilla HTML5, CSS3 (Modern Flexbox/Grid), JavaScript (ES6+)
- **WSGI / Production**: Gunicorn

---

## 🚀 Quick Start (Local Setup)

### 1. Clone or Extract the Repository
```bash
git clone https://github.com/YOUR_USERNAME/MovieTicketWeb.git
cd MovieTicketWeb
```

### 2. Create a Virtual Environment (Optional but Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
python app.py
```

Open your browser and visit:
- **Customer Portal**: [http://localhost:5000](http://localhost:5000)
- **Admin Dashboard**: [http://localhost:5000/admin](http://localhost:5000/admin)

---

## 🔑 Default Admin Credentials

- **Admin Login URL**: `/admin/login`
- **Default Password**: `admin123`

> 💡 **Tip**: You can change the admin password anytime by setting an environment variable:
> ```bash
> # Windows PowerShell
> $env:ADMIN_PASSWORD = "YourStrongPassword"
>
> # Linux / macOS
> export ADMIN_PASSWORD="YourStrongPassword"
> ```

---

## 📂 Project Structure

```text
MovieTicketWeb/
├── app.py                      # Flask backend API & routes
├── movie_booking.db            # SQLite database
├── requirements.txt            # Python dependencies
├── Procfile                    # Cloud container process file
├── pythonanywhere_wsgi.py      # WSGI configuration for PythonAnywhere
├── render.yaml                 # Deployment config for Render
├── DEPLOY.md                   # Complete cloud deployment guide
├── README.md                   # Project documentation
├── .gitignore                  # Git ignore rules
├── static/
│   ├── style.css               # Modern responsive styling & view router
│   ├── script.js              # Customer frontend logic & booking workflow
│   ├── admin.js               # Admin dashboard CRUD & analytics
│   └── images/                # Movie posters and banners
└── templates/
    ├── index.html              # Main customer SPA interface
    ├── admin.html              # Admin dashboard interface
    └── admin_login.html        # Secure admin login interface
```

---

## 🌐 Free Cloud Deployment

Detailed step-by-step guides are provided in [DEPLOY.md](DEPLOY.md):
- **[PythonAnywhere](https://www.pythonanywhere.com)**: 100% free hosting with native SQLite support (recommended).
- **[Render](https://render.com)**: Free web service deployment with automatic GitHub integration.
- **Local Network / Wi-Fi**: Host on your local PC and access directly from any mobile phone on your Wi-Fi.

---

## 📄 License
This project is open source and available under the MIT License.
