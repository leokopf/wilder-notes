const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/";
const MAX_QUERY_CHARS = 50;

function $(id) {
  return document.getElementById(id);
}

function setText(el, text) {
  el.textContent = text;
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function setCharUI(value) {
  const countEl = $("charCount");
  const msgEl = $("charMsg");
  if (!countEl || !msgEl) return;

  const len = value.length;
  setText(countEl, `${len}/${MAX_QUERY_CHARS}`);
  setText(msgEl, len >= MAX_QUERY_CHARS ? `Max ${MAX_QUERY_CHARS} characters reached` : "");
}

function makeStatusLine(text) {
  const div = document.createElement("div");
  div.style.fontSize = "12px";
  div.style.opacity = "0.85";
  setText(div, text);
  return div;
}

function makeBirdRow(bird) {
  const li = document.createElement("li");
  li.style.marginBottom = "10px";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.birdName = bird.name;
  btn.dataset.sciName = bird.sciName || "";
  btn.style.all = "unset";
  btn.style.cursor = "pointer";
  btn.style.textDecoration = "underline";
  setText(btn, bird.name);

  const count = document.createElement("span");
  setText(count, ` — ${bird.count} seen`);

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

async function fetchMediaForBird(name, sciName) {
  const u = new URL(WORKER_URL);
  u.pathname = "/media";
  const res = await fetch(u.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, sciName }),
  });
  if (!res.ok) throw new Error(`media http ${res.status}`);
  return res.json();
}

const mediaCache = new Map();

function renderNoPhoto(panel, media) {
  clear(panel);

  const row = document.createElement("div");
  row.style.fontSize = "12px";
  row.style.opacity = "0.85";

  const msg = document.createElement("span");
  setText(msg, "No photo found.");

  row.appendChild(msg);

  const searchUrl = media?.searchUrl;
  if (searchUrl) {
    const sep = document.createTextNode(" ");
    row.appendChild(sep);

    const a = document.createElement("a");
    a.href = searchUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    setText(a, "search");
    row.appendChild(a);
  }

  panel.appendChild(row);
}

function renderMedia(panel, media) {
  if (!media || !media.ok) {
    renderNoPhoto(panel, media);
    return;
  }
  if (!media.thumbnailUrl) {
    renderNoPhoto(panel, media);
    return;
  }

  clear(panel);

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

  const parts = [];
  if (media.creditText) parts.push(media.creditText);
  if (media.licenseName) parts.push(media.licenseName);

  const textSpan = document.createElement("span");
  setText(textSpan, parts.length ? parts.join(" · ") : "Wikimedia");
  credit.appendChild(textSpan);

  const links = [];

  const sourceUrl = media.filePageUrl || media.pageUrl;
  if (sourceUrl) {
    const a = document.createElement("a");
    a.href = sourceUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    setText(a, "source");
    links.push(a);
  }

  if (media.licenseUrl) {
    const a = document.createElement("a");
    a.href = media.licenseUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    setText(a, "license");
    links.push(a);
  }

  // Always include search link as escape hatch
  if (media.searchUrl) {
    const a = document.createElement("a");
    a.href = media.searchUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    setText(a, "search");
    links.push(a);
  }

  if (links.length) {
    const linkWrap = document.createElement("span");
    linkWrap.style.marginLeft = "6px";
    links.forEach((a, i) => {
      if (i > 0) linkWrap.appendChild(document.createTextNode(" · "));
      linkWrap.appendChild(a);
    });
    credit.appendChild(linkWrap);
  }

  panel.appendChild(img);
  panel.appendChild(credit);
}

async function toggleBirdPanel(birdName, sciName, panel) {
  const cacheKey = `${birdName}||${sciName || ""}`;

  const isOpen = panel.style.display !== "none";
  if (isOpen) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  clear(panel);
  panel.appendChild(makeStatusLine("Loading photo…"));

  if (mediaCache.has(cacheKey)) {
    renderMedia(panel, mediaCache.get(cacheKey));
    return;
  }

  try {
    const media = await fetchMediaForBird(birdName, sciName);
    mediaCache.set(cacheKey, media);
    renderMedia(panel, media);
  } catch (e) {
    clear(panel);
    panel.appendChild(makeStatusLine("Couldn’t load photo."));
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

  if (!locationEl || !resultsEl || !rareResultsEl || !metaEl || !rareMetaEl || !searchBtn) return;

  const query = (locationEl.value || "").trim();

  if (!query) {
    setText(metaEl, "");
    setText(rareMetaEl, "");
    clear(resultsEl);
    clear(rareResultsEl);
    const li = document.createElement("li");
    setText(li, "Type a town / county / postcode first.");
    resultsEl.appendChild(li);
    return;
  }

  if (query.length > MAX_QUERY_CHARS) {
    if (msgEl) setText(msgEl, `Please shorten to ${MAX_QUERY_CHARS} characters`);
    clear(resultsEl);
    clear(rareResultsEl);
    const li = document.createElement("li");
    setText(li, `Please shorten your location to ${MAX_QUERY_CHARS} characters.`);
    resultsEl.appendChild(li);
    return;
  }

  searchBtn.disabled = true;
  setText(searchBtn, "Searching…");
  setText(metaEl, "");
  setText(rareMetaEl, "");
  clear(resultsEl);
  clear(rareResultsEl);

  const loadingLi = document.createElement("li");
  setText(loadingLi, "Loading…");
  resultsEl.appendChild(loadingLi);

  try {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      clear(resultsEl);
      clear(rareResultsEl);
      const li = document.createElement("li");
      setText(li, `Worker error (${res.status}). ${text ? "Response: " + text : ""}`);
      resultsEl.appendChild(li);
      return;
    }

    const data = await res.json();
    setText(metaEl, `Within ${data.radiusMiles} miles of ${data.location} · last ${data.days} days`);

    const popular = Array.isArray(data.popular) ? data.popular : [];
    clear(resultsEl);
    if (popular.length === 0) {
      const li = document.createElement("li");
      setText(li, "No results found.");
      resultsEl.appendChild(li);
    } else {
      popular.forEach((bird) => resultsEl.appendChild(makeBirdRow(bird)));
    }

    const unusual = Array.isArray(data.unusual) ? data.unusual : [];
    clear(rareResultsEl);
    if (unusual.length === 0) {
      setText(rareMetaEl, "No notable (locally unusual) species reported in this time window.");
    } else {
      setText(rareMetaEl, "Locally unusual sightings (eBird notable).");
      unusual.forEach((bird) => rareResultsEl.appendChild(makeBirdRow(bird)));
    }
  } catch (err) {
    clear(resultsEl);
    clear(rareResultsEl);
    const li = document.createElement("li");
    setText(li, "Request failed. Check DevTools → Console/Network.");
    resultsEl.appendChild(li);
  } finally {
    searchBtn.disabled = false;
    setText(searchBtn, "Search");
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

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const birdBtn = t.closest("button[data-bird-name]");
    if (!birdBtn) return;

    const birdName = birdBtn.dataset.birdName || "";
    const sciName = birdBtn.dataset.sciName || "";
    const li = birdBtn.closest("li");
    if (!birdName || !li) return;

    const panel = li.querySelector("div[data-panel-for]");
    if (!panel) return;

    toggleBirdPanel(birdName, sciName, panel);
  });
});
