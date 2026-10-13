/* ==========================================================================
   THEME - Light/Dark mode toggle with localStorage persistence
   Cycles: auto -> light -> dark -> auto
   Uses data-theme attribute on <html> to override CSS custom properties
   ========================================================================== */

var Theme = (function() {
  var STORAGE_KEY = 'theme-preference';

  /**
   * Apply saved theme preference on page load.
   * Called early so the page renders with the correct theme before paint.
   */
  function init() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'light' || saved === 'dark')) {
      document.documentElement.setAttribute('data-theme', saved);
    } else {
      // auto mode — remove attribute so media query takes effect
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /**
   * Cycle to the next theme: auto -> light -> dark -> auto
   * Returns the new theme name ('auto', 'light', or 'dark').
   */
  function toggle() {
    var current = document.documentElement.getAttribute('data-theme');
    var next;

    if (!current) {
      // Currently auto -> switch to light
      next = 'light';
    } else if (current === 'light') {
      // Currently light -> switch to dark
      next = 'dark';
    } else {
      // Currently dark -> switch to auto
      next = 'auto';
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem(STORAGE_KEY);
      return next;
    }

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    return next;
  }

  /**
   * Get the current theme setting.
   * Returns 'auto', 'light', or 'dark'.
   */
  function current() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return 'auto';
  }

  /**
   * Get the display label for the current theme (Portuguese).
   */
  function label() {
    var mode = current();
    if (mode === 'light') return 'Claro';
    if (mode === 'dark') return 'Escuro';
    return 'Auto';
  }

  return {
    init: init,
    toggle: toggle,
    current: current,
    label: label
  };
})();
