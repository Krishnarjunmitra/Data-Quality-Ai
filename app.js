const stepsConfig = [
  { id: "loading", label: "Loading dataset" },
  { id: "quality", label: "Assessing data quality", file: "quality_info.txt" },
  { id: "metadata", label: "Generating metadata with schema structure", file: "metadata.yaml" },
  { id: "rules", label: "Generating standardization rules", file: "rules.yaml" },
  { id: "engine", label: "Preparing standardization process" },
  { id: "standardized", label: "Generating standardized data", file: "standardized_data.txt" },
  { id: "ai", label: "Preparing AI insights", file: "ai_insights.md" },
  { id: "dashboard", label: "Dashboard ready" },
];

const storeKey = "mdq_generated_files";
const storeMetaKey = "mdq_generated_meta";
const storePipelineKey = "mdq_pipeline_state";

const state = {
  file: null,
  parsed: null,
  generated: {},
};

const elements = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  processBtn: document.getElementById("process-btn"),
  viewData: document.getElementById("view-data"),
  fileInfo: document.getElementById("file-info"),
  steps: document.getElementById("steps"),
  files: document.getElementById("files"),
  downloadAll: document.getElementById("download-all"),
  modal: document.getElementById("data-modal"),
  closeModal: document.getElementById("close-modal"),
  dataPreview: document.getElementById("data-preview"),
  openDashboard: document.getElementById("open-dashboard"),
  hfToken: document.getElementById("hf-token"),
  hfModel: document.getElementById("hf-model"),
  saveSettings: document.getElementById("save-settings"),
  resetBtn: document.getElementById("reset-btn"),
  uploadPanel: document.getElementById("upload-panel"),
  pipelinePanel: document.getElementById("pipeline-panel"),
};

const init = () => {
  renderSteps();
  renderFiles();
  loadSettings();
  bindEvents();
  initTheme();
  setupThemeToggle();
  loadPipelineState();
  highlightPanel("upload");
};

const bindEvents = () => {
  elements.fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  });

  elements.dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.dropzone.classList.add("is-dragging");
  });

  elements.dropzone.addEventListener("dragleave", () => {
    elements.dropzone.classList.remove("is-dragging");
  });

  elements.dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.dropzone.classList.remove("is-dragging");
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  });

  elements.processBtn.addEventListener("click", runPipeline);
  elements.viewData.addEventListener("click", openDataModal);
  elements.closeModal.addEventListener("click", closeDataModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeDataModal();
  });

  elements.downloadAll.addEventListener("click", () => {
    const files = loadGeneratedFiles();
    Object.keys(files).forEach((name) => downloadText(name, files[name]));
  });

  elements.openDashboard.addEventListener("click", () => {
    window.location.href = "dashboard/index.html";
  });

  elements.saveSettings.addEventListener("click", () => {
    localStorage.setItem("mdq_hf_token", elements.hfToken.value.trim());
    localStorage.setItem("mdq_hf_model", elements.hfModel.value.trim());
    elements.saveSettings.textContent = "Saved";
    setTimeout(() => (elements.saveSettings.textContent = "Save Settings"), 1200);
  });

  elements.resetBtn.addEventListener("click", resetAll);
};

const initTheme = () => {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const stored = localStorage.getItem("dashboard-theme");
  const initial = stored || (prefersDark ? "dark" : "light");
  document.body.setAttribute("data-theme", initial);
};

const setupThemeToggle = () => {
  const toggle = document.getElementById("theme-toggle");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("dashboard-theme", next);
  });
};

const handleFile = async (file) => {
  const text = await file.text();
  const parsed = parseCsv(text);
  if (!parsed.headers.length) {
    elements.fileInfo.textContent = "Invalid CSV. Please upload a valid file.";
    elements.openDashboard.classList.add("is-hidden");
    elements.openDashboard.disabled = true;
    highlightPanel("upload");
    return;
  }
  state.file = file;
  state.parsed = parsed;
  elements.fileInfo.textContent = `${file.name} • ${parsed.rows.length} rows • ${parsed.headers.length} columns`;
  elements.processBtn.disabled = false;
  elements.viewData.disabled = true;
  elements.openDashboard.classList.add("is-hidden");
  elements.openDashboard.disabled = true;
  elements.resetBtn.classList.remove("is-hidden");
  highlightPanel("none");
  resetSteps();
};

const renderSteps = () => {
  elements.steps.innerHTML = stepsConfig
    .map(
      (step) => `
        <div class="step ${step.id === "loading" ? "inactive" : "hidden inactive"}" id="step-${step.id}">
          <span>${step.label}</span>
          <em class="step-status">Pending</em>
        </div>
      `
    )
    .join("");
  updateVisibleTail();
};

const resetSteps = () => {
  stepsConfig.forEach((step) => {
    const el = document.getElementById(`step-${step.id}`);
    if (!el) return;
    el.classList.remove("complete", "processing");
    if (step.id === "loading") {
      el.classList.remove("hidden");
      el.classList.add("inactive");
    } else {
      el.classList.add("hidden", "inactive");
    }
    el.querySelector("em").textContent = "Pending";
  });
  updateVisibleTail();
  savePipelineState();
};

const setStep = (id, status, message) => {
  const el = document.getElementById(`step-${id}`);
  if (!el) return;
  el.classList.remove("complete", "processing", "inactive", "hidden");
  if (status) el.classList.add(status);
  el.querySelector("em").textContent = message;
  updateVisibleTail();
  savePipelineState();
};

const showStep = (id) => {
  const el = document.getElementById(`step-${id}`);
  if (!el) return;
  el.classList.remove("hidden");
  updateVisibleTail();
  savePipelineState();
};

const updateVisibleTail = () => {
  const visibleSteps = Array.from(elements.steps?.querySelectorAll(".step:not(.hidden)") || []);
  visibleSteps.forEach((step) => step.classList.remove("tail"));
  if (visibleSteps.length) {
    visibleSteps[visibleSteps.length - 1].classList.add("tail");
  }
};

const highlightPanel = (target) => {
  elements.uploadPanel?.classList.toggle("focus-panel", target === "upload");
  elements.pipelinePanel?.classList.toggle("focus-panel", target === "pipeline");
};

const renderFiles = () => {
  const files = loadGeneratedFiles();
  const rows = Object.keys(files)
    .sort()
    .map(
      (name) => `
        <div class="file-row">
          <div>
            <i class="file-icon" data-lucide="${getFileIcon(name)}"></i>
            <div>
              <div>
                <strong>${name}</strong>
              </div>
              <div class="hint"><strong>${formatBytes(getTextSize(files[name]))}</strong> ${files[name].length.toLocaleString()} chars</div>
            </div>
          </div>
          <button class="ghost" type="button" data-download="${name}" aria-label="Download ${name}">
            <i data-lucide="download"></i>
          </button>
        </div>
      `
    )
    .join("");

  elements.files.innerHTML = rows || "<div class=\"hint\">No generated files yet.</div>";
  elements.files.querySelectorAll("button[data-download]").forEach((btn) => {
    btn.addEventListener("click", () => downloadText(btn.dataset.download, files[btn.dataset.download]));
  });

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  elements.downloadAll.disabled = !rows;
  // Enable View Standardized Data button only if standardized_data.txt exists
  const filesObj = loadGeneratedFiles();
  if (filesObj["standardized_data.txt"]) {
    elements.viewData.disabled = false;
  } else {
    elements.viewData.disabled = true;
  }
  // Only show Open Dashboard if pipeline state has dashboard step with 'Ready to open dashboard'
  const pipelineState = JSON.parse(localStorage.getItem(storePipelineKey)) || [];
  const dashboardStep = pipelineState.find(
    (step) => step.id === "dashboard" && step.message === "Ready to open dashboard"
  );
  if (dashboardStep) {
    elements.openDashboard.classList.remove("is-hidden");
    elements.openDashboard.disabled = false;
  } else {
    elements.openDashboard.classList.add("is-hidden");
    elements.openDashboard.disabled = true;
  }
  if (rows) {
    elements.resetBtn.classList.remove("is-hidden");
  }
};

const getTextSize = (text) => new Blob([text]).size;

const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const units = ["KB", "MB", "GB"];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size < 10 ? 2 : 1)} ${units[unitIndex]}`;
};

const getFileIcon = (name) => {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "json") return "braces";
  if (ext === "yaml" || ext === "yml") return "file-code";
  if (ext === "md") return "file-text";
  if (ext === "txt") return "file-text";
  return "file";
};

const resetAll = () => {
  localStorage.removeItem(storeKey);
  localStorage.removeItem(storeMetaKey);
  localStorage.removeItem(storePipelineKey);
  state.file = null;
  state.parsed = null;
  elements.fileInput.value = "";
  elements.fileInfo.textContent = "No file selected.";
  elements.processBtn.disabled = true;
  elements.viewData.disabled = true;
  elements.openDashboard.disabled = true;
  elements.openDashboard.classList.add("is-hidden");
  elements.resetBtn.classList.add("is-hidden");
  renderFiles();
  resetSteps();
  highlightPanel("upload");
};

const savePipelineState = () => {
  const steps = stepsConfig.map((step) => {
    const el = document.getElementById(`step-${step.id}`);
    if (!el) return null;
    return {
      id: step.id,
      message: el.querySelector("em")?.textContent || "Pending",
      classes: Array.from(el.classList),
    };
  }).filter(Boolean);
  localStorage.setItem(storePipelineKey, JSON.stringify(steps));
};

const loadPipelineState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storePipelineKey)) || [];
    if (!stored.length) return;
    stored.forEach((step) => {
      const el = document.getElementById(`step-${step.id}`);
      if (!el) return;
      el.className = "step";
      step.classes.forEach((cls) => {
        if (cls !== "step") el.classList.add(cls);
      });
      const em = el.querySelector("em");
      if (em) em.textContent = step.message || "Pending";
    });
    updateVisibleTail();
  } catch (err) {
    return;
  }
};

const loadGeneratedFiles = () => {
  try {
    return JSON.parse(localStorage.getItem(storeKey)) || {};
  } catch (err) {
    return {};
  }
};

const saveGeneratedFiles = (files) => {
  localStorage.setItem(storeKey, JSON.stringify(files));
  localStorage.setItem(storeMetaKey, JSON.stringify({ updatedAt: new Date().toISOString() }));
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

const openDataModal = () => {
  const files = loadGeneratedFiles();
  const text = files["standardized_data.txt"] || "";
  elements.dataPreview.innerHTML = buildTablePreview(text);
  elements.modal.setAttribute("aria-hidden", "false");
};

const closeDataModal = () => {
  elements.modal.setAttribute("aria-hidden", "true");
};

const buildTablePreview = (csvText) => {
  if (!csvText) return "<div class=\"hint\">No standardized data available.</div>";
  const parsed = parseCsv(csvText);
  const headers = parsed.headers;
  const rows = parsed.rows.slice(0, 12);
  return `
    <table>
      <thead>
        <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ""}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
};

const runPipeline = async () => {
  if (!state.parsed) return;
  const files = {};
  // Disable Start AI Pipeline button for this file
  elements.processBtn.disabled = true;
  highlightPanel("pipeline");
  setStep("loading", "processing", "Loading...");
  showStep("loading");
  await wait(800);
  setStep("loading", "complete", "Dataset loaded");

  setStep("quality", "processing", "Assessing...");
  showStep("quality");
  const quality = assessQuality(state.parsed);
  const qualityInfo = await generateQualityInfo(quality);
  await wait(600);
  files["quality_info.txt"] = qualityInfo;
  files["data_quality.txt"] = quality.insights;
  files["quality_metrics.json"] = JSON.stringify(quality.metrics, null, 2);
  saveGeneratedFiles(files);
  renderFiles();
  setStep("quality", "complete", "Generated quality info.txt");

  setStep("metadata", "processing", "Generating...");
  showStep("metadata");
  const metadataYaml = await generateMetadataYaml(state.parsed, quality, qualityInfo);
  await wait(600);
  files["metadata.yaml"] = metadataYaml;
  saveGeneratedFiles(files);
  renderFiles();
  setStep("metadata", "complete", "Generated metadata.yaml");

  setStep("rules", "processing", "Generating...");
  showStep("rules");
  files["rules.yaml"] = await generateRulesYaml(state.parsed, quality, qualityInfo, metadataYaml);
  await wait(600);
  saveGeneratedFiles(files);
  renderFiles();
  setStep("rules", "complete", "Generated rules.yaml");

  setStep("engine", "processing", "Preparing...");
  showStep("engine");
  await wait(700);
  setStep("engine", "complete", "Standardization script ready");

  setStep("standardized", "processing", "Standardizing...");
  showStep("standardized");
  const standardized = standardizeData(state.parsed, quality);
  await wait(600);
  files["standardized_data.txt"] = standardized.csv;
  saveGeneratedFiles(files);
  renderFiles();
  setStep("standardized", "complete", "Generated standardized_data.txt");

  setStep("ai", "processing", "Generating...");
  showStep("ai");
  files["ai_insights.md"] = await buildAiInsights(quality.metrics, standardized.sampleRows);
  files["dashboard_config.json"] = await buildDashboardConfig(state.parsed, quality, standardized.sampleRows);
  await wait(600);
  saveGeneratedFiles(files);
  renderFiles();
  setStep("ai", "complete", "Prepared AI insights.md");

  setStep("dashboard", "processing", "Finalizing...");
  showStep("dashboard");
  await wait(500);
  setStep("dashboard", "complete", "Ready to open dashboard");
  highlightPanel("none");

  saveGeneratedFiles(files);
  renderFiles();
  elements.viewData.disabled = false;
  elements.openDashboard.disabled = false;
  elements.openDashboard.classList.remove("is-hidden");
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseCsv = (text) => {
  const rows = [];
  const headers = [];
  let current = "";
  let inQuotes = false;
  const lines = [];

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "\n" && !inQuotes) {
      lines.push(current);
      current = "";
    } else if (char === "\r") {
      continue;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  lines.forEach((line, index) => {
    const cols = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"') {
        if (quoted && next === '"') {
          cell += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        cols.push(cell);
        cell = "";
      } else {
        cell += char;
      }
    }
    cols.push(cell);
    if (index === 0) {
      headers.push(...cols.map((h) => h.trim() || `column_${headers.length + 1}`));
    } else {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = cols[idx] ? cols[idx].trim() : "";
      });
      rows.push(row);
    }
  });

  return { headers, rows };
};

const inferType = (values) => {
  const sample = values.filter(Boolean).slice(0, 20);
  if (!sample.length) return "string";
  const isEmail = sample.every((v) => /@/.test(v));
  if (isEmail) return "email";
  const isDate = sample.every((v) => !Number.isNaN(Date.parse(v)));
  if (isDate) return "date";
  const isNumber = sample.every((v) => /^-?\d+(\.\d+)?$/.test(v));
  if (isNumber) return "number";
  const isPhone = sample.every((v) => v.replace(/[^0-9]/g, "").length >= 7);
  if (isPhone) return "phone";
  return "string";
};

const assessQuality = (parsed) => {
  const headers = parsed.headers;
  const rows = parsed.rows;
  const issues = {};
  const statusCounts = { OK: 0, REVIEW: 0 };
  const completeness = {};

  const inferred = headers.map((h) => {
    const values = rows.map((r) => r[h]);
    return { name: h, type: inferType(values) };
  });

  const requiredFields = inferred
    .filter((col) => ["email", "phone", "date"].includes(col.type) || /name|country|state|city/i.test(col.name))
    .map((col) => col.name);

  const duplicateKey = headers.find((h) => /id/i.test(h));
  const seen = new Set();
  let duplicateCount = 0;
  let duplicateProfileCount = 0;
  const profileSeen = new Set();

  const normalize = (value) => (value || "").toString().trim().toLowerCase();
  const normalizePhone = (value) => normalize(value).replace(/[^0-9]/g, "");

  rows.forEach((row) => {
    const rowIssues = [];
    requiredFields.forEach((field) => {
      if (!row[field]) rowIssues.push(`missing-${field}`);
    });

    headers.forEach((h) => {
      const value = row[h];
      const type = inferred.find((col) => col.name === h)?.type;
      if (!value) return;
      if (type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) rowIssues.push("email");
      if (type === "phone" && value.replace(/[^0-9]/g, "").length < 7) rowIssues.push("phone");
      if (type === "date" && Number.isNaN(Date.parse(value))) rowIssues.push("date");
    });

    if (duplicateKey) {
      const keyVal = row[duplicateKey];
      if (keyVal) {
        if (seen.has(keyVal)) {
          duplicateCount += 1;
          rowIssues.push("duplicate-profile");
        }
        seen.add(keyVal);
      }
    }

    const profileKeyParts = [
      normalize(row.first_name),
      normalize(row.last_name),
      normalize(row.email),
      normalizePhone(row.phone),
      normalize(row.country),
    ];
    const profileKey = profileKeyParts.join("|");
    if (profileKeyParts.some((part) => part)) {
      if (profileSeen.has(profileKey)) {
        duplicateProfileCount += 1;
        rowIssues.push("duplicate-profile");
      }
      profileSeen.add(profileKey);
    }

    if (rowIssues.length) {
      statusCounts.REVIEW += 1;
      rowIssues.forEach((issue) => {
        issues[issue] = (issues[issue] || 0) + 1;
      });
    } else {
      statusCounts.OK += 1;
    }
  });

  headers.forEach((h) => {
    const nonEmpty = rows.filter((row) => row[h]).length;
    completeness[`${h}_present`] = nonEmpty;
    completeness[`${h}_present_pct`] = rows.length ? Math.round((nonEmpty / rows.length) * 100) : 0;
  });

  const metrics = {
    total_rows: rows.length,
    status_counts: statusCounts,
    issue_counts: issues,
    completeness_standardized: completeness,
    duplicates: {
      duplicate_customer_id_rows: duplicateCount,
      duplicate_profile_rows: duplicateProfileCount,
    },
    distribution: {
      top_countries: topValueCounts(rows, headers, "country"),
      top_states: topValueCounts(rows, headers, "state"),
      top_cities: topValueCounts(rows, headers, "city"),
    },
    generated_at: new Date().toISOString(),
  };

  const report = `Data Quality Report\n\nTotal records processed: ${rows.length}\nRecords ready for use (OK): ${statusCounts.OK}\nRecords needing review (REVIEW): ${statusCounts.REVIEW}\nDuplicate customer_id rows: ${duplicateCount}\nPotential duplicate profiles: ${duplicateProfileCount}\n\nTop issues:\n${Object.keys(issues)
    .map((key) => `- ${key}: ${issues[key]}`)
    .join("\n")}\n`;

  const insights = `
▶ Overall Record Summary
- Total records processed: ${rows.length}
- Records ready for use (OK): ${statusCounts.OK}
- Records needing review (REVIEW): ${statusCounts.REVIEW}
- Duplicate customer_id rows: ${duplicateCount}
- Potential duplicate profiles: ${duplicateProfileCount}

▶ Completeness Metrics (Mandatory Fields)
${requiredFields
  .map((field) => {
    const present = rows.filter((row) => row[field]).length;
    const pct = rows.length ? Math.round((present / rows.length) * 100) : 0;
    return `- ${field}: ${present}/${rows.length} (${pct}.00%)`;
  })
  .join("\n")}
`;

  return { metrics, report, insights, inferred };
};

const topValueCounts = (rows, headers, keyword) => {
  const col = headers.find((h) => h.toLowerCase().includes(keyword));
  if (!col) return {};
  const counts = {};
  rows.forEach((row) => {
    const value = row[col] || "Unknown";
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5));
};

const buildMetadataYaml = (parsed, quality) => {
  const lines = ["schema:"];
  quality.inferred.forEach((col) => {
    const sample = parsed.rows.find((row) => row[col.name])?.[col.name] || "";
    const required = /name|email|phone|country|state|city|date/i.test(col.name);
    lines.push(`  - name: ${col.name}`);
    lines.push(`    type: ${col.type}`);
    lines.push(`    required: ${required}`);
    lines.push(`    example: "${sample}"`);
  });
  return lines.join("\n");
};

const buildRulesYaml = (parsed, quality) => {
  const rules = ["rules:"];
  quality.inferred.forEach((col) => {
    rules.push(`  - column: ${col.name}`);
    if (col.type === "email") rules.push("    transform: lowercase");
    if (col.type === "phone") rules.push("    transform: digits_only");
    if (col.type === "date") rules.push("    transform: iso_date");
    if (col.type === "string") rules.push("    transform: trim");
    if (col.type === "number") rules.push("    transform: numeric");
  });
  return rules.join("\n");
};

const standardizeData = (parsed, quality) => {
  const headers = parsed.headers;
  const rows = parsed.rows.map((row) => {
    const next = {};
    headers.forEach((h) => {
      const colType = quality.inferred.find((col) => col.name === h)?.type;
      let value = (row[h] || "").trim();
      if (colType === "email") value = value.toLowerCase();
      if (colType === "phone") value = value.replace(/[^0-9]/g, "");
      if (colType === "date") {
        const parsedDate = Date.parse(value);
        value = Number.isNaN(parsedDate) ? value : new Date(parsedDate).toISOString().split("T")[0];
      }
      if (colType === "string" && /city|country|state/i.test(h)) {
        value = value.replace(/\b\w/g, (c) => c.toUpperCase());
      }
      next[h] = value;
    });
    next.status = rowHasIssues(next, quality) ? "REVIEW" : "OK";
    next.issue = buildIssueLabel(next, quality);
    return next;
  });

  const csv = buildCsv(["status", "issue", ...headers], rows);
  const sampleRows = rows.slice(0, 10);
  return { csv, sampleRows };
};

const rowHasIssues = (row, quality) => {
  const required = quality.inferred
    .filter((col) => /name|email|phone|country|state|city|date/i.test(col.name))
    .map((col) => col.name);
  return required.some((field) => !row[field]);
};

const buildIssueLabel = (row, quality) => {
  const issues = [];
  quality.inferred.forEach((col) => {
    const value = row[col.name];
    if (!value && /name|email|phone|country|state|city|date/i.test(col.name)) {
      issues.push(col.name.toLowerCase());
    }
  });
  return issues.join(", ");
};

const buildCsv = (headers, rows) => {
  const escape = (value) => {
    if (value == null) return "";
    const text = String(value);
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const body = rows.map((row) => headers.map((h) => escape(row[h])).join(",")).join("\n");
  return `${headers.join(",")}\n${body}`;
};

const buildAiInsights = async (metrics, sampleRows) => {
  const token = localStorage.getItem("mdq_hf_token") || "";
  const model = localStorage.getItem("mdq_hf_model") || "meta-llama/Meta-Llama-3-8B-Instruct";
  if (!token) {
    return `# AI Insights (Preview)\n\n- Total records: ${metrics.total_rows}\n- OK: ${metrics.status_counts.OK}\n- Review: ${metrics.status_counts.REVIEW}\n- Top issues: ${Object.keys(metrics.issue_counts).slice(0, 5).join(", ") || "None"}\n\nAdd a Hugging Face token to generate full AI insights.`;
  }

  const issueRows = sampleRows.filter((row) => String(row.status || "").toUpperCase() !== "OK");
  const prompt = [
    "You are a principal data quality and data governance consultant.",
    "Write a rich, business-first, board-ready report with enterprise rigor.",
    "Be specific and quantified using the provided metrics only.",
    "Do not invent revenue or financial numbers.",
    "Structure the report with these exact sections and professional layouts:",
    "(1) Executive Summary (3 bullets),",
    "(2) Data Quality Health Score (formula + computed score),",
    "(3) Business Impact Analysis (sales, marketing, ops, risk),",
    "(4) Key Risks & Root Causes (ranked),",
    "(5) 90-Day Roadmap (milestones + owners),",
    "(6) Governance & Controls (policies, SLAs, monitoring),",
    "(7) KPI Targets (baseline + target dates),",
    "(8) Architecture & Automation opportunities,",
    "(9) Data Stewardship Actions (RACI, cadence).",
    "Use concise bullets, short paragraphs, and sub-bullets.",
    "Use the standardized dataset only.",
    "Use the sample issue rows for examples.",
    `Metrics: ${JSON.stringify(metrics, null, 2)}`,
    `Sample issue rows (standardized):\n${issueRows.map((row) => JSON.stringify(row)).join("\n") || "None"}`,
    `Sample standardized rows:\n${sampleRows.map((row) => JSON.stringify(row)).join("\n")}`,
  ].join("\n\n");

  const { data, error } = await requestHfChat(
    [
      { role: "system", content: "You are a principal data quality and governance consultant." },
      { role: "user", content: prompt },
    ],
    {
      token,
      model,
      maxTokens: 1600,
      temperature: 0.2,
    }
  );

  if (!data) {
    return `# AI Insights (Fallback)\n\nAI request failed (${error || "unknown error"}). Update token or model and retry.`;
  }

  return data?.choices?.[0]?.message?.content || "# AI Insights\n\nNo content returned.";
};

const buildDashboardConfig = async (parsed, quality, sampleRows) => {
  const token = localStorage.getItem("mdq_hf_token") || "";
  const model = localStorage.getItem("mdq_hf_model") || "meta-llama/Meta-Llama-3-8B-Instruct";
  if (!token) {
    return JSON.stringify({ charts: [] }, null, 2);
  }

  const prompt = [
    "You are a data quality analytics architect.",
    "Choose up to 3 most meaningful charts for a data quality dashboard based on the dataset.",
    "Return ONLY valid JSON with this schema:",
    "{ \"charts\": [ { \"title\": string, \"subtitle\": string, \"type\": \"bar\"|\"pie\"|\"line\", \"labels\": string[], \"values\": number[], \"colors\": string[] (optional), \"tickAngle\": number (optional) } ] }",
    "Rules:",
    "- Use labels/values arrays of equal length.",
    "- Use only provided metrics, headers, inferred types, and sample rows.",
    "- Prefer categorical distributions and quality risk breakdowns.",
    `Headers: ${JSON.stringify(parsed.headers)}`,
    `Inferred: ${JSON.stringify(quality.inferred)}`,
    `Metrics: ${JSON.stringify(quality.metrics)}`,
    `Sample rows: ${sampleRows.map((row) => JSON.stringify(row)).join("\n")}`,
  ].join("\n");

  const { data } = await requestHfChat(
    [
      { role: "system", content: "You are a data quality analytics architect." },
      { role: "user", content: prompt },
    ],
    {
      token,
      model,
      maxTokens: 900,
      temperature: 0.2,
    }
  );

  const raw = data?.choices?.[0]?.message?.content || "";
  const cleaned = raw.replace(/```json|```/g, "").trim();
  try {
    const parsedConfig = JSON.parse(cleaned);
    return JSON.stringify(parsedConfig, null, 2);
  } catch (err) {
    return JSON.stringify({ charts: [] }, null, 2);
  }
};

const requestAiText = async (prompt) => {
  const token = localStorage.getItem("mdq_hf_token") || "";
  const model = localStorage.getItem("mdq_hf_model") || "meta-llama/Meta-Llama-3-8B-Instruct";
  if (!token) return null;
  const { data } = await requestHfChat(
    [
      { role: "system", content: "You are a data quality automation assistant." },
      { role: "user", content: prompt },
    ],
    {
      token,
      model,
      maxTokens: 900,
      temperature: 0.2,
    }
  );
  return data?.choices?.[0]?.message?.content || null;
};

const requestHfChat = async (messages, { token, model, maxTokens, temperature }) => {
  const endpoints = [
    "https://router.huggingface.co/v1/chat/completions",
    "https://api-inference.huggingface.co/v1/chat/completions",
  ];

  for (const url of endpoints) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return { data, error: null };
    }

    if (![404, 405].includes(response.status)) {
      const text = await response.text();
      return { data: null, error: `${response.status}${text ? `: ${text.slice(0, 200)}` : ""}` };
    }
  }

  return { data: null, error: "405 from both endpoints" };
};

const generateQualityInfo = async (quality) => {
  const prompt = [
    "Generate a concise data quality report in plain text.",
    `Metrics: ${JSON.stringify(quality.metrics)}`,
  ].join("\n");
  const aiText = await requestAiText(prompt);
  return aiText || quality.report;
};

const generateMetadataYaml = async (parsed, quality, qualityInfo) => {
  const sample = parsed.rows.slice(0, 6);
  const prompt = [
    "Generate metadata.yaml with schema, types, required fields, and examples.",
    `Headers: ${JSON.stringify(parsed.headers)}`,
    `Sample rows: ${JSON.stringify(sample)}`,
    `Quality report: ${qualityInfo}`,
  ].join("\n");
  const aiText = await requestAiText(prompt);
  return aiText || buildMetadataYaml(parsed, quality);
};

const generateRulesYaml = async (parsed, quality, qualityInfo, metadataYaml) => {
  const prompt = [
    "Generate rules.yaml for standardization transforms per column.",
    `Inferred: ${JSON.stringify(quality.inferred)}`,
    `Quality report: ${qualityInfo}`,
    `Metadata: ${metadataYaml}`,
  ].join("\n");
  const aiText = await requestAiText(prompt);
  return aiText || buildRulesYaml(parsed, quality);
};

const loadSettings = () => {
  const token = localStorage.getItem("mdq_hf_token") || "";
  const model = localStorage.getItem("mdq_hf_model") || "meta-llama/Meta-Llama-3-8B-Instruct";
  elements.hfToken.value = token;
  elements.hfModel.value = model;
};

init();

if (window.lucide && typeof window.lucide.createIcons === "function") {
  window.lucide.createIcons();
}
