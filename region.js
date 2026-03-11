// Region runtime for signup.html (prototype)
(function () {
  const REGION_KEY = "noddy_region"; // "global" | "cn"
  const REGION_SOURCE_KEY = "noddy_region_source"; // "user" | "ip" | "default"
  const ACCOUNT_REGION_KEY = "noddy_account_region_map_v1"; // { [email]: "global" | "cn" }

  function isValidRegion(v) {
    return v === "global" || v === "cn";
  }

  function tSafe(key, fallback) {
    try {
      if (typeof window.t === "function") {
        const v = window.t(key);
        if (v && v !== key) return v;
      }
    } catch { }
    return fallback;
  }

  function getRegionLabel(region) {
    if (region === "cn") return tSafe("region.cnLabel", "中国服务区");
    return tSafe("region.globalLabel", "国际服务区");
  }

  function getCurrentRegion() {
    const v = localStorage.getItem(REGION_KEY);
    return isValidRegion(v) ? v : "global";
  }

  function setCurrentRegion(region, source = "user") {
    if (!isValidRegion(region)) return;
    localStorage.setItem(REGION_KEY, region);
    localStorage.setItem(REGION_SOURCE_KEY, source);
    updateRegionUI();
  }

  function toggleRegion() {
    const next = getCurrentRegion() === "cn" ? "global" : "cn";
    setCurrentRegion(next, "user");
  }

  function updateRegionUI() {
    const region = getCurrentRegion();

    const inlinePrefixEl = document.getElementById("region-inline-prefix");
    const inlineLabelEl = document.getElementById("region-inline-label");
    const inlineSwitchEl = document.getElementById("region-inline-switch");
    const inlineBtn = document.getElementById("region-inline-toggle");

    const prefixText = tSafe("region.footnotePrefix", "当前服务区：");
    const switchText = tSafe("region.footnoteSwitch", "切换");

    if (inlinePrefixEl) inlinePrefixEl.textContent = prefixText;
    if (inlineLabelEl) inlineLabelEl.textContent = getRegionLabel(region);
    if (inlineSwitchEl) inlineSwitchEl.textContent = switchText;

    const titleText = `${prefixText}${getRegionLabel(region)} · ${switchText}`;
    if (inlineBtn) inlineBtn.title = titleText;
  }

  async function detectRegionByIPOnce() {
    const src = localStorage.getItem(REGION_SOURCE_KEY);
    if (src === "user") return;

    try {
      const resp = await fetch("https://ipapi.co/json/", { cache: "no-store" });
      if (!resp.ok) throw new Error("ip lookup failed");
      const data = await resp.json();
      const cc = String(data && (data.country_code || data.country)).toUpperCase();
      if (cc === "CN") setCurrentRegion("cn", "ip");
      else setCurrentRegion("global", "ip");
    } catch {
      if (!localStorage.getItem(REGION_KEY)) setCurrentRegion("global", "default");
      else updateRegionUI();
    }
  }

  function getAccountRegionMap() {
    try {
      const raw = localStorage.getItem(ACCOUNT_REGION_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  }

  function upsertAccountRegion(email, region) {
    if (!email || !isValidRegion(region)) return;
    const map = getAccountRegionMap();
    map[email] = region;
    localStorage.setItem(ACCOUNT_REGION_KEY, JSON.stringify(map));
  }

  function getAccountRegionByEmail(email) {
    if (!email) return null;
    const map = getAccountRegionMap();
    const v = map[email];
    return isValidRegion(v) ? v : null;
  }

  function seedDemoAccounts() {
    const map = getAccountRegionMap();
    if (!map["noddy@gmail.com"]) {
      map["noddy@gmail.com"] = "global";
      localStorage.setItem(ACCOUNT_REGION_KEY, JSON.stringify(map));
    }
  }

  // Modal: region mismatch
  let pendingMismatchTargetRegion = null;
  let pendingMismatchEmail = "";

  function openRegionMismatchModal(targetRegion, email) {
    pendingMismatchTargetRegion = isValidRegion(targetRegion) ? targetRegion : null;
    pendingMismatchEmail = email || "";
    const modal = document.getElementById("region-mismatch-modal");
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }

  function closeRegionMismatchModal() {
    const modal = document.getElementById("region-mismatch-modal");
    if (!modal) return;
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    pendingMismatchTargetRegion = null;
    pendingMismatchEmail = "";
  }

  function handleRegionMismatchSwitch() {
    if (pendingMismatchTargetRegion) {
      setCurrentRegion(pendingMismatchTargetRegion, "user");
    }
    closeRegionMismatchModal();
    if (typeof window.setEmailLoading === "function") window.setEmailLoading(true);
    setTimeout(() => {
      if (typeof window.setEmailLoading === "function") window.setEmailLoading(false);
      window.location.href = "WiFi-reminder.html";
    }, 700);
  }

  function handleRegionMismatchContinueSignup() {
    closeRegionMismatchModal();
    if (typeof window.switchView === "function") window.switchView("signup");
    const signupEmailEl = document.getElementById("signup-email-input");
    if (signupEmailEl && pendingMismatchEmail) {
      signupEmailEl.value = pendingMismatchEmail;
      signupEmailEl.focus();
    }
  }

  function init() {
    seedDemoAccounts();
    updateRegionUI();
    detectRegionByIPOnce();
  }

  // Expose APIs for inline handlers in signup.html
  window.toggleRegion = toggleRegion;
  window.getCurrentRegion = getCurrentRegion;
  window.getAccountRegionByEmail = getAccountRegionByEmail;
  window.upsertAccountRegion = upsertAccountRegion;
  window.openRegionMismatchModal = openRegionMismatchModal;
  window.closeRegionMismatchModal = closeRegionMismatchModal;
  window.handleRegionMismatchSwitch = handleRegionMismatchSwitch;
  window.handleRegionMismatchContinueSignup = handleRegionMismatchContinueSignup;
  window.updateRegionUI = updateRegionUI;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

