// Coordenadas de Terraza Allende (Gómez Palacio, Dgo.)
const LAT = 25.5710143;
const LON = -103.4985257;

const API_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m` +
  `&daily=sunrise,sunset&timezone=auto`;

/**
 * Traduce código WMO de Open-Meteo a descripción en español y flags visuales para la escena 3D.
 */
export function describeWeatherCode(code) {
  if (code === 0) return { label: "Despejado", kind: "clear", rain: 0, storm: false };
  if (code === 1 || code === 2) return { label: "Poco nublado", kind: "partly", rain: 0, storm: false };
  if (code === 3) return { label: "Nublado", kind: "cloudy", rain: 0, storm: false };
  if (code === 45 || code === 48) return { label: "Neblina", kind: "fog", rain: 0, storm: false };
  if (code >= 51 && code <= 57) return { label: "Llovizna", kind: "rain", rain: 0.45, storm: false };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    const heavy = code === 65 || code === 82;
    return { label: heavy ? "Lluvia fuerte" : "Lluvia", kind: "rain", rain: heavy ? 1 : 0.72, storm: false };
  }
  if (code >= 95) return { label: "Tormenta", kind: "storm", rain: 1, storm: true };
  return { label: "Despejado", kind: "clear", rain: 0, storm: false };
}

/**
 * Determina fase solar ("day", "sunset", "night") usando amanecer/atardecer reales si existen,
 * o la hora local como respaldo.
 */
function resolvePhase({ isDay, currentTimeIso, sunriseIso, sunsetIso }) {
  const nowMs = currentTimeIso ? Date.parse(currentTimeIso) : Date.now();
  if (sunriseIso && sunsetIso && !Number.isNaN(nowMs)) {
    const sr = Date.parse(sunriseIso);
    const ss = Date.parse(sunsetIso);
    const windowMs = 55 * 60 * 1000;
    if (Math.abs(nowMs - ss) <= windowMs || Math.abs(nowMs - sr) <= windowMs) {
      return "sunset";
    }
  }
  if (typeof isDay === "number") return isDay === 1 ? "day" : "night";
  const h = new Date().getHours();
  if (h >= 18 && h < 20) return "sunset";
  if (h >= 7 && h < 18) return "day";
  return "night";
}

export function fallbackWeather() {
  const h = new Date().getHours();
  const isDay = h >= 7 && h < 19 ? 1 : 0;
  const phase = resolvePhase({ isDay });
  const temp = phase === "day" ? 27 : phase === "sunset" ? 22 : 17;
  return {
    source: "local",
    phase,
    temp,
    wind: 8,
    clouds: phase === "day" ? 15 : 20,
    rain: 0,
    storm: false,
    code: 0,
    label: phase === "day" ? "Despejado" : phase === "sunset" ? "Atardecer" : "Noche despejada",
    icon: phase === "day" ? "☀️" : phase === "sunset" ? "🌇" : "🌙",
  };
}

/**
 * Obtiene el clima en tiempo real de Gómez Palacio desde Open-Meteo (sin API key, con CORS).
 */
export async function fetchClima() {
  try {
    const res = await fetch(API_URL, { signal: AbortSignal.timeout(4500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data?.current;
    if (!cur) throw new Error("Sin datos current");

    const info = describeWeatherCode(Number(cur.weather_code ?? 0));
    const phase = resolvePhase({
      isDay: cur.is_day,
      currentTimeIso: cur.time,
      sunriseIso: data.daily?.sunrise?.[0],
      sunsetIso: data.daily?.sunset?.[0],
    });
    const rainIntensity = Math.max(
      info.rain,
      Number(cur.precipitation || cur.rain || 0) > 0 ? Math.min(1, 0.45 + Number(cur.precipitation || cur.rain) * 0.2) : 0
    );

    let icon = phase === "day" ? "☀️" : phase === "sunset" ? "🌇" : "🌙";
    if (info.storm) icon = "⛈️";
    else if (rainIntensity > 0) icon = "🌧️";
    else if (info.kind === "cloudy" || Number(cur.cloud_cover) > 65) icon = "☁️";
    else if (info.kind === "partly" && phase === "day") icon = "⛅";

    return {
      source: "open-meteo",
      phase,
      temp: Math.round(Number(cur.temperature_2m ?? 22)),
      wind: Math.round(Number(cur.wind_speed_10m ?? 6)),
      clouds: Math.round(Number(cur.cloud_cover ?? 0)),
      rain: rainIntensity,
      storm: info.storm,
      code: Number(cur.weather_code ?? 0),
      label: info.label,
      icon,
    };
  } catch (err) {
    console.warn("Clima API no disponible, usando hora local:", err);
    return fallbackWeather();
  }
}

/**
 * Presets manuales para probar rápidamente cómo cambia el Food Park según el clima/hora.
 */
export const WEATHER_PRESETS = {
  day: { source: "preset", phase: "day", temp: 29, wind: 10, clouds: 15, rain: 0, storm: false, label: "Día soleado", icon: "☀️" },
  sunset: { source: "preset", phase: "sunset", temp: 23, wind: 9, clouds: 30, rain: 0, storm: false, label: "Atardecer", icon: "🌇" },
  night: { source: "preset", phase: "night", temp: 18, wind: 6, clouds: 12, rain: 0, storm: false, label: "Noche despejada", icon: "🌙" },
  rain: { source: "preset", phase: "night", temp: 16, wind: 22, clouds: 92, rain: 0.9, storm: true, label: "Lluvia y viento", icon: "⛈️" },
};
