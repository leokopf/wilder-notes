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

async function fetchMediaForBird(name) {
  const u = new URL(WORKER_URL);
  u.pathname = "/media";
  u.searchParams.set("name", name);
  const res = await fetch(u.toString(), { method: "GET" });
  if (!res.ok) throw new Error(`media http ${res.status}`);
  return res.json();
}

const mediaCache = new Map();

function renderMedia(panel, media) {
  clear(panel);

  if (!media || !media.ok || !media.thumbnailUrl) {
    panel.appendChild(makeStatusLine("No photo found."));
    return;
  }

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
  setText(textSpan, parts.length ? parts.join(" · ") : "Wikimedia Commons");

  credit.appendChild(textSpan);

  const links = [];
  if (media.filePageUrl) {
    const a = document.createElement("a");
    a.href = media.filePageUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    setText(a, "source");
    links.push(a);
  } else if (media.pageUrl) {
    const a = document.createElement("a");
    a.href = media.pageUrl;
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

async function toggleBirdPanel(birdName, panel) {
  const isOpen = panel.style.display !== "none";
  if (isOpen) {
    panel.style.display = "none";
    return;
  }

  panel.style.display = "block";
  clear(panel);
  panel.appendChild(makeStatusLine("Loading photo…"));

  if (mediaCache.has(birdName)) {
    renderMedia(panel, mediaCache.get(birdName));
    return;
  }

  try {
    const media = await fetchMediaForBird(birdName);
    mediaCache.set(birdName, media);
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
    resultsEl.appendChild(document.createElement("li")).textContent =
      "Type a town / county / postcode first.";
    return;
  }

  if (query.length > MAX_QUERY_CHARS) {
    if (msgEl) setText(msgEl, `Please shorten to ${MAX_QUERY_CHARS} characters`);
    clear(resultsEl);
    clear(rareResultsEl);
    resultsEl.appendChild(document.createElement("li")).textContent =
      `Please shorten your location to ${MAX_QUERY_CHARS} characters.`;
    return;
  }

  searchBtn.disabled = true;
  setText(searchBtn, "Searching…");
  setText(metaEl, "");
  setText(rareMetaEl, "");
  clear(resultsEl);
  clear(rareResultsEl);
  resultsEl.appendChild(document.createElement("li")).textContent = "Loading…";

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
      resultsEl.appendChild(document.createElement("li")).textContent =
        `Worker error (${res.status}). ${text ? "Response: " + text : ""}`;
      return;
    }

    const data = await res.json();
    setText(metaEl, `Within ${data.radiusMiles} miles of ${data.location} · last ${data.days} days`);

    const popular = Array.isArray(data.popular) ? data.popular : [];
    clear(resultsEl);
    if (popular.length === 0) {
      resultsEl.appendChild(document.createElement("li")).textContent = "No results found.";
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
    resultsEl.appendChild(document.createElement("li")).textContent =
      "Request failed. Check DevTools → Console/Network.";
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

  // Event delegation for bird clicks
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    const birdBtn = t.closest("button[data-bird-name]");
    if (!birdBtn) return;

    const birdName = birdBtn.dataset.birdName;
    const li = birdBtn.closest("li");
    if (!birdName || !li) return;

    const panel = li.querySelector("div[data-panel-for]");
    if (!panel) return;

    toggleBirdPanel(birdName, panel);
  });
});
