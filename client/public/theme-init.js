// Runs before the app bundle: applies the saved theme so dark-mode users
// never see a white flash. Keep in sync with readInitialTheme in ThemeContext.
(function () {
  try {
    if (localStorage.getItem('gestorpro:theme') === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  } catch (e) {}
})();
