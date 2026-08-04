(() => {
  'use strict';
  const form = document.getElementById('loginForm');
  const identity = document.getElementById('identity');
  const password = document.getElementById('password');
  const remember = document.getElementById('remember');
  const toggle = document.getElementById('togglePassword');
  const button = document.getElementById('loginButton');
  const message = document.getElementById('message');

  if (!form || !identity || !password || !button) return;

  const validIdentity = () => {
    const value = identity.value.trim();
    return value.length >= 3 && (!value.includes('@') || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  };
  const validPassword = () => password.value.length >= 6;

  function updateButton() {
    const valid = validIdentity() && validPassword();
    button.disabled = !valid;
    button.classList.toggle('active', valid);
  }

  [identity, password].forEach(el => el.addEventListener('input', () => {
    message.textContent = '';
    message.className = 'message';
    updateButton();
  }));

  toggle?.addEventListener('click', () => {
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    toggle.textContent = show ? '◎' : '◉';
    toggle.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validIdentity() || !validPassword()) {
      message.textContent = 'Lengkapi username/email dan kata sandi minimal 6 karakter.';
      message.className = 'message error';
      return;
    }

    button.disabled = true;
    button.textContent = 'MEMPROSES...';

    const saved = NovaStorage.setSession({
      identity: identity.value,
      remember: remember?.checked
    });

    if (!saved) {
      button.disabled = false;
      button.textContent = 'MASUK';
      message.textContent = 'Browser tidak dapat menyimpan sesi. Periksa pengaturan penyimpanan.';
      message.className = 'message error';
      return;
    }

    const profile = NovaStorage.getIdentity();
    window.location.replace(profile?.fullName && /^\d{16}$/.test(profile?.nik || '')
      ? 'dashboard.html'
      : 'form-nik.html');
  });

  updateButton();
})();
