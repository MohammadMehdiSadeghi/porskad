/* ══════════════════════════════════════════════════════════════════
   پرس‌کاد (Porskad) — موتور بوم تعاملی شبیه فیگما (Figma-Like Canvas Engine)
   زوم دقیق روی مکان نشانگر ماوس، جابجایی با Spacebar / کلید وسط، و فیت خودکار
══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initFigmaCanvas();
  initNavigation();
});

function initFigmaCanvas() {
  const viewport = document.querySelector('.diagram-viewport');
  const canvas = document.querySelector('.diagram-canvas');
  if (!viewport || !canvas) return;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let isPanning = false;
  let isSpacePressed = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  const minScale = 0.15;
  const maxScale = 5.0;

  // Zoom display element
  const zoomIndicator = document.getElementById('zoomIndicator');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const resetZoomBtn = document.getElementById('resetZoomBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const exportBtn = document.getElementById('exportBtn');

  function updateTransform() {
    canvas.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    // Move background dot-grid with pan & zoom for realistic infinite canvas
    viewport.style.backgroundPosition = `${translateX}px ${translateY}px`;
    viewport.style.backgroundSize = `${28 * scale}px ${28 * scale}px`;

    if (zoomIndicator) {
      zoomIndicator.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  // Auto-center and fit diagram to viewport on initial load
  function fitToScreen() {
    setTimeout(() => {
      const svg = canvas.querySelector('svg');
      if (!svg) {
        // Retry if mermaid is still rendering
        setTimeout(fitToScreen, 200);
        return;
      }

      const svgRect = svg.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();

      if (svgRect.width === 0 || svgRect.height === 0) return;

      const svgRawWidth = svg.viewBox?.baseVal?.width || svgRect.width;
      const svgRawHeight = svg.viewBox?.baseVal?.height || svgRect.height;

      const padding = 80;
      const availableWidth = viewportRect.width - padding;
      const availableHeight = viewportRect.height - padding;

      const scaleX = availableWidth / svgRawWidth;
      const scaleY = availableHeight / svgRawHeight;
      scale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.5), 1.25);

      // Center in viewport
      translateX = (viewportRect.width - svgRawWidth * scale) / 2;
      translateY = Math.max((viewportRect.height - svgRawHeight * scale) / 2, 40);

      updateTransform();
    }, 250);
  }

  // Run fit on start
  fitToScreen();

  // 1. FIGMA-STYLE CURSOR-CENTRIC MOUSE WHEEL ZOOM
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Trackpad pinch or mouse wheel
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.min(Math.max(scale * zoomFactor, minScale), maxScale);

    if (newScale !== scale) {
      // Keep point under cursor fixed:
      translateX = mouseX - (mouseX - translateX) * (newScale / scale);
      translateY = mouseY - (mouseY - translateY) * (newScale / scale);
      scale = newScale;
      updateTransform();
    }
  }, { passive: false });

  // 2. SPACEBAR & MIDDLE CLICK HANDLING (JUST LIKE FIGMA)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !isSpacePressed && document.activeElement.tagName !== 'INPUT') {
      isSpacePressed = true;
      viewport.classList.add('spacebar-active');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      viewport.classList.remove('spacebar-active');
      if (!isPanning) viewport.classList.remove('panning');
    }
  });

  // 3. PANNING WITH MOUSE DRAG
  viewport.addEventListener('mousedown', (e) => {
    // Middle click (button 1), Spacebar + Left Click, or direct Left Click on canvas backdrop
    const isMiddleClick = e.button === 1;
    const isLeftClick = e.button === 0;

    if (isMiddleClick || isSpacePressed || isLeftClick) {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('select')) return;
      isPanning = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      viewport.classList.add('panning');
      e.preventDefault();
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    const deltaX = e.clientX - startMouseX;
    const deltaY = e.clientY - startMouseY;
    translateX = startTranslateX + deltaX;
    translateY = startTranslateY + deltaY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      viewport.classList.remove('panning');
    }
  });

  // 4. TOUCH PINCH-TO-ZOOM AND TOUCH PAN (MOBILE & TABLET)
  let initialPinchDistance = null;
  let initialPinchScale = 1;

  viewport.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isPanning = true;
      startMouseX = e.touches[0].clientX;
      startMouseY = e.touches[0].clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
    } else if (e.touches.length === 2) {
      isPanning = false;
      initialPinchDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      initialPinchScale = scale;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (isPanning && e.touches.length === 1) {
      const deltaX = e.touches[0].clientX - startMouseX;
      const deltaY = e.touches[0].clientY - startMouseY;
      translateX = startTranslateX + deltaX;
      translateY = startTranslateY + deltaY;
      updateTransform();
    } else if (e.touches.length === 2 && initialPinchDistance) {
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const pinchFactor = currentDistance / initialPinchDistance;
      const newScale = Math.min(Math.max(initialPinchScale * pinchFactor, minScale), maxScale);
      scale = newScale;
      updateTransform();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isPanning = false;
    initialPinchDistance = null;
  });

  // 5. TOOLBAR BUTTON CONTROLS
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newScale = Math.min(scale * 1.25, maxScale);
      translateX = centerX - (centerX - translateX) * (newScale / scale);
      translateY = centerY - (centerY - translateY) * (newScale / scale);
      scale = newScale;
      updateTransform();
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      const rect = viewport.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const newScale = Math.max(scale / 1.25, minScale);
      translateX = centerX - (centerX - translateX) * (newScale / scale);
      translateY = centerY - (centerY - translateY) * (newScale / scale);
      scale = newScale;
      updateTransform();
    });
  }

  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => {
      fitToScreen();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      const stageCard = document.querySelector('.diagram-stage-card');
      if (stageCard) {
        stageCard.classList.toggle('fullscreen');
        fullscreenBtn.textContent = stageCard.classList.contains('fullscreen') ? '✕' : '⛶';
        fullscreenBtn.title = stageCard.classList.contains('fullscreen') ? 'خروج از تمام صفحه' : 'تمام صفحه';
        setTimeout(fitToScreen, 100);
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
