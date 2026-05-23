/**
 * Wetter-Snippet via Open-Meteo (kostenlos, kein API-Key nötig).
 * Wird beim Anlegen eines Trainings mit Parcours-Geo abgefragt und in
 * trainings.weather (VARCHAR(120)) als Freitext gespeichert.
 *
 * Beispiel-Output: "23°C, leicht bewölkt · Wind 8 km/h SW"
 */

const WEATHER_CODES: Record<number, string> = {
  0:  "klar",
  1:  "überwiegend klar",
  2:  "teilweise bewölkt",
  3:  "bedeckt",
  45: "Nebel",
  48: "Reifnebel",
  51: "leichter Niesel",
  53: "Niesel",
  55: "starker Niesel",
  61: "leichter Regen",
  63: "Regen",
  65: "starker Regen",
  71: "leichter Schnee",
  73: "Schnee",
  75: "starker Schnee",
  77: "Schnee-Körner",
  80: "leichter Schauer",
  81: "Schauer",
  82: "starker Schauer",
  85: "leichter Schneeschauer",
  86: "Schneeschauer",
  95: "Gewitter",
  96: "Gewitter mit leichtem Hagel",
  99: "Gewitter mit starkem Hagel",
};

function windDirLabel(deg: number): string {
  // 8-Punkte-Kompass auf Deutsch (N, NO, O, SO, S, SW, W, NW)
  const dirs = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

export async function fetchWeatherSnippet(lat: number, lng: number): Promise<string | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat.toFixed(4));
    url.searchParams.set("longitude", lng.toFixed(4));
    url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m,wind_direction_10m");
    url.searchParams.set("wind_speed_unit", "kmh");
    url.searchParams.set("timezone", "auto");

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current;
    if (!c) return null;

    const temp = Math.round(c.temperature_2m);
    const cond = WEATHER_CODES[c.weather_code] ?? "—";
    const wind = Math.round(c.wind_speed_10m);
    const dir  = windDirLabel(c.wind_direction_10m);

    return `${temp}°C, ${cond} · Wind ${wind} km/h ${dir}`;
  } catch {
    return null;
  }
}
