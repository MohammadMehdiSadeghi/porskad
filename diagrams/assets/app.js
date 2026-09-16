/* ══════════════════════════════════════════════════════════════════
   پرس‌کاد (Porskad) — موتور بوم تعاملی فیگما (Figma-Like Canvas Engine)
   پایدار، روان، وسط‌چین خودکار و زوم با چرخ ماوس
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initDiagramViewer();
  initNavigation();
});

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

  // Ultra-wide Figma zoom range: from 2% to 3000% (30x zoom)
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

  // 1. High-Performance Balanced & Responsive Zoom with Mouse Wheel (Figma Standard)
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    // Balanced responsive damping
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

  // Quick double-click to zoom in at cursor (1.5x)
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

  // 2. Pan with Mouse Drag (Any button / Spacebar)
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

  // 3. Touch Gestures for Mobile / Tablet
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

  // 4. Toolbar Controls
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
        fullscreenBtn.textContent = stageCard.classList.contains('fullscreen') ? '✕' : '⛶';
        fullscreenBtn.title = stageCard.classList.contains('fullscreen') ? 'خروج از تمام صفحه' : 'تمام صفحه';
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
