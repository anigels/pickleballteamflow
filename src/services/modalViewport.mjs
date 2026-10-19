// Follow the visible area when a software keyboard reduces the webview viewport.
// Ignore pinch zoom so users can magnify the interface without relayout.
export function trackModalViewport(win = window, root = document.documentElement) {
  const viewport = win.visualViewport;
  if (!viewport) return () => {};
  const update = () => {
    if (viewport.scale !== 1) return;
    root.style.setProperty('--modal-visible-height', `${viewport.height}px`);
    root.style.setProperty('--modal-visible-top', `${viewport.offsetTop}px`);
  };
  viewport.addEventListener('resize', update);
  viewport.addEventListener('scroll', update);
  update();
  return () => {
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
    root.style.removeProperty('--modal-visible-height');
    root.style.removeProperty('--modal-visible-top');
  };
}
