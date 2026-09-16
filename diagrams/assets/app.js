/* ══════════════════════════════════════════════════════════════════
   پرس‌کاد (Porskad) — اسکریپت تعاملی و کنترل تم
   پشتیبانی کامل از Dark Mode / Light Mode و دکمه‌های آیکونی Lucide
══════════════════════════════════════════════════════════════════ */

// SVG Icons (Lucide Style)
const ICONS = {
  sun: `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
  moon: `<svg class="icon" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  zoomIn: `<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  zoomOut: `<svg class="icon icon-sm" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
  reset: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
  fullscreen: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`,
  closeFullscreen: `<svg class="icon icon-sm" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  download: `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
};

document.addEventListener('DOMContentLoaded', () => {
  initThemeManager();
  initIconReplacements();
  initDiagramViewer();
  initNavigation();
});

// ─── Theme Manager (Dark / Light Mode) ───
function initThemeManager() {
  const savedTheme = localStorage.getItem('porskad_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Setup toggle button in header
  const navActions = document.querySelector('.nav-actions');
  if (navActions && !document.getElementById('themeToggleBtn')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'themeToggleBtn';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.title = savedTheme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک';
    toggleBtn.innerHTML = savedTheme === 'dark' ? ICONS.sun : ICONS.moon;

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('porskad_theme', next);
      toggleBtn.innerHTML = next === 'dark' ? ICONS.sun : ICONS.moon;
      toggleBtn.title = next === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک';
    });

    navActions.prepend(toggleBtn);
  }
}

// ─── Populate buttons with clean SVG icons ───
function initIconReplacements() {
  const zoomIn = document.getElementById('zoomInBtn');
  if (zoomIn) zoomIn.innerHTML = ICONS.zoomIn;

  const zoomOut = document.getElementById('zoomOutBtn');
  if (zoomOut) zoomOut.innerHTML = ICONS.zoomOut;

  const reset = document.getElementById('resetZoomBtn');
  if (reset) reset.innerHTML = ICONS.reset;

  const fs = document.getElementById('fullscreenBtn');
  if (fs) fs.innerHTML = ICONS.fullscreen;

  const exp = document.getElementById('exportBtn');
  if (exp) {
    exp.innerHTML = `${ICONS.download} <span>خروجی SVG</span>`;
  }
}

// ─── Interactive Canvas (Figma Engine) ───
function initDiagramViewer() {
  const viewport = document.querySelector('.diagram-viewport');
  const canvas = document.querySelector('.diagram-canvas');
  if (!viewport || !canvas) return;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  const minScale = 0.02;
  const maxScale = 30.0;

  const zoomIndicator = document.getElementById('zoomIndicator');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const exportBtn = document.getElementById('exportBtn');

  function renderTransform() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
    viewport.style.backgroundSize = `${Math.round(28 * Math.min(Math.max(scale, 0.4), 3))}px ${Math.round(28 * Math.min(Math.max(scale, 0.4), 3))}px`;
    if (zoomIndicator) {
      zoomIndicator.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  // Initial render
  renderTransform();

  // 1. Mouse Wheel Zoom (Cursor-Centric Balanced Curve)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const normalizedDelta = Math.min(Math.max(e.deltaY, -120), 120);
    const zoomFactor = Math.exp(-normalizedDelta * 0.0036);
    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

    if (newScale !== scale) {
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      translateX = mouseX - (mouseX - translateX) * (newScale / scale);
      translateY = mouseY - (mouseY - translateY) * (newScale / scale);
      scale = newScale;
      renderTransform();
    }
  }, { passive: false });

  // 2. Double-Click to Zoom In at Cursor
  viewport.addEventListener('dblclick', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const zoomFactor = e.shiftKey ? 0.65 : 1.5;
    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);
    translateX = mouseX - (mouseX - translateX) * (newScale / scale);
    translateY = mouseY - (mouseY - translateY) * (newScale / scale);
    scale = newScale;
    renderTransform();
  });

  // 3. Pan with Mouse Drag
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    viewport.style.cursor = 'grabbing';
    canvas.style.transition = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    renderTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      viewport.style.cursor = 'grab';
      canvas.style.transition = 'transform 0.08s ease-out';
    }
  });

  // 4. Touch Pan & Zoom for Mobile
  let initialTouchDist = null;
  let initialTouchScale = 1;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startX = e.touches[0].clientX - translateX;
      startY = e.touches[0].clientY - translateY;
      canvas.style.transition = 'none';
    } else if (e.touches.length === 2) {
      isPanning = false;
      initialTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialTouchScale = scale;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (isPanning && e.touches.length === 1) {
      translateX = e.touches[0].clientX - startX;
      translateY = e.touches[0].clientY - startY;
      renderTransform();
    } else if (e.touches.length === 2 && initialTouchDist) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = currentDist / initialTouchDist;
      scale = Math.min(Math.max(initialTouchScale * factor, minScale), maxScale);
      renderTransform();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isPanning = false;
    initialTouchDist = null;
    canvas.style.transition = 'transform 0.08s ease-out';
  });

  // 5. Toolbar Buttons
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      scale = Math.min(scale * 1.25, maxScale);
      renderTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      scale = Math.max(scale / 1.25, minScale);
      renderTransform();
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      renderTransform();
    });
  }

  if (zoomIndicator) {
    zoomIndicator.style.cursor = 'pointer';
    zoomIndicator.title = 'کلیک برای بازنشانی به ۱۰۰٪';
    zoomIndicator.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      renderTransform();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const stageCard = document.querySelector('.diagram-stage-card');
      if (stageCard) {
        stageCard.classList.toggle('fullscreen');
        const isFs = stageCard.classList.contains('fullscreen');
        fullscreenBtn.innerHTML = isFs ? ICONS.closeFullscreen : ICONS.fullscreen;
        fullscreenBtn.title = isFs ? 'خروج از تمام صفحه' : 'تمام صفحه';
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const svg = canvas.querySelector('svg');
      if (!svg) {
        alert('دیاگرام هنوز بارگذاری نشده است');
        return;
      }
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const title = document.querySelector('.page-title')?.textContent.trim() || 'porskad-diagram';
      a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

function initNavigation() {
  const select = document.getElementById('diagramNavSelect');
  if (!select) return;

  select.addEventListener('change', (e) => {
    if (e.target.value) {
      window.location.href = e.target.value;
    }
  });
}
