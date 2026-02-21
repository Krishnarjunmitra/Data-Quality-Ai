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
const storeServicesKey = "mdq_selected_services";
const storeParsedKey = "mdq_parsed_files";

const state = {
  file: null,
  parsed: null,
  generated: {},
  selectedFileForDashboard: null,
  selectedServices: [],
  tempFiles: {},
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
  fileSelectModal: document.getElementById("file-select-modal"),
  closeFileSelectModal: document.getElementById("close-file-select-modal"),
  fileSelectList: document.getElementById("file-select-list"),
  hfToken: document.getElementById("hf-token"),
  hfModel: document.getElementById("hf-model"),
  saveSettings: document.getElementById("save-settings"),
  resetBtn: document.getElementById("reset-btn"),
  uploadPanel: document.getElementById("upload-panel"),
  pipelinePanel: document.getElementById("pipeline-panel"),
  servicePanel: document.getElementById("service-panel"),
  serviceCheckboxes: document.querySelectorAll('.service-item input[type="checkbox"]'),
  selectAllCheckbox: document.querySelector('.service-item input[value="all"]'),
  filesModal: document.getElementById("files-modal"),
  filesModalBody: document.getElementById("files-modal-body"),
  closeFilesModal: document.getElementById("close-files-modal"),
};

const init = () => {
  loadParsedFiles();
  renderSteps();
  renderFiles();
  loadSettings();
  bindEvents();
  // wire files modal close handlers
  try {
    elements.closeFilesModal?.addEventListener('click', closeFilesModalHandler);
    elements.filesModal?.addEventListener('click', (ev) => {
      if (ev.target === elements.filesModal) closeFilesModalHandler();
    });
  } catch (err) {
    // ignore
  }
  initTheme();
  setupThemeToggle();
  loadPipelineState();
  loadSelectedServices();
  // Ensure Start button reflects parsed files after a refresh: enable when there
  // are parsed files available so the user can start or resume manually.
  try {
    elements.processBtn.disabled = !(state.parsedFiles && state.parsedFiles.length > 0);
  } catch (err) {}

  highlightPanel("upload");
};

const bindEvents = () => {
  elements.fileInput.addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length) handleFiles(files);
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
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) handleFiles(files);
  });

  elements.processBtn.addEventListener("click", runPipeline);
  elements.viewData.addEventListener("click", showStandardizedSelectModal);
  elements.closeModal.addEventListener("click", closeDataModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) closeDataModal();
  });

  elements.downloadAll.addEventListener("click", () => {
    const files = loadGeneratedFiles();
    Object.keys(files).forEach((name) => downloadText(name, files[name]));
  });

  elements.openDashboard.addEventListener("click", showFileSelectModal);
  elements.closeFileSelectModal.addEventListener("click", closeFileSelectModal);
  elements.fileSelectModal.addEventListener("click", (event) => {
    if (event.target === elements.fileSelectModal) closeFileSelectModal();
  });

  elements.saveSettings.addEventListener("click", () => {
    localStorage.setItem("mdq_hf_token", elements.hfToken.value.trim());
    localStorage.setItem("mdq_hf_model", elements.hfModel.value.trim());
    elements.saveSettings.textContent = "Saved";
    setTimeout(() => (elements.saveSettings.textContent = "Save Settings"), 1200);
  });

  elements.resetBtn.addEventListener("click", resetAll);


  try {

    elements.serviceCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handleServiceSelection);
    });

    if (elements.selectAllCheckbox) {
      elements.selectAllCheckbox.addEventListener("change", handleSelectAll);
    }


    document.querySelectorAll('.service-item').forEach((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      if (!input) return;
      label.addEventListener('click', (ev) => {

        if (ev.target === input) return;
        ev.preventDefault();


        if (input.value === "all") {
          input.checked = !input.checked;
          handleSelectAll({ target: input });
        } else {
          input.checked = !input.checked;
          handleServiceSelection();
        }
      });
    });
  } catch (err) {
    console.warn("Service elements not found:", err);
  }
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

const handleFiles = async (files) => {

  state.files = (state.files || []).concat(Array.from(files || []));
  state.parsedFiles = state.parsedFiles || [];

  const addedInfo = [];
  for (const file of Array.from(files || [])) {

    if (state.parsedFiles.some((p) => p.file.name === file.name)) {
      addedInfo.push(`${file.name}: already uploaded`);
      continue;
    }

    const text = await file.text();
    const parsed = parseCsv(text);
    if (!parsed.headers.length) {
      addedInfo.push(`${file.name}: Invalid CSV`);
      continue;
    }
    state.parsedFiles.push({ file, parsed, rawText: text });
    saveParsedFiles();
    addedInfo.push(`${file.name} (${parsed.rows.length} rows, ${parsed.headers.length} columns)`);
  }


  const summary = state.parsedFiles.map((p) => `${p.file.name} (${p.parsed.rows.length} rows, ${p.parsed.headers.length} columns)`);
  elements.fileInfo.textContent = summary.join(" \u2022 ");

  elements.processBtn.disabled = state.parsedFiles.length === 0;
  elements.viewData.disabled = true;
  elements.openDashboard.classList.add("is-hidden");
  elements.openDashboard.disabled = true;
  elements.resetBtn.classList.remove("is-hidden");

  highlightPanel("service");
  resetSteps();
  // render compact uploaded summary (and bind view-all toggle)
  renderUploadedSummary();
  updateFileInputTooltip();
};

const saveParsedFiles = () => {
  try {
    const toSave = (state.parsedFiles || []).map((p) => ({ name: p.file.name, text: p.rawText || "" }));
    localStorage.setItem(storeParsedKey, JSON.stringify(toSave));
  } catch (err) {
    // ignore
  }
};

const loadParsedFiles = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(storeParsedKey) || "[]");
    if (!raw || !raw.length) return;
    state.parsedFiles = state.parsedFiles || [];
    for (const entry of raw) {
      try {
        const parsed = parseCsv(entry.text || "");
        state.parsedFiles.push({ file: { name: entry.name }, parsed, rawText: entry.text || "" });
      } catch (err) {
        // ignore parse errors
      }
    }
    // update UI to reflect loaded parsed files
    if (state.parsedFiles && state.parsedFiles.length) {
      const summary = state.parsedFiles.map((p) => `${p.file.name} (${p.parsed.rows.length} rows, ${p.parsed.headers.length} columns)`);
      elements.fileInfo.textContent = summary.join(" \u2022 ");
      elements.processBtn.disabled = state.parsedFiles.length === 0;
      elements.viewData.disabled = true;
      elements.openDashboard.classList.add("is-hidden");
      elements.openDashboard.disabled = true;
      elements.resetBtn.classList.remove("is-hidden");
      renderUploadedSummary();
      updateFileInputTooltip();
    }
  } catch (err) {
    // ignore
  }
};

// Update the native file-input tooltip to show only the last 4 filenames with an ellipsis at top
const updateFileInputTooltip = () => {
  try {
    if (!elements.fileInput) return;
    const parsed = state.parsedFiles || [];
    if (!parsed.length) {
      elements.fileInput.removeAttribute('title');
      return;
    }
    const last = parsed.slice(-4).map((p) => p.file.name);
    const title = ['...'].concat(last).join('\n');
    elements.fileInput.title = title;
  } catch (err) {
    // ignore
  }
};

// Render a compact summary in the upload panel. If more than 2 files uploaded,
// show the two most recent and a '..view all' toggle that opens a modal.
const renderUploadedSummary = () => {
  if (!state.parsedFiles || state.parsedFiles.length === 0) {
    elements.fileInfo.textContent = "No file selected.";
    return;
  }

  const entries = state.parsedFiles.map((p) => `${p.file.name} (${p.parsed.rows.length} rows, ${p.parsed.headers.length} columns)`);

  if (entries.length <= 2) {
    elements.fileInfo.textContent = entries.join(' \u2022 ');
    return;
  }

  const lastTwo = entries.slice(-2);
  const compactHtml = `${lastTwo.join(' \u2022 ')} <span class="files-view-more">..view all</span>`;
  elements.fileInfo.innerHTML = compactHtml;

  const btn = elements.fileInfo.querySelector('.files-view-more');
  if (btn) {
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      showFilesModal();
    });
  }
};

const showFilesModal = () => {
  if (!elements.filesModal || !elements.filesModalBody) return;
  const htmlEntries = state.parsedFiles.map((p) => {
    const name = escapeHtml(p.file.name);
    const meta = `${p.parsed.rows.length} rows, ${p.parsed.headers.length} columns`;
    return `<span class="files-modal-name">${name}</span> (${meta})`;
  });
  elements.filesModalBody.innerHTML = htmlEntries.join(' \u2022 ');
  elements.filesModal.setAttribute('aria-hidden', 'false');
};

// small HTML escape helper to avoid injection when inserting filenames
const escapeHtml = (str) => {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const closeFilesModalHandler = () => {
  if (!elements.filesModal) return;
  elements.filesModal.setAttribute('aria-hidden', 'true');
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

  elements.servicePanel?.classList.toggle("focus-panel", target === "service");

  if (target === "none") {
    elements.uploadPanel?.classList.remove("focus-panel");
    elements.pipelinePanel?.classList.remove("focus-panel");
    elements.servicePanel?.classList.remove("focus-panel");
  }
};

const renderFiles = () => {
  const files = loadGeneratedFiles();
  const allowedFiles = getAllowedFiles();


  const filteredFiles = {};
  Object.keys(files).forEach((key) => {
    const matches = allowedFiles.length === 0 || allowedFiles.some((af) => key.endsWith(`_${af}`));
    if (matches) {
      filteredFiles[key] = files[key];
    }
  });

  const rows = Object.keys(filteredFiles)
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
              <div class="hint"><strong>${formatBytes(getTextSize(filteredFiles[name]))}</strong> ${filteredFiles[name].length.toLocaleString()} chars</div>
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
    btn.addEventListener("click", () => downloadText(btn.dataset.download, filteredFiles[btn.dataset.download]));
  });

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }

  elements.downloadAll.disabled = Object.keys(filteredFiles).length === 0;


  const hasStandardizedData = Object.keys(filteredFiles).some((name) => name.includes("standardized_data.txt"));
  elements.viewData.disabled = !hasStandardizedData;


  // Only enable/Open dashboard if there is at least one dataset that has
  // both standardized data and a dashboard config generated.
  const readyForDashboard = getBasesWithSuffixes(["standardized_data.txt", "dashboard_config.json"]);
  if (readyForDashboard.length > 0) {
    elements.openDashboard.classList.remove("is-hidden");
    elements.openDashboard.disabled = false;
  } else {
    elements.openDashboard.classList.add("is-hidden");
    elements.openDashboard.disabled = true;
  }

  if (Object.keys(filteredFiles).length > 0) {
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
  localStorage.removeItem(storeParsedKey);
  state.file = null;
  state.parsed = null;
  elements.fileInput.value = "";
  elements.fileInfo.textContent = "No file selected.";
  elements.processBtn.disabled = true;
  elements.viewData.disabled = true;
  elements.openDashboard.disabled = true;
  elements.openDashboard.classList.add("is-hidden");
  elements.resetBtn.classList.add("is-hidden");
  if (elements.fileInput) elements.fileInput.removeAttribute('title');
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


const handleServiceSelection = () => {
  const selected = [];
  elements.serviceCheckboxes.forEach((checkbox) => {
    if (checkbox.checked && checkbox.value !== "all") selected.push(checkbox.value);
  });
  const serviceOrder = ["quality", "metadata", "standardize", "ai"];
  state.selectedServices = selected.sort((a, b) => serviceOrder.indexOf(a) - serviceOrder.indexOf(b));
  localStorage.setItem(storeServicesKey, JSON.stringify(state.selectedServices));


  if (elements.selectAllCheckbox) {
    const allServiceCheckboxes = Array.from(elements.serviceCheckboxes).filter((cb) => cb.value !== "all");
    const allChecked = allServiceCheckboxes.every((cb) => cb.checked);
    const anyChecked = allServiceCheckboxes.some((cb) => cb.checked);
    elements.selectAllCheckbox.checked = allChecked;
    elements.selectAllCheckbox.indeterminate = !allChecked && anyChecked;
  }

  renderFiles();
};

const handleSelectAll = (event) => {
  const isChecked = event.target.checked;
  elements.serviceCheckboxes.forEach((checkbox) => {
    if (checkbox.value !== "all") checkbox.checked = isChecked;
  });
  handleServiceSelection();
};

const loadSelectedServices = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(storeServicesKey)) || [];
    state.selectedServices = saved;
    elements.serviceCheckboxes.forEach((checkbox) => {
      if (checkbox.value !== "all") checkbox.checked = saved.includes(checkbox.value);
    });
    if (elements.selectAllCheckbox) {
      const allServiceCheckboxes = Array.from(elements.serviceCheckboxes).filter((cb) => cb.value !== "all");
      const allChecked = allServiceCheckboxes.every((cb) => cb.checked);
      elements.selectAllCheckbox.checked = allChecked;
      elements.selectAllCheckbox.indeterminate = !allChecked && allServiceCheckboxes.some((cb) => cb.checked);
    }
  } catch (err) {
    state.selectedServices = [];
  }
};

const getLastServiceIndex = () => {
  const serviceOrder = ["quality", "metadata", "standardize", "ai"];
  const lastService = state.selectedServices[state.selectedServices.length - 1];
  return serviceOrder.indexOf(lastService);
};

const getFilesForService = (service) => {
  const serviceFiles = {
    quality: ["quality_info.txt", "quality_metrics.json", "data_quality.txt"],
    metadata: ["metadata.yaml"],
    standardize: ["rules.yaml", "standardized_data.txt"],
    ai: ["ai_insights.md", "dashboard_config.json"],
  };
  return serviceFiles[service] || [];
};

const getAllowedFiles = () => {
  if (!state.selectedServices || state.selectedServices.length === 0) return [];
  const allowedFiles = [];
  state.selectedServices.forEach((service) => {
    allowedFiles.push(...getFilesForService(service));
  });
  if (state.selectedServices.includes("ai")) allowedFiles.push("dashboard_config.json");
  return allowedFiles;
};

// Compute the required generated file suffixes for the currently selected services
const getRequiredSuffixesForSelectedServices = () => {
  try {
    const req = [];
    (state.selectedServices || []).forEach((s) => {
      const files = getFilesForService(s) || [];
      req.push(...files);
    });
    // Ensure dashboard config is considered part of AI final outputs if AI is selected
    if (state.selectedServices.includes('ai') && !req.includes('dashboard_config.json')) {
      req.push('dashboard_config.json');
    }
    return Array.from(new Set(req));
  } catch (err) {
    return [];
  }
};

// Return array of base dataset names that have all provided suffixes generated
const getBasesWithSuffixes = (suffixes) => {
  const files = loadGeneratedFiles();
  const map = {};
  Object.keys(files).forEach((k) => {
    suffixes.forEach((suf) => {
      const sufKey = `_${suf}`;
      if (k.endsWith(sufKey)) {
        const base = k.slice(0, -sufKey.length);
        map[base] = map[base] || new Set();
        map[base].add(suf);
      }
    });
  });
  return Object.keys(map).filter((b) => suffixes.every((suf) => map[b].has(suf)));
};

const cleanupTempFiles = (currentFile) => {
  const files = loadGeneratedFiles();
  const allowedFiles = getAllowedFiles();

  Object.keys(files).forEach((key) => {
    const baseCurrent = currentFile.replace(/\.[^/.]+$/, "");

    if (!key.startsWith(`${baseCurrent}_`)) return;
    const basename = key.replace(`${baseCurrent}_`, "");
    const keep = allowedFiles.some((af) => basename.includes(af));
    if (!keep) delete files[key];
  });

  saveGeneratedFiles(files);
  renderFiles();
};

const loadPipelineState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storePipelineKey)) || [];
    if (!stored.length) return;
    stored.forEach((step) => {
      const el = document.getElementById(`step-${step.id}`);
      if (!el) return;
      el.className = "step";
      // Do not restore any transient "processing" classes after a refresh.
      // Convert processing -> inactive so the UI doesn't show a perpetual spinner.
      step.classes.forEach((cls) => {
        if (cls === "step" || cls === "processing") return;
        el.classList.add(cls);
      });
      const em = el.querySelector("em");
      if (em) {
        // If the stored state showed a processing message, reset to Pending to avoid confusion.
        const msg = (step.classes || []).includes("processing") ? "Pending" : step.message || "Pending";
        em.textContent = msg;
      }
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

  const standardizedFile = Object.keys(files).find((name) => name.includes('standardized_data.txt'));
  const text = standardizedFile ? files[standardizedFile] : "";
  elements.dataPreview.innerHTML = buildTablePreview(text);
  elements.modal.setAttribute("aria-hidden", "false");
};

const closeDataModal = () => {
  elements.modal.setAttribute("aria-hidden", "true");
};


const showFileSelectModal = () => {
  // Only show datasets that are ready for dashboard (have standardized data + dashboard config)
  const readyBases = getBasesWithSuffixes(["standardized_data.txt", "dashboard_config.json"]);
  if (!readyBases.length) {
    alert("No dashboard-ready datasets found. Please run the pipeline to completion for at least one dataset.");
    return;
  }

  // If there are parsed files in the session, prefer showing their base names filtered to ready ones
  let fileNames = [];
  if (state.parsedFiles && state.parsedFiles.length) {
    fileNames = state.parsedFiles.map((f) => f.file.name.replace(/\.[^/.]+$/, ""));
    fileNames = fileNames.filter((b) => readyBases.includes(b));
  } else {
    fileNames = readyBases.slice();
  }

  if (!fileNames.length) {
    alert("No dashboard-ready datasets found in the current selection.");
    return;
  }

  elements.fileSelectList.dataset.mode = "";
  delete elements.fileSelectList.dataset.keys;
  setFileSelectModalSubtitle("Choose which file to view in dashboard");
  renderFileSelectList(fileNames);

  elements.fileSelectModal.setAttribute("aria-hidden", "false");
};

const closeFileSelectModal = () => {
  elements.fileSelectModal.setAttribute("aria-hidden", "true");
};

// Update subtitle text in the file-select modal header
const setFileSelectModalSubtitle = (text) => {
  try {
    const el = document.querySelector('#file-select-modal .modal-header .panel-meta');
    if (el) el.textContent = text;
  } catch (err) {
    // ignore
  }
};

const renderFileSelectList = (fileNames) => {

  elements.fileSelectList.classList.remove("cols-2", "cols-3");
  elements.fileSelectModal.classList.remove("cols-2", "cols-3");
  const count = (fileNames || []).length;
  // Use two columns for up to 8 datasets, switch to three columns from 9+
  if (count <= 8) {
    elements.fileSelectList.classList.add("cols-2");
    elements.fileSelectModal.classList.add("cols-2");
  } else {
    elements.fileSelectList.classList.add("cols-3");
    elements.fileSelectModal.classList.add("cols-3");
  }

  const rows = fileNames
    .map(
      (name) => `
      <div class="file-select-row" data-filename="${name}">
        <div class="file-select-info">
          <i data-lucide="file-text" class="file-icon"></i>
          <strong>${name}</strong>
        </div>
        <button class="select-file-btn ghost" type="button">
          Open
        </button>
      </div>
    `
    )
    .join("");

  elements.fileSelectList.innerHTML = rows || "<div class='hint'>No files available.</div>";

  elements.fileSelectList.querySelectorAll(".select-file-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const row = e.target.closest(".file-select-row");
      const filename = row.dataset.filename;
      const mode = elements.fileSelectList.dataset.mode || "";
      if (mode === "standardized") {

        try {
          const keys = JSON.parse(elements.fileSelectList.dataset.keys || "[]");
          const idx = Array.from(elements.fileSelectList.querySelectorAll('.file-select-row')).findIndex(r => r.dataset.filename === filename);
          const fileKey = keys[idx];
          if (fileKey) {
            closeFileSelectModal();
            openDataModalForKey(fileKey);
            return;
          }
        } catch (err) {

        }
      }
      openDashboardForFile(filename);
    });
  });

  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
};


const showStandardizedSelectModal = () => {
  const files = loadGeneratedFiles();
  const entries = Object.keys(files).filter((k) => k.includes("standardized_data.txt"));
  if (!entries.length) {
    alert("No standardized data found. Run the pipeline first.");
    return;
  }

  const fileNames = entries.map((key) => key.replace(/_standardized_data\.txt$/, ""));
  setFileSelectModalSubtitle("Choose which standardized dataset to preview");
  renderFileSelectList(fileNames);

  elements.fileSelectList.dataset.mode = "standardized";
  elements.fileSelectList.dataset.keys = JSON.stringify(entries);
  elements.fileSelectModal.setAttribute("aria-hidden", "false");
};

const openDataModalForKey = (fileKey) => {
  const files = loadGeneratedFiles();
  const text = files[fileKey] || "";
  elements.dataPreview.innerHTML = buildTablePreview(text);
  elements.modal.setAttribute("aria-hidden", "false");
};

const openDashboardForFile = (filename) => {
  // use localStorage so the selection is available to the new tab
  try {
    localStorage.setItem("mdq_selected_dashboard_file", filename);
  } catch (err) {
    // fallback to sessionStorage if localStorage is unavailable
    sessionStorage.setItem("mdq_selected_dashboard_file", filename);
  }
  closeFileSelectModal();
  // open dashboard in a new tab
  window.open("dashboard/index.html", "_blank");
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
  if (!state.parsedFiles || !state.parsedFiles.length) return;
  if (!state.selectedServices || state.selectedServices.length === 0) {
    alert("Please select at least one service");
    return;
  }

  elements.processBtn.disabled = true;
  highlightPanel("pipeline");


  stepsConfig.forEach((step) => {
    const el = document.getElementById(`step-${step.id}`);
    if (el) {
      if (step.id === "loading") {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    }
  });


  const serviceOrder = ["quality", "metadata", "standardize", "ai"];
  const lastServiceIndex = getLastServiceIndex();


  const mapStepToService = (stepId) => {
    if (stepId === "loading") return "loading";
    if (stepId === "quality") return "quality";
    if (stepId === "metadata") return "metadata";
    if (["rules", "engine", "standardized"].includes(stepId)) return "standardize";
    if (stepId === "ai") return "ai";
    if (stepId === "dashboard") return "dashboard";
    return null;
  };


  stepsConfig.forEach((step) => {
    const mapped = mapStepToService(step.id);
    if (mapped === "loading") {
      showStep(step.id);
      return;
    }
    if (mapped === "dashboard") {
      if (state.selectedServices.includes("ai")) showStep(step.id);
      return;
    }
    if (!mapped) return;
    const idx = serviceOrder.indexOf(mapped);
    if (idx !== -1 && idx <= lastServiceIndex) showStep(step.id);
  });

  let allFiles = loadGeneratedFiles();

  for (let i = 0; i < state.parsedFiles.length; i++) {
    const { file, parsed } = state.parsedFiles[i];
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const fileNum = state.parsedFiles.length > 1 ? ` (${i + 1}/${state.parsedFiles.length})` : "";

    // Skip datasets that are already fully generated for the selected services.
    // This prevents re-running completed work after a refresh or re-start.
    try {
      const required = getRequiredSuffixesForSelectedServices();
      if (required && required.length) {
        const allPresent = required.every((suf) => Boolean(allFiles[`${baseName}_${suf}`]));
        if (allPresent) {
          // already completed for selected services — skip
          continue;
        }
      }
    } catch (err) {
      // ignore and proceed
    }


    setStep("loading", "processing", `Loading ${file.name}...`);
    await wait(400);
    setStep("loading", "complete", `${file.name} loaded`);


    setStep("quality", "processing", `Assessing quality for ${file.name}...`);
    const quality = assessQuality(parsed);
    const qualityInfo = await generateQualityInfo(quality);
    await wait(400);
    allFiles[`${baseName}_quality_info.txt`] = qualityInfo;
    allFiles[`${baseName}_data_quality.txt`] = quality.insights;
    allFiles[`${baseName}_quality_metrics.json`] = JSON.stringify(quality.metrics, null, 2);
    saveGeneratedFiles(allFiles);
    renderFiles();
    setStep("quality", "complete", `Quality assessed for ${file.name}`);


    if (lastServiceIndex === 0) {
      cleanupTempFiles(file.name);
      if (i < state.parsedFiles.length - 1) setStep("loading", "processing", "Preparing next file...");
      continue;
    }


    if (state.selectedServices.includes("metadata") || lastServiceIndex >= 1) {
      setStep("metadata", "processing", `Generating metadata for ${file.name}...`);
      const metadataYaml = await generateMetadataYaml(parsed, quality, qualityInfo);
      await wait(400);
      allFiles[`${baseName}_metadata.yaml`] = metadataYaml;
      saveGeneratedFiles(allFiles);
      renderFiles();
      setStep("metadata", "complete", `Generated metadata for ${file.name}`);
    }

    if (lastServiceIndex === 1) {
      cleanupTempFiles(file.name);
      if (i < state.parsedFiles.length - 1) setStep("loading", "processing", "Preparing next file...");
      continue;
    }


    if (state.selectedServices.includes("standardize") || lastServiceIndex >= 2) {
      setStep("rules", "processing", `Generating rules for ${file.name}...`);
      const rulesYaml = await generateRulesYaml(parsed, quality, qualityInfo, allFiles[`${baseName}_metadata.yaml`] || "");
      await wait(400);
      allFiles[`${baseName}_rules.yaml`] = rulesYaml;
      saveGeneratedFiles(allFiles);
      renderFiles();
      setStep("rules", "complete", `Generated rules for ${file.name}`);

      setStep("engine", "processing", `Preparing standardization for ${file.name}...`);
      await wait(400);
      setStep("engine", "complete", `Standardization ready for ${file.name}`);

      setStep("standardized", "processing", `Standardizing ${file.name}...`);
      const { csv, sampleRows } = standardizeData(parsed, quality);
      await wait(400);
      allFiles[`${baseName}_standardized_data.txt`] = csv;
      saveGeneratedFiles(allFiles);
      renderFiles();
      setStep("standardized", "complete", `Standardized ${file.name}`);
    }

    if (lastServiceIndex === 2) {
      cleanupTempFiles(file.name);
      if (i < state.parsedFiles.length - 1) setStep("loading", "processing", "Preparing next file...");
      continue;
    }


    if (state.selectedServices.includes("ai") || lastServiceIndex >= 3) {
      setStep("ai", "processing", `Generating AI insights${fileNum}...`);
      const sampleRows = parseCsv(allFiles[`${baseName}_standardized_data.txt`] || "").rows.slice(0, 10);
      const aiInsights = await buildAiInsights(quality.metrics, sampleRows);
      await wait(400);
      allFiles[`${baseName}_ai_insights.md`] = aiInsights;

      const dashboardConfig = await buildDashboardConfig(parsed, quality, sampleRows);
      allFiles[`${baseName}_dashboard_config.json`] = dashboardConfig;

      saveGeneratedFiles(allFiles);
      renderFiles();
      setStep("ai", "complete", `AI insights ready for ${file.name}`);
    }


    if (i < state.parsedFiles.length - 1 && !state.selectedServices.includes("ai")) {
      cleanupTempFiles(file.name);
    }

    if (i < state.parsedFiles.length - 1) setStep("loading", "processing", "Preparing next file...");
  }


  if (state.selectedServices.includes("ai")) {
    setStep("dashboard", "processing", "Finalizing...");
    await wait(400);
    setStep("dashboard", "complete", "Ready to open dashboard");
  } else {

    const lastIdx = getLastServiceIndex();
    const map = ["quality", "metadata", "standardize", "ai"];
    const finalStep = map[lastIdx];
    if (finalStep) setStep(finalStep, "complete", "Process completed");


    const dashEl = document.getElementById("step-dashboard");
    if (dashEl) {

      const title = dashEl.querySelector("span");
      if (title) title.textContent = "Process completed";
      showStep("dashboard");
      setStep("dashboard", "complete", "Files are ready to download");
    }
  }

  highlightPanel("none");
  saveGeneratedFiles(allFiles);
  renderFiles();

  const hasStandardizedData = Object.keys(allFiles).some((name) => name.includes("standardized_data.txt") && state.selectedServices.includes("standardize"));
  elements.viewData.disabled = !hasStandardizedData;
  const readyForDashboard = getBasesWithSuffixes(["standardized_data.txt", "dashboard_config.json"]);
  elements.openDashboard.disabled = readyForDashboard.length === 0;
  elements.openDashboard.classList.toggle("is-hidden", readyForDashboard.length === 0);
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
