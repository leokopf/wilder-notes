const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";

let currentResults = [];
let currentSortMode = "count";

async function search() {
  const locationEl = document.getElementById("location");
  const resultsEl = document.getElementById("results");
  const metaEl = document.getElementById("meta");

  const query = locationEl.value.trim();
  if (!query) {
    resultsEl.innerHTML = "<li>Type a location first.</li>";
    return;
  }

  resultsEl.innerHTML = "<li>Loading…</li>";
  metaEl.textContent = "";

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text();
      resultsEl.innerHTML = `<li>Error: ${text}</li>`;
      return;
    }

    const data = await res.json();

    metaEl.textContent =
      `Within ${data.radiusMiles} miles of ${data.location} · last ${data.days} days`;

    currentResults = data.results;

    renderResults();
  } catch (err) {
    resultsEl.innerHTML = "<li>Request failed.</li>";
  }
}

function renderResults() {
  const resultsEl = document.getElementById("results");

  if (!currentResults.length) {
    resultsEl.innerHTML = "<li>No results.</li>";
    return;
  }

  const sorted = [...currentResults].sort((a, b) => {
    return b[currentSortMode] - a[currentSortMode];
  });

  resultsEl.innerHTML = "";

  sorted.slice(0, 20).forEach((bird) => {
    const li = document.createElement("li");

    if (currentSortMode === "count") {
      li.textContent =
        `${bird.name} — ${bird.count} seen (${bird.reports} reports)`;
    } else {
      li.textContent =
        `${bird.name} — ${bird.reports} reports (${bird.count} seen)`;
    }

    resultsEl.appendChild(li);
  });
}

document.addEventListener("change", (e) => {
  if (e.target.name === "sortMode") {
    currentSortMode = e.target.value;
    renderResults();
  }
});
