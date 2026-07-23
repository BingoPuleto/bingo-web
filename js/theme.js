(function () {
  var STORAGE_KEY = 'bingo_theme';

  function resolveInitialTheme() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    return prefersLight ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    var icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      var basePath = icon.getAttribute('src').includes('../') ? '../assets/icons/' : 'assets/icons/';
      icon.setAttribute('src', basePath + (theme === 'light' ? 'moon.svg' : 'sun.svg'));
    }

    var button = document.getElementById('theme-toggle-btn');
    if (button) {
      button.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
      button.setAttribute('aria-label', theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro');
    }
  }

  function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(current === 'light' ? 'dark' : 'light');
  }

  applyTheme(resolveInitialTheme());

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(document.documentElement.getAttribute('data-theme') || resolveInitialTheme());

    var button = document.getElementById('theme-toggle-btn');
    if (button) {
      button.addEventListener('click', toggleTheme);
    }
  });

  window.Theme = {
    setTheme: setTheme,
    toggleTheme: toggleTheme,
  };
})();