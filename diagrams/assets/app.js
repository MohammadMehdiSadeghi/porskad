/* ══════════════════════════════════════════════════════════════════
   پرس‌کاد (Porskad) — اسکریپت تعاملی دیاگرام‌ها
   کنترل‌های زوم، جابجایی (Pan & Zoom)، فول‌اسکرین و خروجی SVG
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initDiagramControls();
  initNavigation();
});

function initDiagramControls() {
  const viewport = document.querySelector('.diagram-viewport');
  const canvas = document.querySelector('.diagram-canvas');
  if (!viewport || !canvas) return;

  let scale = 1;
  let isPanning = false;
  let startX = 0;
  let startY = 0;
  let translateX = 0;
  let translateY = 0;

  function updateTransform() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  }

  // Zoom buttons
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const exportBtn = document.getElementById('exportBtn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      scale = Math.min(scale * 1.25, 3.5);
      updateTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      scale = Math.max(scale / 1.25, 0.4);
      updateTransform();
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      scale = 1;
      translateX = 0;
      translateY = 0;
      updateTransform();
    });
  }

  // Mouse drag to pan
  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('a')) return;
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    viewport.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    if (viewport) viewport.style.cursor = 'grab';
  });

  // Wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    scale = Math.min(Math.max(scale * zoomFactor, 0.35), 3.5);
    updateTransform();
  }, { passive: false });

  // Fullscreen
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const stageCard = document.querySelector('.diagram-stage-card');
      if (stageCard) {
        stageCard.classList.toggle('fullscreen');
        if (stageCard.classList.contains('fullscreen')) {
          fullscreenBtn.textContent = '✕';
          fullscreenBtn.title = 'خروج از تمام صفحه';
        } else {
          fullscreenBtn.textContent = '⛶';
          fullscreenBtn.title = 'تمام صفحه';
        }
      }
    });
  }

  // Export SVG
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
