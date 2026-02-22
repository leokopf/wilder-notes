const form = document.getElementById("plannerForm");
const statusEl = document.getElementById("status");
const resultsCard = document.getElementById("resultsCard");
const summaryEl = document.getElementById("summary");
const monthBarsEl = document.getElementById("monthBars");
const dataNoteEl = document.getElementById("dataNote");
const explainEl = document.getElementById("explain");
const monthDetailSection = document.getElementById("monthDetailSection");
const monthDetailEl = document.getElementById("monthDetail");

const goBtn = document.getElementById("goBtn");
const exampleBtn = document.getElementById("exampleBtn");

const MONTH_NAMES = ["", "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

exampleBtn.addEventListener("click", () => {
  document.getElementById("location").value = "Stonehaven";
  document.getElementById("bird").value = "Puffin";
  document.getElementById("month").value = "";
  statusEl.textContent = "";
  resultsCard.hidden = true;
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const location = (document.getElementById("location").value || "").trim();
  const bird = (document.getElementById("bird").value || "").trim();
  const month = (document.getElementById("month").value || "").trim(); // "" or "1".."12"

  // Require at least 2 of 3: location, bird, month
  const filled = [location, bird, month].filter(v => v && v.length > 0).length;
  if (filled < 2) {
    statusEl.textContent = "Please enter at least 2 of: location, bird, month.";
    return;
  }

  setBusy(true);
  statusEl.textContent = "Planning…";
  resultsCard.hidden = true;

  try {
    const res = await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location, bird, month: month ? Number(month) : null })
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!res.ok) {
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
  // Summary
  const parts = [];
  if (data.query?.birdLabel) parts.push(`<strong>${escapeHtml(data.query.birdLabel)}</strong>`);
  if (data.query?.locationLabel) parts.push(`near <strong>${escapeHtml(data.query.locationLabel)}</strong>`);
  summaryEl.innerHTML = parts.length ? `Planning for ${parts.join(" ")}.` : `Trip planner results.`;

  // Bars
  monthBarsEl.innerHTML = "";
  const series = data.monthSeries || [];
  const max = Math.max(...series.map(x => x.count), 1);

  for (const m of series) {
    const row = document.createElement("div");
    row.className = "bar";

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = MONTH_NAMES[m.month] || `Month ${m.month}`;

    const track = document.createElement("div");
    track.className = "track";

    const fill = document.createElement("div");
    fill.className = "fill";
    fill.style.width = `${Math.round((m.count / max) * 100)}%`;
    track.appendChild(fill);

    const val = document.createElement("div");
    val.className = "val";
    val.textContent = String(m.count);

    row.appendChild(name);
    row.appendChild(track);
    row.appendChild(val);

    monthBarsEl.appendChild(row);
  }

  const yearsBack = data.meta?.yearsBack ?? 2;
  const requestedMiles = data.meta?.requestedRadiusMiles ?? 20;
  const actualMiles = data.meta?.actualRadiusMiles ?? requestedMiles;
  const widened = !!data.meta?.radiusWidened;
  const total = Number.isFinite(data.meta?.gbifTotalCount) ? data.meta.gbifTotalCount : null;

  const widenedNote = widened
    ? ` We widened the search to ~${actualMiles} miles because data within ${requestedMiles} miles was sparse.`
    : "";

  const totalNote = (total !== null)
    ? ` (${total} total records matched.)`
    : "";

  dataNoteEl.textContent =
    `Counts are GBIF occurrence records in the last ${yearsBack} years within ~${actualMiles} miles of the town.${totalNote}${widenedNote}`;

  // Selected month detail
  if (data.selectedMonth) {
    monthDetailSection.hidden = false;
    const sm = data.selectedMonth;
    monthDetailEl.innerHTML = `
      <div><strong>${MONTH_NAMES[sm.month]}</strong> ranks <strong>#${sm.rank}</strong> of 12 for this bird near this town.</div>
      <div class="tiny muted" style="margin-top:6px;">
        ${sm.count} records vs peak month ${MONTH_NAMES[sm.peakMonth]} (${sm.peakCount} records).
      </div>
    `;
  } else {
    monthDetailSection.hidden = true;
    monthDetailEl.innerHTML = "";
  }

  // Explanation
  explainEl.innerHTML = "";
  const bullets = [
    "This is a planning signal, not a guarantee — observer coverage varies by season and place.",
    "For best odds, aim for the top 1–3 months and focus on nearby reserves/headlands within a short drive.",
    "If you add exact dates later, we can estimate the best week and suggest nearby hotspots."
  ];

  if (data.topMonths && data.topMonths.length) {
    const tm = data.topMonths.map(m => MONTH_NAMES[m]).join(", ");
    bullets.unshift(`Best months from the last ${yearsBack} years: ${tm}.`);
  }

  if (widened) {
    bullets.unshift(`Data was sparse within ${requestedMiles} miles, so we widened to ${actualMiles} miles to get a more reliable signal.`);
  }

  for (const b of bullets) {
    const li = document.createElement("li");
    li.textContent = b;
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
