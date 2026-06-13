// Theme toggle for the nav button. The initial theme is applied by the
// inline script in each page's <head> (before first paint).
(function () {
  var btn = document.getElementById('themeToggle');
  if (!btn) return;

  function syncLabel() {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }

  syncLabel();
  btn.addEventListener('click', function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncLabel();
  });
})();
