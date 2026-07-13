// Theme Management module
export function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  // Retrieve theme preference from LocalStorage or default to system
  const savedTheme = localStorage.getItem('legal-theme') || 'auto';
  setTheme(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.body.classList.contains('theme-dark') ? 'dark' : (document.body.classList.contains('theme-light') ? 'light' : 'auto');
    let nextTheme = 'auto';

    if (currentTheme === 'auto') {
      nextTheme = 'light';
    } else if (currentTheme === 'light') {
      nextTheme = 'dark';
    } else {
      nextTheme = 'auto';
    }

    setTheme(nextTheme);
  });
}

function setTheme(theme) {
  document.body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
  
  if (theme === 'dark') {
    document.body.classList.add('theme-dark');
  } else if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.add('theme-auto');
  }
  
  localStorage.setItem('legal-theme', theme);
}
