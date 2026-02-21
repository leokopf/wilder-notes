const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";
const REQUEST_TIMEOUT_MS = 12000;

function $(id) {
  return document.getElementById(id);
}

async function search() {
  const locationEl = $("location");
  const resultsEl = $("results");
  const rareResultsEl = $("rareResults");
  const metaEl = $("meta");
  const rareMetaEl = $("rareMeta");
  const searchBtn = $("searchBtn");

  if (!locationEl || !resultsEl || !rareResultsEl || !metaEl || !rareMetaEl || !searchBtn) {
    console.error("Missing expected elements on the page.");
    return;
  }

  const query = locationEl.value.trim();

  // Light client-side validation (real protection should be in the Worker too)
  if (!query) {
    metaEl.textContent = "";
    rareMetaEl.textContent = "";
    resultsEl.innerHTML = "<li>Type a town / county / postcode first.</li>";
    rareResultsEl.innerHTML = "";
    return;
  }
  if (query.length > 80) {
    resultsEl.innerHTML = "<li>Please use a shorter location (max 80 characters).</li>";
    rareResultsEl.innerHTML = "";
    return;
  }

  // UI loading state
  searchBtn.disabled = true;
  searchBtn.textContent = "Searching…";
  metaEl.textContent = "";
  rareMetaEl.textContent = "";
  resultsEl.innerHTML = "<li>Loading…</li>";
  rareResultsEl.innerHTML = "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal: controller.signal,
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

    // Unusual
    const unusual = Array.isArray(data.unusual) ? data.unusual : [];
    rareResultsEl.innerHTML = "";

    if (unusual.length === 0) {
      rareMetaEl.textContent = "No notable (locally unusual) species reported in this time window.";
    } else {
      rareMetaEl.textContent = "Locally unusual sightings (eBird notable).";
      unusual.forEach((bird) => {
        const li = document.createElement("li");
        li.textContent = `${bird.name} — ${bird.count} seen`;
        rareResultsEl.appendChild(li);
      });
    }
  } catch (err) {
    console.error(err);
    const msg = err?.name === "AbortError"
      ? "Request timed out. Try again."
      : "Request failed. Check DevTools → Console/Network.";
    resultsEl.innerHTML = `<li>${msg}</li>`;
    rareResultsEl.innerHTML = "";
  } finally {
    clearTimeout(timer);
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

// Wire up events (no inline scripts)
document.addEventListener("DOMContentLoaded", () => {
  const btn = $("searchBtn");
  const input = $("location");

  if (btn) btn.addEventListener("click", search);
  if (input) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") search();
    });
  }
});
