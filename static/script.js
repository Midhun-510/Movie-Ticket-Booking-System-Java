/* =========================================================
   MOVIEBOOK - COMPLETE SCRIPT
   ========================================================= */


/* =========================================================
   GLOBAL VARIABLES
   ========================================================= */

let movies = [];

let selectedMovie = null;

let shows = [];

let selectedShow = null;

let bookedSeats = [];

let selectedSeats = [];

let currentBooking = null;


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

const movieContainer =
    document.getElementById("movieContainer");

const movieSelect =
    document.getElementById("movieSelect");

const customerName =
    document.getElementById("customerName");

const showDate =
    document.getElementById("showDate");

const showTheatre =
    document.getElementById("showTheatre");

const showLanguage =
    document.getElementById("showLanguage");

const showTime =
    document.getElementById("showTime");

const ticketCount =
    document.getElementById("ticketCount");

const seatContainer =
    document.getElementById("seatContainer");

const selectedSeatsText =
    document.getElementById("selectedSeatsText");

const ticketPrice =
    document.getElementById("ticketPrice");

const summaryTickets =
    document.getElementById("summaryTickets");

const totalAmount =
    document.getElementById("totalAmount");

const bookButton =
    document.getElementById("bookButton");

const bookingMessage =
    document.getElementById("bookingMessage");


/* Live summary */

const summaryMovie =
    document.getElementById("summaryMovie");

const summaryTheatre =
    document.getElementById("summaryTheatre");

const summaryDate =
    document.getElementById("summaryDate");

const summaryTime =
    document.getElementById("summaryTime");

const summaryLanguage =
    document.getElementById("summaryLanguage");

const summarySeats =
    document.getElementById("summarySeats");

const summaryPoster =
    document.getElementById("summaryPoster");


/* Confirmation */

const confirmation =
    document.getElementById("confirmation");

const confirmationBookingId =
    document.getElementById("confirmationBookingId");

const confirmationCustomer =
    document.getElementById("confirmationCustomer");

const confirmationMovie =
    document.getElementById("confirmationMovie");

const confirmationTheatre =
    document.getElementById("confirmationTheatre");

const confirmationDate =
    document.getElementById("confirmationDate");

const confirmationTime =
    document.getElementById("confirmationTime");

const confirmationLanguage =
    document.getElementById("confirmationLanguage");

const confirmationSeats =
    document.getElementById("confirmationSeats");

const confirmationTickets =
    document.getElementById("confirmationTickets");

const confirmationAmount =
    document.getElementById("confirmationAmount");

const confirmationPayment =
    document.getElementById("confirmationPayment");

const confirmationPoster =
    document.getElementById("confirmationPoster");

const confirmationGenre =
    document.getElementById("confirmationGenre");


/* History */

const bookingHistoryBody =
    document.getElementById("bookingHistoryBody");


/* Cancellation */

const bookingSearchId =
    document.getElementById("bookingSearchId");

const searchBookingButton =
    document.getElementById("searchBookingButton");

const bookingDetails =
    document.getElementById("bookingDetails");

const cancelBookingId =
    document.getElementById("cancelBookingId");

const cancelCustomer =
    document.getElementById("cancelCustomer");

const cancelMovie =
    document.getElementById("cancelMovie");

const cancelTheatre =
    document.getElementById("cancelTheatre");

const cancelDate =
    document.getElementById("cancelDate");

const cancelTime =
    document.getElementById("cancelTime");

const cancelLanguage =
    document.getElementById("cancelLanguage");

const cancelAmount =
    document.getElementById("cancelAmount");

const cancelSeatContainer =
    document.getElementById("cancelSeatContainer");

const cancelSeatsButton =
    document.getElementById("cancelSeatsButton");

const cancelMessage =
    document.getElementById("cancelMessage");


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializePage();

    }
);


async function initializePage() {

    try {

        await loadMovies();

        await loadBookingHistory();

        resetShowDropdowns();

        updateLiveSummary();

        updatePriceSummary();

    } catch (error) {

        console.error(
            "Initialization error:",
            error
        );

    }

}


/* =========================================================
   LOAD MOVIES
   ========================================================= */

async function loadMovies() {

    try {

        const response =
            await fetch("/api/movies");

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to load movies."
            );

        }

        movies =
            Array.isArray(data)
                ? data
                : data.movies || [];


        renderMovies();

        populateMovieSelect();

    } catch (error) {

        console.error(
            "Movie loading error:",
            error
        );

        movieContainer.innerHTML = `
            <p class="loading-text">
                Unable to load movies.
            </p>
        `;

    }

}


/* =========================================================
   RENDER MOVIE CARDS
   ========================================================= */

function renderMovies() {

    movieContainer.innerHTML = "";


    if (!movies.length) {

        movieContainer.innerHTML = `
            <p class="loading-text">
                No movies are currently available.
            </p>
        `;

        return;
    }


    movies.forEach(movie => {

        const card =
            document.createElement("div");

        card.className =
            "movie-card";


        let posterHTML = `
            <div class="movie-poster-placeholder">
                🎬
            </div>
        `;


        if (movie.poster) {

            posterHTML = `
                <img
                    src="${escapeAttribute(movie.poster)}"
                    alt="${escapeAttribute(movie.name)} poster"
                    onerror="this.style.display='none';"
                >
            `;

        }


        card.innerHTML = `

            <div class="movie-poster">

                ${posterHTML}

            </div>


            <div class="movie-info">

                <h3>
                    ${escapeHtml(movie.name || "Movie")}
                </h3>


                <p>
                    ${escapeHtml(movie.genre || "Movie")}
                </p>


                <div class="movie-price">
                    ₹${Number(movie.price || 0)}
                </div>

                <button type="button" class="card-book-btn">
                    Book Tickets 🎟
                </button>

            </div>

        `;


        card.addEventListener(
            "click",
            () => {

                movieSelect.value =
                    String(movie.id);

                handleMovieChange();

                showView("booking");

            }
        );


        movieContainer.appendChild(card);

    });

}


/* =========================================================
   POPULATE MOVIE SELECT
   ========================================================= */

function populateMovieSelect() {

    movieSelect.innerHTML = `

        <option value="">
            -- Select Movie --
        </option>

    `;


    movies.forEach(movie => {

        if (
            movie.active === 0 ||
            movie.active === false
        ) {

            return;

        }


        const option =
            document.createElement("option");


        option.value =
            movie.id;


        option.textContent =
            movie.name;


        movieSelect.appendChild(option);

    });

}


/* =========================================================
   MOVIE CHANGE
   ========================================================= */

movieSelect.addEventListener(
    "change",
    handleMovieChange
);


async function handleMovieChange() {

    const movieId =
        movieSelect.value;


    selectedMovie =
        movies.find(
            movie =>
                String(movie.id) ===
                String(movieId)
        ) || null;


    selectedShow =
        null;

    shows = [];

    bookedSeats = [];

    selectedSeats = [];


    resetShowDropdowns();

    resetSeats();

    updateLiveSummary();

    updatePriceSummary();


    if (!selectedMovie) {

        return;

    }


    /* Update live poster */

    updateLivePoster();


    try {

        await loadShows(
            selectedMovie.id
        );

    } catch (error) {

        console.error(
            "Show loading error:",
            error
        );

    }

}


/* =========================================================
   LOAD SHOWS
   ========================================================= */

async function loadShows(movieId) {

    const response =
        await fetch(
            `/api/shows?movie_id=${encodeURIComponent(movieId)}`
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Unable to load shows."
        );

    }


    shows =
        Array.isArray(data)
            ? data
            : data.shows || [];


    populateDates();

}


/* =========================================================
   DATE DROPDOWN
   ========================================================= */

function populateDates() {

    showDate.innerHTML = `

        <option value="">
            Select Date
        </option>

    `;


    const dates =
        [
            ...new Set(
                shows
                    .filter(show => isShowActive(show))
                    .map(show => show.show_date)
                    .filter(Boolean)
            )
        ];


    dates.sort();


    dates.forEach(date => {

        const option =
            document.createElement("option");


        option.value =
            date;


        option.textContent =
            formatDate(date);


        showDate.appendChild(option);

    });


    showDate.disabled =
        dates.length === 0;


    showTheatre.disabled =
        true;

    showLanguage.disabled =
        true;

    showTime.disabled =
        true;

}


/* =========================================================
   DATE CHANGE
   ========================================================= */

showDate.addEventListener(
    "change",
    handleDateChange
);


function handleDateChange() {

    selectedShow =
        null;

    selectedSeats = [];

    bookedSeats = [];


    resetSeats();

    showTheatre.innerHTML = `

        <option value="">
            Select Theatre
        </option>

    `;

    showLanguage.innerHTML = `

        <option value="">
            Select Language
        </option>

    `;

    showTime.innerHTML = `

        <option value="">
            Select Time
        </option>

    `;


    showLanguage.disabled =
        true;

    showTime.disabled =
        true;


    const date =
        showDate.value;


    if (!date) {

        showTheatre.disabled =
            true;

        updateLiveSummary();

        return;

    }


    const filteredShows =
        shows.filter(
            show =>
                isShowActive(show) &&
                show.show_date === date
        );


    populateTheatres(
        filteredShows
    );


    updateLiveSummary();

}


/* =========================================================
   THEATRE DROPDOWN
   ========================================================= */

function populateTheatres(
    filteredShows
) {

    showTheatre.innerHTML = `

        <option value="">
            Select Theatre
        </option>

    `;


    const theatreMap =
        new Map();


    filteredShows.forEach(show => {

        const theatreId =
            show.theatre_id;


        if (
            theatreId === null ||
            theatreId === undefined
        ) {

            return;

        }


        if (!theatreMap.has(
            String(theatreId)
        )) {

            theatreMap.set(
                String(theatreId),
                show
            );

        }

    });


    theatreMap.forEach(show => {

        const option =
            document.createElement("option");


        option.value =
            show.theatre_id;


        option.textContent =
            show.theatre_name ||
            "Theatre";


        showTheatre.appendChild(option);

    });


    showTheatre.disabled =
        theatreMap.size === 0;

}


/* =========================================================
   THEATRE CHANGE
   ========================================================= */

showTheatre.addEventListener(
    "change",
    handleTheatreChange
);


function handleTheatreChange() {

    selectedShow =
        null;

    selectedSeats = [];

    bookedSeats = [];


    resetSeats();


    showLanguage.innerHTML = `

        <option value="">
            Select Language
        </option>

    `;


    showTime.innerHTML = `

        <option value="">
            Select Time
        </option>

    `;


    showTime.disabled =
        true;


    const date =
        showDate.value;

    const theatreId =
        showTheatre.value;


    if (
        !date ||
        !theatreId
    ) {

        showLanguage.disabled =
            true;

        updateLiveSummary();

        return;

    }


    const filteredShows =
        shows.filter(
            show =>
                isShowActive(show) &&
                show.show_date === date &&
                String(show.theatre_id) ===
                String(theatreId)
        );


    populateLanguages(
        filteredShows
    );


    updateLiveSummary();

}


/* =========================================================
   LANGUAGE DROPDOWN
   ========================================================= */

function populateLanguages(
    filteredShows
) {

    showLanguage.innerHTML = `

        <option value="">
            Select Language
        </option>

    `;


    const languages =
        [
            ...new Set(
                filteredShows
                    .map(
                        show =>
                            show.language
                    )
                    .filter(Boolean)
            )
        ];


    languages.sort();


    languages.forEach(language => {

        const option =
            document.createElement("option");


        option.value =
            language;


        option.textContent =
            language;


        showLanguage.appendChild(
            option
        );

    });


    showLanguage.disabled =
        languages.length === 0;

}


/* =========================================================
   LANGUAGE CHANGE
   ========================================================= */

showLanguage.addEventListener(
    "change",
    handleLanguageChange
);


function handleLanguageChange() {

    selectedShow =
        null;

    selectedSeats = [];

    bookedSeats = [];


    resetSeats();


    showTime.innerHTML = `

        <option value="">
            Select Time
        </option>

    `;


    const date =
        showDate.value;

    const theatreId =
        showTheatre.value;

    const language =
        showLanguage.value;


    if (
        !date ||
        !theatreId ||
        !language
    ) {

        showTime.disabled =
            true;

        updateLiveSummary();

        return;

    }


    const filteredShows =
        shows.filter(
            show =>
                isShowActive(show) &&
                show.show_date === date &&
                String(show.theatre_id) ===
                String(theatreId) &&
                String(show.language) ===
                String(language)
        );


    populateTimes(
        filteredShows
    );


    updateLiveSummary();

}


/* =========================================================
   TIME DROPDOWN
   ========================================================= */

function populateTimes(
    filteredShows
) {

    showTime.innerHTML = `

        <option value="">
            Select Time
        </option>

    `;


    const timeMap =
        new Map();


    filteredShows.forEach(show => {

        const normalizedTime =
            normalizeTime(
                show.show_time
            );


        if (
            normalizedTime &&
            !timeMap.has(normalizedTime)
        ) {

            timeMap.set(
                normalizedTime,
                show
            );

        }

    });


    const times =
        [...timeMap.keys()];


    times.sort(
        compareTimeStrings
    );


    times.forEach(time => {

        const option =
            document.createElement("option");


        option.value =
            time;


        option.textContent =
            formatTime(time);


        showTime.appendChild(
            option
        );

    });


    showTime.disabled =
        times.length === 0;

}


/* =========================================================
   TIME CHANGE
   ========================================================= */

showTime.addEventListener(
    "change",
    handleTimeChange
);


async function handleTimeChange() {

    selectedSeats = [];

    bookedSeats = [];


    resetSeats();


    const date =
        showDate.value;

    const theatreId =
        showTheatre.value;

    const language =
        showLanguage.value;

    const time =
        normalizeTime(
            showTime.value
        );


    if (
        !date ||
        !theatreId ||
        !language ||
        !time
    ) {

        selectedShow =
            null;

        updateLiveSummary();

        return;

    }


    selectedShow =
        shows.find(
            show =>
                isShowActive(show) &&
                show.show_date === date &&
                String(show.theatre_id) ===
                String(theatreId) &&
                String(show.language) ===
                String(language) &&
                normalizeTime(
                    show.show_time
                ) === time
        ) || null;


    if (!selectedShow) {

        showTime.value = "";

        updateLiveSummary();

        return;

    }


    await loadSeats(
        selectedShow.id
    );


    updateLiveSummary();

    updatePriceSummary();

}


/* =========================================================
   LOAD SEATS
   ========================================================= */

async function loadSeats(showId) {

    try {

        const response =
            await fetch(
                `/api/seats?show_id=${encodeURIComponent(showId)}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to load seats."
            );

        }


        bookedSeats =
            Array.isArray(
                data.booked_seats
            )
                ? data.booked_seats.map(
                    Number
                )
                : [];


        renderSeats();

    } catch (error) {

        console.error(
            "Seat loading error:",
            error
        );


        seatContainer.innerHTML = `

            <p class="seat-placeholder">
                Unable to load seats.
            </p>

        `;

    }

}


/* =========================================================
   RENDER SEATS
   ========================================================= */

function renderSeats() {

    seatContainer.innerHTML = "";


    const TOTAL_SEATS =
        20;


    for (
        let seatNumber = 1;
        seatNumber <= TOTAL_SEATS;
        seatNumber++
    ) {

        const seat =
            document.createElement("button");


        seat.type =
            "button";


        seat.className =
            "seat";


        seat.textContent =
            `S${seatNumber}`;


        const isBooked =
            bookedSeats.includes(
                seatNumber
            );


        if (isBooked) {

            seat.classList.add(
                "booked"
            );

            seat.disabled =
                true;

        }


        if (
            selectedSeats.includes(
                seatNumber
            )
        ) {

            seat.classList.add(
                "selected"
            );

        }


        seat.addEventListener(
            "click",
            () =>
                toggleSeat(
                    seatNumber,
                    seat
                )
        );


        seatContainer.appendChild(
            seat
        );

    }


    updateSelectedSeatsText();

}


/* =========================================================
   TOGGLE SEAT
   ========================================================= */

function toggleSeat(
    seatNumber,
    seatElement
) {

    if (
        bookedSeats.includes(
            seatNumber
        )
    ) {

        return;

    }


    const maxTickets =
        Number(
            ticketCount.value
        ) || 1;


    const index =
        selectedSeats.indexOf(
            seatNumber
        );


    if (index !== -1) {

        selectedSeats.splice(
            index,
            1
        );

        seatElement.classList.remove(
            "selected"
        );

    } else {

        if (
            selectedSeats.length >=
            maxTickets
        ) {

            showMessage(
                bookingMessage,
                `You can select only ${maxTickets} seat(s).`,
                "error"
            );

            return;

        }


        selectedSeats.push(
            seatNumber
        );

        selectedSeats.sort(
            (a, b) => a - b
        );


        seatElement.classList.add(
            "selected"
        );

    }


    updateSelectedSeatsText();

    updateLiveSummary();

    updatePriceSummary();

}


/* =========================================================
   TICKET COUNT CHANGE
   ========================================================= */

ticketCount.addEventListener(
    "input",
    handleTicketCountChange
);


ticketCount.addEventListener(
    "change",
    handleTicketCountChange
);


function handleTicketCountChange() {

    let count =
        Number(
            ticketCount.value
        );


    if (
        !Number.isFinite(count) ||
        count < 1
    ) {

        count = 1;

        ticketCount.value =
            1;

    }


    if (count > 20) {

        count = 20;

        ticketCount.value =
            20;

    }


    if (
        selectedSeats.length >
        count
    ) {

        selectedSeats =
            selectedSeats.slice(
                0,
                count
            );

    }


    renderSeats();

    updateSelectedSeatsText();

    updateLiveSummary();

    updatePriceSummary();

}


/* =========================================================
   UPDATE SELECTED SEATS TEXT
   ========================================================= */

function updateSelectedSeatsText() {

    if (!selectedSeatsText) {

        return;

    }


    if (!selectedSeats.length) {

        selectedSeatsText.textContent =
            "Selected Seats: None";

        return;

    }


    selectedSeatsText.textContent =
        `Selected Seats: ${selectedSeats
            .map(seat => `S${seat}`)
            .join(", ")}`;

}


/* =========================================================
   PRICE SUMMARY
   ========================================================= */

function updatePriceSummary() {

    const price =
        selectedMovie
            ? Number(
                selectedMovie.price || 0
            )
            : 0;


    const count =
        Number(
            ticketCount.value
        ) || 0;


    const amount =
        price * count;


    ticketPrice.textContent =
        `₹${price}`;


    summaryTickets.textContent =
        count;


    totalAmount.textContent =
        `₹${amount}`;

}


/* =========================================================
   LIVE SUMMARY
   ========================================================= */

function updateLiveSummary() {

    summaryMovie.textContent =
        selectedMovie
            ? selectedMovie.name
            : "-";


    summaryTheatre.textContent =
        selectedShow?.theatre_name ||
        getSelectedTheatreName() ||
        "Not selected";


    summaryDate.textContent =
        showDate.value
            ? formatDate(
                showDate.value
            )
            : "-";


    summaryTime.textContent =
        showTime.value
            ? formatTime(
                showTime.value
            )
            : "-";


    summaryLanguage.textContent =
        showLanguage.value ||
        "-";


    summarySeats.textContent =
        selectedSeats.length
            ? selectedSeats
                .map(
                    seat =>
                        `S${seat}`
                )
                .join(", ")
            : "None";


    updateLivePoster();

}


/* =========================================================
   LIVE POSTER
   ========================================================= */

function updateLivePoster() {

    if (!summaryPoster) {

        return;

    }


    if (
        !selectedMovie ||
        !selectedMovie.poster
    ) {

        summaryPoster.innerHTML =
            `<span>🎬</span>`;

        return;

    }


    summaryPoster.innerHTML = `

        <img
            src="${escapeAttribute(selectedMovie.poster)}"
            alt="${escapeAttribute(selectedMovie.name || "Movie")} poster"
            onerror="this.parentElement.innerHTML='<span>🎬</span>';"
        >

    `;

}


/* =========================================================
   BOOK TICKET
   ========================================================= */

bookButton.addEventListener(
    "click",
    bookTicket
);


async function bookTicket() {

    clearMessage(
        bookingMessage
    );


    const customer =
        customerName.value.trim();


    const tickets =
        Number(
            ticketCount.value
        );


    const paymentElement =
        document.querySelector(
            'input[name="paymentMethod"]:checked'
        );


    const paymentMethod =
        paymentElement
            ? paymentElement.value
            : "";


    /* Validation */

    if (!customer) {

        showMessage(
            bookingMessage,
            "Please enter customer name.",
            "error"
        );

        customerName.focus();

        return;

    }


    if (!selectedMovie) {

        showMessage(
            bookingMessage,
            "Please select a movie.",
            "error"
        );

        return;

    }


    if (!selectedShow) {

        showMessage(
            bookingMessage,
            "Please select date, theatre, language and show time.",
            "error"
        );

        return;

    }


    if (
        !tickets ||
        tickets < 1
    ) {

        showMessage(
            bookingMessage,
            "Please enter a valid ticket quantity.",
            "error"
        );

        return;

    }


    if (
        selectedSeats.length !==
        tickets
    ) {

        showMessage(
            bookingMessage,
            `Please select exactly ${tickets} seat(s).`,
            "error"
        );

        return;

    }


    if (!paymentMethod) {

        showMessage(
            bookingMessage,
            "Please select a payment method.",
            "error"
        );

        return;

    }


    /* Disable button */

    bookButton.disabled =
        true;

    bookButton.textContent =
        "Processing Booking...";


    try {

        const response =
            await fetch(
                "/api/create-booking",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        customer:
                            customer,

                        show_id:
                            selectedShow.id,

                        tickets:
                            tickets,

                        seats:
                            selectedSeats,

                        payment_method:
                            paymentMethod

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Booking failed."
            );

        }


        currentBooking =
            data;

        rememberBooking(
            data.booking_id
        );

        displayConfirmation(
            data
        );

        await loadBookingHistory();

        showMessage(
            bookingMessage,
            "Booking confirmed successfully!",
            "success"
        );

        showView(
            "confirmation"
        );

        /* Refresh seats */
        await loadSeats(
            selectedShow.id
        );


    } catch (error) {

        console.error(
            "Booking error:",
            error
        );


        showMessage(
            bookingMessage,
            error.message ||
            "Booking failed. Please try again.",
            "error"
        );

    } finally {

        bookButton.disabled =
            false;

        bookButton.textContent =
            "Book Ticket";

    }

}


/* =========================================================
   DISPLAY CONFIRMATION TICKET
   ========================================================= */

function displayConfirmation(
    booking
) {

    confirmationBookingId.textContent =
        booking.booking_id ||
        "-";


    confirmationCustomer.textContent =
        booking.customer ||
        "-";


    confirmationMovie.textContent =
        booking.movie ||
        selectedMovie?.name ||
        "-";


    confirmationTheatre.textContent =
        booking.theatre_name ||
        booking.theatre ||
        selectedShow?.theatre_name ||
        "-";


    confirmationDate.textContent =
        booking.show_date
            ? formatDate(
                booking.show_date
            )
            : "-";


    confirmationTime.textContent =
        booking.show_time
            ? formatTime(
                booking.show_time
            )
            : "-";


    confirmationLanguage.textContent =
        booking.language ||
        selectedShow?.language ||
        "-";


    confirmationSeats.textContent =
        Array.isArray(
            booking.seats
        )
            ? booking.seats
                .map(
                    seat =>
                        `S${seat}`
                )
                .join(", ")
            : booking.seats ||
              selectedSeats
                .map(
                    seat =>
                        `S${seat}`
                )
                .join(", ") ||
              "-";


    confirmationTickets.textContent =
        booking.tickets ??
        selectedSeats.length;


    confirmationAmount.textContent =
        `₹${Number(
            booking.amount || 0
        )}`;


    confirmationPayment.textContent =
        booking.payment_method ||
        "-";


    /* Genre */

    confirmationGenre.textContent =
        selectedMovie?.genre ||
        "Movie Ticket";


    /* Poster */

    setConfirmationPoster(
        booking
    );


    confirmation.style.display =
        "block";

}


/* =========================================================
   SET CONFIRMATION POSTER
   ========================================================= */

function setConfirmationPoster(
    booking
) {

    if (!confirmationPoster) {

        return;

    }


    const poster =
        selectedMovie?.poster ||
        booking.poster ||
        "";


    if (!poster) {

        confirmationPoster.innerHTML =
            "🎬";

        return;

    }


    confirmationPoster.innerHTML = `

        <img
            class="confirmation-poster-image"
            src="${escapeAttribute(poster)}"
            alt="${escapeAttribute(
                booking.movie ||
                selectedMovie?.name ||
                "Movie"
            )} poster"
            onerror="this.parentElement.innerHTML='🎬';"
        >

    `;

}


/* =========================================================
   BOOKING HISTORY
   ========================================================= */

async function loadBookingHistory() {

    try {

        const myIds = getMyBookingIds();

        const url = myIds.length
            ? `/api/bookings?ids=${encodeURIComponent(myIds.join(","))}`
            : "/api/bookings";

        const response =
            await fetch(url);

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                (data.message || data.error) ||
                "Unable to load booking history."
            );

        }

        const bookings =
            Array.isArray(data)
                ? data
                : data.bookings || [];

        renderBookingHistory(
            bookings
        );

    } catch (error) {

        console.error(
            "Booking history error:",
            error
        );

        if (bookingHistoryBody) {

            bookingHistoryBody.innerHTML = `

                <tr>

                    <td
                        colspan="11"
                        class="empty-table"
                    >
                        Unable to load booking history.
                    </td>

                </tr>

            `;

        }

    }

}


/* =========================================================
   RENDER BOOKING HISTORY
   ========================================================= */

function renderBookingHistory(
    bookings
) {

    bookingHistoryBody.innerHTML = "";

    if (!bookings.length) {

        bookingHistoryBody.innerHTML = `

            <tr>

                <td
                    colspan="11"
                    class="empty-table"
                >
                    <p style="margin-bottom: 12px; font-size: 15px;">No bookings found on this device yet.</p>
                    <button type="button" class="book-now-history-btn" onclick="showView('booking')">
                        Book Your First Ticket Now
                    </button>
                </td>

            </tr>

        `;

        return;

    }

    bookings.forEach(
        booking => {

            const row =
                document.createElement(
                    "tr"
                );

            const seats =
                Array.isArray(
                    booking.seats
                )
                    ? booking.seats
                        .map(
                            seat =>
                                `S${seat}`
                        )
                        .join(", ")
                    : booking.seats ||
                      "-";

            row.innerHTML = `

                <td>
                    ${escapeHtml(
                        String(
                            booking.booking_id ??
                            "-"
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.customer ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.movie ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.theatre_name ||
                        booking.theatre ||
                        "-"
                    )}
                </td>

                <td>
                    ${booking.show_date
                        ? escapeHtml(
                            formatDate(
                                booking.show_date
                            )
                        )
                        : "-"
                    }
                </td>

                <td>
                    ${booking.show_time
                        ? escapeHtml(
                            formatTime(
                                booking.show_time
                            )
                        )
                        : "-"
                    }
                </td>

                <td>
                    ${escapeHtml(
                        booking.language ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        seats
                    )}
                </td>

                <td>
                    ₹${Number(
                        booking.amount || 0
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.status ||
                        "CONFIRMED"
                    )}
                </td>

                <td>
                    <button
                        type="button"
                        class="history-action-btn"
                        onclick="openCancelForBooking('${booking.booking_id}')"
                    >
                        Cancel / Manage
                    </button>
                </td>

            `;

            bookingHistoryBody.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   SEARCH BOOKING
   ========================================================= */

searchBookingButton.addEventListener(
    "click",
    searchBooking
);


async function searchBooking() {

    clearMessage(
        cancelMessage
    );


    const id =
        bookingSearchId.value.trim();


    if (!id) {

        showMessage(
            cancelMessage,
            "Please enter a Booking ID.",
            "error"
        );

        return;

    }


    try {

        const response =
            await fetch(
                `/api/booking/${encodeURIComponent(id)}`
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Booking not found."
            );

        }


        displayCancellationDetails(
            data
        );


    } catch (error) {

        bookingDetails.style.display =
            "none";


        showMessage(
            cancelMessage,
            error.message ||
            "Booking not found.",
            "error"
        );

    }

}


/* =========================================================
   DISPLAY CANCELLATION DETAILS
   ========================================================= */

function displayCancellationDetails(
    booking
) {

    bookingDetails.style.display =
        "block";


    cancelBookingId.textContent =
        booking.booking_id ||
        "-";


    cancelCustomer.textContent =
        booking.customer ||
        "-";


    cancelMovie.textContent =
        booking.movie ||
        "-";


    cancelTheatre.textContent =
        booking.theatre_name ||
        booking.theatre ||
        "-";


    cancelDate.textContent =
        booking.show_date
            ? formatDate(
                booking.show_date
            )
            : "-";


    cancelTime.textContent =
        booking.show_time
            ? formatTime(
                booking.show_time
            )
            : "-";


    cancelLanguage.textContent =
        booking.language ||
        "-";


    cancelAmount.textContent =
        `₹${Number(
            booking.amount || 0
        )}`;


    renderCancellationSeats(
        booking
    );

}


/* =========================================================
   RENDER CANCELLATION SEATS
   ========================================================= */

function renderCancellationSeats(
    booking
) {

    cancelSeatContainer.innerHTML =
        "";


    const seats =
        Array.isArray(
            booking.seats
        )
            ? booking.seats
            : parseSeats(
                booking.seats
            );


    if (!seats.length) {

        cancelSeatContainer.innerHTML = `

            <p>
                No active seats found for this booking.
            </p>

        `;

        cancelSeatsButton.disabled =
            true;

        return;

    }


    cancelSeatsButton.disabled =
        false;


    seats.forEach(
        seatNumber => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "cancel-seat";


            button.textContent =
                `S${seatNumber}`;


            button.dataset.seat =
                seatNumber;


            button.addEventListener(
                "click",
                () => {

                    button.classList.toggle(
                        "selected"
                    );

                }
            );


            cancelSeatContainer.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   CANCEL SELECTED SEATS
   ========================================================= */

cancelSeatsButton.addEventListener(
    "click",
    cancelSelectedSeats
);


async function cancelSelectedSeats() {

    clearMessage(
        cancelMessage
    );


    const bookingId =
        bookingSearchId.value.trim();


    const selectedCancelButtons =
        [
            ...document.querySelectorAll(
                ".cancel-seat.selected"
            )
        ];


    const seatsToCancel =
        selectedCancelButtons.map(
            button =>
                Number(
                    button.dataset.seat
                )
        );


    if (!bookingId) {

        showMessage(
            cancelMessage,
            "Please search for a booking first.",
            "error"
        );

        return;

    }


    if (!seatsToCancel.length) {

        showMessage(
            cancelMessage,
            "Please select at least one seat to cancel.",
            "error"
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Are you sure you want to cancel seat(s): ${seatsToCancel
                .map(
                    seat =>
                        `S${seat}`
                )
                .join(", ")}?`
        );


    if (!confirmed) {

        return;

    }


    cancelSeatsButton.disabled =
        true;

    cancelSeatsButton.textContent =
        "Cancelling...";


    try {

        const response =
            await fetch(
                "/api/cancel-seats",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        booking_id:
                            Number(
                                bookingId
                            ),

                        seats:
                            seatsToCancel

                    })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Cancellation failed."
            );

        }


        showMessage(
            cancelMessage,
            data.message ||
            "Selected seats cancelled successfully.",
            "success"
        );


        /* Refresh booking history */

        await loadBookingHistory();


        /* Refresh cancellation details */

        const refreshedResponse =
            await fetch(
                `/api/booking/${encodeURIComponent(bookingId)}`
            );


        const refreshedData =
            await refreshedResponse.json();


        if (
            refreshedResponse.ok
        ) {

            displayCancellationDetails(
                refreshedData
            );

        } else {

            bookingDetails.style.display =
                "none";

        }


        /* Refresh currently selected show */

        if (selectedShow) {

            await loadSeats(
                selectedShow.id
            );

        }


    } catch (error) {

        console.error(
            "Cancellation error:",
            error
        );


        showMessage(
            cancelMessage,
            error.message ||
            "Cancellation failed.",
            "error"
        );

    } finally {

        cancelSeatsButton.disabled =
            false;

        cancelSeatsButton.textContent =
            "Cancel Selected Seats";

    }

}


/* =========================================================
   RESET SHOW DROPDOWNS
   ========================================================= */

function resetShowDropdowns() {

    showDate.innerHTML = `

        <option value="">
            Select Date
        </option>

    `;


    showTheatre.innerHTML = `

        <option value="">
            Select Theatre
        </option>

    `;


    showLanguage.innerHTML = `

        <option value="">
            Select Language
        </option>

    `;


    showTime.innerHTML = `

        <option value="">
            Select Time
        </option>

    `;


    showDate.disabled =
        true;

    showTheatre.disabled =
        true;

    showLanguage.disabled =
        true;

    showTime.disabled =
        true;

}


/* =========================================================
   RESET SEATS
   ========================================================= */

function resetSeats() {

    bookedSeats = [];

    selectedSeats = [];


    seatContainer.innerHTML = `

        <p class="seat-placeholder">
            Select a show first.
        </p>

    `;


    updateSelectedSeatsText();

}


/* =========================================================
   GET SELECTED THEATRE NAME
   ========================================================= */

function getSelectedTheatreName() {

    if (
        !showTheatre ||
        !showTheatre.value
    ) {

        return "";

    }


    const selectedOption =
        showTheatre.options[
            showTheatre.selectedIndex
        ];


    return selectedOption
        ? selectedOption.textContent
        : "";

}


/* =========================================================
   SHOW ACTIVE CHECK
   ========================================================= */

function isShowActive(show) {

    return (
        show.active !== 0 &&
        show.active !== false
    );

}


/* =========================================================
   TIME NORMALIZATION
   ========================================================= */

function normalizeTime(
    time
) {

    if (!time) {

        return "";

    }


    let value =
        String(time).trim();


    /*
       Already HH:MM
    */

    if (
        /^\d{2}:\d{2}$/.test(
            value
        )
    ) {

        return value;

    }


    /*
       HH:MM:SS
    */

    if (
        /^\d{2}:\d{2}:\d{2}$/.test(
            value
        )
    ) {

        return value.substring(
            0,
            5
        );

    }


    /*
       12-hour format:
       07:30 PM
       7:30 PM
    */

    const match =
        value.match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );


    if (!match) {

        return value;

    }


    let hour =
        Number(
            match[1]
        );


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
        String(hour).padStart(
            2,
            "0"
        ) +
        ":" +
        minute
    );

}


/* =========================================================
   FORMAT TIME
   ========================================================= */

function formatTime(
    time
) {

    if (!time) {

        return "-";

    }


    const normalized =
        normalizeTime(
            time
        );


    const match =
        normalized.match(
            /^(\d{2}):(\d{2})$/
        );


    if (!match) {

        return time;

    }


    let hour =
        Number(
            match[1]
        );


    const minute =
        match[2];


    const period =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 ||
        12;


    return `${hour}:${minute} ${period}`;

}


/* =========================================================
   COMPARE TIME
   ========================================================= */

function compareTimeStrings(
    a,
    b
) {

    return normalizeTime(a)
        .localeCompare(
            normalizeTime(b)
        );

}


/* =========================================================
   FORMAT DATE
   ========================================================= */

function formatDate(
    date
) {

    if (!date) {

        return "-";

    }


    const parts =
        String(date).split("-");


    if (
        parts.length !== 3
    ) {

        return date;

    }


    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);


    if (
        !year ||
        !month ||
        !day
    ) {

        return date;

    }


    const dateObject =
        new Date(
            year,
            month - 1,
            day
        );


    return dateObject.toLocaleDateString(
        "en-IN",
        {
            day:
                "2-digit",

            month:
                "short",

            year:
                "numeric"
        }
    );

}


/* =========================================================
   PARSE SEATS
   ========================================================= */

function parseSeats(
    seats
) {

    if (
        Array.isArray(seats)
    ) {

        return seats.map(
            Number
        );

    }


    if (
        typeof seats !==
        "string"
    ) {

        return [];

    }


    try {

        const parsed =
            JSON.parse(
                seats
            );


        if (
            Array.isArray(
                parsed
            )
        ) {

            return parsed.map(
                Number
            );

        }

    } catch (error) {

        /*
           Continue with comma-separated
           parsing.
        */

    }


    return seats
        .split(",")
        .map(
            seat =>
                Number(
                    seat.trim()
                )
        )
        .filter(
            Number.isFinite
        );

}


/* =========================================================
   MESSAGE HELPER
   ========================================================= */

function showMessage(
    element,
    message,
    type
) {

    if (!element) {

        return;

    }


    element.textContent =
        message;


    element.style.color =
        type === "success"
            ? "#57d98b"
            : "#ff7777";

}


function clearMessage(
    element
) {

    if (!element) {

        return;

    }


    element.textContent =
        "";

}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   ATTRIBUTE ESCAPING
   ========================================================= */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}


/* =========================================================
   MY BOOKINGS (Local Storage for Device Privacy)
   ========================================================= */

const MY_BOOKINGS_KEY = "moviebook_my_bookings";

function getMyBookingIds() {
    try {
        const ids = JSON.parse(
            localStorage.getItem(MY_BOOKINGS_KEY) || "[]"
        );
        return Array.isArray(ids) ? ids : [];
    } catch (error) {
        return [];
    }
}

function rememberBooking(bookingId) {
    if (!bookingId) {
        return;
    }
    try {
        const ids = getMyBookingIds().filter(
            id => String(id) !== String(bookingId)
        );
        ids.unshift(bookingId);
        localStorage.setItem(
            MY_BOOKINGS_KEY,
            JSON.stringify(ids.slice(0, 50))
        );
    } catch (error) {
        console.error("Could not save booking ID to localStorage:", error);
    }
}

window.getMyBookingIds = getMyBookingIds;
window.rememberBooking = rememberBooking;


/* =========================================================
   DIRECT CANCEL JUMP FROM BOOKING HISTORY
   ========================================================= */

function openCancelForBooking(bookingId) {
    showView("cancel");
    if (bookingSearchId) {
        bookingSearchId.value = bookingId;
    }
    searchBooking();
}

window.openCancelForBooking = openCancelForBooking;


/* =========================================================
   VIEW NAVIGATION (Every interface opens upon clicking button)
   ========================================================= */

const VIEWS = {
    home: ["home", "features"],
    movies: ["movies"],
    booking: ["booking"],
    confirmation: ["confirmation"],
    history: ["history"],
    cancel: ["cancel"]
};

function showView(name, updateHash = true) {
    if (!VIEWS[name]) {
        name = "home";
    }

    // A confirmation ticket view only shows after a booking has been made
    if (name === "confirmation" && !currentBooking) {
        name = "booking";
    }

    document.querySelectorAll(".view").forEach(section => {
        section.classList.remove("active-view");
    });

    VIEWS[name].forEach(id => {
        const section = document.getElementById(id);
        if (section) {
            section.classList.add("active-view");
        }
    });

    const activeNavKey = name === "confirmation" ? "booking" : (name === "features" ? "home" : name);

    document.querySelectorAll(".nav-links a").forEach(link => {
        const href = link.getAttribute("href") || "";
        link.classList.toggle("active", href === "#" + activeNavKey);
    });

    if (name === "history") {
        loadBookingHistory();
    }

    if (name === "movies") {
        loadMovies();
    }

    if (updateHash && location.hash !== "#" + name) {
        history.pushState(null, "", "#" + name);
    }

    window.scrollTo({ top: 0, behavior: "auto" });
}

window.showView = showView;

window.addEventListener("hashchange", () => {
    const target = location.hash.slice(1);
    if (target) {
        showView(target, false);
    }
});

// Initialize active view on page load
document.addEventListener("DOMContentLoaded", () => {
    const initialView = location.hash.slice(1) || "home";
    showView(initialView, false);
});


/* =========================================================
   END OF SCRIPT
   ========================================================= */