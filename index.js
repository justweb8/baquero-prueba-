/* ============================================================
   VaqueroApp — app.js
   Lógica del Login: tabs, validaciones, toggle password,
   simulación de autenticación (conectar a Supabase después)
   ============================================================ */

'use strict';

/* ── Utilidades ─────────────────────────────────────────────── */

function $(id) { return document.getElementById(id); }

function mostrarError(campoId, msgId) {
  $(campoId).classList.add('error');
  $(msgId).classList.add('visible');
}

function limpiarError(campoId, msgId) {
  $(campoId).classList.remove('error');
  $(msgId).classList.remove('visible');
}

function mostrarAlerta(alertaId, msgId, texto) {
  $(msgId).textContent = texto;
  $(alertaId).classList.add('visible');
}

function ocultarAlerta(alertaId) {
  $(alertaId).classList.remove('visible');
}

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/* ── Toggle contraseña ──────────────────────────────────────── */

function togglePassword(inputId, iconEl) {
  const input = $(inputId);
  const esTexto = input.type === 'text';
  input.type = esTexto ? 'password' : 'text';

  /* Ícono ojo abierto / cerrado */
  iconEl.innerHTML = esTexto
    ? `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
         <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
         <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
       </svg>`
    : `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
         <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
       </svg>`;
}

/* ── Cambiar tabs Login / Registro ──────────────────────────── */

function cambiarTab(tab) {
  const esLogin = tab === 'login';

  $('tab-login').classList.toggle('activo', esLogin);
  $('tab-registro').classList.toggle('activo', !esLogin);
  $('tab-login').setAttribute('aria-selected', esLogin);
  $('tab-registro').setAttribute('aria-selected', !esLogin);

  $('form-login').style.display    = esLogin ? 'block' : 'none';
  $('form-registro').style.display = esLogin ? 'none'  : 'block';

  /* Limpiar alertas y errores al cambiar */
  ocultarAlerta('alerta-login');
  ocultarAlerta('alerta-reg');
  limpiarTodosErrores();
}

function limpiarTodosErrores() {
  const campos = ['email-login','pass-login','reg-nombre','reg-rancho','reg-email','reg-pass'];
  const errores = ['err-email-login','err-pass-login','err-reg-nombre','err-reg-rancho','err-reg-email','err-reg-pass'];
  campos.forEach(c => { if($(c)) $(c).classList.remove('error'); });
  errores.forEach(e => { if($(e)) $(e).classList.remove('visible'); });
}

/* ── Limpiar error al escribir ──────────────────────────────── */

function bindLimpiezaErrores() {
  const pares = [
    ['email-login', 'err-email-login'],
    ['pass-login',  'err-pass-login'],
    ['reg-nombre',  'err-reg-nombre'],
    ['reg-rancho',  'err-reg-rancho'],
    ['reg-email',   'err-reg-email'],
    ['reg-pass',    'err-reg-pass'],
  ];
  pares.forEach(([c, e]) => {
    const el = $(c);
    if (el) el.addEventListener('input', () => limpiarError(c, e));
  });

  /* Enter para enviar */
  $('pass-login')?.addEventListener('keydown', e => { if (e.key === 'Enter') iniciarSesion(); });
  $('reg-pass')?.addEventListener('keydown',   e => { if (e.key === 'Enter') crearCuenta(); });
}

/* ── INICIAR SESIÓN ─────────────────────────────────────────── */

async function iniciarSesion() {
  const email = $('email-login').value.trim();
  const pass  = $('pass-login').value;

  ocultarAlerta('alerta-login');
  let valido = true;

  if (!validarEmail(email)) {
    mostrarError('email-login', 'err-email-login');
    valido = false;
  }
  if (!pass) {
    mostrarError('pass-login', 'err-pass-login');
    valido = false;
  }
  if (!valido) return;

  /* Estado cargando */
  const btn = $('btn-ingresar');
  btn.classList.add('cargando');

  try {
    /* ────────────────────────────────────────────────────────
       AQUÍ SE CONECTA SUPABASE:
       const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
       if (error) throw error;
       window.location.href = 'dashboard.html';
    ──────────────────────────────────────────────────────── */

    /* Simulación temporal (quitar cuando conectes Supabase) */
    await esperar(1500);

    /* Demo: credenciales de prueba */
    if (email === 'demo@vaqueroapp.com' && pass === 'demo1234') {
      mostrarExito('¡Bienvenido a VaqueroApp!');
      /* window.location.href = 'dashboard.html'; */
    } else {
      throw new Error('Credenciales incorrectas');
    }

  } catch (err) {
    mostrarAlerta('alerta-login', 'alerta-login-msg',
      'Correo o contraseña incorrectos. Verifica tus datos.');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── CREAR CUENTA ───────────────────────────────────────────── */

async function crearCuenta() {
  const nombre = $('reg-nombre').value.trim();
  const rancho = $('reg-rancho').value.trim();
  const email  = $('reg-email').value.trim();
  const pass   = $('reg-pass').value;

  ocultarAlerta('alerta-reg');
  let valido = true;

  if (!nombre) { mostrarError('reg-nombre', 'err-reg-nombre'); valido = false; }
  if (!rancho) { mostrarError('reg-rancho', 'err-reg-rancho'); valido = false; }
  if (!validarEmail(email)) { mostrarError('reg-email', 'err-reg-email'); valido = false; }
  if (pass.length < 8) { mostrarError('reg-pass', 'err-reg-pass'); valido = false; }
  if (!valido) return;

  const btn = $('btn-registro');
  btn.classList.add('cargando');

  try {
    /* ────────────────────────────────────────────────────────
       AQUÍ SE CONECTA SUPABASE:
       const { data, error } = await supabase.auth.signUp({ email, password: pass });
       if (error) throw error;
       // Luego insertar perfil y rancho:
       await supabase.from('perfiles').insert({ id: data.user.id, email, nombre });
       await supabase.from('ranchos').insert({ user_id: data.user.id, nombre: rancho });
       window.location.href = 'dashboard.html';
    ──────────────────────────────────────────────────────── */

    /* Simulación temporal */
    await esperar(1800);
    mostrarExito('¡Cuenta creada! Revisa tu correo para confirmar.');

  } catch (err) {
    mostrarAlerta('alerta-reg', 'alerta-reg-msg',
      err.message || 'Error al crear la cuenta. Intenta de nuevo.');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── RECUPERAR CONTRASEÑA ───────────────────────────────────── */

function mostrarRecuperar(e) {
  e.preventDefault();
  const email = $('email-login').value.trim();

  if (!validarEmail(email)) {
    mostrarError('email-login', 'err-email-login');
    $('email-login').focus();
    mostrarAlerta('alerta-login', 'alerta-login-msg',
      'Escribe tu correo arriba primero.');
    return;
  }

  /* ────────────────────────────────────────────────────────
     AQUÍ SE CONECTA SUPABASE:
     await supabase.auth.resetPasswordForEmail(email);
  ──────────────────────────────────────────────────────── */

  mostrarExito(`Se enviará un enlace de recuperación a ${email}`);
}

/* ── Helpers visuales ───────────────────────────────────────── */

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

function mostrarExito(msg) {
  /* Toast simple arriba a la derecha */
  let toast = document.querySelector('.vq-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'vq-toast';
    toast.style.cssText = `
      position:fixed; top:20px; right:20px; z-index:9999;
      background:#0D2B6B; color:#fff; padding:14px 20px;
      border-radius:12px; font-size:14px; font-weight:500;
      box-shadow:0 8px 32px rgba(13,43,107,0.35);
      display:flex; align-items:center; gap:10px;
      font-family:'Open Sans',sans-serif;
      max-width:320px; line-height:1.4;
      transform:translateY(-8px); opacity:0;
      transition:all .3s cubic-bezier(.34,1.56,.64,1);
    `;
    document.body.appendChild(toast);
  }
  toast.innerHTML = `
    <svg width="18" height="18" fill="none" stroke="#F0A500" stroke-width="2.5" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    ${msg}
  `;
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
  }, 3500);
}

/* ── Init ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  bindLimpiezaErrores();
  /* Asegura que el tab login esté activo al cargar */
  cambiarTab('login');
});
