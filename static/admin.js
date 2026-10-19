/* =========================================================
   MOVIE TICKET BOOKING SYSTEM
   COMPLETE ADMIN JAVASCRIPT

   Features:
   - Admin authenticated API requests
   - Automatic redirect when session expires
   - Dashboard statistics
   - Movie management
   - Theatre management
   - Show management
   - Booking management
   - Booking search/filter
   - Recent bookings
   - Revenue details
   - Payment method breakdown
   - Activate / Deactivate
   - Edit / Delete
   - Logout
   - No duplicate functions
   ========================================================= */


/* =========================================================
   GLOBAL DATA
   ========================================================= */

let movies = [];
let theatres = [];
let shows = [];
let adminBookings = [];


/* =========================================================
   SHORT DOM HELPER
   ========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   NOTICE / MESSAGE
   ========================================================= */

function showNotice(message, ok = true) {

    const notice = $("notice");

    if (!notice) {
        return;
    }

    notice.textContent = message;

    notice.className =
        "notice show " +
        (ok ? "ok" : "err");

    clearTimeout(showNotice.timer);

    showNotice.timer =
        setTimeout(() => {
            notice.className = "notice";
        }, 4000);
}


/* =========================================================
   AUTHENTICATED API REQUEST
   ========================================================= */

async function api(url, options = {}) {

    const response =
        await fetch(
            url,
            {
                credentials: "same-origin",
                ...options
            }
        );


    /* -----------------------------------------------------
       ADMIN SESSION EXPIRED
       ----------------------------------------------------- */

    if (response.status === 401) {

        window.location.href =
            "/admin/login";

        throw new Error(
            "Admin session expired."
        );
    }


    const text =
        await response.text();


    let data = {};


    /* -----------------------------------------------------
       PARSE JSON
       ----------------------------------------------------- */

    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    } catch (error) {

        console.error(
            "Non-JSON server response:",
            text
        );

        throw new Error(
            `Server returned an invalid response ` +
            `(HTTP ${response.status}). ` +
            `Check the Flask terminal.`
        );
    }


    /* -----------------------------------------------------
       HANDLE SERVER ERRORS
       ----------------------------------------------------- */

    if (
        !response.ok ||
        data.success === false
    ) {

        throw new Error(
            data.message ||
            data.error ||
            `Request failed (HTTP ${response.status}).`
        );
    }


    return data;
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function esc(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>'"]/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#039;",
            '"': "&quot;"
        }[character])
    );
}


/* =========================================================
   STATUS BADGE
   ========================================================= */

function statusBadge(active) {

    const isActive =
        Number(active) === 1 ||
        active === true;

    return isActive
        ? '<span class="badge active-badge">Active</span>'
        : '<span class="badge inactive-badge">Inactive</span>';
}


/* =========================================================
   BOOKING STATUS BADGE
   ========================================================= */

function bookingStatusBadge(status) {

    if (status === "CANCELLED") {

        return `
            <span class="badge cancelled-badge">
                Cancelled
            </span>
        `;
    }


    if (status === "PARTIALLY_CANCELLED") {

        return `
            <span class="badge partial-badge">
                Partially Cancelled
            </span>
        `;
    }


    return `
        <span class="badge confirmed-badge">
            Confirmed
        </span>
    `;
}


/* =========================================================
   DATE FORMAT
   ========================================================= */

function formatDate(dateValue) {

    if (!dateValue) {
        return "-";
    }


    const parts =
        String(dateValue).split("-");


    if (parts.length !== 3) {
        return dateValue;
    }


    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return dateValue;
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


/* =========================================================
   TIME NORMALIZATION
   ========================================================= */

function normalizeTime(time) {

    if (!time) {
        return "";
    }


    const value =
        String(time).trim();


    /* HH:MM */

    if (
        /^\d{2}:\d{2}$/.test(value)
    ) {
        return value;
    }


    /* HH:MM:SS */

    if (
        /^\d{2}:\d{2}:\d{2}$/.test(value)
    ) {

        return value.substring(
            0,
            5
        );
    }


    /* 12-hour format */

    const match =
        value.match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );


    if (!match) {
        return value;
    }


    let hour =
        Number(match[1]);


    const minute =
        match[2];


    const period =
        match[3].toUpperCase();


    if (
        period === "PM" &&
        hour !== 12
    ) {
        hour += 12;
    }


    if (
        period === "AM" &&
        hour === 12
    ) {
        hour = 0;
    }


    return (
        String(hour).padStart(2, "0") +
        ":" +
        minute
    );
}


/* =========================================================
   24-HOUR → 12-HOUR FORMAT
   ========================================================= */

function to12(time) {

    const normalized =
        normalizeTime(time);


    const match =
        normalized.match(
            /^(\d{2}):(\d{2})$/
        );


    if (!match) {
        return time || "-";
    }


    let hour =
        Number(match[1]);


    const minute =
        match[2];


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 || 12;


    return (
        `${hour}:${minute} ${suffix}`
    );
}


/* =========================================================
   SEATS FORMAT
   ========================================================= */

function seatsText(seats) {

    if (!Array.isArray(seats)) {

        /*
           Backend normally returns an array,
           but this also handles strings.
        */

        if (
            typeof seats === "string" &&
            seats.trim()
        ) {

            const parsed =
                seats
                    .split(",")
                    .map(value =>
                        value.trim()
                    )
                    .filter(Boolean);

            return parsed.length
                ? parsed
                    .map(seat => `S${seat}`)
                    .join(", ")
                : "-";
        }

        return "-";
    }


    return seats.length
        ? seats
            .map(seat => `S${seat}`)
            .join(", ")
        : "-";
}


/* =========================================================
   PANEL NAVIGATION
   ========================================================= */

function openPanel(panelId) {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.classList.toggle(
                "active",
                tab.dataset.panel === panelId
            );

        });


    document
        .querySelectorAll(".panel")
        .forEach(panel => {

            panel.classList.toggle(
                "active",
                panel.id === panelId
            );

        });


    if (
        panelId === "bookingsPanel"
    ) {

        loadAdminBookings();
    }


    if (
        panelId === "revenuePanel"
    ) {

        loadRevenueDetails();
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

async function loadDashboardStats() {

    try {

        const data =
            await api(
                "/api/admin/dashboard"
            );


        if ($("statMovies")) {

            $("statMovies")
                .textContent =
                Number(
                    data.movies || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("statTheatres")) {

            $("statTheatres")
                .textContent =
                Number(
                    data.theatres || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("statShows")) {

            $("statShows")
                .textContent =
                Number(
                    data.shows || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("statBookings")) {

            $("statBookings")
                .textContent =
                Number(
                    data.bookings || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("statRevenue")) {

            $("statRevenue")
                .textContent =
                "₹" +
                Number(
                    data.revenue || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );


        [
            "statMovies",
            "statTheatres",
            "statShows",
            "statBookings"
        ].forEach(id => {

            if ($(id)) {
                $(id).textContent = "—";
            }

        });


        if ($("statRevenue")) {

            $("statRevenue")
                .textContent =
                "₹—";
        }
    }
}


/* =========================================================
   MOVIE MANAGEMENT
   ========================================================= */


/* ---------------------------------------------------------
   LOAD MOVIES
   --------------------------------------------------------- */

async function loadMovies() {

    try {

        const data =
            await api(
                "/api/admin/movies"
            );


        movies =
            data.movies || [];


        renderMovies();

        populateMovieOptions();


    } catch (error) {

        console.error(
            "Movie loading error:",
            error
        );


        if ($("moviesBody")) {

            $("moviesBody").innerHTML = `
                <tr>
                    <td colspan="6" class="empty">
                        ${esc(error.message)}
                    </td>
                </tr>
            `;
        }


        throw error;
    }
}


/* ---------------------------------------------------------
   RENDER MOVIES
   --------------------------------------------------------- */

function renderMovies() {

    if ($("movieCount")) {

        $("movieCount")
            .textContent =
            `${movies.length} movie(s)`;
    }


    if (!$("moviesBody")) {
        return;
    }


    $("moviesBody").innerHTML =
        movies.length

            ? movies
                .map(movie => `

                    <tr>

                        <td>
                            ${esc(movie.id)}
                        </td>

                        <td>
                            ${esc(movie.name)}
                        </td>

                        <td>
                            ${esc(movie.genre || "-")}
                        </td>

                        <td>
                            ₹${Number(
                                movie.price || 0
                            ).toLocaleString(
                                "en-IN"
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                movie.active
                            )}
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="secondary"
                                    type="button"
                                    onclick="editMovie(${movie.id})"
                                >
                                    Edit
                                </button>


                                <button
                                    class="${
                                        Number(movie.active) === 1
                                            ? "danger"
                                            : "success"
                                    }"
                                    type="button"
                                    onclick="toggleMovie(${movie.id})"
                                >
                                    ${
                                        Number(movie.active) === 1
                                            ? "Deactivate"
                                            : "Activate"
                                    }
                                </button>


                                <button
                                    class="danger"
                                    type="button"
                                    onclick="deleteMovie(${movie.id})"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `)
                .join("")

            : `
                <tr>
                    <td
                        colspan="6"
                        class="empty"
                    >
                        No movies found.
                    </td>
                </tr>
            `;
}


/* ---------------------------------------------------------
   MOVIE FORM RESET
   --------------------------------------------------------- */

function resetMovieForm() {

    if ($("movieForm")) {
        $("movieForm").reset();
    }


    if ($("movieId")) {
        $("movieId").value = "";
    }


    if ($("movieFormTitle")) {

        $("movieFormTitle")
            .textContent =
            "Add Movie";
    }
}


/* ---------------------------------------------------------
   EDIT MOVIE
   --------------------------------------------------------- */

function editMovie(id) {

    const movie =
        movies.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!movie) {

        showNotice(
            "Movie information not found.",
            false
        );

        return;
    }


    if ($("movieId")) {
        $("movieId").value =
            movie.id;
    }


    if ($("movieName")) {
        $("movieName").value =
            movie.name || "";
    }


    if ($("movieGenre")) {
        $("movieGenre").value =
            movie.genre || "";
    }


    if ($("moviePrice")) {
        $("moviePrice").value =
            movie.price || "";
    }


    if ($("movieFormTitle")) {

        $("movieFormTitle")
            .textContent =
            "Edit Movie";
    }


    openPanel(
        "moviesPanel"
    );
}


/* ---------------------------------------------------------
   TOGGLE MOVIE
   --------------------------------------------------------- */

async function toggleMovie(id) {

    try {

        await api(
            `/api/admin/movies/${id}/toggle`,
            {
                method: "POST"
            }
        );


        await loadMovies();
        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Movie status updated."
        );


    } catch (error) {

        console.error(
            "Toggle movie error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* ---------------------------------------------------------
   DELETE MOVIE
   --------------------------------------------------------- */

async function deleteMovie(id) {

    const movie =
        movies.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    const movieName =
        movie
            ? movie.name
            : "this movie";


    const confirmed =
        confirm(
            `Delete "${movieName}"?\n\n` +
            `If this movie has booking records, ` +
            `the server may reject the deletion.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/admin/movies/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadMovies();
        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Movie deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete movie error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* =========================================================
   THEATRE MANAGEMENT
   ========================================================= */


/* ---------------------------------------------------------
   LOAD THEATRES
   --------------------------------------------------------- */

async function loadTheatres() {

    try {

        const data =
            await api(
                "/api/admin/theatres"
            );


        theatres =
            data.theatres || [];


        renderTheatres();

        populateTheatreOptions();


    } catch (error) {

        console.error(
            "Theatre loading error:",
            error
        );


        if ($("theatresBody")) {

            $("theatresBody").innerHTML = `
                <tr>
                    <td colspan="5" class="empty">
                        ${esc(error.message)}
                    </td>
                </tr>
            `;
        }


        throw error;
    }
}


/* ---------------------------------------------------------
   RENDER THEATRES
   --------------------------------------------------------- */

function renderTheatres() {

    if ($("theatreCount")) {

        $("theatreCount")
            .textContent =
            `${theatres.length} theatre(s)`;
    }


    if (!$("theatresBody")) {
        return;
    }


    $("theatresBody").innerHTML =
        theatres.length

            ? theatres
                .map(theatre => `

                    <tr>

                        <td>
                            ${esc(theatre.id)}
                        </td>

                        <td>
                            ${esc(theatre.name)}
                        </td>

                        <td>
                            ${esc(
                                theatre.location || "-"
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                theatre.active
                            )}
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="secondary"
                                    type="button"
                                    onclick="editTheatre(${theatre.id})"
                                >
                                    Edit
                                </button>


                                <button
                                    class="${
                                        Number(theatre.active) === 1
                                            ? "danger"
                                            : "success"
                                    }"
                                    type="button"
                                    onclick="toggleTheatre(${theatre.id})"
                                >
                                    ${
                                        Number(theatre.active) === 1
                                            ? "Deactivate"
                                            : "Activate"
                                    }
                                </button>


                                <button
                                    class="danger"
                                    type="button"
                                    onclick="deleteTheatre(${theatre.id})"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `)
                .join("")

            : `
                <tr>
                    <td
                        colspan="5"
                        class="empty"
                    >
                        No theatres found.
                    </td>
                </tr>
            `;
}


/* ---------------------------------------------------------
   THEATRE DROPDOWN
   --------------------------------------------------------- */

function populateTheatreOptions() {

    const select =
        $("showTheatre");


    if (!select) {
        return;
    }


    const current =
        select.value;


    select.innerHTML =
        `
            <option value="">
                Select Theatre
            </option>
        `;


    theatres
        .filter(
            theatre =>
                Number(theatre.active) === 1
        )
        .forEach(theatre => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                theatre.id;


            option.textContent =
                `${theatre.name} - ${theatre.location}`;


            select.appendChild(
                option
            );
        });


    if (current) {

        select.value =
            current;
    }
}


/* ---------------------------------------------------------
   RESET THEATRE FORM
   --------------------------------------------------------- */

function resetTheatreForm() {

    if ($("theatreForm")) {
        $("theatreForm").reset();
    }


    if ($("theatreId")) {
        $("theatreId").value = "";
    }


    if ($("theatreFormTitle")) {

        $("theatreFormTitle")
            .textContent =
            "Add Theatre";
    }
}


/* ---------------------------------------------------------
   EDIT THEATRE
   --------------------------------------------------------- */

function editTheatre(id) {

    const theatre =
        theatres.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!theatre) {

        showNotice(
            "Theatre information not found.",
            false
        );

        return;
    }


    if ($("theatreId")) {
        $("theatreId").value =
            theatre.id;
    }


    if ($("theatreName")) {
        $("theatreName").value =
            theatre.name || "";
    }


    if ($("theatreLocation")) {
        $("theatreLocation").value =
            theatre.location || "";
    }


    if ($("theatreFormTitle")) {

        $("theatreFormTitle")
            .textContent =
            "Edit Theatre";
    }


    openPanel(
        "theatresPanel"
    );
}


/* ---------------------------------------------------------
   TOGGLE THEATRE
   --------------------------------------------------------- */

async function toggleTheatre(id) {

    try {

        await api(
            `/api/admin/theatres/${id}/toggle`,
            {
                method: "POST"
            }
        );


        await loadTheatres();
        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Theatre status updated."
        );


    } catch (error) {

        console.error(
            "Toggle theatre error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* ---------------------------------------------------------
   DELETE THEATRE
   --------------------------------------------------------- */

async function deleteTheatre(id) {

    const theatre =
        theatres.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    const name =
        theatre
            ? theatre.name
            : "this theatre";


    const confirmed =
        confirm(
            `Delete "${name}"?\n\n` +
            `The server protects theatres that already ` +
            `have booking records.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/admin/theatres/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadTheatres();
        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Theatre deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete theatre error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* =========================================================
   SHOW MANAGEMENT
   ========================================================= */


/* ---------------------------------------------------------
   LOAD SHOWS
   --------------------------------------------------------- */

async function loadShows() {

    try {

        const data =
            await api(
                "/api/admin/shows"
            );


        shows =
            data.shows || [];


        renderShows();


    } catch (error) {

        console.error(
            "Show loading error:",
            error
        );


        if ($("showsBody")) {

            $("showsBody").innerHTML = `
                <tr>
                    <td colspan="8" class="empty">
                        ${esc(error.message)}
                    </td>
                </tr>
            `;
        }


        throw error;
    }
}


/* ---------------------------------------------------------
   MOVIE DROPDOWN
   --------------------------------------------------------- */

function populateMovieOptions() {

    const select =
        $("showMovie");


    if (!select) {
        return;
    }


    const current =
        select.value;


    select.innerHTML =
        `
            <option value="">
                Select Movie
            </option>
        `;


    movies
        .filter(
            movie =>
                Number(movie.active) === 1
        )
        .forEach(movie => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                movie.id;


            option.textContent =
                movie.name;


            select.appendChild(
                option
            );
        });


    if (current) {

        select.value =
            current;
    }
}


/* ---------------------------------------------------------
   RENDER SHOWS
   --------------------------------------------------------- */

function renderShows() {

    if ($("showCount")) {

        $("showCount")
            .textContent =
            `${shows.length} schedule(s)`;
    }


    if (!$("showsBody")) {
        return;
    }


    $("showsBody").innerHTML =
        shows.length

            ? shows
                .map(show => `

                    <tr>

                        <td>
                            ${esc(show.id)}
                        </td>

                        <td>
                            ${esc(
                                show.movie_name || "-"
                            )}
                        </td>

                        <td>
                            ${esc(
                                show.theatre_name || "-"
                            )}
                            ${
                                show.theatre_location
                                    ? `<br>
                                       <span class="small">
                                           ${esc(show.theatre_location)}
                                       </span>`
                                    : ""
                            }
                        </td>

                        <td>
                            ${esc(
                                formatDate(
                                    show.show_date
                                )
                            )}
                        </td>

                        <td>
                            ${esc(
                                to12(
                                    show.show_time
                                )
                            )}
                        </td>

                        <td>
                            ${esc(
                                show.language || "-"
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                show.active
                            )}
                        </td>

                        <td>

                            <div class="actions">

                                <button
                                    class="secondary"
                                    type="button"
                                    onclick="editShow(${show.id})"
                                >
                                    Edit
                                </button>


                                <button
                                    class="${
                                        Number(show.active) === 1
                                            ? "danger"
                                            : "success"
                                    }"
                                    type="button"
                                    onclick="toggleShow(${show.id})"
                                >
                                    ${
                                        Number(show.active) === 1
                                            ? "Deactivate"
                                            : "Activate"
                                    }
                                </button>


                                <button
                                    class="danger"
                                    type="button"
                                    onclick="deleteShow(${show.id})"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>

                `)
                .join("")

            : `
                <tr>
                    <td
                        colspan="8"
                        class="empty"
                    >
                        No show schedules found.
                    </td>
                </tr>
            `;
}


/* ---------------------------------------------------------
   RESET SHOW FORM
   --------------------------------------------------------- */

function resetShowForm() {

    if ($("showForm")) {
        $("showForm").reset();
    }


    if ($("showId")) {
        $("showId").value = "";
    }


    if ($("showFormTitle")) {

        $("showFormTitle")
            .textContent =
            "Add Show Schedule";
    }
}


/* ---------------------------------------------------------
   EDIT SHOW
   --------------------------------------------------------- */

function editShow(id) {

    const show =
        shows.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    if (!show) {

        showNotice(
            "Show information not found.",
            false
        );

        return;
    }


    if ($("showId")) {
        $("showId").value =
            show.id;
    }


    if ($("showMovie")) {
        $("showMovie").value =
            show.movie_id;
    }


    if ($("showTheatre")) {
        $("showTheatre").value =
            show.theatre_id;
    }


    if ($("showDate")) {
        $("showDate").value =
            show.show_date || "";
    }


    if ($("showTime")) {
        $("showTime").value =
            normalizeTime(
                show.show_time
            );
    }


    if ($("showLanguage")) {
        $("showLanguage").value =
            show.language || "";
    }


    if ($("showFormTitle")) {

        $("showFormTitle")
            .textContent =
            "Edit Show Schedule";
    }


    openPanel(
        "showsPanel"
    );
}


/* ---------------------------------------------------------
   TOGGLE SHOW
   --------------------------------------------------------- */

async function toggleShow(id) {

    try {

        await api(
            `/api/admin/shows/${id}/toggle`,
            {
                method: "POST"
            }
        );


        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Show schedule status updated."
        );


    } catch (error) {

        console.error(
            "Toggle show error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* ---------------------------------------------------------
   DELETE SHOW
   --------------------------------------------------------- */

async function deleteShow(id) {

    const show =
        shows.find(
            item =>
                Number(item.id) ===
                Number(id)
        );


    let description =
        "this show";


    if (show) {

        description =
            `${show.movie_name || "Movie"} - ` +
            `${show.theatre_name || "Theatre"} - ` +
            `${formatDate(show.show_date)} ` +
            `${to12(show.show_time)}`;
    }


    const confirmed =
        confirm(
            `Delete this show schedule?\n\n` +
            `${description}\n\n` +
            `Booked shows are protected by the server.`
        );


    if (!confirmed) {
        return;
    }


    try {

        await api(
            `/api/admin/shows/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadShows();
        await loadDashboardStats();


        showNotice(
            "Show schedule deleted successfully."
        );


    } catch (error) {

        console.error(
            "Delete show error:",
            error
        );


        showNotice(
            error.message,
            false
        );
    }
}


/* =========================================================
   BOOKING MANAGEMENT
   ========================================================= */


/* ---------------------------------------------------------
   LOAD BOOKINGS
   --------------------------------------------------------- */

async function loadAdminBookings() {

    try {

        const data =
            await api(
                "/api/admin/bookings"
            );


        adminBookings =
            data.bookings || [];


        renderAdminBookings();

        renderRecentBookings();


    } catch (error) {

        console.error(
            "Booking loading error:",
            error
        );


        if ($("adminBookingTableBody")) {

            $("adminBookingTableBody")
                .innerHTML = `
                    <tr>
                        <td
                            colspan="12"
                            class="empty"
                        >
                            ${esc(error.message)}
                        </td>
                    </tr>
                `;
        }


        if ($("recentBookingsBody")) {

            $("recentBookingsBody")
                .innerHTML = `
                    <tr>
                        <td
                            colspan="7"
                            class="empty"
                        >
                            Unable to load recent bookings.
                        </td>
                    </tr>
                `;
        }


        throw error;
    }
}


/* ---------------------------------------------------------
   RENDER BOOKINGS
   --------------------------------------------------------- */

function renderAdminBookings(
    bookings = adminBookings
) {

    const body =
        $("adminBookingTableBody");


    if (!body) {
        return;
    }


    body.innerHTML =
        bookings.length

            ? bookings
                .map(booking => `

                    <tr>

                        <td>
                            ${esc(
                                booking.booking_id
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.customer
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.movie
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.theatre_name ||
                                booking.theatre ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${esc(
                                formatDate(
                                    booking.show_date
                                )
                            )}
                        </td>

                        <td>
                            ${esc(
                                to12(
                                    booking.show_time
                                )
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.language ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${Number(
                                booking.tickets || 0
                            )}
                        </td>

                        <td>
                            ${esc(
                                seatsText(
                                    booking.seats
                                )
                            )}
                        </td>

                        <td>
                            ₹${Number(
                                booking.amount || 0
                            ).toLocaleString(
                                "en-IN"
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.payment_method ||
                                "-"
                            )}
                        </td>

                        <td class="status-cell">
                            ${bookingStatusBadge(
                                booking.status
                            )}
                        </td>

                    </tr>

                `)
                .join("")

            : `
                <tr>
                    <td
                        colspan="12"
                        class="empty"
                    >
                        No bookings found.
                    </td>
                </tr>
            `;
}


/* ---------------------------------------------------------
   RECENT BOOKINGS
   --------------------------------------------------------- */

function renderRecentBookings() {

    const body =
        $("recentBookingsBody");


    if (!body) {
        return;
    }


    const recent =
        adminBookings.slice(
            0,
            5
        );


    body.innerHTML =
        recent.length

            ? recent
                .map(booking => `

                    <tr>

                        <td>
                            ${esc(
                                booking.booking_id
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.customer
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.movie
                            )}
                        </td>

                        <td>
                            ${esc(
                                booking.theatre_name ||
                                booking.theatre ||
                                "-"
                            )}
                        </td>

                        <td>
                            ${esc(
                                seatsText(
                                    booking.seats
                                )
                            )}
                        </td>

                        <td>
                            ₹${Number(
                                booking.amount || 0
                            ).toLocaleString(
                                "en-IN"
                            )}
                        </td>

                        <td class="status-cell">
                            ${bookingStatusBadge(
                                booking.status
                            )}
                        </td>

                    </tr>

                `)
                .join("")

            : `
                <tr>
                    <td
                        colspan="7"
                        class="empty"
                    >
                        No recent bookings.
                    </td>
                </tr>
            `;
}


/* ---------------------------------------------------------
   FILTER BOOKINGS
   --------------------------------------------------------- */

function filterAdminBookings() {

    const search =
        (
            $("bookingSearch")
                ?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    const status =
        $("bookingStatusFilter")
            ?.value ||
        "";


    const filtered =
        adminBookings.filter(
            booking => {

                const text = [

                    booking.booking_id,

                    booking.customer,

                    booking.movie,

                    booking.theatre_name,

                    booking.theatre_location,

                    booking.payment_method

                ]
                    .join(" ")
                    .toLowerCase();


                return (
                    (
                        !search ||
                        text.includes(search)
                    )
                    &&
                    (
                        !status ||
                        booking.status === status
                    )
                );
            }
        );


    renderAdminBookings(
        filtered
    );
}


/* =========================================================
   REVENUE MANAGEMENT
   ========================================================= */

async function loadRevenueDetails() {

    try {

        const data =
            await api(
                "/api/admin/revenue"
            );


        if ($("revenueTotal")) {

            $("revenueTotal")
                .textContent =
                "₹" +
                Number(
                    data.total_revenue || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("revenueTickets")) {

            $("revenueTickets")
                .textContent =
                Number(
                    data.tickets_sold || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("revenueConfirmed")) {

            $("revenueConfirmed")
                .textContent =
                Number(
                    data.confirmed_bookings || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("revenuePartial")) {

            $("revenuePartial")
                .textContent =
                Number(
                    data.partial_bookings || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        if ($("revenueCancelled")) {

            $("revenueCancelled")
                .textContent =
                Number(
                    data.cancelled_bookings || 0
                ).toLocaleString(
                    "en-IN"
                );
        }


        renderPaymentBreakdown(
            data.payment_methods || []
        );


    } catch (error) {

        console.error(
            "Revenue loading error:",
            error
        );


        if ($("paymentBreakdown")) {

            $("paymentBreakdown")
                .textContent =
                error.message;
        }


        throw error;
    }
}


/* ---------------------------------------------------------
   PAYMENT BREAKDOWN
   --------------------------------------------------------- */

function renderPaymentBreakdown(
    methods
) {

    const container =
        $("paymentBreakdown");


    if (!container) {
        return;
    }


    if (
        !Array.isArray(methods) ||
        !methods.length
    ) {

        container.innerHTML =
            `
                <p class="small">
                    No payment data available.
                </p>
            `;

        return;
    }


    container.innerHTML =
        methods
            .map(method => `

                <div class="payment-row">

                    <div>

                        <strong>
                            ${esc(
                                method.payment_method ||
                                "Unknown"
                            )}
                        </strong>

                        <small>
                            ${Number(
                                method.booking_count || 0
                            ).toLocaleString(
                                "en-IN"
                            )}
                            booking(s)
                        </small>

                    </div>

                    <strong>
                        ₹${Number(
                            method.revenue || 0
                        ).toLocaleString(
                            "en-IN"
                        )}
                    </strong>

                </div>

            `)
            .join("");
}


/* =========================================================
   FORM RESET FUNCTIONS
   ========================================================= */

function resetAllForms() {

    resetMovieForm();
    resetTheatreForm();
    resetShowForm();
}


/* =========================================================
   MOVIE FORM
   ========================================================= */

function setupMovieForm() {

    const form =
        $("movieForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const formData =
                    new FormData();


                const name =
                    $("movieName")
                        ?.value
                        .trim() ||
                    "";


                const genre =
                    $("movieGenre")
                        ?.value
                        .trim() ||
                    "";


                const price =
                    $("moviePrice")
                        ?.value ||
                    "";


                if (!name) {

                    showNotice(
                        "Please enter movie name.",
                        false
                    );

                    return;
                }


                if (
                    price === "" ||
                    Number(price) <= 0
                ) {

                    showNotice(
                        "Please enter a valid ticket price.",
                        false
                    );

                    return;
                }


                if (!genre) {

                    showNotice(
                        "Please enter movie genre.",
                        false
                    );

                    return;
                }


                formData.append(
                    "name",
                    name
                );


                formData.append(
                    "genre",
                    genre
                );


                formData.append(
                    "price",
                    price
                );


                const posterInput =
                    $("moviePoster");


                if (
                    posterInput &&
                    posterInput.files &&
                    posterInput.files.length
                ) {

                    formData.append(
                        "poster",
                        posterInput.files[0]
                    );
                }


                const id =
                    $("movieId")
                        ?.value ||
                    "";


                await api(
                    id
                        ? `/api/admin/movies/${id}`
                        : "/api/admin/movies",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",

                        body:
                            formData
                    }
                );


                resetMovieForm();


                await loadMovies();

                await loadDashboardStats();


                showNotice(
                    id
                        ? "Movie updated successfully."
                        : "Movie added successfully."
                );


            } catch (error) {

                console.error(
                    "Movie form error:",
                    error
                );


                showNotice(
                    error.message,
                    false
                );
            }

        }
    );
}


/* =========================================================
   THEATRE FORM
   ========================================================= */

function setupTheatreForm() {

    const form =
        $("theatreForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const name =
                    $("theatreName")
                        ?.value
                        .trim() ||
                    "";


                const location =
                    $("theatreLocation")
                        ?.value
                        .trim() ||
                    "";


                if (!name) {

                    showNotice(
                        "Please enter theatre name.",
                        false
                    );

                    return;
                }


                if (!location) {

                    showNotice(
                        "Please enter theatre location.",
                        false
                    );

                    return;
                }


                const id =
                    $("theatreId")
                        ?.value ||
                    "";


                await api(
                    id
                        ? `/api/admin/theatres/${id}`
                        : "/api/admin/theatres",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({
                                name:
                                    name,

                                location:
                                    location
                            })
                    }
                );


                resetTheatreForm();


                await loadTheatres();

                await loadDashboardStats();


                showNotice(
                    id
                        ? "Theatre updated successfully."
                        : "Theatre added successfully."
                );


            } catch (error) {

                console.error(
                    "Theatre form error:",
                    error
                );


                showNotice(
                    error.message,
                    false
                );
            }

        }
    );
}


/* =========================================================
   SHOW FORM
   ========================================================= */

function setupShowForm() {

    const form =
        $("showForm");


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const movieId =
                    $("showMovie")
                        ?.value ||
                    "";


                const theatreId =
                    $("showTheatre")
                        ?.value ||
                    "";


                const date =
                    $("showDate")
                        ?.value ||
                    "";


                const time =
                    $("showTime")
                        ?.value ||
                    "";


                const language =
                    $("showLanguage")
                        ?.value
                        .trim() ||
                    "";


                if (!movieId) {

                    showNotice(
                        "Please select a movie.",
                        false
                    );

                    return;
                }


                if (!theatreId) {

                    showNotice(
                        "Please select a theatre.",
                        false
                    );

                    return;
                }


                if (!date) {

                    showNotice(
                        "Please select a show date.",
                        false
                    );

                    return;
                }


                if (!time) {

                    showNotice(
                        "Please select a show time.",
                        false
                    );

                    return;
                }


                if (!language) {

                    showNotice(
                        "Please enter language.",
                        false
                    );

                    return;
                }


                const id =
                    $("showId")
                        ?.value ||
                    "";


                const body = {

                    movie_id:
                        Number(movieId),

                    theatre_id:
                        Number(theatreId),

                    show_date:
                        date,

                    show_time:
                        normalizeTime(
                            time
                        ),

                    language:
                        language
                };


                await api(
                    id
                        ? `/api/admin/shows/${id}`
                        : "/api/admin/shows",
                    {
                        method:
                            id
                                ? "PUT"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                body
                            )
                    }
                );


                resetShowForm();


                await loadShows();

                await loadDashboardStats();


                showNotice(
                    id
                        ? "Show schedule updated successfully."
                        : "Show schedule added successfully."
                );


            } catch (error) {

                console.error(
                    "Show form error:",
                    error
                );


                showNotice(
                    error.message,
                    false
                );
            }

        }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutAdmin() {

    try {

        await fetch(
            "/admin/logout",
            {
                method: "POST",
                credentials: "same-origin"
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        window.location.href =
            "/admin/login";
    }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        /* -------------------------------------------------
           SIDEBAR / TAB NAVIGATION
           ------------------------------------------------- */

        document
            .querySelectorAll(".tab")
            .forEach(tab => {

                tab.addEventListener(
                    "click",
                    () => {

                        openPanel(
                            tab.dataset.panel
                        );

                    }
                );

            });


        /* -------------------------------------------------
           FORM SETUP
           ------------------------------------------------- */

        setupMovieForm();
        setupTheatreForm();
        setupShowForm();


        /* -------------------------------------------------
           CANCEL BUTTONS
           ------------------------------------------------- */

        const movieCancel =
            $("movieCancel");

        if (movieCancel) {

            movieCancel.onclick =
                resetMovieForm;
        }


        const theatreCancel =
            $("theatreCancel");

        if (theatreCancel) {

            theatreCancel.onclick =
                resetTheatreForm;
        }


        const showCancel =
            $("showCancel");

        if (showCancel) {

            showCancel.onclick =
                resetShowForm;
        }


        /* -------------------------------------------------
           BOOKING SEARCH
           ------------------------------------------------- */

        const bookingSearch =
            $("bookingSearch");


        if (bookingSearch) {

            bookingSearch.addEventListener(
                "input",
                filterAdminBookings
            );
        }


        /* -------------------------------------------------
           BOOKING STATUS FILTER
           ------------------------------------------------- */

        const bookingStatusFilter =
            $("bookingStatusFilter");


        if (bookingStatusFilter) {

            bookingStatusFilter.addEventListener(
                "change",
                filterAdminBookings
            );
        }


        /* -------------------------------------------------
           LOAD EVERYTHING
           ------------------------------------------------- */

        try {

            await loadDashboardStats();

            await loadMovies();

            await loadTheatres();

            await loadShows();

            await loadAdminBookings();

            await loadRevenueDetails();


        } catch (error) {

            console.error(
                "Admin initialization error:",
                error
            );


            if (
                error.message !==
                "Admin session expired."
            ) {

                showNotice(
                    error.message,
                    false
                );
            }
        }

    }
);
