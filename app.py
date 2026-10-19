from flask import Flask, render_template, request, jsonify, url_for, session, redirect
import sqlite3
import os
import random
import json
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta, timezone, date
from functools import wraps
import secrets

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)

# Maximum upload size (movie posters): 5 MB
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

# Safer session cookies
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = (
    os.environ.get("COOKIE_SECURE", "0") == "1"
)

app.permanent_session_lifetime = timedelta(hours=2)


def _load_secret_key():
    """Use SECRET_KEY from the environment. If it is not set, create one
    once and keep it in a file so admin logins survive restarts and work
    across multiple worker processes."""
    key = os.environ.get("SECRET_KEY")
    if key:
        return key
    key_file = os.path.join(BASE_DIR, ".secret_key")
    try:
        if os.path.exists(key_file):
            with open(key_file, "r", encoding="utf-8") as handle:
                existing = handle.read().strip()
            if existing:
                return existing
        key = secrets.token_hex(32)
        with open(key_file, "w", encoding="utf-8") as handle:
            handle.write(key)
        return key
    except OSError:
        return secrets.token_hex(32)


app.secret_key = _load_secret_key()

# Admin password: defaults to 'admin123' if not set in environment
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD") or "admin123"


# =========================================================
# ADMIN SESSION CHECK
# =========================================================

def admin_session_valid():
    return bool(session.get("admin_authenticated"))


# =========================================================
# PROTECT ADMIN DASHBOARD + ADMIN APIs
# =========================================================

@app.before_request
def protect_admin_area():
    path = request.path

    # Login and logout must remain accessible without authentication.
    if path in ("/admin/login", "/admin/logout"):
        return None

    # Static assets are always public
    if path.startswith("/static/"):
        return None

    # Admin dashboard pages
    is_admin_page = path == "/admin" or path.startswith("/admin/")

    # Admin API routes
    is_admin_api = path.startswith("/api/admin/")

    if is_admin_page or is_admin_api:
        if not admin_session_valid():
            if is_admin_api:
                return jsonify({
                    "success": False,
                    "message": "Admin authentication required."
                }), 401
            return redirect(url_for("admin_login"))

    return None


# =========================================================
# ADMIN LOGIN
# =========================================================

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if admin_session_valid():
        return redirect(url_for("admin"))

    error = None

    if request.method == "POST":
        password = request.form.get("password", "")

        if not ADMIN_PASSWORD:
            error = "Admin password is not configured on the server."
        elif secrets.compare_digest(password, ADMIN_PASSWORD):
            session.clear()
            session.permanent = True
            session["admin_authenticated"] = True
            return redirect(url_for("admin"))
        else:
            error = "Invalid admin password."

    return render_template("admin_login.html", error=error)


# =========================================================
# ADMIN LOGOUT
# =========================================================

@app.route("/admin/logout", methods=["GET", "POST"])
def admin_logout():
    session.clear()

    if request.method == "POST" or request.accept_mimetypes.accept_json:
        return jsonify({
            "success": True,
            "message": "Logged out successfully."
        })

    return redirect(url_for("admin_login"))


# =========================================================
# CONFIGURATION & DATABASE
# =========================================================

DATABASE = os.environ.get("DATABASE_PATH") or os.path.join(
    BASE_DIR,
    "movie_booking.db"
)

STATIC_FOLDER = os.path.join(BASE_DIR, "static")

POSTER_FOLDER = os.path.join(STATIC_FOLDER, "images", "posters")

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

ALLOWED_PAYMENT_METHODS = {"UPI", "Credit Card", "Debit Card"}

TOTAL_SEATS = 20

# Timezone offset: default IST UTC+5:30 (330 minutes)
UTC_OFFSET_MINUTES = int(os.environ.get("APP_UTC_OFFSET_MINUTES", "330"))


def local_now():
    return (
        datetime.now(timezone.utc)
        + timedelta(minutes=UTC_OFFSET_MINUTES)
    ).replace(tzinfo=None)


def parse_show_datetime(show_date, show_time):
    """Accurately parse show date and time supporting both 12h and 24h formats."""
    if not show_date or not show_time:
        return None
    raw = f"{str(show_date).strip()} {str(show_time).strip()}"
    for fmt in (
        "%Y-%m-%d %I:%M %p",
        "%Y-%m-%d %I:%M%p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %I:%M:%S %p"
    ):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            pass
    return None


def show_has_started(show_date, show_time):
    dt = parse_show_datetime(show_date, show_time)
    if dt is None:
        return False
    return dt <= local_now()


def get_db():
    conn = sqlite3.connect(DATABASE, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        conn.execute("PRAGMA journal_mode = WAL")
    except sqlite3.OperationalError:
        pass
    return conn


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

def initialize_database():
    os.makedirs(POSTER_FOLDER, exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # MOVIES
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS movies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price INTEGER NOT NULL,
            genre TEXT,
            poster TEXT,
            active INTEGER NOT NULL DEFAULT 1,
            duration TEXT DEFAULT '',
            release_date TEXT DEFAULT '',
            description TEXT DEFAULT ''
        )
    """)

    # THEATRES
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS theatres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            location TEXT,
            active INTEGER NOT NULL DEFAULT 1
        )
    """)

    # SHOWS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS shows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id INTEGER NOT NULL,
            theatre_id INTEGER NOT NULL,
            show_date TEXT NOT NULL,
            show_time TEXT NOT NULL,
            language TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1,
            FOREIGN KEY(movie_id) REFERENCES movies(id),
            FOREIGN KEY(theatre_id) REFERENCES theatres(id)
        )
    """)

    # BOOKINGS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            booking_id INTEGER PRIMARY KEY,
            customer TEXT NOT NULL,
            movie TEXT NOT NULL,
            tickets INTEGER NOT NULL,
            seats TEXT NOT NULL,
            amount INTEGER NOT NULL,
            payment_method TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'CONFIRMED',
            show_id INTEGER,
            theatre_id INTEGER,
            show_date TEXT,
            show_time TEXT,
            language TEXT
        )
    """)

    # BOOKING MIGRATIONS
    cursor.execute("PRAGMA table_info(bookings)")
    existing_booking_cols = {row["name"] for row in cursor.fetchall()}
    for col, col_type in {
        "show_id": "INTEGER",
        "theatre_id": "INTEGER",
        "show_date": "TEXT",
        "show_time": "TEXT",
        "language": "TEXT"
    }.items():
        if col not in existing_booking_cols:
            cursor.execute(f"ALTER TABLE bookings ADD COLUMN {col} {col_type}")

    # MOVIES MIGRATIONS
    cursor.execute("PRAGMA table_info(movies)")
    existing_movie_cols = {row["name"] for row in cursor.fetchall()}
    for col, col_type in {
        "active": "INTEGER NOT NULL DEFAULT 1",
        "duration": "TEXT DEFAULT ''",
        "release_date": "TEXT DEFAULT ''",
        "description": "TEXT DEFAULT ''"
    }.items():
        if col not in existing_movie_cols:
            cursor.execute(f"ALTER TABLE movies ADD COLUMN {col} {col_type}")

    # THEATRES MIGRATIONS
    cursor.execute("PRAGMA table_info(theatres)")
    existing_theatre_cols = {row["name"] for row in cursor.fetchall()}
    if "active" not in existing_theatre_cols:
        cursor.execute("ALTER TABLE theatres ADD COLUMN active INTEGER NOT NULL DEFAULT 1")

    # SHOWS MIGRATIONS
    cursor.execute("PRAGMA table_info(shows)")
    existing_show_cols = {row["name"] for row in cursor.fetchall()}
    if "active" not in existing_show_cols:
        cursor.execute("ALTER TABLE shows ADD COLUMN active INTEGER NOT NULL DEFAULT 1")

    # INDEXES
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS unique_show_index
        ON shows(movie_id, theatre_id, show_date, show_time, language)
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS booking_show_index ON bookings(show_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS booking_status_index ON bookings(status)")

    # SEED MOVIES IF EMPTY
    movie_count = cursor.execute("SELECT COUNT(*) FROM movies").fetchone()[0]
    if movie_count == 0:
        cursor.executemany("""
            INSERT INTO movies (name, price, genre, poster, active)
            VALUES (?, ?, ?, ?, 1)
        """, [
            ("Kalki 2898 AD", 250, "Sci-Fi / Action", "/static/images/Salaar_poster.jpg"),
            ("Pushpa 2: The Rule", 200, "Action / Thriller", ""),
            ("Coolie", 220, "Action / Drama", ""),
            ("Darling", 150, "Romance / Comedy", "/static/images/posters/608539_darling.jpeg"),
            ("War 2", 280, "Action / Spy", "")
        ])

    # SEED THEATRES IF EMPTY
    theatre_count = cursor.execute("SELECT COUNT(*) FROM theatres").fetchone()[0]
    if theatre_count == 0:
        cursor.executemany("""
            INSERT INTO theatres (name, location, active)
            VALUES (?, ?, 1)
        """, [
            ("PVR Cinemas", "Chennai - VR Mall"),
            ("INOX Cinemas", "Chennai - Marina"),
            ("AGS Cinemas", "Chennai - T Nagar")
        ])

    # SEED UPCOMING SHOWS
    # Ensure there are always active shows scheduled for today and the coming week
    today_str = date.today().isoformat()
    upcoming_count = cursor.execute("""
        SELECT COUNT(*) FROM shows
        WHERE show_date >= ? AND active = 1
    """, (today_str,)).fetchone()[0]

    if upcoming_count < 4:
        active_movies = cursor.execute("SELECT id FROM movies WHERE active = 1").fetchall()
        active_theatres = cursor.execute("SELECT id FROM theatres WHERE active = 1").fetchall()

        if active_movies and active_theatres:
            start_date = date.today()
            show_times = ["10:00 AM", "01:30 PM", "04:30 PM", "07:30 PM"]
            languages = ["English", "Hindi", "Telugu", "Tamil"]
            new_shows = []

            for movie in active_movies:
                for theatre in active_theatres:
                    for day_offset in range(7):
                        d_str = (start_date + timedelta(days=day_offset)).isoformat()
                        for idx, t in enumerate(show_times):
                            lang = languages[(movie["id"] + idx) % len(languages)]
                            new_shows.append((
                                movie["id"],
                                theatre["id"],
                                d_str,
                                t,
                                lang,
                                1
                            ))

            cursor.executemany("""
                INSERT OR IGNORE INTO shows
                (movie_id, theatre_id, show_date, show_time, language, active)
                VALUES (?, ?, ?, ?, ?, ?)
            """, new_shows)

    conn.commit()
    conn.close()


# =========================================================
# HELPERS
# =========================================================

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def normalize_poster_path(poster):
    if not poster:
        return ""
    poster = str(poster).replace("\\", "/")
    if poster.startswith("http://") or poster.startswith("https://"):
        return poster
    if poster.startswith("/static/"):
        return poster
    if poster.startswith("static/"):
        return "/" + poster
    if not poster.startswith("/"):
        return "/static/images/posters/" + poster
    return poster


def delete_poster_file(poster):
    if not poster:
        return
    poster = str(poster).replace("\\", "/")
    filename = os.path.basename(poster)
    if not filename:
        return
    path = os.path.join(POSTER_FOLDER, filename)
    if os.path.exists(path):
        try:
            os.remove(path)
        except OSError:
            pass


def get_show_details(connection, show_id):
    return connection.execute("""
        SELECT
            s.id,
            s.movie_id,
            s.theatre_id,
            s.show_date,
            s.show_time,
            s.language,
            s.active,
            m.name AS movie_name,
            m.price,
            m.poster,
            m.genre,
            t.name AS theatre_name,
            t.location AS theatre_location
        FROM shows s
        JOIN movies m ON m.id = s.movie_id
        JOIN theatres t ON t.id = s.theatre_id
        WHERE s.id = ?
    """, (show_id,)).fetchone()


def booking_to_dict(connection, booking):
    theatre_name = ""
    theatre_location = ""

    if booking["theatre_id"]:
        theatre = connection.execute(
            "SELECT name, location FROM theatres WHERE id = ?",
            (booking["theatre_id"],)
        ).fetchone()
        if theatre:
            theatre_name = theatre["name"]
            theatre_location = theatre["location"] or ""

    try:
        seats = json.loads(booking["seats"])
    except Exception:
        seats = []

    return {
        "booking_id": booking["booking_id"],
        "customer": booking["customer"],
        "movie": booking["movie"],
        "theatre": theatre_name,
        "theatre_name": theatre_name,
        "theatre_location": theatre_location,
        "show_date": booking["show_date"],
        "show_time": booking["show_time"],
        "language": booking["language"],
        "tickets": booking["tickets"],
        "seats": seats,
        "amount": booking["amount"],
        "payment_method": booking["payment_method"],
        "status": booking["status"],
        "show_id": booking["show_id"],
        "theatre_id": booking["theatre_id"]
    }


# =========================================================
# GENERAL ROUTES & HEALTH CHECK
# =========================================================

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({"error": "Uploaded file is too large (max 5MB)."}), 413


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok", "app": "MovieBook"})


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/admin")
def admin():
    return render_template("admin.html")


# =========================================================
# ADMIN DASHBOARD STATISTICS
# =========================================================

@app.route("/api/admin/dashboard", methods=["GET"])
def admin_dashboard():
    conn = get_db()

    movie_count = conn.execute("SELECT COUNT(*) FROM movies WHERE active = 1").fetchone()[0]
    theatre_count = conn.execute("SELECT COUNT(*) FROM theatres WHERE active = 1").fetchone()[0]
    show_count = conn.execute("SELECT COUNT(*) FROM shows WHERE active = 1").fetchone()[0]
    booking_count = conn.execute("SELECT COUNT(*) FROM bookings").fetchone()[0]

    revenue = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM bookings
        WHERE status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
    """).fetchone()[0]

    tickets = conn.execute("""
        SELECT COALESCE(SUM(tickets), 0)
        FROM bookings
        WHERE status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
    """).fetchone()[0]

    conn.close()

    return jsonify({
        "success": True,
        "movies": movie_count,
        "theatres": theatre_count,
        "shows": show_count,
        "bookings": booking_count,
        "revenue": revenue,
        "tickets": tickets
    })


# =========================================================
# PUBLIC MOVIES API
# =========================================================

@app.route("/api/movies", methods=["GET"])
def get_movies():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, name, price, genre, poster, active
        FROM movies
        WHERE active = 1
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "movies": [
            {
                **dict(row),
                "poster": normalize_poster_path(row["poster"])
            }
            for row in rows
        ]
    })


# =========================================================
# PUBLIC THEATRES API
# =========================================================

@app.route("/api/theatres", methods=["GET"])
def get_theatres():
    movie_id = request.args.get("movie_id", type=int)
    conn = get_db()

    if movie_id:
        rows = conn.execute("""
            SELECT DISTINCT t.id, t.name, t.location
            FROM theatres t
            JOIN shows s ON s.theatre_id = t.id
            WHERE t.active = 1
              AND s.active = 1
              AND s.movie_id = ?
            ORDER BY t.name
        """, (movie_id,)).fetchall()
    else:
        rows = conn.execute("""
            SELECT id, name, location
            FROM theatres
            WHERE active = 1
            ORDER BY name
        """).fetchall()

    conn.close()

    return jsonify({
        "success": True,
        "theatres": [dict(row) for row in rows]
    })


# =========================================================
# PUBLIC SHOWS API
# =========================================================

@app.route("/api/shows", methods=["GET"])
def get_shows():
    movie_id = request.args.get("movie_id", type=int)
    theatre_id = request.args.get("theatre_id", type=int)
    show_date = request.args.get("show_date")

    conn = get_db()

    query = """
        SELECT
            s.id,
            s.movie_id,
            s.theatre_id,
            s.show_date,
            s.show_time,
            s.language,
            s.active,
            m.name AS movie_name,
            m.price,
            m.poster,
            t.name AS theatre_name,
            t.location AS theatre_location
        FROM shows s
        JOIN movies m ON m.id = s.movie_id
        JOIN theatres t ON t.id = s.theatre_id
        WHERE s.active = 1
          AND m.active = 1
          AND t.active = 1
    """

    params = []

    if movie_id:
        query += " AND s.movie_id = ?"
        params.append(movie_id)

    if theatre_id:
        query += " AND s.theatre_id = ?"
        params.append(theatre_id)

    if show_date:
        query += " AND s.show_date = ?"
        params.append(show_date)

    query += " ORDER BY s.show_date, s.show_time"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    # Filter out shows that have already started/passed
    upcoming = []
    for row in rows:
        if not show_has_started(row["show_date"], row["show_time"]):
            item = dict(row)
            item["poster"] = normalize_poster_path(item["poster"])
            upcoming.append(item)

    return jsonify({
        "success": True,
        "shows": upcoming
    })


# =========================================================
# SINGLE SHOW API
# =========================================================

@app.route("/api/show/<int:show_id>", methods=["GET"])
def get_show(show_id):
    conn = get_db()
    show = get_show_details(conn, show_id)
    conn.close()

    if show is None:
        return jsonify({
            "success": False,
            "message": "Show not found."
        }), 404

    return jsonify({
        "success": True,
        "show": {
            "id": show["id"],
            "movie_id": show["movie_id"],
            "theatre_id": show["theatre_id"],
            "show_date": show["show_date"],
            "show_time": show["show_time"],
            "language": show["language"],
            "active": show["active"],
            "movie_name": show["movie_name"],
            "price": show["price"],
            "poster": normalize_poster_path(show["poster"]),
            "genre": show["genre"],
            "theatre_name": show["theatre_name"],
            "theatre_location": show["theatre_location"]
        }
    })


# =========================================================
# SEATS API
# =========================================================

@app.route("/api/seats", methods=["GET"])
def get_seats():
    show_id = request.args.get("show_id", type=int)
    conn = get_db()

    if show_id:
        rows = conn.execute("""
            SELECT seats
            FROM bookings
            WHERE show_id = ?
              AND status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
        """, (show_id,)).fetchall()
    else:
        movie = request.args.get("movie")
        if not movie:
            conn.close()
            return jsonify({"success": True, "booked_seats": []})

        rows = conn.execute("""
            SELECT seats
            FROM bookings
            WHERE movie = ?
              AND status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
        """, (movie,)).fetchall()

    conn.close()

    booked_seats = []
    for row in rows:
        try:
            seats = json.loads(row["seats"])
            booked_seats.extend(seats)
        except Exception:
            pass

    booked_seats = sorted(set(int(seat) for seat in booked_seats))

    return jsonify({
        "success": True,
        "booked_seats": booked_seats
    })


# =========================================================
# CREATE BOOKING API
# =========================================================

@app.route("/api/create-booking", methods=["POST"])
def create_booking():
    data = request.get_json(silent=True) or {}

    customer = str(data.get("customer", "")).strip()
    show_id = data.get("show_id")
    seats = data.get("seats", [])
    payment_method = str(data.get("payment_method", "")).strip()

    if not customer:
        return jsonify({
            "success": False,
            "message": "Customer name is required."
        }), 400

    try:
        show_id = int(show_id)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid show selected."
        }), 400

    if payment_method not in ALLOWED_PAYMENT_METHODS:
        return jsonify({
            "success": False,
            "message": "Invalid payment method."
        }), 400

    if not isinstance(seats, list):
        return jsonify({
            "success": False,
            "message": "Invalid seats format."
        }), 400

    try:
        seats = sorted(set(int(seat) for seat in seats))
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid seat numbers."
        }), 400

    if not seats:
        return jsonify({
            "success": False,
            "message": "Please select at least one seat."
        }), 400

    if any(seat < 1 or seat > TOTAL_SEATS for seat in seats):
        return jsonify({
            "success": False,
            "message": f"Seat numbers must be between 1 and {TOTAL_SEATS}."
        }), 400

    conn = get_db()

    # Prevent concurrent double-booking with immediate lock
    try:
        conn.execute("BEGIN IMMEDIATE")
    except sqlite3.OperationalError:
        pass

    show = get_show_details(conn, show_id)

    if show is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Show not found."
        }), 404

    if not show["active"]:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This show schedule is no longer active."
        }), 400

    if show_has_started(show["show_date"], show["show_time"]):
        conn.close()
        return jsonify({
            "success": False,
            "message": "This show has already started or concluded."
        }), 400

    booked_rows = conn.execute("""
        SELECT seats
        FROM bookings
        WHERE show_id = ?
          AND status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
    """, (show_id,)).fetchall()

    booked = set()
    for row in booked_rows:
        try:
            existing = json.loads(row["seats"])
            booked.update(int(seat) for seat in existing)
        except Exception:
            pass

    unavailable = [seat for seat in seats if seat in booked]
    if unavailable:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Some selected seats are already booked.",
            "booked_seats": unavailable
        }), 409

    tickets = len(seats)
    amount = tickets * int(show["price"])

    booking_id = None
    for _ in range(30):
        candidate = random.randint(10000, 99999)
        exists = conn.execute(
            "SELECT booking_id FROM bookings WHERE booking_id = ?",
            (candidate,)
        ).fetchone()
        if not exists:
            booking_id = candidate
            break

    if booking_id is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Unable to generate booking ID. Please try again."
        }), 500

    conn.execute("""
        INSERT INTO bookings (
            booking_id, customer, movie, tickets, seats, amount,
            payment_method, status, show_id, theatre_id,
            show_date, show_time, language
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?, ?, ?, ?)
    """, (
        booking_id,
        customer,
        show["movie_name"],
        tickets,
        json.dumps(seats),
        amount,
        payment_method,
        show_id,
        show["theatre_id"],
        show["show_date"],
        show["show_time"],
        show["language"]
    ))

    conn.commit()

    booking = conn.execute(
        "SELECT * FROM bookings WHERE booking_id = ?",
        (booking_id,)
    ).fetchone()

    result = booking_to_dict(conn, booking)
    result["poster"] = normalize_poster_path(show["poster"])
    result["genre"] = show["genre"] or ""

    conn.close()

    return jsonify({
        "success": True,
        **result
    })


# =========================================================
# SINGLE BOOKING LOOKUP API
# =========================================================

@app.route("/api/booking/<int:booking_id>", methods=["GET"])
def get_booking(booking_id):
    conn = get_db()
    booking = conn.execute(
        "SELECT * FROM bookings WHERE booking_id = ?",
        (booking_id,)
    ).fetchone()

    if booking is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Booking not found."
        }), 404

    result = booking_to_dict(conn, booking)
    conn.close()

    return jsonify({
        "success": True,
        "booking": result,
        **result
    })


# =========================================================
# PUBLIC BOOKINGS API (My Bookings)
# =========================================================

@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    # Only return bookings the browser asks for (its own booking IDs),
    # preserving customer privacy
    ids = []
    for part in request.args.get("ids", "").split(","):
        part = part.strip()
        if part.isdigit():
            ids.append(int(part))
    ids = ids[:50]

    if not ids:
        return jsonify({
            "success": True,
            "bookings": []
        })

    conn = get_db()
    placeholders = ",".join("?" for _ in ids)
    rows = conn.execute(f"""
        SELECT *
        FROM bookings
        WHERE booking_id IN ({placeholders})
        ORDER BY booking_id DESC
    """, ids).fetchall()

    bookings = [booking_to_dict(conn, row) for row in rows]
    conn.close()

    return jsonify({
        "success": True,
        "bookings": bookings
    })


# =========================================================
# CANCEL COMPLETE BOOKING API
# =========================================================

@app.route("/api/cancel-booking", methods=["POST"])
def cancel_booking():
    data = request.get_json(silent=True) or {}
    booking_id = data.get("booking_id")

    try:
        booking_id = int(booking_id)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid booking ID."
        }), 400

    conn = get_db()
    booking = conn.execute(
        "SELECT * FROM bookings WHERE booking_id = ?",
        (booking_id,)
    ).fetchone()

    if booking is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Booking not found."
        }), 404

    if booking["status"] == "CANCELLED":
        conn.close()
        return jsonify({
            "success": False,
            "message": "Booking is already cancelled."
        }), 400

    conn.execute("""
        UPDATE bookings
        SET tickets = 0, seats = '[]', amount = 0, status = 'CANCELLED'
        WHERE booking_id = ?
    """, (booking_id,))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Booking cancelled successfully."
    })


# =========================================================
# CANCEL SELECTED SEATS API
# =========================================================

@app.route("/api/cancel-seats", methods=["POST"])
def cancel_seats():
    data = request.get_json(silent=True) or {}
    booking_id = data.get("booking_id")
    selected_seats = data.get("seats", [])

    try:
        booking_id = int(booking_id)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid booking ID."
        }), 400

    if not isinstance(selected_seats, list):
        return jsonify({
            "success": False,
            "message": "Invalid seats selection."
        }), 400

    try:
        selected_seats = sorted(set(int(seat) for seat in selected_seats))
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid seat numbers."
        }), 400

    if not selected_seats:
        return jsonify({
            "success": False,
            "message": "Please select seats to cancel."
        }), 400

    conn = get_db()
    booking = conn.execute(
        "SELECT * FROM bookings WHERE booking_id = ?",
        (booking_id,)
    ).fetchone()

    if booking is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Booking not found."
        }), 404

    if booking["status"] == "CANCELLED":
        conn.close()
        return jsonify({
            "success": False,
            "message": "Booking is already cancelled."
        }), 400

    try:
        current_seats = [int(seat) for seat in json.loads(booking["seats"])]
    except Exception:
        current_seats = []

    if not current_seats:
        conn.close()
        return jsonify({
            "success": False,
            "message": "No active seats remain on this booking."
        }), 400

    invalid = [seat for seat in selected_seats if seat not in current_seats]
    if invalid:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Some selected seats do not belong to this booking.",
            "invalid_seats": invalid
        }), 400

    remaining = [seat for seat in current_seats if seat not in selected_seats]
    per_ticket = booking["amount"] / booking["tickets"] if booking["tickets"] else 0
    new_amount = round(len(remaining) * per_ticket)

    if not remaining:
        conn.execute("""
            UPDATE bookings
            SET tickets = 0, seats = '[]', amount = 0, status = 'CANCELLED'
            WHERE booking_id = ?
        """, (booking_id,))
        new_status = "CANCELLED"
    else:
        conn.execute("""
            UPDATE bookings
            SET tickets = ?, seats = ?, amount = ?, status = 'PARTIALLY_CANCELLED'
            WHERE booking_id = ?
        """, (len(remaining), json.dumps(remaining), new_amount, booking_id))
        new_status = "PARTIALLY_CANCELLED"

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "status": new_status,
        "remaining_seats": remaining,
        "amount": new_amount,
        "message": "Selected seats cancelled successfully."
    })


# =========================================================
# ADMIN MOVIES API
# =========================================================

@app.route("/api/admin/movies", methods=["GET"])
def admin_get_movies():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, name, price, genre, poster, active
        FROM movies
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "movies": [
            {
                **dict(row),
                "poster": normalize_poster_path(row["poster"])
            }
            for row in rows
        ]
    })


@app.route("/api/admin/movies", methods=["POST"])
def admin_add_movie():
    name = request.form.get("name", "").strip()
    genre = request.form.get("genre", "").strip()
    price = request.form.get("price", "").strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Movie name is required."
        }), 400

    try:
        price = int(price)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid movie price."
        }), 400

    if price <= 0:
        return jsonify({
            "success": False,
            "message": "Price must be greater than zero."
        }), 400

    poster_path = ""
    file = request.files.get("poster")

    if file and file.filename:
        if not allowed_file(file.filename):
            return jsonify({
                "success": False,
                "message": "Invalid poster format. Allowed: PNG, JPG, JPEG, WEBP."
            }), 400

        filename = secure_filename(file.filename)
        unique_name = f"{int(datetime.now().timestamp())}_{random.randint(1000,9999)}_{filename}"
        filepath = os.path.join(POSTER_FOLDER, unique_name)
        file.save(filepath)
        poster_path = f"/static/images/posters/{unique_name}"

    conn = get_db()
    cursor = conn.execute("""
        INSERT INTO movies (name, price, genre, poster, active)
        VALUES (?, ?, ?, ?, 1)
    """, (name, price, genre, poster_path))

    movie_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Movie added successfully.",
        "id": movie_id
    })


@app.route("/api/admin/movies/<int:movie_id>", methods=["PUT"])
def admin_update_movie(movie_id):
    # Accept both multipart/form-data and JSON
    payload = request.form if request.form else (request.get_json(silent=True) or {})

    name = str(payload.get("name", "")).strip()
    genre = str(payload.get("genre", "")).strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Movie name is required."
        }), 400

    try:
        price = int(payload.get("price"))
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid price."
        }), 400

    if price <= 0:
        return jsonify({
            "success": False,
            "message": "Price must be greater than zero."
        }), 400

    conn = get_db()
    movie = conn.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)).fetchone()

    if movie is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Movie not found."
        }), 404

    poster_path = movie["poster"] or ""

    file = request.files.get("poster")
    if file and file.filename:
        if not allowed_file(file.filename):
            conn.close()
            return jsonify({
                "success": False,
                "message": "Invalid poster format."
            }), 400

        filename = secure_filename(file.filename)
        unique_name = f"{int(datetime.now().timestamp())}_{random.randint(1000,9999)}_{filename}"
        filepath = os.path.join(POSTER_FOLDER, unique_name)
        file.save(filepath)
        # Delete old poster file if local
        delete_poster_file(movie["poster"])
        poster_path = f"/static/images/posters/{unique_name}"

    conn.execute("""
        UPDATE movies
        SET name = ?, genre = ?, price = ?, poster = ?
        WHERE id = ?
    """, (name, genre, price, poster_path, movie_id))

    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Movie updated successfully."
    })


@app.route("/api/admin/movies/<int:movie_id>", methods=["DELETE"])
def admin_delete_movie(movie_id):
    conn = get_db()
    movie = conn.execute("SELECT * FROM movies WHERE id = ?", (movie_id,)).fetchone()

    if movie is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Movie not found."
        }), 404

    booking_count = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE movie = ?",
        (movie["name"],)
    ).fetchone()[0]

    if booking_count > 0:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This movie has booking records. Deactivate it instead."
        }), 400

    show_count = conn.execute(
        "SELECT COUNT(*) FROM shows WHERE movie_id = ?",
        (movie_id,)
    ).fetchone()[0]

    if show_count > 0:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This movie has scheduled shows. Deactivate it instead."
        }), 400

    delete_poster_file(movie["poster"])

    conn.execute("DELETE FROM movies WHERE id = ?", (movie_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Movie deleted successfully."
    })


@app.route("/api/admin/movies/<int:movie_id>/toggle", methods=["POST"])
def toggle_movie(movie_id):
    conn = get_db()
    movie = conn.execute("SELECT active FROM movies WHERE id = ?", (movie_id,)).fetchone()

    if movie is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Movie not found."
        }), 404

    new_status = 0 if movie["active"] else 1
    conn.execute("UPDATE movies SET active = ? WHERE id = ?", (new_status, movie_id))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "active": bool(new_status)
    })


# =========================================================
# ADMIN THEATRES API
# =========================================================

@app.route("/api/admin/theatres", methods=["GET"])
def admin_get_theatres():
    conn = get_db()
    rows = conn.execute("""
        SELECT id, name, location, active
        FROM theatres
        ORDER BY id DESC
    """).fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "theatres": [dict(row) for row in rows]
    })


@app.route("/api/admin/theatres", methods=["POST"])
def admin_add_theatre():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    location = str(data.get("location", "")).strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Theatre name is required."
        }), 400

    conn = get_db()
    try:
        cursor = conn.execute("""
            INSERT INTO theatres (name, location, active)
            VALUES (?, ?, 1)
        """, (name, location))
        theatre_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": "Theatre added successfully.",
            "id": theatre_id
        })
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            "success": False,
            "message": "A theatre with this name already exists."
        }), 409


@app.route("/api/admin/theatres/<int:theatre_id>", methods=["PUT"])
def admin_update_theatre(theatre_id):
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    location = str(data.get("location", "")).strip()

    if not name:
        return jsonify({
            "success": False,
            "message": "Theatre name is required."
        }), 400

    conn = get_db()
    theatre = conn.execute("SELECT * FROM theatres WHERE id = ?", (theatre_id,)).fetchone()

    if theatre is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Theatre not found."
        }), 404

    try:
        conn.execute("""
            UPDATE theatres
            SET name = ?, location = ?
            WHERE id = ?
        """, (name, location, theatre_id))
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": "Theatre updated successfully."
        })
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Another theatre already has this name."
        }), 409


@app.route("/api/admin/theatres/<int:theatre_id>", methods=["DELETE"])
def admin_delete_theatre(theatre_id):
    conn = get_db()
    theatre = conn.execute("SELECT * FROM theatres WHERE id = ?", (theatre_id,)).fetchone()

    if theatre is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Theatre not found."
        }), 404

    show_count = conn.execute(
        "SELECT COUNT(*) FROM shows WHERE theatre_id = ?",
        (theatre_id,)
    ).fetchone()[0]

    if show_count > 0:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This theatre has scheduled shows. Deactivate it instead."
        }), 400

    conn.execute("DELETE FROM theatres WHERE id = ?", (theatre_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Theatre deleted successfully."
    })


@app.route("/api/admin/theatres/<int:theatre_id>/toggle", methods=["POST"])
def toggle_theatre(theatre_id):
    conn = get_db()
    theatre = conn.execute("SELECT active FROM theatres WHERE id = ?", (theatre_id,)).fetchone()

    if theatre is None:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Theatre not found."
        }), 404

    new_status = 0 if theatre["active"] else 1
    conn.execute("UPDATE theatres SET active = ? WHERE id = ?", (new_status, theatre_id))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "active": bool(new_status)
    })


# =========================================================
# ADMIN SHOWS API
# =========================================================

@app.route("/api/admin/shows", methods=["GET"])
def admin_get_shows():
    conn = get_db()
    rows = conn.execute("""
        SELECT
            s.id,
            s.movie_id,
            s.theatre_id,
            s.show_date,
            s.show_time,
            s.language,
            s.active,
            m.name AS movie_name,
            m.price,
            t.name AS theatre_name,
            t.location AS theatre_location
        FROM shows s
        JOIN movies m ON m.id = s.movie_id
        JOIN theatres t ON t.id = s.theatre_id
        ORDER BY s.show_date DESC, s.show_time ASC
    """).fetchall()
    conn.close()

    return jsonify({
        "success": True,
        "shows": [dict(row) for row in rows]
    })


@app.route("/api/admin/shows", methods=["POST"])
def admin_add_show():
    data = request.get_json(silent=True) or {}

    try:
        movie_id = int(data.get("movie_id"))
        theatre_id = int(data.get("theatre_id"))
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid movie or theatre selection."
        }), 400

    show_date = str(data.get("show_date", "")).strip()
    show_time = str(data.get("show_time", "")).strip()
    language = str(data.get("language", "")).strip()

    if not (show_date and show_time and language):
        return jsonify({
            "success": False,
            "message": "Date, show time, and language are all required."
        }), 400

    conn = get_db()

    movie = conn.execute("SELECT id FROM movies WHERE id = ?", (movie_id,)).fetchone()
    theatre = conn.execute("SELECT id FROM theatres WHERE id = ?", (theatre_id,)).fetchone()

    if movie is None:
        conn.close()
        return jsonify({"success": False, "message": "Movie not found."}), 404

    if theatre is None:
        conn.close()
        return jsonify({"success": False, "message": "Theatre not found."}), 404

    try:
        cursor = conn.execute("""
            INSERT INTO shows (movie_id, theatre_id, show_date, show_time, language, active)
            VALUES (?, ?, ?, ?, ?, 1)
        """, (movie_id, theatre_id, show_date, show_time, language))
        show_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": "Show scheduled successfully.",
            "id": show_id
        })
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({
            "success": False,
            "message": "Another show with the exact same schedule already exists."
        }), 409


@app.route("/api/admin/shows/<int:show_id>", methods=["PUT"])
def admin_update_show(show_id):
    data = request.get_json(silent=True) or {}

    try:
        movie_id = int(data.get("movie_id"))
        theatre_id = int(data.get("theatre_id"))
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid movie or theatre."
        }), 400

    show_date = str(data.get("show_date", "")).strip()
    show_time = str(data.get("show_time", "")).strip()
    language = str(data.get("language", "")).strip()

    if not (show_date and show_time and language):
        return jsonify({
            "success": False,
            "message": "All show fields are required."
        }), 400

    conn = get_db()
    show = conn.execute("SELECT * FROM shows WHERE id = ?", (show_id,)).fetchone()

    if show is None:
        conn.close()
        return jsonify({"success": False, "message": "Show not found."}), 404

    booking_count = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE show_id = ?",
        (show_id,)
    ).fetchone()[0]

    if booking_count > 0:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This show has active booking records and cannot be modified."
        }), 400

    try:
        conn.execute("""
            UPDATE shows
            SET movie_id = ?, theatre_id = ?, show_date = ?, show_time = ?, language = ?
            WHERE id = ?
        """, (movie_id, theatre_id, show_date, show_time, language, show_id))
        conn.commit()
        conn.close()
        return jsonify({
            "success": True,
            "message": "Show schedule updated successfully."
        })
    except sqlite3.IntegrityError:
        conn.rollback()
        conn.close()
        return jsonify({
            "success": False,
            "message": "Another show with the same schedule already exists."
        }), 409


@app.route("/api/admin/shows/<int:show_id>", methods=["DELETE"])
def admin_delete_show(show_id):
    conn = get_db()
    show = conn.execute("SELECT * FROM shows WHERE id = ?", (show_id,)).fetchone()

    if show is None:
        conn.close()
        return jsonify({"success": False, "message": "Show not found."}), 404

    booking_count = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE show_id = ?",
        (show_id,)
    ).fetchone()[0]

    if booking_count > 0:
        conn.close()
        return jsonify({
            "success": False,
            "message": "This show has booking records. Deactivate it instead."
        }), 400

    conn.execute("DELETE FROM shows WHERE id = ?", (show_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Show schedule deleted successfully."
    })


@app.route("/api/admin/shows/<int:show_id>/toggle", methods=["POST"])
def toggle_show(show_id):
    conn = get_db()
    show = conn.execute("SELECT active FROM shows WHERE id = ?", (show_id,)).fetchone()

    if show is None:
        conn.close()
        return jsonify({"success": False, "message": "Show schedule not found."}), 404

    new_status = 0 if show["active"] else 1
    conn.execute("UPDATE shows SET active = ? WHERE id = ?", (new_status, show_id))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "active": bool(new_status)
    })


# =========================================================
# ADMIN BOOKINGS API
# =========================================================

@app.route("/api/admin/bookings", methods=["GET"])
def admin_bookings():
    conn = get_db()
    rows = conn.execute("""
        SELECT
            b.*,
            t.name AS theatre_name,
            t.location AS theatre_location
        FROM bookings b
        LEFT JOIN theatres t ON t.id = b.theatre_id
        ORDER BY b.booking_id DESC
    """).fetchall()

    bookings = []
    for row in rows:
        item = dict(row)
        try:
            item["seats"] = json.loads(row["seats"])
        except Exception:
            item["seats"] = []
        bookings.append(item)

    conn.close()

    return jsonify({
        "success": True,
        "bookings": bookings
    })


@app.route("/api/admin/bookings/<int:booking_id>/confirm", methods=["POST"])
def admin_confirm_booking(booking_id):
    conn = get_db()
    booking = conn.execute(
        "SELECT * FROM bookings WHERE booking_id = ?",
        (booking_id,)
    ).fetchone()

    if booking is None:
        conn.close()
        return jsonify({"success": False, "message": "Booking not found."}), 404

    if booking["status"] == "CANCELLED":
        conn.close()
        return jsonify({
            "success": False,
            "message": "A fully cancelled booking cannot be directly confirmed."
        }), 400

    conn.execute("UPDATE bookings SET status = 'CONFIRMED' WHERE booking_id = ?", (booking_id,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": "Booking confirmed successfully."
    })


# =========================================================
# ADMIN REVENUE API
# =========================================================

@app.route("/api/admin/revenue", methods=["GET"])
def admin_revenue():
    conn = get_db()

    total_revenue = conn.execute("""
        SELECT COALESCE(SUM(amount), 0)
        FROM bookings
        WHERE status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
    """).fetchone()[0]

    total_tickets = conn.execute("""
        SELECT COALESCE(SUM(tickets), 0)
        FROM bookings
        WHERE status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
    """).fetchone()[0]

    confirmed = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED'"
    ).fetchone()[0]

    partial = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE status = 'PARTIALLY_CANCELLED'"
    ).fetchone()[0]

    cancelled = conn.execute(
        "SELECT COUNT(*) FROM bookings WHERE status = 'CANCELLED'"
    ).fetchone()[0]

    payment_rows = conn.execute("""
        SELECT
            payment_method,
            COUNT(*) AS booking_count,
            COALESCE(SUM(amount), 0) AS revenue
        FROM bookings
        WHERE status IN ('CONFIRMED', 'PARTIALLY_CANCELLED')
        GROUP BY payment_method
        ORDER BY revenue DESC
    """).fetchall()

    payment_methods = [dict(row) for row in payment_rows]
    conn.close()

    return jsonify({
        "success": True,
        "total_revenue": total_revenue,
        "tickets_sold": total_tickets,
        "confirmed_bookings": confirmed,
        "partial_bookings": partial,
        "cancelled_bookings": cancelled,
        "payment_methods": payment_methods
    })


# =========================================================
# START APPLICATION
# =========================================================

initialize_database()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"

    print()
    print("=" * 45)
    print("              MOVIEBOOK WEB APP")
    print("=" * 45)
    print(f" * Public Site:   http://127.0.0.1:{port}")
    print(f" * Admin Portal:  http://127.0.0.1:{port}/admin")
    print(f" * Admin Login:   http://127.0.0.1:{port}/admin/login")
    print(f" * Default Admin: admin123")
    print("=" * 45)
    print()

    app.run(host="0.0.0.0", port=port, debug=debug)