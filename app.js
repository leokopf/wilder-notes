const WORKER_URL = "https://solitary-resonance-e0f8.lkopferschmitt-e89.workers.dev/"

async function search() {
  const query = document.getElementById("location").value.trim()
  const resultsEl = document.getElementById("results")
  const metaEl = document.getElementById("meta")

  if (!query) return

  resultsEl.innerHTML = "Loading…"
  metaEl.textContent = ""

  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query })
  })

  if (!res.ok) {
    resultsEl.innerHTML = "No results found"
    return
  }

  const data = await res.json()

  metaEl.textContent = `Showing birds within ${data.radiusMiles} miles of ${data.location} from the last ${data.days} days`

  resultsEl.innerHTML = ""
  data.results.forEach(bird => {
    const li = document.createElement("li")
    li.textContent = `${bird.name} — ${bird.count} sightings`
    resultsEl.appendChild(li)
  })
}
