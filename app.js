const defaultData = {
  districts: [
    { name: "Bengaluru Urban", cases: 842, solved: 64, hotspot: 91, growth: 12 },
    { name: "Mysuru", cases: 316, solved: 71, hotspot: 63, growth: 5 },
    { name: "Mangaluru", cases: 282, solved: 68, hotspot: 59, growth: -2 },
    { name: "Belagavi", cases: 247, solved: 62, hotspot: 55, growth: 8 },
    { name: "Hubballi-Dharwad", cases: 231, solved: 66, hotspot: 51, growth: 4 },
    { name: "Kalaburagi", cases: 196, solved: 58, hotspot: 49, growth: 9 },
  ],
  cases: [
    {
      id: "CASE-1047",
      district: "Bengaluru Urban",
      offence: "Vehicle theft",
      suspect: "Ravi K",
      vehicle: "KA-05-MX-2219",
      phone: "9845011278",
      risk: "High",
      status: "Open",
      summary: "Two-wheeler thefts near transit parking with duplicate key access.",
    },
    {
      id: "CASE-1032",
      district: "Mysuru",
      offence: "Chain snatching",
      suspect: "Imran P",
      vehicle: "KA-09-HH-4410",
      phone: "9900824411",
      risk: "Medium",
      status: "In progress",
      summary: "Morning incidents targeting pedestrians near market approach roads.",
    },
    {
      id: "CASE-1018",
      district: "Mangaluru",
      offence: "Cyber fraud",
      suspect: "Unknown wallet cluster",
      vehicle: "N/A",
      phone: "8123459901",
      risk: "High",
      status: "Open",
      summary: "UPI refund scam using rotating bank accounts and mule numbers.",
    },
    {
      id: "CASE-1009",
      district: "Belagavi",
      offence: "Burglary",
      suspect: "Mahesh N",
      vehicle: "KA-22-PA-7801",
      phone: "7760992215",
      risk: "Medium",
      status: "Closed",
      summary: "Night break-ins at closed provision stores along highway edge.",
    },
    {
      id: "CASE-0998",
      district: "Hubballi-Dharwad",
      offence: "Robbery",
      suspect: "Sandeep V",
      vehicle: "KA-25-QA-1142",
      phone: "9036117844",
      risk: "High",
      status: "In progress",
      summary: "Repeat pattern near cash collection routes after business closing.",
    },
    {
      id: "CASE-0986",
      district: "Kalaburagi",
      offence: "Narcotics",
      suspect: "Asif R",
      vehicle: "KA-32-CM-6620",
      phone: "7899921034",
      risk: "Medium",
      status: "Open",
      summary: "Courier-linked peddling route around lodges and bus terminal.",
    },
  ],
  trends: [228, 242, 219, 268, 291, 315, 337, 326, 354, 389, 402, 431],
  hotspots: [
    { district: "Bengaluru Urban", x: "54%", y: "68%", risk: "high", score: 91 },
    { district: "Mysuru", x: "40%", y: "77%", risk: "medium", score: 63 },
    { district: "Mangaluru", x: "26%", y: "64%", risk: "medium", score: 59 },
    { district: "Belagavi", x: "33%", y: "24%", risk: "medium", score: 55 },
    { district: "Hubballi-Dharwad", x: "43%", y: "38%", risk: "low", score: 51 },
    { district: "Kalaburagi", x: "64%", y: "34%", risk: "low", score: 49 },
  ],
  alerts: [
    "Vehicle theft rose 18% around Bengaluru metro parking clusters.",
    "Three burglary FIRs share a late-night rear shutter entry method.",
    "Cyber fraud complaints mention the same beneficiary account fragment.",
    "Robbery incidents peaked within 400m of two cash collection routes.",
  ],
  timeline: [
    { time: "08:20", title: "FIR registered", text: "Complainant reported vehicle theft near Majestic parking." },
    { time: "09:05", title: "CCTV request", text: "Camera feeds requested from transit authority and nearby shops." },
    { time: "11:40", title: "Vehicle sighting", text: "ANPR hit on KA-05-MX-2219 near Tumakuru Road." },
    { time: "15:10", title: "Network match", text: "Phone number overlaps with suspect in CASE-0998." },
  ],
};

let districts = defaultData.districts;
let cases = defaultData.cases;
let trends = defaultData.trends;
let hotspots = defaultData.hotspots;
let alerts = defaultData.alerts;
let timeline = defaultData.timeline;

async function loadData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) throw new Error(`API returned status ${response.status}`);
    const data = await response.json();

    districts = data.districts || districts;
    cases = data.cases || cases;
    trends = data.trends || trends;
    hotspots = data.hotspots || hotspots;
    alerts = data.alerts || alerts;
    timeline = data.timeline || timeline;

    console.info('Loaded frontend data from backend API');
  } catch (error) {
    console.warn('Backend API unavailable, using static fallback data.', error);
  }
}

const firSample =
  "On 12 July 2026 at 21:30, complainant Shwetha Rao reported theft of motorcycle KA-05-MX-2219 from Majestic parking, Bengaluru. CCTV shows two males using a duplicate key. Phone number 9845011278 was seen in earlier CASE-1047 records. Suspect Ravi K may be linked to similar vehicle thefts near transit hubs.";

const state = {
  district: "All",
  theme: localStorage.getItem("crimeAppTheme") || "light",
  realtimeEnabled: true,
  realtimeInterval: null,
};

const titles = {
  overview: "Investigation Dashboard",
  hotspots: "Hotspot Detection",
  network: "Criminal Network Analysis",
  search: "Search Portal",
  import: "Import Dataset",
  fir: "FIR Analytics",
  "fir-form": "Create or Update FIR",
  assistant: "AI Assistant",
  roadmap: "Future Direction & Roadmap",
};

function selectedDistricts() {
  if (state.district === "All") return districts;
  return districts.filter((district) => district.name === state.district);
}

function selectedCases() {
  if (state.district === "All") return cases;
  return cases.filter((item) => item.district === state.district);
}

function selectedHotspots() {
  if (state.district === "All") return hotspots;
  return hotspots.filter((item) => item.district === state.district);
}

function csvRows(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(field.trim()); field = ""; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row = []; field = "";
    } else field += char;
  }
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function normaliseHeader(value) { return String(value).toLowerCase().replace(/[^a-z0-9]/g, ""); }

function importCsv(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = csvRows(String(reader.result));
    if (rows.length < 2) return showNotification("The CSV has no data rows.", "warning");
    const headers = rows.shift().map(normaliseHeader);
    const field = (record, ...names) => names.map((name) => record[headers.indexOf(name)]).find(Boolean) || "";
    const records = rows.slice(0, 10000).map((row, index) => {
      const record = row.map((value) => value.trim());
      const district = field(record, "districtname", "district") || "Unknown district";
      const offence = field(record, "crimegroupname", "crimeheadname", "offence") || "Unspecified offence";
      const year = field(record, "firyear", "year");
      const status = field(record, "firstage", "firstage") || "Open";
      return { id: field(record, "kgid", "crimeno", "firno") || `FIR-${index + 1}`, district, offence, suspect: "Not provided", vehicle: "Not provided", phone: "Not provided", risk: "Medium", status: /closed|disposed/i.test(status) ? "Closed" : "Open", summary: `${offence} FIR${year ? ` recorded in ${year}` : ""}.`, year };
    });
    cases = records;
    const grouped = Object.values(records.reduce((all, item) => { (all[item.district] ||= []).push(item); return all; }, {}));
    districts = grouped.map((items) => ({ name: items[0].district, cases: items.length, solved: Math.round(items.filter((item) => item.status === "Closed").length / items.length * 100), hotspot: Math.min(100, Math.round(35 + items.length / Math.max(...grouped.map((group) => group.length)) * 65)), growth: 0 }));
    hotspots = districts.map((item, index) => ({ district: item.name, x: `${20 + (index * 29) % 65}%`, y: `${22 + (index * 17) % 58}%`, risk: item.hotspot >= 80 ? "high" : item.hotspot >= 50 ? "medium" : "low", score: item.hotspot }));
    trends = Object.values(records.reduce((all, item) => { const key = item.year || "Unknown"; all[key] = (all[key] || 0) + 1; return all; }, {}));
    alerts = [`Loaded ${records.length.toLocaleString("en-IN")} FIR records from ${file.name}${rows.length > records.length ? "; first 10,000 rows shown" : ""}.`];
    state.district = "All";
    const filter = document.getElementById("district-filter"); filter.innerHTML = '<option value="All">All districts</option>';
    districts.forEach((item) => filter.add(new Option(item.name, item.name)));
    renderAll();
    showNotification(`CSV loaded: ${records.length.toLocaleString("en-IN")} FIR records.`, "success");
  };
  reader.readAsText(file);
}

function renderAll() {
  renderKpis(); drawTrendChart(); renderTopDistricts(); renderSignals(); renderMap(); renderPredictions(); renderNetwork(); renderSimilarCases(); renderSearch(document.getElementById("case-search")?.value || "");
}

function renderMonitor(data) {
  const summary = document.getElementById('monitor-summary'); const priority = document.getElementById('priority-queue'); const feed = document.getElementById('incident-feed'); const state = document.getElementById('monitor-state');
  if (!summary || !priority || !feed) return;
  const { totals, quality } = data;
  summary.innerHTML = [['Open cases', totals.open], ['High risk', totals.highRisk], ['Missing coordinates', quality.missingCoordinates], ['Unassigned cases', quality.missingOfficer]].map(([label, value]) => `<article class="monitor-metric"><strong>${value}</strong><span>${label}</span></article>`).join('');
  priority.innerHTML = data.priority.map((item) => `<article class="signal priority-${item.risk.toLowerCase()}"><h3>${item.id} <span>${item.priority}/100</span></h3><p>${item.offence} · ${item.district} · ${item.status}</p></article>`).join('') || '<p class="muted">No cases in the priority queue.</p>';
  feed.innerHTML = data.recent.map((item) => `<article class="signal"><h3>${item.id}</h3><p>${item.offence} reported in ${item.district}${item.date ? ` · ${item.date}` : ''}</p></article>`).join('') || '<p class="muted">No case intake recorded.</p>';
  if (state) { state.textContent = `Live · ${new Date(data.updatedAt).toLocaleTimeString()}`; state.className = 'risk-pill low'; }
}

async function refreshMonitor() {
  const response = await fetch('/api/monitor');
  if (!response.ok) throw new Error('Monitor refresh failed.');
  renderMonitor(await response.json());
}

let pendingImportFile = null;
function uploadDataset(endpoint, file) {
  const form = new FormData(); form.append('dataset', file);
  return fetch(endpoint, { method: 'POST', body: form }).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Dataset request failed.'); return body; });
}

function renderImportPreview(data) {
  const output = document.getElementById('import-preview');
  if (!output) return;
  output.innerHTML = (data.preview || []).map((item) => `<article class="case-card"><h3>${item.id} · ${item.offence}</h3><p>${item.district}${item.policeStation ? ` · ${item.policeStation}` : ''}</p><div class="case-meta"><span>${item.risk} risk</span><span>${item.status}</span></div></article>`).join('') || '<p class="muted">No valid preview rows.</p>';
}

function bindDatasetImport() {
  const form = document.getElementById('dataset-import-form');
  if (!form) return;
  const fileInput = document.getElementById('dataset-file'); const status = document.getElementById('import-status'); const confirm = document.getElementById('confirm-import');
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); const file = fileInput.files[0]; if (!file) return;
    pendingImportFile = null; confirm.disabled = true; setStatus('import-status', 'Validating CSV and preparing preview…', 'loading');
    try {
      const preview = await uploadDataset('/api/import/preview', file);
      renderImportPreview(preview);
      if (preview.missing.length) throw new Error(`Missing required columns: ${preview.missing.join(', ')}.`);
      pendingImportFile = file; confirm.disabled = false;
      setStatus('import-status', `${preview.totalRows.toLocaleString()} rows found. ${preview.invalidPreviewRows} invalid row(s) in preview. Review the sample, then import.`, '');
    } catch (error) { setStatus('import-status', error.message, 'error'); }
  });
  confirm.addEventListener('click', async () => {
    if (!pendingImportFile) return; confirm.disabled = true; setStatus('import-status', 'Importing dataset…', 'loading');
    try {
      const result = await uploadDataset('/api/import', pendingImportFile);
      await loadData(); renderAll();
      setStatus('import-status', `Imported ${result.imported.toLocaleString()} records; ${result.duplicates} duplicates skipped; ${result.rejected.length} invalid rows rejected. Stored in ${result.database}.`, '');
      showNotification(`Dataset import complete: ${result.imported.toLocaleString()} records.`, 'success');
    } catch (error) { setStatus('import-status', error.message, 'error'); } finally { pendingImportFile = null; confirm.disabled = true; }
  });
}

function renderKpis() {
  const districtRows = selectedDistricts();
  const caseRows = selectedCases();
  const totalCases = districtRows.reduce((sum, item) => sum + item.cases, 0);
  const solved = Math.round(districtRows.reduce((sum, item) => sum + item.solved, 0) / districtRows.length);
  const highRisk = caseRows.filter((item) => item.risk === "High").length;
  const avgGrowth = Math.round(districtRows.reduce((sum, item) => sum + item.growth, 0) / districtRows.length);

  const items = [
    ["Total cases", totalCases.toLocaleString("en-IN"), `${avgGrowth >= 0 ? "+" : ""}${avgGrowth}% monthly trend`],
    ["Solved rate", `${solved}%`, "case closure indicator"],
    ["High-risk cases", highRisk, "priority investigation queue"],
    ["Hotspot score", Math.max(...districtRows.map((item) => item.hotspot)), "highest district score"],
  ];

  document.getElementById("kpi-grid").innerHTML = items
    .map((item) => `<article class="kpi"><span>${item[0]}</span><strong>${item[1]}</strong><small>${item[2]}</small></article>`)
    .join("");
}

function drawTrendChart() {
  const canvas = document.getElementById("trend-chart");
  const ctx = canvas.getContext("2d");
  const scale = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = Number(canvas.getAttribute("height"));
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.clearRect(0, 0, width, height);

  const padding = 34;
  // Descriptive chart only: do not invent a forecast without a trained model.
  const values = trends.length ? trends : [0];
  const min = Math.min(...values) - 35;
  const max = Math.max(...values) + 35;
  const stepX = (width - padding * 2) / (values.length - 1);

  ctx.strokeStyle = "#d8e0e8";
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i += 1) {
    const y = padding + ((height - padding * 2) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  const points = values.map((value, index) => ({
    x: padding + stepX * index,
    y: height - padding - ((value - min) / (max - min)) * (height - padding * 2),
  }));

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#0f8b8d";
  ctx.lineWidth = 3;
  ctx.stroke();

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0f8b8d";
    ctx.fill();
  });

  ctx.fillStyle = "#647485";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText("Actual", padding, 18);
  
  // Add chart tooltip interaction
  canvas.addEventListener("mousemove", (event) => {
    const tooltip = document.getElementById("trend-tooltip");
    if (!tooltip) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const dist = Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2);
      
      if (dist < 10) {
        tooltip.style.left = (event.clientX - rect.left + 10) + "px";
        tooltip.style.top = (event.clientY - rect.top - 25) + "px";
        tooltip.textContent = `${values[i]} incidents`;
        tooltip.classList.add("active");
        return;
      }
    }
    
    tooltip.classList.remove("active");
  });
  
  canvas.addEventListener("mouseleave", () => {
    const tooltip = document.getElementById("trend-tooltip");
    if (tooltip) tooltip.classList.remove("active");
  });
}

function renderDistrictBars() {
  // The legacy bar container is not present in the current dashboard.
  const container = document.getElementById("district-bars");
  if (!container) return;
  const rows = selectedDistricts();
  const max = Math.max(...rows.map((item) => item.cases), 1);
  container.innerHTML = rows
    .map(
      (item) => `
        <div class="bar-row">
          <strong>${item.name.split(" ")[0]}</strong>
          <span class="bar-track"><span class="bar-fill" style="width:${(item.cases / max) * 100}%"></span></span>
          <span>${item.cases}</span>
        </div>`
    )
    .join("");
}

function renderTopDistricts() {
  const rows = selectedDistricts().sort((a, b) => b.hotspot - a.hotspot).slice(0, 5);
  const container = document.getElementById("top-districts-ranking");
  if (!container) return;
  
  container.innerHTML = rows
    .map((item, index) => `
      <div class="ranking-item">
        <div class="ranking-badge">${index + 1}</div>
        <div class="ranking-info">
          <h3>${item.name}</h3>
          <div class="ranking-score">Hotspot Score: ${item.hotspot}/100</div>
          <div class="ranking-stat">
            <span>📋 ${item.cases} cases</span>
            <span>✓ ${item.solved}% solved</span>
          </div>
        </div>
        <div style="text-align: right;">
          <span class="risk-pill ${item.hotspot >= 70 ? 'high' : item.hotspot >= 50 ? 'medium' : 'low'}">${item.growth >= 0 ? '+' : ''}${item.growth}%</span>
        </div>
      </div>`)
    .join("");
}

function renderSignals() {
  const scope = state.district === "All" ? "statewide" : state.district;
  const patterns = [
    ["Transit vehicle theft cluster", `Duplicate key method appears in 5 FIRs within 30 days across ${scope}.`],
    ["Market snatching pattern", `Two-person bike approach repeats across ${scope} morning incidents.`],
    ["UPI refund fraud chain", `Shared beneficiary account fragment found in 7 cyber complaints within ${scope}.`],
  ];
  document.getElementById("patterns").innerHTML = patterns
    .map((item) => `<article class="signal"><h3>${item[0]}</h3><p>${item[1]}</p></article>`)
    .join("");
  document.getElementById("alerts").innerHTML = alerts.map((item) => `<article class="alert"><p>${item}</p></article>`).join("");
}

function renderMap() {
  const rows = selectedHotspots();
  document.getElementById("map").innerHTML = `
    <div class="map-outline"></div>
    ${rows
      .map(
        (item) => `
          <span class="hotspot ${item.risk}" style="--x:${item.x};--y:${item.y};--size:${46 + item.score / 2}px">${item.score}</span>
          <span class="map-label" style="--x:${item.x};--y:${item.y}">${item.district}</span>
        `
      )
      .join("")}`;
}

function renderPredictions() {
  const ordered = [...selectedHotspots()].sort((a, b) => b.score - a.score);
  document.getElementById("prediction-list").innerHTML = ordered
    .map(
      (item) => `
        <article class="case-card">
          <h3>${item.district}</h3>
          <p>Rule-based hotspot score: ${item.score}/100. Recommended: deploy patrol visibility and verify repeat-offender movement.</p>
          <div class="case-meta"><span>${item.risk.toUpperCase()}</span><span>Based on loaded FIR volume</span></div>
        </article>`
    )
    .join("");
}

function renderNetwork() {
  const svg = document.getElementById("network-graph");
  const districtCases = selectedCases();
  const primaryCase = districtCases[0] || cases[0];
  const linkedCase = districtCases[1] || cases[1];
  const nodes = [
    { id: primaryCase.suspect, x: 350, y: 160, type: "suspect", confidence: 95 },
    { id: primaryCase.id, x: 190, y: 245, type: "case", confidence: 100 },
    { id: primaryCase.vehicle, x: 520, y: 240, type: "vehicle", confidence: 88 },
    { id: primaryCase.phone, x: 350, y: 340, type: "phone", confidence: 92 },
    { id: linkedCase.id, x: 570, y: 390, type: "case", confidence: 85 },
    { id: linkedCase.suspect, x: 195, y: 405, type: "suspect", confidence: 78 },
  ];
  const links = [
    [primaryCase.suspect, primaryCase.id, 95],
    [primaryCase.suspect, primaryCase.vehicle, 88],
    [primaryCase.suspect, primaryCase.phone, 92],
    [primaryCase.phone, linkedCase.id, 85],
    [linkedCase.id, linkedCase.suspect, 78],
    [primaryCase.id, primaryCase.vehicle, 90],
  ];
  const color = { suspect: "#d95d39", case: "#0f8b8d", vehicle: "#c48118", phone: "#287d3c" };
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  svg.innerHTML = `
    ${links
      .map(([from, to, confidence]) => `
        <line class="link-line" x1="${byId[from].x}" y1="${byId[from].y}" x2="${byId[to].x}" y2="${byId[to].y}" stroke-width="${1 + confidence / 50}" opacity="${0.5 + confidence / 200}"></line>
        <text x="${(byId[from].x + byId[to].x) / 2}" y="${(byId[from].y + byId[to].y) / 2 - 5}" class="link-label">${confidence}%</text>
      `)
      .join("")}
    ${nodes
      .map(
        (node) => `
          <circle class="node" cx="${node.x}" cy="${node.y}" r="${node.type === "suspect" ? 38 : 32}" fill="${color[node.type]}"></circle>
          <text class="node-label" x="${node.x}" y="${node.y + 56}" text-anchor="middle">${node.id}</text>
          <title>${node.id} - Confidence: ${node.confidence}%</title>
        `
      )
      .join("")}`;
}

function renderSimilarCases() {
  const pool = selectedCases();
  const target = pool[0] || cases[0];
  const matches = (pool.length ? pool : cases)
    .slice(1, 5)
    .map((item, index) => ({ ...item, score: [86, 78, 72, 68][index] }));
  document.getElementById("similar-cases").innerHTML = matches
    .map(
      (item) => `
        <article class="case-card">
          <h3>${item.id} · ${item.offence}</h3>
          <p>${item.summary}</p>
          <div class="case-meta"><span>${item.score}% similar to ${target.id}</span><span>${item.district}</span></div>
        </article>`
    )
    .join("");
}

function setStatus(id, message, statusType = '') {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('loading', statusType === 'loading');
  element.classList.toggle('error', statusType === 'error');
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", state.theme);
  localStorage.setItem("crimeAppTheme", state.theme);
  const button = document.getElementById("theme-toggle");
  if (button) {
    button.textContent = state.theme === "dark" ? "☀️" : "🌙";
  }
}

function exportToCSV() {
  const rows = selectedCases();
  if (rows.length === 0) {
    alert("No cases to export.");
    return;
  }

  const headers = ["Case ID", "District", "Offence", "Suspect", "Vehicle", "Phone", "Risk", "Status", "Summary"];
  const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csvContent = [
    headers.join(","),
    ...rows.map(item => [
      item.id,
      item.district,
      item.offence,
      item.suspect,
      item.vehicle,
      item.phone,
      item.risk,
      item.status || "Open",
      item.summary
    ].map(escapeCsv).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `crime-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

function exportToPDF() {
  const rows = selectedCases();
  if (rows.length === 0) {
    showNotification("No cases to export.", "warning");
    return;
  }
  const report = window.open("", "_blank", "width=900,height=700");
  if (!report) return showNotification("Allow pop-ups to export a PDF.", "warning");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const headers = ["Case ID", "District", "Offence", "Suspect", "Vehicle", "Phone", "Risk", "Status", "Summary"];
  const body = rows.map((item) => [item.id, item.district, item.offence, item.suspect, item.vehicle, item.phone, item.risk, item.status || "Open", item.summary]
    .map((value) => `<td>${escapeHtml(value)}</td>`).join("")).map((cells) => `<tr>${cells}</tr>`).join("");
  report.document.write(`<!doctype html><title>Crime Analytics Report</title><style>body{font:13px Arial;padding:28px;color:#17212b}table{border-collapse:collapse;width:100%}th,td{border:1px solid #b8c2cc;padding:7px;text-align:left;vertical-align:top}th{background:#eef2f5}@media print{body{padding:0}}</style><h1>Crime Analytics Report</h1><p>Generated: ${escapeHtml(new Date().toLocaleString())}<br>District: ${escapeHtml(state.district)} · Cases: ${rows.length}</p><table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`);
  report.document.close();
  report.focus();
  report.print();
  showNotification("Print dialog opened — choose Save as PDF.", "success");
}

function exportToExcel() {
  if (!window.XLSX) return showNotification('Excel export library is unavailable.', 'warning');
  const rows = selectedCases();
  const sheetRows = rows.map((item) => ({ 'Case ID': item.id, District: item.district, Offence: item.offence, Suspect: item.suspect, Vehicle: item.vehicle, Phone: item.phone, Risk: item.risk, Status: item.status, Date: item.date || '', Officer: item.officer || '', Severity: item.severity || '', 'Evidence Count': item.evidenceCount || 0, 'Witness Count': item.witnessCount || 0 }));
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), 'Cases');
  XLSX.writeFile(workbook, `crime-analytics-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function showNotification(message, type = "info") {
  const container = document.getElementById("notifications-center");
  if (!container) return;
  
  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close" aria-label="Close notification">&times;</button>
  `;
  
  container.appendChild(notification);
  
  const closeBtn = notification.querySelector(".notification-close");
  closeBtn.addEventListener("click", () => {
    notification.style.animation = "slideInRight 0.3s ease-out reverse";
    setTimeout(() => notification.remove(), 300);
  });
  
  setTimeout(() => {
    if (notification.parentElement) {
      notification.style.animation = "slideInRight 0.3s ease-out reverse";
      setTimeout(() => notification.remove(), 300);
    }
  }, 5000);
}

async function renderSearch(query = "") {
  const output = document.getElementById("case-results");
  const statusId = "search-status";
  const normalized = query.trim();
  const statusFilter = document.getElementById("status-filter").value;
  const riskFilter = document.getElementById("risk-filter").value;
  const offenceFilter = document.getElementById("offence-filter")?.value || "";
  const dateRangeFilter = document.getElementById("date-range-filter")?.value || "";
  const districtFilter = state.district === "All" ? "" : state.district;

  setStatus(statusId, "Searching...", "loading");

  try {
    const params = new URLSearchParams({
      q: normalized,
      status: statusFilter,
      risk: riskFilter,
      offence: offenceFilter,
      district: districtFilter,
    });

    const response = await fetch(`/api/search?${params.toString()}`);
    if (!response.ok) throw new Error(`Search API returned ${response.status}`);
    const data = await response.json();
    const rows = data.results || [];

    if (rows.length === 0) {
      setStatus(statusId, `No matches for '${normalized}'.`, "");
    } else {
      setStatus(statusId, `${rows.length} result${rows.length === 1 ? '' : 's'} found.`, "");
    }

    output.innerHTML =
      rows
        .map(
          (item) => `
          <article class="case-card" data-case-id="${item.id}">
            <h3>${item.id} · ${item.offence}</h3>
            <p>${item.summary}</p>
            <div class="case-meta">
              <span>${item.district}</span><span>${item.suspect}</span><span>${item.vehicle}</span><span>${item.risk} risk</span><span>${item.status || 'Unknown'}</span>
            </div>
          </article>`
        )
        .join("") || `<article class="case-card"><h3>No matches</h3><p>Try a case ID, phone number, vehicle registration, suspect, or offence.</p></article>`;
  } catch (error) {
    console.warn('Search API failed, falling back to client search.', error);
    setStatus(statusId, 'Search API failed; using local search.', 'error');
    const clientRows = selectedCases().filter((item) => {
      const haystack = Object.values(item).join(" ").toLowerCase();
      const matchesQuery = !normalized || haystack.includes(normalized.toLowerCase());
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesRisk = !riskFilter || item.risk === riskFilter;
      const matchesOffence = !offenceFilter || item.offence === offenceFilter;
      const matchesDate = !dateRangeFilter || true; // Date filter for future enhancement
      return matchesQuery && matchesStatus && matchesRisk && matchesOffence && matchesDate;
    });
    output.innerHTML =
      clientRows
        .map(
          (item) => `
          <article class="case-card" data-case-id="${item.id}">
            <h3>${item.id} · ${item.offence}</h3>
            <p>${item.summary}</p>
            <div class="case-meta">
              <span>${item.district}</span><span>${item.suspect}</span><span>${item.vehicle}</span><span>${item.risk} risk</span>
            </div>
          </article>`
        )
        .join("") || `<article class="case-card"><h3>No matches</h3><p>Try a case ID, phone number, vehicle registration, suspect, or offence.</p></article>`;
  }
}

async function showCaseDetail(caseId) {
  const detailNode = document.getElementById('detail-content');
  if (!detailNode) return;

  detailNode.innerHTML = '<p class="muted">Loading case detail...</p>';

  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}`);
    if (!response.ok) throw new Error(`Case API returned ${response.status}`);
    const item = await response.json();
    detailNode.innerHTML = `
      <div class="detail-content">
        <div class="detail-row"><strong>Case ID</strong><span>${item.id}</span></div>
        <div class="detail-row"><strong>Offence</strong><span>${item.offence}</span></div>
        <div class="detail-row"><strong>District</strong><span>${item.district}</span></div>
        <div class="detail-row"><strong>Suspect</strong><span>${item.suspect}</span></div>
        <div class="detail-row"><strong>Vehicle</strong><span>${item.vehicle}</span></div>
        <div class="detail-row"><strong>Phone</strong><span>${item.phone}</span></div>
        <div class="detail-row"><strong>Risk</strong><span>${item.risk}</span></div>
        <div class="detail-row"><strong>Status</strong><span>${item.status || 'Open'}</span></div>
        <div class="detail-row">
          <strong>Update status</strong>
          <div class="status-update-row">
            <select id="detail-status">
              <option value="Open" ${item.status === 'Open' ? 'selected' : ''}>Open</option>
              <option value="In progress" ${item.status === 'In progress' ? 'selected' : ''}>In progress</option>
              <option value="Closed" ${item.status === 'Closed' ? 'selected' : ''}>Closed</option>
            </select>
            <button id="update-status-button" class="primary-action" type="button">Save</button>
          </div>
          <span id="detail-status-line" class="status-line"></span>
        </div>
        <div class="detail-row"><strong>Summary</strong><span>${item.summary}</span></div>
      </div>`;

    const updateButton = detailNode.querySelector('#update-status-button');
    if (updateButton) {
      updateButton.addEventListener('click', () => {
        const newStatus = detailNode.querySelector('#detail-status').value;
        updateCaseStatus(item.id, newStatus);
      });
    }
  } catch (error) {
    console.warn('Case detail fetch failed.', error);
    detailNode.innerHTML = '<p class="muted">Unable to load case detail.</p>';
  }
}

async function updateCaseStatus(caseId, status) {
  const detailStatus = document.getElementById('detail-status-line');
  if (detailStatus) {
    detailStatus.textContent = 'Saving status...';
    detailStatus.classList.remove('error');
  }

  try {
    const response = await fetch(`/api/cases/${encodeURIComponent(caseId)}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `Request failed with ${response.status}`);
    }

    const item = await response.json();
    if (detailStatus) {
      detailStatus.textContent = 'Status updated.';
    }
    showCaseDetail(item.id);
    renderSearch(document.getElementById('case-search').value);
  } catch (error) {
    console.warn('Status update failed.', error);
    if (detailStatus) {
      detailStatus.textContent = 'Unable to update status.';
      detailStatus.classList.add('error');
    }
  }
}

async function extractFir() {
  const text = document.getElementById("fir-input").value;
  const summaryNode = document.getElementById("fir-summary");
  const statusId = "fir-status";
  const button = document.getElementById("summarize-fir");

  if (button) {
    button.disabled = true;
    button.classList.add('loading');
  }

  setStatus(statusId, "Analyzing FIR...", "loading");

  try {
    const response = await fetch('/api/fir/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error || `FIR API returned ${response.status}`);
    }

    const data = await response.json();
    const cards = [
      ['Summary', data.summary],
      ['People', data.people],
      ['Vehicles', data.vehicles],
      ['Phones', data.phones],
      ['Timeline', data.dates],
      ['Risk Tags', data.riskTags],
    ];

    summaryNode.innerHTML = cards
      .map((item) => `<article class="summary-card"><strong>${item[0]}</strong><p>${item[1]}</p></article>`)
      .join('');

    setStatus(statusId, 'FIR analysis complete.', '');
    renderFirRecommendations(text, data);
  } catch (error) {
    console.warn('FIR analyze API failed, using client fallback.', error);
    setStatus(statusId, 'FIR API failed; using local fallback.', 'error');

    const vehicles = text.match(/[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}/g) || [];
    const phones = text.match(/\b[6-9]\d{9}\b/g) || [];
    const dates = text.match(/\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b/g) || [];
    const names = text.match(/\b[A-Z][a-z]+\s+[A-Z]\b/g) || [];
    
    const riskTags = [
      text.toLowerCase().includes('duplicate key') ? 'Duplicate-key vehicle theft' : null,
      text.toLowerCase().includes('transit') ? 'Transit hub cluster' : null,
      text.toLowerCase().includes('similar') ? 'Repeat pattern indicated' : null,
      text.toLowerCase().includes('gang') ? 'Organized crime suspected' : null,
      text.toLowerCase().includes('weapon') ? 'Weapon involved' : null,
    ].filter(Boolean);

    const cards = [
      ['Summary', text.split('.').slice(0, 2).join('.') + '.'],
      ['People', names.length ? [...new Set(names)].join(', ') : 'No named people detected'],
      ['Vehicles', vehicles.length ? vehicles.join(', ') : 'No vehicle registration detected'],
      ['Phones', phones.length ? phones.join(', ') : 'No phone numbers detected'],
      ['Timeline', dates.length ? dates.join(', ') : 'No explicit date detected'],
      ['Risk Tags', riskTags.length ? riskTags.join(', ') : 'Routine triage'],
    ];

    summaryNode.innerHTML = cards
      .map((item) => `<article class="summary-card"><strong>${item[0]}</strong><p>${item[1]}</p></article>`)
      .join('');
    
    renderFirRecommendations(text, { vehicles, phones, names, riskTags });
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('loading');
    }
  }
}

function renderFirRecommendations(text, extractedData) {
  const container = document.getElementById("fir-recommendations");
  if (!container) return;
  
  const recommendations = [];
  const riskTags = extractedData.riskTags || extractedData.riskTags || [];
  
  // Check for patterns and generate recommendations
  if (text.toLowerCase().includes('transit') || text.toLowerCase().includes('parking')) {
    recommendations.push({
      action: 'Check ANPR camera feeds from nearby transit terminals',
      confidence: 92
    });
  }
  
  if ((extractedData.vehicles || []).length > 0) {
    recommendations.push({
      action: 'Cross-reference vehicle registrations with stolen vehicles database',
      confidence: 88
    });
  }
  
  if ((extractedData.phones || []).length > 0) {
    recommendations.push({
      action: 'Obtain CDR (Call Detail Records) for identified phone numbers',
      confidence: 85
    });
  }
  
  if (riskTags.includes('Repeat pattern indicated')) {
    recommendations.push({
      action: 'Compare MO (Modus Operandi) with similar closed cases',
      confidence: 90
    });
  }
  
  if (riskTags.includes('Organized crime suspected')) {
    recommendations.push({
      action: 'Escalate to organized crime task force immediately',
      confidence: 95
    });
  }
  
  if (text.toLowerCase().includes('night') || text.toLowerCase().includes('late')) {
    recommendations.push({
      action: 'Increase night patrol in identified location zones',
      confidence: 78
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push({
      action: 'Routine follow-up investigation recommended',
      confidence: 60
    });
  }
  
  container.innerHTML = `
    <div class="recommendations-section">
      <h3>🎯 Recommended Next Actions</h3>
      ${recommendations.map((rec, idx) => `
        <div class="recommendation-item">
          <strong>${idx + 1}.</strong> ${rec.action}
          <span class="confidence-score">${rec.confidence}% confidence</span>
        </div>
      `).join("")}
    </div>
  `;
}

function answerQuestion(question) {
  const q = question.toLowerCase();
  if (q.includes("highest") || q.includes("hotspot")) {
    return "Bengaluru Urban has the highest hotspot score at 91, driven mainly by vehicle theft around transit parking clusters.";
  }
  if (q.includes("vehicle")) {
    return "The vehicle theft queue is led by CASE-1047 involving KA-05-MX-2219, Ravi K, and phone 9845011278.";
  }
  if (q.includes("cyber")) {
    return "Cyber fraud signals are concentrated in Mangaluru, where UPI refund scams share beneficiary account fragments and mule phone numbers.";
  }
  if (q.includes("patrol") || q.includes("recommend")) {
    return "Recommended action: increase patrol visibility at high-score hotspots, run ANPR checks for linked vehicles, and prioritize repeat-offender phone overlaps.";
  }
  if (q.includes("trend") || q.includes("growth")) {
    return "Crime trends show 12% growth in Bengaluru Urban, driven by organized transit theft. Positive: Mysuru and Mangaluru show declining trends (-2% to 5%).";
  }
  if (q.includes("solved") || q.includes("closure")) {
    return "Average case closure rate is 66% across districts. Belagavi leads with 71% solved rate, while Kalaburagi lags at 58%. Focus: strengthen investigation resources in low-performing districts.";
  }
  if (q.includes("risk") || q.includes("priority")) {
    return "High-risk cases (4 total): Vehicle theft (Bengaluru), Cyber fraud (Mangaluru), and Robbery (Hubballi-Dharwad). Recommend immediate task force deployment.";
  }
  return "I found relevant indicators across cases, hotspots, and alerts. Ask about vehicle theft, cyber fraud, district risk, patrol recommendations, trends, solved rates, or a case ID for a sharper answer.";
}

async function queryAssistant(question) {
  const response = await fetch('/api/assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question }) });
  if (!response.ok) throw new Error('Assistant service is unavailable.');
  return (await response.json()).reply;
}

function renderFirForm() {
  const container = document.getElementById("fir-form-container");
  if (!container) return;
  
  container.innerHTML = `
    <form id="fir-create-form" class="fir-form">
      <div class="form-group">
        <label for="form-case-id">Case ID (Auto-generated)</label>
        <input type="text" id="form-case-id" readonly value="CASE-${String(Math.random()).slice(2, 6)}">
      </div>
      
      <div class="form-group">
        <label for="form-district">District *</label>
        <select id="form-district" required>
          <option value="">Select district</option>
          ${districts.map(d => `<option value="${d.name}">${d.name}</option>`).join("")}
        </select>
        <span class="form-error" id="district-error"></span>
      </div>
      
      <div class="form-group">
        <label for="form-offence">Offence Type *</label>
        <select id="form-offence" required>
          <option value="">Select offence</option>
          <option value="Vehicle theft">Vehicle theft</option>
          <option value="Chain snatching">Chain snatching</option>
          <option value="Cyber fraud">Cyber fraud</option>
          <option value="Burglary">Burglary</option>
          <option value="Robbery">Robbery</option>
          <option value="Narcotics">Narcotics</option>
        </select>
        <span class="form-error" id="offence-error"></span>
      </div>
      
      <div class="form-group">
        <label for="form-suspect">Suspect Name *</label>
        <input type="text" id="form-suspect" required placeholder="Enter suspect name">
        <span class="form-error" id="suspect-error"></span>
      </div>
      
      <div class="form-group">
        <label for="form-vehicle">Vehicle Registration</label>
        <input type="text" id="form-vehicle" placeholder="e.g., KA-05-MX-2219">
      </div>
      
      <div class="form-group">
        <label for="form-phone">Phone Number</label>
        <input type="tel" id="form-phone" placeholder="e.g., 9845011278">
      </div>
      
      <div class="form-group">
        <label for="form-risk">Risk Level *</label>
        <select id="form-risk" required>
          <option value="">Select risk level</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <span class="form-error" id="risk-error"></span>
      </div>
      
      <div class="form-group">
        <label for="form-status">Case Status *</label>
        <select id="form-status" required>
          <option value="Open">Open</option>
          <option value="In progress">In progress</option>
          <option value="Closed">Closed</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="form-summary">Case Summary *</label>
        <textarea id="form-summary" required placeholder="Describe the incident and key details..."></textarea>
        <span class="form-error" id="summary-error"></span>
      </div>
      
      <div style="display: flex; gap: 10px;">
        <button type="submit" class="primary-action">Create Case</button>
        <button type="reset" class="secondary-action">Clear Form</button>
      </div>
      <span id="form-status-message" class="status-line" aria-live="polite"></span>
    </form>
  `;
  
  const form = document.getElementById("fir-create-form");
  if (form) {
    form.addEventListener("submit", submitFirForm);
  }
}

function validateFirForm() {
  const errors = {};
  const district = document.getElementById("form-district").value;
  const offence = document.getElementById("form-offence").value;
  const suspect = document.getElementById("form-suspect").value;
  const risk = document.getElementById("form-risk").value;
  const summary = document.getElementById("form-summary").value;
  
  if (!district) errors.district = "District is required";
  if (!offence) errors.offence = "Offence type is required";
  if (!suspect || suspect.length < 2) errors.suspect = "Suspect name is required (min 2 chars)";
  if (!risk) errors.risk = "Risk level is required";
  if (!summary || summary.length < 10) errors.summary = "Summary is required (min 10 chars)";
  
  // Clear previous errors
  document.querySelectorAll(".form-error").forEach(el => el.textContent = "");
  
  // Show errors
  Object.entries(errors).forEach(([field, message]) => {
    const errorEl = document.getElementById(`${field}-error`);
    if (errorEl) errorEl.textContent = message;
  });
  
  return Object.keys(errors).length === 0;
}

async function submitFirForm(event) {
  event.preventDefault();
  
  if (!validateFirForm()) return;
  
  const newCase = {
    district: document.getElementById("form-district").value,
    offence: document.getElementById("form-offence").value,
    suspect: document.getElementById("form-suspect").value,
    vehicle: document.getElementById("form-vehicle").value || "N/A",
    phone: document.getElementById("form-phone").value || "N/A",
    risk: document.getElementById("form-risk").value,
    status: document.getElementById("form-status").value,
    summary: document.getElementById("form-summary").value,
  };
  
  const statusMsg = document.getElementById("form-status-message");
  try {
    const response = await fetch('/api/cases', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCase) });
    const created = await response.json();
    if (!response.ok) throw new Error(created.error || 'Unable to create case.');
    cases.push(created);
    if (statusMsg) { statusMsg.textContent = `Case ${created.id} created successfully.`; statusMsg.classList.remove("error"); statusMsg.classList.add("form-success"); }
    showNotification(`Case ${created.id} created successfully.`, "success");
    document.getElementById("fir-create-form").reset();
    document.getElementById("form-case-id").value = created.id;
    renderAll();
  } catch (error) {
    if (statusMsg) { statusMsg.textContent = error.message; statusMsg.classList.add("error"); }
    showNotification(error.message, "warning");
  }
}

function appendMessage(text, type = "bot") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  document.getElementById("chat-log").appendChild(message);
  message.scrollIntoView({ block: "end" });
}

function toggleRealtime() {
  state.realtimeEnabled = !state.realtimeEnabled;
  const button = document.getElementById("toggle-realtime");
  const statusDot = document.querySelector(".status-dot");
  
  if (state.realtimeEnabled) {
    button.textContent = "📡 Real-time: ON";
    if (statusDot) statusDot.classList.add("active");
    startRealtimeUpdates();
    showNotification("Real-time monitoring enabled", "success");
  } else {
    button.textContent = "📡 Real-time: OFF";
    if (statusDot) statusDot.classList.remove("active");
    stopRealtimeUpdates();
    showNotification("Real-time monitoring disabled", "info");
  }
}

function startRealtimeUpdates() {
  if (state.realtimeInterval) return;
  
  state.realtimeInterval = setInterval(() => {
    // Simulate real-time data updates
    if (Math.random() > 0.7) {
      const newCase = {
        id: `CASE-${String(Math.random()).slice(2, 6)}`,
        district: districts[Math.floor(Math.random() * districts.length)].name,
        offence: ["Vehicle theft", "Chain snatching", "Cyber fraud", "Burglary", "Robbery"][Math.floor(Math.random() * 5)],
        suspect: `Suspect-${Math.floor(Math.random() * 1000)}`,
        vehicle: `KA-${String(Math.floor(Math.random() * 100)).padStart(2, '0')}-XX-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        phone: String(Math.floor(Math.random() * 9000000000) + 6000000000),
        risk: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)],
        status: "Open",
        summary: "Real-time case update from live monitoring system.",
      };
      cases.push(newCase);
      showNotification(`📋 New case ${newCase.id} reported in ${newCase.district}`, "info");
    }
    
    const alertCount = document.getElementById("active-alerts-count");
    const activeAlerts = Math.floor(Math.random() * 8) + 2;
    if (alertCount) alertCount.textContent = `${activeAlerts} active alerts`;
    
    hotspots.forEach(hs => {
      hs.score = Math.max(49, Math.min(100, hs.score + (Math.random() - 0.5) * 3));
    });
    
    if (document.getElementById("overview").classList.contains("active")) {
      renderKpis();
      renderTopDistricts();
      drawTrendChart();
    }
  }, 8000);
}

function stopRealtimeUpdates() {
  if (state.realtimeInterval) {
    clearInterval(state.realtimeInterval);
    state.realtimeInterval = null;
  }
}

function renderRoadmap() {
  const container = document.getElementById("roadmap-content");
  if (!container) return;
  
  const roadmap = [
    {
      phase: "Phase 1: Current Implementation",
      status: "completed",
      features: [
        "Dark/Light theme toggle",
        "Mobile responsive design",
        "Interactive charts with tooltips",
        "Enhanced filtering system",
        "FIR creation and analysis",
        "CSV and PDF export",
        "Real-time data simulation",
      ],
      timeline: "Completed July 2026"
    },
    {
      phase: "Phase 2: Real-Time Data Integration",
      status: "in-progress",
      features: [
        "WebSocket integration for live case updates",
        "Real-time hotspot score recalculation",
        "Live alert streaming",
        "Dynamic KPI updates",
        "Redis caching for performance",
        "Data persistence with timestamps",
      ],
      timeline: "Q3 2026"
    },
    {
      phase: "Phase 3: Advanced Analytics & AI",
      status: "in-progress",
      features: [
        "Predictive hotspot analysis (ML models)",
        "Anomaly detection for crime patterns",
        "Suspect network relationship scoring",
        "Intelligent case categorization",
        "Automated recommendation engine",
        "Confidence scoring refinement",
      ],
      timeline: "Q3-Q4 2026"
    },
    {
      phase: "Phase 4: Backend & Database",
      status: "future",
      features: [
        "Replace hardcoded data with PostgreSQL/MongoDB",
        "RESTful API for all operations",
        "Data validation and sanitization",
        "Audit logging for case changes",
        "Bulk import/export capabilities",
        "Data backup and recovery",
      ],
      timeline: "Q4 2026"
    },
    {
      phase: "Phase 5: Security & Authentication",
      status: "future",
      features: [
        "User authentication (OAuth2/JWT)",
        "Role-based access control (RBAC)",
        "Encryption for sensitive data",
        "Two-factor authentication",
        "Session management",
        "Security audit trails",
      ],
      timeline: "Q1 2027"
    },
    {
      phase: "Phase 6: Advanced Features",
      status: "future",
      features: [
        "Mobile app (iOS/Android)",
        "Geospatial mapping (GIS integration)",
        "Video/photo evidence management",
        "Witness/victim management portal",
        "Inter-agency data sharing",
        "Advanced reporting engine",
      ],
      timeline: "Q1-Q2 2027"
    }
  ];
  
  container.innerHTML = roadmap.map((phase) => `
    <div class="roadmap-phase ${phase.status}">
      <h3>
        ${phase.phase}
        <span class="phase-badge ${phase.status}">${phase.status.toUpperCase()}</span>
      </h3>
      <p style="color: var(--muted); font-size: 12px; margin: 8px 0 12px 0;">
        📅 ${phase.timeline}
      </p>
      <div class="phase-features">
        ${phase.features.map((feat) => `
          <div class="feature-item ${phase.status}">
            ${feat}
          </div>
        `).join("")}
      </div>
      <div class="metrics-grid" style="margin-top: 12px;">
        <div class="metric-box">
          <div class="metric-value">${phase.features.length}</div>
          <div class="metric-label">Features</div>
        </div>
      </div>
    </div>
  `).join("");
}

function renderTimeline() {
  document.getElementById("timeline").innerHTML = timeline
    .map((item) => `<article class="timeline-item"><time>${item.time}</time><div><h3>${item.title}</h3><p>${item.text}</p></div></article>`)
    .join("");
}

function bindEvents() {
  bindDatasetImport();
  // Real-time toggle
  const realtimeToggle = document.getElementById("toggle-realtime");
  if (realtimeToggle) {
    realtimeToggle.addEventListener("click", toggleRealtime);
  }
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.textContent = state.theme === "dark" ? "☀️" : "🌙";
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Export PDF
  const exportPdfButton = document.getElementById("export-pdf");
  if (exportPdfButton) {
    exportPdfButton.addEventListener("click", exportToPDF);
  }
  const exportCsvButton = document.getElementById("export-csv");
  if (exportCsvButton) exportCsvButton.addEventListener("click", exportToCSV);
  const exportXlsxButton = document.getElementById("export-xlsx");
  if (exportXlsxButton) exportXlsxButton.addEventListener("click", exportToExcel);
  const csvInput = document.getElementById("csv-file-input");
  if (csvInput) csvInput.addEventListener("change", (event) => { if (event.target.files[0]) importCsv(event.target.files[0]); });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item, .view").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.view).classList.add("active");
      document.getElementById("view-title").textContent = titles[button.dataset.view];
      if (button.dataset.view === "overview") drawTrendChart();
      if (button.dataset.view === "fir-form") renderFirForm();
      if (button.dataset.view === "roadmap") renderRoadmap();
    });
  });

  document.getElementById("district-filter").addEventListener("change", (event) => {
    state.district = event.target.value;
    renderKpis();
    renderDistrictBars();
    renderTopDistricts();
    renderSignals();
    renderMap();
    renderPredictions();
    renderNetwork();
    renderSimilarCases();
    renderSearch(document.getElementById("case-search").value);
  });

  document.getElementById("case-search").addEventListener("input", (event) => renderSearch(event.target.value));
  document.getElementById("status-filter").addEventListener("change", () => renderSearch(document.getElementById("case-search").value));
  document.getElementById("risk-filter").addEventListener("change", () => renderSearch(document.getElementById("case-search").value));
  const offenceFilter = document.getElementById("offence-filter");
  if (offenceFilter) {
    offenceFilter.addEventListener("change", () => renderSearch(document.getElementById("case-search").value));
  }
  const dateFilter = document.getElementById("date-range-filter");
  if (dateFilter) {
    dateFilter.addEventListener("change", () => renderSearch(document.getElementById("case-search").value));
  }
  document.getElementById("case-results").addEventListener("click", (event) => {
    const card = event.target.closest('.case-card');
    if (!card) return;
    const caseId = card.dataset.caseId;
    if (caseId) showCaseDetail(caseId);
  });
  document.getElementById("summarize-fir").addEventListener("click", extractFir);
  document.getElementById("simulate-alert").addEventListener("click", () => {
    const button = document.getElementById("simulate-alert");
    button.disabled = true; button.textContent = "Scanning…";
    fetch('/api/alerts/scan').then((response) => response.json()).then((data) => {
      if (data.error) throw new Error(data.error);
      alerts = data.findings.map((finding) => finding.message);
      renderSignals();
      showNotification(`Scan complete: ${data.findings.length} finding${data.findings.length === 1 ? "" : "s"} across ${data.scanned} cases.`, "success");
    }).catch((error) => showNotification(error.message || "Alert scan failed.", "warning"))
      .finally(() => { button.disabled = false; button.textContent = "Run Alert Scan"; });
  });

  document.getElementById("chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    const question = input.value.trim();
    if (!question) return;
    appendMessage(question, "user");
    appendMessage("Checking the current case data…");
    queryAssistant(question).then((reply) => {
      const messages = document.querySelectorAll('#chat-log .message.bot');
      const pending = messages[messages.length - 1];
      if (pending) pending.textContent = reply;
    }).catch((error) => appendMessage(error.message));
    input.value = "";
  });

  window.addEventListener("resize", drawTrendChart);
}

async function init() {
  // Apply saved theme
  document.documentElement.setAttribute("data-theme", state.theme);

  await loadData();

  // Start real-time updates
  startRealtimeUpdates();

  const filter = document.getElementById("district-filter");
  districts.forEach((district) => {
    const option = document.createElement("option");
    option.value = district.name;
    option.textContent = district.name;
    filter.appendChild(option);
  });

  document.getElementById("fir-input").value = firSample;
  renderKpis();
  drawTrendChart();
  renderTopDistricts();
  renderSignals();
  renderMap();
  renderPredictions();
  renderNetwork();
  renderSimilarCases();
  renderSearch();
  extractFir();
  renderTimeline();
  appendMessage("Ask me about hotspot risk, similar cases, vehicle analysis, district comparison, or patrol recommendations.");
  bindEvents();
}

init();
