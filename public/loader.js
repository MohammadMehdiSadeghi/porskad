/**
 * PorsCode Embed Loader v2
 * اسکریپت بهینه‌شده، سبک و ایمن برای جاسازی فرم‌ها در وب‌سایت‌های دیگر
 *
 * استفاده:
 * <div data-pcode-form="fr_xxxxxxxx" data-pcode-theme="dark"></div>
 * <script src="https://your-domain.com/loader.js" async></script>
 */
(function () {
  "use strict";

  var BASE = (function () {
    // ۱. بررسی document.currentScript
    if (document.currentScript && document.currentScript.src) {
      var cs = document.currentScript.src.replace(/\/loader\.js.*$/, "");
      if (cs && cs.indexOf("http") === 0) return cs;
    }
    // ۲. جستجو در تگ‌های script
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var s = scripts[i].src || scripts[i].getAttribute("src") || "";
      if (s && s.indexOf("loader.js") !== -1) {
        // scripts[i].src همواره URL کامل و مطلق برمی‌گرداند
        var fullSrc = scripts[i].src || s;
        var clean = fullSrc.replace(/\/loader\.js.*$/, "");
        if (clean && clean.indexOf("http") === 0) return clean;
      }
    }
    return window.location.origin;
  })();

  // ─── ساخت iframe برای هر فرم ───
  function createIframe(formId, container, mode, customTheme) {
    if (!formId || !container) return null;

    // جلوگیری از درج تکراری
    if (container.getAttribute && container.getAttribute("data-pcode-ready") === "true") {
      return null;
    }
    if (container.setAttribute) {
      container.setAttribute("data-pcode-ready", "true");
    }

    var iframe = document.createElement("iframe");
    var theme = customTheme || (container && container.getAttribute ? container.getAttribute("data-pcode-theme") : "") || "";
    var themeParam = theme ? "?theme=" + encodeURIComponent(theme) : "";
    iframe.src = BASE + "/embed/" + encodeURIComponent(formId) + themeParam;
    iframe.setAttribute("data-form-id", formId);
    iframe.setAttribute("data-pcode-iframe", formId);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "camera; microphone; autoplay");
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.minHeight = "450px";
    iframe.style.backgroundColor = "transparent";
    iframe.style.overscrollBehavior = "contain";

    // ─── ذخیره reference‌ها برای close از بیرون ───
    if (!window.__pcodeInstances) window.__pcodeInstances = {};
    window.__pcodeInstances[formId] = { iframe: iframe, mode: mode };

    if (mode === "inline") {
      iframe.style.height = "600px";
      container.appendChild(iframe);
      return iframe;
    } else if (mode === "popup") {
      // popup mode: مخفی تا کلیک شود
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.top = "50%";
      iframe.style.left = "50%";
      iframe.style.transform = "translate(-50%, -50%)";
      iframe.style.zIndex = "99999";
      iframe.style.width = "92vw";
      iframe.style.maxWidth = "620px";
      iframe.style.height = "82vh";
      iframe.style.maxHeight = "720px";
      iframe.style.borderRadius = "20px";
      iframe.style.boxShadow = "0 25px 60px rgba(0,0,0,0.35)";
      iframe.style.backgroundColor = "#ffffff";
      document.body.appendChild(iframe);

      // overlay
      var overlay = document.createElement("div");
      overlay.setAttribute("data-pcode-overlay", formId);
      overlay.style.display = "none";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(11,15,25,0.65)";
      overlay.style.zIndex = "99998";
      overlay.style.backdropFilter = "blur(4px)";
      document.body.appendChild(overlay);
      window.__pcodeInstances[formId].overlay = overlay;

      function lockBody() {
        document.documentElement.style.overflow = "hidden";
        document.documentElement.style.touchAction = "none";
      }
      function unlockBody() {
        document.documentElement.style.overflow = "";
        document.documentElement.style.touchAction = "";
      }
      function openPopup() {
        iframe.style.display = "block";
        overlay.style.display = "block";
        lockBody();
        postEvent(formId, "opened");
      }
      function closePopup() {
        iframe.style.display = "none";
        overlay.style.display = "none";
        unlockBody();
        postEvent(formId, "closed");
      }

      window.__pcodeInstances[formId].close = closePopup;
      overlay.addEventListener("click", closePopup);

      // کلیک روی دکمه trigger
      if (container.tagName === "BUTTON" || container.tagName === "A") {
        container.addEventListener("click", function (e) {
          e.preventDefault();
          openPopup();
        });
      } else {
        // داخل کانتینر یک دکمه بساز
        var btn = document.createElement("button");
        btn.textContent = "باز کردن فرم";
        btn.style.cssText = "background:#58BDAF;color:#fff;padding:12px 28px;border-radius:16px;font-weight:bold;cursor:pointer;border:none;font-family:sans-serif;box-shadow:0 4px 12px rgba(88,189,175,0.3);";
        btn.addEventListener("click", openPopup);
        container.appendChild(btn);
      }

      return iframe;
    } else if (mode === "popover") {
      // popover: پنل شناور گوشه پایین
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.bottom = "84px";
      iframe.style.right = "20px";
      iframe.style.zIndex = "99999";
      iframe.style.width = "400px";
      iframe.style.maxWidth = "92vw";
      iframe.style.height = "560px";
      iframe.style.maxHeight = "80vh";
      iframe.style.borderRadius = "20px";
      iframe.style.boxShadow = "0 12px 48px rgba(0,0,0,0.25)";
      iframe.style.backgroundColor = "#ffffff";
      document.body.appendChild(iframe);

      // دکمه toggle گوشه صفحه
      var fab = document.createElement("button");
      fab.setAttribute("data-pcode-fab", formId);
      fab.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:100000;width:56px;height:56px;border-radius:50%;background:#21295A;color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 6px 20px rgba(33,41,90,0.4);display:flex;align-items:center;justify-content:center;font-family:sans-serif;transition:transform 0.2s;";
      fab.innerHTML = '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
      document.body.appendChild(fab);

      var isOpen = false;
      function togglePopover() {
        isOpen = !isOpen;
        iframe.style.display = isOpen ? "block" : "none";
        fab.innerHTML = isOpen ? '✕' : '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
        fab.style.transform = isOpen ? "rotate(90deg)" : "rotate(0deg)";
        postEvent(formId, isOpen ? "opened" : "closed");
      }
      function closePopover() {
        if (isOpen) togglePopover();
      }
      window.__pcodeInstances[formId].close = closePopover;
      fab.addEventListener("click", togglePopover);

      return iframe;
    }
  }

  // ─── postMessage events ───
  var events = {};
  function postEvent(formId, eventName, data) {
    if (events[formId] && events[formId][eventName]) {
      events[formId][eventName](data);
    }
  }

  // ─── گوش دادن به پیام‌های iframe ───
  window.addEventListener("message", function (e) {
    // فقط پیام‌های همان مبدأ میزبان فرم (جایی که خود iframe لود شده) را بپذیر
    try {
      if (BASE && e.origin !== new URL(BASE).origin) return;
    } catch (_) { /* BASE نسبی/نامعتبر — بدون گارد */ }
    var d = e.data;
    if (!d || !d.type) return;

    if (d.type === "pcode:resize") {
      var iframe = (d.formId ? document.querySelector('iframe[data-form-id="' + d.formId + '"]') : null) || document.querySelector('iframe[data-pcode-iframe]');
      if (iframe && d.height && d.height > 100) {
        iframe.style.height = (d.height + 20) + "px";
      }
    }

    if (d.type === "pcode:started") postEvent(d.formId, "started");
    if (d.type === "pcode:submitted") postEvent(d.formId, "submitted", d);
    if (d.type === "pcode:view") postEvent(d.formId, "viewed");

    // بستن فرم — از iframe ارسال شده
    if (d.type === "pcode:closed") {
      postEvent(d.formId, "closed");
      var inst = window.__pcodeInstances && window.__pcodeInstances[d.formId];
      if (inst && typeof inst.close === "function") {
        inst.close();
      } else {
        var closedIframe = (d.formId ? document.querySelector('iframe[data-form-id="' + d.formId + '"]') : null) || document.querySelector('iframe[data-pcode-iframe]');
        if (closedIframe) closedIframe.style.display = "none";
        var overlay2 = document.querySelector('[data-pcode-overlay="' + d.formId + '"]');
        if (overlay2) overlay2.style.display = "none";
        var fab2 = document.querySelector('[data-pcode-fab="' + d.formId + '"]');
        if (fab2) {
          fab2.innerHTML = '<span style="font-size:11px;font-weight:900;line-height:1.3;text-align:center;font-family:Vazirmatn,sans-serif;">پرس<br/><span style="color:#58BDAF;">کاد</span></span>';
          fab2.style.transform = "rotate(0deg)";
        }
      }
    }
  });

  // ─── API عمومی ───
  window.PorsCode = window.PorsCode || {};
  window.PorsCode.on = function (formId, event, callback) {
    if (!events[formId]) events[formId] = {};
    events[formId][event] = callback;
  };
  window.PorsCode.init = init;

  // ─── راه‌اندازی خودکار ───
  function init() {
    if (!document.body) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
      } else {
        setTimeout(init, 50);
      }
      return;
    }

    // Inline forms
    var containers = document.querySelectorAll("[data-pcode-form]");
    for (var i = 0; i < containers.length; i++) {
      var formId = containers[i].getAttribute("data-pcode-form");
      if (formId) createIframe(formId, containers[i], "inline");
    }

    // Popup buttons
    var popups = document.querySelectorAll("[data-pcode-popup]");
    for (var j = 0; j < popups.length; j++) {
      var fid = popups[j].getAttribute("data-pcode-popup");
      if (fid) createIframe(fid, popups[j], "popup");
    }

    // Popover from config
    if (window.PorsCode && window.PorsCode.popover) {
      var cfg = window.PorsCode.popover;
      if (cfg.formId && !cfg._initialized) {
        cfg._initialized = true;
        var dummy = document.createElement("div");
        createIframe(cfg.formId, dummy, "popover", cfg.theme);
      }
    }
  }

  // بارگذاری فونت وزیرمتن
  function loadFont() {
    if (document.getElementById("porscad-font")) return;
    var link = document.createElement("link");
    link.id = "porscad-font";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33/Vazirmatn-font-face.css";
    document.head.appendChild(link);
  }

  // پویاسازی برای فریم‌ورک‌های SPA و وب‌کامپوننت‌ها
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function () {
      var uninit = document.querySelector("[data-pcode-form]:not([data-pcode-ready]), [data-pcode-popup]:not([data-pcode-ready])");
      if (uninit) init();
    });
    if (document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }
  }

  // اجرا بعد از لود صفحه
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() { loadFont(); init(); });
  } else {
    loadFont();
    init();
  }
})();
