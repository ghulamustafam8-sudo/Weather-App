/* script.js - Pro weather single page
   Replace API_KEY, PHONE_NUMBER, and you@example.com placeholders.
   Uses OpenWeatherMap current + forecast endpoints.
*/
const API_KEY = '05a50a45927e8a2fd079244330fe1974'; // <-- PUT YOUR OpenWeatherMap API KEY HERE
const WA_NUMBER = '03172215319'; // e.g. 92300XXXXXXX
const MAIL = 'ghulamustafam8@gmail.com';

const els = {
  place: document.getElementById('place'),
  localTime: document.getElementById('local-time'),
  temp: document.getElementById('temp'),
  desc: document.getElementById('desc'),
  weatherIcon: document.getElementById('weather-icon'),
  feels: document.getElementById('feels'),
  humidity: document.getElementById('humidity'),
  wind: document.getElementById('wind'),
  pressure: document.getElementById('pressure'),
  forecast: document.getElementById('forecast'),
  msg: document.getElementById('msg'),
  searchBtn: document.getElementById('search-btn'),
  cityInput: document.getElementById('city-input'),
  locBtn: document.getElementById('loc-btn'),
  unitBtns: document.querySelectorAll('.unit'),
  contactWa: document.getElementById('contact-wa'),
  contactMail: document.getElementById('contact-mail'),
  bg: document.getElementById('bg-container'),
  year: document.getElementById('year')
};

let unit = 'metric'; // metric or imperial
els.year.textContent = new Date().getFullYear();

/* utils */
const ICON = code => `https://openweathermap.org/img/wn/${code}@4x.png`;
const CURR_URL = (q) => `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=${unit}&appid=${API_KEY}`;
const COORD_URL = (lat, lon) => `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`;
const FORE_URL = (lat, lon) => `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&appid=${API_KEY}`;

function setMsg(text, isError=false){
  els.msg.textContent = text;
  els.msg.style.color = isError ? '#b91c1c' : '';
}

function toLocalString(ts, tz=0){
  return new Date((ts + tz) * 1000).toLocaleString([], { weekday:'short', hour:'2-digit', minute:'2-digit' });
}

/* background by weather main */
function applyBackground(main){
  const bg = els.bg;
  bg.className = 'bg'; // reset
  const map = {
    Clear: 'linear-gradient(180deg,#ffefb6,#ffd28a)', // sunny
    Clouds: 'linear-gradient(180deg,#e6eef9,#d6dbef)', // cloudy
    Rain: 'linear-gradient(180deg,#dbeafe,#9ec5ef)', // rainy
    Drizzle: 'linear-gradient(180deg,#e2f0ff,#cde7ff)',
    Thunderstorm: 'linear-gradient(180deg,#dbe5ff,#c0d3ff)',
    Snow: 'linear-gradient(180deg,#f7fbff,#eaf6ff)',
    Mist: 'linear-gradient(180deg,#f3f6f8,#e9eef2)',
    Smoke: 'linear-gradient(180deg,#efe9e1,#e6d9cf)',
    Haze: 'linear-gradient(180deg,#f4f6f7,#eaeef0)'
  };
  bg.style.background = map[main] || 'linear-gradient(180deg,#f6fbff,#f1f7ff)';
}

/* render current */
function renderCurrent(data){
  const tz = data.timezone || 0;
  els.place.textContent = `${data.name}, ${data.sys.country}`;
  els.localTime.textContent = toLocalString(data.dt, tz);
  els.temp.textContent = `${Math.round(data.main.temp)}${unit === 'metric' ? '°C' : '°F'}`;
  els.desc.textContent = (data.weather?.[0]?.description || '').replace(/\b\w/g, c => c.toUpperCase());
  els.weatherIcon.src = ICON(data.weather?.[0]?.icon || '01d');
  els.weatherIcon.alt = data.weather?.[0]?.description || 'weather';
  els.feels.textContent = `${Math.round(data.main.feels_like)}${unit === 'metric' ? '°C' : '°F'}`;
  els.humidity.textContent = `${data.main.humidity}%`;
  els.wind.textContent = `${data.wind.speed} ${unit === 'metric' ? 'm/s' : 'mph'}`;
  els.pressure.textContent = `${data.main.pressure} hPa`;

  // contacts
  const waMsg = encodeURIComponent(`Hi, I saw weather for ${data.name} via your app.`);
  els.contactWa.href = `https://wa.me/${WA_NUMBER}?text=${waMsg}`;
  els.contactMail.href = `mailto:${MAIL}?subject=Weather%20Inquiry%20${encodeURIComponent(data.name)}`;

  // background by weather main
  const mainWeather = data.weather?.[0]?.main || 'Clear';
  applyBackground(mainWeather);
}

/* render forecast: pick one entry per day near 12:00 */
function renderForecast(fore){
  els.forecast.innerHTML = '';
  const tz = fore.city?.timezone || 0;
  // group by date
  const groups = {};
  fore.list.forEach(item => {
    const d = new Date((item.dt + tz) * 1000);
    const key = d.toISOString().slice(0,10);
    if(!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  const keys = Object.keys(groups).slice(0,5); // next 5 days
  keys.forEach(key => {
    const arr = groups[key];
    // choose item closest to 12:00
    let pick = arr.reduce((best, cur) => {
      const curH = new Date((cur.dt + tz) * 1000).getHours();
      const bestH = best ? new Date((best.dt + tz) * 1000).getHours() : 99;
      return (Math.abs(curH - 12) < Math.abs(bestH - 12)) ? cur : best;
    }, null);
    if(!pick) pick = arr[0];
    const dayName = new Date((pick.dt + tz) * 1000).toLocaleDateString([], { weekday:'short' });
    const temp = Math.round(pick.main.temp);
    const icon = pick.weather?.[0]?.icon || '01d';
    const desc = pick.weather?.[0]?.description || '';
    const item = document.createElement('div');
    item.className = 'forecast-item';
    item.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img src="${ICON(icon)}" alt="${desc}">
      <div class="muted small">${desc}</div>
      <div class="forecast-temp">${temp}${unit === 'metric' ? '°C' : '°F'}</div>
    `;
    els.forecast.appendChild(item);
  });
}

/* fetch flow by coords */
async function fetchByCoords(lat, lon){
  try {
    setMsg('Loading…');
    const [curRes, foreRes] = await Promise.all([
      fetch(COORD_URL(lat, lon)),
      fetch(FORE_URL(lat, lon))
    ]);
    if(!curRes.ok) throw new Error('Current weather fetch failed');
    if(!foreRes.ok) throw new Error('Forecast fetch failed');
    const cur = await curRes.json();
    const fore = await foreRes.json();
    renderCurrent(cur);
    renderForecast(fore);
    setMsg('');
  } catch(err){
    console.error(err);
    setMsg('Unable to fetch weather. Check API key & network.', true);
  }
}

/* fetch flow by city */
async function fetchByCity(q){
  try {
    setMsg('Loading…');
    const res = await fetch(CURR_URL(q));
    if(!res.ok) throw new Error('City not found');
    const cur = await res.json();
    await fetchByCoords(cur.coord.lat, cur.coord.lon);
  } catch(err){
    console.error(err);
    setMsg('City not found or API limit reached.', true);
  }
}

/* events */
els.searchBtn.addEventListener('click', () => {
  const q = els.cityInput.value.trim();
  if(!q) return setMsg('Type a city name');
  fetchByCity(q);
});
els.cityInput.addEventListener('keydown', e => { if(e.key === 'Enter') els.searchBtn.click(); });

els.locBtn.addEventListener('click', () => {
  if(!navigator.geolocation) return setMsg('Geolocation not supported', true);
  setMsg('Locating…');
  navigator.geolocation.getCurrentPosition(pos => {
    fetchByCoords(pos.coords.latitude, pos.coords.longitude);
  }, () => setMsg('Location denied or unavailable', true), { timeout:9000 });
});

/* units toggle */
els.unitBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    els.unitBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    unit = btn.dataset.unit;
    // re-run last fetch by using place text (best effort) or default Karachi
    const placeText = els.place.textContent && els.place.textContent !== '—' ? els.place.textContent.split(',')[0] : 'Karachi';
    fetchByCity(placeText);
  });
});

/* init: try geolocation else default city */
(function init(){
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos => {
      fetchByCoords(pos.coords.latitude, pos.coords.longitude);
    }, () => {
      // fallback default
      fetchByCity('Karachi');
    }, { timeout:7000 });
  } else {
    fetchByCity('Karachi');
  }
})();
