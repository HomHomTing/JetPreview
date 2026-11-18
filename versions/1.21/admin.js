const iconSpecConfig = window.AIRCRAFT_ICON_CONFIG || {};
const timeUtils = window.BIZJET_TIME || {};
const DEFAULT_ICON_KEY = iconSpecConfig.defaultIconKey || "LJ60";
const STORAGE_KEY = "aircraft-icon-control-console:v1.12:icao-code-icon-map";
const LEGACY_STORAGE_KEYS = ["aircraft-icon-control-console:v1.7:template-shadow-fr24yellow"];
const RUNTIME_CONFIG_STORAGE_KEY = "aircraft-icon-runtime-config:v1.12";
const CONSOLE_SCHEMA_VERSION = "1.12.0";
const DEFAULT_USER = "Local Admin";
const forcedConfigIconKeys = new Set(["GL7T", "GL8T", "GA7C"]);
const forcedConfigTypeCodes = new Set(["GL7T", "GL8T", "GA7C"]);
const noForcedConfigKeys = new Set();

const sizeClasses = iconSpecConfig.sizeClasses || ["light", "midsize", "super-midsize", "long-range", "ultra-long"];
const sizeClassLabels = {
  light: "Light",
  midsize: "Midsize",
  "super-midsize": "Super Midsize",
  "long-range": "Long Range",
  "ultra-long": "Ultra Long"
};
const categoryOptions = iconSpecConfig.categoryOptions || ["Business Jet", "Commercial Jet", "Regional Jet", "Turboprop", "Light Aircraft", "Helicopter"];
const statusOptions = ["Draft", "Active", "Archived"];

const aircraftZoomSizeMatrix = [
  { zoom: 2, sizes: { light: 22, midsize: 24, "super-midsize": 26, "long-range": 28, "ultra-long": 30 } },
  { zoom: 3, sizes: { light: 24, midsize: 27, "super-midsize": 30, "long-range": 32, "ultra-long": 34 } },
  { zoom: 4, sizes: { light: 27, midsize: 31, "super-midsize": 34, "long-range": 37, "ultra-long": 39 } },
  { zoom: 5, sizes: { light: 31, midsize: 35, "super-midsize": 39, "long-range": 42, "ultra-long": 45 } },
  { zoom: 6, sizes: { light: 34, midsize: 39, "super-midsize": 43, "long-range": 47, "ultra-long": 51 } },
  { zoom: 7, sizes: { light: 36, midsize: 41, "super-midsize": 46, "long-range": 50, "ultra-long": 54 } },
  { zoom: 9, sizes: { light: 38, midsize: 43, "super-midsize": 48, "long-range": 53, "ultra-long": 58 } },
  { zoom: 12, sizes: { light: 39, midsize: 45, "super-midsize": 50, "long-range": 55, "ultra-long": 60 } }
];

const aircraftIconPaths = {
  ...(iconSpecConfig.iconPaths || {}),
  lj45: "M32 4.5c2.8 0 4.6 13.4 5.3 19.7l17.8 7.2c1.1.4 1.8 1.4 1.8 2.6v3.3L38 33.6l-1 8.7 7.4 4.4V50l-10.1-2L32 59.5 29.7 48l-10.1 2v-3.3l7.4-4.4-1-8.7-18.9 3.7V34c0-1.2.7-2.2 1.8-2.6l17.8-7.2c.7-6.3 2.5-19.7 5.3-19.7Z",
  a388: "M32 2.5c3.8 0 5.9 15.9 6.9 22.6l22.2 8.6c1.3.5 2.1 1.7 2.1 3.1v4.1l-24-5.6-1.4 11.7 9.8 6.1v4.2l-12.8-2.9L32 62l-2.8-7.6-12.8 2.9v-4.2l9.8-6.1-1.4-11.7-24 5.6v-4.1c0-1.4.8-2.6 2.1-3.1l22.2-8.6c1-6.7 3.1-22.6 6.9-22.6ZM13.9 35.8h5.4v3.2h-5.4Zm30.8 0h5.4v3.2h-5.4Z",
  b744: "M32 3.5c3.5 0 5.5 15 6.5 21.5l20.8 8.3c1.2.5 1.9 1.6 1.9 2.9v3.9l-22.3-5.2-1.2 11.1 9.1 5.7v4l-12.1-2.7L32 61l-2.7-8-12.1 2.7v-4l9.1-5.7-1.2-11.1-22.3 5.2v-3.9c0-1.3.7-2.4 1.9-2.9L25.5 25C26.5 18.5 28.5 3.5 32 3.5ZM14.7 35.6h4.5v3.1h-4.5Zm44.3.2h-4.5v3.1H59Zm-39.4-2.2h4.3v2.9h-4.3Zm24.5 0h4.3v2.9h-4.3Z",
  b77w: "M32 3.5c3.3 0 5.4 15.1 6.3 21.6l20 8.6c1.1.5 1.8 1.6 1.8 2.8v3.8l-21.4-5.1-1.3 11.2 9 5.8V56l-11.7-2.6L32 61l-2.7-7.6L17.6 56v-3.8l9-5.8-1.3-11.2-21.4 5.1v-3.8c0-1.2.7-2.3 1.8-2.8l20-8.6C26.6 18.6 28.7 3.5 32 3.5ZM18.3 36h5.4v3.6h-5.4Zm22 0h5.4v3.6h-5.4Z",
  b738: "M32 6c2.9 0 4.8 13.4 5.6 19.1L56 32.9c1.1.5 1.7 1.5 1.7 2.7v3.2l-19.6-4.4-1.1 9.4 7.5 4.8v3.5l-10.2-2.2L32 59l-2.3-9.1-10.2 2.2v-3.5l7.5-4.8-1.1-9.4-19.6 4.4v-3.2c0-1.2.6-2.2 1.7-2.7l18.4-7.8C27.2 19.4 29.1 6 32 6ZM20 36.2h4.6v3.2H20Zm19.4 0H44v3.2h-4.6Z",
  a320: "M32 6.5c2.8 0 4.7 13 5.4 18.7l17.8 7.5c1.1.5 1.7 1.5 1.7 2.6v3.1l-19-4.2-1 9.2 7.2 4.6v3.4l-9.8-2.1L32 58.5l-2.3-9.2-9.8 2.1V48l7.2-4.6-1-9.2-19 4.2v-3.1c0-1.1.6-2.1 1.7-2.6l17.8-7.5c.7-5.7 2.6-18.7 5.4-18.7ZM21 36.2h4.1v3H21Zm17.9 0H43v3h-4.1Z",
  e190: "M32 8c2.4 0 4.1 11.7 4.8 16.8l16.8 7c1 .4 1.6 1.4 1.6 2.5v2.9L37.4 33l-.9 8.8 6.5 4.1v3.1l-9-2L32 55.5 30 47l-9 2v-3.1l6.5-4.1-.9-8.8-17.8 4.2v-2.9c0-1.1.6-2.1 1.6-2.5l16.8-7C27.9 19.7 29.6 8 32 8Z",
  at76: "M32 8c2.2 0 3.8 11 4.5 16.2l18.3 5.4c1.1.3 1.8 1.3 1.8 2.5v3.2L37.3 33l-.9 8.7 6.7 4.2v3.2l-9.2-2L32 56l-1.9-8.9-9.2 2v-3.2l6.7-4.2-.9-8.7-19.3 2.3v-3.2c0-1.2.7-2.2 1.8-2.5l18.3-5.4C28.2 19 29.8 8 32 8ZM14.5 30.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm35 0a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
  c172: "M32 11c1.8 0 3.2 8.8 3.9 13.5l17.5 3.2c1 .2 1.7 1.1 1.7 2.2v3L36.8 31l-.7 7.6 5.6 3.5v2.9l-7.8-1.7L32 53l-1.9-9.7-7.8 1.7v-2.9l5.6-3.5-.7-7.6L8.9 32.9v-3c0-1.1.7-2 1.7-2.2l17.5-3.2C28.8 19.8 30.2 11 32 11Z",
  h135: "M30.5 14h3v13.2l21.5-1.4c1.1-.1 2 .8 2 1.9v2.1L38 32l6.5 5.9h8.7c1.1 0 2 .9 2 2v2.3H43.1l-6.7-4.5-1.1 9.1 5.9 3.7v3l-8.1-1.8L32 59l-1.1-7.3-8.1 1.8v-3l5.9-3.7-1.1-9.1-6.7 4.5H8.8v-2.3c0-1.1.9-2 2-2h8.7L26 32 7 29.8v-2.1c0-1.1.9-2 2-1.9l21.5 1.4V14Zm-20-3.2h43v2.8h-43Z"
};
const aircraftIconImagePaths = iconSpecConfig.iconImagePaths || {};
const fr24AircraftIconStyle = {
  fill: "#FDB813",
  stroke: "rgb(18, 25, 32)",
  glow: "rgba(253, 184, 19, 0.18)",
  hoverGlow: "rgba(253, 184, 19, 0.3)"
};

const aircraftIconStyles = {
  ...(iconSpecConfig.iconStyles || {}),
  ...Object.fromEntries(
    ["lj45", "a388", "b744", "b77w", "b738", "a320", "e190", "at76", "c172", "h135"].map((iconKey) => [iconKey, { ...fr24AircraftIconStyle }])
  )
};
Object.keys(aircraftIconStyles).forEach((iconKey) => {
  aircraftIconStyles[iconKey] = {
    ...aircraftIconStyles[iconKey],
    ...fr24AircraftIconStyle
  };
});

const configuredDefaultIconAssets = (iconSpecConfig.iconAssets || []).map((asset) => ({
  ...asset,
  fr24IconKey: asset.fr24IconKey || asset.iconKey
}));
const defaultIconAssets = configuredDefaultIconAssets.length ? configuredDefaultIconAssets : [
  iconAsset("lj45", "Business Jet", "Business Jet", "long-range"),
  iconAsset("a388", "Airbus A380", "Commercial Jet", "ultra-long"),
  iconAsset("b744", "Boeing 747", "Commercial Jet", "ultra-long"),
  iconAsset("b77w", "Boeing 777-300ER", "Commercial Jet", "ultra-long"),
  iconAsset("b738", "Boeing 737-800", "Commercial Jet", "long-range"),
  iconAsset("a320", "Airbus A320 Family", "Commercial Jet", "long-range"),
  iconAsset("e190", "Embraer E190", "Regional Jet", "midsize"),
  iconAsset("at76", "ATR 72", "Turboprop", "midsize"),
  iconAsset("c172", "Cessna 172", "Light Aircraft", "light"),
  iconAsset("h135", "Airbus H135", "Helicopter", "light")
];

const configuredDefaultMappings = (iconSpecConfig.typeMappings || []).map((item) => ({
  icaoCode: String(item.icaoCode || item.aircraftTypeCode || "").trim(),
  aircraftTypeCode: String(item.aircraftTypeCode || item.icaoCode || "").trim(),
  manufacturer: String(item.manufacturer || "Multiple").trim(),
  modelNames: Array.isArray(item.modelNames) && item.modelNames.length ? item.modelNames : [item.icaoCode || item.aircraftTypeCode],
  aircraftCategory: String(item.aircraftCategory || item.category || "Business Jet").trim(),
  sizeClass: String(item.sizeClass || "long-range").trim(),
  fr24IconKey: String(item.fr24IconKey || item.iconKey || DEFAULT_ICON_KEY).trim(),
  colorOverride: String(item.colorOverride || "").trim(),
  status: String(item.status || "Active").trim(),
  effectiveFrom: String(item.effectiveFrom || "").trim(),
  effectiveTo: String(item.effectiveTo || "").trim(),
  notes: String(item.notes || `${iconSpecConfig.sourceTitle || "Icon spec"} / ${item.iconKey || item.fr24IconKey || DEFAULT_ICON_KEY}`).trim(),
  updatedAt: item.updatedAt || iconSpecConfig.sourceDate || "2026-07-31T10:00:00+08:00",
  updatedBy: item.updatedBy || "Template shadow FR24 yellow asset set"
}));
const defaultMappings = configuredDefaultMappings.length ? configuredDefaultMappings : [
  mapping("GLF6", "Gulfstream", ["Gulfstream G650ER"], "Business Jet", "ultra-long", "LJ60", "Business jet baseline mapping."),
  mapping("GL7T", "Bombardier", ["Bombardier Global 7500"], "Business Jet", "ultra-long", "GL7T", "Ultra-long Global 7500 icon mapping."),
  mapping("GL8T", "Bombardier", ["Bombardier Global 8000"], "Business Jet", "ultra-long", "GL8T", "Ultra-long Global 8000 icon mapping."),
  mapping("GA7C", "Gulfstream", ["Gulfstream G700"], "Business Jet", "ultra-long", "GA7C", "Ultra-long G700 icon mapping."),
  mapping("FA8X", "Dassault", ["Dassault Falcon 8X"], "Business Jet", "long-range", "LJ60", "Business jet baseline mapping."),
  mapping("C700", "Cessna", ["Cessna Citation Longitude"], "Business Jet", "midsize", "LJ60", "Business jet baseline mapping."),
  mapping("GLF5", "Gulfstream", ["Gulfstream G550"], "Business Jet", "long-range", "LJ60", "Business jet baseline mapping."),
  mapping("GLEX", "Bombardier", ["Bombardier Global 6000"], "Business Jet", "long-range", "LJ60", "Business jet baseline mapping."),
  mapping("E550", "Embraer", ["Embraer Praetor 600"], "Business Jet", "super-midsize", "LJ60", "Business jet baseline mapping."),
  mapping("PC24", "Pilatus", ["Pilatus PC-24"], "Business Jet", "light", "LJ60", "Business jet baseline mapping."),
  mapping("CL35", "Bombardier", ["Bombardier Challenger 350"], "Business Jet", "super-midsize", "LJ60", "Business jet baseline mapping."),
  mapping("FA7X", "Dassault", ["Dassault Falcon 7X"], "Business Jet", "long-range", "LJ60", "Business jet baseline mapping."),
  mapping("GA5C", "Gulfstream", ["Gulfstream G500"], "Business Jet", "long-range", "LJ60", "Business jet baseline mapping."),
  mapping("A388", "Airbus", ["Airbus A380-800"], "Commercial Jet", "ultra-long", "a388", "Icon sample mapping."),
  mapping("B744", "Boeing", ["Boeing 747-400"], "Commercial Jet", "ultra-long", "b744", "Icon sample mapping."),
  mapping("B77W", "Boeing", ["Boeing 777-300ER"], "Commercial Jet", "ultra-long", "b77w", "Icon sample mapping."),
  mapping("B738", "Boeing", ["Boeing 737-800"], "Commercial Jet", "long-range", "b738", "Icon sample mapping."),
  mapping("A20N", "Airbus", ["Airbus A320neo"], "Commercial Jet", "long-range", "a320", "Icon sample mapping."),
  mapping("A320", "Airbus", ["Airbus A320"], "Commercial Jet", "long-range", "a320", "Icon sample mapping."),
  mapping("E190", "Embraer", ["Embraer E190"], "Regional Jet", "midsize", "e190", "Icon sample mapping."),
  mapping("AT76", "ATR", ["ATR 72-600"], "Turboprop", "midsize", "at76", "Icon sample mapping."),
  mapping("C172", "Cessna", ["Cessna 172"], "Light Aircraft", "light", "c172", "Icon sample mapping."),
  mapping("H135", "Airbus Helicopters", ["Airbus H135"], "Helicopter", "light", "h135", "Icon sample mapping.")
];

const viewTitles = {
  dashboard: "Dashboard",
  icons: "Icon ICAO 配置",
  mappings: "ICAO Code 映射",
  preview: "Preview Lab",
  publish: "Publish Center",
  audit: "Audit Log",
  settings: "Settings"
};

let state = loadState();

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  render();
});

function iconAsset(iconKey, displayName, category, defaultSizeClass) {
  const style = aircraftIconStyles[iconKey];
  return {
    iconKey,
    displayName,
    category,
    sourceMode: "custom-equivalent-assets",
    assetPath: `assets/aircraft-icons/custom-equivalent/${iconKey}.svg`,
    viewBox: "0 0 64 64",
    defaultFill: style.fill,
    defaultStroke: style.stroke,
    defaultSizeClass,
    status: "Active",
    licenseRef: "owned-custom",
    checksum: `local-${iconKey}-1.1`,
    updatedAt: "2026-07-31T10:00:00+08:00",
    updatedBy: "Seed 1.1"
  };
}

function mapping(aircraftTypeCode, manufacturer, modelNames, aircraftCategory, sizeClass, fr24IconKey, notes) {
  const icaoCode = normalizeTypeCode(aircraftTypeCode);
  return {
    icaoCode,
    aircraftTypeCode: icaoCode,
    manufacturer,
    modelNames,
    aircraftCategory,
    sizeClass,
    fr24IconKey,
    colorOverride: "",
    status: "Active",
    effectiveFrom: "",
    effectiveTo: "",
    notes,
    updatedAt: "2026-07-31T10:00:00+08:00",
    updatedBy: "Seed 1.1"
  };
}

function bindEvents() {
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("submit", handleSubmit);
}

function handleClick(event) {
  const navButton = event.target.closest("[data-view]");
  if (navButton) {
    state.selectedView = navButton.dataset.view;
    render();
    return;
  }

  const row = event.target.closest("[data-code-row]");
  if (row && !event.target.closest("button, input, select, textarea, a")) {
    selectMapping(row.dataset.codeRow);
    return;
  }

  const iconCard = event.target.closest("[data-icon-card]");
  if (iconCard && !event.target.closest("button, input, select, textarea, a")) {
    state.preview.selectedIconKey = iconCard.dataset.iconCard;
    state.filters.icon = iconCard.dataset.iconCard;
    state.selectedView = "preview";
    render();
    return;
  }

  const bgButton = event.target.closest("[data-preview-bg]");
  if (bgButton) {
    state.preview.background = bgButton.dataset.previewBg;
    render();
    return;
  }

  const rollbackButton = event.target.closest("[data-rollback-snapshot]");
  if (rollbackButton) {
    rollbackToSnapshot(rollbackButton.dataset.rollbackSnapshot);
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) {
    return;
  }

  const action = actionButton.dataset.action;
  if (action === "publish-shortcut") {
    state.selectedView = "publish";
    render();
    return;
  }
  if (action === "new-mapping") {
    state.editorDraft = createBlankMapping();
    state.selectedCode = "";
    state.selectedView = "mappings";
    render();
    focusEditorCode();
    return;
  }
  if (action === "duplicate-mapping") {
    duplicateSelectedMapping();
    return;
  }
  if (action === "archive-mapping") {
    archiveSelectedMapping();
    return;
  }
  if (action === "delete-mapping") {
    deleteSelectedMapping();
    return;
  }
  if (action === "export-json") {
    exportJson();
    return;
  }
  if (action === "save-local-plan") {
    saveLocalPlan();
    return;
  }
  if (action === "export-csv") {
    exportCsv();
    return;
  }
  if (action === "import-draft") {
    importDraft();
    return;
  }
  if (action === "publish-draft") {
    publishDraft();
    return;
  }
  if (action === "publish-map-runtime") {
    publishCurrentDraftToMap();
    return;
  }
  if (action === "apply-bulk-icon") {
    applyBulkIcon();
    return;
  }
  if (action === "apply-bulk-size") {
    applyBulkSize();
    return;
  }
  if (action === "add-icon-codes") {
    addCodesToIcon(actionButton.dataset.iconKey);
    return;
  }
  if (action === "remove-icon-code") {
    removeCodeFromIcon(actionButton.dataset.iconKey, actionButton.dataset.icaoCode);
    return;
  }
  if (action === "clear-filters") {
    state.filters = createSeedFilters();
    render();
    return;
  }
  if (action === "reset-local-state") {
    resetLocalState();
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.id === "mappingSearch") {
    state.filters.query = target.value;
    renderPreservingFocus();
    return;
  }
  if (target.id === "iconSearch") {
    state.iconFilters.query = target.value;
    renderPreservingFocus();
    return;
  }
  if (target.id === "releaseNote") {
    state.releaseNote = target.value;
    saveState();
    return;
  }
  if (target.closest("#mappingForm")) {
    updateEditorLivePreview();
  }
}

function handleChange(event) {
  const target = event.target;

  if (target.matches("[data-select-code]")) {
    toggleSelectedCode(target.value, target.checked);
    renderTypeMappings();
    saveState();
    return;
  }
  if (target.id === "selectAllMappings") {
    state.selectedCodes = target.checked ? getFilteredMappings().map(mappingCode) : [];
    renderTypeMappings();
    saveState();
    return;
  }
  if (target.id === "filterIcon") {
    state.filters.icon = target.value;
    render();
    return;
  }
  if (target.id === "filterCategory") {
    state.filters.category = target.value;
    render();
    return;
  }
  if (target.id === "filterSize") {
    state.filters.size = target.value;
    render();
    return;
  }
  if (target.id === "filterStatus") {
    state.filters.status = target.value;
    render();
    return;
  }
  if (target.id === "iconCategoryFilter") {
    state.iconFilters.category = target.value;
    render();
    return;
  }
  if (target.id === "iconStatusFilter") {
    state.iconFilters.status = target.value;
    render();
    return;
  }
  if (target.id === "previewTypeSelect") {
    state.preview.selectedTypeCode = target.value;
    const mappingRow = getMapping(target.value);
    if (mappingRow) {
      state.preview.selectedIconKey = mappingRow.fr24IconKey;
    }
    render();
    return;
  }
  if (target.id === "previewIconSelect") {
    state.preview.selectedIconKey = target.value;
    render();
    return;
  }
  if (target.closest("#mappingForm")) {
    updateEditorLivePreview();
  }
}

function handleSubmit(event) {
  if (event.target.id !== "mappingForm") {
    return;
  }
  event.preventDefault();
  saveMappingForm(event.target);
}

function render() {
  renderChrome();
  renderDashboard();
  renderIconLibrary();
  renderTypeMappings();
  renderPreviewLab();
  renderPublishCenter();
  renderAuditLog();
  renderSettings();
  renderEditor();
  saveState();
}

function renderChrome() {
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === state.selectedView);
  });
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.selectedView);
  });

  document.getElementById("pageTitle").textContent = viewTitles[state.selectedView] || "Dashboard";
  document.getElementById("sidebarVersion").textContent = state.publishedVersion;
}

function renderDashboard() {
  const stats = getStats();
  const diff = getMappingDiff();
  const recentAudit = state.audit.slice(0, 8);
  const topIcons = getIconUsage()
    .filter((item) => item.count > 0)
    .slice(0, 8);

  document.getElementById("dashboardView").innerHTML = `
    <div class="metric-grid">
      ${metricCard("已发布版本", state.publishedVersion, formatDate(state.publishedAt))}
      ${metricCard("Active 映射", stats.activeMappings, `${stats.mappingCount} 条总记录`)}
      ${metricCard("使用中图标", stats.usedIcons, `${stats.iconCount} 个可用图标`)}
      ${metricCard("待发布变化", diff.total, `${diff.added.length} 新增 / ${diff.changed.length} 修改 / ${diff.archived.length} 归档`)}
      ${metricCard("校验问题", stats.errorCount, `${stats.warningCount} 条提醒`)}
    </div>

    <div class="section-grid section-grid--two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>最近修改</h2>
            <p>本地草稿的操作审计记录。</p>
          </div>
          <button class="button button--small" type="button" data-action="new-mapping"><svg><use href="#icon-plus"></use></svg><span>新增映射</span></button>
        </div>
        ${recentAudit.length ? compactAuditList(recentAudit) : emptyState("暂无修改记录")}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>图标使用分布</h2>
            <p>按 Active 映射统计。</p>
          </div>
          <button class="button button--small button--ghost" type="button" data-view="preview"><svg><use href="#icon-eye"></use></svg><span>预览</span></button>
        </div>
        <div class="snapshot-list">
          ${topIcons.map((item) => `
            <div class="rule-row" data-icon-card="${escapeHtml(item.icon.iconKey)}">
              <div class="mini-aircraft-cell">
                ${aircraftSvg(item.icon.iconKey, { size: 38 })}
                <span><strong>${escapeHtml(item.icon.displayName)}</strong><span>${escapeHtml(item.icon.iconKey)} · ${item.count} 个 ICAO Code</span></span>
              </div>
              <span class="status-pill" data-status="${escapeHtml(item.icon.status)}">${escapeHtml(item.icon.status)}</span>
            </div>
          `).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderIconLibrary() {
  const icons = getFilteredIcons();
  const categories = uniqueValues(state.icons.map((item) => item.category));
  const diff = getMappingDiff();
  const stats = getStats();
  const draftSummary = diff.total
    ? `${diff.added.length} 新增 / ${diff.changed.length} 修改 / ${diff.archived.length} 归档 / ${diff.removed.length} 删除`
    : "当前没有待发布变化";
  const validationLabel = stats.errorCount ? `${stats.errorCount} error` : "校验通过";

  document.getElementById("iconsView").innerHTML = `
    <div class="toolbar">
      <div class="field-cluster">
        <label class="search-field">
          <svg><use href="#icon-search"></use></svg>
          <input id="iconSearch" type="search" value="${escapeHtml(state.iconFilters.query)}" placeholder="搜索 icon key / 名称 / 分类">
        </label>
        ${selectHtml("iconCategoryFilter", ["all", ...categories], state.iconFilters.category, { all: "全部分类" }, "compact-select")}
        ${selectHtml("iconStatusFilter", ["all", ...statusOptions], state.iconFilters.status, { all: "全部状态" }, "compact-select")}
      </div>
      <div class="row-actions">
        <button class="button button--ghost" type="button" data-action="save-local-plan"><svg><use href="#icon-save"></use></svg><span>保存本地方案</span></button>
        <button class="button button--primary" type="button" data-action="publish-map-runtime" ${stats.errorCount ? "disabled" : ""}><svg><use href="#icon-publish"></use></svg><span>发布到地图生效</span></button>
        <button class="button button--ghost" type="button" data-action="export-json"><svg><use href="#icon-download"></use></svg><span>导出配置</span></button>
      </div>
    </div>

    <section class="panel icon-publish-panel">
      <div class="icon-publish-panel__copy">
        <strong>本地方案</strong>
        <span>调整 ICAO Code 与 icon 的绑定后，先保存本地方案；发布到地图后刷新地图页生效。</span>
      </div>
      <div class="icon-publish-panel__meta">
        <span class="issue-pill" data-severity="${diff.total ? "warning" : "ok"}">${escapeHtml(draftSummary)}</span>
        <span class="issue-pill" data-severity="${stats.errorCount ? "error" : "ok"}">${escapeHtml(validationLabel)}</span>
        <small>本地保存 ${escapeHtml(formatDate(state.localPlanSavedAt))} · 地图发布 ${escapeHtml(formatDate(state.mapRuntimePublishedAt))}</small>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>图标资产库</h2>
          <p>当前图标只作为本地检验资料；Active 图标可被机型映射引用。</p>
        </div>
        <span class="issue-pill">${icons.length} / ${state.icons.length}</span>
      </div>
      ${icons.length ? `<div class="icon-grid">${icons.map(iconCard).join("")}</div>` : emptyState("未找到匹配图标")}
    </section>
  `;
}

function renderTypeMappings() {
  const mappings = getFilteredMappings();
  const allFilteredSelected = mappings.length > 0 && mappings.every((item) => state.selectedCodes.includes(mappingCode(item)));
  const iconOptions = ["all", ...state.icons.map((item) => item.iconKey)];
  const categories = ["all", ...categoryOptions];
  const sizes = ["all", ...sizeClasses];
  const statuses = ["all", ...statusOptions];

  document.getElementById("mappingsView").innerHTML = `
    <div class="toolbar">
      <div class="field-cluster">
        <label class="search-field">
          <svg><use href="#icon-search"></use></svg>
          <input id="mappingSearch" type="search" value="${escapeHtml(state.filters.query)}" placeholder="搜索 ICAO Code / 制造商 / 机型 / icon key">
        </label>
        ${selectHtml("filterIcon", iconOptions, state.filters.icon, { all: "全部图标" }, "compact-select")}
        ${selectHtml("filterCategory", categories, state.filters.category, { all: "全部分类" }, "compact-select")}
        ${selectHtml("filterSize", sizes, state.filters.size, { all: "全部尺寸", ...sizeClassLabels }, "compact-select")}
        ${selectHtml("filterStatus", statuses, state.filters.status, { all: "全部状态" }, "compact-select")}
      </div>
      <div class="row-actions">
        <button class="button button--ghost" type="button" data-action="clear-filters">清除筛选</button>
        <button class="button" type="button" data-action="new-mapping"><svg><use href="#icon-plus"></use></svg><span>新增映射</span></button>
      </div>
    </div>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>ICAO Code 映射</h2>
          <p>保存进入草稿，发布后本地地图页读取新配置。</p>
        </div>
        <span class="issue-pill">${mappings.length} 条结果</span>
      </div>

      <div class="toolbar">
        <div class="field-cluster">
          ${selectHtml("bulkIconSelect", state.icons.filter((item) => item.status === "Active").map((item) => item.iconKey), DEFAULT_ICON_KEY, {}, "compact-select")}
          <button class="button button--small" type="button" data-action="apply-bulk-icon" ${state.selectedCodes.length ? "" : "disabled"}>批量分配图标</button>
          ${selectHtml("bulkSizeSelect", sizeClasses, "long-range", sizeClassLabels, "compact-select")}
          <button class="button button--small" type="button" data-action="apply-bulk-size" ${state.selectedCodes.length ? "" : "disabled"}>批量设置尺寸</button>
        </div>
        <span class="muted">${state.selectedCodes.length} 条已选</span>
      </div>

      <div class="table-wrap">
        <table class="data-table">
          <colgroup>
            <col style="width:44px">
            <col style="width:86px">
            <col style="width:124px">
            <col style="width:220px">
            <col style="width:132px">
            <col style="width:124px">
            <col style="width:130px">
            <col style="width:96px">
            <col style="width:112px">
            <col style="width:132px">
          </colgroup>
          <thead>
            <tr>
              <th><input id="selectAllMappings" type="checkbox" ${allFilteredSelected ? "checked" : ""} aria-label="全选当前结果"></th>
              <th>ICAO Code</th>
              <th>制造商</th>
              <th>机型名称</th>
              <th>分类</th>
              <th>尺寸</th>
              <th>Icon Key</th>
              <th>状态</th>
              <th>草稿</th>
              <th>更新</th>
            </tr>
          </thead>
          <tbody>
            ${mappings.map(mappingRow).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderPreviewLab() {
  const selectedMapping = getMapping(state.preview.selectedTypeCode) || getMapping(state.selectedCode) || state.mappings[0];
  const selectedCode = mappingCode(selectedMapping);
  const iconKey = state.preview.selectedIconKey || selectedMapping?.fr24IconKey || DEFAULT_ICON_KEY;
  const icon = getIcon(iconKey) || getIcon(DEFAULT_ICON_KEY);
  const sizeClass = selectedMapping?.sizeClass || icon.defaultSizeClass || "long-range";
  const zoomCards = aircraftZoomSizeMatrix.map(({ zoom }) => {
    const size = sizeForZoom(sizeClass, zoom);
    return `
      <div class="preview-tile">
        <strong>Zoom ${zoom}</strong>
        <div class="state-strip">
          ${aircraftSvg(iconKey, { size, stateName: "default", heading: -18 })}
          ${aircraftSvg(iconKey, { size, stateName: "hover", heading: -18 })}
          ${aircraftSvg(iconKey, { size, stateName: "selected", heading: -18 })}
        </div>
        <span>${size}px · ${escapeHtml(sizeClassLabels[sizeClass] || sizeClass)}</span>
      </div>
    `;
  }).join("");

  document.getElementById("previewView").innerHTML = `
    <div class="preview-controls">
      <div class="form-field">
        <label for="previewTypeSelect">ICAO Code</label>
        ${selectHtml("previewTypeSelect", state.mappings.map(mappingCode), selectedCode, {}, "")}
      </div>
      <div class="form-field">
        <label for="previewIconSelect">Icon Key</label>
        ${selectHtml("previewIconSelect", state.icons.map((item) => item.iconKey), iconKey, {}, "")}
      </div>
      <div class="form-field">
        <label>地图背景</label>
        <div class="segmented">
          ${["land", "ocean", "dark"].map((bg) => `<button type="button" data-preview-bg="${bg}" class="${state.preview.background === bg ? "is-active" : ""}">${bgLabel(bg)}</button>`).join("")}
        </div>
      </div>
    </div>

    <div class="section-grid section-grid--two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>地图预览</h2>
            <p>显示默认、hover、selected 三种状态，以及标签和航迹线。</p>
          </div>
          <span class="code-chip">${escapeHtml(selectedCode || iconKey)}</span>
        </div>
        <div class="map-preview" data-bg="${escapeHtml(state.preview.background)}">
          <div class="map-route"></div>
          <div class="map-aircraft" style="left: 33%; top: 56%;">
            ${aircraftSvg(iconKey, { size: sizeForZoom(sizeClass, 5), stateName: "default", heading: 63 })}
            <small>${escapeHtml(selectedCode || iconKey)} · default</small>
          </div>
          <div class="map-aircraft" style="left: 52%; top: 46%;">
            ${aircraftSvg(iconKey, { size: sizeForZoom(sizeClass, 6), stateName: "hover", heading: 63 })}
            <small>${escapeHtml(icon.displayName)} · hover</small>
          </div>
          <div class="map-aircraft" style="left: 70%; top: 37%;">
            ${aircraftSvg(iconKey, { size: sizeForZoom(sizeClass, 7), stateName: "selected", heading: 63 })}
            <small>${escapeHtml(sizeClassLabels[sizeClass] || sizeClass)} · selected</small>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>图标资料</h2>
            <p>当前映射和图标资产元数据。</p>
          </div>
          <button class="button button--small" type="button" data-view="mappings"><svg><use href="#icon-table"></use></svg><span>编辑</span></button>
        </div>
        <div class="snapshot-list">
          ${infoRow("Icon Key", icon.iconKey)}
          ${infoRow("显示名称", icon.displayName)}
          ${infoRow("分类", icon.category)}
          ${infoRow("资产路径", icon.assetPath)}
          ${infoRow("授权", icon.licenseRef)}
          ${infoRow("默认尺寸", sizeClassLabels[icon.defaultSizeClass] || icon.defaultSizeClass)}
        </div>
      </section>
    </div>

    <section class="panel" style="margin-top: 14px;">
      <div class="panel-header">
        <div>
          <h2>缩放尺寸矩阵</h2>
          <p>每格依次展示 default、hover、selected。</p>
        </div>
        <span class="issue-pill">shadow low ratio</span>
      </div>
      <div class="zoom-grid">${zoomCards}</div>
    </section>
  `;
}

function renderPublishCenter() {
  const diff = getMappingDiff();
  const issues = validateMappings();
  const blockingIssues = issues.filter((issue) => issue.severity === "error");
  const affectedIcons = uniqueValues([...diff.added, ...diff.changed, ...diff.archived].map((item) => item.fr24IconKey)).filter(Boolean);

  document.getElementById("publishView").innerHTML = `
    <div class="section-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>发布差异</h2>
            <p>草稿与当前已发布快照的对比。</p>
          </div>
          <span class="code-chip">${escapeHtml(state.publishedVersion)}</span>
        </div>
        <div class="diff-grid">
          ${diffBox("新增", diff.added.length, "new ICAO codes")}
          ${diffBox("修改", diff.changed.length, "changed mappings")}
          ${diffBox("归档", diff.archived.length, "archived mappings")}
          ${diffBox("受影响图标", affectedIcons.length, affectedIcons.join(", ") || "none")}
        </div>
      </section>

      <div class="section-grid section-grid--two">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>发布前校验</h2>
              <p>存在 error 时不能发布。</p>
            </div>
            <span class="issue-pill" data-severity="${blockingIssues.length ? "error" : "ok"}">${blockingIssues.length ? `${blockingIssues.length} error` : "pass"}</span>
          </div>
          ${issues.length ? `<div class="validation-list">${issues.slice(0, 8).map(validationItem).join("")}</div>` : emptyState("当前草稿没有校验问题")}
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>发布操作</h2>
              <p>发布会生成新的本地快照，并写入地图页读取的运行时配置。</p>
            </div>
          </div>
          <div class="form-grid">
            <div class="form-field">
              <label for="releaseNote">发布说明 <small>必填</small></label>
              <textarea id="releaseNote" placeholder="例如：调整 ICAO Code 与 icon 映射，补充 GL7T / GA7C 专属图标。">${escapeHtml(state.releaseNote)}</textarea>
            </div>
            <div class="button-row">
              <button class="button button--primary" type="button" data-action="publish-draft"><svg><use href="#icon-publish"></use></svg><span>发布到地图生效</span></button>
              <button class="button button--ghost" type="button" data-action="export-json"><svg><use href="#icon-download"></use></svg><span>导出 JSON</span></button>
              <button class="button button--ghost" type="button" data-action="export-csv"><svg><use href="#icon-download"></use></svg><span>导出 CSV</span></button>
            </div>
          </div>
        </section>
      </div>

      <div class="section-grid section-grid--two">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>导入草稿</h2>
              <p>粘贴 JSON 或 CSV，不会直接发布。</p>
            </div>
          </div>
          <div class="import-box">
            <textarea id="importText" spellcheck="false" placeholder="JSON: { &quot;icaoCodeMappings&quot;: [...] }&#10;CSV: icaoCode,manufacturer,modelNames,aircraftCategory,sizeClass,iconKey,notes"></textarea>
            <button class="button" type="button" data-action="import-draft"><svg><use href="#icon-upload"></use></svg><span>导入为 Draft</span></button>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>版本快照</h2>
              <p>可回滚到历史快照，回滚会生成新版本。</p>
            </div>
          </div>
          <div class="snapshot-list">
            ${state.snapshots.map((snapshot) => snapshotRow(snapshot)).join("")}
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>变化明细</h2>
            <p>展示本次发布会影响的机型代码。</p>
          </div>
        </div>
        ${diff.total ? diffTable(diff) : emptyState("草稿与已发布版本一致")}
      </section>
    </div>
  `;
}

function renderAuditLog() {
  document.getElementById("auditView").innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>操作审计</h2>
          <p>记录本地后台中的新增、修改、发布和回滚。</p>
        </div>
        <span class="issue-pill">${state.audit.length} 条</span>
      </div>
      ${state.audit.length ? auditTable(state.audit) : emptyState("暂无审计记录")}
    </section>
  `;
}

function renderSettings() {
  const schemaSample = {
    schemaVersion: CONSOLE_SCHEMA_VERSION,
    publishedVersion: state.publishedVersion,
    runtimeStorageKey: RUNTIME_CONFIG_STORAGE_KEY,
    iconAssets: "IconAsset[]",
    icaoCodeMappings: "IcaoCodeIconMapping[]",
    icaoCodeIconMap: "Record<icaoCode, iconKey>",
    publishSnapshot: "PublishSnapshot"
  };

  document.getElementById("settingsView").innerHTML = `
    <div class="section-grid section-grid--two">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>校验规则</h2>
            <p>后台保存和发布时使用同一套核心规则。</p>
          </div>
        </div>
        <div class="rule-list">
          ${ruleRow("ICAO Code", "2-10 位大写字母或数字，保存时自动转大写。")}
          ${ruleRow("唯一性", "同一环境内 Active ICAO Code 只能对应一个 icon key。")}
          ${ruleRow("图标引用", "Icon key 必须存在且为 Active；归档图标不能用于新映射。")}
          ${ruleRow("必填信息", "制造商、机型名称、分类、尺寸、icon key 均不能为空。")}
          ${ruleRow("本地发布", "发布草稿会写入浏览器本地运行时配置，刷新地图页后生效。")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>本地配置</h2>
            <p>当前版本使用浏览器本地存储模拟后台服务。</p>
          </div>
        </div>
        <div class="import-box">
          <textarea readonly>${escapeHtml(JSON.stringify(schemaSample, null, 2))}</textarea>
          <button class="button button--danger" type="button" data-action="reset-local-state"><svg><use href="#icon-trash"></use></svg><span>重置本地草稿</span></button>
        </div>
      </section>
    </div>
  `;
}

function renderEditor() {
  const selected = state.editorDraft || getMapping(state.selectedCode) || state.mappings[0] || createBlankMapping();
  const selectedIcaoCode = mappingCode(selected);
  const originalCode = state.editorDraft ? "" : selectedIcaoCode;
  const issues = validateMappingDraft(selected, originalCode);
  const iconOptions = state.icons
    .filter((item) => item.status === "Active" || item.iconKey === selected.fr24IconKey)
    .map((item) => item.iconKey);

  document.getElementById("editorPanel").innerHTML = `
    <div class="editor-title">
      <div>
        <h2>${state.editorDraft ? "新增映射" : "编辑映射"}</h2>
        <p>保存为草稿，不直接影响地图页。</p>
      </div>
      <button class="icon-button" type="button" data-action="new-mapping" aria-label="新增映射"><svg><use href="#icon-plus"></use></svg></button>
    </div>

    <div class="editor-preview">
      <div id="editorIconPreview">${aircraftSvg(selected.fr24IconKey || DEFAULT_ICON_KEY, { size: 52, stateName: "hover", heading: -18 })}</div>
      <div>
        <strong id="editorPreviewTitle">${escapeHtml(selectedIcaoCode || "NEW")}</strong>
        <span id="editorPreviewHint">${escapeHtml(selected.fr24IconKey || DEFAULT_ICON_KEY)} · ${escapeHtml(sizeClassLabels[selected.sizeClass] || selected.sizeClass || "Long Range")}</span>
      </div>
    </div>

    <form id="mappingForm" data-original-code="${escapeHtml(originalCode)}">
      <div class="form-grid">
        <div class="form-field">
          <label for="aircraftTypeCode">Aircraft Type Code / ICAO Code <small>必填</small></label>
          <input id="aircraftTypeCode" name="aircraftTypeCode" value="${escapeHtml(selectedIcaoCode)}" maxlength="10" autocomplete="off" placeholder="GLF6">
        </div>
        <div class="form-field">
          <label for="manufacturer">制造商 <small>必填</small></label>
          <input id="manufacturer" name="manufacturer" value="${escapeHtml(selected.manufacturer)}" autocomplete="off" placeholder="Gulfstream">
        </div>
        <div class="form-field">
          <label for="modelNames">机型名称 <small>用分号分隔别名</small></label>
          <textarea id="modelNames" name="modelNames" placeholder="Gulfstream G650ER">${escapeHtml((selected.modelNames || []).join("; "))}</textarea>
        </div>
        <div class="form-field">
          <label for="aircraftCategory">分类</label>
          ${selectHtml("aircraftCategory", categoryOptions, selected.aircraftCategory, {}, "")}
        </div>
        <div class="form-field">
          <label for="sizeClass">尺寸等级</label>
          ${selectHtml("sizeClass", sizeClasses, selected.sizeClass, sizeClassLabels, "")}
        </div>
        <div class="form-field">
          <label for="fr24IconKey">Icon key</label>
          ${selectHtml("fr24IconKey", iconOptions, selected.fr24IconKey, {}, "")}
        </div>
        <div class="form-field">
          <label for="status">状态</label>
          ${selectHtml("status", statusOptions, selected.status || "Draft", {}, "")}
        </div>
        <div class="form-field">
          <label for="notes">维护说明</label>
          <textarea id="notes" name="notes" placeholder="说明这条映射的来源或修改原因">${escapeHtml(selected.notes)}</textarea>
        </div>
      </div>
      <div class="validation-list" id="editorValidation">
        ${issues.length ? issues.map(validationItem).join("") : validationItem({ severity: "ok", message: "当前编辑项校验通过。" })}
      </div>
      <div class="editor-actions">
        <button class="button button--primary" type="submit"><svg><use href="#icon-save"></use></svg><span>保存草稿</span></button>
        <button class="button button--ghost" type="button" data-action="duplicate-mapping"><svg><use href="#icon-copy"></use></svg><span>复制</span></button>
        <button class="button button--danger" type="button" data-action="archive-mapping"><svg><use href="#icon-trash"></use></svg><span>归档</span></button>
      </div>
    </form>
  `;
}

function metricCard(label, value, detail) {
  const compactClass = String(value).length > 9 ? " class=\"is-compact\"" : "";
  return `
    <div class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong${compactClass}>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function iconCard(icon) {
  const usage = state.mappings
    .filter((item) => item.fr24IconKey === icon.iconKey && item.status !== "Archived")
    .map(mappingCode);

  return `
    <div class="icon-card" data-icon-card="${escapeHtml(icon.iconKey)}">
      ${aircraftSvg(icon.iconKey, { size: 52, stateName: "hover", heading: -12 })}
      <div class="icon-card__meta">
        <strong>${escapeHtml(icon.iconKey)} · ${escapeHtml(icon.displayName)}</strong>
        <span>${escapeHtml(icon.category)} · ${escapeHtml(sizeClassLabels[icon.defaultSizeClass] || icon.defaultSizeClass)}</span>
        <small>${usage.length ? `${usage.length} 个 ICAO Code` : "未被引用"}</small>
      </div>
      <div class="icon-code-editor">
        <div class="code-chip-list">
          ${usage.length ? usage.map((code) => `
            <span class="code-chip code-chip--editable">${escapeHtml(code)}<button type="button" data-action="remove-icon-code" data-icon-key="${escapeHtml(icon.iconKey)}" data-icao-code="${escapeHtml(code)}" aria-label="移除 ${escapeHtml(code)}">×</button></span>
          `).join("") : `<span class="muted">暂无 ICAO Code</span>`}
        </div>
        <div class="icon-code-input-row">
          <input data-icon-code-input="${escapeHtml(icon.iconKey)}" type="text" placeholder="粘贴 ICAO Code，如 GL7T GA7C">
          <button class="button button--small" type="button" data-action="add-icon-codes" data-icon-key="${escapeHtml(icon.iconKey)}">绑定</button>
        </div>
      </div>
    </div>
  `;
}

function mappingRow(item) {
  const code = mappingCode(item);
  const isSelected = state.selectedCode === code;
  const isChecked = state.selectedCodes.includes(code);
  const draftState = draftLabel(item);
  const icon = getIcon(item.fr24IconKey);

  return `
    <tr data-code-row="${escapeHtml(code)}" class="${isSelected ? "is-selected" : ""}">
      <td><input type="checkbox" data-select-code value="${escapeHtml(code)}" ${isChecked ? "checked" : ""} aria-label="选择 ${escapeHtml(code)}"></td>
      <td><span class="code-chip">${escapeHtml(code)}</span></td>
      <td title="${escapeHtml(item.manufacturer)}">${escapeHtml(item.manufacturer)}</td>
      <td title="${escapeHtml((item.modelNames || []).join("; "))}">${escapeHtml((item.modelNames || []).join("; "))}</td>
      <td><span class="category-pill">${escapeHtml(item.aircraftCategory)}</span></td>
      <td>${escapeHtml(sizeClassLabels[item.sizeClass] || item.sizeClass)}</td>
      <td>
        <div class="mini-aircraft-cell">
          ${aircraftSvg(item.fr24IconKey, { size: 28 })}
          <span>${escapeHtml(icon?.iconKey || item.fr24IconKey)}</span>
        </div>
      </td>
      <td><span class="status-pill" data-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
      <td><span class="issue-pill" data-severity="${draftState.severity}">${escapeHtml(draftState.label)}</span></td>
      <td title="${escapeHtml(item.updatedBy)}">${escapeHtml(formatDate(item.updatedAt))}</td>
    </tr>
  `;
}

function aircraftSvg(iconKey, options = {}) {
  const key = aircraftIconPaths[iconKey] || aircraftIconImagePaths[iconKey] ? iconKey : DEFAULT_ICON_KEY;
  const size = options.size || 42;
  const stateName = options.stateName || "default";
  const heading = options.heading || 0;
  const style = aircraftIconStyles[key] || aircraftIconStyles[DEFAULT_ICON_KEY] || aircraftIconStyles.lj45;
  const fill = style.fill;
  const stroke = style.stroke;
  const glow = stateName === "hover" ? style.hoverGlow : style.glow;
  const className = stateName === "hover" ? "is-hover" : stateName === "selected" ? "is-selected" : "";
  const imagePath = aircraftIconImagePaths[key] || "";
  const iconGraphic = imagePath
    ? `<img class="aircraft-preview__image" src="${escapeHtml(imagePath)}" alt="">`
    : `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="${aircraftIconPaths[key]}" fill="${fill}" stroke="${stroke}" stroke-width="1.15" stroke-linejoin="round"></path>
      </svg>`;

  return `
    <span class="aircraft-preview ${className}" style="--preview-size: ${size}px; --preview-heading: ${heading}deg; --preview-glow: ${glow};" title="${escapeHtml(key)}">
      ${iconGraphic}
    </span>
  `;
}

function auditTable(rows) {
  return `
    <div class="table-wrap">
      <table class="data-table data-table--audit">
        <colgroup>
          <col style="width:96px">
          <col style="width:128px">
          <col style="width:112px">
          <col style="width:108px">
          <col>
        </colgroup>
        <thead>
          <tr>
            <th>时间</th>
            <th>动作</th>
            <th>目标</th>
            <th>操作人</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${escapeHtml(formatDate(row.time))}</td>
              <td>${escapeHtml(row.action)}</td>
              <td>${escapeHtml(row.target)}</td>
              <td>${escapeHtml(row.user)}</td>
              <td title="${escapeHtml(row.detail)}">${escapeHtml(row.detail)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function compactAuditList(rows) {
  return `
    <div class="snapshot-list">
      ${rows.map((row) => `
        <div class="rule-row">
          <div>
            <strong>${escapeHtml(row.action)} · ${escapeHtml(row.target)}</strong>
            <span>${escapeHtml(formatDate(row.time))} · ${escapeHtml(row.user)} · ${escapeHtml(row.detail)}</span>
          </div>
          <span class="status-pill" data-status="Draft">log</span>
        </div>
      `).join("")}
    </div>
  `;
}

function diffTable(diff) {
  const rows = [
    ...diff.added.map((item) => ({ type: "新增", item })),
    ...diff.changed.map((item) => ({ type: "修改", item })),
    ...diff.archived.map((item) => ({ type: "归档", item })),
    ...diff.removed.map((item) => ({ type: "移除", item }))
  ];

  return `
    <div class="table-wrap">
      <table class="data-table">
        <colgroup>
          <col style="width:90px">
          <col style="width:90px">
          <col style="width:132px">
          <col style="width:220px">
          <col style="width:130px">
          <col style="width:118px">
          <col>
        </colgroup>
        <thead>
          <tr>
            <th>变化</th>
            <th>ICAO Code</th>
            <th>制造商</th>
            <th>机型名称</th>
            <th>Icon Key</th>
            <th>状态</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(({ type, item }) => `
            <tr data-code-row="${escapeHtml(mappingCode(item))}">
              <td><span class="issue-pill">${escapeHtml(type)}</span></td>
              <td><span class="code-chip">${escapeHtml(mappingCode(item))}</span></td>
              <td>${escapeHtml(item.manufacturer)}</td>
              <td>${escapeHtml((item.modelNames || []).join("; "))}</td>
              <td>${escapeHtml(item.fr24IconKey)}</td>
              <td><span class="status-pill" data-status="${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td>
              <td>${escapeHtml(item.notes || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function snapshotRow(snapshot) {
  return `
    <div class="snapshot-row">
      <div>
        <strong>${escapeHtml(snapshot.version)}</strong>
        <span>${escapeHtml(formatDate(snapshot.publishedAt))} · ${snapshot.mappingCount} mappings · ${snapshot.iconCount} icons${snapshot.rollbackOf ? ` · rollback of ${escapeHtml(snapshot.rollbackOf)}` : ""}</span>
      </div>
      <button class="button button--small button--ghost" type="button" data-rollback-snapshot="${escapeHtml(snapshot.snapshotId)}">回滚</button>
    </div>
  `;
}

function ruleRow(title, description) {
  return `
    <div class="rule-row">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>
      <span class="status-pill" data-status="Active">enabled</span>
    </div>
  `;
}

function infoRow(title, value) {
  return `
    <div class="rule-row">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(value || "-")}</span>
      </div>
    </div>
  `;
}

function diffBox(label, value, detail) {
  return `
    <div class="diff-box">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(detail)}</small>
    </div>
  `;
}

function validationItem(issue) {
  const severity = issue.severity || "ok";
  return `<div class="validation-item" data-severity="${escapeHtml(severity)}">${escapeHtml(issue.message)}</div>`;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function selectHtml(id, values, selected, labels = {}, className = "") {
  return `
    <select id="${escapeHtml(id)}" name="${escapeHtml(id)}" class="${escapeHtml(className)}">
      ${values.map((value) => {
        const label = labels[value] || value;
        return `<option value="${escapeHtml(value)}" ${value === selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
      }).join("")}
    </select>
  `;
}

function getStats() {
  const issues = validateMappings();
  const activeMappings = state.mappings.filter((item) => item.status !== "Archived").length;
  const usedIcons = new Set(state.mappings.filter((item) => item.status !== "Archived").map((item) => item.fr24IconKey)).size;
  return {
    mappingCount: state.mappings.length,
    activeMappings,
    iconCount: state.icons.filter((item) => item.status === "Active").length,
    usedIcons,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length
  };
}

function getIconUsage() {
  return state.icons.map((icon) => ({
    icon,
    count: state.mappings.filter((mappingItem) => mappingItem.status !== "Archived" && mappingItem.fr24IconKey === icon.iconKey).length
  }));
}

function getFilteredIcons() {
  const query = state.iconFilters.query.trim().toLowerCase();
  return state.icons.filter((icon) => {
    const text = `${icon.iconKey} ${icon.displayName} ${icon.category} ${icon.assetPath}`.toLowerCase();
    return (!query || text.includes(query))
      && (state.iconFilters.category === "all" || icon.category === state.iconFilters.category)
      && (state.iconFilters.status === "all" || icon.status === state.iconFilters.status);
  });
}

function getFilteredMappings() {
  const query = state.filters.query.trim().toLowerCase();
  return state.mappings.filter((item) => {
    const text = [
      mappingCode(item),
      item.manufacturer,
      (item.modelNames || []).join(" "),
      item.aircraftCategory,
      item.sizeClass,
      item.fr24IconKey,
      item.status
    ].join(" ").toLowerCase();

    return (!query || text.includes(query))
      && (state.filters.icon === "all" || item.fr24IconKey === state.filters.icon)
      && (state.filters.category === "all" || item.aircraftCategory === state.filters.category)
      && (state.filters.size === "all" || item.sizeClass === state.filters.size)
      && (state.filters.status === "all" || item.status === state.filters.status);
  });
}

function getMapping(code) {
  const normalizedCode = normalizeTypeCode(code);
  return state.mappings.find((item) => mappingCode(item) === normalizedCode);
}

function getIcon(iconKey) {
  return state.icons.find((item) => item.iconKey === iconKey);
}

function selectMapping(code) {
  state.selectedCode = code;
  state.editorDraft = null;
  state.preview.selectedTypeCode = code;
  const selected = getMapping(code);
  if (selected) {
    state.preview.selectedIconKey = selected.fr24IconKey;
  }
  render();
}

function toggleSelectedCode(code, checked) {
  const set = new Set(state.selectedCodes);
  if (checked) {
    set.add(code);
  } else {
    set.delete(code);
  }
  state.selectedCodes = [...set];
}

function duplicateSelectedMapping() {
  const selected = state.editorDraft || getMapping(state.selectedCode);
  if (!selected) {
    showToast("请先选择一条映射。");
    return;
  }
  state.editorDraft = {
    ...deepClone(selected),
    icaoCode: "",
    aircraftTypeCode: "",
    modelNames: [...(selected.modelNames || [])],
    status: "Draft",
    notes: `${selected.notes || ""} Copied from ${mappingCode(selected)}.`.trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: DEFAULT_USER
  };
  state.selectedCode = "";
  render();
  focusEditorCode();
  showToast("已复制为新草稿，请填写新的 ICAO Code。");
}

function archiveSelectedMapping() {
  const selected = getMapping(state.selectedCode);
  if (!selected) {
    showToast("请先选择一条已保存映射。");
    return;
  }
  selected.status = "Archived";
  selected.updatedAt = new Date().toISOString();
  selected.updatedBy = DEFAULT_USER;
  addAudit("Archive mapping", mappingCode(selected), `${mappingCode(selected)} archived.`);
  render();
  showToast(`${mappingCode(selected)} 已归档为草稿变更。`);
}

function deleteSelectedMapping() {
  const selected = getMapping(state.selectedCode);
  if (!selected) {
    state.editorDraft = createBlankMapping();
    render();
    return;
  }
  const selectedCode = mappingCode(selected);
  const published = state.publishedMappings.some((item) => mappingCode(item) === selectedCode);
  if (published) {
    showToast("已发布过的映射请使用归档，避免历史快照断链。");
    return;
  }
  if (!window.confirm(`确认移除 ${selectedCode} 这条未发布草稿？`)) {
    return;
  }
  state.mappings = state.mappings.filter((item) => mappingCode(item) !== selectedCode);
  state.selectedCode = mappingCode(state.mappings[0]);
  addAudit("Delete draft", selectedCode, "Removed unpublished draft mapping.");
  render();
}

function saveMappingForm(form) {
  const originalCode = form.dataset.originalCode;
  const draft = normalizeMappingRecord(readMappingForm(form));
  const issues = validateMappingDraft(draft, originalCode);
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length) {
    document.getElementById("editorValidation").innerHTML = issues.map(validationItem).join("");
    showToast("当前映射还有校验错误，暂不能保存。");
    return;
  }

  const draftCode = mappingCode(draft);
  const existingIndex = state.mappings.findIndex((item) => mappingCode(item) === draftCode);
  const originalIndex = originalCode ? state.mappings.findIndex((item) => mappingCode(item) === originalCode) : -1;
  const next = {
    ...draft,
    updatedAt: new Date().toISOString(),
    updatedBy: DEFAULT_USER
  };

  if (existingIndex >= 0 && mappingCode(state.mappings[existingIndex]) !== originalCode) {
    showToast(`${draftCode} 已存在，不能重复保存。`);
    return;
  }

  if (originalIndex >= 0) {
    state.mappings[originalIndex] = next;
  } else if (existingIndex >= 0) {
    state.mappings[existingIndex] = next;
  } else {
    state.mappings.unshift(next);
  }

  if (originalCode && originalCode !== draftCode) {
    state.mappings = state.mappings.filter((item, index) => mappingCode(item) !== originalCode || index === state.mappings.findIndex((row) => mappingCode(row) === draftCode));
  }

  state.selectedCode = draftCode;
  state.preview.selectedTypeCode = draftCode;
  state.preview.selectedIconKey = next.fr24IconKey;
  state.editorDraft = null;
  addAudit("Save draft", draftCode, `${draftCode} -> ${next.fr24IconKey}`);
  render();
  showToast(`${draftCode} 已保存为草稿。`);
}

function readMappingForm(form) {
  const data = new FormData(form);
  const icaoCode = normalizeTypeCode(data.get("aircraftTypeCode"));
  return {
    icaoCode,
    aircraftTypeCode: icaoCode,
    manufacturer: String(data.get("manufacturer") || "").trim(),
    modelNames: splitModelNames(data.get("modelNames")),
    aircraftCategory: String(data.get("aircraftCategory") || "").trim(),
    sizeClass: String(data.get("sizeClass") || "").trim(),
    fr24IconKey: String(data.get("fr24IconKey") || "").trim(),
    colorOverride: "",
    status: String(data.get("status") || "Draft").trim(),
    effectiveFrom: "",
    effectiveTo: "",
    notes: String(data.get("notes") || "").trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: DEFAULT_USER
  };
}

function updateEditorLivePreview() {
  const form = document.getElementById("mappingForm");
  if (!form) {
    return;
  }
  const originalCode = form.dataset.originalCode;
  const draft = normalizeMappingRecord(readMappingForm(form));
  const title = document.getElementById("editorPreviewTitle");
  const hint = document.getElementById("editorPreviewHint");
  const preview = document.getElementById("editorIconPreview");
  const validation = document.getElementById("editorValidation");
  title.textContent = mappingCode(draft) || "NEW";
  hint.textContent = `${draft.fr24IconKey || DEFAULT_ICON_KEY} · ${sizeClassLabels[draft.sizeClass] || draft.sizeClass || "Long Range"}`;
  preview.innerHTML = aircraftSvg(draft.fr24IconKey || DEFAULT_ICON_KEY, { size: 52, stateName: "hover", heading: -18 });
  const issues = validateMappingDraft(draft, originalCode);
  validation.innerHTML = issues.length ? issues.map(validationItem).join("") : validationItem({ severity: "ok", message: "当前编辑项校验通过。" });
}

function applyBulkIcon() {
  if (!state.selectedCodes.length) {
    showToast("请先勾选要批量处理的 ICAO Code。");
    return;
  }
  const iconKey = document.getElementById("bulkIconSelect")?.value;
  if (!getIcon(iconKey)) {
    showToast("请选择有效的 icon key。");
    return;
  }
  state.mappings = state.mappings.map((item) => state.selectedCodes.includes(mappingCode(item))
    ? { ...item, fr24IconKey: iconKey, status: item.status === "Archived" ? "Archived" : "Draft", updatedAt: new Date().toISOString(), updatedBy: DEFAULT_USER }
    : item);
  addAudit("Bulk icon update", `${state.selectedCodes.length} mappings`, `Assigned ${iconKey}.`);
  render();
  showToast(`已将 ${state.selectedCodes.length} 条映射分配到 ${iconKey}。`);
}

function applyBulkSize() {
  if (!state.selectedCodes.length) {
    showToast("请先勾选要批量处理的 ICAO Code。");
    return;
  }
  const sizeClass = document.getElementById("bulkSizeSelect")?.value;
  if (!sizeClasses.includes(sizeClass)) {
    showToast("请选择有效尺寸。");
    return;
  }
  state.mappings = state.mappings.map((item) => state.selectedCodes.includes(mappingCode(item))
    ? { ...item, sizeClass, status: item.status === "Archived" ? "Archived" : "Draft", updatedAt: new Date().toISOString(), updatedBy: DEFAULT_USER }
    : item);
  addAudit("Bulk size update", `${state.selectedCodes.length} mappings`, `Assigned ${sizeClass}.`);
  render();
  showToast(`已将 ${state.selectedCodes.length} 条映射设置为 ${sizeClassLabels[sizeClass]}。`);
}

function parseIcaoCodeList(value) {
  return uniqueValues(String(value || "")
    .split(/[\s,;，、|/]+/)
    .map(normalizeTypeCode)
    .filter(Boolean));
}

function addCodesToIcon(iconKey) {
  const icon = getIcon(iconKey);
  if (!icon || icon.status !== "Active") {
    showToast("请选择有效的 Active icon。");
    return;
  }
  const input = [...document.querySelectorAll("[data-icon-code-input]")]
    .find((item) => item.dataset.iconCodeInput === iconKey);
  const codes = parseIcaoCodeList(input?.value);
  if (!codes.length) {
    showToast("请先输入 ICAO Code。");
    return;
  }
  const changes = [];
  codes.forEach((code) => {
    const existing = getMapping(code);
    if (existing) {
      const previousIcon = existing.fr24IconKey;
      existing.icaoCode = code;
      existing.aircraftTypeCode = code;
      existing.fr24IconKey = iconKey;
      existing.status = existing.status === "Archived" ? "Draft" : "Draft";
      existing.updatedAt = new Date().toISOString();
      existing.updatedBy = DEFAULT_USER;
      if (previousIcon !== iconKey) {
        changes.push(`${code}: ${previousIcon} -> ${iconKey}`);
      }
      return;
    }
    state.mappings.unshift({
      icaoCode: code,
      aircraftTypeCode: code,
      manufacturer: "Multiple",
      modelNames: [code],
      aircraftCategory: icon.category || "Business Jet",
      sizeClass: icon.defaultSizeClass || "long-range",
      fr24IconKey: iconKey,
      colorOverride: "",
      status: "Draft",
      effectiveFrom: "",
      effectiveTo: "",
      notes: `Added from icon-centric ICAO Code editor for ${iconKey}.`,
      updatedAt: new Date().toISOString(),
      updatedBy: DEFAULT_USER
    });
    changes.push(`${code}: NEW -> ${iconKey}`);
  });
  state.selectedView = "icons";
  state.filters.icon = iconKey;
  state.preview.selectedIconKey = iconKey;
  if (input) {
    input.value = "";
  }
  addAudit("Icon ICAO update", iconKey, changes.join("; "));
  render();
  showToast(`已为 ${iconKey} 绑定 ${codes.length} 个 ICAO Code。`);
}

function removeCodeFromIcon(iconKey, icaoCode) {
  const code = normalizeTypeCode(icaoCode);
  const selected = getMapping(code);
  if (!selected || selected.fr24IconKey !== iconKey) {
    showToast("未找到该 icon 下的 ICAO Code。");
    return;
  }
  const published = state.publishedMappings.some((item) => mappingCode(item) === code);
  if (published) {
    selected.status = "Archived";
    selected.updatedAt = new Date().toISOString();
    selected.updatedBy = DEFAULT_USER;
  } else {
    state.mappings = state.mappings.filter((item) => mappingCode(item) !== code);
  }
  addAudit("Remove icon ICAO", iconKey, `${code} removed from ${iconKey}.`);
  render();
  showToast(`${code} 已从 ${iconKey} 移除。`);
}

function importDraft() {
  const input = document.getElementById("importText");
  const text = input?.value.trim();
  if (!text) {
    showToast("请先粘贴 JSON 或 CSV。");
    return;
  }

  try {
    const imported = parseImportText(text).map(normalizeImportedMapping).filter(Boolean).map(normalizeMappingRecord);
    let added = 0;
    let updated = 0;
    imported.forEach((item) => {
      const index = state.mappings.findIndex((mappingItem) => mappingCode(mappingItem) === mappingCode(item));
      if (index >= 0) {
        state.mappings[index] = { ...state.mappings[index], ...item, status: "Draft", updatedAt: new Date().toISOString(), updatedBy: DEFAULT_USER };
        updated += 1;
      } else {
        state.mappings.unshift({ ...item, status: "Draft", updatedAt: new Date().toISOString(), updatedBy: DEFAULT_USER });
        added += 1;
      }
    });
    input.value = "";
    addAudit("Import draft", `${imported.length} mappings`, `${added} added, ${updated} updated.`);
    render();
    showToast(`导入完成：${added} 新增，${updated} 更新。`);
  } catch (error) {
    showToast(`导入失败：${error.message}`);
  }
}

function exportJson() {
  const runtimeConfig = buildRuntimeMappingPayload();
  const payload = {
    schemaVersion: CONSOLE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    publishedVersion: state.publishedVersion,
    runtimeConfig,
    icaoCodeIconMap: runtimeConfig.icaoCodeIconMap,
    iconCodeGroups: runtimeConfig.iconCodeGroups,
    iconAssets: state.icons,
    typeMappings: state.mappings.map(publicMapping),
    icaoCodeMappings: state.mappings.map(publicMapping),
    publishedMappings: state.publishedMappings.map(publicMapping),
    snapshots: state.snapshots.map(({ mappings, ...snapshot }) => ({
      ...snapshot,
      mappings: Array.isArray(mappings) ? mappings.map(publicMapping) : []
    }))
  };
  downloadText(`aircraft-icon-config-${dateStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  addAudit("Export JSON", "configuration", "Exported draft configuration as JSON.");
  saveState();
  showToast("已导出 JSON 配置。");
}

function exportCsv() {
  const headers = ["icaoCode", "aircraftTypeCode", "manufacturer", "modelNames", "aircraftCategory", "sizeClass", "iconKey", "status", "notes"];
  const rows = state.mappings.map((item) => headers.map((key) => {
    const value = key === "modelNames"
      ? (item.modelNames || []).join("; ")
      : key === "iconKey"
        ? item.fr24IconKey
        : key === "icaoCode" || key === "aircraftTypeCode"
          ? mappingCode(item)
          : item[key];
    return csvCell(value);
  }).join(","));
  downloadText(`aircraft-icon-mappings-${dateStamp()}.csv`, `${headers.join(",")}\n${rows.join("\n")}`, "text/csv;charset=utf-8");
  addAudit("Export CSV", "type mappings", "Exported draft mappings as CSV.");
  saveState();
  showToast("已导出 CSV。");
}

function saveLocalPlan() {
  state.localPlanSavedAt = new Date().toISOString();
  addAudit("Save local plan", "Icon ICAO", `${getMappingDiff().total} draft changes saved locally.`);
  saveState();
  render();
  showToast("本地方案已保存。");
}

function publishCurrentDraftToMap() {
  const issues = validateMappings();
  const errors = issues.filter((issue) => issue.severity === "error");
  if (errors.length) {
    showToast(`还有 ${errors.length} 个 error，不能发布到地图。`);
    return;
  }

  const diff = getMappingDiff();
  if (diff.total) {
    publishDraft({
      requireReleaseNote: false,
      releaseNoteFallback: `Icon ICAO 快捷发布：${diff.added.length} 新增，${diff.changed.length} 修改，${diff.archived.length} 归档，${diff.removed.length} 删除。`,
      successMessage: "本地方案已保存并发布到地图，刷新地图页后生效。"
    });
    return;
  }

  const runtimeConfig = writeRuntimePublishedConfig({
    version: state.publishedVersion,
    runtimeConfig: buildRuntimeMappingPayload(state.publishedVersion)
  });
  state.localPlanSavedAt = new Date().toISOString();
  state.mapRuntimePublishedAt = runtimeConfig?.publishedAt || state.localPlanSavedAt;
  addAudit("Publish map runtime", state.publishedVersion, "Published current local plan to map runtime.");
  render();
  showToast("当前本地方案已发布到地图，刷新地图页后生效。");
}

function publishDraft(options = {}) {
  const {
    requireReleaseNote = true,
    releaseNoteFallback = "",
    successMessage = ""
  } = options;
  const issues = validateMappings();
  const errors = issues.filter((issue) => issue.severity === "error");
  const releaseNote = String(document.getElementById("releaseNote")?.value || state.releaseNote || releaseNoteFallback).trim();
  if (errors.length) {
    showToast(`还有 ${errors.length} 个 error，不能发布。`);
    return;
  }
  if (requireReleaseNote && !releaseNote) {
    showToast("请填写发布说明。");
    return;
  }

  const diff = getMappingDiff();
  if (!diff.total) {
    showToast("草稿与已发布版本一致，无需发布。");
    return;
  }

  const version = createVersionName();
  const snapshot = createSnapshot(version, releaseNote, null, diff);
  state.publishedVersion = version;
  state.publishedAt = snapshot.publishedAt;
  state.publishedMappings = normalizeMappingRecords(deepClone(state.mappings));
  state.snapshots.unshift(snapshot);
  state.releaseNote = "";
  const runtimeConfig = writeRuntimePublishedConfig(snapshot);
  state.localPlanSavedAt = snapshot.publishedAt;
  state.mapRuntimePublishedAt = runtimeConfig?.publishedAt || snapshot.publishedAt;
  addAudit("Publish snapshot", version, releaseNote);
  render();
  showToast(successMessage || `${version} 已发布到本地运行时配置，刷新地图页后生效。`);
}

function rollbackToSnapshot(snapshotId) {
  const snapshot = state.snapshots.find((item) => item.snapshotId === snapshotId);
  if (!snapshot || !snapshot.mappings) {
    showToast("未找到可回滚的快照数据。");
    return;
  }
  if (!window.confirm(`确认回滚到 ${snapshot.version}？系统会生成新的回滚快照。`)) {
    return;
  }

  state.mappings = normalizeMappingRecords(deepClone(snapshot.mappings));
  const diff = getMappingDiff();
  const version = `${createVersionName()}-rollback`;
  const rollbackSnapshot = createSnapshot(version, `Rollback to ${snapshot.version}`, snapshot.version, diff);
  state.publishedVersion = version;
  state.publishedAt = rollbackSnapshot.publishedAt;
  state.publishedMappings = normalizeMappingRecords(deepClone(state.mappings));
  const runtimeConfig = writeRuntimePublishedConfig(rollbackSnapshot);
  state.localPlanSavedAt = rollbackSnapshot.publishedAt;
  state.mapRuntimePublishedAt = runtimeConfig?.publishedAt || rollbackSnapshot.publishedAt;
  state.snapshots.unshift(rollbackSnapshot);
  addAudit("Rollback snapshot", version, `Rollback to ${snapshot.version}.`);
  render();
  showToast(`已回滚并生成 ${version}。`);
}

function createSnapshot(version, note, rollbackOf, diff = getMappingDiff()) {
  return {
    snapshotId: `snap-${Date.now()}`,
    version,
    mappingCount: state.mappings.length,
    iconCount: new Set(state.mappings.filter((item) => item.status !== "Archived").map((item) => item.fr24IconKey)).size,
    diffSummary: {
      added: diff.added.length,
      changed: diff.changed.length,
      archived: diff.archived.length,
      removed: diff.removed.length
    },
    note,
    publishedBy: DEFAULT_USER,
    publishedAt: new Date().toISOString(),
    rollbackOf,
    mappings: normalizeMappingRecords(deepClone(state.mappings)),
    runtimeConfig: buildRuntimeMappingPayload(version)
  };
}

function buildRuntimeMappingPayload(version = state.publishedVersion) {
  const activeMappings = state.mappings
    .map(normalizeMappingRecord)
    .filter((item) => item.status !== "Archived");
  const icaoCodeIconMap = Object.fromEntries(
    activeMappings.map((item) => [mappingCode(item), item.fr24IconKey])
  );
  const iconCodeGroups = state.icons.map((icon) => ({
    iconKey: icon.iconKey,
    icaoCodes: activeMappings
      .filter((item) => item.fr24IconKey === icon.iconKey)
      .map(mappingCode)
      .sort()
  })).filter((group) => group.icaoCodes.length);
  return {
    schemaVersion: CONSOLE_SCHEMA_VERSION,
    mappingVersion: version || createVersionName(),
    publishedAt: new Date().toISOString(),
    defaultIconKey: DEFAULT_ICON_KEY,
    icaoCodeIconMap,
    typeCodeIconMap: icaoCodeIconMap,
    iconCodeGroups
  };
}

function writeRuntimePublishedConfig(snapshot) {
  const runtimeConfig = snapshot?.runtimeConfig || buildRuntimeMappingPayload(snapshot?.version);
  try {
    window.localStorage.setItem(RUNTIME_CONFIG_STORAGE_KEY, JSON.stringify(runtimeConfig));
  } catch (error) {
    console.warn("Failed to write runtime icon config.", error);
  }
  return runtimeConfig;
}

function validateMappings() {
  const issues = [];
  const activeCodes = new Map();
  state.mappings.forEach((item) => {
    const code = mappingCode(item);
    const rowIssues = validateMappingDraft(item, code, true);
    rowIssues.forEach((issue) => issues.push({ ...issue, message: `${code || "NEW"}: ${issue.message}` }));

    if (item.status !== "Archived") {
      if (activeCodes.has(code)) {
        issues.push({ severity: "error", message: `${code}: Active ICAO Code 重复。` });
      }
      activeCodes.set(code, true);
    }
  });
  return issues;
}

function validateMappingDraft(item, originalCode = "", skipDuplicate = false) {
  const issues = [];
  const code = mappingCode(item);
  const icon = getIcon(item.fr24IconKey);

  if (!code) {
    issues.push({ severity: "error", message: "ICAO Code 必填。" });
  } else if (!/^[A-Z0-9]{2,10}$/.test(code)) {
    issues.push({ severity: "error", message: "ICAO Code 需要 2-10 位大写字母或数字。" });
  }

  if (!skipDuplicate && code) {
    const duplicate = state.mappings.find((mappingItem) => mappingCode(mappingItem) === code && mappingCode(mappingItem) !== originalCode);
    if (duplicate) {
      issues.push({ severity: "error", message: `${code} 已存在，不能重复。` });
    }
  }

  if (!String(item.manufacturer || "").trim()) {
    issues.push({ severity: "error", message: "制造商不能为空。" });
  }
  if (!Array.isArray(item.modelNames) || item.modelNames.length === 0) {
    issues.push({ severity: "error", message: "至少填写一个机型名称。" });
  }
  if (!categoryOptions.includes(item.aircraftCategory)) {
    issues.push({ severity: "error", message: "分类不在允许范围内。" });
  }
  if (!sizeClasses.includes(item.sizeClass)) {
    issues.push({ severity: "error", message: "尺寸等级不在允许范围内。" });
  }
  if (!icon) {
    issues.push({ severity: "error", message: "Icon key 不存在。" });
  } else {
    if (icon.status !== "Active" && item.status !== "Archived") {
      issues.push({ severity: "error", message: "归档图标不能用于新映射。" });
    }
    if (icon.sourceMode === "licensed-assets" && !icon.licenseRef) {
      issues.push({ severity: "error", message: "授权图标缺少 licenseRef。" });
    }
  }
  if (item.status === "Active" && isChangedFromPublished(item)) {
    issues.push({ severity: "warning", message: "该 Active 记录含未发布变化，发布后才会影响展示端。" });
  }
  return issues;
}

function getMappingDiff() {
  const published = new Map(state.publishedMappings.map((item) => [mappingCode(item), item]));
  const current = new Map(state.mappings.map((item) => [mappingCode(item), item]));
  const added = [];
  const changed = [];
  const archived = [];
  const removed = [];

  state.mappings.forEach((item) => {
    const base = published.get(mappingCode(item));
    if (!base) {
      added.push(item);
      return;
    }
    if (mappingSignature(base) !== mappingSignature(item)) {
      if (item.status === "Archived" && base.status !== "Archived") {
        archived.push(item);
      } else {
        changed.push(item);
      }
    }
  });

  state.publishedMappings.forEach((item) => {
    if (!current.has(mappingCode(item))) {
      removed.push(item);
    }
  });

  return {
    added,
    changed,
    archived,
    removed,
    total: added.length + changed.length + archived.length + removed.length
  };
}

function draftLabel(item) {
  const base = state.publishedMappings.find((publishedItem) => mappingCode(publishedItem) === mappingCode(item));
  if (!base) {
    return { label: "New", severity: "warning" };
  }
  if (mappingSignature(base) !== mappingSignature(item)) {
    return { label: item.status === "Archived" ? "Archive" : "Changed", severity: "warning" };
  }
  return { label: "Published", severity: "ok" };
}

function isChangedFromPublished(item) {
  const base = state.publishedMappings.find((publishedItem) => mappingCode(publishedItem) === mappingCode(item));
  return !base || mappingSignature(base) !== mappingSignature(item);
}

function mappingSignature(item) {
  return JSON.stringify({
    icaoCode: mappingCode(item),
    aircraftTypeCode: mappingCode(item),
    manufacturer: item.manufacturer,
    modelNames: [...(item.modelNames || [])].sort(),
    aircraftCategory: item.aircraftCategory,
    sizeClass: item.sizeClass,
    fr24IconKey: item.fr24IconKey,
    status: item.status,
    notes: item.notes || ""
  });
}

function parseImportText(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const payload = JSON.parse(trimmed);
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload.icaoCodeMappings)) {
      return payload.icaoCodeMappings;
    }
    if (Array.isArray(payload.typeMappings)) {
      return payload.typeMappings;
    }
    if (Array.isArray(payload.mappings)) {
      return payload.mappings;
    }
    if (payload.runtimeConfig?.icaoCodeIconMap && typeof payload.runtimeConfig.icaoCodeIconMap === "object") {
      return Object.entries(payload.runtimeConfig.icaoCodeIconMap).map(([code, iconKey]) => ({ icaoCode: code, iconKey }));
    }
    if (payload.icaoCodeIconMap && typeof payload.icaoCodeIconMap === "object") {
      return Object.entries(payload.icaoCodeIconMap).map(([code, iconKey]) => ({ icaoCode: code, iconKey }));
    }
    if (payload.typeMappings && typeof payload.typeMappings === "object") {
      return Object.entries(payload.typeMappings).map(([code, value]) => ({ aircraftTypeCode: code, ...value }));
    }
    throw new Error("JSON 中没有找到 icaoCodeMappings 或 icaoCodeIconMap。");
  }
  return parseCsv(trimmed);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    throw new Error("CSV 至少需要表头和一行数据。");
  }
  const headers = splitCsvLine(lines[0]).map((item) => item.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function normalizeImportedMapping(row) {
  const code = normalizeTypeCode(row.icaoCode || row.aircraftTypeCode || row.typeCode || row.code);
  if (!code) {
    return null;
  }
  return {
    icaoCode: code,
    aircraftTypeCode: code,
    manufacturer: String(row.manufacturer || "").trim(),
    modelNames: Array.isArray(row.modelNames) ? row.modelNames : splitModelNames(row.modelNames || row.modelName || row.models),
    aircraftCategory: String(row.aircraftCategory || row.category || "Business Jet").trim(),
    sizeClass: String(row.sizeClass || "long-range").trim(),
    fr24IconKey: String(row.fr24IconKey || row.iconKey || DEFAULT_ICON_KEY).trim(),
    colorOverride: String(row.colorOverride || "").trim(),
    status: String(row.status || "Draft").trim(),
    effectiveFrom: String(row.effectiveFrom || "").trim(),
    effectiveTo: String(row.effectiveTo || "").trim(),
    notes: String(row.notes || "").trim(),
    updatedAt: new Date().toISOString(),
    updatedBy: DEFAULT_USER
  };
}

function createBlankMapping() {
  return {
    icaoCode: "",
    aircraftTypeCode: "",
    manufacturer: "",
    modelNames: [],
    aircraftCategory: "Business Jet",
    sizeClass: "long-range",
    fr24IconKey: DEFAULT_ICON_KEY,
    colorOverride: "",
    status: "Draft",
    effectiveFrom: "",
    effectiveTo: "",
    notes: "",
    updatedAt: new Date().toISOString(),
    updatedBy: DEFAULT_USER
  };
}

function createSeedState() {
  const mappings = normalizeMappingRecords(deepClone(defaultMappings));
  const snapshot = {
    snapshotId: "snap-20260806-icao-code-icon-map",
    version: iconSpecConfig.publishedVersion || "icon-map-1.12-icao-code",
    mappingCount: mappings.length,
    iconCount: new Set(mappings.map((item) => item.fr24IconKey)).size,
    diffSummary: { added: mappings.length, changed: 0, archived: 0, removed: 0 },
    note: "1.12 ICAO Code mapping synchronized with the template shadow FR24-yellow 1024px icon set.",
    publishedBy: DEFAULT_USER,
    publishedAt: "2026-08-06T00:00:00+08:00",
    rollbackOf: null,
    mappings: deepClone(mappings)
  };

  return {
    schemaVersion: CONSOLE_SCHEMA_VERSION,
    selectedView: "dashboard",
    selectedCode: "GLF6",
    selectedCodes: [],
    filters: createSeedFilters(),
    iconFilters: { query: "", category: "all", status: "all" },
    preview: { selectedTypeCode: "GLF6", selectedIconKey: DEFAULT_ICON_KEY, background: "land" },
    releaseNote: "",
    localPlanSavedAt: snapshot.publishedAt,
    mapRuntimePublishedAt: snapshot.publishedAt,
    editorDraft: null,
    publishedVersion: snapshot.version,
    publishedAt: snapshot.publishedAt,
    icons: deepClone(defaultIconAssets),
    mappings,
    publishedMappings: deepClone(mappings),
    snapshots: [snapshot],
    audit: [{
      id: "log-20260803-icon-template-shadow-fr24yellow",
      action: "Initialize console",
      target: iconSpecConfig.publishedVersion || "icon-map-1.12-icao-code",
      user: DEFAULT_USER,
      time: "2026-08-06T00:00:00+08:00",
      detail: "Loaded template shadow FR24-yellow icon assets and ICAO-code mappings."
    }]
  };
}

function createSeedFilters() {
  return { query: "", icon: "all", category: "all", size: "all", status: "all" };
}

function loadState() {
  try {
    const stored = readStoredConsoleState();
    if (!stored.raw) {
      return createSeedState();
    }
    const parsed = JSON.parse(stored.raw);
    const seed = createSeedState();
    const migrated = migrateConsoleState(parsed);
    const legacyState = stored.key !== STORAGE_KEY || parsed.schemaVersion !== CONSOLE_SCHEMA_VERSION;
    const forcedIconKeys = legacyState ? forcedConfigIconKeys : noForcedConfigKeys;
    const forcedTypeCodes = legacyState ? forcedConfigTypeCodes : noForcedConfigKeys;
    const loadedState = {
      ...seed,
      ...migrated,
      schemaVersion: CONSOLE_SCHEMA_VERSION,
      filters: { ...seed.filters, ...(migrated.filters || {}) },
      iconFilters: { ...seed.iconFilters, ...(migrated.iconFilters || {}) },
      preview: { ...seed.preview, ...(migrated.preview || {}) },
      icons: mergeSeedRecords(migrated.icons, seed.icons, "iconKey", forcedIconKeys),
      mappings: mergeSeedRecords(migrated.mappings, seed.mappings, "icaoCode", forcedTypeCodes),
      publishedMappings: mergeSeedRecords(migrated.publishedMappings, seed.publishedMappings, "icaoCode", forcedTypeCodes),
      snapshots: Array.isArray(migrated.snapshots) ? migrated.snapshots : seed.snapshots,
      audit: Array.isArray(migrated.audit) ? migrated.audit : seed.audit
    };
    return syncStateWithRuntimeConfig(loadedState);
  } catch (error) {
    console.warn("Failed to load local console state.", error);
    return createSeedState();
  }
}

function readStoredConsoleState() {
  const keys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];
  for (const key of keys) {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      return { key, raw };
    }
  }
  return { key: "", raw: "" };
}

function migrateConsoleState(parsed = {}) {
  const mappings = normalizeMappingRecords(parsed.mappings);
  const publishedMappings = normalizeMappingRecords(parsed.publishedMappings);
  const snapshots = Array.isArray(parsed.snapshots)
    ? parsed.snapshots.map((snapshot) => ({
      ...snapshot,
      mappings: normalizeMappingRecords(snapshot.mappings || [])
    }))
    : [];
  return {
    ...parsed,
    selectedCode: normalizeTypeCode(parsed.selectedCode),
    selectedCodes: (Array.isArray(parsed.selectedCodes) ? parsed.selectedCodes : []).map(normalizeTypeCode).filter(Boolean),
    mappings,
    publishedMappings,
    snapshots
  };
}

function readRuntimeConfigPreference() {
  try {
    const raw = window.localStorage.getItem(RUNTIME_CONFIG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function syncStateWithRuntimeConfig(loadedState) {
  const runtimeConfig = readRuntimeConfigPreference();
  const runtimeIconMap = normalizeRuntimeIconMap(runtimeConfig);
  if (!Object.keys(runtimeIconMap).length || mappingRecordsHaveDiff(loadedState.mappings, loadedState.publishedMappings)) {
    return loadedState;
  }

  const runtimeVersion = String(runtimeConfig.mappingVersion || runtimeConfig.publishedVersion || "").trim();
  const runtimePublishedAt = runtimeConfig.publishedAt || "";
  const versionMatches = runtimeVersion && runtimeVersion === loadedState.publishedVersion;
  const runtimeIsNewer = dateEpoch(runtimePublishedAt) > dateEpoch(loadedState.mapRuntimePublishedAt || loadedState.publishedAt);
  if (!versionMatches && !runtimeIsNewer) {
    return loadedState;
  }

  const mappings = applyRuntimeIconMapToMappingRecords(loadedState.mappings, runtimeIconMap, loadedState.icons, runtimePublishedAt);
  return {
    ...loadedState,
    mappings,
    publishedMappings: applyRuntimeIconMapToMappingRecords(loadedState.publishedMappings, runtimeIconMap, loadedState.icons, runtimePublishedAt),
    publishedVersion: runtimeVersion || loadedState.publishedVersion,
    publishedAt: runtimePublishedAt || loadedState.publishedAt,
    localPlanSavedAt: runtimePublishedAt || loadedState.localPlanSavedAt,
    mapRuntimePublishedAt: runtimePublishedAt || loadedState.mapRuntimePublishedAt
  };
}

function normalizeRuntimeIconMap(runtimeConfig = {}) {
  const map = runtimeConfig?.icaoCodeIconMap || runtimeConfig?.typeCodeIconMap || {};
  return Object.fromEntries(
    Object.entries(map)
      .map(([code, iconKey]) => [normalizeTypeCode(code), String(iconKey || "").trim()])
      .filter(([code, iconKey]) => code && iconKey)
  );
}

function applyRuntimeIconMapToMappingRecords(records = [], runtimeIconMap = {}, icons = [], publishedAt = "") {
  const merged = new Map((Array.isArray(records) ? records : []).map((item) => [mappingCode(item), normalizeMappingRecord(item)]));
  Object.entries(runtimeIconMap).forEach(([code, iconKey]) => {
    merged.set(code, createRuntimeMappingRecord(code, iconKey, merged.get(code), icons, publishedAt));
  });
  return Array.from(merged.values());
}

function createRuntimeMappingRecord(code, iconKey, previous = {}, icons = [], publishedAt = "") {
  const icon = (Array.isArray(icons) ? icons : []).find((item) => item.iconKey === iconKey);
  return normalizeMappingRecord({
    ...previous,
    icaoCode: code,
    aircraftTypeCode: code,
    manufacturer: previous.manufacturer || "Multiple",
    modelNames: Array.isArray(previous.modelNames) && previous.modelNames.length ? previous.modelNames : [code],
    aircraftCategory: previous.aircraftCategory || icon?.category || "Business Jet",
    sizeClass: previous.sizeClass || icon?.defaultSizeClass || "long-range",
    fr24IconKey: iconKey,
    colorOverride: previous.colorOverride || "",
    status: "Active",
    effectiveFrom: previous.effectiveFrom || "",
    effectiveTo: previous.effectiveTo || "",
    notes: previous.notes || `Restored from ${RUNTIME_CONFIG_STORAGE_KEY}.`,
    updatedAt: previous.updatedAt || publishedAt || new Date().toISOString(),
    updatedBy: previous.updatedBy || DEFAULT_USER
  });
}

function mappingRecordsHaveDiff(mappings = [], publishedMappings = []) {
  const published = new Map((Array.isArray(publishedMappings) ? publishedMappings : []).map((item) => [mappingCode(item), item]));
  const current = new Map((Array.isArray(mappings) ? mappings : []).map((item) => [mappingCode(item), item]));
  if (published.size !== current.size) {
    return true;
  }
  for (const [code, item] of current.entries()) {
    const base = published.get(code);
    if (!base || mappingSignature(base) !== mappingSignature(item)) {
      return true;
    }
  }
  return false;
}

function dateEpoch(value) {
  const epoch = new Date(value).getTime();
  return Number.isFinite(epoch) ? epoch : 0;
}

function mergeSeedRecords(existingRecords, seedRecords, keyName, forcedKeys = new Set()) {
  const merged = new Map();
  (Array.isArray(existingRecords) ? existingRecords : []).forEach((item) => {
    const key = String(item?.[keyName] || "").trim();
    if (key) {
      merged.set(key, item);
    }
  });
  seedRecords.forEach((item) => {
    const key = String(item?.[keyName] || "").trim();
    if (!key) {
      return;
    }
    if (!merged.has(key) || forcedKeys.has(key)) {
      merged.set(key, deepClone(item));
    }
  });
  return Array.from(merged.values());
}

function saveState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function resetLocalState() {
  if (!window.confirm("确认重置 1.12 后台本地草稿？已发布快照和审计也会恢复到当前图标版本初始状态。")) {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_CONFIG_STORAGE_KEY);
  state = createSeedState();
  render();
  showToast("本地草稿已重置。");
}

function addAudit(action, target, detail) {
  state.audit.unshift({
    id: `log-${Date.now()}`,
    action,
    target,
    user: DEFAULT_USER,
    time: new Date().toISOString(),
    detail
  });
  state.audit = state.audit.slice(0, 150);
}

function normalizeTypeCode(value) {
  return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

function mappingCode(item) {
  return normalizeTypeCode(item?.icaoCode || item?.aircraftTypeCode);
}

function normalizeMappingRecord(item = {}) {
  const icaoCode = mappingCode(item);
  return {
    ...item,
    icaoCode,
    aircraftTypeCode: icaoCode,
    modelNames: Array.isArray(item.modelNames) ? item.modelNames : splitModelNames(item.modelNames || item.modelName || item.models)
  };
}

function normalizeMappingRecords(records = []) {
  return (Array.isArray(records) ? records : []).map(normalizeMappingRecord).filter((item) => item.icaoCode);
}

function splitModelNames(value) {
  return String(value || "")
    .split(/[;\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sizeForZoom(sizeClass, zoom) {
  const row = aircraftZoomSizeMatrix.find((item) => item.zoom === zoom) || aircraftZoomSizeMatrix[aircraftZoomSizeMatrix.length - 1];
  return row.sizes[sizeClass] || row.sizes["long-range"];
}

function bgLabel(bg) {
  return { land: "陆地", ocean: "海面", dark: "深色" }[bg] || bg;
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "-";
  }
  const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  if (timeUtils.formatEpochMs) {
    return `${timeUtils.formatEpochMs(date.getTime(), {
      timeZone: localZone,
      date: true,
      includeZone: false
    })} Local`;
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }) + " Local";
}

function dateStamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

function createVersionName() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const index = String(state.snapshots.length + 1).padStart(3, "0");
  return `icon-map-${yyyy}.${mm}.${dd}-${index}`;
}

function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function publicMapping(item) {
  const { fr24IconKey, ...rest } = item;
  const icaoCode = mappingCode(item);
  return {
    ...rest,
    icaoCode,
    aircraftTypeCode: icaoCode,
    iconKey: fr24IconKey
  };
}

function focusEditorCode() {
  window.setTimeout(() => document.getElementById("aircraftTypeCode")?.focus(), 0);
}

function renderPreservingFocus() {
  const active = document.activeElement;
  const id = active?.id;
  const selectionStart = typeof active?.selectionStart === "number" ? active.selectionStart : null;
  const selectionEnd = typeof active?.selectionEnd === "number" ? active.selectionEnd : null;
  render();
  if (!id) {
    return;
  }
  const next = document.getElementById(id);
  if (!next) {
    return;
  }
  next.focus();
  if (selectionStart !== null && typeof next.setSelectionRange === "function") {
    next.setSelectionRange(selectionStart, selectionEnd);
  }
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));
}
