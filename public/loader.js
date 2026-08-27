/**
 * PorsCode Embed Loader v1
 * یک اسکریپت سبک برای جاسازی فرم‌ها در سایت‌های دیگر
 *
 * استفاده:
 * <div data-pcode-form="fr_xxxxxxxx"></div>
 * <script src="https://your-domain.com/loader.js" async></script>
 */
(function () {
  "use strict";

  var BASE = (function () {
    // URL فعلی اسکریپت را پیدا کن
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("loader.js") !== -1) {
        return src.replace(/\/loader\.js.*$/, "");
      }
    }
    return window.location.origin;
  })();

  // ─── ساخت iframe برای هر فرم ───
  function createIframe(formId, container, mode) {
    var iframe = document.createElement("iframe");
    iframe.src = BASE + "/embed/" + formId;
    iframe.setAttribute("data-form-id", formId);
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "camera; microphone; autoplay");
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups");
    iframe.style.width = "100%";
    iframe.style.border = "none";
    iframe.style.minHeight = "400px";

    if (mode === "inline") {
      iframe.style.height = "600px";
      container.appendChild(iframe);
    } else if (mode === "popup") {
      // popup mode: مخفی تا کلیک بشه
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.top = "50%";
      iframe.style.left = "50%";
      iframe.style.transform = "translate(-50%, -50%)";
      iframe.style.zIndex = "99999";
      iframe.style.width = "90vw";
      iframe.style.maxWidth = "600px";
      iframe.style.height = "80vh";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 25px 50px rgba(0,0,0,0.25)";
      document.body.appendChild(iframe);

      // overlay
      var overlay = document.createElement("div");
      overlay.style.display = "none";
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.zIndex = "99998";
      overlay.style.backdropFilter = "blur(4px)";
      document.body.appendChild(overlay);

      function openPopup() {
        iframe.style.display = "block";
        overlay.style.display = "block";
        postEvent(formId, "opened");
      }
      function closePopup() {
        iframe.style.display = "none";
        overlay.style.display = "none";
        postEvent(formId, "closed");
      }

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
        btn.style.cssText = "background:#4f46e5;color:#fff;padding:10px 24px;border-radius:10px;font-weight:bold;cursor:pointer;border:none;";
        btn.addEventListener("click", openPopup);
        container.appendChild(btn);
      }

      return iframe;
    } else if (mode === "popover") {
      // popover: پنل کوچک از گوشه صفحه
      iframe.style.display = "none";
      iframe.style.position = "fixed";
      iframe.style.bottom = "20px";
      iframe.style.right = "20px";
      iframe.style.zIndex = "99999";
      iframe.style.width = "380px";
      iframe.style.maxWidth = "90vw";
      iframe.style.height = "500px";
      iframe.style.borderRadius = "16px";
      iframe.style.boxShadow = "0 10px 40px rgba(0,0,0,0.2)";
      document.body.appendChild(iframe);

      // دکمه toggle
      var fab = document.createElement("button");
      fab.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:100000;width:56px;height:56px;border-radius:50%;background:#4f46e5;color:#fff;font-size:24px;border:none;cursor:pointer;box-shadow:0 4px 15px rgba(79,70,229,0.4);display:flex;align-items:center;justify-content:center;";
      fab.innerHTML = "💬";
      document.body.appendChild(fab);

      var isOpen = false;
      fab.addEventListener("click", function () {
        isOpen = !isOpen;
        iframe.style.display = isOpen ? "block" : "none";
        fab.innerHTML = isOpen ? "✕" : "💬";
        postEvent(formId, isOpen ? "opened" : "closed");
      });

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
    var d = e.data;
    if (!d || !d.type) return;

    if (d.type === "pcode:resize") {
      var iframe = document.querySelector('iframe[data-form-id="' + d.formId + '"]');
      if (iframe) iframe.style.height = d.height + "px";
    }

    if (d.type === "pcode:started") postEvent(d.formId, "started");
    if (d.type === "pcode:submitted") postEvent(d.formId, "submitted", d);
    if (d.type === "pcode:closed") postEvent(d.formId, "closed");
    if (d.type === "pcode:view") postEvent(d.formId, "viewed");
  });

  // ─── API عمومی ───
  window.PorsCode = window.PorsCode || {};
  window.PorsCode.on = function (formId, event, callback) {
    if (!events[formId]) events[formId] = {};
    events[formId][event] = callback;
  };

  // ─── راه‌اندازی خودکار ───
  function init() {
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
      if (cfg.formId) {
        var dummy = document.createElement("div");
        createIframe(cfg.formId, dummy, "popover");
      }
    }
  }

  // اجرا بعد از لود صفحه
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
