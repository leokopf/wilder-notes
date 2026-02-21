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

  msgEl.textContent = len >= MAX_QUERY_CHARS ? `Max ${MAX_QUERY_CHARS} characters reached` : "";
}

function makeBirdRow(bird) {
  const li = document.createElement("li");
  li.style.marginBottom = "10px";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.birdName = bird.name;
  btn.style.all = "unset";
  btn.style.cursor = "pointer";
  btn.style.textDecoration = "underline";
  btn.textContent = bird.name;

  const count = document.createElement("span");
  count.textContent = ` — ${bird.count} seen`;

  const panel = document.createElement("div");
  panel.dataset.panelFor = bird.name;
  panel.style.display = "none";
  panel.style.marginTop = "8px";
  panel.style.padding = "8px 10px";
  panel.style.border = "1px solid rgba(0,0,0,0.15)";
  panel.style.borderRadius = "10px";

  li.appendChild(btn);
  li.appendChild(count);
  li.appendChild(panel);

  return li;
}

function setPanelLoading(panel) {
  panel.innerHTML = `<div style="font-size: 12px; opacity: 0.85;">Loading photo…</div>`;
}

function setPanelNoImage(panel) {
  panel.innerHTML = `<div style="font-size: 12px; opacity: 0.85;">No photo found.</div>`;
}

function setPanelError(panel) {
  panel.innerHTML = `<div style="font-size: 12px; opacity: 0.85;">Couldn’t load photo.</div>`;
}

function setPanelImage(panel, media) {
  panel.innerHTML = "";

  const img = document.createElement("img");
  img.src = media.thumbnailUrl;
  img.alt = "";
  img.loading = "lazy";
  img.style.maxWidth = "240px";
  img.style.width = "100%";
  img.style.borderRadius = "8px";
  img.style.display = "block";

  const credit = document.createElement("div");
  credit.style.marginTop = "6px";
  credit.style.fontSize = "11px";
  credit.style.opacity = "0.75";
  credit.style.lineHeight = "1.25";

  // Keep this minimal but compliant: credit + license + links (when available).
  const parts = [];

  if (media.creditText) parts.push(media.creditText);
  if (media.licenseName) parts.push(media.licenseName);

  const textSpan = document.createElement("span");
  textSpan.textContent = parts.length ? parts.join(" · ") : "Wikimedia Commons";

  const linkWrap = document.createElement("span");
  linkWrap.style.marginLeft = "6px";

  const links = [];

  if (media.filePageUrl) {
    const a = document.createElement("a");
    a.href = media.filePageUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "source";
    links.push(a);
  } else if (media.pageUrl) {
    const a = document.createElement("a");
    a.href = media.pageUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "source";
    links.push(a);
  }

  if (media.licenseUrl) {
    const a = document.createElement("a");
    a.href = media.licenseUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = "license";
    links.push(a);
  }

  links.forEach((a, i) => {
    if (i > 0) linkWrap.appendChild(document.createTextNode(" · "));
    linkWrap.appendChild(a);
  });

  credit.appendChild(textSpan);
  if (links.length) credit.appendChild(linkWrap);

  panel.appendChild(img);
  panel.appendChild(credit);
}

async function fetchMediaForBird(name) {
  const u = new URL(WORKER_URL);
  u.pathname = "/media";
  u.searchParams.set("name", name);
  const res = await fetch(u.toString(), { method: "GET" });
  if (!res.ok) throw new Error("media http " + res.status);
  return res.json();
}

const mediaCache = new Map();

async function toggleBirdPanel(birdName, panel) {
  const isOpen = panel.style.display !== "none";
  if (isOpen) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";

  if (mediaCache.has(birdName)) {
    const cached = mediaCache.get(birdName);
    if (cached?.ok && cached.thumbnailUrl) setPanelImage(panel, cached);
    else setPanelNoImage(panel);
    return;
  }

  setPanelLoading(panel);

  try {
    const media = await fetchMediaForBird(birdName);
    mediaCache.set(birdName, media);

    if (media?.ok && media.thumbnailUrl) setPanelImage(panel, media);
    else setPanelNoImage(panel);
  } catch (e) {
    setPanelError(panel);
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

  if (!query) {
    metaEl.textContent = "";
    rareMetaEl.textContent = "";
    resultsEl.innerHTML = "<li>Type a town / county / postcode first.</li>";
    rareResultsEl.innerHTML = "";
    return;
  }

  if (query.length > MAX_QUERY_CHARS) {
    if (msgEl) msgEl.textContent = `Please shorten to ${MAX_QUERY_CHARS} characters`;
    resultsEl.innerHTML = `<li>Please shorten your location to ${MAX_QUERY_CHARS} characters.</li>`;
    rareResultsEl.innerHTML = "";
    return;
  }

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
      popular.forEach((bird) => resultsEl.appendChild(makeBirdRow(bird)));
    }

    // Unusual
    const unusual = Array.isArray(data.unusual) ? data.unusual : [];
    rareResultsEl.innerHTML = "";

    if (unusual.length === 0) {
      rareMetaEl.textContent = "No notable (locally unusual) species reported in this time window.";
      return;
    }

    rareMetaEl.textContent = "Locally unusual sightings (eBird notable).";
    unusual.forEach((bird) => rareResultsEl.appendChild(makeBirdRow(bird)));
  } catch (err) {
    console.error(err);
    resultsEl.innerHTML = "<li>Request failed. Check DevTools → Console/Network.</li>";
    rareResultsEl.innerHTML = "";
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

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

  // Event delegation: click any bird name button in either list
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const btn = t.closest("button[data-bird-name]");
    if (!btn) return;

    const birdName = btn.dataset.birdName;
    const li = btn.closest("li");
    if (!birdName || !li) return;

    const panel = li.querySelector("div[data-panel-for]");
    if (!panel) return;

    toggleBirdPanel(birdName, panel);
  });
});
