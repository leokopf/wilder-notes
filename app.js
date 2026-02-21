const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";

async function search() {
  const locationEl = document.getElementById("location");
  const resultsEl = document.getElementById("results");
  const metaEl = document.getElementById("meta");

  // Safety checks (prevents silent failure)
  if (!locationEl || !resultsEl || !metaEl) {
    console.error("Missing expected elements on the page.");
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

    // Helpful debug
    console.log("Worker status:", res.status);

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      resultsEl.innerHTML = `<li>Worker error (${res.status}). ${text ? "Response: " + text : ""}</li>`;
      return;
    }

    const data = await res.json();

    metaEl.textContent = `Showing birds within ${data.radiusMiles} miles of ${data.location} from the last ${data.days} days`;

    resultsEl.innerHTML = "";
    if (!data.results || data.results.length === 0) {
      resultsEl.innerHTML = "<li>No results found.</li>";
      return;
    }

    data.results.forEach((bird) => {
      const li = document.createElement("li");
      li.textContent = `${bird.name} — ${bird.count} sightings`;
      resultsEl.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = `<li>Request failed (likely CORS or Worker down). Open DevTools → Console for details.</li>`;
  }
}
