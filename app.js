const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";

async function search() {
  const locationEl = document.getElementById("location");
  const resultsEl = document.getElementById("results");
  const rareResultsEl = document.getElementById("rareResults");
  const metaEl = document.getElementById("meta");
  const rareMetaEl = document.getElementById("rareMeta");

  // Safety checks so it never fails silently
  if (!locationEl || !resultsEl || !rareResultsEl || !metaEl || !rareMetaEl) {
    console.error("Missing expected elements on the page (location/results/rareResults/meta/rareMeta).");
    return;
  }

  const query = locationEl.value.trim();
  if (!query) {
    metaEl.textContent = "";
    rareMetaEl.textContent = "";
    resultsEl.innerHTML = "<li>Type a town / county / postcode first.</li>";
    rareResultsEl.innerHTML = "";
    return;
  }

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

    // --- Most seen ---
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

    // --- Unusual (eBird notable) ---
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
  }
}
