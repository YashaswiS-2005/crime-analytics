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
};

const titles = {
  overview: "Investigation Dashboard",
  hotspots: "Hotspot Detection",
  network: "Criminal Network Analysis",
  search: "Search Portal",
  fir: "FIR Analytics",
  assistant: "AI Assistant",
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
  const values = [...trends, 452, 474];
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

  ctx.beginPath();
  ctx.moveTo(points[trends.length - 1].x, points[trends.length - 1].y);
  points.slice(trends.length).forEach((point) => ctx.lineTo(point.x, point.y));
  ctx.strokeStyle = "#d95d39";
  ctx.setLineDash([7, 6]);
  ctx.stroke();
  ctx.setLineDash([]);

  points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, index >= trends.length ? 5 : 4, 0, Math.PI * 2);
    ctx.fillStyle = index >= trends.length ? "#d95d39" : "#0f8b8d";
    ctx.fill();
  });

  ctx.fillStyle = "#647485";
  ctx.font = "12px Segoe UI, Arial";
  ctx.fillText("Actual", padding, 18);
  ctx.fillStyle = "#d95d39";
  ctx.fillText("Forecast", width - 100, 18);
}

function renderDistrictBars() {
  const rows = selectedDistricts();
  const max = Math.max(...rows.map((item) => item.cases), 1);
  document.getElementById("district-bars").innerHTML = rows
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
          <p>${item.score}% hotspot probability. Recommended: deploy patrol visibility and verify repeat-offender movement.</p>
          <div class="case-meta"><span>${item.risk.toUpperCase()}</span><span>Forecast window: 30 days</span></div>
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
    { id: primaryCase.suspect, x: 350, y: 160, type: "suspect" },
    { id: primaryCase.id, x: 190, y: 245, type: "case" },
    { id: primaryCase.vehicle, x: 520, y: 240, type: "vehicle" },
    { id: primaryCase.phone, x: 350, y: 340, type: "phone" },
    { id: linkedCase.id, x: 570, y: 390, type: "case" },
    { id: linkedCase.suspect, x: 195, y: 405, type: "suspect" },
  ];
  const links = [
    [primaryCase.suspect, primaryCase.id],
    [primaryCase.suspect, primaryCase.vehicle],
    [primaryCase.suspect, primaryCase.phone],
    [primaryCase.phone, linkedCase.id],
    [linkedCase.id, linkedCase.suspect],
    [primaryCase.id, primaryCase.vehicle],
  ];
  const color = { suspect: "#d95d39", case: "#0f8b8d", vehicle: "#c48118", phone: "#287d3c" };
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  svg.innerHTML = `
    ${links
      .map(([from, to]) => `<line class="link-line" x1="${byId[from].x}" y1="${byId[from].y}" x2="${byId[to].x}" y2="${byId[to].y}"></line>`)
      .join("")}
    ${nodes
      .map(
        (node) => `
          <circle class="node" cx="${node.x}" cy="${node.y}" r="${node.type === "suspect" ? 38 : 32}" fill="${color[node.type]}"></circle>
          <text class="node-label" x="${node.x}" y="${node.y + 56}" text-anchor="middle">${node.id}</text>
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

async function renderSearch(query = "") {
  const output = document.getElementById("case-results");
  const statusId = "search-status";
  const normalized = query.trim();
  const statusFilter = document.getElementById("status-filter").value;
  const riskFilter = document.getElementById("risk-filter").value;
  const districtFilter = state.district === "All" ? "" : state.district;

  setStatus(statusId, "Searching...", "loading");

  try {
    const params = new URLSearchParams({
      q: normalized,
      status: statusFilter,
      risk: riskFilter,
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
      return !normalized || haystack.includes(normalized.toLowerCase());
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
  } finally {
    if (button) {
      button.disabled = false;
      button.classList.remove('loading');
    }
  }
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
  return "I found relevant indicators across cases, hotspots, and alerts. Ask about vehicle theft, cyber fraud, district risk, patrol recommendations, or a case ID for a sharper answer.";
}

function appendMessage(text, type = "bot") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  document.getElementById("chat-log").appendChild(message);
  message.scrollIntoView({ block: "end" });
}

function renderTimeline() {
  document.getElementById("timeline").innerHTML = timeline
    .map((item) => `<article class="timeline-item"><time>${item.time}</time><div><h3>${item.title}</h3><p>${item.text}</p></div></article>`)
    .join("");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-item, .view").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.view).classList.add("active");
      document.getElementById("view-title").textContent = titles[button.dataset.view];
      if (button.dataset.view === "overview") drawTrendChart();
    });
  });

  document.getElementById("district-filter").addEventListener("change", (event) => {
    state.district = event.target.value;
    renderKpis();
    renderDistrictBars();
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
  document.getElementById("case-results").addEventListener("click", (event) => {
    const card = event.target.closest('.case-card');
    if (!card) return;
    const caseId = card.dataset.caseId;
    if (caseId) showCaseDetail(caseId);
  });
  document.getElementById("summarize-fir").addEventListener("click", extractFir);
  document.getElementById("simulate-alert").addEventListener("click", () => {
    const alertList = document.getElementById("alerts");
    alertList.insertAdjacentHTML("afterbegin", `<article class="alert"><p>New scan: Bengaluru Urban crossed the 90-point hotspot threshold for transit theft.</p></article>`);
  });

  document.getElementById("chat-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("chat-input");
    const question = input.value.trim();
    if (!question) return;
    appendMessage(question, "user");
    appendMessage(answerQuestion(question));
    input.value = "";
  });

  window.addEventListener("resize", drawTrendChart);
}

async function init() {
  await loadData();

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
  renderDistrictBars();
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
