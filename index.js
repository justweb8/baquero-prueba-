'use strict';

/* ── Utilidades ── */
function $(id){ return document.getElementById(id); }
function qr(sel){ return document.querySelector(sel); }
function validarEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
function esperar(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ── Toast ── */
function toast(msg){
  const t = $('vq-toast');
  t.innerHTML = `<svg width="15" height="15" fill="none" stroke="#F0A500" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ${msg}`;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(()=>t.classList.remove('show'), 3200);
}

/* ── Campos helpers ── */
function setErr(id, show){
  const inp = $(id);
  const err = $('err-'+id);
  if(inp) inp.classList.toggle('err', show);
  if(err) err.classList.toggle('vis', show);
}
function clearErr(id){ setErr(id, false); }

/* ── Toggle password ── */
function togglePass(inputId, iconEl){
  const inp = $(inputId);
  inp.type = inp.type==='password' ? 'text' : 'password';
  iconEl.innerHTML = inp.type==='text'
    ? `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`
    : `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
}

/* ── Tabs ── */
function cambiarTab(tab){
  const esLogin = tab==='login';
  $('tab-login').classList.toggle('activo', esLogin);
  $('tab-registro').classList.toggle('activo', !esLogin);
  $('form-login').style.display    = esLogin ? 'block' : 'none';
  $('form-registro').style.display = esLogin ? 'none'  : 'block';
  // Limpiar alertas
  $('al-login').classList.remove('vis');
  $('al-reg').classList.remove('vis');
}

/* ── INICIAR SESIÓN ── */
async function iniciarSesion(){
  const email = $('email-login').value.trim();
  const pass  = $('pass-login').value;
  $('al-login').classList.remove('vis');
  let ok = true;
  if(!validarEmail(email)){ setErr('email-login',true); ok=false; }
  if(!pass){ setErr('pass-login',true); ok=false; }
  if(!ok) return;

  const btn = $('btn-ingresar');
  btn.classList.add('cargando');
  try{
    /* SUPABASE:
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if(error) throw error;
    mostrarDashboard({ nombre: data.user.email, rancho: 'Mi Rancho', email });
    */
    await esperar(1300);
    if(email==='demo@vaqueroapp.com' && pass==='demo1234'){
      mostrarDashboard({ nombre:'Administrador', rancho:'Ganadería El Vaquero', email });
    } else {
      throw new Error('Credenciales incorrectas');
    }
  } catch(e){
    $('al-login-msg').textContent = 'Correo o contraseña incorrectos.';
    $('al-login').classList.add('vis');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── CREAR CUENTA ── */
async function crearCuenta(){
  const nombre = $('reg-nombre').value.trim();
  const rancho = $('reg-rancho').value.trim();
  const email  = $('reg-email').value.trim();
  const pass   = $('reg-pass').value;
  $('al-reg').classList.remove('vis');
  let ok = true;
  if(!nombre){ setErr('reg-nombre',true); ok=false; }
  if(!rancho){ setErr('reg-rancho',true); ok=false; }
  if(!validarEmail(email)){ setErr('reg-email',true); ok=false; }
  if(pass.length<8){ setErr('reg-pass',true); ok=false; }
  if(!ok) return;

  const btn = $('btn-registro');
  btn.classList.add('cargando');
  try{
    /* SUPABASE:
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if(error) throw error;
    await supabase.from('perfiles').insert({ id: data.user.id, email, nombre });
    await supabase.from('ranchos').insert({ user_id: data.user.id, nombre: rancho, plan:'basico' });
    */
    await esperar(1600);
    toast('Cuenta creada. Revisa tu correo para confirmar.');
    cambiarTab('login');
  } catch(e){
    $('al-reg-msg').textContent = e.message || 'Error al crear la cuenta.';
    $('al-reg').classList.add('vis');
  } finally {
    btn.classList.remove('cargando');
  }
}

/* ── RECUPERAR CONTRASEÑA ── */
function recuperar(e){
  e.preventDefault();
  const email = $('email-login').value.trim();
  if(!validarEmail(email)){
    setErr('email-login',true);
    $('al-login-msg').textContent = 'Escribe tu correo primero.';
    $('al-login').classList.add('vis');
    return;
  }
  /* supabase.auth.resetPasswordForEmail(email); */
  toast('Enlace de recuperación enviado a ' + email);
}

/* ── MOSTRAR DASHBOARD ── */
function mostrarDashboard(sesion){
  // Ocultar login
  $('pantalla-login').classList.add('oculto');

  // Mostrar dashboard
  const dash = $('pantalla-dash');
  dash.classList.add('visible');
  document.body.style.overflow = 'hidden';

  // Rellenar datos
  const nombre  = sesion.nombre || sesion.email || 'Usuario';
  const rancho  = sesion.rancho || 'Mi Rancho';
  const inicial = nombre.charAt(0).toUpperCase();
  if($('d-nombre'))   $('d-nombre').textContent   = nombre;
  if($('d-rancho'))   $('d-rancho').textContent   = rancho;
  if($('d-username')) $('d-username').textContent = nombre;
  if($('d-avatar'))   $('d-avatar').textContent   = inicial;

  // Guardar sesión
  try{ localStorage.setItem('vq_sesion', JSON.stringify(sesion)); } catch(err){}
}

/* ── NAVEGACIÓN SIDEBAR ── */
function navegar(seccion, el){
  // Marcar activo
  document.querySelectorAll('.d-item').forEach(i=>i.classList.remove('on'));
  if(el) el.classList.add('on');

  const nombres = {
    inicio:'Inicio', dashboard:'Dashboard', animales:'Animales',
    salud:'Salud & Vacunas', inseminacion:'Inseminación', partos:'Partos',
    calendario:'Calendario', alertas:'Alertas', reportes:'Reportes',
    historial:'Historial', gastos:'Gastos', inventario:'Inventario',
    proveedores:'Proveedores', finanzas:'Finanzas',
    'banco-genetico':'Banco Genético', arbol:'Árbol Genealógico',
    suscripcion:'Suscripción', perfil:'Mi Perfil', documentos:'Documentos'
  };
  if(seccion !== 'inicio'){
    toast('Módulo ' + (nombres[seccion]||seccion) + ' — próximamente');
  }
}

/* ── CERRAR SESIÓN ── */
function cerrarSesion(){
  try{ localStorage.removeItem('vq_sesion'); } catch(err){}
  /* supabase.auth.signOut(); */
  $('pantalla-dash').classList.remove('visible');
  $('pantalla-login').classList.remove('oculto');
  document.body.style.overflow = '';
  if($('email-login')) $('email-login').value='';
  if($('pass-login'))  $('pass-login').value='';
  cambiarTab('login');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', ()=>{
  cambiarTab('login');

  // Limpiar errores al escribir
  [['email-login'],['pass-login'],['reg-nombre'],['reg-rancho'],['reg-email'],['reg-pass']]
    .forEach(([id])=>{
      const el=$(id);
      if(el) el.addEventListener('input',()=>clearErr(id));
    });

  // Enter para enviar
  $('pass-login')?.addEventListener('keydown', e=>{ if(e.key==='Enter') iniciarSesion(); });
  $('reg-pass')?.addEventListener('keydown',   e=>{ if(e.key==='Enter') crearCuenta(); });

  // Sesión guardada
  try{
    const s = JSON.parse(localStorage.getItem('vq_sesion')||'null');
    if(s) mostrarDashboard(s);
  } catch(err){}
});

/* Utilidad de reset (consola) */
function resetSesion(){ try{localStorage.removeItem('vq_sesion');}catch(e){} location.reload(); }
