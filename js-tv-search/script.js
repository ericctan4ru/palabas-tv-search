/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array

// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form
  function renderResults(items) {
    results.innerHTML = "";

    items.forEach((item) => {
      const show = item.show;

      const card = el("button", "card");
      card.type = "button";
      card.dataset.id = show.id;

      const rating = show.rating.average;

      card.append(
        createPoster(show),
        el("span", "title", show.name),
        el("span", "year", yearRange(show)),
        el("span", "genres", show.genres.join(", ")),
        el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
      );

      results.appendChild(card);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const query = input.value.trim();

    if (query === "") return;

    searchShows(query);
  });

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

async function getJSON(url) {
  let response;

  try {
    response = await fetch(url);
  } catch (networkError) {
    throw new Error("Can't reach TVmaze. Check your internet, or use sample mode.");
  }

  if (response.status === 429) {
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }

  if (!response.ok) {
    throw new Error(`Request failed (HTTP ${response.status}).`);
  }

  return response.json();
}
async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");
  results.innerHTML = "";

  try {
    const data = await getJSON(searchURL(query));

    if (data.length === 0) {
      setStatus(`No shows found for "${query}".`, "error");
      return;
    }

    renderResults(data);

    setStatus(
      `${data.length} ${data.length === 1 ? "show" : "shows"} found for "${query}"`
    );

  } catch (error) {
    setStatus(error.message, "error");
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

  results.addEventListener("click", (event) => {
    const card = event.target.closest(".card");

    if (card) {
      showDetails(card.dataset.id);
    }
  });



// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)
  async function showDetails(id) {
    detailsBody.replaceChildren(
      el("p", "status loading", "Loading details…")
    );

    dialog.showModal();

    try {
      const start = performance.now();

      const [show, cast, seasons] = await Promise.all([
        getJSON(showURL(id)),
        getJSON(castURL(id)),
        getJSON(seasonsURL(id)),
      ]);

      console.log(
        `3 requests in ${Math.round(performance.now() - start)} ms`
      );

      renderDetails(show, cast, seasons);

    } catch (error) {
      detailsBody.replaceChildren(
        el("p", "status error", error.message)
      );
    }
  }
  function renderDetails(show, cast, seasons) {
    const where = show.network
      ? show.network.name
      : show.webChannel
      ? show.webChannel.name
      : "";

    const minutes = show.runtime || show.averageRuntime;

    const seasonText = seasons.length === 1
      ? "1 season"
      : `${seasons.length} seasons`;

    const info = el("div", "info");

    info.append(
      el("h2", "", show.name),

      el("p", "meta", [
        yearRange(show),
        where,
        seasonText,
        minutes ? `${minutes} min` : ""
      ].filter(Boolean).join(" · ")),

      el("p", "meta", show.genres.join(", ")),

      el("p", "score",
        show.rating.average
          ? `★ ${show.rating.average} / 10`
          : "Not rated yet"
      ),

      el("p", "plot", stripTags(show.summary))
    );
    if (cast.length > 0) {
      const list = el("ul", "cast");

      cast.slice(0, 6).forEach((member) => {
        const li = el("li", "", member.person.name + " ");

        li.append(
          el("span", "", "as " + member.character.name)
        );

        list.append(li);
      });

      info.append(el("h3", "", "Cast"), list);
    }

    const links = el("p", "links");
    const tvmaze = el("a", "", "View on TVmaze ↗");

    tvmaze.href = show.url;
    tvmaze.target = "_blank";
    tvmaze.rel = "noopener noreferrer";

    
    links.append(tvmaze);
    info.append(links);

    // Add the favorites button to the show details.
    addFavoriteButton(show, info);

    detailsBody.replaceChildren(
      createPoster(show, "original"),
      info
    );
  }

  // STEP 6 — My Favorites Feature

  const favoritesList = document.getElementById("favoritesList");
  const FAVORITES_KEY = "palabasFavorites";

  // Load the saved favorites when the page opens.
  let favorites = [];

  try {
    const saved = JSON.parse(
      localStorage.getItem(FAVORITES_KEY) || "[]"
    );

    if (Array.isArray(saved)) {
      favorites = saved;
    }
  } catch (error) {
    favorites = [];
  }

  // Saves the favorites in the browser.
  function saveFavorites() {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  }

  // Checks if the show is already in favorites.
  function isFavorite(id) {
    return favorites.some(
      (item) => String(item.id) === String(id)
    );
  }

  // Adds or removes a show from favorites.
  function toggleFavorite(show) {
    if (isFavorite(show.id)) {
      favorites = favorites.filter(
        (item) => String(item.id) !== String(show.id)
      );
    } else {
      favorites.push({
        id: show.id,
        name: show.name
      });
    }

    saveFavorites();
    renderFavorites();
  }

  // Displays the saved shows in My favorites.
  function renderFavorites() {
    favoritesList.replaceChildren();

    if (favorites.length === 0) {
      favoritesList.append(
        el("li", "empty-favorites", "No favorites yet.")
      );
      return;
    }

    favorites.forEach((item) => {
      const li = el("li", "");

      const button = el("button", "", `★ ${item.name}`);
      button.type = "button";

      button.addEventListener("click", () => {
        showDetails(item.id);
      });

      li.append(button);
      favoritesList.append(li);
    });
  }

  // Adds a favorite button inside the details pop-up.
  function addFavoriteButton(show, info) {
    const button = el(
      "button",
      "favorite-button",
      isFavorite(show.id)
        ? "★ Remove from favorites"
        : "☆ Add to favorites"
    );

    button.type = "button";

    button.addEventListener("click", () => {
      toggleFavorite(show);

      button.textContent = isFavorite(show.id)
        ? "★ Remove from favorites"
        : "☆ Add to favorites";
    });

    info.append(button);
  }

  // Show saved favorites when the page loads.
  renderFavorites();
