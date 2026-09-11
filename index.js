/* ============================================================
   VaqueroApp — index.js
   Login + Dashboard: navegación, validaciones, sesión
   ============================================================ */
'use strict';

/* ── Utilidades ── */
function $(id) { return document.getElementById(id); }
function mostrarError(c,m){ $(c).classList.add('error'); $(m).classList.add('visible'); }
function limpiarError(c,m){ $(c).classList.remove('error'); $(m).classList.remove('visible'); }
function mostrarAlerta(a,m,t){ $(m).textContent=t; $(a).classList.add('visible'); }
function ocultarAlerta(a){ $(a).classList.remove('visible'); }
function validarEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
function esperar(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ── Toggle contraseña ── */
function togglePassword(inputId, iconEl) {
  const input = $(inputId);
  const esTexto = input.type === 'text';
  input.type = esTexto ? 'password' : 'text';
  iconEl.innerHTML = esTexto
    ? `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`
    : `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`;
}

/* ── Tabs Login/Registro ── */
function cambiarTab(tab) {
  const esLogin = tab === 'login';
  $('tab-login').classList.toggle('activo', esLogin);
  $('tab-registro').classList.toggle('activo', !esLogin);
  $('tab-login').setAttribute('aria-selected', esLogin);
  $('tab-registro').setAttribute('aria-selected', !esLogin);
  $('form-login').style.display    = esLogin ? 'block' : 'none';
  $('form-registro').style.display = esLogin ? 'none'  : 'block';
  ocultarAlerta('alerta-login');
  ocultarAlerta('alerta-reg');
  limpiarTodosErrores();
}

function limpiarTodosErrores() {
  ['email-login','pass-login','reg-nombre','reg-rancho','reg-email','reg-pass']
    .forEach(c => { if($(c)) $(c).classList.remove('error'); });
  ['err-email-login','err-pass-login','err-reg-nombre','err-reg-rancho','err-reg-email','err-reg-pass']
    .forEach(e => { if($(e)) $(e).classList.remove('visible'); });
}

/* ── INICIAR SESIÓN ── */
async function iniciarSesion() {
  const email = $('email-login').value.trim();
  const pass  = $('pass-login').value;
  ocultarAlerta('alerta-login');
  let ok = true;
  if (!validarEmail(email)) { mostrarError('email-login','err-email-login'); ok=false; }
  if (!pass) { mostrarError('pass-login','err-pass-login'); ok=false; }
  if (!ok) return;

  const btn = $('btn-ingresar');
  btn.classList.add('cargando');
  try {
    /* ── CONECTAR SUPABASE ──────────────────────────────
       const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
       if (error) throw error;
       const perfil = await supabase.from('perfiles').select('*').eq('id', data.user.id).single();
       sesionActiva = { user: data.user, perfil: perfil.data };
       mostrarDashboard(sesionActiva);
    ───────────────────────────────────────────────────── */

    await esperar(1400);
    // Demo temporal
    if (email === 'demo@vaqueroapp.com' && pass === 'demo1234') {
      const sesionDemo = {
        nombre: 'Administrador',
        rancho: 'Ganadería El Vaquero',
        email: email
      };
      mostrarDashboard(sesionDemo);
    } else {
      throw new Error('Credenciales incorrectas');
    }
  } catch(err) {
    mostrarAlerta('alerta-login','alerta-login-msg','Correo o contraseña incorrectos.');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── CREAR CUENTA ── */
async function crearCuenta() {
  const nombre = $('reg-nombre').value.trim();
  const rancho = $('reg-rancho').value.trim();
  const email  = $('reg-email').value.trim();
  const pass   = $('reg-pass').value;
  ocultarAlerta('alerta-reg');
  let ok = true;
  if (!nombre) { mostrarError('reg-nombre','err-reg-nombre'); ok=false; }
  if (!rancho) { mostrarError('reg-rancho','err-reg-rancho'); ok=false; }
  if (!validarEmail(email)) { mostrarError('reg-email','err-reg-email'); ok=false; }
  if (pass.length < 8) { mostrarError('reg-pass','err-reg-pass'); ok=false; }
  if (!ok) return;

  const btn = $('btn-registro');
  btn.classList.add('cargando');
  try {
    /* ── CONECTAR SUPABASE ──────────────────────────────
       const { data, error } = await supabase.auth.signUp({ email, password: pass });
       if (error) throw error;
       await supabase.from('perfiles').insert({ id: data.user.id, email, nombre });
       await supabase.from('ranchos').insert({ user_id: data.user.id, nombre: rancho, plan: 'basico' });
       mostrarToast('Cuenta creada. Revisa tu correo para confirmar.');
    ───────────────────────────────────────────────────── */
    await esperar(1800);
    mostrarToast('Cuenta creada. Revisa tu correo para confirmar.');
    cambiarTab('login');
  } catch(err) {
    mostrarAlerta('alerta-reg','alerta-reg-msg', err.message || 'Error al crear la cuenta.');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── RECUPERAR CONTRASEÑA ── */
function mostrarRecuperar(e) {
  e.preventDefault();
  const email = $('email-login').value.trim();
  if (!validarEmail(email)) {
    mostrarError('email-login','err-email-login');
    mostrarAlerta('alerta-login','alerta-login-msg','Escribe tu correo primero.');
    return;
  }
  /* supabase.auth.resetPasswordForEmail(email); */
  mostrarToast('Se enviará un enlace de recuperación a ' + email);
}

/* ── MOSTRAR DASHBOARD ── */
function mostrarDashboard(sesion) {
  setTimeout(() => {
    // Ocultar login
    const loginWrap  = document.querySelector('.login-wrapper');
    const movilHdr   = document.querySelector('.movil-header');
    if (loginWrap) loginWrap.style.display  = 'none';
    if (movilHdr)  movilHdr.style.display   = 'none';

    // Mostrar dashboard
    const dash = $('app-dashboard');
    dash.style.setProperty('display', 'block', 'important');
    document.body.style.overflow   = 'hidden';
    document.body.style.background = '#F0F4FA';

    // Llenar datos de usuario
    const nombre  = sesion.nombre || sesion.email || 'Usuario';
    const rancho  = sesion.rancho || 'Mi Rancho';
    const inicial = nombre.charAt(0).toUpperCase();
    if ($('dash-usuario-nombre')) $('dash-usuario-nombre').textContent = nombre;
    if ($('dash-rancho-nombre'))  $('dash-rancho-nombre').textContent  = rancho;
    if ($('dash-username-top'))   $('dash-username-top').textContent   = nombre;
    if ($('dash-avatar'))         $('dash-avatar').textContent         = inicial;

    // Guardar sesión
    try { localStorage.setItem('vq_sesion', JSON.stringify(sesion)); } catch(e) {}
  }, 200);
}

/* ── NAVEGACIÓN SIDEBAR ── */
function navegar(seccion) {
  // Marcar item activo
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('activo'));
  const target = document.querySelector(`.nav-item[onclick*="${seccion}"]`);
  if (target) target.classList.add('activo');

  // Por ahora muestra un toast — aquí se cargarán las secciones reales
  const nombres = {
    'inicio': 'Inicio', 'dashboard': 'Dashboard', 'animales': 'Animales',
    'salud': 'Salud & Vacunas', 'inseminacion': 'Inseminación', 'partos': 'Partos',
    'calendario': 'Calendario', 'alertas': 'Alertas', 'reportes': 'Reportes',
    'historial': 'Historial', 'gastos': 'Gastos', 'inventario': 'Inventario',
    'proveedores': 'Proveedores', 'finanzas': 'Finanzas',
    'banco-genetico': 'Banco Genético', 'arbol': 'Árbol Genealógico',
    'suscripcion': 'Suscripción', 'perfil': 'Mi Perfil', 'documentos': 'Documentos'
  };
  if (seccion !== 'inicio') {
    mostrarToast('Módulo: ' + (nombres[seccion] || seccion) + ' — próximamente');
  }
}

/* ── CERRAR SESIÓN ── */
function cerrarSesion() {
  try { localStorage.removeItem('vq_sesion'); } catch(e) {}
  /* supabase.auth.signOut(); */
  $('app-dashboard').style.display = 'none';
  const loginWrap = document.querySelector('.login-wrapper');
  if (loginWrap) loginWrap.style.display = '';
  document.body.style.overflow = '';
  document.body.style.background = '';
  if ($('email-login')) $('email-login').value = '';
  if ($('pass-login'))  $('pass-login').value  = '';
  cambiarTab('login');
}

/* ── TOAST ── */
function mostrarToast(msg, tipo='ok') {
  let toast = document.querySelector('.vq-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'vq-toast';
    toast.style.cssText = `
      position:fixed;top:20px;right:20px;z-index:9999;
      background:#0D2B6B;color:#fff;padding:13px 18px;
      border-radius:12px;font-size:13px;font-weight:500;
      box-shadow:0 8px 32px rgba(13,43,107,0.35);
      display:flex;align-items:center;gap:10px;
      font-family:'Open Sans',sans-serif;max-width:320px;line-height:1.4;
      transform:translateY(-8px);opacity:0;
      transition:all .3s cubic-bezier(.34,1.56,.64,1);`;
    document.body.appendChild(toast);
  }
  const ico = tipo==='ok'
    ? `<svg width="16" height="16" fill="none" stroke="#F0A500" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
    : `<svg width="16" height="16" fill="none" stroke="#E24B4A" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  toast.innerHTML = ico + msg;
  requestAnimationFrame(() => { toast.style.opacity='1'; toast.style.transform='translateY(0)'; });
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(-8px)'; }, 3500);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  cambiarTab('login');

  // Limpiar errores al escribir
  [['email-login','err-email-login'],['pass-login','err-pass-login'],
   ['reg-nombre','err-reg-nombre'],['reg-rancho','err-reg-rancho'],
   ['reg-email','err-reg-email'],['reg-pass','err-reg-pass']
  ].forEach(([c,e]) => { const el=$(c); if(el) el.addEventListener('input',()=>limpiarError(c,e)); });

  // Enter para login
  $('pass-login')?.addEventListener('keydown', e => { if(e.key==='Enter') iniciarSesion(); });
  $('reg-pass')?.addEventListener('keydown',   e => { if(e.key==='Enter') crearCuenta(); });

  // Revisar sesión guardada
  try {
    const sesionGuardada = JSON.parse(localStorage.getItem('vq_sesion') || 'null');
    if (sesionGuardada) mostrarDashboard(sesionGuardada);
  } catch(e) {}
});

/* ── UTILIDAD: limpiar sesión guardada (llamar desde consola si hay problemas) ── */
function resetSesion() {
  try { localStorage.removeItem('vq_sesion'); } catch(e) {}
  location.reload();
}
