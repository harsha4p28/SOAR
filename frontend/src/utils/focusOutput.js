export function focusOutput(targetId) {
  if (!targetId) {
    return;
  }

  window.requestAnimationFrame(() => {
    const element = document.getElementById(targetId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    element.focus({ preventScroll: true });
  });
}
