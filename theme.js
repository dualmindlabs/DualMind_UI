// Theme switcher - shared across all pages
(function() {
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    if (theme === 'system') {
      theme = getSystemTheme();
    }
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Apply theme immediately to prevent flash
  const savedTheme = localStorage.getItem('theme') || 'dark';
  applyTheme(savedTheme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
})();
