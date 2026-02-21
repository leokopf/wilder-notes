const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";

let currentResults = [];

async function search() {
  const locationEl = document.getElementById("location");
  const resultsEl = document.getElementById("results");
  const metaEl = document.getElementById("meta");

  // Safety checks so it never fails silently
  if (!locationEl || !resultsEl || !metaEl) {
    console.error("Missing expected elements on the page (location/results/meta).");
    return;
  }

  const query = locationEl.value.trim();
  if (!query) {
    metaEl.textContent = "";
    resultsEl.innerHTML = "<li>Type a town / county / postcode first.</li>";
    return;
  }

  metaEl.textContent = "";
  resultsEl.innerHTML = "<li>Loading…</li>";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      resultsEl.innerHTML = `<li>Worker error (${res.status}). ${text ? "Response: " + text : ""}</li>`;
      return;
    }

    const data = await res.json();

    metaEl.textContent = `Within ${data.radiusMiles} miles of ${data.location} · last ${data.days} days`;

    // data.results should be [{ name, count, reports? }, ...]
    currentResults = Array.isArray(data.results) ? data.results : [];

    renderResults();
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "<li>Request failed. Check DevTools → Console/Network.</li>";
  }
}

function renderResults() {
  const resultsEl = document.getElementById("results");

  if (!currentResults.length) {
    resultsEl.innerHTML = "<li>No results found.</li>";
    return;
  }

  // Sort by total individuals seen (highest first)
  const sorted = [...currentResults].sort((a, b) => (b.count || 0) - (a.count || 0));

  resultsEl.innerHTML = "";

  sorted.slice(0, 20).forEach((bird) => {
    const li = document.createElement("li");
    li.textContent = `${bird.name} — ${bird.count} seen`;
    resultsEl.appendChild(li);
  });
}
