const form = document.getElementById("plannerForm");
const statusEl = document.getElementById("status");
const resultsCard = document.getElementById("resultsCard");
const summaryEl = document.getElementById("summary");
const birdListEl = document.getElementById("birdList");
const dataNoteEl = document.getElementById("dataNote");
const explainEl = document.getElementById("explain");

const goBtn = document.getElementById("goBtn");
const exampleBtn = document.getElementById("exampleBtn");

const MONTH_NAMES = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// IMPORTANT: this is your worker URL (works even if domain routing isn’t ready)
const API_PLANNER = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/api/planner";

exampleBtn.addEventListener("click", () => {
  document.getElementById("location").value = "Thurso";
  document.getElementById("month").value = "3";
  statusEl.textContent = "";
  resultsCard.hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const location = (document.getElementById("location").value || "").trim();
  const monthStr = (document.getElementById("month").value || "").trim();
  const month = monthStr ? Number(monthStr) : null;

  if (!location || !month) {
    statusEl.textContent = "Please enter a town and pick a month.";
    return;
  }

  setBusy(true);
  statusEl.textContent = "Planning…";
  resultsCard.hidden = true;

  try {
    const res = await fetch(API_PLANNER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, month })
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!res.ok || !data) {
      statusEl.textContent = (data && data.error) ? data.error : `Error (${res.status})`;
      setBusy(false);
      return;
    }

    renderResults(data);
    statusEl.textContent = "";
    resultsCard.hidden = false;

  } catch (err) {
    statusEl.textContent = "Network error. Please try again.";
  } finally {
    setBusy(false);
  }
});

function setBusy(isBusy) {
  goBtn.disabled = isBusy;
  exampleBtn.disabled = isBusy;
}

function renderResults(data) {
  const q = data.query || {};
  const m = data.query?.month || null;

  summaryEl.innerHTML = `For <strong>${escapeHtml(q.locationLabel || q.locationInput || "your town")}</strong> in <strong>${MONTH_NAMES[m] || "that month"}</strong>.`;

  // List
  birdListEl.innerHTML = "";
  const birds = Array.isArray(data.topBirds) ? data.topBirds : [];

  if (!birds.length) {
    const li = document.createElement("li");
    li.textContent = "No results found for that month nearby. Try widening your location (nearby bigger town) or another month.";
    birdListEl.appendChild(li);
  } else {
    for (const b of birds) {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.textContent = b.name || b.scientificName || "Unknown bird";

      const sub = document.createElement("span");
      sub.className = "small";
      sub.textContent = `${b.count} records`;

      li.appendChild(main);
      li.appendChild(sub);
      birdListEl.appendChild(li);
    }
  }

  const yearsBack = data.meta?.yearsBack ?? 2;
  const requestedMiles = data.meta?.requestedRadiusMiles ?? 20;
  const actualMiles = data.meta?.actualRadiusMiles ?? requestedMiles;
  const widened = !!data.meta?.radiusWidened;
  const total = Number.isFinite(data.meta?.gbifTotalCount) ? data.meta.gbifTotalCount : null;

  dataNoteEl.textContent =
    const yearsBack = data.meta?.yearsBack ?? 2;
const actualMiles = data.meta?.actualRadiusMiles ?? 20;
const widened = !!data.meta?.radiusWidened;
const rows = Number.isFinite(data.meta?.totalObservationRows) ? data.meta.totalObservationRows : null;

dataNoteEl.textContent =
  `eBird historic samples from the last ${yearsBack} years within ~${actualMiles} miles.` +
  (rows !== null ? ` (${rows} observation rows across sampled days.)` : "") +
  (widened ? ` Widened due to sparse data.` : "");

  // Notes
  explainEl.innerHTML = "";
  const bullets = [
    "This is a planning signal, not a guarantee — coverage varies and some birds are under-reported.",
    "Use the list to pick habitats nearby (coast, harbour, lochs, farmland, moor) and you’ll improve your odds.",
    "If results look thin, try a nearby larger town or a neighbouring month."
  ];
  for (const t of bullets) {
    const li = document.createElement("li");
    li.textContent = t;
    explainEl.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
