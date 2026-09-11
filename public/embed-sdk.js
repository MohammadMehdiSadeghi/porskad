/*
 * PORSKAD embed SDK - drop-in iframe snippet for public websites.
 * Usage in the host page:
 *   <div id="my-form"></div>
 *   <script src="https://porskad.vercel.app/embed-sdk.js" defer
 *           data-form="<FORM_ID>" data-host="#my-form" data-theme="light"></script>
 * Auto-creates a sandboxed iframe of /embed/<id> and keeps its height
 * in sync with the porskad postMessage height events.
 */
(function () {
  "use strict";

  function boot() {
    var cur = document.currentScript;
    if (!cur) {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        var s = scripts[i];
        if ((s.src || "").indexOf("embed-sdk.js") !== -1 && s.getAttribute("data-form")) {
          cur = s;
          break;
        }
      }
    }
    if (!cur) return;

    var formId = cur.getAttribute("data-form") || cur.dataset.form;
    var hostSel = cur.getAttribute("data-host") || cur.dataset.host || "";
    var theme = cur.getAttribute("data-theme") || cur.dataset.theme || "";
    if (!formId) return;

    var host = hostSel
      ? document.querySelector(hostSel)
      : cur.parentElement;
    if (!host) return;

    var origin = new URL(cur.src).origin;
    var frame = document.createElement("iframe");
    frame.style.border = "0";
    frame.style.width = "100%";
    frame.style.minHeight = "480px";
    frame.style.display = "block";
    frame.setAttribute("scrolling", "no");
    frame.setAttribute("title", "Form");
    frame.src = origin + "/embed/" + encodeURIComponent(formId) +
      (theme ? "?theme=" + encodeURIComponent(theme) : "");
    host.appendChild(frame);

    function onMessage(e) {
      if (e.origin !== origin || !e.data || e.data.type !== "porskad-resize") return;
      if (!e.source || e.source !== frame.contentWindow) return;
      if (typeof e.data.height === "number") {
        frame.style.height = Math.max(e.data.height + 24, 160) + "px";
      }
    }
    if (window.addEventListener) window.addEventListener("message", onMessage, false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
