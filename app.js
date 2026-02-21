const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";
const MAX_QUERY_CHARS = 50;

function $(id) {
  return document.getElementById(id);
}

function setCharUI(value) {
  const countEl = $("charCount");
  const msgEl = $("charMsg");
  if (!countEl || !msgEl) return;

  const len = value.length;
  countEl.textContent = `${len}/${MAX_QUERY_CHARS}`;

  if (len >= MAX_QUERY_CHARS) {
    msgEl.textContent = `Max ${MAX_QUERY_CHARS} characters reached`;
  } else {
    msgEl.textContent = "";
  }
}

async function search() {
  const locationEl = $("location");
  const resultsEl = $("results");
  const rareResultsEl = $("rareResults");
  const metaEl = $("meta");
  const rareMetaEl = $("rareMeta");
  const searchBtn = $("searchBtn");
  const msgEl = $("charMsg");

  if (!locationEl || !resultsEl || !rareResultsEl || !metaEl || !rareMetaEl || !searchBtn) {
    console.error("Missing expected elements on the page.");
    return;
  }

  const raw = locationEl.value ?? "";
  const query = raw.trim();

  // Empty
  if (!query) {
    metaEl.textContent = "";
    rareMetaEl.textContent = "";
    resultsEl.innerHTML = "<li>Type a town / county / postcode first.</li>";
    rareResultsEl.innerHTML = "";
    return;
  }

  // Length guard (server also enforces)
  if (query.length > MAX_QUERY_CHARS) {
    if (msgEl) msgEl.textContent = `Please shorten to ${MAX_QUERY_CHARS} characters`;
    resultsEl.innerHTML = `<li>Please shorten your location to ${MAX_QUERY_CHARS} characters.</li>`;
    rareResultsEl.innerHTML = "";
    return;
  }

  // Loading UI
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching…";
  metaEl.textContent = "";
  rareMetaEl.textContent = "";
  resultsEl.innerHTML = "<li>Loading…</li>";
  rareResultsEl.innerHTML = "";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      resultsEl.innerHTML = `<li>Worker error (${res.status}). ${text ? "Response: " + text : ""}</li>`;
      rareResultsEl.innerHTML = "";
      return;
    }

    const data = await res.json();

    metaEl.textContent = `Within ${data.radiusMiles} miles of ${data.location} · last ${data.days} days`;

    // Most seen
    const popular = Array.isArray(data.popular) ? data.popular : [];
    resultsEl.innerHTML = "";
    if (popular.length === 0) {
      resultsEl.innerHTML = "<li>No results found.</li>";
    } else {
      popular.forEach((bird) => {
        const li = document.createElement("li");
        li.textContent = `${bird.name} — ${bird.count} seen`;
        resultsEl.appendChild(li);
      });
    }

    // Unusual (eBird notable)
    const unusual = Array.isArray(data.unusual) ? data.unusual : [];
    rareResultsEl.innerHTML = "";

    if (unusual.length === 0) {
      rareMetaEl.textContent = "No notable (locally unusual) species reported in this time window.";
      return;
    }

    rareMetaEl.textContent = "Locally unusual sightings (eBird notable).";
    unusual.forEach((bird) => {
      const li = document.createElement("li");
      li.textContent = `${bird.name} — ${bird.count} seen`;
      rareResultsEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "<li>Request failed. Check DevTools → Console/Network.</li>";
    rareResultsEl.innerHTML = "";
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

// Wire up listeners (no inline script needed)
document.addEventListener("DOMContentLoaded", () => {
  const input = $("location");
  const btn = $("searchBtn");

  if (input) {
    setCharUI(input.value || "");
    input.addEventListener("input", () => setCharUI(input.value || ""));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") search();
    });
  }

  if (btn) btn.addEventListener("click", search);
});
