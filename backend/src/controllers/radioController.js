const RADIO_BROWSER_URL = 'https://de1.api.radio-browser.info/json/stations'

export async function searchStations(req, res) {
  try {
    const { name, country, language, tag } = req.query

    let url = RADIO_BROWSER_URL

    if (name) url += `/byname/${encodeURIComponent(name)}`
    else if (country) url += `/bycountry/${encodeURIComponent(country)}`
    else if (language) url += `/bylanguage/${encodeURIComponent(language)}`
    else if (tag) url += `/bytag/${encodeURIComponent(tag)}`
    else url += '?limit=30'

    const response = await fetch(url)
    if (!response.ok) throw new Error(`Radio Browser error: ${response.status}`)

    let stations = await response.json()

    if (!Array.isArray(stations)) stations = []

    const filtered = stations.filter(station =>
      station.name && station.url_resolved
    ).slice(0, 50).map(station => ({
      id: station.stationuuid,
      name: station.name,
      url: station.url_resolved,
      country: station.country,
      language: station.language,
      tags: station.tags,
      favicon: station.favicon,
      votes: station.votes,
    }))

    res.json(filtered)
  } catch (err) {
    console.error('Error fetching stations:', err)
    res.status(500).json({ error: 'Error al buscar emisoras' })
  }
}