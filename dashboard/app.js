const storeKey = "mdq_generated_files";

const getFiles = () => {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || {};
  } catch (err) {
    return {};
  }
};

const formatNumber = (value) => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString();
  return (value ?? 0).toLocaleString();
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const state = {
  metrics: null,
  insights: "",
  dqInsights: "",
  topN: 5,
  focusMode: "volume",
};

const buildKpi = (id, title, value) => {
  const el = document.getElementById(id);
  if (!el) return;
  const iconName = el.dataset.icon;
  const icon = iconName ? `<i data-lucide="${iconName}"></i>` : "";
  el.innerHTML = `
    <div class="card-header card-header-inline">
      <div class="card-title">
        ${icon}
        <h3>${title}</h3>
      </div>
      <div class="value">${formatNumber(value)}</div>
    </div>
  `;
};

const getCssVar = (name) => {
  const target = document.body?.getAttribute("data-theme")
    ? document.body
    : document.documentElement;
  return getComputedStyle(target).getPropertyValue(name).trim();
};

const buildBar = (id, labels, values, color, tickAngle = 0) => {
  const textColor = getCssVar("--text") || "#111";
  const muted = getCssVar("--muted") || "#475569";
  const gridColor = getCssVar("--plot-grid") || "rgba(148, 163, 184, 0.2)";
  const baseFontSize = 13;
  Plotly.newPlot(
    id,
    [{
      x: labels,
      y: values,
      type: "bar",
      marker: { color },
      hoverlabel: { bgcolor: color, bordercolor: "rgba(255,255,255,0.25)", font: { color: "#fff" } },
    }],
    {
      autosize: true,
      margin: { t: 8, r: 8, l: 8, b: 8, pad: 6 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: baseFontSize },
      xaxis: { tickfont: { color: muted, size: baseFontSize }, tickangle: tickAngle, automargin: true },
      yaxis: { tickfont: { color: muted, size: baseFontSize }, gridcolor: gridColor, automargin: true },
      hoverlabel: { bgcolor: color, bordercolor: "rgba(255,255,255,0.25)", font: { color: "#fff" } },
    },
    { displayModeBar: false, responsive: true }
  );
};

const buildBarWithColors = (id, labels, values, colors, tickAngle = 0) => {
  const textColor = getCssVar("--text") || "#111";
  const muted = getCssVar("--muted") || "#475569";
  const gridColor = getCssVar("--plot-grid") || "rgba(148, 163, 184, 0.2)";
  const baseFontSize = 13;
  Plotly.newPlot(
    id,
    [
      {
        x: labels,
        y: values,
        type: "bar",
        marker: { color: colors },
      },
    ],
    {
      autosize: true,
      margin: { t: 8, r: 8, l: 8, b: 8, pad: 6 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: baseFontSize },
      xaxis: { tickfont: { color: muted, size: baseFontSize }, tickangle: tickAngle, automargin: true },
      yaxis: { tickfont: { color: muted, size: baseFontSize }, gridcolor: gridColor, automargin: true },
    },
    { displayModeBar: false, responsive: true }
  );
};


const buildPie = (id, labels, values, colors) => {
  const textColor = getCssVar("--text") || "#111";
  const baseFontSize = 13;
  Plotly.newPlot(
    id,
    [
      {
        labels,
        values,
        type: "pie",
        hole: 0.6,
        marker: { colors },
        textinfo: "percent",
        textfont: { color: textColor, size: baseFontSize },
        hoverlabel: { bgcolor: colors, bordercolor: "rgba(255,255,255,0.25)", font: { color: "#fff" } },
      },
    ],
    {
      autosize: true,
      margin: { t: 8, r: 8, l: 8, b: 8, pad: 6 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: baseFontSize },
      showlegend: false,
      hoverlabel: { bgcolor: colors, bordercolor: "rgba(255,255,255,0.25)", font: { color: "#fff" } },
    },
    { displayModeBar: false, responsive: true }
  );
};

const buildGauge = (id, value) => {
  const textColor = getCssVar("--text") || "#111";
  Plotly.newPlot(
    id,
    [
      {
        type: "indicator",
        mode: "gauge+number",
        value,
        number: { suffix: "%", font: { color: textColor, size: 44 } },
        gauge: {
          axis: {
            range: [0, 100],
            tickfont: { color: textColor, size: 14 },
            tickcolor: textColor,
          },
          bar: { color: "#2563eb" },
          steps: [
            { range: [0, 60], color: "#ff0000" },
            { range: [60, 80], color: "#ffcc00" },
            { range: [80, 100], color: "#00c853" },
          ],
          threshold: {
            line: { color: "#0f172a", width: 3 },
            thickness: 0.75,
            value,
          },
        },
        title: { text: "Quality Score", font: { color: textColor, size: 20 } },
      },
    ],
    {
      autosize: true,
      margin: { t: 20, r: 8, l: 8, b: 8 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: 14 },
    },
    { displayModeBar: false, responsive: true }
  );
};

const buildRadar = (id, labels, values) => {
  const textColor = getCssVar("--text") || "#111";
  const muted = getCssVar("--muted") || "#475569";
  const gridColor = getCssVar("--plot-grid") || "rgba(148, 163, 184, 0.2)";
  const plotSurface = getCssVar("--plot-surface") || "rgba(15, 23, 42, 0.04)";
  const baseFontSize = 13;
  Plotly.newPlot(
    id,
    [
      {
        type: "scatterpolar",
        r: values,
        theta: labels,
        fill: "toself",
        marker: { color: "#2563eb" },
        line: { color: "#2563eb" },
        name: "Completeness",
      },
    ],
    {
      autosize: true,
      margin: { t: 28, r: 48, l: 48, b: 28 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: baseFontSize },
      polar: {
        bgcolor: plotSurface,
        radialaxis: {
          visible: true,
          range: [0, 100],
          tickfont: { color: muted, size: baseFontSize },
          gridcolor: gridColor,
        },
        angularaxis: {
          tickfont: { color: muted, size: 12 },
          tickpadding: 10,
        },
      },
      showlegend: false,
    },
    { displayModeBar: false, responsive: true }
  );
};

const buildLine = (id, labels, values, color = "#2563eb") => {
  const textColor = getCssVar("--text") || "#111";
  const muted = getCssVar("--muted") || "#475569";
  const gridColor = getCssVar("--plot-grid") || "rgba(148, 163, 184, 0.2)";
  const baseFontSize = 13;
  Plotly.newPlot(
    id,
    [
      {
        x: labels,
        y: values,
        type: "scatter",
        mode: "lines+markers",
        line: { color },
        marker: { color },
      },
    ],
    {
      autosize: true,
      margin: { t: 8, r: 8, l: 8, b: 8, pad: 6 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: textColor, size: baseFontSize },
      xaxis: { tickfont: { color: muted, size: baseFontSize }, automargin: true },
      yaxis: { tickfont: { color: muted, size: baseFontSize }, gridcolor: gridColor, automargin: true },
    },
    { displayModeBar: false, responsive: true }
  );
};

const parseDqInsights = (text) => {
  const total = Number((text.match(/Total records processed:\s*(\d+)/) || [])[1] || 0);
  const ok = Number((text.match(/Records ready for use \(OK\):\s*(\d+)/) || [])[1] || 0);
  const review = Number((text.match(/Records needing review \(REVIEW\):\s*(\d+)/) || [])[1] || 0);
  const dupIds = Number((text.match(/Duplicate customer_id rows:\s*(\d+)/) || [])[1] || 0);
  const dupProfiles = Number((text.match(/Potential duplicate profiles:\s*(\d+)/) || [])[1] || 0);

  const completeness = [];
  const completenessSection = text.split("▶ Completeness Metrics (Mandatory Fields)")[1] || "";
  const completenessLines = completenessSection.split("▶")[0].split("\n");
  completenessLines.forEach((line) => {
    const match = line.match(/-\s*(.+?):\s*(\d+)\/(\d+)\s*\((\d+\.\d+)%\)/);
    if (match) {
      completeness.push({
        field: match[1],
        value: Number(match[4]),
      });
    }
  });

  return { total, ok, review, dupIds, dupProfiles, completeness };
};

const renderDqSummary = (text) => {
  const container = document.getElementById("dq-summary");
  if (!container) return;
  const data = parseDqInsights(text);
  const okPct = data.total ? Math.round((data.ok / data.total) * 100) : 0;
  const reviewPct = data.total ? 100 - okPct : 0;

  container.innerHTML = `
    <div class="dq-block">
      <h3>Overview</h3>
      <div class="dq-kpis">
        <div class="dq-kpi"><span>Total Records</span><strong>${data.total}</strong></div>
        <div class="dq-kpi"><span>OK Records</span><strong>${data.ok}</strong></div>
        <div class="dq-kpi"><span>Review Records</span><strong>${data.review}</strong></div>
        <div class="dq-kpi"><span>Duplicate IDs</span><strong>${data.dupIds}</strong></div>
        <div class="dq-kpi"><span>Duplicate Profiles</span><strong>${data.dupProfiles}</strong></div>
      </div>
      <div class="dq-split">
        <div class="dq-split-bar">
          <div class="dq-ok" style="width:${okPct}%"></div>
          <div class="dq-review" style="width:${reviewPct}%"></div>
        </div>
        <div class="dq-split-labels">
          <span>OK ${okPct}%</span>
          <span>Review ${reviewPct}%</span>
        </div>
      </div>
    </div>
    <div class="dq-block">
      <h3>Completeness (Mandatory Fields)</h3>
      <div class="dq-bars">
        ${data.completeness
          .map(
            (item) => `
              <div class="dq-bar">
                <span>${item.field}</span>
                <div class="dq-bar-track">
                  <div class="dq-bar-fill" style="width:${item.value}%"></div>
                </div>
                <strong>${item.value}%</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </div>
  `;
};

const toSortedEntries = (obj, mode = "volume") => {
  const entries = Object.entries(obj || {});
  if (mode === "alphabetical") {
    return entries.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return entries.sort((a, b) => b[1] - a[1]);
};

const getTopEntries = (obj, n, mode = "volume") =>
  toSortedEntries(obj, mode).slice(0, n);

const renderSpotlight = (issueCounts) => {
  const container = document.getElementById("issue-spotlight");
  if (!container) return;
  const topIssues = getTopEntries(issueCounts, Math.min(state.topN, 5), state.focusMode);
  const palette = ["#f97316", "#fb7185", "#60a5fa", "#22c55e", "#a78bfa"];
  container.innerHTML = topIssues
    .map(
      ([label, value], index) => `
        <div class="spotlight-row">
          <span class="spotlight-dot" style="background:${palette[index % palette.length]}"></span>
          <span class="spotlight-label">${label.replace(/-/g, " ")}</span>
          <span class="spotlight-value">${value}</span>
        </div>
      `
    )
    .join("");
};

const renderFiles = () => {
  const files = getFiles();
  const container = document.getElementById("generated-files");
  const order = [
    "ai_insights.md",
    "dashboard_config.json",
    "data_quality.txt",
    "metadata.yaml",
    "quality_info.txt",
    "quality_metrics.json",
    "rules.yaml",
    "standardized_data.txt",
  ];
  const available = order.filter((name) => name in files);

  const renderList = (target) => {
    if (!target) return;
    const rows = available
      .map(
        (name) => `
          <div class="download-row">
            <span>${name}</span>
            <button class="download-btn" type="button" data-download="${name}">
              <i data-lucide="download"></i>
            </button>
          </div>
        `
      )
      .join("");
    target.innerHTML = rows || "<div class=\"panel-meta\">No generated files found.</div>";
    target.querySelectorAll("button[data-download]").forEach((btn) => {
      btn.addEventListener("click", () => downloadText(btn.dataset.download, files[btn.dataset.download]));
    });
  };

  renderList(container);
  renderList(document.getElementById("download-modal-list"));
};

const renderAiCharts = (config) => {
  const slots = [1, 2, 3];
  const charts = Array.isArray(config?.charts) ? config.charts : [];

  slots.forEach((slot, index) => {
    const panel = document.getElementById(`ai-panel-${slot}`);
    const chartEl = document.getElementById(`ai-chart-${slot}`);
    const chart = charts[index];
    if (!panel || !chartEl) return;

    if (!chart) {
      panel.style.display = "none";
      return;
    }

    panel.style.display = "";
    const titleEl = panel.querySelector(".panel-text h2");
    const metaEl = panel.querySelector(".panel-text .panel-meta");
    if (titleEl) titleEl.textContent = chart.title || "AI Chart";
    if (metaEl) metaEl.textContent = chart.subtitle || "AI-selected";

    const labels = Array.isArray(chart.labels) ? chart.labels : [];
    const values = Array.isArray(chart.values) ? chart.values : [];
    const colors = Array.isArray(chart.colors) ? chart.colors : undefined;
    const tickAngle = typeof chart.tickAngle === "number" ? chart.tickAngle : 0;

    if (chart.type === "pie") {
      buildPie(chartEl.id, labels, values, colors || ["#2563eb", "#60a5fa", "#7c3aed", "#22c55e", "#f59e0b"]);
      return;
    }

    if (chart.type === "line") {
      buildLine(chartEl.id, labels, values, colors?.[0] || "#2563eb");
      return;
    }

    if (colors && colors.length === labels.length) {
      buildBarWithColors(chartEl.id, labels, values, colors, tickAngle);
      return;
    }

    buildBar(chartEl.id, labels, values, "#2563eb", tickAngle);
  });
};

const setupDownloadModal = () => {
  const trigger = document.getElementById("download-trigger");
  const modal = document.getElementById("download-modal");
  const closeBtn = document.getElementById("close-download-modal");
  const downloadAllBtn = document.getElementById("download-modal-all");
  if (!trigger || !modal) return;

  const openModal = () => {
    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
  };

  trigger.addEventListener("click", openModal);
  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  downloadAllBtn?.addEventListener("click", () => {
    const files = getFiles();
    [
      "ai_insights.md",
      "dashboard_config.json",
      "data_quality.txt",
      "metadata.yaml",
      "quality_info.txt",
      "quality_metrics.json",
      "rules.yaml",
      "standardized_data.txt",
    ].filter((name) => name in files).forEach((name) => downloadText(name, files[name]));
  });
};

const setupChartLightbox = () => {
  const modal = document.getElementById("chart-modal");
  const closeBtn = document.getElementById("close-chart-modal");
  const canvas = document.getElementById("chart-modal-canvas");
  const titleEl = document.getElementById("chart-modal-title");
  if (!modal || !canvas) return;

  const openModal = (button) => {
    const targetId = button?.dataset?.chartTarget;
    if (!targetId) return;
    const chartEl = document.getElementById(targetId);
    if (!chartEl || !window.Plotly) return;

    const data = chartEl.data || chartEl._fullData;
    const layout = chartEl.layout || chartEl._fullLayout;
    if (!data || !layout) return;

    const panelTitle = button.closest(".panel")?.querySelector("h2")?.textContent;
    if (titleEl) titleEl.textContent = panelTitle || "Chart";

    modal.classList.add("is-visible");
    modal.setAttribute("aria-hidden", "false");

    Plotly.newPlot(
      canvas,
      data,
      {
        ...layout,
        autosize: true,
        margin: layout.margin || { t: 40, r: 40, l: 40, b: 40 },
      },
      { displayModeBar: false, responsive: true }
    );

    requestAnimationFrame(() => Plotly.Plots.resize(canvas));
  };

  const closeModal = () => {
    modal.classList.remove("is-visible");
    modal.setAttribute("aria-hidden", "true");
    if (window.Plotly) {
      Plotly.purge(canvas);
    }
  };

  document.querySelectorAll(".chart-expand").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn));
  });

  closeBtn?.addEventListener("click", closeModal);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });
};

const downloadText = (name, content) => {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

let resizeScheduled = false;
const resizeCharts = () => {
  if (resizeScheduled) return;
  resizeScheduled = true;
  requestAnimationFrame(() => {
    [
      "chart-issues",
      "chart-status",
      "ai-chart-1",
      "ai-chart-2",
      "ai-chart-3",
      "chart-status-pie",
      "chart-completeness-radar",
      "chart-quality-score",
    ].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) {
          Plotly.Plots.resize(el);
        }
      }
    );
    resizeScheduled = false;
  });
};

const renderAll = () => {
  const files = getFiles();
  const metrics = files["quality_metrics.json"]
    ? JSON.parse(files["quality_metrics.json"])
    : null;
  const insights = files["ai_insights.md"] || "# AI Insights\n\nNo insights available.";
  const dqInsights = files["data_quality.txt"] || "";
  let aiDashboardConfig = null;
  if (files["dashboard_config.json"]) {
    try {
      aiDashboardConfig = JSON.parse(files["dashboard_config.json"]);
    } catch (err) {
      aiDashboardConfig = null;
    }
  }

  if (!metrics) {
    document.getElementById("ai-insights").innerHTML =
      "<p>No generated data found. Run the pipeline first.</p>";
    return;
  }

  const status = metrics.status_counts || {};
  const totalRows = metrics.total_rows || 0;
  const issueCounts = metrics.issue_counts || {};
  const issueTotal = Object.values(issueCounts).reduce((sum, val) => sum + val, 0) || 0;
  const issueRate = totalRows ? Math.round((issueTotal / totalRows) * 100) : 0;
  const okRate = totalRows ? Math.round(((status.OK || 0) / totalRows) * 100) : 0;
  const qualityScore = clamp(Math.round(okRate * 0.65 + (100 - issueRate) * 0.35), 0, 100);

  buildKpi("kpi-total", "Total Records", totalRows);
  buildKpi("kpi-ok", "OK Records", status.OK || 0);
  buildKpi("kpi-review", "Review Records", status.REVIEW || 0);
  buildKpi("kpi-score", "Quality Score", `${qualityScore}%`);
  buildKpi("kpi-issue-rate", "Issue Rate", `${issueRate}%`);

  const issuesColor = "#f97316";
  const issueEntries = getTopEntries(issueCounts, state.topN, state.focusMode);
  buildBar(
    "chart-issues",
    issueEntries.map(([label]) => label),
    issueEntries.map(([, value]) => value),
    issuesColor,
    35
  );

  const statusOrder = ["OK", "REVIEW"].filter((key) => key in status);
  const statusLabels = statusOrder.length ? statusOrder : Object.keys(status);
  const statusValues = statusLabels.map((label) => status[label]);
  const statusColors = statusLabels.map((label) =>
    label === "OK" ? "#22c55e" : "#ef4444"
  );
  buildBarWithColors("chart-status", statusLabels, statusValues, statusColors);

  renderAiCharts(aiDashboardConfig);

  buildPie(
    "chart-status-pie",
    statusLabels,
    statusValues,
    statusColors
  );

  const completeness = metrics.completeness_standardized || {};
  const completenessEntries = Object.entries(completeness)
    .filter(([key]) => key.endsWith("_pct"))
    .map(([key, value]) => [key.replace("_present_pct", ""), value]);

  const radarLabels = completenessEntries.map(([label]) => label.replace(/_/g, " "));

  buildRadar(
    "chart-completeness-radar",
    radarLabels,
    completenessEntries.map(([, value]) => value)
  );

  buildGauge("chart-quality-score", qualityScore);
  document.getElementById("ai-insights").innerHTML = marked.parse(insights);
  renderDqSummary(dqInsights);
  const timestampEl = document.getElementById("report-timestamp");
  if (timestampEl && metrics.generated_at) {
    timestampEl.textContent = `Generated: ${metrics.generated_at}`;
  }

  renderSpotlight(issueCounts);
  renderFiles();
  resizeCharts();

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
};

const setupThemeToggle = () => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const stored = localStorage.getItem("dashboard-theme");
  const initial = stored || (prefersDark ? "dark" : "light");
  document.body.setAttribute("data-theme", initial);

  toggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("dashboard-theme", next);
    renderAll();
  });
};

const setupResizer = () => {
  const layout = document.getElementById("layout");
  const resizer = document.getElementById("resizer");
  if (!layout || !resizer) return;

  let isDragging = false;
  let startX = 0;
  let startLeft = 0;
  let startRight = 0;

  const onPointerMove = (event) => {
    if (!isDragging) return;
    const dx = event.clientX - startX;
    const nextLeft = clamp(startLeft + dx, 420, layout.clientWidth - 320);
    const nextRight = clamp(startRight - dx, 280, layout.clientWidth - 420);
    layout.style.gridTemplateColumns = `minmax(0, ${nextLeft}px) 12px minmax(280px, ${nextRight}px)`;
    resizeCharts();
  };

  const stopDragging = () => {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove("is-dragging");
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", stopDragging);
  };

  resizer.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 1100px)").matches) return;
    isDragging = true;
    startX = event.clientX;
    const columns = getComputedStyle(layout).gridTemplateColumns.split(" ");
    startLeft = parseFloat(columns[0]);
    startRight = parseFloat(columns[2]);
    resizer.classList.add("is-dragging");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
  });
  window.addEventListener("resize", resizeCharts);

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(() => resizeCharts());
    observer.observe(layout);
  }
};

const initTheme = () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.body.setAttribute("data-theme", prefersDark ? "dark" : "light");
};

initTheme();
renderAll();
setupThemeToggle();
setupResizer();
setupDownloadModal();
setupChartLightbox();

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}
