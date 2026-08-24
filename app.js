// --- Gestione Login & Autenticazione ---
function doLogin(e) {
  if (e) e.preventDefault();

  const u = document.getElementById('username').value.trim().toLowerCase();
  const p = document.getElementById('password').value.trim();
  const remember = document.getElementById('remember-me').checked;

  if (!u || !p) {
    alert('Compila tutti i campi!');
    return;
  }

  // Verifica credenziali in chiaro
  if (u === 'michele' && p === 't0p3tt4!') {
    localStorage.setItem('isLoggedIn', 'true');
    if (remember) {
      localStorage.setItem('saved_username', u);
    } else {
      localStorage.removeItem('saved_username');
    }
    initApp();
  } else {
    alert('Credenziali errate!');
  }
}

function doLogout() {
  localStorage.removeItem('isLoggedIn');
  document.getElementById('login-modal').classList.remove('hidden');
  document.getElementById('app-content').classList.add('hidden');
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password');
  const toggleIcon = document.getElementById('password-toggle-icon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleIcon.classList.remove('fa-eye');
    toggleIcon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    toggleIcon.classList.remove('fa-eye-slash');
    toggleIcon.classList.add('fa-eye');
  }
}

function initApp() {
  document.getElementById('login-modal').classList.add('hidden');
  document.getElementById('app-content').classList.remove('hidden');
}

// Controllo stato sessione all'avvio
document.addEventListener('DOMContentLoaded', () => {
  const savedUser = localStorage.getItem('saved_username');
  if (savedUser) {
    const userField = document.getElementById('username');
    if (userField) userField.value = savedUser;
    const rememberMe = document.getElementById('remember-me');
    if (rememberMe) rememberMe.checked = true;
  }

  if (localStorage.getItem('isLoggedIn') === 'true') {
    initApp();
  }
});

// Registrazione Service Worker per supporto PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}