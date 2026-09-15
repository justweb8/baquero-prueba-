'use strict';

/* ── NEUTRALIZAR SCRIPTS INLINE DEL HTML ORIGINAL ── */
window.chartsInit   = true;
window.initCharts   = function(){};
window.renderCalendario = function(){
  if(typeof calInicializar==='function') calInicializar();
};

/* ── SUPABASE CONFIG ── */
const SB_URL = 'https://tajgjweqvuinfeqzbthw.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhamdqd2VxdnVpbmZlcXpidGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ3NjUsImV4cCI6MjA4ODI5MDc2NX0.mMneyeaMg0aDa-gfA5k6mEe5I3f_khdf6-2Q28GaDQs';
let SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
let SESSION = null;

/* ── Helper: asegurar rancho_id en sesión ── */
async function _asegurarRanchoId(){
  if(SESSION?.rancho_id) return SESSION.rancho_id;
  if(!SESSION?.user_id) return null;
  try{
    const r=await fetch(`${SB_URL}/rest/v1/ranchos?user_id=eq.${SESSION.user_id}&select=id&limit=1`,{headers:SB_HEADERS});
    const d=await r.json();
    if(Array.isArray(d)&&d[0]){
      SESSION.rancho_id=d[0].id;
      try{localStorage.setItem('vq_sesion',JSON.stringify(SESSION));}catch(e){}
      console.log('[Session] rancho_id recuperado:', SESSION.rancho_id);
      return SESSION.rancho_id;
    }
  }catch(e){ console.warn('[Session] No se pudo obtener rancho_id:', e.message); }
  return null;
}

/* ── Utilidades ── */
function $(id){ return document.getElementById(id); }
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

/* ── Campos ── */
function setErr(id,show){ const i=$(id),e=$('err-'+id); if(i)i.classList.toggle('err',show); if(e)e.classList.toggle('vis',show); }
function clearErr(id){ setErr(id,false); }

/* ── Toggle password ── */
function togglePass(inputId,iconEl){
  const inp=$(inputId);
  inp.type = inp.type==='password' ? 'text' : 'password';
  iconEl.innerHTML = inp.type==='text'
    ? `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`
    : `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
}

/* ── Tabs login ── */
function cambiarTab(tab){
  const esLogin = tab==='login';
  const tL=$('tab-login'),   tR=$('tab-registro');
  const fL=$('form-login'),  fR=$('form-registro');
  const aL=$('al-login'),    aR=$('al-reg');
  if(tL) tL.classList.toggle('activo',esLogin);
  if(tR) tR.classList.toggle('activo',!esLogin);
  if(fL) fL.style.display = esLogin ? 'block' : 'none';
  if(fR) fR.style.display = esLogin ? 'none'  : 'block';
  if(aL) aL.classList.remove('vis');
  if(aR) aR.classList.remove('vis');
}

/* ── INICIAR SESIÓN ── */
async function iniciarSesion(){
  const emailEl = $('email-login'); const passEl = $('pass-login');
  const email = emailEl?.value.trim()||'';
  const pass  = passEl?.value||'';
  $('al-login')?.classList.remove('vis');
  let ok=true;
  if(!validarEmail(email)){ setErr('email-login',true); ok=false; }
  if(!pass){ setErr('pass-login',true); ok=false; }
  if(!ok) return;
  const btn=$('btn-ingresar');
  btn.classList.add('cargando');
  try{
    /* 1. Auth Supabase */
    const authRes = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`,{
      method:'POST',
      headers:{'apikey':SB_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password:pass})
    });
    const authData = await authRes.json();
    if(!authRes.ok){
      const msg = authData.error_description||authData.error||'';
      if(msg.includes('Invalid login')) throw new Error('Correo o contraseña incorrectos.');
      if(msg.includes('Email not confirmed')) throw new Error('Confirma tu correo antes de ingresar.');
      throw new Error(msg||'Error al iniciar sesión.');
    }
    const token  = authData.access_token;
    const userId = authData.user?.id;
    SB_HEADERS['Authorization'] = 'Bearer ' + token;

    /* 2. Buscar rancho — filtrando por user_id */
    let perfil = {}, rancho = {}, sus = {};
    try{
      const rRes = await fetch(
        `${SB_URL}/rest/v1/ranchos?user_id=eq.${userId}&select=*&limit=1`,
        {headers:SB_HEADERS}
      );
      const rData = await rRes.json();
      rancho = Array.isArray(rData) ? (rData[0]||{}) : {};
      console.log('[Ranchos]', rData, 'rancho_id:', rancho.id);
    }catch(e){ console.warn('[Ranchos]', e); }

    /* 3. Buscar perfil */
    try{
      const pRes = await fetch(
        `${SB_URL}/rest/v1/perfiles?id=eq.${userId}&select=*&limit=1`,
        {headers:SB_HEADERS}
      );
      const pData = await pRes.json();
      perfil = Array.isArray(pData) ? (pData[0]||{}) : {};
    }catch(e){ console.warn('[Perfiles]', e); }

    /* 4. Suscripción */
    try{
      const sRes = await fetch(
        `${SB_URL}/rest/v1/suscripciones?user_id=eq.${userId}&select=*&limit=1`,
        {headers:SB_HEADERS}
      );
      const sData = await sRes.json();
      sus = Array.isArray(sData) ? (sData[0]||{}) : {};
    }catch(e){ console.warn('[Suscripciones]', e); }

    /* 5. Construir sesión */
    SESSION = {
      user_id:   userId,
      email:     authData.user?.email || email,
      token,
      nombre:    perfil.nombre         || email.split('@')[0],
      rancho:    perfil.rancho_nombre  || rancho.nombre || 'Mi Rancho',
      rancho_id: rancho.id             || null,
      plan:      sus.plan              || rancho.plan || 'free',
      limite:    sus.limite_animales   || 50,
    };
    console.log('[SESSION]', SESSION);
    try{ localStorage.setItem('vq_sesion', JSON.stringify(SESSION)); }catch(err){}
    mostrarDashboard(SESSION);

  }catch(e){
    $('al-login-msg').textContent = e.message||'Correo o contraseña incorrectos.';
    $('al-login').classList.add('vis');
  }finally{ btn.classList.remove('cargando'); }
}

/* ── CREAR CUENTA ── */
async function crearCuenta(){
  const nombre=$('reg-nombre').value.trim(), rancho=$('reg-rancho').value.trim(),
        email=$('reg-email').value.trim(), pass=$('reg-pass').value;
  $('al-reg').classList.remove('vis');
  let ok=true;
  if(!nombre){setErr('reg-nombre',true);ok=false;}
  if(!rancho){setErr('reg-rancho',true);ok=false;}
  if(!validarEmail(email)){setErr('reg-email',true);ok=false;}
  if(pass.length<8){setErr('reg-pass',true);ok=false;}
  if(!ok) return;
  const btn=$('btn-registro');
  btn.classList.add('cargando');
  try{
    await esperar(1600);
    toast('Cuenta creada. Revisa tu correo.');
    cambiarTab('login');
  }catch(e){
    $('al-reg-msg').textContent=e.message||'Error al crear la cuenta.';
    $('al-reg').classList.add('vis');
  }finally{ btn.classList.remove('cargando'); }
}

/* ── RECUPERAR ── */
function recuperar(e){
  e.preventDefault();
  const email=$('email-login').value.trim();
  if(!validarEmail(email)){ setErr('email-login',true); return; }
  toast('Enlace enviado a '+email);
}

/* ── MOSTRAR DASHBOARD ── */
function mostrarDashboard(sesion){
  SESSION = sesion;
  if(sesion.token) SB_HEADERS['Authorization'] = 'Bearer ' + sesion.token;
  $('pantalla-login')?.classList.add('oculto');
  const dash=$('pantalla-dash');
  if(dash) dash.classList.add('visible');
  document.body.style.overflow='hidden';
  const nombre=sesion.nombre||sesion.email||'Usuario';
  const rancho=sesion.rancho||'Mi Rancho';
  const inicial=nombre.charAt(0).toUpperCase();
  if($('d-nombre'))   $('d-nombre').textContent=nombre;
  if($('d-rancho'))   $('d-rancho').textContent=rancho;
  if($('d-username')) $('d-username').textContent=nombre;
  if($('d-avatar'))   $('d-avatar').textContent=inicial;
  if($('mob-avatar')) $('mob-avatar').textContent=inicial;
  try{ localStorage.setItem('vq_sesion',JSON.stringify(sesion)); }catch(err){}
}

/* ── CERRAR SESIÓN ── */
async function cerrarSesion(){
  try{ await fetch(`${SB_URL}/auth/v1/logout`,{method:'POST',headers:SB_HEADERS}); }catch(e){}
  SESSION = null;
  SB_HEADERS['Authorization'] = 'Bearer ' + SB_KEY;
  try{ localStorage.removeItem('vq_sesion'); }catch(err){}
  $('pantalla-dash')?.classList.remove('visible');
  $('pantalla-login')?.classList.remove('oculto');
  document.body.style.overflow='';
  if($('email-login'))$('email-login').value='';
  if($('pass-login')) $('pass-login').value='';
  DB_ANIMALES = [];
  cerrarSeccion();
  cambiarTab('login');
}

/* ── SECCIONES — sistema de navegación ── */
let seccionActual = null;

function cerrarSeccion(){
  if(seccionActual){
    seccionActual.classList.remove('visible');
    seccionActual = null;
  }
  // Mostrar contenido dashboard
  const banner = document.querySelector('.d-banner');
  const scroll = document.querySelector('.d-scroll');
  if(banner) banner.style.display='';
  if(scroll) scroll.style.display='';
}

function abrirSeccion(idSec){
  cerrarSeccion();
  const banner = document.querySelector('.d-banner');
  const scroll  = document.querySelector('.d-scroll');
  if(banner) banner.style.display='none';
  if(scroll)  scroll.style.display='none';
  const sec = $(idSec);
  if(sec){
    sec.style.display='flex';
    sec.style.flexDirection='column';
    sec.style.flex='1';
    sec.style.overflowY='auto';
    sec.style.overflowX='hidden';
    sec.classList.add('visible');
    seccionActual = sec;
    sec.scrollTop = 0;
  }
}

function cerrarSeccion(){
  if(seccionActual){
    seccionActual.style.display='none';
    seccionActual.classList.remove('visible');
    seccionActual = null;
  }
  const banner = document.querySelector('.d-banner');
  const scroll = document.querySelector('.d-scroll');
  if(banner) banner.style.display='';
  if(scroll) scroll.style.display='';
}

/* ── NAVEGACIÓN SIDEBAR ── */
function navegar(seccion, el){
  // Marcar activo en sidebar
  document.querySelectorAll('.d-item').forEach(i=>i.classList.remove('on'));
  if(el) el.classList.add('on');
  // Marcar en mob-nav
  document.querySelectorAll('.mob-nav-item').forEach(i=>i.classList.remove('on'));

  switch(seccion){
    case 'inicio':
      cerrarSeccion();
      break;
    case 'animales':
      if(window.innerWidth <= 600){
        const mob = document.getElementById('mob-animales');
        if(mob){ mob.style.display='block'; document.body.style.overflow='hidden'; }
      } else {
        abrirSeccion('sec-animales');
      }
      cargarAnimales();
      break;
    case 'salud':
      abrirSeccion('sec-salud');
      cargarSalud();
      break;
    case 'inseminacion':
      abrirSeccion('sec-insem');
      cargarInsem();
      break;
    case 'partos':
      abrirSeccion('sec-partos');
      cargarPartos();
      break;
    case 'calendario':
      abrirSeccion('sec-calendario');
      setTimeout(()=>{ calInicializar(); }, 100);
      break;
    case 'alertas':
      abrirSeccion('sec-alertas');
      renderAlertas();
      break;
    case 'reportes':
      abrirSeccion('sec-reportes');
      renderReportes();
      break;
    case 'historial':
      abrirSeccion('sec-historial');
      cargarHistorial();
      break;
    case 'gastos':
      abrirSeccion('sec-gastos');
      cargarGastos();
      break;
    case 'inventario':
      abrirSeccion('sec-inventario');
      cargarInventario();
      break;
    case 'proveedores':
      abrirSeccion('sec-proveedores');
      cargarProveedores();
      break;
    case 'finanzas':
      abrirSeccion('sec-finanzas');
      break;
    case 'banco-genetico':
      abrirSeccion('sec-banco');
      cargarBanco();
      break;
    case 'soporte':
      abrirSeccion('sec-soporte');
      break;
    case 'exportar':
      inyectarExportar();
      abrirSeccion('sec-exportar');
      break;
    case 'importar':
      inyectarImportar();
      abrirSeccion('sec-importar');
      break;
    case 'documentos':
      inyectarDocumentos();
      abrirSeccion('sec-documentos');
      break;
    case 'perfil':
      abrirSeccion('sec-perfil');
      cargarPerfil();
      break;
    case 'suscripcion':
      abrirSeccion('sec-suscripcion');
      cargarSuscripcion();
      break;
    default:
      cerrarSeccion();
      toast('Módulo '+seccion+' — próximamente');
  }
}

/* ── TABS ANIMALES ── */
function filtrarTab(el){
  document.querySelectorAll('.an-tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', async ()=>{
  /* Limpiar datos maqueta del HTML original */
  const limpiarTbody = (id, cols) => {
    const el = document.getElementById(id);
    if(el) el.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>`;
  };
  limpiarTbody('an-tbody', 12);
  limpiarTbody('sv-tbody', 8);
  limpiarTbody('in-tbody', 9);
  limpiarTbody('pt-tbody', 11);
  /* Limpiar alertas maqueta */
  const altLista = document.getElementById('alt-lista') || document.querySelector('.alt-lista');
  if(altLista) altLista.innerHTML = '<div style="text-align:center;padding:40px;color:#8FA3BF;">⏳ Cargando alertas...</div>';
  /* Limpiar stats maqueta — poner 0 */
  ['an-stat-total','an-stat-activos','an-stat-trat','an-stat-muertos',
   'an-tab-total','an-tab-activos','an-tab-gestantes','an-tab-trat','an-tab-vendidos','an-tab-muertos',
   'sv-stat-total','sv-stat-aplicadas','sv-stat-proximas','sv-stat-vencidas',
   'sv-tab-cnt-0','sv-tab-cnt-1','sv-tab-cnt-2',
   'pt-stat-total','pt-stat-hembras','pt-stat-machos','pt-stat-anyo',
   'rep-s-total','rep-s-gest','rep-s-partos','rep-s-insem','rep-s-vac','rep-s-bajas',
   'alt-cnt-todas','alt-cnt-vacunas','alt-cnt-partos','alt-cnt-reprod',
  ].forEach(id=>{ const el=document.getElementById(id); if(el) el.textContent='0'; });
  cambiarTab('login');
  [['email-login'],['pass-login'],['reg-nombre'],['reg-rancho'],['reg-email'],['reg-pass']]
    .forEach(([id])=>{ const el=$(id); if(el) el.addEventListener('input',()=>clearErr(id)); });
  $('pass-login')?.addEventListener('keydown',e=>{ if(e.key==='Enter') iniciarSesion(); });
  $('reg-pass')?.addEventListener('keydown',  e=>{ if(e.key==='Enter') crearCuenta(); });
  /* Restaurar sesión si el token sigue válido */
  try{
    const s = JSON.parse(localStorage.getItem('vq_sesion')||'null');
    if(s && s.token){
      const check = await fetch(`${SB_URL}/auth/v1/user`,{
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+s.token}
      });
      if(check.ok){
        SB_HEADERS['Authorization'] = 'Bearer ' + s.token;
        SESSION = s;
        mostrarDashboard(s);
      } else {
        localStorage.removeItem('vq_sesion');
      }
    }
  }catch(err){}
});

function resetSesion(){ try{localStorage.removeItem('vq_sesion');}catch(e){} location.reload(); }

/* ── CERRAR PANTALLA MÓVIL ANIMALES ── */
function cerrarMobAnimales(){
  const mob = document.getElementById('mob-animales');
  if(mob) mob.style.display = 'none';
  // Marcar Inicio activo en mob-nav
  document.querySelectorAll('.mob-nav-item').forEach(i=>i.classList.remove('on'));
  const inicio = document.querySelector('.mob-nav-item[onclick*="inicio"]');
  if(inicio) inicio.classList.add('on');
}


/* ── SEC-DOCUMENTOS INJECTION ── */
function inyectarDocumentos(){
  if(document.getElementById('sec-documentos')) return;
  var tmp=document.createElement('div');
  tmp.innerHTML="<!-- \u2550\u2550 #sec-documentos \u2014 DOCUMENTOS \u2550\u2550 -->\n    <div id=\"sec-documentos\" style=\"display:none;flex-direction:column;overflow-y:auto;overflow-x:hidden;flex:1;\">\n    <style>\n    /* \u2550\u2550 DOCUMENTOS CSS \u2550\u2550 */\n    .dc-wrap{display:flex;flex-direction:column;gap:0;min-height:100%;}\n    .dc-hdr{display:flex;align-items:center;gap:14px;padding:20px 28px 16px;border-bottom:1px solid #e8edf5;background:#fff;flex-shrink:0;}\n    .dc-hdr-ico{width:48px;height:48px;border-radius:12px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .dc-hdr-ico svg{width:24px;height:24px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .dc-hdr-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;color:#0D2B6B;}\n    .dc-hdr-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .dc-body{display:flex;flex-direction:column;gap:16px;padding:20px 28px 28px;}\n    /* GENERAR */\n    .dc-gen-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .dc-gen-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}\n    .dc-gen-left{display:flex;align-items:center;gap:10px;}\n    .dc-gen-ico{width:40px;height:40px;border-radius:10px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .dc-gen-ico svg{width:20px;height:20px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .dc-gen-title{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;}\n    .dc-gen-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .dc-ver-plantillas{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:#2E7DD6;font-family:'Open Sans',sans-serif;font-weight:600;cursor:pointer;text-decoration:none;}\n    .dc-ver-plantillas svg{width:14px;height:14px;stroke:#2E7DD6;fill:none;stroke-width:2;}\n    .dc-tipos{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}\n    .dc-tipo{background:#fff;border:1.5px solid #e8edf5;border-radius:12px;padding:18px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .15s;position:relative;}\n    .dc-tipo:hover{border-color:#2E7DD6;box-shadow:0 4px 16px rgba(46,125,214,.12);}\n    .dc-tipo-ico{width:52px;height:52px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .dc-tipo-ico svg{width:26px;height:26px;fill:none;stroke-width:1.8;}\n    .dc-tipo-body{flex:1;min-width:0;}\n    .dc-tipo-name{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;margin-bottom:4px;}\n    .dc-tipo-desc{font-size:11px;color:#7a8aa0;font-family:'Open Sans',sans-serif;line-height:1.5;}\n    .dc-tipo-arr{flex-shrink:0;width:28px;height:28px;border-radius:50%;background:#e8f0fc;display:flex;align-items:center;justify-content:center;}\n    .dc-tipo-arr svg{width:14px;height:14px;stroke:#2E7DD6;fill:none;stroke-width:2;}\n    /* HISTORIAL */\n    .dc-hist-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .dc-hist-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px;}\n    .dc-hist-left{display:flex;align-items:center;gap:10px;}\n    .dc-hist-title{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;}\n    .dc-hist-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .dc-hist-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}\n    .dc-search{display:flex;align-items:center;gap:7px;background:#f8fafc;border:1.5px solid #dde3ec;border-radius:8px;padding:8px 12px;}\n    .dc-search svg{width:14px;height:14px;stroke:#9eaaba;fill:none;flex-shrink:0;}\n    .dc-search input{border:none;outline:none;font-size:13px;color:#0D2B6B;background:transparent;width:160px;font-family:'Open Sans',sans-serif;}\n    .dc-sel{background:#f8fafc;border:1.5px solid #dde3ec;border-radius:8px;padding:8px 12px;font-size:13px;color:#0D2B6B;outline:none;cursor:pointer;font-family:'Open Sans',sans-serif;}\n    .dc-btn-limpiar{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid #dde3ec;border-radius:8px;padding:8px 14px;font-size:13px;color:#4a5568;cursor:pointer;font-family:'Montserrat',sans-serif;font-weight:600;transition:all .14s;}\n    .dc-btn-limpiar:hover{border-color:#e53e3e;color:#e53e3e;}\n    .dc-btn-limpiar svg{width:14px;height:14px;stroke:currentColor;fill:none;}\n    /* TABLA */\n    .dc-tbl-wrap{overflow:auto;border-radius:10px;border:1px solid #f0f4fa;}\n    .dc-tbl{width:100%;border-collapse:collapse;font-family:'Open Sans',sans-serif;font-size:13px;min-width:600px;}\n    .dc-tbl th{background:#f5f8ff;color:#7a8aa0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;padding:11px 14px;text-align:left;border-bottom:1px solid #e8edf5;font-family:'Montserrat',sans-serif;}\n    .dc-tbl td{padding:13px 14px;color:#4a5568;border-bottom:1px solid #f5f8ff;vertical-align:middle;}\n    .dc-tbl tr:last-child td{border-bottom:none;}\n    .dc-tbl tr:hover td{background:#fafcff;}\n    .dc-badge-vet{background:#e8f5e9;color:#1b8e4e;border-radius:20px;font-size:11px;font-weight:600;padding:3px 9px;}\n    .dc-badge-rem{background:#e8f0fc;color:#2E7DD6;border-radius:20px;font-size:11px;font-weight:600;padding:3px 9px;}\n    .dc-badge-san{background:#fff3e0;color:#e07b00;border-radius:20px;font-size:11px;font-weight:600;padding:3px 9px;}\n    .dc-badge-gen{background:#f0e8fc;color:#8b5cf6;border-radius:20px;font-size:11px;font-weight:600;padding:3px 9px;}\n    .dc-estado-ok{display:inline-flex;align-items:center;gap:5px;color:#1b8e4e;font-weight:600;font-size:12px;}\n    .dc-estado-ok::before{content:\"\u25cf\";font-size:8px;}\n    .dc-estado-pen{display:inline-flex;align-items:center;gap:5px;color:#e07b00;font-weight:600;font-size:12px;}\n    .dc-estado-pen::before{content:\"\u25cf\";font-size:8px;}\n    .dc-tbl-btns{display:flex;gap:6px;}\n    .dc-tbl-btn{width:30px;height:30px;border-radius:7px;border:1.5px solid #dde3ec;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .14s;}\n    .dc-tbl-btn svg{width:14px;height:14px;stroke:#7a8aa0;fill:none;stroke-width:1.8;}\n    .dc-tbl-btn:hover{border-color:#2E7DD6;background:#e8f0fc;}\n    .dc-tbl-btn:hover svg{stroke:#2E7DD6;}\n    .dc-tbl-btn.del:hover{border-color:#e53e3e;background:#fce8e8;}\n    .dc-tbl-btn.del:hover svg{stroke:#e53e3e;}\n    /* EMPTY STATE */\n    .dc-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:50px 20px;gap:12px;}\n    .dc-empty-ico{width:80px;height:80px;opacity:.6;}\n    .dc-empty-ico svg{width:80px;height:80px;stroke:#2E7DD6;fill:none;stroke-width:1;}\n    .dc-empty-title{font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#0D2B6B;}\n    .dc-empty-sub{font-size:13px;color:#7a8aa0;font-family:'Open Sans',sans-serif;text-align:center;max-width:300px;line-height:1.5;}\n    /* AYUDA */\n    .dc-help-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .dc-help-left{display:flex;align-items:center;gap:14px;}\n    .dc-help-ico{width:44px;height:44px;border-radius:50%;background:#2E7DD6;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .dc-help-ico svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2;}\n    .dc-help-title{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;}\n    .dc-help-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .dc-btn-guia{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #2E7DD6;color:#2E7DD6;border-radius:9px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;}\n    .dc-btn-guia:hover{background:#2E7DD6;color:#fff;}\n    .dc-btn-guia svg{width:14px;height:14px;stroke:currentColor;fill:none;}\n    /* RESPONSIVE */\n    @media(max-width:1024px){.dc-tipos{grid-template-columns:repeat(2,1fr);}}\n    @media(max-width:768px){\n      .dc-hdr{padding:14px 16px 12px;}\n      .dc-body{padding:14px 16px 20px;gap:12px;}\n      .dc-tipos{grid-template-columns:1fr;}\n      .dc-hist-tools{width:100%;}\n      .dc-search{flex:1;}\n      .dc-search input{width:100%;}\n    }\n    @media(max-width:540px){\n      .dc-hdr-title{font-size:17px;}\n      .dc-gen-card,.dc-hist-card,.dc-help-card{padding:14px 14px;}\n      .dc-tipo{padding:14px 12px;}\n      .dc-help-card{flex-direction:column;align-items:flex-start;}\n    }\n    </style>\n\n    <div class=\"dc-wrap\">\n      <!-- HEADER -->\n      <div class=\"dc-hdr\">\n        <div class=\"dc-hdr-ico\">\n          <svg viewBox=\"0 0 24 24\"><path d=\"M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z\"/></svg>\n        </div>\n        <div>\n          <div class=\"dc-hdr-title\">Documentos</div>\n          <div class=\"dc-hdr-sub\">Genera y gestiona los documentos de tu ganader&#xED;a.</div>\n        </div>\n      </div>\n\n      <div class=\"dc-body\">\n        <!-- GENERAR NUEVO DOCUMENTO -->\n        <div class=\"dc-gen-card\">\n          <div class=\"dc-gen-head\">\n            <div class=\"dc-gen-left\">\n              <div class=\"dc-gen-ico\"><svg viewBox=\"0 0 24 24\"><path d=\"M12 4v16m8-8H4\"/></svg></div>\n              <div>\n                <div class=\"dc-gen-title\">Generar nuevo documento</div>\n                <div class=\"dc-gen-sub\">Selecciona el tipo de documento que necesitas emitir.</div>\n              </div>\n            </div>\n            <a class=\"dc-ver-plantillas\">\n              <svg viewBox=\"0 0 24 24\"><path d=\"M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z\"/></svg>\n              Ver plantillas\n            </a>\n          </div>\n          <div class=\"dc-tipos\">\n            <!-- Ficha Veterinaria -->\n            <div class=\"dc-tipo\" onclick=\"dcSelTipo(this,'Ficha Veterinaria')\">\n              <div class=\"dc-tipo-ico\" style=\"background:#e8f5e9;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#22a96a\"><path d=\"M10 3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5h2.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H16v10a2 2 0 01-2 2H10a2 2 0 01-2-2V8H6.5A.5.5 0 016 7.5v-2A.5.5 0 016.5 5H9V3.5z\"/></svg>\n              </div>\n              <div class=\"dc-tipo-body\">\n                <div class=\"dc-tipo-name\">Ficha Veterinaria</div>\n                <div class=\"dc-tipo-desc\">Registro de tratamientos y controles de salud.</div>\n              </div>\n              <div class=\"dc-tipo-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n            </div>\n            <!-- Gu\u00eda de Remisi\u00f3n -->\n            <div class=\"dc-tipo\" onclick=\"dcSelTipo(this,'Gu\u00eda de Remisi\u00f3n')\">\n              <div class=\"dc-tipo-ico\" style=\"background:#e8f0fc;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#2E7DD6\"><path d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\"/></svg>\n              </div>\n              <div class=\"dc-tipo-body\">\n                <div class=\"dc-tipo-name\">Gu&#xED;a de Remisi&#xF3;n</div>\n                <div class=\"dc-tipo-desc\">Traslado de animales y productos.</div>\n              </div>\n              <div class=\"dc-tipo-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n            </div>\n            <!-- Certificado Sanitario -->\n            <div class=\"dc-tipo\" onclick=\"dcSelTipo(this,'Certificado Sanitario')\">\n              <div class=\"dc-tipo-ico\" style=\"background:#fff3e0;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#F0A500\"><path d=\"M12 15l-2 5L9 9l11 4-5 2zm0 0l5-5\"/><circle cx=\"12\" cy=\"15\" r=\"0\"/><path d=\"M9 9l3 6\"/></svg>\n              </div>\n              <div class=\"dc-tipo-body\">\n                <div class=\"dc-tipo-name\">Certificado Sanitario</div>\n                <div class=\"dc-tipo-desc\">Documento oficial de estado sanitario.</div>\n              </div>\n              <div class=\"dc-tipo-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n            </div>\n          </div>\n        </div>\n\n        <!-- HISTORIAL DE DOCUMENTOS -->\n        <div class=\"dc-hist-card\">\n          <div class=\"dc-hist-head\">\n            <div class=\"dc-hist-left\">\n              <div class=\"dc-gen-ico\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\"/></svg></div>\n              <div>\n                <div class=\"dc-hist-title\">Historial de Documentos Emitidos</div>\n                <div class=\"dc-gen-sub\">Todos los documentos generados en tu sistema.</div>\n              </div>\n            </div>\n            <div class=\"dc-hist-tools\">\n              <div class=\"dc-search\">\n                <svg viewBox=\"0 0 24 24\"><circle cx=\"11\" cy=\"11\" r=\"8\"/><path d=\"M21 21l-4.35-4.35\"/></svg>\n                <input type=\"text\" placeholder=\"Buscar documento...\" oninput=\"dcBuscar(this.value)\">\n              </div>\n              <select class=\"dc-sel\" id=\"dc-filtro-tipo\" onchange=\"dcFiltrar()\">\n                <option value=\"\">Todos los tipos</option>\n                <option>Ficha Veterinaria</option>\n                <option>Gu&#xED;a de Remisi&#xF3;n</option>\n                <option>Certificado Sanitario</option>\n              </select>\n              <button class=\"dc-btn-limpiar\" onclick=\"dcLimpiar()\">\n                <svg viewBox=\"0 0 24 24\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6\"/></svg>\n                Limpiar\n              </button>\n            </div>\n          </div>\n\n          <!-- Tabla -->\n          <div class=\"dc-tbl-wrap\" id=\"dc-tbl-wrap\">\n            <table class=\"dc-tbl\" id=\"dc-tbl\">\n              <thead>\n                <tr>\n                  <th>#</th>\n                  <th>Nombre del documento</th>\n                  <th>Tipo</th>\n                  <th>Fecha de emisi&#xF3;n</th>\n                  <th>Estado</th>\n                  <th>Acciones</th>\n                </tr>\n              </thead>\n              <tbody id=\"dc-tbody\">\n                <!-- Datos de ejemplo -->\n                <tr>\n                  <td>001</td>\n                  <td>Ficha Veterinaria \u2014 Vaca #A-023</td>\n                  <td><span class=\"dc-badge-vet\">Ficha Veterinaria</span></td>\n                  <td>12/03/2025</td>\n                  <td><span class=\"dc-estado-ok\">Emitido</span></td>\n                  <td><div class=\"dc-tbl-btns\">\n                    <button class=\"dc-tbl-btn\" title=\"Ver\"><svg viewBox=\"0 0 24 24\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn\" title=\"Descargar\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn del\" title=\"Eliminar\"><svg viewBox=\"0 0 24 24\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6\"/></svg></button>\n                  </div></td>\n                </tr>\n                <tr>\n                  <td>002</td>\n                  <td>Gu&#xED;a de Remisi&#xF3;n \u2014 Lote #B-07</td>\n                  <td><span class=\"dc-badge-rem\">Gu&#xED;a de Remisi&#xF3;n</span></td>\n                  <td>18/04/2025</td>\n                  <td><span class=\"dc-estado-ok\">Emitido</span></td>\n                  <td><div class=\"dc-tbl-btns\">\n                    <button class=\"dc-tbl-btn\" title=\"Ver\"><svg viewBox=\"0 0 24 24\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn\" title=\"Descargar\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn del\" title=\"Eliminar\"><svg viewBox=\"0 0 24 24\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6\"/></svg></button>\n                  </div></td>\n                </tr>\n                <tr>\n                  <td>003</td>\n                  <td>Certificado Sanitario \u2014 Finca Norte</td>\n                  <td><span class=\"dc-badge-san\">Certificado Sanitario</span></td>\n                  <td>05/05/2025</td>\n                  <td><span class=\"dc-estado-pen\">Pendiente</span></td>\n                  <td><div class=\"dc-tbl-btns\">\n                    <button class=\"dc-tbl-btn\" title=\"Ver\"><svg viewBox=\"0 0 24 24\"><path d=\"M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn\" title=\"Descargar\"><svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg></button>\n                    <button class=\"dc-tbl-btn del\" title=\"Eliminar\"><svg viewBox=\"0 0 24 24\"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6\"/></svg></button>\n                  </div></td>\n                </tr>\n              </tbody>\n            </table>\n          </div>\n\n          <!-- Empty state (hidden when hay datos) -->\n          <div class=\"dc-empty\" id=\"dc-empty\" style=\"display:none;\">\n            <div class=\"dc-empty-ico\">\n              <svg viewBox=\"0 0 24 24\"><path d=\"M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z\"/><path d=\"M9 13h6M9 17h4\" stroke-linecap=\"round\"/></svg>\n            </div>\n            <div class=\"dc-empty-title\">A&#xFA;n no se han generado documentos</div>\n            <div class=\"dc-empty-sub\">Selecciona un tipo de documento en la parte superior para comenzar.</div>\n          </div>\n        </div>\n\n        <!-- AYUDA -->\n        <div class=\"dc-help-card\">\n          <div class=\"dc-help-left\">\n            <div class=\"dc-help-ico\">\n              <svg viewBox=\"0 0 24 24\"><path d=\"M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>\n            </div>\n            <div>\n              <div class=\"dc-help-title\">&#xBF;Necesitas ayuda?</div>\n              <div class=\"dc-help-sub\">Consulta nuestras gu&#xED;as o contacta al soporte si tienes dudas sobre la generaci&#xF3;n de documentos.</div>\n            </div>\n          </div>\n          <button class=\"dc-btn-guia\" onclick=\"navegar('soporte',null)\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14\"/></svg>\n            Ver gu&#xED;as y tutoriales\n          </button>\n        </div>\n\n      </div><!-- /dc-body -->\n    </div><!-- /dc-wrap -->\n\n    <script>\n    function dcSelTipo(el, tipo){\n      document.querySelectorAll('.dc-tipo').forEach(function(t){ t.style.borderColor=''; t.style.background=''; });\n      el.style.borderColor='#2E7DD6';\n      el.style.background='#f0f7ff';\n      if(typeof toast==='function') toast('Generando: ' + tipo + '...');\n    }\n    function dcBuscar(q){\n      q = q.toLowerCase();\n      document.querySelectorAll('#dc-tbody tr').forEach(function(tr){\n        tr.style.display = (!q || tr.textContent.toLowerCase().includes(q)) ? '' : 'none';\n      });\n    }\n    function dcFiltrar(){\n      var tipo = document.getElementById('dc-filtro-tipo').value.toLowerCase();\n      document.querySelectorAll('#dc-tbody tr').forEach(function(tr){\n        tr.style.display = (!tipo || tr.textContent.toLowerCase().includes(tipo)) ? '' : 'none';\n      });\n    }\n    function dcLimpiar(){\n      document.getElementById('dc-filtro-tipo').value = '';\n      document.querySelectorAll('#dc-tbody tr').forEach(function(tr){ tr.style.display=''; });\n    }\n    <\\/script>\n    </div><!-- /sec-documentos -->";
  var sec=tmp.firstElementChild;
  document.querySelector('main.d-main').appendChild(sec);
}




function inyectarExportar(){
  if(document.getElementById('sec-exportar')) return;
  var tmp=document.createElement('div');
  tmp.innerHTML="<!-- \u2550\u2550 #sec-exportar \u2014 EXPORTAR DATOS \u2550\u2550 -->\n    <div id=\"sec-exportar\" style=\"display:none;flex-direction:column;overflow-y:auto;overflow-x:hidden;flex:1;\">\n    <style>\n    /* \u2550\u2550 EXPORTAR DATOS CSS \u2550\u2550 */\n    .ex-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 16px;border-bottom:1px solid #e8edf5;background:#fff;flex-shrink:0;}\n    .ex-hdr-left{display:flex;align-items:center;gap:14px;}\n    .ex-hdr-ico{width:48px;height:48px;border-radius:12px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .ex-hdr-ico svg{width:24px;height:24px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .ex-hdr-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;color:#0D2B6B;}\n    .ex-hdr-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .ex-btn-ayuda{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #dde3ec;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;color:#4a5568;cursor:pointer;font-family:'Montserrat',sans-serif;}\n    .ex-btn-ayuda svg{width:16px;height:16px;stroke:#2E7DD6;fill:none;}\n    .ex-body{display:flex;flex-direction:column;gap:16px;padding:20px 28px 28px;}\n    /* EXPORTACION COMPLETA */\n    .ex-completa-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .ex-completa-inner{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;}\n    .ex-completa-left{display:flex;align-items:center;gap:14px;}\n    .ex-completa-ico{width:48px;height:48px;border-radius:12px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .ex-completa-ico svg{width:24px;height:24px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .ex-completa-title{font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;margin-bottom:4px;}\n    .ex-completa-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;}\n    .ex-btn-completa{display:inline-flex;align-items:center;gap:8px;background:#2E7DD6;color:#fff;border:none;border-radius:9px;padding:11px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;transition:background .15s;white-space:nowrap;}\n    .ex-btn-completa:hover{background:#1a5fb4;}\n    .ex-btn-completa svg{width:16px;height:16px;stroke:#fff;fill:none;}\n    .ex-completa-note{font-size:11px;color:#9eaaba;font-family:'Open Sans',sans-serif;margin-top:4px;text-align:right;}\n    /* STATS */\n    .ex-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}\n    .ex-stat{background:#fff;border-radius:13px;border:1px solid #e8edf5;padding:16px 18px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .15s;box-shadow:0 2px 6px rgba(13,43,107,.04);}\n    .ex-stat:hover{border-color:#2E7DD6;box-shadow:0 4px 16px rgba(46,125,214,.12);}\n    .ex-stat-ico{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .ex-stat-ico svg{width:26px;height:26px;fill:none;stroke-width:1.8;}\n    .ex-stat-num{font-family:'Montserrat',sans-serif;font-size:24px;font-weight:700;color:#0D2B6B;line-height:1;}\n    .ex-stat-lbl{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:3px;}\n    .ex-stat-arr{margin-left:auto;color:#c0cede;}\n    .ex-stat-arr svg{width:16px;height:16px;stroke:currentColor;fill:none;}\n    /* MODULOS */\n    .ex-mods-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .ex-mods-title{display:flex;align-items:center;gap:10px;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;margin-bottom:6px;}\n    .ex-mods-title svg{width:20px;height:20px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .ex-mods-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-bottom:18px;}\n    .ex-mods-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;}\n    .ex-mod{background:#f8fafc;border-radius:12px;border:1px solid #e8edf5;padding:18px 16px;display:flex;flex-direction:column;gap:12px;}\n    .ex-mod-head{display:flex;align-items:center;gap:10px;}\n    .ex-mod-ico{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .ex-mod-ico svg{width:22px;height:22px;fill:none;stroke-width:1.8;}\n    .ex-mod-name{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;}\n    .ex-mod-desc{font-size:11px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .ex-mod-fields{display:flex;flex-direction:column;gap:5px;}\n    .ex-mod-field{display:flex;align-items:center;gap:6px;font-size:12px;color:#4a5568;font-family:'Open Sans',sans-serif;}\n    .ex-mod-field::before{content:\"\u2713\";color:#22a96a;font-weight:700;font-size:12px;flex-shrink:0;}\n    .ex-btn-mod{display:flex;align-items:center;justify-content:center;gap:6px;background:#fff;border:1.5px solid #dde3ec;color:#0D2B6B;border-radius:8px;padding:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;margin-top:auto;}\n    .ex-btn-mod:hover{border-color:#2E7DD6;color:#2E7DD6;background:#f0f7ff;}\n    .ex-btn-mod svg{width:14px;height:14px;stroke:currentColor;fill:none;}\n    /* BOTTOM */\n    .ex-bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;}\n    .ex-consejos-card{background:#fff8e1;border-radius:14px;border:1px solid #fde68a;padding:18px 20px;}\n    .ex-cons-title{display:flex;align-items:center;gap:8px;font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#92610a;margin-bottom:10px;}\n    .ex-cons-title svg{width:18px;height:18px;stroke:#e07b00;fill:none;}\n    .ex-cons-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;}\n    .ex-cons-list li{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:#78580a;font-family:'Open Sans',sans-serif;}\n    .ex-cons-list li::before{content:\"\u2022\";color:#F0A500;font-weight:700;flex-shrink:0;}\n    .ex-formato-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:18px 20px;box-shadow:0 2px 8px rgba(13,43,107,.04);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}\n    .ex-formato-left{display:flex;align-items:center;gap:14px;}\n    .ex-formato-ico{width:42px;height:42px;border-radius:50%;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .ex-formato-ico svg{width:20px;height:20px;stroke:#2E7DD6;fill:none;}\n    .ex-formato-title{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;}\n    .ex-formato-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .ex-btn-contactar{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #2E7DD6;color:#2E7DD6;border-radius:9px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;}\n    .ex-btn-contactar:hover{background:#2E7DD6;color:#fff;}\n    .ex-btn-contactar svg{width:14px;height:14px;stroke:currentColor;fill:none;}\n    /* BANNER */\n    .ex-banner{position:relative;height:80px;overflow:hidden;border-radius:12px;margin-bottom:16px;}\n    .ex-banner img{width:100%;height:100%;object-fit:cover;object-position:center 60%;}\n    .ex-banner-ov{position:absolute;inset:0;background:linear-gradient(to right,rgba(13,43,107,.7),rgba(13,43,107,.2));display:flex;align-items:center;padding:0 20px;}\n    .ex-banner-txt{color:#fff;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;}\n    /* RESPONSIVE */\n    @media(max-width:1024px){.ex-mods-grid{grid-template-columns:repeat(2,1fr);}.ex-stats{grid-template-columns:repeat(2,1fr);}}\n    @media(max-width:768px){.ex-hdr{padding:14px 16px 12px;}.ex-body{padding:14px 16px 20px;gap:12px;}.ex-mods-grid{grid-template-columns:repeat(2,1fr);}.ex-bottom{grid-template-columns:1fr;}}\n    @media(max-width:540px){.ex-stats{grid-template-columns:repeat(2,1fr);}.ex-mods-grid{grid-template-columns:1fr;}.ex-hdr-title{font-size:16px;}.ex-completa-inner{flex-direction:column;align-items:flex-start;}.ex-btn-completa{width:100%;justify-content:center;}}\n    </style>\n\n    <div style=\"display:flex;flex-direction:column;gap:0;\">\n      <!-- HEADER -->\n      <div class=\"ex-hdr\">\n        <div class=\"ex-hdr-left\">\n          <div class=\"ex-hdr-ico\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4\"/></svg>\n          </div>\n          <div>\n            <div class=\"ex-hdr-title\">Exportar Datos</div>\n            <div class=\"ex-hdr-sub\">Descarga la informaci&#xF3;n de tu ganader&#xED;a en un archivo Excel.</div>\n          </div>\n        </div>\n        <button class=\"ex-btn-ayuda\">\n          <svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01\"/></svg>\n          &#xBF;Necesitas ayuda? &nbsp;<span style=\"color:#2E7DD6;font-size:12px;\">Ver gu&#xED;a de exportaci&#xF3;n</span>\n        </button>\n      </div>\n\n      <div class=\"ex-body\">\n        <!-- BANNER -->\n        <div class=\"ex-banner\">\n          <img src=\"baneranimales.png?v=2\" alt=\"Exportar\">\n          <div class=\"ex-banner-ov\">\n            <div class=\"ex-banner-txt\">Exporta toda tu informaci&#xF3;n ganadera de forma segura y r&#xE1;pida</div>\n          </div>\n        </div>\n\n        <!-- EXPORTACION COMPLETA -->\n        <div class=\"ex-completa-card\">\n          <div class=\"ex-completa-inner\">\n            <div class=\"ex-completa-left\">\n              <div class=\"ex-completa-ico\">\n                <svg viewBox=\"0 0 24 24\"><ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5\"/><path d=\"M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6\"/></svg>\n              </div>\n              <div>\n                <div class=\"ex-completa-title\">Exportaci&#xF3;n completa</div>\n                <div class=\"ex-completa-sub\">Descarga todos tus datos en un solo archivo Excel con 4 pesta&#xF1;as: Animales, Salud, Gastos e Inventario.</div>\n              </div>\n            </div>\n            <div style=\"text-align:right;\">\n              <button class=\"ex-btn-completa\" onclick=\"exDescargar('completo')\">\n                <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18M9 21V9\"/></svg>\n                Descargar Excel completo\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n              </button>\n              <div class=\"ex-completa-note\">Incluye toda la informaci&#xF3;n de tu ganader&#xED;a</div>\n            </div>\n          </div>\n        </div>\n\n        <!-- STATS -->\n        <div class=\"ex-stats\">\n          <div class=\"ex-stat\" onclick=\"exDescargar('animales')\">\n            <div class=\"ex-stat-ico\" style=\"background:#e8f5e9;\"><svg viewBox=\"0 0 24 24\" stroke=\"#22a96a\"><path d=\"M20 7c0 4.4-3.6 8-8 8S4 11.4 4 7\"/><path d=\"M12 3C8 3 4 5 4 7s3.6 4 8 4 8-2 8-4-4-4-8-4z\"/><path d=\"M12 15v6m-3-3h6\"/></svg></div>\n            <div><div class=\"ex-stat-num\">26</div><div class=\"ex-stat-lbl\">Animales</div></div>\n            <div class=\"ex-stat-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n          </div>\n          <div class=\"ex-stat\" onclick=\"exDescargar('salud')\">\n            <div class=\"ex-stat-ico\" style=\"background:#e8f0fc;\"><svg viewBox=\"0 0 24 24\" stroke=\"#2E7DD6\"><path d=\"M10 3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5h2.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H16v10a2 2 0 01-2 2H10a2 2 0 01-2-2V8H6.5A.5.5 0 016 7.5v-2A.5.5 0 016.5 5H9V3.5z\"/></svg></div>\n            <div><div class=\"ex-stat-num\">5</div><div class=\"ex-stat-lbl\">Salud &amp; Vacunas</div></div>\n            <div class=\"ex-stat-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n          </div>\n          <div class=\"ex-stat\" onclick=\"exDescargar('gastos')\">\n            <div class=\"ex-stat-ico\" style=\"background:#fff3e0;\"><svg viewBox=\"0 0 24 24\" stroke=\"#F0A500\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 8v4l3 3\"/></svg></div>\n            <div><div class=\"ex-stat-num\">6</div><div class=\"ex-stat-lbl\">Gastos</div></div>\n            <div class=\"ex-stat-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n          </div>\n          <div class=\"ex-stat\" onclick=\"exDescargar('inventario')\">\n            <div class=\"ex-stat-ico\" style=\"background:#f0e8fc;\"><svg viewBox=\"0 0 24 24\" stroke=\"#8b5cf6\"><path d=\"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4\"/></svg></div>\n            <div><div class=\"ex-stat-num\">4</div><div class=\"ex-stat-lbl\">Inventario</div></div>\n            <div class=\"ex-stat-arr\"><svg viewBox=\"0 0 24 24\"><path d=\"M9 18l6-6-6-6\"/></svg></div>\n          </div>\n        </div>\n\n        <!-- EXPORTAR POR M\u00d3DULO -->\n        <div class=\"ex-mods-card\">\n          <div class=\"ex-mods-title\">\n            <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\"/></svg>\n            Exportar por m&#xF3;dulo\n          </div>\n          <div class=\"ex-mods-sub\">Selecciona el m&#xF3;dulo que deseas exportar. Se generar&#xE1; un archivo Excel con la informaci&#xF3;n correspondiente.</div>\n          <div class=\"ex-mods-grid\">\n            <!-- Animales -->\n            <div class=\"ex-mod\">\n              <div class=\"ex-mod-head\">\n                <div class=\"ex-mod-ico\" style=\"background:#e8f5e9;\"><svg viewBox=\"0 0 24 24\" stroke=\"#22a96a\"><path d=\"M20 7c0 4.4-3.6 8-8 8S4 11.4 4 7\"/><path d=\"M12 3C8 3 4 5 4 7s3.6 4 8 4 8-2 8-4-4-4-8-4z\"/><path d=\"M12 15v6m-3-3h6\"/></svg></div>\n                <div><div class=\"ex-mod-name\">Animales</div><div class=\"ex-mod-desc\">Exporta la informaci&#xF3;n de tus animales registrados.</div></div>\n              </div>\n              <div class=\"ex-mod-fields\">\n                <div class=\"ex-mod-field\">Arete</div>\n                <div class=\"ex-mod-field\">Nombre</div>\n                <div class=\"ex-mod-field\">Raza</div>\n                <div class=\"ex-mod-field\">Sexo</div>\n                <div class=\"ex-mod-field\">Nacimiento</div>\n                <div class=\"ex-mod-field\">Peso</div>\n                <div class=\"ex-mod-field\">Estado</div>\n                <div class=\"ex-mod-field\">Madre</div>\n              </div>\n              <button class=\"ex-btn-mod\" onclick=\"exDescargar('animales')\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n                Exportar Animales\n              </button>\n            </div>\n            <!-- Salud -->\n            <div class=\"ex-mod\">\n              <div class=\"ex-mod-head\">\n                <div class=\"ex-mod-ico\" style=\"background:#e8f0fc;\"><svg viewBox=\"0 0 24 24\" stroke=\"#2E7DD6\"><path d=\"M10 3.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V5h2.5a.5.5 0 01.5.5v2a.5.5 0 01-.5.5H16v10a2 2 0 01-2 2H10a2 2 0 01-2-2V8H6.5A.5.5 0 016 7.5v-2A.5.5 0 016.5 5H9V3.5z\"/></svg></div>\n                <div><div class=\"ex-mod-name\">Salud &amp; Vacunas</div><div class=\"ex-mod-desc\">Exporta el historial sanitario de tus animales.</div></div>\n              </div>\n              <div class=\"ex-mod-fields\">\n                <div class=\"ex-mod-field\">Animal</div>\n                <div class=\"ex-mod-field\">Tipo</div>\n                <div class=\"ex-mod-field\">Fecha de aplicaci&#xF3;n</div>\n                <div class=\"ex-mod-field\">Pr&#xF3;xima dosis</div>\n                <div class=\"ex-mod-field\">Observaciones</div>\n                <div class=\"ex-mod-field\">Veterinario</div>\n              </div>\n              <button class=\"ex-btn-mod\" onclick=\"exDescargar('salud')\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n                Exportar Salud\n              </button>\n            </div>\n            <!-- Gastos -->\n            <div class=\"ex-mod\">\n              <div class=\"ex-mod-head\">\n                <div class=\"ex-mod-ico\" style=\"background:#fff3e0;\"><svg viewBox=\"0 0 24 24\" stroke=\"#F0A500\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 6v6l3 3\"/></svg></div>\n                <div><div class=\"ex-mod-name\">Gastos e Ingresos</div><div class=\"ex-mod-desc\">Exporta tus registros financieros.</div></div>\n              </div>\n              <div class=\"ex-mod-fields\">\n                <div class=\"ex-mod-field\">Tipo</div>\n                <div class=\"ex-mod-field\">Descripci&#xF3;n</div>\n                <div class=\"ex-mod-field\">Monto</div>\n                <div class=\"ex-mod-field\">Fecha</div>\n                <div class=\"ex-mod-field\">Animal (si aplica)</div>\n                <div class=\"ex-mod-field\">Categor&#xED;a</div>\n                <div class=\"ex-mod-field\">Observaciones</div>\n              </div>\n              <button class=\"ex-btn-mod\" onclick=\"exDescargar('gastos')\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n                Exportar Gastos\n              </button>\n            </div>\n            <!-- Inventario -->\n            <div class=\"ex-mod\">\n              <div class=\"ex-mod-head\">\n                <div class=\"ex-mod-ico\" style=\"background:#f0e8fc;\"><svg viewBox=\"0 0 24 24\" stroke=\"#8b5cf6\"><path d=\"M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4\"/></svg></div>\n                <div><div class=\"ex-mod-name\">Inventario</div><div class=\"ex-mod-desc\">Exporta el inventario de productos e insumos.</div></div>\n              </div>\n              <div class=\"ex-mod-fields\">\n                <div class=\"ex-mod-field\">Nombre</div>\n                <div class=\"ex-mod-field\">Stock actual</div>\n                <div class=\"ex-mod-field\">Stock m&#xED;nimo</div>\n                <div class=\"ex-mod-field\">Precio</div>\n                <div class=\"ex-mod-field\">Vencimiento</div>\n                <div class=\"ex-mod-field\">Categor&#xED;a</div>\n                <div class=\"ex-mod-field\">Proveedor</div>\n              </div>\n              <button class=\"ex-btn-mod\" onclick=\"exDescargar('inventario')\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n                Exportar Inventario\n              </button>\n            </div>\n          </div>\n        </div>\n\n        <!-- BOTTOM -->\n        <div class=\"ex-bottom\">\n          <div class=\"ex-consejos-card\">\n            <div class=\"ex-cons-title\">\n              <svg viewBox=\"0 0 24 24\"><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/></svg>\n              Consejos para una mejor exportaci&#xF3;n\n            </div>\n            <ul class=\"ex-cons-list\">\n              <li>Los archivos se generan en formato Excel (.xlsx).</li>\n              <li>Puedes exportar m&#xF3;dulos individuales o toda la informaci&#xF3;n.</li>\n              <li>La descarga puede tardar unos segundos dependiendo del volumen de datos.</li>\n            </ul>\n          </div>\n          <div class=\"ex-formato-card\">\n            <div class=\"ex-formato-left\">\n              <div class=\"ex-formato-ico\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z\"/></svg>\n              </div>\n              <div>\n                <div class=\"ex-formato-title\">&#xBF;Necesitas un formato especial?</div>\n                <div class=\"ex-formato-sub\">Cont&#xE1;ctanos para exportaciones personalizadas.</div>\n              </div>\n            </div>\n            <button class=\"ex-btn-contactar\" onclick=\"navegar('soporte',null)\">\n              <svg viewBox=\"0 0 24 24\"><path d=\"M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z\"/></svg>\n              Contactar soporte\n            </button>\n          </div>\n        </div>\n      </div>\n    </div>\n\n    <script>\n    function exDescargar(tipo){\n      var nombres={completo:'datos_completos',animales:'animales',salud:'salud_vacunas',gastos:'gastos_ingresos',inventario:'inventario'};\n      var nombre=nombres[tipo]||tipo;\n      if(typeof toast==='function') toast('Descargando '+nombre+'.xlsx...');\n    }\n    <\\/script>\n    </div><!-- /sec-exportar -->";
  var sec=tmp.firstElementChild;
  document.querySelector('main.d-main').appendChild(sec);
}

function inyectarImportar(){
  if(document.getElementById('sec-importar')) return;
  var tmp=document.createElement('div');
  tmp.innerHTML="<!-- \u2550\u2550 #sec-importar \u2014 IMPORTAR DATOS \u2550\u2550 -->\n    <div id=\"sec-importar\" style=\"display:none;flex-direction:column;overflow-y:auto;overflow-x:hidden;flex:1;\">\n    <style>\n    /* \u2550\u2550 IMPORTAR DATOS CSS \u2550\u2550 */\n    .im-wrap{display:flex;flex-direction:column;gap:0;min-height:100%;}\n    .im-hdr{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:20px 28px 16px;border-bottom:1px solid #e8edf5;background:#fff;flex-shrink:0;}\n    .im-hdr-left{display:flex;align-items:center;gap:14px;}\n    .im-hdr-ico{width:48px;height:48px;border-radius:12px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .im-hdr-ico svg{width:24px;height:24px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .im-hdr-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;color:#0D2B6B;}\n    .im-hdr-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .im-hdr-right{display:flex;align-items:center;gap:8px;}\n    .im-btn-ayuda{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #dde3ec;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:600;color:#4a5568;cursor:pointer;font-family:'Montserrat',sans-serif;}\n    .im-btn-ayuda svg{width:16px;height:16px;stroke:#2E7DD6;fill:none;}\n    .im-body{display:flex;flex-direction:column;gap:16px;padding:20px 28px 28px;}\n    /* PASOS */\n    .im-pasos-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .im-pasos-title{display:flex;align-items:center;gap:9px;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;margin-bottom:18px;}\n    .im-pasos-title svg{width:20px;height:20px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .im-pasos-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;position:relative;}\n    .im-pasos-grid::before{content:'';position:absolute;top:22px;left:10%;right:10%;height:2px;background:linear-gradient(90deg,#2E7DD6,#e8edf5);z-index:0;}\n    .im-paso{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;position:relative;z-index:1;}\n    .im-paso-num{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;flex-shrink:0;}\n    .im-paso-num.active{background:#2E7DD6;color:#fff;}\n    .im-paso-num.done{background:#22a96a;color:#fff;}\n    .im-paso-num.pending{background:#e8edf5;color:#9eaaba;}\n    .im-paso-ico{width:52px;height:52px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .im-paso-ico svg{width:26px;height:26px;fill:none;stroke-width:1.8;}\n    .im-paso-name{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#0D2B6B;}\n    .im-paso-desc{font-size:11px;color:#7a8aa0;font-family:'Open Sans',sans-serif;line-height:1.4;}\n    /* GRID PRINCIPAL */\n    .im-main-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}\n    /* CARD PLANTILLA */\n    .im-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:20px 24px;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .im-card-title{display:flex;align-items:center;gap:10px;font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;margin-bottom:6px;}\n    .im-card-title svg{width:20px;height:20px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .im-card-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;line-height:1.5;margin-bottom:14px;}\n    .im-info-box{background:#f0f7ff;border-radius:10px;padding:12px 14px;margin-bottom:14px;}\n    .im-info-title{display:flex;align-items:center;gap:7px;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#2E7DD6;margin-bottom:6px;}\n    .im-info-title svg{width:15px;height:15px;stroke:#2E7DD6;fill:none;}\n    .im-info-cols{font-size:12px;color:#4a5568;font-family:'Open Sans',sans-serif;line-height:1.6;}\n    .im-btn-descargar{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#e8f5e9;border:1.5px solid #22a96a;color:#1b8e4e;border-radius:10px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;margin-bottom:14px;}\n    .im-btn-descargar:hover{background:#22a96a;color:#fff;}\n    .im-btn-descargar svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;}\n    .im-consejos{background:#fff8e1;border-radius:10px;padding:12px 14px;border-left:3px solid #F0A500;}\n    .im-consejos-title{display:flex;align-items:center;gap:7px;font-family:'Montserrat',sans-serif;font-size:13px;font-weight:700;color:#e07b00;margin-bottom:8px;}\n    .im-consejos-title svg{width:15px;height:15px;stroke:#e07b00;fill:none;}\n    .im-consejos ul{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:4px;}\n    .im-consejos li{font-size:12px;color:#7a6000;font-family:'Open Sans',sans-serif;}\n    /* CARD SUBIR */\n    .im-drop-zone{border:2px dashed #c0d4f0;border-radius:12px;padding:32px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;cursor:pointer;transition:all .2s;background:#fafcff;margin-bottom:14px;}\n    .im-drop-zone:hover,.im-drop-zone.dragover{border-color:#2E7DD6;background:#f0f7ff;}\n    .im-drop-ico{width:56px;height:56px;border-radius:14px;background:#e8f0fc;display:flex;align-items:center;justify-content:center;}\n    .im-drop-ico svg{width:28px;height:28px;stroke:#2E7DD6;fill:none;stroke-width:1.8;}\n    .im-drop-title{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;}\n    .im-drop-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;}\n    .im-drop-hint{font-size:11px;color:#b0bec5;font-family:'Open Sans',sans-serif;}\n    .im-btn-sel{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #2E7DD6;color:#2E7DD6;border-radius:8px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;margin-bottom:14px;transition:all .15s;}\n    .im-btn-sel:hover{background:#2E7DD6;color:#fff;}\n    .im-btn-sel svg{width:15px;height:15px;stroke:currentColor;fill:none;}\n    .im-file-preview{display:none;background:#f5f8ff;border-radius:10px;padding:12px 14px;border:1px solid #e8edf5;align-items:center;gap:12px;margin-bottom:14px;}\n    .im-file-preview.show{display:flex;}\n    .im-file-ico{width:36px;height:36px;border-radius:8px;background:#e8f5e9;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .im-file-ico svg{width:18px;height:18px;stroke:#22a96a;fill:none;}\n    .im-file-name{font-family:'Montserrat',sans-serif;font-size:13px;font-weight:600;color:#0D2B6B;}\n    .im-file-size{font-size:11px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .im-file-del{margin-left:auto;width:28px;height:28px;border-radius:50%;border:none;background:#fce8e8;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}\n    .im-file-del svg{width:13px;height:13px;stroke:#e53e3e;fill:none;}\n    .im-btn-validar{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:#c8d8f0;border:none;color:#fff;border-radius:10px;padding:14px;font-size:14px;font-weight:700;cursor:not-allowed;font-family:'Montserrat',sans-serif;transition:all .2s;}\n    .im-btn-validar.ready{background:#2E7DD6;cursor:pointer;}\n    .im-btn-validar.ready:hover{background:#1a5fb4;}\n    .im-btn-validar svg{width:16px;height:16px;stroke:#fff;fill:none;}\n    /* FOOTER HELP */\n    .im-help-card{background:#fff;border-radius:14px;border:1px solid #e8edf5;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;box-shadow:0 2px 8px rgba(13,43,107,.04);}\n    .im-help-left{display:flex;align-items:center;gap:14px;}\n    .im-help-ico{width:42px;height:42px;border-radius:50%;background:#2E7DD6;display:flex;align-items:center;justify-content:center;flex-shrink:0;}\n    .im-help-ico svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;}\n    .im-help-title{font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;}\n    .im-help-sub{font-size:12px;color:#7a8aa0;font-family:'Open Sans',sans-serif;margin-top:2px;}\n    .im-btn-guia{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1.5px solid #2E7DD6;color:#2E7DD6;border-radius:9px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Montserrat',sans-serif;transition:all .15s;}\n    .im-btn-guia:hover{background:#2E7DD6;color:#fff;}\n    .im-btn-guia svg{width:14px;height:14px;stroke:currentColor;fill:none;}\n    /* RESPONSIVE */\n    @media(max-width:900px){.im-main-grid{grid-template-columns:1fr;}.im-pasos-grid{grid-template-columns:repeat(2,1fr);}.im-pasos-grid::before{display:none;}}\n    @media(max-width:768px){.im-hdr{padding:14px 16px 12px;}.im-body{padding:14px 16px 20px;gap:12px;}.im-pasos-card{padding:14px 14px;}.im-card{padding:14px 14px;}}\n    @media(max-width:540px){.im-hdr-title{font-size:16px;}.im-pasos-grid{grid-template-columns:1fr 1fr;}.im-help-card{flex-direction:column;align-items:flex-start;}.im-hdr-right{width:100%;}}\n    </style>\n\n    <div class=\"im-wrap\">\n      <!-- HEADER -->\n      <div class=\"im-hdr\">\n        <div class=\"im-hdr-left\">\n          <div class=\"im-hdr-ico\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12\"/></svg>\n          </div>\n          <div>\n            <div class=\"im-hdr-title\">Importar Animales</div>\n            <div class=\"im-hdr-sub\">Carga masiva de informaci&#xF3;n de tus animales desde un archivo Excel.</div>\n          </div>\n        </div>\n        <div class=\"im-hdr-right\">\n          <button class=\"im-btn-ayuda\">\n            <svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01\"/></svg>\n            &#xBF;Necesitas ayuda? &nbsp;<span style=\"color:#2E7DD6;font-size:12px;\">Ver gu&#xED;a paso a paso</span>\n          </button>\n        </div>\n      </div>\n\n      <div class=\"im-body\">\n        <!-- PASOS -->\n        <div class=\"im-pasos-card\">\n          <div class=\"im-pasos-title\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M9 11l3 3L22 4\"/><path d=\"M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11\"/></svg>\n            Sigue estos pasos\n          </div>\n          <div class=\"im-pasos-grid\">\n            <div class=\"im-paso\">\n              <div class=\"im-paso-num active\">1</div>\n              <div class=\"im-paso-ico\" style=\"background:#e8f5e9;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#22a96a\"><path d=\"M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z\"/><polyline points=\"14 2 14 8 20 8\"/><line x1=\"16\" y1=\"13\" x2=\"8\" y2=\"13\"/><line x1=\"16\" y1=\"17\" x2=\"8\" y2=\"17\"/></svg>\n              </div>\n              <div class=\"im-paso-name\">Descarga la plantilla</div>\n              <div class=\"im-paso-desc\">Usa nuestra plantilla Excel con el formato correcto de datos.</div>\n            </div>\n            <div class=\"im-paso\">\n              <div class=\"im-paso-num pending\">2</div>\n              <div class=\"im-paso-ico\" style=\"background:#f0f4fb;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#9eaaba\"><path d=\"M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg>\n              </div>\n              <div class=\"im-paso-name\">Completa la informaci&#xF3;n</div>\n              <div class=\"im-paso-desc\">Llena los datos de tus animales en el archivo descargado.</div>\n            </div>\n            <div class=\"im-paso\">\n              <div class=\"im-paso-num pending\">3</div>\n              <div class=\"im-paso-ico\" style=\"background:#f0f4fb;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#9eaaba\"><path d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12\"/></svg>\n              </div>\n              <div class=\"im-paso-name\">Sube tu archivo</div>\n              <div class=\"im-paso-desc\">Selecciona el archivo Excel y c&#xE1;rgalo al sistema.</div>\n            </div>\n            <div class=\"im-paso\">\n              <div class=\"im-paso-num pending\">4</div>\n              <div class=\"im-paso-ico\" style=\"background:#f0f4fb;\">\n                <svg viewBox=\"0 0 24 24\" stroke=\"#9eaaba\"><path d=\"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>\n              </div>\n              <div class=\"im-paso-name\">Revisa y confirma</div>\n              <div class=\"im-paso-desc\">Valida la informaci&#xF3;n antes de importar.</div>\n            </div>\n          </div>\n        </div>\n\n        <!-- GRID PRINCIPAL -->\n        <div class=\"im-main-grid\">\n\n          <!-- COLUMNA IZQUIERDA: PLANTILLA -->\n          <div style=\"display:flex;flex-direction:column;gap:14px;\">\n            <div class=\"im-card\">\n              <div class=\"im-card-title\">\n                <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18M9 21V9\"/></svg>\n                1. Descarga la plantilla\n              </div>\n              <div class=\"im-card-sub\">Descarga la plantilla Excel, ll&#xE9;nala con los datos de tus animales y s&#xFA;bela en el siguiente paso.</div>\n              <div class=\"im-info-box\">\n                <div class=\"im-info-title\">\n                  <svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 8v4M12 16h.01\"/></svg>\n                  Columnas incluidas:\n                </div>\n                <div class=\"im-info-cols\">Arete, Nombre, Raza, Sexo, Nacimiento, Peso, Estado, Madre, Observaciones.</div>\n              </div>\n              <button class=\"im-btn-descargar\" onclick=\"imDescargarPlantilla()\">\n                <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18M9 21V9\"/></svg>\n                Descargar Plantilla Excel\n                <svg viewBox=\"0 0 24 24\"><path d=\"M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n              </button>\n              <div class=\"im-consejos\">\n                <div class=\"im-consejos-title\">\n                  <svg viewBox=\"0 0 24 24\"><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/></svg>\n                  Consejos:\n                </div>\n                <ul>\n                  <li>No modifiques el orden de las columnas.</li>\n                  <li>Usa el formato de fecha: DD/MM/AAAA.</li>\n                  <li>Aseg&#xFA;rate de que los datos sean correctos para evitar errores en la importaci&#xF3;n.</li>\n                </ul>\n              </div>\n            </div>\n          </div>\n\n          <!-- COLUMNA DERECHA: SUBIR ARCHIVO -->\n          <div style=\"display:flex;flex-direction:column;gap:14px;\">\n            <div class=\"im-card\">\n              <div class=\"im-card-title\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12\"/></svg>\n                2. Sube tu archivo\n              </div>\n              <div class=\"im-card-sub\">Selecciona el archivo Excel con la informaci&#xF3;n de tus animales.</div>\n\n              <div class=\"im-drop-zone\" id=\"im-drop-zone\" onclick=\"document.getElementById('im-file-input').click()\" ondragover=\"imDragOver(event)\" ondragleave=\"imDragLeave(event)\" ondrop=\"imDrop(event)\">\n                <div class=\"im-drop-ico\">\n                  <svg viewBox=\"0 0 24 24\"><path d=\"M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12\"/></svg>\n                </div>\n                <div class=\"im-drop-title\">Arrastra tu archivo aqu&#xED;</div>\n                <div class=\"im-drop-sub\">o haz clic para seleccionar</div>\n                <div class=\"im-drop-hint\">Solo archivos .xlsx</div>\n              </div>\n\n              <input type=\"file\" id=\"im-file-input\" accept=\".xlsx,.xls\" style=\"display:none;\" onchange=\"imSeleccionarArchivo(this)\">\n\n              <button class=\"im-btn-sel\" onclick=\"document.getElementById('im-file-input').click()\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z\"/></svg>\n                Seleccionar archivo\n              </button>\n\n              <div class=\"im-file-preview\" id=\"im-file-preview\">\n                <div class=\"im-file-ico\">\n                  <svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"18\" height=\"18\" rx=\"2\"/><path d=\"M3 9h18M9 21V9\"/></svg>\n                </div>\n                <div>\n                  <div class=\"im-file-name\" id=\"im-file-name\">plantilla_animales.xlsx</div>\n                  <div class=\"im-file-size\" id=\"im-file-size\">12.5 KB</div>\n                </div>\n                <button class=\"im-file-del\" onclick=\"imQuitarArchivo()\">\n                  <svg viewBox=\"0 0 24 24\"><line x1=\"18\" y1=\"6\" x2=\"6\" y2=\"18\"/><line x1=\"6\" y1=\"6\" x2=\"18\" y2=\"18\"/></svg>\n                </button>\n              </div>\n\n              <button class=\"im-btn-validar\" id=\"im-btn-validar\" disabled onclick=\"imValidar()\">\n                <svg viewBox=\"0 0 24 24\"><path d=\"M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z\"/></svg>\n                Validar y continuar &#x2192;\n              </button>\n            </div>\n          </div>\n        </div>\n\n        <!-- AYUDA -->\n        <div class=\"im-help-card\">\n          <div class=\"im-help-left\">\n            <div class=\"im-help-ico\">\n              <svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01\"/></svg>\n            </div>\n            <div>\n              <div class=\"im-help-title\">&#xBF;Tienes dudas?</div>\n              <div class=\"im-help-sub\">Consulta nuestras gu&#xED;as o contacta al soporte si necesitas ayuda con la importaci&#xF3;n de datos.</div>\n            </div>\n          </div>\n          <button class=\"im-btn-guia\" onclick=\"navegar('soporte',null)\">\n            <svg viewBox=\"0 0 24 24\"><path d=\"M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14\"/></svg>\n            Ver gu&#xED;a completa\n          </button>\n        </div>\n      </div>\n    </div>\n\n    <script>\n    function imDescargarPlantilla(){\n      if(typeof toast==='function') toast('Descargando plantilla Excel...');\n    }\n    function imSeleccionarArchivo(input){\n      if(!input.files||!input.files[0]) return;\n      var file=input.files[0];\n      document.getElementById('im-file-name').textContent=file.name;\n      document.getElementById('im-file-size').textContent=(file.size/1024).toFixed(1)+' KB';\n      document.getElementById('im-file-preview').classList.add('show');\n      document.getElementById('im-drop-zone').style.display='none';\n      var btn=document.getElementById('im-btn-validar');\n      btn.disabled=false; btn.classList.add('ready');\n    }\n    function imQuitarArchivo(){\n      document.getElementById('im-file-input').value='';\n      document.getElementById('im-file-preview').classList.remove('show');\n      document.getElementById('im-drop-zone').style.display='flex';\n      var btn=document.getElementById('im-btn-validar');\n      btn.disabled=true; btn.classList.remove('ready');\n    }\n    function imDragOver(e){e.preventDefault();document.getElementById('im-drop-zone').classList.add('dragover');}\n    function imDragLeave(e){document.getElementById('im-drop-zone').classList.remove('dragover');}\n    function imDrop(e){\n      e.preventDefault();\n      document.getElementById('im-drop-zone').classList.remove('dragover');\n      var files=e.dataTransfer.files;\n      if(files&&files[0]){\n        var input=document.getElementById('im-file-input');\n        var dt=new DataTransfer();\n        dt.items.add(files[0]);\n        input.files=dt.files;\n        imSeleccionarArchivo(input);\n      }\n    }\n    function imValidar(){\n      if(typeof toast==='function') toast('Validando archivo...');\n    }\n    <\\/script>\n    </div><!-- /sec-importar -->";
  var sec=tmp.firstElementChild;
  document.querySelector('main.d-main').appendChild(sec);
}

/* ── BANCO GENÉTICO ── */
function bkTab(t){var g=document.getElementById('bk-grid'),d=document.getElementById('bk-dosis'),t1=document.getElementById('bk-t1'),t2=document.getElementById('bk-t2');if(t==='toros'){g.style.display='grid';d.classList.remove('on');t1.classList.add('on');t2.classList.remove('on');}else{g.style.display='none';d.classList.add('on');t2.classList.add('on');t1.classList.remove('on');}}
function bkFiltrar(){var q=(document.getElementById('bk-q').value||'').toLowerCase(),raza=document.getElementById('bk-raza').value,disp=document.getElementById('bk-disp').value;document.querySelectorAll('#bk-grid .bk-card').forEach(function(c){c.style.display=(!q||(c.dataset.nombre||'').includes(q))&&(!raza||c.dataset.raza===raza)&&(!disp||c.dataset.disp===disp)?'':'none';});}
function bkVista(v){var g=document.getElementById('bk-grid'),vg=document.getElementById('bk-vg'),vl=document.getElementById('bk-vl');if(v==='grid'){g.style.gridTemplateColumns='repeat(auto-fill,minmax(310px,1fr))';vg.classList.add('on');vl.classList.remove('on');}else{g.style.gridTemplateColumns='1fr';vl.classList.add('on');vg.classList.remove('on');}}
function bkModal(open){document.getElementById('bk-modal').style.display=open?'flex':'none';}

/* ── SOPORTE ── */
function spChar(){var v=document.getElementById('sp-msg').value;if(v.length>500)document.getElementById('sp-msg').value=v.slice(0,500);document.getElementById('sp-char-n').textContent=Math.min(v.length,500);}
function spEnviar(){var msg=document.getElementById('sp-msg').value.trim();if(!msg){document.getElementById('sp-msg').style.borderColor='#e53e3e';return;}document.getElementById('sp-msg').style.borderColor='';document.getElementById('sp-msg').value='';document.getElementById('sp-char-n').textContent='0';if(typeof toast==='function')toast('Mensaje enviado.');}
function spFaqToggle(el){var isOpen=el.classList.contains('open');document.querySelectorAll('.sp-faq-item').forEach(function(i){i.classList.remove('open');});if(!isOpen)el.classList.add('open');}
function spFaqBuscar(q){q=q.toLowerCase();document.querySelectorAll('.sp-faq-item').forEach(function(item){var txt=item.querySelector('.sp-faq-q span').textContent.toLowerCase();item.style.display=(!q||txt.includes(q))?'':'none';});}

/* ── SUSCRIPCIÓN ── */
var suModoAnual=false,suPrecios={basico:[35,28],estandar:[70,56],premium:[120,96]};
function suToggle(modo){suModoAnual=(modo==='anual');document.getElementById('su-t-mes').classList.toggle('on',!suModoAnual);document.getElementById('su-t-anu').classList.toggle('on',suModoAnual);var i=suModoAnual?1:0;['basico','estandar','premium'].forEach(function(k){document.getElementById('su-price-'+k).textContent=suPrecios[k][i];});}
function suSeleccionarPlan(plan){if(typeof toast==='function')toast('Plan seleccionado: '+plan);}
function suMetodo(el){document.querySelectorAll('.su-metodo').forEach(function(m){m.classList.remove('on');});el.classList.add('on');}
function suPagar(){if(typeof toast==='function')toast('Procesando pago...');}

/* ── PERFIL ── */
function pfToggle(btn){btn.classList.toggle('on');btn.classList.toggle('off');}
function pfCambiarLogo(input){if(!input.files||!input.files[0])return;var reader=new FileReader();reader.onload=function(e){var src=e.target.result;var img=document.getElementById('pf-logo-img');var prev=document.getElementById('pf-preview-img');if(img)img.src=src;if(prev)prev.src=src;};reader.readAsDataURL(input.files[0]);}
function pfActualizarPreview(){var nombre=document.getElementById('pf-nombre-ganaderia'),ruc=document.getElementById('pf-ruc'),dir=document.getElementById('pf-direccion'),pname=document.getElementById('pf-preview-name'),pmeta=document.getElementById('pf-preview-meta');if(nombre&&pname)pname.textContent=nombre.value;if(ruc&&dir&&pmeta)pmeta.innerHTML='RUC: '+ruc.value+'<br>'+dir.value;}

/* ── DOCUMENTOS ── */
function dcSelTipo(el,tipo){document.querySelectorAll('.dc-tipo').forEach(function(t){t.style.borderColor='';t.style.background='';});el.style.borderColor='#2E7DD6';el.style.background='#f0f7ff';if(typeof toast==='function')toast('Generando: '+tipo+'...');}
function dcBuscar(q){q=q.toLowerCase();document.querySelectorAll('#dc-tbody tr').forEach(function(tr){tr.style.display=(!q||tr.textContent.toLowerCase().includes(q))?'':'none';});}
function dcFiltrar(){var tipo=document.getElementById('dc-filtro-tipo').value.toLowerCase();document.querySelectorAll('#dc-tbody tr').forEach(function(tr){tr.style.display=(!tipo||tr.textContent.toLowerCase().includes(tipo))?'':'none';});}
function dcLimpiar(){document.getElementById('dc-filtro-tipo').value='';document.querySelectorAll('#dc-tbody tr').forEach(function(tr){tr.style.display='';});}

/* ── CSS FIX ON LOAD ── */
document.addEventListener('DOMContentLoaded',function(){
  var t=document.getElementById('vq-toast');
  if(!t){t=document.createElement('div');t.id='vq-toast';t.className='vq-toast';document.body.appendChild(t);}
  if(!document.getElementById('vq-css-fix')){
    var el=document.createElement('style');
    el.id='vq-css-fix';
    el.textContent='.an-page-header,.sv-header,.in-header,.pt-header,.cal-header,.alt-header{position:relative!important;overflow:hidden!important;flex-shrink:0!important;}.an-page-header{height:160px!important;}.sv-header,.in-header{height:140px!important;}.pt-header{height:160px!important;}.cal-header,.alt-header{height:130px!important;}.an-page-header img,.sv-header img,.in-header img,.pt-header img,.cal-header img,.alt-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;}.an-page-header-ov,.sv-header-ov,.in-header-ov,.pt-header-ov,.cal-header-ov,.alt-header-ov{position:absolute!important;inset:0!important;z-index:1!important;}[class$="-stat-ico"]{width:44px!important;height:44px!important;overflow:hidden!important;flex-shrink:0!important;}[class$="-stat-ico"] svg{width:22px!important;height:22px!important;}button svg{max-width:18px!important;max-height:18px!important;}';
    document.head.appendChild(el);
  }
});

/* ── MOB NAV FUNCTIONS ── */
function mobMas(){
  var m=document.getElementById('mob-mas-menu');
  m.style.display='block';
  m.style.flexDirection='';
  document.body.style.overflow='hidden';
}
function mobCerrarMas(){
  document.getElementById('mob-mas-menu').style.display='none';
  document.body.style.overflow='';
}
function mobAgregar(){
  document.getElementById('mob-add-menu').style.display='flex';
  document.body.style.overflow='hidden';
}
function mobCerrarAdd(){
  document.getElementById('mob-add-menu').style.display='none';
  document.body.style.overflow='';
}
function mobNavegar(sec){
  mobCerrarMas();
  mobCerrarAdd();
  navegar(sec, null);
}

function mobMasBuscar(q){
  q = q.toLowerCase();
  document.querySelectorAll('.mob-mas-item').forEach(function(item){
    var txt = item.textContent.toLowerCase();
    item.style.display = (!q || txt.includes(q)) ? '' : 'none';
  });
}

/* ══════════════════════════════════════════
   MÓDULO ANIMALES — Supabase real
   ══════════════════════════════════════════ */

let DB_ANIMALES = [];
let _filtroEstado = '';
let _filtroBuscar = '';

const escH = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const fmtFecha = d => { if(!d) return '—'; const p=String(d).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:d; };

/* ── Cargar desde Supabase ── */
async function cargarAnimales(){
  const tbody = document.getElementById('an-tbody');
  if(!tbody) return;
  tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';

  const ranchoId = await _asegurarRanchoId();
  if(!ranchoId){
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:30px;color:#e07b00;">⚠️ Sin rancho asignado. Cierra sesión y vuelve a entrar.</td></tr>';
    return;
  }

  try{
    const res = await fetch(
      `${SB_URL}/rest/v1/animales?rancho_id=eq.${ranchoId}&select=*&order=created_at.desc`,
      {headers: SB_HEADERS}
    );
    const data = await res.json();
    console.log('[Animales]', res.status, Array.isArray(data)?data.length+' registros':data);
    if(!res.ok) throw new Error(data.message||data.hint||`Error ${res.status}`);
    DB_ANIMALES = Array.isArray(data) ? data : [];
    renderAnimales(DB_ANIMALES);
  }catch(e){
    console.error('[Animales error]', e);
    if(tbody) tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:30px;color:#e53e3e;">❌ ${escH(e.message)}</td></tr>`;
  }
}

/* ── Renderizar tabla ── */
function renderAnimales(lista){
  const tbody = document.getElementById('an-tbody');
  if(!tbody) return;

  let filtrada = lista;
  if(_filtroEstado) filtrada = filtrada.filter(a => a.estado === _filtroEstado);
  if(_filtroBuscar){
    const q = _filtroBuscar.toLowerCase();
    filtrada = filtrada.filter(a =>
      (a.arete||'').toLowerCase().includes(q) ||
      (a.nombre||'').toLowerCase().includes(q) ||
      (a.raza||'').toLowerCase().includes(q)
    );
  }

  /* Stats */
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('an-stat-total',    lista.length);
  set('an-stat-activos',  lista.filter(a=>a.estado==='Activo').length);
  set('an-stat-trat',     lista.filter(a=>a.estado==='En tratamiento').length);
  set('an-stat-muertos',  lista.filter(a=>a.estado==='Muerto').length);
  set('an-tab-total',     lista.length);
  set('an-tab-activos',   lista.filter(a=>a.estado==='Activo').length);
  set('an-tab-gestantes', lista.filter(a=>a.estado==='Gestante').length);
  set('an-tab-trat',      lista.filter(a=>a.estado==='En tratamiento').length);
  set('an-tab-vendidos',  lista.filter(a=>a.estado==='Vendido').length);
  set('an-tab-muertos',   lista.filter(a=>a.estado==='Muerto').length);

  if(!filtrada.length){
    tbody.innerHTML = `<tr><td colspan="12" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_filtroEstado||_filtroBuscar ? '🔍 Sin resultados.' : '🐄 Sin animales registrados. ¡Agrega el primero!'}
    </td></tr>`;
    return;
  }

  const badge = e => {
    const m = {'Activo':['an-est-activo','● Activo'],'Gestante':['an-est-gestante','● Gestante'],'En tratamiento':['an-est-trat','● En tratamiento'],'Vendido':['an-est-vendido','● Vendido'],'Muerto':['an-est-muerto','● Muerto']};
    const [cls,lbl] = m[e]||['an-est-activo','● '+e];
    return `<span class="an-estado-badge ${cls}">${lbl}</span>`;
  };

  tbody.innerHTML = filtrada.map(a=>`
    <tr onclick="verAnimal('${a.id}')">
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td class="an-arete">${escH(a.arete)}</td>
      <td>${a.foto?`<img class="an-foto-td" src="${escH(a.foto)}">`:`<div style="width:32px;height:32px;border-radius:7px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:16px;">🐄</div>`}</td>
      <td class="an-nombre-bold">${escH(a.nombre||'—')}</td>
      <td>${escH(a.raza||'—')}</td>
      <td><div class="an-sexo" style="color:${a.sexo==='Hembra'?'#993556':'#185FA5'}">${a.sexo==='Hembra'?'♀ Hembra':'♂ Macho'}</div></td>
      <td>${fmtFecha(a.nacimiento)}</td>
      <td>${a.peso?a.peso+' kg':'—'}</td>
      <td>${escH(a.madre||'—')}</td>
      <td>${escH(a.padre||'—')}</td>
      <td>${badge(a.estado)}</td>
      <td onclick="event.stopPropagation()"><div class="an-acc">
        <button class="an-acc-btn ver" title="Ver" onclick="verAnimal('${a.id}')"><svg fill="none" stroke="#2E7DD6" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>
        <button class="an-acc-btn edit" title="Editar" onclick="editarAnimal('${a.id}')"><svg fill="none" stroke="#8FA3BF" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>
        <button class="an-acc-btn del" title="Eliminar" onclick="eliminarAnimal('${a.id}','${escH(a.arete)}')"><svg fill="none" stroke="#E24B4A" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
      </div></td>
    </tr>`).join('');
}

/* ── Filtros ── */
function filtrarAnimales(q){ _filtroBuscar=q; renderAnimales(DB_ANIMALES); }
function filtrarTab(el,estado){
  document.querySelectorAll('.an-tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  _filtroEstado=estado||'';
  renderAnimales(DB_ANIMALES);
}

/* ── Modal ── */
function _crearModalSiNoExiste(){
  if(document.getElementById('m-animal')) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="m-animal" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalAnimal()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-animal-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">🐄 Nuevo Animal</div>
        <button onclick="cerrarModalAnimal()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-animal-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Arete *</label><input id="m-arete" type="text" placeholder="Ej: A-023" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Nombre</label><input id="m-nombre" type="text" placeholder="Ej: Lolita" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Raza *</label><input id="m-raza" type="text" placeholder="Ej: Brahman" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Sexo *</label>
          <select id="m-sexo" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option><option value="Hembra">Hembra</option><option value="Macho">Macho</option>
          </select></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Nacimiento</label><input id="m-nacimiento" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Peso (kg)</label><input id="m-peso" type="number" placeholder="0" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Madre</label><input id="m-madre" type="text" placeholder="Arete de la madre" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Padre</label><input id="m-padre" type="text" placeholder="Arete del padre" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;"></div>
        <div style="grid-column:1/-1;"><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Estado</label>
          <select id="m-estado" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="Activo">Activo</option><option value="Gestante">Gestante</option><option value="En tratamiento">En tratamiento</option><option value="Vendido">Vendido</option><option value="Muerto">Muerto</option>
          </select></div>
        <div style="grid-column:1/-1;"><label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
          <textarea id="m-observaciones" rows="2" placeholder="Notas adicionales..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea></div>
      </div>
      <div id="m-animal-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalAnimal()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarAnimal()" id="m-animal-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#2E7DD6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

function abrirModalAnimal(){
  _crearModalSiNoExiste();
  document.getElementById('m-animal-id').value='';
  document.getElementById('m-animal-titulo').textContent='🐄 Nuevo Animal';
  document.getElementById('m-animal-btn').textContent='💾 Guardar';
  ['m-arete','m-nombre','m-raza','m-nacimiento','m-madre','m-padre','m-observaciones','m-peso']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-sexo').value='';
  document.getElementById('m-estado').value='Activo';
  document.getElementById('m-animal-error').style.display='none';
  document.getElementById('m-animal').style.display='flex';
}
function cerrarModalAnimal(){ document.getElementById('m-animal').style.display='none'; }

function editarAnimal(id){
  const a=DB_ANIMALES.find(x=>x.id===id);
  if(!a) return;
  document.getElementById('m-animal-id').value=a.id;
  document.getElementById('m-animal-titulo').textContent='✏️ Editar Animal';
  document.getElementById('m-animal-btn').textContent='💾 Actualizar';
  document.getElementById('m-arete').value=a.arete||'';
  document.getElementById('m-nombre').value=a.nombre||'';
  document.getElementById('m-raza').value=a.raza||'';
  document.getElementById('m-sexo').value=a.sexo||'';
  document.getElementById('m-nacimiento').value=a.nacimiento||'';
  document.getElementById('m-peso').value=a.peso||'';
  document.getElementById('m-madre').value=a.madre||'';
  document.getElementById('m-padre').value=a.padre||'';
  document.getElementById('m-estado').value=a.estado||'Activo';
  document.getElementById('m-observaciones').value=a.observaciones||'';
  document.getElementById('m-animal-error').style.display='none';
  document.getElementById('m-animal').style.display='flex';
}

/* ── Guardar ── */
async function guardarAnimal(){
  const id=document.getElementById('m-animal-id').value;
  const arete=document.getElementById('m-arete').value.trim();
  const raza=document.getElementById('m-raza').value.trim();
  const sexo=document.getElementById('m-sexo').value;
  const errEl=document.getElementById('m-animal-error');
  if(!arete||!raza||!sexo){
    errEl.textContent='Arete, raza y sexo son obligatorios.';
    errEl.style.display='block'; return;
  }
  errEl.style.display='none';
  const btn=document.getElementById('m-animal-btn');
  btn.textContent='⏳ Guardando...'; btn.disabled=true;
  const payload={
    rancho_id: SESSION.rancho_id,
    arete,
    nombre: document.getElementById('m-nombre').value.trim()||null,
    raza,
    sexo,
    nacimiento: document.getElementById('m-nacimiento').value||null,
    peso: parseFloat(document.getElementById('m-peso').value)||null,
    madre: document.getElementById('m-madre').value.trim()||null,
    padre: document.getElementById('m-padre').value.trim()||null,
    estado: document.getElementById('m-estado').value||'Activo',
    observaciones: document.getElementById('m-observaciones').value.trim()||null,
  };
  try{
    const url = id ? `${SB_URL}/rest/v1/animales?id=eq.${id}` : `${SB_URL}/rest/v1/animales`;
    const res = await fetch(url,{
      method: id?'PATCH':'POST',
      headers: SB_HEADERS,
      body: JSON.stringify(payload)
    });
    if(!res.ok){ const err=await res.json(); throw new Error(err.message||err.details||'Error al guardar'); }
    cerrarModalAnimal();
    toast(id?'✅ Animal actualizado':'✅ Animal registrado');
    await cargarAnimales();
  }catch(e){
    errEl.textContent=e.message; errEl.style.display='block';
  }finally{
    btn.textContent=id?'💾 Actualizar':'💾 Guardar'; btn.disabled=false;
  }
}

/* ── Eliminar ── */
async function eliminarAnimal(id,arete){
  if(!confirm(`¿Eliminar animal "${arete}"? No se puede deshacer.`)) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/animales?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Animal eliminado');
    DB_ANIMALES=DB_ANIMALES.filter(a=>a.id!==id);
    renderAnimales(DB_ANIMALES);
  }catch(e){ toast('❌ '+e.message); }
}

/* ── Ver ── */
function verAnimal(id){
  const a=DB_ANIMALES.find(x=>x.id===id);
  if(!a) return;
  toast(`🐄 ${a.arete} — ${a.nombre||'Sin nombre'} | ${a.raza} | ${a.estado}`);
}

/* ══════════════════════════════════════════
   MÓDULO SALUD & VACUNAS — Supabase real
   ══════════════════════════════════════════ */

let DB_SALUD     = [];   // cache local de registros de salud
let _svFiltroQ   = '';   // búsqueda texto
let _svFiltroTab = '';   // tab activo: ''|'proxima'|'vencida'

/* ── helpers de fecha ── */
function calcEstadoVacuna(proxima_dosis){
  if(!proxima_dosis) return 'aplicado';
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const prox = new Date(proxima_dosis + 'T00:00:00');
  const diff = Math.ceil((prox - hoy) / 86400000);
  if(diff < 0)  return 'vencida';
  if(diff <= 30) return 'proxima';
  return 'aplicado';
}

/* ── Cargar salud desde Supabase ── */
async function cargarSalud(){
  if(!SESSION?.rancho_id){
    _svRenderTabla([]);
    return;
  }
  /* Mostrar loading */
  const tbody = document.getElementById('sv-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';

  try{
    const res = await fetch(
      `${SB_URL}/rest/v1/salud?rancho_id=eq.${SESSION.rancho_id}&select=*&order=created_at.desc`,
      {headers: SB_HEADERS}
    );
    const data = await res.json();
    DB_SALUD = Array.isArray(data) ? data : [];
    _svRenderTabla(DB_SALUD);
  }catch(e){
    console.error('[Salud]', e);
    const tbody = document.getElementById('sv-tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:#e53e3e;">❌ Error al cargar</td></tr>';
  }
}

/* ── Renderizar tabla salud ── */
function _svRenderTabla(lista){
  /* Asegurar que el tbody tenga id */
  let tbody = document.getElementById('sv-tbody');
  if(!tbody){
    const tbl = document.querySelector('#sec-salud .sv-tbl tbody');
    if(tbl){ tbl.id = 'sv-tbody'; tbody = tbl; }
    else return;
  }

  /* Filtros */
  let filtrada = lista;
  if(_svFiltroTab === 'proxima')  filtrada = filtrada.filter(r => calcEstadoVacuna(r.proxima_dosis) === 'proxima');
  if(_svFiltroTab === 'vencida')  filtrada = filtrada.filter(r => calcEstadoVacuna(r.proxima_dosis) === 'vencida');
  if(_svFiltroQ){
    const q = _svFiltroQ.toLowerCase();
    filtrada = filtrada.filter(r =>
      (r.animal||'').toLowerCase().includes(q) ||
      (r.tipo||'').toLowerCase().includes(q)   ||
      (r.descripcion||'').toLowerCase().includes(q)
    );
  }

  /* Stats */
  const total   = lista.length;
  const aplicado = lista.filter(r => calcEstadoVacuna(r.proxima_dosis) === 'aplicado').length;
  const proximas = lista.filter(r => calcEstadoVacuna(r.proxima_dosis) === 'proxima').length;
  const vencidas = lista.filter(r => calcEstadoVacuna(r.proxima_dosis) === 'vencida').length;
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('sv-stat-total',    total);
  set('sv-stat-aplicadas',aplicado);
  set('sv-stat-proximas', proximas);
  set('sv-stat-vencidas', vencidas);
  set('sv-tab-cnt-0', total);
  set('sv-tab-cnt-1', proximas);
  set('sv-tab-cnt-2', vencidas);

  if(!filtrada.length){
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_svFiltroTab||_svFiltroQ ? '🔍 Sin resultados.' : '💉 Sin registros de salud. ¡Agrega el primero!'}
    </td></tr>`;
    return;
  }

  const badgeSt = e => {
    if(e==='vencida') return '<span class="sv-estado-badge sv-est-vencida">● Vencida</span>';
    if(e==='proxima') return '<span class="sv-estado-badge sv-est-proxima">● Próxima</span>';
    return '<span class="sv-estado-badge sv-est-aplicado">● Aplicado</span>';
  };

  tbody.innerHTML = filtrada.map(r => {
    const estado = calcEstadoVacuna(r.proxima_dosis);
    const animal = DB_ANIMALES.find(a => a.arete === r.animal) || {};
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${animal.foto
            ? `<img class="sv-animal-foto" src="${escH(animal.foto)}">`
            : `<div style="width:40px;height:40px;border-radius:9px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:18px;">🐄</div>`
          }
          <div>
            <div class="sv-animal-id">${escH(r.animal||'—')}</div>
            <div class="sv-animal-sub">${escH(animal.raza||animal.nombre||'')}</div>
          </div>
        </div>
      </td>
      <td><div class="sv-vacuna-nombre">${escH(r.tipo||'—')}</div></td>
      <td><div class="sv-vacuna-desc">${escH(r.descripcion||'—')}</div></td>
      <td>${r.fecha_aplicacion ? fmtFecha(r.fecha_aplicacion) : '—'}</td>
      <td>${r.proxima_dosis  ? fmtFecha(r.proxima_dosis)   : '—'}</td>
      <td>${escH(r.veterinario||'—')}</td>
      <td>${badgeSt(estado)}</td>
      <td>
        <div class="sv-acc">
          <button class="sv-acc-btn edit" title="Editar" onclick="editarSalud('${r.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="sv-acc-btn" title="Eliminar" onclick="eliminarSalud('${r.id}')" style="color:#E24B4A;">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Filtros tabs ── */
function svFiltrarTab(el, tipo){
  document.querySelectorAll('.sv-tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  _svFiltroTab = tipo;
  _svRenderTabla(DB_SALUD);
}
function svBuscar(q){ _svFiltroQ=q; _svRenderTabla(DB_SALUD); }

/* ══ MODAL SALUD — Individual y Masivo ══ */
function _crearModalSaludSiNoExiste(){
  if(document.getElementById('m-salud')) return;
  const div = document.createElement('div');
  div.innerHTML = `
  <div id="m-salud" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalSalud()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:93vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div id="m-salud-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">💉 Nuevo Registro</div>
        <button onclick="cerrarModalSalud()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>

      <!-- TABS Individual / Masivo -->
      <div style="display:flex;gap:8px;margin-bottom:18px;">
        <button id="sv-m-tab-ind" onclick="svModoTab('individual')" style="flex:1;padding:9px;border-radius:9px;border:1.5px solid #2E7DD6;background:#2E7DD6;color:#fff;font-size:12px;font-weight:700;cursor:pointer;">🐄 Individual</button>
        <button id="sv-m-tab-mas" onclick="svModoTab('masivo')"     style="flex:1;padding:9px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:12px;font-weight:700;cursor:pointer;">📋 Masivo (todo el ganado)</button>
      </div>

      <input type="hidden" id="m-salud-id">

      <!-- PANEL INDIVIDUAL -->
      <div id="sv-panel-individual">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div style="grid-column:1/-1;">
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Animal (Arete) *</label>
            <select id="sv-animal" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
              <option value="">Seleccionar animal...</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Tipo *</label>
            <select id="sv-tipo" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
              <option value="">Seleccionar...</option>
              <option>Vacuna</option><option>Antibiótico</option><option>Desparasitación</option>
              <option>Vitamina</option><option>Tratamiento</option><option>Otro</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Descripción *</label>
            <input id="sv-desc" type="text" placeholder="Ej: Aftosa, Brucelosis..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Dosis</label>
            <input id="sv-dosis" type="text" placeholder="Ej: 5ml" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha Aplicación *</label>
            <input id="sv-fecha-ap" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Próxima Dosis</label>
            <input id="sv-fecha-prox" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Veterinario</label>
            <input id="sv-vet" type="text" placeholder="Nombre del veterinario" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Costo (S/)</label>
            <input id="sv-costo" type="number" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div style="grid-column:1/-1;">
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
            <textarea id="sv-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
          </div>
        </div>
      </div>

      <!-- PANEL MASIVO -->
      <div id="sv-panel-masivo" style="display:none;">
        <div style="background:#f0f7ff;border-radius:10px;padding:12px 16px;margin-bottom:14px;font-size:13px;color:#2E7DD6;">
          📋 Se aplicará a <strong>todo tu ganado</strong> (<span id="sv-mas-count">0</span> animales).
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Tipo *</label>
            <select id="sv-mas-tipo" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
              <option value="">Seleccionar...</option>
              <option>Vacuna</option><option>Antibiótico</option><option>Desparasitación</option>
              <option>Vitamina</option><option>Tratamiento</option><option>Otro</option>
            </select>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Descripción *</label>
            <input id="sv-mas-desc" type="text" placeholder="Ej: Aftosa, Brucelosis..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Dosis</label>
            <input id="sv-mas-dosis" type="text" placeholder="Ej: 5ml" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha Aplicación *</label>
            <input id="sv-mas-fecha-ap" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Próxima Dosis</label>
            <input id="sv-mas-fecha-prox" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Veterinario</label>
            <input id="sv-mas-vet" type="text" placeholder="Nombre del veterinario" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Costo por animal (S/)</label>
            <input id="sv-mas-costo" type="number" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
          </div>
          <div style="grid-column:1/-1;">
            <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
            <textarea id="sv-mas-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
          </div>
        </div>
        <!-- Lista animales -->
        <div style="margin-top:12px;border:1px solid #E0E8F4;border-radius:9px;max-height:160px;overflow-y:auto;" id="sv-mas-lista"></div>
      </div>

      <div id="m-salud-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalSalud()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarSalud()" id="m-salud-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#2E7DD6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

/* ── Tabs individual / masivo ── */
let _svModo = 'individual';
function svModoTab(modo){
  _svModo = modo;
  const ind = document.getElementById('sv-panel-individual');
  const mas = document.getElementById('sv-panel-masivo');
  const tInd = document.getElementById('sv-m-tab-ind');
  const tMas = document.getElementById('sv-m-tab-mas');
  const esInd = modo === 'individual';
  ind.style.display = esInd ? 'block' : 'none';
  mas.style.display = esInd ? 'none'  : 'block';
  tInd.style.background    = esInd ? '#2E7DD6' : '#fff';
  tInd.style.color         = esInd ? '#fff'    : '#5A6A85';
  tInd.style.borderColor   = esInd ? '#2E7DD6' : '#E0E8F4';
  tMas.style.background    = esInd ? '#fff'    : '#2E7DD6';
  tMas.style.color         = esInd ? '#5A6A85' : '#fff';
  tMas.style.borderColor   = esInd ? '#E0E8F4' : '#2E7DD6';
  if(!esInd) _svCargarListaMasiva();
}

/* ── Cargar lista de animales en modo masivo ── */
function _svCargarListaMasiva(){
  const cnt = document.getElementById('sv-mas-count');
  const lista = document.getElementById('sv-mas-lista');
  const animales = DB_ANIMALES.filter(a => a.estado !== 'Muerto' && a.estado !== 'Vendido');
  if(cnt) cnt.textContent = animales.length;
  if(!lista) return;
  if(!animales.length){
    lista.innerHTML = '<div style="padding:16px;text-align:center;color:#8FA3BF;font-size:13px;">Sin animales activos registrados.</div>';
    return;
  }
  lista.innerHTML = animales.map(a => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #F0F4FA;">
      <div style="width:8px;height:8px;border-radius:50%;background:#22C55E;flex-shrink:0;"></div>
      <div style="font-weight:600;color:#0D2B6B;font-size:13px;">${escH(a.arete||'')} ${a.nombre?'— '+escH(a.nombre):''}</div>
      <div style="font-size:11px;color:#8FA3BF;margin-left:auto;">${escH(a.raza||'')} · ${a.sexo||''}</div>
    </div>`).join('');
}

/* ── Poblar select de animales ── */
function _svPoblarSelectAnimal(){
  const sel = document.getElementById('sv-animal');
  if(!sel) return;
  const animales = DB_ANIMALES.filter(a => a.estado !== 'Muerto' && a.estado !== 'Vendido');
  sel.innerHTML = '<option value="">Seleccionar animal...</option>' +
    animales.map(a => `<option value="${escH(a.arete)}">${escH(a.arete)} ${a.nombre?'— '+escH(a.nombre):''} (${escH(a.raza||'')})</option>`).join('');
}

/* ── Abrir modal ── */
function abrirModalSalud(){
  _crearModalSaludSiNoExiste();
  _svModo = 'individual';
  document.getElementById('m-salud-id').value = '';
  document.getElementById('m-salud-titulo').textContent = '💉 Nuevo Registro';
  document.getElementById('m-salud-btn').textContent = '💾 Guardar';
  document.getElementById('m-salud-error').style.display = 'none';
  ['sv-animal','sv-tipo','sv-desc','sv-dosis','sv-fecha-ap','sv-fecha-prox','sv-vet','sv-costo','sv-obs']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  // Resetear tabs
  svModoTab('individual');
  _svPoblarSelectAnimal();
  // Fecha hoy por defecto
  const hoy = new Date().toISOString().split('T')[0];
  const fechaEl = document.getElementById('sv-fecha-ap');
  if(fechaEl) fechaEl.value = hoy;
  document.getElementById('m-salud').style.display = 'flex';
}

/* ── Abrir modal masivo directo ── */
function abrirModalSaludMasivo(){
  abrirModalSalud();
  setTimeout(() => svModoTab('masivo'), 50);
}

function cerrarModalSalud(){ document.getElementById('m-salud').style.display='none'; }

/* ── Editar ── */
function editarSalud(id){
  const r = DB_SALUD.find(x => x.id === id);
  if(!r) return;
  _crearModalSaludSiNoExiste();
  svModoTab('individual');
  _svPoblarSelectAnimal();
  document.getElementById('m-salud-id').value       = r.id;
  document.getElementById('m-salud-titulo').textContent = '✏️ Editar Registro';
  document.getElementById('m-salud-btn').textContent    = '💾 Actualizar';
  document.getElementById('sv-animal').value            = r.animal        || '';
  document.getElementById('sv-tipo').value              = r.tipo          || '';
  document.getElementById('sv-desc').value              = r.descripcion   || '';
  document.getElementById('sv-dosis').value             = r.dosis         || '';
  document.getElementById('sv-fecha-ap').value          = r.fecha_aplicacion || '';
  document.getElementById('sv-fecha-prox').value        = r.proxima_dosis || '';
  document.getElementById('sv-vet').value               = r.veterinario   || '';
  document.getElementById('sv-costo').value             = r.costo         || '';
  document.getElementById('sv-obs').value               = r.observaciones || '';
  document.getElementById('m-salud-error').style.display = 'none';
  document.getElementById('m-salud').style.display = 'flex';
}

/* ── Guardar (individual o masivo) ── */
async function guardarSalud(){
  const errEl = document.getElementById('m-salud-error');
  errEl.style.display = 'none';
  const btn = document.getElementById('m-salud-btn');
  btn.textContent = '⏳ Guardando...'; btn.disabled = true;

  try{
    if(_svModo === 'masivo'){
      await _guardarSaludMasivo();
    } else {
      await _guardarSaludIndividual();
    }
    cerrarModalSalud();
    await cargarSalud();
  }catch(e){
    errEl.textContent = e.message;
    errEl.style.display = 'block';
  }finally{
    btn.textContent = '💾 Guardar'; btn.disabled = false;
  }
}

/* ── Guardar individual ── */
async function _guardarSaludIndividual(){
  const id     = document.getElementById('m-salud-id').value;
  const animal = document.getElementById('sv-animal').value;
  const tipo   = document.getElementById('sv-tipo').value;
  const desc   = document.getElementById('sv-desc').value.trim();
  const fecha  = document.getElementById('sv-fecha-ap').value;
  if(!animal || !tipo || !desc || !fecha)
    throw new Error('Animal, tipo, descripción y fecha son obligatorios.');

  const payload = {
    rancho_id:        SESSION.rancho_id,
    animal,
    tipo,
    descripcion:      desc,
    dosis:            document.getElementById('sv-dosis').value.trim()     || null,
    fecha_aplicacion: fecha,
    proxima_dosis:    document.getElementById('sv-fecha-prox').value       || null,
    veterinario:      document.getElementById('sv-vet').value.trim()       || null,
    costo:            parseFloat(document.getElementById('sv-costo').value)|| null,
    observaciones:    document.getElementById('sv-obs').value.trim()       || null,
  };

  const url = id
    ? `${SB_URL}/rest/v1/salud?id=eq.${id}`
    : `${SB_URL}/rest/v1/salud`;
  const res = await fetch(url,{
    method: id ? 'PATCH' : 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(payload)
  });
  if(!res.ok){ const e=await res.json(); throw new Error(e.message||e.details||'Error al guardar'); }
  toast(id ? '✅ Registro actualizado' : '✅ Registro guardado');
}

/* ── Guardar masivo ── */
async function _guardarSaludMasivo(){
  const tipo   = document.getElementById('sv-mas-tipo').value;
  const desc   = document.getElementById('sv-mas-desc').value.trim();
  const fecha  = document.getElementById('sv-mas-fecha-ap').value;
  if(!tipo || !desc || !fecha)
    throw new Error('Tipo, descripción y fecha son obligatorios.');

  const animales = DB_ANIMALES.filter(a => a.estado !== 'Muerto' && a.estado !== 'Vendido');
  if(!animales.length) throw new Error('No hay animales activos en tu ganadería.');

  const rows = animales.map(a => ({
    rancho_id:        SESSION.rancho_id,
    animal:           a.arete,
    tipo,
    descripcion:      desc,
    dosis:            document.getElementById('sv-mas-dosis').value.trim()     || null,
    fecha_aplicacion: fecha,
    proxima_dosis:    document.getElementById('sv-mas-fecha-prox').value       || null,
    veterinario:      document.getElementById('sv-mas-vet').value.trim()       || null,
    costo:            parseFloat(document.getElementById('sv-mas-costo').value)|| null,
    observaciones:    document.getElementById('sv-mas-obs').value.trim()       || null,
  }));

  const res = await fetch(`${SB_URL}/rest/v1/salud`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(rows)
  });
  if(!res.ok){ const e=await res.json(); throw new Error(e.message||e.details||'Error al guardar masivo'); }
  toast(`✅ Aplicado a ${animales.length} animales`);
}

/* ── Eliminar ── */
async function eliminarSalud(id){
  if(!confirm('¿Eliminar este registro de salud?')) return;
  try{
    const res = await fetch(`${SB_URL}/rest/v1/salud?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Registro eliminado');
    DB_SALUD = DB_SALUD.filter(r => r.id !== id);
    _svRenderTabla(DB_SALUD);
  }catch(e){ toast('❌ '+e.message); }
}

/* ══════════════════════════════════════════
   MÓDULO INSEMINACIÓN — Supabase real
   ══════════════════════════════════════════ */

let DB_INSEM    = [];
let _inFiltroQ  = '';
let _inFiltroEst= '';   // ''|'Pendiente'|'Preñada'|'Fallida'

/* ── Cargar inseminaciones ── */
async function cargarInsem(){
  if(!SESSION?.rancho_id){ _inRenderTabla([]); return; }
  const tbody = document.getElementById('in-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';
  try{
    const res = await fetch(
      `${SB_URL}/rest/v1/insem?rancho_id=eq.${SESSION.rancho_id}&select=*&order=created_at.desc`,
      {headers:SB_HEADERS}
    );
    const data = await res.json();
    DB_INSEM = Array.isArray(data) ? data : [];
    _inRenderTabla(DB_INSEM);
  }catch(e){
    console.error('[Insem]',e);
    const tb=document.getElementById('in-tbody');
    if(tb) tb.innerHTML='<tr><td colspan="9" style="text-align:center;padding:30px;color:#e53e3e;">❌ Error al cargar</td></tr>';
  }
}

/* ── Renderizar tabla ── */
function _inRenderTabla(lista){
  let tbody = document.getElementById('in-tbody');
  if(!tbody){
    const t=document.querySelector('#sec-insem .in-tbl tbody');
    if(t){ t.id='in-tbody'; tbody=t; } else return;
  }

  let filtrada = lista;
  if(_inFiltroEst) filtrada = filtrada.filter(r=>r.resultado===_inFiltroEst);
  if(_inFiltroQ){
    const q=_inFiltroQ.toLowerCase();
    filtrada = filtrada.filter(r=>
      (r.hembra||'').toLowerCase().includes(q)||
      (r.toro_semen||'').toLowerCase().includes(q)||
      (r.tecnico||'').toLowerCase().includes(q)
    );
  }

  /* Stats */
  const total    = lista.length;
  const pendiente= lista.filter(r=>r.resultado==='Pendiente'||!r.resultado).length;
  const prenada  = lista.filter(r=>r.resultado==='Preñada').length;
  const fallida  = lista.filter(r=>r.resultado==='Fallida').length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('in-stat-total',    total);
  set('in-stat-pendiente',pendiente);
  set('in-stat-prenada',  prenada);
  set('in-stat-fallida',  fallida);

  if(!filtrada.length){
    tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_inFiltroEst||_inFiltroQ?'🔍 Sin resultados.':'🔬 Sin registros de inseminación. ¡Agrega el primero!'}
    </td></tr>`;
    return;
  }

  const badge=r=>{
    const res=r.resultado||'Pendiente';
    if(res==='Preñada')  return '<span class="in-est in-est-prenada">✅ Preñada</span>';
    if(res==='Fallida')  return '<span class="in-est in-est-fallida">❌ Fallida</span>';
    return '<span class="in-est in-est-pendiente">⏳ Pendiente</span>';
  };

  tbody.innerHTML=filtrada.map(r=>{
    const animal=DB_ANIMALES.find(a=>a.arete===r.hembra)||{};
    return `<tr>
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td>
        <div style="display:flex;align-items:center;gap:9px;">
          ${animal.foto
            ?`<img class="in-hembra-foto" src="${escH(animal.foto)}">`
            :`<div style="width:38px;height:38px;border-radius:8px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:16px;">🐄</div>`}
          <div>
            <div class="in-hembra-id">${escH(r.hembra||'—')}</div>
            <div class="in-hembra-sub">${escH(animal.nombre||animal.raza||'')}</div>
          </div>
        </div>
      </td>
      <td>${r.fecha?fmtFecha(r.fecha):'—'}</td>
      <td>${escH(r.toro_semen||'—')}</td>
      <td>${escH(r.tecnica||'—')}</td>
      <td>${escH(r.tecnico||'—')}</td>
      <td>${r.parto_estimado?fmtFecha(r.parto_estimado):'—'}</td>
      <td>${badge(r)}</td>
      <td>
        <div class="in-acc">
          <button class="in-acc-btn edit" title="Editar" onclick="editarInsem('${r.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="in-acc-btn del" title="Eliminar" onclick="eliminarInsem('${r.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Filtros ── */
function inBuscar(q){ _inFiltroQ=q; _inRenderTabla(DB_INSEM); }
function inFiltrarEst(est){ _inFiltroEst=est; _inRenderTabla(DB_INSEM); }

/* ── Calcular parto estimado (283 días) ── */
function inCalcParto(){
  const f=document.getElementById('in-fecha')?.value;
  if(!f) return;
  const d=new Date(f+'T00:00:00');
  d.setDate(d.getDate()+283);
  const pEl=document.getElementById('in-parto-est');
  if(pEl) pEl.value=d.toISOString().split('T')[0];
}

/* ══ MODAL INSEMINACIÓN ══ */
function _crearModalInsemSiNoExiste(){
  if(document.getElementById('m-insem')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="m-insem" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalInsem()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:93vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-insem-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">🔬 Nueva Inseminación</div>
        <button onclick="cerrarModalInsem()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-insem-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Hembra (Arete) *</label>
          <select id="in-hembra" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar hembra...</option>
          </select>
          <div id="in-hembra-info" style="margin-top:5px;font-size:11px;color:#8FA3BF;padding-left:4px;"></div>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha Inseminación *</label>
          <input id="in-fecha" type="date" onchange="inCalcParto()" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Parto Estimado</label>
          <input id="in-parto-est" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#f8fafc;" readonly>
          <div style="font-size:10px;color:#8FA3BF;margin-top:3px;">Se calcula automáticamente (+283 días)</div>
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Toro / Semen *</label>
          <input id="in-toro" type="text" placeholder="Nombre o código del toro/semen" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Técnica</label>
          <select id="in-tecnica" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option>Inseminación Artificial (IA)</option>
            <option>Monta Natural</option>
            <option>Transferencia Embrionaria (TE)</option>
            <option>IATF (Tiempo Fijo)</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Técnico / Veterinario</label>
          <input id="in-tecnico" type="text" placeholder="Nombre del técnico" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Resultado</label>
          <select id="in-resultado" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="Pendiente">⏳ Pendiente</option>
            <option value="Preñada">✅ Preñada</option>
            <option value="Fallida">❌ Fallida</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Costo (S/)</label>
          <input id="in-costo" type="number" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
          <textarea id="in-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>
      </div>

      <div id="m-insem-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalInsem()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarInsem()" id="m-insem-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#22C55E;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

/* ── Poblar select hembras ── */
function _inPoblarHembras(){
  const sel=document.getElementById('in-hembra');
  if(!sel) return;
  const hembras=DB_ANIMALES.filter(a=>a.sexo==='Hembra'&&a.estado!=='Muerto'&&a.estado!=='Vendido');
  sel.innerHTML='<option value="">Seleccionar hembra...</option>'+
    hembras.map(a=>`<option value="${escH(a.arete)}">${escH(a.arete)} ${a.nombre?'— '+escH(a.nombre):''} (${escH(a.raza||'')})</option>`).join('');
  // Mostrar info al seleccionar
  sel.onchange=()=>{
    const a=DB_ANIMALES.find(x=>x.arete===sel.value);
    const info=document.getElementById('in-hembra-info');
    if(info) info.textContent=a?`Raza: ${a.raza||'—'} · Estado: ${a.estado||'—'} · Peso: ${a.peso?a.peso+' kg':'—'}`:'';
  };
}

/* ── Abrir modal ── */
function abrirModalInsem(){
  _crearModalInsemSiNoExiste();
  document.getElementById('m-insem-id').value='';
  document.getElementById('m-insem-titulo').textContent='🔬 Nueva Inseminación';
  document.getElementById('m-insem-btn').textContent='💾 Guardar';
  ['in-hembra','in-tecnica','in-resultado'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['in-fecha','in-parto-est','in-toro','in-tecnico','in-costo','in-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('in-resultado').value='Pendiente';
  document.getElementById('m-insem-error').style.display='none';
  const hoy=new Date().toISOString().split('T')[0];
  document.getElementById('in-fecha').value=hoy;
  inCalcParto();
  _inPoblarHembras();
  document.getElementById('m-insem').style.display='flex';
}
function cerrarModalInsem(){ document.getElementById('m-insem').style.display='none'; }

/* ── Editar ── */
function editarInsem(id){
  const r=DB_INSEM.find(x=>x.id===id);
  if(!r) return;
  _crearModalInsemSiNoExiste();
  _inPoblarHembras();
  document.getElementById('m-insem-id').value        = r.id;
  document.getElementById('m-insem-titulo').textContent='✏️ Editar Inseminación';
  document.getElementById('m-insem-btn').textContent ='💾 Actualizar';
  document.getElementById('in-hembra').value         = r.hembra          ||'';
  document.getElementById('in-fecha').value          = r.fecha            ||'';
  document.getElementById('in-parto-est').value      = r.parto_estimado   ||'';
  document.getElementById('in-toro').value           = r.toro_semen       ||'';
  document.getElementById('in-tecnica').value        = r.tecnica          ||'';
  document.getElementById('in-tecnico').value        = r.tecnico          ||'';
  document.getElementById('in-resultado').value      = r.resultado        ||'Pendiente';
  document.getElementById('in-costo').value          = r.costo            ||'';
  document.getElementById('in-obs').value            = r.observaciones    ||'';
  document.getElementById('m-insem-error').style.display='none';
  // Disparar info de hembra
  const info=document.getElementById('in-hembra-info');
  const a=DB_ANIMALES.find(x=>x.arete===r.hembra);
  if(info&&a) info.textContent=`Raza: ${a.raza||'—'} · Estado: ${a.estado||'—'} · Peso: ${a.peso?a.peso+' kg':'—'}`;
  document.getElementById('m-insem').style.display='flex';
}

/* ── Guardar ── */
async function guardarInsem(){
  const id      = document.getElementById('m-insem-id').value;
  const hembra  = document.getElementById('in-hembra').value;
  const fecha   = document.getElementById('in-fecha').value;
  const toro    = document.getElementById('in-toro').value.trim();
  const errEl   = document.getElementById('m-insem-error');
  errEl.style.display='none';
  if(!hembra||!fecha||!toro){
    errEl.textContent='Hembra, fecha y toro/semen son obligatorios.';
    errEl.style.display='block'; return;
  }
  const btn=document.getElementById('m-insem-btn');
  btn.textContent='⏳ Guardando...'; btn.disabled=true;

  const payload={
    rancho_id:       SESSION.rancho_id,
    hembra,
    fecha,
    toro_semen:      toro,
    tecnica:         document.getElementById('in-tecnica').value  ||null,
    tecnico:         document.getElementById('in-tecnico').value.trim()||null,
    parto_estimado:  document.getElementById('in-parto-est').value||null,
    resultado:       document.getElementById('in-resultado').value||'Pendiente',
    costo:           parseFloat(document.getElementById('in-costo').value)||null,
    observaciones:   document.getElementById('in-obs').value.trim()||null,
  };

  try{
    const url=id?`${SB_URL}/rest/v1/insem?id=eq.${id}`:`${SB_URL}/rest/v1/insem`;
    const res=await fetch(url,{method:id?'PATCH':'POST',headers:SB_HEADERS,body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}

    /* Si resultado es Preñada → actualizar estado de la hembra */
    if(payload.resultado==='Preñada'){
      const anim=DB_ANIMALES.find(a=>a.arete===hembra);
      if(anim&&anim.estado!=='Gestante'){
        await fetch(`${SB_URL}/rest/v1/animales?id=eq.${anim.id}`,{
          method:'PATCH', headers:SB_HEADERS, body:JSON.stringify({estado:'Gestante'})
        });
        anim.estado='Gestante';
        toast(`🐄 ${hembra} marcada como Gestante`);
      }
    }

    cerrarModalInsem();
    toast(id?'✅ Inseminación actualizada':'✅ Inseminación registrada');
    await cargarInsem();
  }catch(e){
    errEl.textContent=e.message; errEl.style.display='block';
  }finally{
    btn.textContent=id?'💾 Actualizar':'💾 Guardar'; btn.disabled=false;
  }
}

/* ── Eliminar ── */
async function eliminarInsem(id){
  if(!confirm('¿Eliminar este registro de inseminación?')) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/insem?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Registro eliminado');
    DB_INSEM=DB_INSEM.filter(r=>r.id!==id);
    _inRenderTabla(DB_INSEM);
  }catch(e){ toast('❌ '+e.message); }
}

/* ══════════════════════════════════════════
   MÓDULO PARTOS — Supabase real
   ══════════════════════════════════════════ */

let DB_PARTOS   = [];
let _ptFiltroQ  = '';
let _ptFiltroSx = '';  // ''|'Hembra'|'Macho'
let _ptFiltroEst= '';  // ''|'Vivo'|'Muerto'

/* ── Cargar partos ── */
async function cargarPartos(){
  if(!SESSION?.rancho_id){ _ptRenderTabla([]); return; }
  const tbody=document.getElementById('pt-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="11" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';
  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/partos?rancho_id=eq.${SESSION.rancho_id}&select=*&order=created_at.desc`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    DB_PARTOS=Array.isArray(data)?data:[];
    _ptRenderTabla(DB_PARTOS);
  }catch(e){
    console.error('[Partos]',e);
    const tb=document.getElementById('pt-tbody');
    if(tb) tb.innerHTML='<tr><td colspan="11" style="text-align:center;padding:30px;color:#e53e3e;">❌ Error al cargar</td></tr>';
  }
}

/* ── Renderizar ── */
function _ptRenderTabla(lista){
  let tbody=document.getElementById('pt-tbody');
  if(!tbody){
    const t=document.querySelector('#sec-partos .pt-tbl tbody');
    if(t){ t.id='pt-tbody'; tbody=t; } else return;
  }

  let filtrada=lista;
  if(_ptFiltroSx)  filtrada=filtrada.filter(r=>r.sexo_cria===_ptFiltroSx);
  if(_ptFiltroEst) filtrada=filtrada.filter(r=>r.estado_cria===_ptFiltroEst);
  if(_ptFiltroQ){
    const q=_ptFiltroQ.toLowerCase();
    filtrada=filtrada.filter(r=>
      (r.madre||'').toLowerCase().includes(q)||
      (r.arete_cria||'').toLowerCase().includes(q)||
      (r.padre||'').toLowerCase().includes(q)
    );
  }

  /* Stats */
  const total   = lista.length;
  const hembras = lista.filter(r=>r.sexo_cria==='Hembra').length;
  const machos  = lista.filter(r=>r.sexo_cria==='Macho').length;
  const anyo    = lista.filter(r=>r.fecha&&r.fecha.startsWith(new Date().getFullYear()+'')).length;
  const pctH    = total ? Math.round(hembras/total*100) : 0;
  const pctM    = total ? Math.round(machos/total*100)  : 0;

  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('pt-stat-total',   total);
  set('pt-stat-hembras', hembras);
  set('pt-stat-machos',  machos);
  set('pt-stat-anyo',    anyo);
  set('pt-stat-pct-h',   pctH+'%');
  set('pt-stat-pct-m',   pctM+'%');
  // barras
  const bH=document.getElementById('pt-bar-h'); if(bH) bH.style.width=pctH+'%';
  const bM=document.getElementById('pt-bar-m'); if(bM) bM.style.width=pctM+'%';
  // contador
  const cnt=document.querySelector('.pt-sec-count');
  if(cnt) cnt.textContent=`Mostrando ${filtrada.length} de ${total} registros`;

  if(!filtrada.length){
    tbody.innerHTML=`<tr><td colspan="11" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_ptFiltroQ||_ptFiltroSx||_ptFiltroEst?'🔍 Sin resultados.':'🐣 Sin partos registrados. ¡Agrega el primero!'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML=filtrada.map(r=>{
    const madre=DB_ANIMALES.find(a=>a.arete===r.madre)||{};
    const sexoHtml = r.sexo_cria==='Hembra'
      ? '<div class="pt-sexo-h">♀ Hembra</div>'
      : r.sexo_cria==='Macho'
        ? '<div class="pt-sexo-m">♂ Macho</div>'
        : '<div class="pt-sexo-nd">N/D</div>';
    const estHtml = r.estado_cria==='Muerto'
      ? '<span style="background:#FCEBEB;color:#A32D2D;display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;">💀 Muerto</span>'
      : '<span class="pt-est-vivo">✅ Vivo</span>';
    return `<tr>
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><strong>${r.fecha?fmtFecha(r.fecha):'—'}</strong></td>
      <td>${madre.foto
        ?`<img class="pt-cria-foto" src="${escH(madre.foto)}">`
        :`<div style="width:38px;height:38px;border-radius:8px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:16px;">🐄</div>`}
      </td>
      <td><span class="pt-madre-id">${escH(r.madre||'—')}</span>${madre.nombre?`<div style="font-size:10px;color:#8FA3BF;">${escH(madre.nombre)}</div>`:''}</td>
      <td><strong style="color:#22C55E;">${escH(r.arete_cria||'—')}</strong></td>
      <td>${sexoHtml}</td>
      <td>${r.peso_nacimiento?r.peso_nacimiento+' kg':'—'}</td>
      <td>${escH(r.tipo_parto||'Natural')}</td>
      <td>${estHtml}</td>
      <td style="font-size:11px;color:#8FA3BF;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escH(r.observaciones||'—')}</td>
      <td>
        <div class="pt-acc">
          <button class="pt-acc-btn edit" title="Editar" onclick="editarParto('${r.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="pt-acc-btn del" title="Eliminar" onclick="eliminarParto('${r.id}')">
            <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

/* ── Filtros ── */
function ptBuscar(q){ _ptFiltroQ=q; _ptRenderTabla(DB_PARTOS); }
function ptFiltrarSexo(v){ _ptFiltroSx=v; _ptRenderTabla(DB_PARTOS); }
function ptFiltrarEstado(v){ _ptFiltroEst=v; _ptRenderTabla(DB_PARTOS); }

/* ══ MODAL PARTOS ══ */
function _crearModalPartosSiNoExiste(){
  if(document.getElementById('m-parto')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="m-parto" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalParto()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:93vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-parto-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">🐣 Registrar Parto</div>
        <button onclick="cerrarModalParto()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-parto-id">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Madre (Arete) *</label>
          <select id="pt-madre" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar madre...</option>
          </select>
          <div id="pt-madre-info" style="margin-top:5px;font-size:11px;color:#8FA3BF;padding-left:4px;"></div>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha de Parto *</label>
          <input id="pt-fecha" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Tipo de Parto</label>
          <select id="pt-tipo" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="Natural">Natural</option>
            <option value="Asistido">Asistido</option>
            <option value="Cesárea">Cesárea</option>
            <option value="Aborto">Aborto</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Arete de la Cría</label>
          <input id="pt-arete-cria" type="text" placeholder="Ej: C-001" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Sexo de la Cría</label>
          <select id="pt-sexo-cria" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option value="Hembra">♀ Hembra</option>
            <option value="Macho">♂ Macho</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Peso al Nacer (kg)</label>
          <input id="pt-peso-nac" type="number" step="0.1" placeholder="0.0" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Padre (Toro)</label>
          <input id="pt-padre" type="text" placeholder="Arete o nombre del padre" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Estado de la Cría</label>
          <select id="pt-estado-cria" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="Vivo">✅ Vivo</option>
            <option value="Muerto">💀 Muerto</option>
          </select>
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
          <textarea id="pt-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>

        <!-- Opción de registrar cría como nuevo animal -->
        <div style="grid-column:1/-1;background:#f0f7ff;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:10px;">
          <input type="checkbox" id="pt-registrar-cria" style="width:16px;height:16px;cursor:pointer;">
          <label for="pt-registrar-cria" style="font-size:13px;font-weight:600;color:#2E7DD6;cursor:pointer;">
            🐄 Registrar la cría automáticamente como nuevo animal
          </label>
        </div>

      </div>

      <div id="m-parto-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalParto()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarParto()" id="m-parto-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#22C55E;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

/* ── Poblar select madres ── */
function _ptPoblarMadres(){
  const sel=document.getElementById('pt-madre');
  if(!sel) return;
  const hembras=DB_ANIMALES.filter(a=>a.sexo==='Hembra'&&a.estado!=='Muerto'&&a.estado!=='Vendido');
  sel.innerHTML='<option value="">Seleccionar madre...</option>'+
    hembras.map(a=>`<option value="${escH(a.arete)}">${escH(a.arete)} ${a.nombre?'— '+escH(a.nombre):''} (${escH(a.raza||'')})</option>`).join('');
  sel.onchange=()=>{
    const a=DB_ANIMALES.find(x=>x.arete===sel.value);
    const info=document.getElementById('pt-madre-info');
    if(info) info.textContent=a?`Raza: ${a.raza||'—'} · Estado: ${a.estado||'—'} · Peso: ${a.peso?a.peso+' kg':'—'}`:'';
  };
}

/* ── Abrir ── */
function abrirModalParto(){
  _crearModalPartosSiNoExiste();
  document.getElementById('m-parto-id').value='';
  document.getElementById('m-parto-titulo').textContent='🐣 Registrar Parto';
  document.getElementById('m-parto-btn').textContent='💾 Guardar';
  ['pt-fecha','pt-arete-cria','pt-peso-nac','pt-padre','pt-obs'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('pt-tipo').value='Natural';
  document.getElementById('pt-sexo-cria').value='';
  document.getElementById('pt-estado-cria').value='Vivo';
  document.getElementById('pt-registrar-cria').checked=true;
  document.getElementById('m-parto-error').style.display='none';
  document.getElementById('pt-fecha').value=new Date().toISOString().split('T')[0];
  _ptPoblarMadres();
  document.getElementById('m-parto').style.display='flex';
}
function cerrarModalParto(){ document.getElementById('m-parto').style.display='none'; }

/* ── Editar ── */
function editarParto(id){
  const r=DB_PARTOS.find(x=>x.id===id);
  if(!r) return;
  _crearModalPartosSiNoExiste();
  _ptPoblarMadres();
  document.getElementById('m-parto-id').value       = r.id;
  document.getElementById('m-parto-titulo').textContent='✏️ Editar Parto';
  document.getElementById('m-parto-btn').textContent='💾 Actualizar';
  document.getElementById('pt-madre').value         = r.madre          ||'';
  document.getElementById('pt-fecha').value         = r.fecha          ||'';
  document.getElementById('pt-tipo').value          = r.tipo_parto     ||'Natural';
  document.getElementById('pt-arete-cria').value    = r.arete_cria     ||'';
  document.getElementById('pt-sexo-cria').value     = r.sexo_cria      ||'';
  document.getElementById('pt-peso-nac').value      = r.peso_nacimiento||'';
  document.getElementById('pt-padre').value         = r.padre          ||'';
  document.getElementById('pt-estado-cria').value   = r.estado_cria    ||'Vivo';
  document.getElementById('pt-obs').value           = r.observaciones  ||'';
  document.getElementById('pt-registrar-cria').checked=false;
  document.getElementById('m-parto-error').style.display='none';
  const a=DB_ANIMALES.find(x=>x.arete===r.madre);
  const info=document.getElementById('pt-madre-info');
  if(info&&a) info.textContent=`Raza: ${a.raza||'—'} · Estado: ${a.estado||'—'}`;
  document.getElementById('m-parto').style.display='flex';
}

/* ── Guardar ── */
async function guardarParto(){
  const id          = document.getElementById('m-parto-id').value;
  const madre       = document.getElementById('pt-madre').value;
  const fecha       = document.getElementById('pt-fecha').value;
  const errEl       = document.getElementById('m-parto-error');
  errEl.style.display='none';
  if(!madre||!fecha){
    errEl.textContent='Madre y fecha son obligatorios.';
    errEl.style.display='block'; return;
  }
  const btn=document.getElementById('m-parto-btn');
  btn.textContent='⏳ Guardando...'; btn.disabled=true;

  const payload={
    rancho_id:       SESSION.rancho_id,
    madre,
    fecha,
    tipo_parto:      document.getElementById('pt-tipo').value          ||'Natural',
    arete_cria:      document.getElementById('pt-arete-cria').value.trim()||null,
    sexo_cria:       document.getElementById('pt-sexo-cria').value     ||null,
    peso_nacimiento: parseFloat(document.getElementById('pt-peso-nac').value)||null,
    padre:           document.getElementById('pt-padre').value.trim()  ||null,
    estado_cria:     document.getElementById('pt-estado-cria').value   ||'Vivo',
    observaciones:   document.getElementById('pt-obs').value.trim()    ||null,
  };
  const registrarCria = document.getElementById('pt-registrar-cria').checked;

  try{
    /* 1. Guardar parto */
    const url=id?`${SB_URL}/rest/v1/partos?id=eq.${id}`:`${SB_URL}/rest/v1/partos`;
    const res=await fetch(url,{method:id?'PATCH':'POST',headers:SB_HEADERS,body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}

    /* 2. Actualizar estado de la madre → Activo (ya parió) */
    if(!id){
      const madreAnim=DB_ANIMALES.find(a=>a.arete===madre);
      if(madreAnim&&madreAnim.estado==='Gestante'){
        await fetch(`${SB_URL}/rest/v1/animales?id=eq.${madreAnim.id}`,{
          method:'PATCH', headers:SB_HEADERS, body:JSON.stringify({estado:'Activo'})
        });
        madreAnim.estado='Activo';
        toast(`🐄 ${madre} actualizada a Activo`);
      }
    }

    /* 3. Registrar cría como nuevo animal si se marcó el checkbox */
    if(!id && registrarCria && payload.arete_cria && payload.estado_cria==='Vivo'){
      const madreAnim=DB_ANIMALES.find(a=>a.arete===madre);
      const criaPayload={
        rancho_id:  SESSION.rancho_id,
        arete:      payload.arete_cria,
        sexo:       payload.sexo_cria||null,
        raza:       madreAnim?.raza||null,
        nacimiento: fecha,
        peso:       payload.peso_nacimiento||null,
        madre:      madre,
        padre:      payload.padre||null,
        estado:     'Activo',
      };
      const criaRes=await fetch(`${SB_URL}/rest/v1/animales`,{
        method:'POST', headers:SB_HEADERS, body:JSON.stringify(criaPayload)
      });
      if(criaRes.ok) toast(`🐄 Cría ${payload.arete_cria} registrada como nuevo animal`);
    }

    cerrarModalParto();
    toast(id?'✅ Parto actualizado':'✅ Parto registrado');
    await cargarPartos();
    /* Recargar animales también */
    if(!id) await cargarAnimales().catch(()=>{});

  }catch(e){
    errEl.textContent=e.message; errEl.style.display='block';
  }finally{
    btn.textContent=id?'💾 Actualizar':'💾 Guardar'; btn.disabled=false;
  }
}

/* ── Eliminar ── */
async function eliminarParto(id){
  if(!confirm('¿Eliminar este registro de parto?')) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/partos?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Registro eliminado');
    DB_PARTOS=DB_PARTOS.filter(r=>r.id!==id);
    _ptRenderTabla(DB_PARTOS);
  }catch(e){ toast('❌ '+e.message); }
}

/* ══════════════════════════════════════════
   MÓDULO CALENDARIO — datos reales Supabase
   ══════════════════════════════════════════ */

let _calMes = new Date().getMonth();
let _calAno = new Date().getFullYear();

const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_ES  = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];

/* ── Inicializar: construir eventos de todos los módulos ── */
async function calInicializar(){
  /* Si no hay datos cargados aún, intentar cargar */
  if(!DB_INSEM.length && !DB_PARTOS.length && !DB_SALUD.length){
    if(SESSION?.rancho_id){
      const safeGet = async (tabla) => {
        try{
          const r=await fetch(`${SB_URL}/rest/v1/${tabla}?rancho_id=eq.${SESSION.rancho_id}&select=*`,{headers:SB_HEADERS});
          const d=await r.json(); return Array.isArray(d)?d:[];
        }catch(e){ return []; }
      };
      [DB_INSEM, DB_PARTOS, DB_SALUD] = await Promise.all([
        safeGet('insem'), safeGet('partos'), safeGet('salud')
      ]);
    }
  }
  calRenderMes();
  calRenderSidebar();
  calRenderResumen();
}

/* ── Navegar mes ── */
function calNavMes(dir){
  _calMes += dir;
  if(_calMes > 11){ _calMes=0; _calAno++; }
  if(_calMes <  0){ _calMes=11; _calAno--; }
  calRenderMes();
  calRenderSidebar();
}
function calHoy(){
  _calMes = new Date().getMonth();
  _calAno = new Date().getFullYear();
  calRenderMes();
  calRenderSidebar();
}

/* ── Construir mapa de eventos por fecha ── */
function calBuildEventos(){
  const map = {};   // { 'YYYY-MM-DD': [ {tipo, label, color, dot, animal} ] }
  const add = (fecha, ev) => {
    if(!fecha) return;
    const k = String(fecha).substring(0,10);
    if(!map[k]) map[k]=[];
    map[k].push(ev);
  };

  /* Inseminaciones */
  DB_INSEM.forEach(r=>{
    if(r.fecha) add(r.fecha,{
      tipo:'insem', dot:'insem', color:'#2E7DD6',
      label:`🔬 Insem: ${r.hembra||''}`, animal:r.hembra, sub:r.toro_semen||''
    });
    if(r.parto_estimado) add(r.parto_estimado,{
      tipo:'parto-est', dot:'parto-est', color:'#22C55E',
      label:`🐄 Parto est.: ${r.hembra||''}`, animal:r.hembra, sub:'Parto estimado'
    });
  });

  /* Partos registrados */
  DB_PARTOS.forEach(r=>{
    if(r.fecha) add(r.fecha,{
      tipo:'parto-reg', dot:'parto-reg', color:'#F0A500',
      label:`🐣 Parto: ${r.madre||''} → ${r.arete_cria||'cría'}`, animal:r.madre, sub:r.tipo_parto||'Natural'
    });
  });

  /* Salud / Vacunas */
  DB_SALUD.forEach(r=>{
    if(r.proxima_dosis) add(r.proxima_dosis,{
      tipo:'vacuna', dot:'vacuna', color:'#E24B4A',
      label:`💉 ${r.tipo||'Vacuna'}: ${r.animal||''}`, animal:r.animal, sub:r.descripcion||''
    });
  });

  return map;
}

/* ── Renderizar grid del mes ── */
function calRenderMes(){
  const titulo = document.getElementById('cal-mes-titulo');
  const grid   = document.getElementById('cal-grid');
  if(!titulo||!grid) return;

  titulo.textContent = MESES_ES[_calMes] + ' ' + _calAno;

  const hoy      = new Date();
  const eventos  = calBuildEventos();
  const primero  = new Date(_calAno, _calMes, 1);
  const ultimo   = new Date(_calAno, _calMes+1, 0).getDate();
  const diaInicio= primero.getDay(); // 0=Dom

  /* Días del mes anterior para completar */
  const diasAntMes = new Date(_calAno, _calMes, 0).getDate();

  let html='';

  /* Celdas del mes anterior */
  for(let i=diaInicio-1; i>=0; i--){
    html+=`<div class="cal-celda otro-mes"><div class="cal-num">${diasAntMes-i}</div></div>`;
  }

  /* Celdas del mes actual */
  for(let d=1; d<=ultimo; d++){
    const dateStr=`${_calAno}-${String(_calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = eventos[dateStr]||[];
    const esHoy = hoy.getDate()===d && hoy.getMonth()===_calMes && hoy.getFullYear()===_calAno;

    const dotsHtml = evs.slice(0,4).map(e=>`<div class="cal-dot ${e.dot}" title="${escH(e.label)}"></div>`).join('');
    const masHtml  = evs.length>4?`<div style="font-size:9px;color:#8FA3BF;">+${evs.length-4}</div>`:'';

    html+=`<div class="cal-celda${esHoy?' hoy':''}" onclick="calMostrarDia('${dateStr}')">
      <div class="cal-num">${d}</div>
      <div class="cal-dots">${dotsHtml}${masHtml}</div>
    </div>`;
  }

  /* Celdas del mes siguiente */
  const totalCeldas = diaInicio + ultimo;
  const restantes   = totalCeldas%7===0 ? 0 : 7-(totalCeldas%7);
  for(let i=1; i<=restantes; i++){
    html+=`<div class="cal-celda otro-mes"><div class="cal-num">${i}</div></div>`;
  }

  grid.innerHTML=html;
}

/* ── Mostrar popup de eventos del día ── */
function calMostrarDia(dateStr){
  const eventos = calBuildEventos();
  const evs = eventos[dateStr]||[];
  if(!evs.length) return;

  const fecha = new Date(dateStr+'T12:00:00');
  const label = fecha.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

  /* Reusar modal genérico o crear uno simple */
  let popup = document.getElementById('cal-popup');
  if(!popup){
    const div=document.createElement('div');
    div.innerHTML=`<div id="cal-popup" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)document.getElementById('cal-popup').style.display='none'">
      <div style="background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:80vh;overflow-y:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div id="cal-popup-titulo" style="font-family:'Montserrat',sans-serif;font-size:15px;font-weight:700;color:#0D2B6B;"></div>
          <button onclick="document.getElementById('cal-popup').style.display='none'" style="background:none;border:none;font-size:24px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
        </div>
        <div id="cal-popup-body"></div>
      </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);
    popup=document.getElementById('cal-popup');
  }

  document.getElementById('cal-popup-titulo').textContent='📅 '+label;
  document.getElementById('cal-popup-body').innerHTML=evs.map(e=>{
    const animal=DB_ANIMALES.find(a=>a.arete===e.animal)||{};
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #F0F4FA;">
      ${animal.foto
        ?`<img src="${escH(animal.foto)}" style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;">`
        :`<div style="width:40px;height:40px;border-radius:8px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🐄</div>`}
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;color:${e.color};">${escH(e.label)}</div>
        <div style="font-size:11px;color:#8FA3BF;margin-top:2px;">${escH(e.sub)}</div>
      </div>
      <div style="width:10px;height:10px;border-radius:50%;background:${e.color};flex-shrink:0;"></div>
    </div>`;
  }).join('');

  popup.style.display='flex';
}

/* ── Sidebar: Próximos eventos ── */
function calRenderSidebar(){
  const side=document.querySelector('.cal-side');
  if(!side) return;

  const hoy=new Date(); hoy.setHours(0,0,0,0);
  const en60=new Date(hoy); en60.setDate(en60.getDate()+60);

  /* Recolectar eventos futuros */
  const eventos=[];
  DB_INSEM.forEach(r=>{
    if(r.parto_estimado){
      const d=new Date(r.parto_estimado+'T12:00:00');
      if(d>=hoy&&d<=en60) eventos.push({fecha:r.parto_estimado,tipo:'parto-est',color:'#22C55E',
        titulo:`Parto est.: ${r.hembra||''}`,sub:`Toro: ${r.toro_semen||'—'}`,animal:r.hembra});
    }
  });
  DB_SALUD.forEach(r=>{
    if(r.proxima_dosis){
      const d=new Date(r.proxima_dosis+'T12:00:00');
      if(d>=hoy&&d<=en60) eventos.push({fecha:r.proxima_dosis,tipo:'vacuna',color:'#E24B4A',
        titulo:`${r.tipo||'Vacuna'}: ${r.animal||''}`,sub:r.descripcion||'',animal:r.animal});
    }
  });
  DB_INSEM.forEach(r=>{
    if(r.fecha){
      const d=new Date(r.fecha+'T12:00:00');
      if(d>=hoy&&d<=en60) eventos.push({fecha:r.fecha,tipo:'insem',color:'#2E7DD6',
        titulo:`Insem.: ${r.hembra||''}`,sub:`Toro: ${r.toro_semen||'—'}`,animal:r.hembra});
    }
  });

  /* Ordenar por fecha */
  eventos.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));

  /* Reemplazar contenido del sidebar manteniendo el header */
  const hdr=side.querySelector('.cal-side-hdr');
  const hdrHtml=hdr?hdr.outerHTML:'';

  if(!eventos.length){
    side.innerHTML=hdrHtml+`<div style="text-align:center;padding:30px 16px;color:#8FA3BF;font-size:13px;">✅ Sin eventos próximos en los siguientes 60 días.</div>`;
    return;
  }

  const itemsHtml=eventos.slice(0,10).map(ev=>{
    const animal=DB_ANIMALES.find(a=>a.arete===ev.animal)||{};
    const d=new Date(ev.fecha+'T12:00:00');
    const diffDias=Math.ceil((d-hoy)/86400000);
    const diffLabel=diffDias===0?'Hoy':diffDias===1?'Mañana':`En ${diffDias} días`;
    return `<div class="cal-ev-item">
      ${animal.foto
        ?`<img class="cal-ev-foto" src="${escH(animal.foto)}">`
        :`<div style="width:36px;height:36px;border-radius:8px;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">🐄</div>`}
      <div class="cal-ev-info">
        <div class="cal-ev-titulo">${escH(ev.titulo)}</div>
        <div class="cal-ev-sub">${escH(ev.sub)}</div>
      </div>
      <div class="cal-ev-right">
        <div class="cal-ev-fecha">${fmtFecha(ev.fecha)}</div>
        <span class="cal-ev-badge" style="background:${ev.color}20;color:${ev.color};">${escH(diffLabel)}</span>
      </div>
    </div>`;
  }).join('');

  side.innerHTML=hdrHtml+itemsHtml;
}

/* ── Resumen stats del mes ── */
function calRenderResumen(){
  const cards=document.querySelectorAll('.cal-res-card');
  if(!cards.length) return;

  const mesStr=`${_calAno}-${String(_calMes+1).padStart(2,'0')}`;
  const insemMes  =DB_INSEM.filter(r=>(r.fecha||'').startsWith(mesStr)).length;
  const partosMes =DB_PARTOS.filter(r=>(r.fecha||'').startsWith(mesStr)).length;
  const vacunasMes=DB_SALUD.filter(r=>(r.proxima_dosis||'').startsWith(mesStr)).length;
  const partosEst =DB_INSEM.filter(r=>(r.parto_estimado||'').startsWith(mesStr)).length;

  const nums=[insemMes,partosMes,vacunasMes,partosEst];
  cards.forEach((card,i)=>{
    const numEl=card.querySelector('.cal-res-num');
    if(numEl) numEl.textContent=nums[i]||0;
  });
}

/* ══════════════════════════════════════════
   MÓDULO ALERTAS — datos reales Supabase
   ══════════════════════════════════════════ */

let _altFiltroActivo = 'todas';

/* ── Construir todas las alertas desde los datos en memoria ── */
function buildAlertas(){
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const alertas = [];

  /* ── 1. VACUNAS VENCIDAS Y PRÓXIMAS (tabla salud) ── */
  DB_SALUD.forEach(r => {
    if(!r.proxima_dosis) return;
    const prox  = new Date(r.proxima_dosis + 'T00:00:00');
    const diff  = Math.ceil((prox - hoy) / 86400000);
    const animal = DB_ANIMALES.find(a => a.arete === r.animal) || {};

    if(diff < 0){
      alertas.push({
        tipo:   'vacunas',
        nivel:  'rojo',
        titulo: 'VACUNA VENCIDA',
        animal: `${r.animal}${animal.nombre ? ' — ' + animal.nombre : ''} · ${r.descripcion || r.tipo}`,
        meta:   `Venció hace ${Math.abs(diff)} día${Math.abs(diff)!==1?'s':''} · Fecha: ${fmtFecha(r.proxima_dosis)}`,
        dias:   Math.abs(diff),
        diasLabel: `${Math.abs(diff)} día${Math.abs(diff)!==1?'s':''}`,
        foto:   animal.foto || null,
        orden:  diff  // negativo = más urgente
      });
    } else if(diff <= 30){
      alertas.push({
        tipo:   'vacunas',
        nivel:  'dorado',
        titulo: 'VACUNA PRÓXIMA',
        animal: `${r.animal}${animal.nombre ? ' — ' + animal.nombre : ''} · ${r.descripcion || r.tipo}`,
        meta:   `Vence en ${diff} día${diff!==1?'s':''} · Fecha: ${fmtFecha(r.proxima_dosis)}`,
        dias:   diff,
        diasLabel: `En ${diff} día${diff!==1?'s':''}`,
        foto:   animal.foto || null,
        orden:  diff
      });
    }
  });

  /* ── 2. PARTOS ESTIMADOS PRÓXIMOS (tabla insem) ── */
  DB_INSEM.forEach(r => {
    if(!r.parto_estimado || r.resultado === 'Fallida') return;
    const parto = new Date(r.parto_estimado + 'T00:00:00');
    const diff  = Math.ceil((parto - hoy) / 86400000);
    const animal = DB_ANIMALES.find(a => a.arete === r.hembra) || {};

    if(diff >= 0 && diff <= 45){
      alertas.push({
        tipo:   'partos',
        nivel:  diff <= 7 ? 'rojo' : 'dorado',
        titulo: diff <= 7 ? 'PARTO MUY PRÓXIMO' : 'PARTO ESTIMADO PRÓXIMO',
        animal: `${r.hembra}${animal.nombre ? ' — ' + animal.nombre : ''} · Toro: ${r.toro_semen || '—'}`,
        meta:   `Parto estimado: ${fmtFecha(r.parto_estimado)} · En ${diff} día${diff!==1?'s':''}`,
        dias:   diff,
        diasLabel: diff === 0 ? '¡Hoy!' : `En ${diff} día${diff!==1?'s':''}`,
        foto:   animal.foto || null,
        orden:  diff
      });
    } else if(diff < 0 && diff >= -7){
      alertas.push({
        tipo:   'partos',
        nivel:  'rojo',
        titulo: 'PARTO SIN REGISTRAR',
        animal: `${r.hembra}${animal.nombre ? ' — ' + animal.nombre : ''} · Parto estimado ya pasó`,
        meta:   `Fecha estimada: ${fmtFecha(r.parto_estimado)} · Hace ${Math.abs(diff)} día${Math.abs(diff)!==1?'s':''}`,
        dias:   Math.abs(diff),
        diasLabel: `Hace ${Math.abs(diff)} día${Math.abs(diff)!==1?'s':''}`,
        foto:   animal.foto || null,
        orden:  diff
      });
    }
  });

  /* ── 3. ANIMALES EN GESTACIÓN SIN INSEMINACIÓN REGISTRADA ── */
  DB_ANIMALES.filter(a => a.estado === 'Gestante').forEach(a => {
    const tieneInsem = DB_INSEM.some(r => r.hembra === a.arete && r.resultado !== 'Fallida');
    if(!tieneInsem){
      alertas.push({
        tipo:   'reprod',
        nivel:  'dorado',
        titulo: 'GESTANTE SIN INSEMINACIÓN',
        animal: `${a.arete}${a.nombre ? ' — ' + a.nombre : ''} · ${a.raza || ''}`,
        meta:   'Animal en estado Gestante pero sin inseminación registrada',
        dias:   0,
        diasLabel: 'Revisar',
        foto:   a.foto || null,
        orden:  999
      });
    }
  });

  /* ── 4. STOCK BAJO DE INVENTARIO ── */
  if(DB_INVENTARIO && DB_INVENTARIO.length){
    DB_INVENTARIO.filter(i => parseFloat(i.stock||0) <= parseFloat(i.minimo||0)).forEach(i => {
      alertas.push({
        tipo:   'inventario',
        nivel:  'dorado',
        titulo: 'STOCK BAJO',
        animal: `${i.nombre} · Stock: ${i.stock} ${i.unidad||''} (mín: ${i.minimo} ${i.unidad||''})`,
        meta:   `Categoría: ${i.categoria || '—'} · Proveedor: ${i.proveedor || '—'}`,
        dias:   0,
        diasLabel: 'Stock bajo',
        foto:   null,
        orden:  500
      });
    });
  }

  /* Ordenar: más urgentes primero */
  alertas.sort((a, b) => a.orden - b.orden);
  return alertas;
}

/* ── Renderizar alertas ── */
function renderAlertas(){
  /* Si no hay datos, cargarlos primero */
  if(!DB_SALUD.length && !DB_INSEM.length && !DB_PARTOS.length && SESSION?.rancho_id){
    _cargarDatosParaAlertas().then(() => _renderAlertasUI());
  } else {
    _renderAlertasUI();
  }
}

async function _cargarDatosParaAlertas(){
  const safeGet = async tabla => {
    try{
      const r = await fetch(`${SB_URL}/rest/v1/${tabla}?rancho_id=eq.${SESSION.rancho_id}&select=*`,{headers:SB_HEADERS});
      const d = await r.json(); return Array.isArray(d) ? d : [];
    }catch(e){ return []; }
  };
  if(!DB_ANIMALES.length) DB_ANIMALES = await safeGet('animales');
  if(!DB_SALUD.length)    DB_SALUD    = await safeGet('salud');
  if(!DB_INSEM.length)    DB_INSEM    = await safeGet('insem');
  if(!DB_PARTOS.length)   DB_PARTOS   = await safeGet('partos');
}

function _renderAlertasUI(){
  const lista    = document.getElementById('alt-lista');
  if(!lista) return;

  const todas    = buildAlertas();
  const filtrada = _altFiltroActivo === 'todas'
    ? todas
    : todas.filter(a => a.tipo === _altFiltroActivo);

  /* Actualizar contadores tabs */
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('alt-cnt-todas',   todas.length);
  set('alt-cnt-vacunas', todas.filter(a=>a.tipo==='vacunas').length);
  set('alt-cnt-partos',  todas.filter(a=>a.tipo==='partos').length);
  set('alt-cnt-reprod',  todas.filter(a=>a.tipo==='reprod'||a.tipo==='inventario').length);

  if(!filtrada.length){
    lista.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;gap:14px;text-align:center;">
      <div style="font-size:52px;">✅</div>
      <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#0D2B6B;">¡Todo en orden!</div>
      <div style="font-size:13px;color:#8FA3BF;line-height:1.6;">
        ${_altFiltroActivo==='todas' ? 'No tienes alertas pendientes en este momento.' : 'No hay alertas en esta categoría.'}
      </div>
    </div>`;
    return;
  }

  const icoVacuna = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`;
  const icoParto  = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  const icoReprod = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`;
  const icoReloj  = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

  lista.innerHTML = filtrada.map(a => {
    const ico = a.tipo==='vacunas' ? icoVacuna : a.tipo==='partos' ? icoParto : icoReprod;
    return `<div class="alt-item" style="position:relative;">
      <div class="alt-item-bar ${a.nivel}"></div>
      <div class="alt-ico-wrap ${a.nivel}">${ico}</div>
      <div style="width:42px;height:42px;border-radius:9px;overflow:hidden;flex-shrink:0;background:#E8EEF8;display:flex;align-items:center;justify-content:center;font-size:20px;">
        ${a.foto ? `<img src="${escH(a.foto)}" style="width:100%;height:100%;object-fit:cover;">` : '🐄'}
      </div>
      <div class="alt-info">
        <div class="alt-titulo">${escH(a.titulo)}</div>
        <div class="alt-animal">${escH(a.animal)}</div>
        <div class="alt-meta">${icoReloj} ${escH(a.meta)}</div>
      </div>
      <div class="alt-dias ${a.nivel}">${icoReloj} ${escH(a.diasLabel)}</div>
      <div class="alt-chev">›</div>
    </div>`;
  }).join('');
}

/* ── Filtrar tabs ── */
function altFiltrar(tipo, el){
  document.querySelectorAll('.alt-tab').forEach(t => t.classList.remove('on'));
  if(el) el.classList.add('on');
  _altFiltroActivo = tipo;
  _renderAlertasUI();
}

/* Inventario en memoria */
let DB_INVENTARIO = [];

/* ══════════════════════════════════════════
   MÓDULO REPORTES — datos reales + Excel
   ══════════════════════════════════════════ */

let _repDonutChart = null;

async function renderReportes(){
  /* Cargar datos si no están en memoria */
  if(!DB_ANIMALES.length && SESSION?.rancho_id){
    const sg = async t => {
      try{
        const r = await fetch(`${SB_URL}/rest/v1/${t}?rancho_id=eq.${SESSION.rancho_id}&select=*`,{headers:SB_HEADERS});
        const d = await r.json(); return Array.isArray(d)?d:[];
      }catch(e){ return []; }
    };
    [DB_ANIMALES, DB_SALUD, DB_INSEM, DB_PARTOS, DB_GASTOS] = await Promise.all([
      sg('animales'), sg('salud'), sg('insem'), sg('partos'), sg('gastos')
    ]);
  }

  const anyo = new Date().getFullYear();
  const total     = DB_ANIMALES.length;
  const gestantes = DB_ANIMALES.filter(a=>a.estado==='Gestante').length;
  const activos   = DB_ANIMALES.filter(a=>a.estado==='Activo').length;
  const muertos   = DB_ANIMALES.filter(a=>a.estado==='Muerto').length;
  const vendidos  = DB_ANIMALES.filter(a=>a.estado==='Vendido').length;
  const trat      = DB_ANIMALES.filter(a=>a.estado==='En tratamiento').length;
  const partosAnyo= DB_PARTOS.filter(p=>(p.fecha||'').startsWith(anyo+'')).length;
  const insemAnyo = DB_INSEM.filter(i=>(i.fecha||'').startsWith(anyo+'')).length;
  const vacAnyo   = DB_SALUD.filter(s=>(s.fecha_aplicacion||'').startsWith(anyo+'')).length;
  const bajasAnyo = DB_ANIMALES.filter(a=>a.estado==='Muerto'||(a.estado==='Vendido'&&(a.created_at||'').startsWith(anyo+''))).length;

  /* ── 6 Stats ── */
  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };
  set('rep-s-total',  total);
  set('rep-s-gest',   gestantes);
  set('rep-s-partos', partosAnyo);
  set('rep-s-insem',  insemAnyo);
  set('rep-s-vac',    vacAnyo);
  set('rep-s-bajas',  bajasAnyo);

  /* ── Gráfica Donut estado del hato ── */
  const canvas = document.getElementById('donut-hato');
  if(canvas && window.Chart){
    // Forzar tamaño fijo antes de crear la gráfica
    canvas.width  = 130;
    canvas.height = 130;
    canvas.style.width  = '130px';
    canvas.style.height = '130px';
    if(_repDonutChart) _repDonutChart.destroy();
    _repDonutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Activos','Gestantes','Muertos','Vendidos','En trat.'],
        datasets:[{
          data: [activos, gestantes, muertos, vendidos, trat],
          backgroundColor: ['#2E7DD6','#F0A500','#E24B4A','#60A5FA','#E0E8F4'],
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options:{
        cutout:'72%',
        responsive: false,
        maintainAspectRatio: false,
        plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>`${ctx.label}: ${ctx.raw}`}}},
        animation:{duration:600}
      }
    });
    /* Leyenda manual */
    [
      ['rep-d-activos', activos],['rep-d-gestantes', gestantes],
      ['rep-d-muertos', muertos],['rep-d-vendidos', vendidos],['rep-d-trat', trat]
    ].forEach(([id,v])=>{ const el=document.getElementById(id); if(el){ const n=el.querySelector('.rep-donut-num'); if(n) n.textContent=v; const p=el.querySelector('.rep-donut-pct'); if(p) p.textContent=total?Math.round(v/total*100)+'%':'0%'; } });
  }

  /* ── Barras por Raza ── */
  const razas = {};
  DB_ANIMALES.forEach(a=>{ if(a.raza) razas[a.raza] = (razas[a.raza]||0) + 1; });
  const razasOrd = Object.entries(razas).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxRaza  = razasOrd[0]?.[1] || 1;
  const colores  = ['#2E7DD6','#22C55E','#F0A500','#E24B4A','#60A5FA','#A78BFA','#FB923C','#34D399'];
  const razasEl  = document.getElementById('rep-razas-lista');
  if(razasEl){
    if(!razasOrd.length){
      razasEl.innerHTML = '<div style="text-align:center;padding:20px;color:#8FA3BF;font-size:13px;">Sin datos de razas</div>';
    } else {
      razasEl.innerHTML = razasOrd.map(([raza,cnt],i) => `
        <div class="rep-raza-item">
          <span class="rep-raza-nombre" title="${escH(raza)}">${escH(raza.length>10?raza.substring(0,10)+'…':raza)}</span>
          <div class="rep-raza-bar-wrap">
            <div class="rep-raza-bar" style="width:${Math.round(cnt/maxRaza*100)}%;background:${colores[i%colores.length]};"></div>
          </div>
          <span class="rep-raza-num">${cnt}</span>
          <span class="rep-raza-pct">${total?Math.round(cnt/total*100):0}%</span>
        </div>`).join('');
    }
  }

  /* ── Barras Inseminación por resultado ── */
  const resIns = {Pendiente:0,'Preñada':0,'Fallida':0};
  DB_INSEM.forEach(i=>{ const r=i.resultado||'Pendiente'; if(resIns[r]!==undefined) resIns[r]++; else resIns['Pendiente']++; });
  const totalIns = DB_INSEM.length || 1;
  const insemEl  = document.getElementById('rep-insem-barras');
  if(insemEl){
    const insData = [
      {lbl:'Preñadas', cnt:resIns['Preñada'],  color:'#22C55E'},
      {lbl:'Pendiente',cnt:resIns['Pendiente'],color:'#2E7DD6'},
      {lbl:'Fallidas', cnt:resIns['Fallida'],  color:'#E24B4A'},
    ];
    insemEl.innerHTML = insData.map(d=>`
      <div class="rep-insem-item">
        <span class="rep-insem-lbl">${escH(d.lbl)}</span>
        <div class="rep-insem-bar-wrap">
          <div class="rep-insem-bar" style="width:${Math.round(d.cnt/totalIns*100)}%;background:${d.color};"></div>
        </div>
        <span class="rep-insem-num">${d.cnt}</span>
        <span class="rep-insem-pct">${Math.round(d.cnt/totalIns*100)}%</span>
      </div>`).join('');
  }

  /* ── Card resumen inteligente ── */
  _repRenderResumen(total, gestantes, partosAnyo, insemAnyo, vacAnyo);
}

function _repRenderResumen(total, gestantes, partos, insem, vac){
  const card = document.querySelector('#sec-reportes .rep-resumen-card');
  if(!card) return;
  const tasa = insem>0 ? Math.round((DB_INSEM.filter(i=>i.resultado==='Preñada').length/insem)*100) : 0;
  card.innerHTML = `
    <div class="rep-resumen-titulo">📊 Resumen del año ${new Date().getFullYear()}</div>
    <div class="rep-resumen-sub" style="margin-top:8px;line-height:1.8;">
      Tu ganadería tiene <strong>${total}</strong> animales registrados.<br>
      ${gestantes>0?`<strong>${gestantes}</strong> en gestación actualmente.<br>`:''}
      Este año: <strong>${partos}</strong> parto${partos!==1?'s':''}, <strong>${insem}</strong> inseminaci${insem!==1?'ones':'ón'}
      ${insem>0?` (tasa de preñez: <strong>${tasa}%</strong>)`:''}.<br>
      Vacunas aplicadas: <strong>${vac}</strong>.
    </div>`;
}

/* ── Exportar Excel ── */
async function repExportarExcel(){
  if(!window.XLSX){ toast('❌ Librería Excel no disponible'); return; }

  /* Cargar datos si falta alguno */
  if(SESSION?.rancho_id){
    const sg = async t => {
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${t}?rancho_id=eq.${SESSION.rancho_id}&select=*`,{headers:SB_HEADERS});
        const d=await r.json();return Array.isArray(d)?d:[];
      }catch(e){return[];}
    };
    if(!DB_ANIMALES.length) DB_ANIMALES = await sg('animales');
    if(!DB_SALUD.length)    DB_SALUD    = await sg('salud');
    if(!DB_INSEM.length)    DB_INSEM    = await sg('insem');
    if(!DB_PARTOS.length)   DB_PARTOS   = await sg('partos');
    if(!DB_GASTOS.length)   DB_GASTOS   = await sg('gastos');
  }

  toast('⏳ Generando Excel...');
  const wb = XLSX.utils.book_new();

  /* Hoja 1 — Animales */
  const wsA = XLSX.utils.json_to_sheet(DB_ANIMALES.map(a=>({
    'Arete':a.arete||'', 'Nombre':a.nombre||'', 'Raza':a.raza||'',
    'Sexo':a.sexo||'', 'Nacimiento':a.nacimiento||'', 'Peso (kg)':a.peso||'',
    'Estado':a.estado||'', 'Madre':a.madre||'', 'Padre':a.padre||'',
    'Observaciones':a.observaciones||''
  })));
  XLSX.utils.book_append_sheet(wb, wsA, 'Animales');

  /* Hoja 2 — Salud & Vacunas */
  const wsS = XLSX.utils.json_to_sheet(DB_SALUD.map(s=>({
    'Animal':s.animal||'', 'Tipo':s.tipo||'', 'Descripción':s.descripcion||'',
    'Dosis':s.dosis||'', 'Fecha Aplicación':s.fecha_aplicacion||'',
    'Próxima Dosis':s.proxima_dosis||'', 'Veterinario':s.veterinario||'',
    'Costo':s.costo||''
  })));
  XLSX.utils.book_append_sheet(wb, wsS, 'Salud & Vacunas');

  /* Hoja 3 — Inseminaciones */
  const wsI = XLSX.utils.json_to_sheet(DB_INSEM.map(i=>({
    'Hembra':i.hembra||'', 'Fecha':i.fecha||'', 'Toro/Semen':i.toro_semen||'',
    'Técnica':i.tecnica||'', 'Técnico':i.tecnico||'',
    'Parto Estimado':i.parto_estimado||'', 'Resultado':i.resultado||'',
    'Costo':i.costo||''
  })));
  XLSX.utils.book_append_sheet(wb, wsI, 'Inseminaciones');

  /* Hoja 4 — Partos */
  const wsP = XLSX.utils.json_to_sheet(DB_PARTOS.map(p=>({
    'Fecha':p.fecha||'', 'Madre':p.madre||'', 'Arete Cría':p.arete_cria||'',
    'Sexo Cría':p.sexo_cria||'', 'Peso Nacimiento':p.peso_nacimiento||'',
    'Tipo Parto':p.tipo_parto||'', 'Estado Cría':p.estado_cria||'',
    'Padre':p.padre||''
  })));
  XLSX.utils.book_append_sheet(wb, wsP, 'Partos');

  /* Hoja 5 — Gastos */
  if(DB_GASTOS.length){
    const wsG = XLSX.utils.json_to_sheet(DB_GASTOS.map(g=>({
      'Fecha':g.fecha||'', 'Tipo':g.tipo||'', 'Descripción':g.descripcion||'',
      'Monto':g.monto||0, 'Es Ingreso':g.es_ingreso?'Sí':'No',
      'Animal':g.animal||'', 'Observaciones':g.observaciones||''
    })));
    XLSX.utils.book_append_sheet(wb, wsG, 'Gastos & Ingresos');
  }

  /* Hoja 6 — Resumen */
  const anyo = new Date().getFullYear();
  const wsR = XLSX.utils.json_to_sheet([
    {'Indicador':'Total animales',        'Valor':DB_ANIMALES.length},
    {'Indicador':'Activos',               'Valor':DB_ANIMALES.filter(a=>a.estado==='Activo').length},
    {'Indicador':'Gestantes',             'Valor':DB_ANIMALES.filter(a=>a.estado==='Gestante').length},
    {'Indicador':'En tratamiento',        'Valor':DB_ANIMALES.filter(a=>a.estado==='En tratamiento').length},
    {'Indicador':'Vendidos',              'Valor':DB_ANIMALES.filter(a=>a.estado==='Vendido').length},
    {'Indicador':'Muertos',               'Valor':DB_ANIMALES.filter(a=>a.estado==='Muerto').length},
    {'Indicador':'Partos este año',       'Valor':DB_PARTOS.filter(p=>(p.fecha||'').startsWith(anyo+'')).length},
    {'Indicador':'Inseminaciones este año','Valor':DB_INSEM.filter(i=>(i.fecha||'').startsWith(anyo+'')).length},
    {'Indicador':'Tasa de preñez',        'Valor': DB_INSEM.length ? Math.round(DB_INSEM.filter(i=>i.resultado==='Preñada').length/DB_INSEM.length*100)+'%' : '0%'},
    {'Indicador':'Vacunas este año',      'Valor':DB_SALUD.filter(s=>(s.fecha_aplicacion||'').startsWith(anyo+'')).length},
    {'Indicador':'Total registros salud', 'Valor':DB_SALUD.length},
  ]);
  XLSX.utils.book_append_sheet(wb, wsR, 'Resumen');

  /* Descargar */
  const rancho = (SESSION?.rancho||'ganaderia').replace(/\s+/g,'_');
  const fecha  = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${rancho}_reporte_${fecha}.xlsx`);
  toast('✅ Excel descargado con ' + (DB_ANIMALES.length + DB_SALUD.length + DB_INSEM.length + DB_PARTOS.length) + ' registros');
}

let DB_GASTOS = [];

/* ══════════════════════════════════════════
   MÓDULO HISTORIAL — datos reales Supabase
   ══════════════════════════════════════════ */

let _hisPagActual = 1;
const _hisPorPag  = 12;
let   _hisListaFiltrada = [];
let   _hisBusqQ   = '';
let   _hisFiltroSexo  = '';
let   _hisFiltroEst   = '';
let   _hisFiltroRaza  = '';
let   _hisOrden   = 'reciente';

/* ── Cargar historial ── */
async function cargarHistorial(){
  const grid = document.getElementById('his-grid');
  if(grid) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#8FA3BF;">⏳ Cargando historial...</div>';

  /* Asegurar datos */
  if(!DB_ANIMALES.length && SESSION?.rancho_id){
    const sg = async t => {
      try{
        const r=await fetch(`${SB_URL}/rest/v1/${t}?rancho_id=eq.${SESSION.rancho_id}&select=*`,{headers:SB_HEADERS});
        const d=await r.json(); return Array.isArray(d)?d:[];
      }catch(e){ return []; }
    };
    [DB_ANIMALES,DB_SALUD,DB_INSEM,DB_PARTOS] = await Promise.all([
      sg('animales'),sg('salud'),sg('insem'),sg('partos')
    ]);
  }

  _hisPagActual = 1;
  _hisListaFiltrada = [...DB_ANIMALES];
  _hisAplicarFiltros();
  _hisRenderStats();
  _hisRenderRazasSelect();
}

/* ── Stats ── */
function _hisRenderStats(){
  const total = DB_ANIMALES.length;
  const conVac = DB_ANIMALES.filter(a=>DB_SALUD.some(s=>s.animal===a.arete)).length;
  const conIns = DB_ANIMALES.filter(a=>DB_INSEM.some(i=>i.hembra===a.arete)).length;
  const conPar = DB_ANIMALES.filter(a=>DB_PARTOS.some(p=>p.madre===a.arete)).length;
  const sinEv  = DB_ANIMALES.filter(a=>
    !DB_SALUD.some(s=>s.animal===a.arete)&&
    !DB_INSEM.some(i=>i.hembra===a.arete)&&
    !DB_PARTOS.some(p=>p.madre===a.arete)
  ).length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('his-s-total',total);
  set('his-s-vac',conVac);
  set('his-s-ins',conIns);
  set('his-s-par',conPar);
  set('his-s-sin',sinEv);
}

/* ── Poblar select de razas ── */
function _hisRenderRazasSelect(){
  const sel = document.querySelector('#sec-historial .his-sel:nth-child(3)');
  if(!sel) return;
  const razas = [...new Set(DB_ANIMALES.map(a=>a.raza).filter(Boolean))].sort();
  sel.innerHTML = '<option value="">Todas las razas</option>' +
    razas.map(r=>`<option value="${escH(r)}">${escH(r)}</option>`).join('');
  sel.onchange = () => { _hisFiltroRaza = sel.value; _hisAplicarFiltros(); };
}

/* ── Aplicar filtros ── */
function _hisAplicarFiltros(){
  let lista = [...DB_ANIMALES];
  if(_hisBusqQ){
    const q=_hisBusqQ.toLowerCase();
    lista=lista.filter(a=>(a.arete||'').toLowerCase().includes(q)||(a.nombre||'').toLowerCase().includes(q)||(a.raza||'').toLowerCase().includes(q));
  }
  if(_hisFiltroSexo)  lista=lista.filter(a=>a.sexo===_hisFiltroSexo);
  if(_hisFiltroEst)   lista=lista.filter(a=>a.estado===_hisFiltroEst);
  if(_hisFiltroRaza)  lista=lista.filter(a=>a.raza===_hisFiltroRaza);
  if(_hisOrden==='nombre') lista.sort((a,b)=>(a.nombre||a.arete||'').localeCompare(b.nombre||b.arete||''));
  else lista.sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  _hisListaFiltrada = lista;
  _hisPagActual = 1;
  _hisRenderGrid();
}

/* ── Renderizar grid ── */
function _hisRenderGrid(){
  const grid = document.getElementById('his-grid');
  if(!grid) return;
  const total    = _hisListaFiltrada.length;
  const totalPags= Math.ceil(total/_hisPorPag);
  const inicio   = (_hisPagActual-1)*_hisPorPag;
  const pag      = _hisListaFiltrada.slice(inicio, inicio+_hisPorPag);
  const infoEl   = document.getElementById('his-pag-info');
  if(infoEl) infoEl.textContent = total ? `Mostrando ${inicio+1} - ${Math.min(inicio+_hisPorPag,total)} de ${total} animales` : 'Sin resultados';

  if(!pag.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:50px;color:#8FA3BF;"><div style="font-size:48px;margin-bottom:10px;">🐄</div>Sin animales registrados.</div>';
    _hisRenderPaginacion(0,0);
    return;
  }

  /* Tags de eventos por animal */
  const tags = a => {
    const t = [];
    if(DB_SALUD.some(s=>s.animal===a.arete)) t.push('<span class="his-tag vac">💉 Vacunas</span>');
    if(DB_INSEM.some(i=>i.hembra===a.arete)) t.push('<span class="his-tag ins">🔬 Insem.</span>');
    if(DB_PARTOS.some(p=>p.madre===a.arete)) t.push('<span class="his-tag par">🐣 Partos</span>');
    if(!t.length) t.push('<span class="his-tag sin">Sin eventos</span>');
    return t.join('');
  };

  const badgeEst = e => ({
    'Activo':'background:#ECFDF5;color:#065F46',
    'Gestante':'background:#FEF3C7;color:#92400E',
    'En tratamiento':'background:#DBEAFE;color:#1D4ED8',
    'Vendido':'background:#F3F4F6;color:#374151',
    'Muerto':'background:#FEE2E2;color:#991B1B',
  }[e]||'background:#F3F4F6;color:#374151');

  grid.innerHTML = pag.map(a=>`
    <div class="his-card" onclick="hisAbrirAnimal('${a.id}')">
      ${a.foto
        ?`<img class="his-card-foto" src="${escH(a.foto)}" onerror="this.style.display='none'">`
        :`<div class="his-card-foto" style="background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:22px;">🐄</div>`}
      <div class="his-card-info">
        <div class="his-card-id">${escH(a.arete||'')} ${a.nombre?'— '+escH(a.nombre):''}</div>
        <div class="his-card-raza">${escH(a.raza||'')} | ${a.sexo==='Hembra'?'♀ Hembra':'♂ Macho'}</div>
        <div class="his-card-tags">
          ${tags(a)}
          <span style="margin-left:auto;font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px;${badgeEst(a.estado)}">${a.estado||''}</span>
        </div>
      </div>
      <div class="his-card-chev">›</div>
    </div>`).join('');

  _hisRenderPaginacion(totalPags, _hisPagActual);
}

/* ── Paginación ── */
function _hisRenderPaginacion(totalPags, actual){
  const cont = document.getElementById('his-pag-btns');
  if(!cont||totalPags<=1){ if(cont) cont.innerHTML=''; return; }
  let html = `<button class="his-pag-btn" onclick="hisCambiarPag(${actual-1})" ${actual===1?'disabled':''}>
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M15 19l-7-7 7-7"/></svg>
  </button>`;
  for(let p=1;p<=totalPags;p++){
    if(p===1||p===totalPags||Math.abs(p-actual)<=1)
      html+=`<button class="his-pag-btn${p===actual?' on':''}" onclick="hisCambiarPag(${p})">${p}</button>`;
    else if(Math.abs(p-actual)===2)
      html+=`<span style="padding:0 4px;color:#8FA3BF;">...</span>`;
  }
  html+=`<button class="his-pag-btn" onclick="hisCambiarPag(${actual+1})" ${actual===totalPags?'disabled':''}>
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M9 5l7 7-7 7"/></svg>
  </button>`;
  cont.innerHTML = html;
}

function hisCambiarPag(p){
  const totalPags = Math.ceil(_hisListaFiltrada.length/_hisPorPag);
  if(p<1||p>totalPags) return;
  _hisPagActual = p;
  _hisRenderGrid();
  document.getElementById('sec-historial')?.scrollTo(0,0);
}

/* ── Filtros externos ── */
function hisBuscar(q){ _hisBusqQ=q; _hisAplicarFiltros(); }

/* Conectar selects del HTML */
function _hisConectarSelects(){
  const sels = document.querySelectorAll('#sec-historial .his-sel');
  // Select sexo
  if(sels[1]){
    sels[1].innerHTML='<option value="">Todos los sexos</option><option value="Hembra">♀ Hembra</option><option value="Macho">♂ Macho</option>';
    sels[1].onchange=()=>{ _hisFiltroSexo=sels[1].value; _hisAplicarFiltros(); };
  }
  // Select estado
  if(sels[3]){
    sels[3].innerHTML='<option value="">Todos los estados</option><option value="Activo">Activo</option><option value="Gestante">Gestante</option><option value="En tratamiento">En tratamiento</option><option value="Vendido">Vendido</option><option value="Muerto">Muerto</option>';
    sels[3].onchange=()=>{ _hisFiltroEst=sels[3].value; _hisAplicarFiltros(); };
  }
  // Select orden
  const selOrden = document.querySelector('#sec-historial .his-sel[style]');
  if(selOrden){ selOrden.onchange=()=>{ _hisOrden=selOrden.value==='Nombre'?'nombre':'reciente'; _hisAplicarFiltros(); }; }
}

/* ══ MODAL HISTORIAL DE UN ANIMAL ══ */
function hisAbrirAnimal(id){
  const a = DB_ANIMALES.find(x=>x.id===id);
  if(!a) return;

  const eventos=[];
  DB_SALUD.filter(s=>s.animal===a.arete).forEach(s=>eventos.push({
    fecha:s.fecha_aplicacion||'',tipo:'💉 Salud',
    titulo:`${s.tipo||'Vacuna'} — ${s.descripcion||''}`,
    meta:`Dosis: ${s.dosis||'—'} · Próxima: ${s.proxima_dosis?fmtFecha(s.proxima_dosis):'—'} · Vet: ${s.veterinario||'—'}`,
    color:'#2E7DD6',bg:'#EFF6FF'
  }));
  DB_INSEM.filter(i=>i.hembra===a.arete).forEach(i=>eventos.push({
    fecha:i.fecha||'',tipo:'🔬 Inseminación',
    titulo:`Toro: ${i.toro_semen||'—'} · ${i.tecnica||'—'}`,
    meta:`Resultado: ${i.resultado||'Pendiente'} · Parto est.: ${i.parto_estimado?fmtFecha(i.parto_estimado):'—'}`,
    color:'#22C55E',bg:'#ECFDF5'
  }));
  DB_PARTOS.filter(p=>p.madre===a.arete).forEach(p=>eventos.push({
    fecha:p.fecha||'',tipo:'🐣 Parto',
    titulo:`Cría: ${p.arete_cria||'—'} (${p.sexo_cria||'—'}) · ${p.tipo_parto||'Natural'}`,
    meta:`Peso nacimiento: ${p.peso_nacimiento?p.peso_nacimiento+' kg':'—'} · Estado cría: ${p.estado_cria||'—'}`,
    color:'#F0A500',bg:'#FFFBEB'
  }));
  eventos.sort((a,b)=>new Date(b.fecha||0)-new Date(a.fecha||0));

  /* Crear modal */
  let modal = document.getElementById('m-his-animal');
  if(!modal){
    const div=document.createElement('div');
    div.innerHTML=`<div id="m-his-animal" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)document.getElementById('m-his-animal').style.display='none'">
      <div style="background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div id="m-his-titulo" style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#0D2B6B;"></div>
          <button onclick="document.getElementById('m-his-animal').style.display='none'" style="background:none;border:none;font-size:24px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
        </div>
        <div id="m-his-body"></div>
      </div>
    </div>`;
    document.body.appendChild(div.firstElementChild);
    modal=document.getElementById('m-his-animal');
  }

  document.getElementById('m-his-titulo').textContent=`📋 ${a.arete||''}${a.nombre?' — '+a.nombre:''}`;

  const calcEdad=nac=>{if(!nac)return'—';const d=new Date(nac);const dias=Math.floor((new Date()-d)/86400000);if(dias<30)return dias+' días';const m=Math.floor(dias/30.44);if(m<12)return m+' meses';return Math.floor(m/12)+' años';};

  document.getElementById('m-his-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;padding:14px;background:#F8FAFF;border-radius:12px;margin-bottom:16px;">
      ${a.foto?`<img src="${escH(a.foto)}" style="width:56px;height:56px;border-radius:10px;object-fit:cover;flex-shrink:0;">`
        :'<div style="width:56px;height:56px;border-radius:10px;background:#EFF6FF;display:flex;align-items:center;justify-content:center;font-size:28px;">🐄</div>'}
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:700;color:#2E7DD6;">${escH(a.arete||'')} ${a.nombre?'— '+escH(a.nombre):''}</div>
        <div style="font-size:12px;color:#8FA3BF;margin-top:2px;">${escH(a.raza||'')} | ${a.sexo||''} | Edad: ${calcEdad(a.nacimiento)}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#2E7DD6;">${eventos.length}</div>
        <div style="font-size:10px;color:#8FA3BF;">eventos</div>
      </div>
    </div>
    ${!eventos.length
      ? '<div style="text-align:center;padding:30px;color:#8FA3BF;font-size:13px;">📭 Sin eventos registrados para este animal.</div>'
      : eventos.map(ev=>`
        <div style="display:flex;gap:12px;padding:12px;border-left:3px solid ${ev.color};background:${ev.bg};border-radius:8px;margin-bottom:8px;">
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:12px;font-weight:700;color:${ev.color};">${escH(ev.tipo)}</span>
              <span style="font-size:11px;color:#8FA3BF;">${ev.fecha?fmtFecha(ev.fecha):'—'}</span>
            </div>
            <div style="font-size:13px;font-weight:600;color:#0D2B6B;margin-top:3px;">${escH(ev.titulo)}</div>
            <div style="font-size:11px;color:#8FA3BF;margin-top:2px;">${escH(ev.meta)}</div>
          </div>
        </div>`).join('')
    }
    <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
      <button onclick="document.getElementById('m-his-animal').style.display='none';editarAnimal('${a.id}')" style="padding:9px 16px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">✏️ Editar animal</button>
      <button onclick="document.getElementById('m-his-animal').style.display='none'" style="padding:9px 18px;border-radius:9px;border:none;background:#2E7DD6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">Cerrar</button>
    </div>`;

  modal.style.display='flex';
}

/* Llamar al conectar selects al abrir */
const _hisOrigCargar = cargarHistorial;
cargarHistorial = async function(){
  await _hisOrigCargar();
  _hisConectarSelects();
};

/* ══════════════════════════════════════════
   MÓDULO GASTOS & INGRESOS — Supabase real
   ══════════════════════════════════════════ */

let _gasLista       = [];
let _gasListaFilt   = [];
let _gasPag         = 1;
const _gasPorPag    = 10;
let _gasFiltroTipo  = '';   // ''|'ingreso'|'gasto'
let _gasBusqQ       = '';

const fmtMoney = n => 'S/ ' + parseFloat(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const esIngreso= g => g.es_ingreso===true || g.es_ingreso==='true' || g.es_ingreso===1;

/* ── Cargar gastos ── */
async function cargarGastos(){
  const tbody=document.getElementById('gas-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';

  const ranchoId = await _asegurarRanchoId();
  if(!ranchoId){
    if(tbody) tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:30px;color:#e07b00;">⚠️ Sin rancho asignado. Cierra sesión y vuelve a entrar.</td></tr>';
    return;
  }

  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/gastos?rancho_id=eq.${ranchoId}&select=*&order=fecha.desc`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    console.log('[Gastos]', res.status, Array.isArray(data)?data.length+' registros':data);
    if(!res.ok) throw new Error(data.message||data.hint||data.details||`Error ${res.status}`);
    DB_GASTOS=Array.isArray(data)?data:[];
    _gasLista=[...DB_GASTOS];
    gasAplicarFiltros();
  }catch(e){
    console.error('[Gastos error]',e);
    if(tbody) tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:30px;color:#e53e3e;">❌ ${escH(e.message)}</td></tr>`;
  }
}

/* ── Filtros ── */
function gasBuscar(q){ _gasBusqQ=q; gasAplicarFiltros(); }
function gasAplicarFiltros(){
  const sel=document.getElementById('gas-sel-tipo');
  _gasFiltroTipo=sel?sel.value:'';
  let lista=[..._gasLista];
  if(_gasFiltroTipo==='ingreso') lista=lista.filter(g=>esIngreso(g));
  else if(_gasFiltroTipo==='gasto') lista=lista.filter(g=>!esIngreso(g));
  if(_gasBusqQ){
    const q=_gasBusqQ.toLowerCase();
    lista=lista.filter(g=>(g.descripcion||'').toLowerCase().includes(q)||(g.tipo||'').toLowerCase().includes(q)||(g.animal||'').toLowerCase().includes(q));
  }
  _gasListaFilt=lista;
  _gasPag=1;
  _gasRenderTabla(_gasListaFilt);
}
function gasLimpiar(){
  _gasBusqQ=''; _gasFiltroTipo='';
  const b=document.getElementById('gas-buscar');
  const s=document.getElementById('gas-sel-tipo');
  if(b) b.value=''; if(s) s.value='';
  _gasListaFilt=[..._gasLista]; _gasPag=1;
  _gasRenderTabla(_gasListaFilt);
}

/* ── Renderizar tabla ── */
function _gasRenderTabla(lista){
  const tbody=document.getElementById('gas-tbody');
  if(!tbody) return;

  /* Stats */
  const totalIng=_gasLista.filter(g=>esIngreso(g)).reduce((s,g)=>s+parseFloat(g.monto||0),0);
  const totalGas=_gasLista.filter(g=>!esIngreso(g)).reduce((s,g)=>s+parseFloat(g.monto||0),0);
  const balance=totalIng-totalGas;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('gas-s-ing', fmtMoney(totalIng));
  set('gas-s-gas', fmtMoney(totalGas));
  set('gas-s-bal', fmtMoney(balance));
  const balEl=document.getElementById('gas-s-bal');
  if(balEl) balEl.style.color=balance>=0?'#22C55E':'#E24B4A';

  /* Paginación */
  const total=lista.length;
  const totalPags=Math.ceil(total/_gasPorPag)||1;
  const inicio=(_gasPag-1)*_gasPorPag;
  const pag=lista.slice(inicio,inicio+_gasPorPag);
  const info=document.getElementById('gas-pag-info');
  if(info) info.textContent=total?`Mostrando ${inicio+1}–${Math.min(inicio+_gasPorPag,total)} de ${total} registros`:'Sin registros';

  if(!pag.length){
    tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_gasFiltroTipo||_gasBusqQ?'🔍 Sin resultados.':'💰 Sin movimientos registrados. ¡Agrega el primero!'}
    </td></tr>`;
    _gasRenderPag(0,0); return;
  }

  const MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  tbody.innerHTML=pag.map(g=>{
    const ei=esIngreso(g);
    let dia='—',mes='';
    if(g.fecha){const d=new Date(g.fecha+'T12:00:00');dia=d.getDate();mes=MESES[d.getMonth()];}
    return `<tr>
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td><div class="gas-fecha-num">${dia}</div><div class="gas-fecha-mes">${mes}</div></td>
      <td>
        <div class="gas-desc-titulo">${escH(g.descripcion||g.tipo||'—')}</div>
        <div class="gas-desc-sub">${escH(g.tipo||'')}</div>
      </td>
      <td><span class="gas-cat-badge ${ei?'gas-cat-venta':'gas-cat-med'}">${ei?'💰 Ingreso':'💸 Gasto'}</span></td>
      <td><span class="gas-tipo-badge ${ei?'gas-tipo-ing':'gas-tipo-gas'}">${ei?'↑ Ingreso':'↓ Gasto'}</span></td>
      <td>${escH(g.animal||'—')}</td>
      <td style="text-align:right;"><span class="${ei?'gas-monto-pos':'gas-monto-neg'}">${ei?'+':'-'}${fmtMoney(g.monto)}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <button onclick="editarGasto('${g.id}')" style="background:#EFF6FF;color:#2E7DD6;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">✏️</button>
          <button onclick="eliminarGasto('${g.id}')" style="background:#FFF0F0;color:#E24B4A;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">🗑</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  _gasRenderPag(totalPags,_gasPag);
}

/* ── Paginación ── */
function _gasRenderPag(totalPags,actual){
  const cont=document.getElementById('gas-pag-btns');
  if(!cont) return;
  if(totalPags<=1){cont.innerHTML='';return;}
  let html=`<button class="gas-pag-btn" onclick="gasCambiarPag(${actual-1})" ${actual===1?'disabled':''}>
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M15 19l-7-7 7-7"/></svg></button>`;
  for(let p=1;p<=totalPags;p++){
    if(p===1||p===totalPags||Math.abs(p-actual)<=1)
      html+=`<button class="gas-pag-btn${p===actual?' on':''}" onclick="gasCambiarPag(${p})">${p}</button>`;
    else if(Math.abs(p-actual)===2)
      html+=`<span style="padding:0 4px;color:#8FA3BF;">...</span>`;
  }
  html+=`<button class="gas-pag-btn" onclick="gasCambiarPag(${actual+1})" ${actual===totalPags?'disabled':''}>
    <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M9 5l7 7-7 7"/></svg></button>`;
  cont.innerHTML=html;
}
function gasCambiarPag(p){
  const t=Math.ceil(_gasListaFilt.length/_gasPorPag)||1;
  if(p<1||p>t)return; _gasPag=p; _gasRenderTabla(_gasListaFilt);
  document.getElementById('sec-gastos')?.scrollTo(0,0);
}

/* ══ MODAL GASTO/INGRESO ══ */
function _crearModalGastoSiNoExiste(){
  if(document.getElementById('m-gasto')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="m-gasto" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalGasto()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:500px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-gasto-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">💰 Nuevo Movimiento</div>
        <button onclick="cerrarModalGasto()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-gasto-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Tipo de movimiento *</label>
          <div style="display:flex;gap:8px;margin-top:6px;">
            <button id="gas-m-btn-gasto" onclick="gasToggleTipo('gasto')" style="flex:1;padding:10px;border-radius:9px;border:2px solid #E24B4A;background:#E24B4A;color:#fff;font-size:13px;font-weight:700;cursor:pointer;">💸 Gasto</button>
            <button id="gas-m-btn-ingreso" onclick="gasToggleTipo('ingreso')" style="flex:1;padding:10px;border-radius:9px;border:2px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:700;cursor:pointer;">💰 Ingreso</button>
          </div>
          <input type="hidden" id="m-gas-es-ingreso" value="false">
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Descripción *</label>
          <input id="m-gas-desc" type="text" placeholder="Ej: Compra de alimento, Venta de novillo..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Categoría</label>
          <select id="m-gas-tipo" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option>Alimentación</option><option>Medicamentos</option><option>Veterinario</option>
            <option>Inseminación</option><option>Mano de obra</option><option>Equipos</option>
            <option>Venta de animales</option><option>Servicios</option><option>Otros</option>
          </select>
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Monto (S/) *</label>
          <input id="m-gas-monto" type="number" step="0.01" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha *</label>
          <input id="m-gas-fecha" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>

        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Animal (opcional)</label>
          <select id="m-gas-animal" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Sin animal específico</option>
          </select>
        </div>

        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
          <textarea id="m-gas-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>
      </div>
      <div id="m-gasto-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalGasto()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarGasto()" id="m-gasto-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#F0A500;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

function gasToggleTipo(tipo){
  const esI=(tipo==='ingreso');
  document.getElementById('m-gas-es-ingreso').value=esI?'true':'false';
  const bG=document.getElementById('gas-m-btn-gasto');
  const bI=document.getElementById('gas-m-btn-ingreso');
  if(bG){bG.style.background=esI?'#fff':'#E24B4A';bG.style.color=esI?'#5A6A85':'#fff';bG.style.borderColor=esI?'#E0E8F4':'#E24B4A';}
  if(bI){bI.style.background=esI?'#22C55E':'#fff';bI.style.color=esI?'#fff':'#5A6A85';bI.style.borderColor=esI?'#22C55E':'#E0E8F4';}
}

function _gasPoblarAnimales(){
  const sel=document.getElementById('m-gas-animal');
  if(!sel) return;
  sel.innerHTML='<option value="">Sin animal específico</option>'+
    DB_ANIMALES.filter(a=>a.estado!=='Muerto').map(a=>`<option value="${escH(a.arete)}">${escH(a.arete)}${a.nombre?' — '+escH(a.nombre):''}</option>`).join('');
}

function abrirModalGasto(){
  _crearModalGastoSiNoExiste();
  document.getElementById('m-gasto-id').value='';
  document.getElementById('m-gasto-titulo').textContent='💰 Nuevo Movimiento';
  document.getElementById('m-gasto-btn').textContent='💾 Guardar';
  ['m-gas-desc','m-gas-monto','m-gas-obs'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-gas-tipo').value='';
  document.getElementById('m-gas-fecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('m-gasto-error').style.display='none';
  gasToggleTipo('gasto');
  _gasPoblarAnimales();
  document.getElementById('m-gasto').style.display='flex';
}
function cerrarModalGasto(){ document.getElementById('m-gasto').style.display='none'; }

function editarGasto(id){
  const g=DB_GASTOS.find(x=>x.id===id);
  if(!g) return;
  _crearModalGastoSiNoExiste();
  _gasPoblarAnimales();
  document.getElementById('m-gasto-id').value=g.id;
  document.getElementById('m-gasto-titulo').textContent='✏️ Editar Movimiento';
  document.getElementById('m-gasto-btn').textContent='💾 Actualizar';
  document.getElementById('m-gas-desc').value=g.descripcion||'';
  document.getElementById('m-gas-tipo').value=g.tipo||'';
  document.getElementById('m-gas-monto').value=g.monto||'';
  document.getElementById('m-gas-fecha').value=g.fecha||'';
  document.getElementById('m-gas-animal').value=g.animal||'';
  document.getElementById('m-gas-obs').value=g.observaciones||'';
  gasToggleTipo(esIngreso(g)?'ingreso':'gasto');
  document.getElementById('m-gasto-error').style.display='none';
  document.getElementById('m-gasto').style.display='flex';
}

async function guardarGasto(){
  const id=document.getElementById('m-gasto-id').value;
  const desc=document.getElementById('m-gas-desc').value.trim();
  const monto=document.getElementById('m-gas-monto').value;
  const fecha=document.getElementById('m-gas-fecha').value;
  const errEl=document.getElementById('m-gasto-error');
  errEl.style.display='none';
  if(!desc||!monto||!fecha){errEl.textContent='Descripción, monto y fecha son obligatorios.';errEl.style.display='block';return;}
  const btn=document.getElementById('m-gasto-btn');
  btn.textContent='⏳ Guardando...';btn.disabled=true;
  const payload={
    rancho_id:SESSION.rancho_id,
    descripcion:desc,
    tipo:document.getElementById('m-gas-tipo').value||null,
    monto:parseFloat(monto),
    es_ingreso:document.getElementById('m-gas-es-ingreso').value==='true',
    fecha,
    animal:document.getElementById('m-gas-animal').value||null,
    observaciones:document.getElementById('m-gas-obs').value.trim()||null,
  };
  try{
    const url=id?`${SB_URL}/rest/v1/gastos?id=eq.${id}`:`${SB_URL}/rest/v1/gastos`;
    const res=await fetch(url,{method:id?'PATCH':'POST',headers:SB_HEADERS,body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}
    cerrarModalGasto();
    toast(id?'✅ Movimiento actualizado':'✅ Movimiento registrado');
    await cargarGastos();
  }catch(e){errEl.textContent=e.message;errEl.style.display='block';}
  finally{btn.textContent=id?'💾 Actualizar':'💾 Guardar';btn.disabled=false;}
}

async function eliminarGasto(id){
  if(!confirm('¿Eliminar este movimiento?')) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/gastos?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Eliminado');
    DB_GASTOS=DB_GASTOS.filter(g=>g.id!==id);
    _gasLista=_gasLista.filter(g=>g.id!==id);
    _gasListaFilt=_gasListaFilt.filter(g=>g.id!==id);
    _gasRenderTabla(_gasListaFilt);
  }catch(e){toast('❌ '+e.message);}
}

/* ══════════════════════════════════════════
   MÓDULO INVENTARIO — Supabase real
   ══════════════════════════════════════════ */

let _invLista     = [];
let _invListaFilt = [];
let _invPag       = 1;
const _invPorPag  = 10;
let _invBusqQ     = '';
let _invFiltroEst = ''; // ''|'bajo'|'agotado'|'ok'

/* ── Cargar inventario ── */
async function cargarInventario(){
  const tbody=document.getElementById('inv-tbody');
  if(tbody) tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:30px;color:#8FA3BF;">⏳ Cargando...</td></tr>';

  const ranchoId=await _asegurarRanchoId();
  if(!ranchoId){
    if(tbody) tbody.innerHTML='<tr><td colspan="10" style="text-align:center;padding:30px;color:#e07b00;">⚠️ Sin rancho asignado.</td></tr>';
    return;
  }
  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/inventario?rancho_id=eq.${ranchoId}&select=*&order=nombre.asc`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    if(!res.ok) throw new Error(data.message||`Error ${res.status}`);
    DB_INVENTARIO=Array.isArray(data)?data:[];
    _invLista=[...DB_INVENTARIO];
    _invAplicarFiltros();
  }catch(e){
    console.error('[Inventario]',e);
    if(tbody) tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:30px;color:#e53e3e;">❌ ${escH(e.message)}</td></tr>`;
  }
}

/* ── Estado de stock ── */
function _invEstado(item){
  const stock=parseFloat(item.stock||0);
  const minimo=parseFloat(item.minimo||0);
  if(stock<=0) return 'agotado';
  if(stock<=minimo) return 'bajo';
  return 'ok';
}

/* ── Filtros ── */
function invBuscar(q){ _invBusqQ=q; _invAplicarFiltros(); }
function invFiltrarEst(est){ _invFiltroEst=est; _invAplicarFiltros(); }

function _invAplicarFiltros(){
  let lista=[..._invLista];
  if(_invBusqQ){
    const q=_invBusqQ.toLowerCase();
    lista=lista.filter(i=>(i.nombre||'').toLowerCase().includes(q)||(i.categoria||'').toLowerCase().includes(q)||(i.proveedor||'').toLowerCase().includes(q));
  }
  if(_invFiltroEst) lista=lista.filter(i=>_invEstado(i)===_invFiltroEst);
  _invListaFilt=lista;
  _invPag=1;
  _invRenderTabla(_invListaFilt);
}

/* ── Renderizar ── */
function _invRenderTabla(lista){
  const tbody=document.getElementById('inv-tbody');
  if(!tbody) return;

  /* Stats */
  const total=_invLista.length;
  const bajo=_invLista.filter(i=>_invEstado(i)==='bajo').length;
  const agotado=_invLista.filter(i=>_invEstado(i)==='agotado').length;
  const valor=_invLista.reduce((s,i)=>s+parseFloat(i.stock||0)*parseFloat(i.precio||0),0);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('inv-s-total', total);
  set('inv-s-bajo',  bajo);
  set('inv-s-agotado',agotado);
  set('inv-s-valor', fmtMoney(valor));

  /* Paginación */
  const totalPags=Math.ceil(lista.length/_invPorPag)||1;
  const inicio=(_invPag-1)*_invPorPag;
  const pag=lista.slice(inicio,inicio+_invPorPag);
  const info=document.getElementById('inv-pag-info');
  if(info) info.textContent=lista.length
    ?`Mostrando ${inicio+1}–${Math.min(inicio+_invPorPag,lista.length)} de ${lista.length} productos`
    :'Sin productos';

  if(!pag.length){
    tbody.innerHTML=`<tr><td colspan="10" style="text-align:center;padding:40px;color:#8FA3BF;">
      ${_invBusqQ||_invFiltroEst?'🔍 Sin resultados.':'📦 Sin productos en inventario. ¡Agrega el primero!'}
    </td></tr>`;
    _invRenderPag(0,0); return;
  }

  const badgeEst=item=>{
    const est=_invEstado(item);
    if(est==='agotado') return '<span style="background:#FEE2E2;color:#991B1B;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;">⛔ Agotado</span>';
    if(est==='bajo')    return '<span style="background:#FEF3C7;color:#92400E;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;">⚠️ Stock bajo</span>';
    return '<span style="background:#D1FAE5;color:#065F46;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;">✅ OK</span>';
  };

  tbody.innerHTML=pag.map(item=>`
    <tr>
      <td><input type="checkbox" onclick="event.stopPropagation()"></td>
      <td>
        <div style="font-weight:600;color:#0D2B6B;font-size:13px;">${escH(item.nombre||'—')}</div>
        ${item.descripcion?`<div style="font-size:10px;color:#8FA3BF;">${escH(item.descripcion)}</div>`:''}
      </td>
      <td><span style="background:#EFF6FF;color:#1D4ED8;padding:3px 8px;border-radius:20px;font-size:10px;font-weight:600;">${escH(item.categoria||'—')}</span></td>
      <td>
        <div style="font-weight:700;font-size:14px;color:${_invEstado(item)==='ok'?'#0D2B6B':'#E24B4A'};">${item.stock||0}</div>
        <div style="font-size:10px;color:#8FA3BF;">Mín: ${item.minimo||0}</div>
      </td>
      <td style="color:#5A6A85;">${escH(item.unidad||'—')}</td>
      <td style="font-weight:600;color:#22C55E;">${item.precio?fmtMoney(item.precio):'—'}</td>
      <td style="font-size:12px;color:${item.vencimiento&&new Date(item.vencimiento)<new Date()?'#E24B4A':'#5A6A85'};">${item.vencimiento?fmtFecha(item.vencimiento):'—'}</td>
      <td>${badgeEst(item)}</td>
      <td style="font-size:12px;color:#8FA3BF;">${escH(item.observaciones||'—')}</td>
      <td>
        <div style="display:flex;gap:4px;">
          <button onclick="editarInventario('${item.id}')" style="background:#EFF6FF;color:#2E7DD6;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">✏️</button>
          <button onclick="eliminarInventario('${item.id}')" style="background:#FFF0F0;color:#E24B4A;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">🗑</button>
        </div>
      </td>
    </tr>`).join('');
  _invRenderPag(totalPags,_invPag);
}

/* ── Paginación ── */
function _invRenderPag(totalPags,actual){
  const cont=document.getElementById('inv-pag-btns');
  if(!cont) return;
  if(totalPags<=1){cont.innerHTML='';return;}
  let html=`<button class="inv-pag-btn" onclick="invCambiarPag(${actual-1})" ${actual===1?'disabled':''}><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M15 19l-7-7 7-7"/></svg></button>`;
  for(let p=1;p<=totalPags;p++){
    if(p===1||p===totalPags||Math.abs(p-actual)<=1)
      html+=`<button class="inv-pag-btn${p===actual?' on':''}" onclick="invCambiarPag(${p})">${p}</button>`;
    else if(Math.abs(p-actual)===2)
      html+=`<span style="padding:0 4px;color:#8FA3BF;">...</span>`;
  }
  html+=`<button class="inv-pag-btn" onclick="invCambiarPag(${actual+1})" ${actual===totalPags?'disabled':''}><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M9 5l7 7-7 7"/></svg></button>`;
  cont.innerHTML=html;
}
function invCambiarPag(p){
  const t=Math.ceil(_invListaFilt.length/_invPorPag)||1;
  if(p<1||p>t)return; _invPag=p; _invRenderTabla(_invListaFilt);
  document.getElementById('sec-inventario')?.scrollTo(0,0);
}

/* ══ MODAL INVENTARIO ══ */
function _crearModalInvSiNoExiste(){
  if(document.getElementById('m-inv')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="m-inv" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalInv()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:540px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-inv-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">📦 Nuevo Producto</div>
        <button onclick="cerrarModalInv()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-inv-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Nombre del producto *</label>
          <input id="m-inv-nombre" type="text" placeholder="Ej: Ivermectina, Alimento balanceado..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Categoría</label>
          <select id="m-inv-cat" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option>Medicamentos</option><option>Vacunas</option><option>Alimentos</option>
            <option>Equipos</option><option>Herramientas</option><option>Suplementos</option><option>Otros</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Unidad de medida</label>
          <select id="m-inv-unidad" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option>unidades</option><option>kg</option><option>g</option>
            <option>litros</option><option>ml</option><option>dosis</option><option>cajas</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Stock actual *</label>
          <input id="m-inv-stock" type="number" step="0.1" placeholder="0" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Stock mínimo</label>
          <input id="m-inv-minimo" type="number" step="0.1" placeholder="0" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Precio unitario (S/)</label>
          <input id="m-inv-precio" type="number" step="0.01" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Proveedor</label>
          <input id="m-inv-prov" type="text" placeholder="Nombre del proveedor" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Fecha de vencimiento</label>
          <input id="m-inv-venc" type="date" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Ubicación</label>
          <input id="m-inv-ubic" type="text" placeholder="Ej: Bodega A, Estante 2..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Descripción</label>
          <textarea id="m-inv-desc" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>
      </div>
      <div id="m-inv-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalInv()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarInventario()" id="m-inv-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#F0A500;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

function abrirModalInventario(){
  _crearModalInvSiNoExiste();
  document.getElementById('m-inv-id').value='';
  document.getElementById('m-inv-titulo').textContent='📦 Nuevo Producto';
  document.getElementById('m-inv-btn').textContent='💾 Guardar';
  ['m-inv-nombre','m-inv-stock','m-inv-minimo','m-inv-precio','m-inv-prov','m-inv-venc','m-inv-ubic','m-inv-desc']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('m-inv-cat').value='';
  document.getElementById('m-inv-unidad').value='';
  document.getElementById('m-inv-error').style.display='none';
  document.getElementById('m-inv').style.display='flex';
}
function cerrarModalInv(){ document.getElementById('m-inv').style.display='none'; }

function editarInventario(id){
  const item=DB_INVENTARIO.find(x=>x.id===id);
  if(!item) return;
  _crearModalInvSiNoExiste();
  document.getElementById('m-inv-id').value=item.id;
  document.getElementById('m-inv-titulo').textContent='✏️ Editar Producto';
  document.getElementById('m-inv-btn').textContent='💾 Actualizar';
  document.getElementById('m-inv-nombre').value  = item.nombre        || '';
  document.getElementById('m-inv-cat').value     = item.categoria      || '';
  document.getElementById('m-inv-unidad').value  = item.unidad         || '';
  document.getElementById('m-inv-stock').value   = item.stock          || '';
  document.getElementById('m-inv-minimo').value  = item.minimo         || '';
  document.getElementById('m-inv-precio').value  = item.precio         || '';
  document.getElementById('m-inv-prov').value    = item.proveedor      || '';
  document.getElementById('m-inv-venc').value    = item.vencimiento    || '';
  document.getElementById('m-inv-ubic').value    = '';  // columna no existe
  document.getElementById('m-inv-desc').value    = item.observaciones  || '';
  document.getElementById('m-inv-error').style.display='none';
  document.getElementById('m-inv').style.display='flex';
}

async function guardarInventario(){
  const id=document.getElementById('m-inv-id').value;
  const nombre=document.getElementById('m-inv-nombre').value.trim();
  const stock=document.getElementById('m-inv-stock').value;
  const errEl=document.getElementById('m-inv-error');
  errEl.style.display='none';
  if(!nombre||stock===''){errEl.textContent='Nombre y stock son obligatorios.';errEl.style.display='block';return;}
  const btn=document.getElementById('m-inv-btn');
  btn.textContent='⏳ Guardando...';btn.disabled=true;
  const payload={
    id: crypto.randomUUID(),
    rancho_id: String(SESSION.rancho_id),
    user_id:   SESSION.user_id,
    nombre,
    categoria:     document.getElementById('m-inv-cat').value    || null,
    unidad:        document.getElementById('m-inv-unidad').value  || 'unidades',
    stock:         parseFloat(document.getElementById('m-inv-stock').value)  || 0,
    minimo:        parseFloat(document.getElementById('m-inv-minimo').value) || 0,
    precio:        parseFloat(document.getElementById('m-inv-precio').value) || 0,
    proveedor:     document.getElementById('m-inv-prov').value.trim()  || null,
    vencimiento:   document.getElementById('m-inv-venc').value          || null,
    observaciones: document.getElementById('m-inv-desc').value.trim()  || null,
  };
  try{
  const url=id?`${SB_URL}/rest/v1/inventario?id=eq.${id}`:`${SB_URL}/rest/v1/inventario`;
  const method=id?'PATCH':'POST';
  // En PATCH no enviar id ni user_id
  const body=id?{...payload}:{...payload};
  if(id){ delete body.id; }
  const res=await fetch(url,{method,headers:SB_HEADERS,body:JSON.stringify(body)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}
    cerrarModalInv();
    toast(id?'✅ Producto actualizado':'✅ Producto registrado');
    await cargarInventario();
  }catch(e){errEl.textContent=e.message;errEl.style.display='block';}
  finally{btn.textContent=id?'💾 Actualizar':'💾 Guardar';btn.disabled=false;}
}

async function eliminarInventario(id){
  if(!confirm('¿Eliminar este producto del inventario?')) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/inventario?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Producto eliminado');
    DB_INVENTARIO=DB_INVENTARIO.filter(i=>i.id!==id);
    _invLista=_invLista.filter(i=>i.id!==id);
    _invListaFilt=_invListaFilt.filter(i=>i.id!==id);
    _invRenderTabla(_invListaFilt);
  }catch(e){toast('❌ '+e.message);}
}

/* ══════════════════════════════════════════
   MÓDULO PROVEEDORES — Supabase real
   ══════════════════════════════════════════ */

let DB_PROVEEDORES = [];
let _provLista     = [];
let _provBusqQ     = '';
let _provPag       = 1;
const _provPorPag  = 10;

const PROV_COLORES = ['#2E7DD6','#22C55E','#F0A500','#E24B4A','#9333EA','#0891B2','#DC2626','#16A34A'];

/* ── Cargar proveedores ── */
async function cargarProveedores(){
  const lista=document.getElementById('prov-lista');
  if(lista) lista.innerHTML='<div style="text-align:center;padding:40px;color:#8FA3BF;">⏳ Cargando...</div>';

  const ranchoId=await _asegurarRanchoId();
  if(!ranchoId){
    if(lista) lista.innerHTML='<div style="text-align:center;padding:30px;color:#e07b00;">⚠️ Sin rancho asignado.</div>';
    return;
  }
  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/proveedores?rancho_id=eq.${ranchoId}&select=*&order=nombre.asc`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    if(!res.ok) throw new Error(data.message||`Error ${res.status}`);
    DB_PROVEEDORES=Array.isArray(data)?data:[];
    _provLista=[...DB_PROVEEDORES];
    _provRenderLista(_provLista);
    _provRenderStats();
  }catch(e){
    console.error('[Proveedores]',e);
    if(lista) lista.innerHTML=`<div style="text-align:center;padding:30px;color:#e53e3e;">❌ ${escH(e.message)}</div>`;
  }
}

/* ── Stats ── */
function _provRenderStats(){
  const total  = DB_PROVEEDORES.length;
  const cats   = new Set(DB_PROVEEDORES.map(p=>p.tipo).filter(Boolean)).size;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('prov-s-total',  total);
  set('prov-s-cats',   cats);
  set('prov-s-ordenes','—');
  set('prov-s-compras','S/ 0.00');
}

/* ── Filtros ── */
function provBuscar(q){ _provBusqQ=q; _provFiltrar(); }
function _provFiltrar(){
  let lista=[...DB_PROVEEDORES];
  if(_provBusqQ){
    const q=_provBusqQ.toLowerCase();
    lista=lista.filter(p=>(p.nombre||'').toLowerCase().includes(q)||(p.categoria||'').toLowerCase().includes(q)||(p.contacto||'').toLowerCase().includes(q)||(p.telefono||'').toLowerCase().includes(q));
  }
  _provLista=lista;
  _provPag=1;
  _provRenderLista(_provLista);
}

/* ── Renderizar lista ── */
function _provRenderLista(lista){
  const cont=document.getElementById('prov-lista');
  if(!cont) return;

  const total=lista.length;
  const inicio=(_provPag-1)*_provPorPag;
  const pag=lista.slice(inicio,inicio+_provPorPag);

  const info=document.getElementById('prov-pag-info');
  if(info) info.textContent=total?`Mostrando ${inicio+1}–${Math.min(inicio+_provPorPag,total)} de ${total} proveedores`:'Sin proveedores';

  if(!pag.length){
    cont.innerHTML=`<div style="text-align:center;padding:50px;color:#8FA3BF;">
      ${_provBusqQ?'🔍 Sin resultados.':'🏪 Sin proveedores registrados. ¡Agrega el primero!'}
    </div>`;
    _provRenderPag(0,0); return;
  }

  cont.innerHTML=pag.map((p,i)=>{
    const inicial=(p.nombre||'?').charAt(0).toUpperCase();
    const color=PROV_COLORES[(DB_PROVEEDORES.indexOf(p))%PROV_COLORES.length];
    return `<div class="prov-item" onclick="verProveedor('${p.id}')">
      <input type="checkbox" class="prov-chk" onclick="event.stopPropagation()"/>
      <div class="prov-avatar" style="background:${color};color:#fff;">${inicial}</div>
      <div class="prov-info" style="flex:1;min-width:0;">
        <div style="font-weight:700;color:#0D2B6B;font-size:14px;">${escH(p.nombre||'—')}</div>
        <div style="font-size:11px;color:#8FA3BF;margin-top:2px;">
          ${p.tipo?`<span style="background:#EFF6FF;color:#2E7DD6;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;margin-right:6px;">${escH(p.tipo)}</span>`:''}
          ${p.telefono?`📞 ${escH(p.telefono)}`:''} ${p.email?`· ✉️ ${escH(p.email)}`:''}
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        ${p.ciudad?`<div style="font-size:11px;color:#8FA3BF;">📍 ${escH(p.ciudad)}</div>`:''}
        <div class="prov-acciones" style="display:flex;gap:4px;margin-top:4px;justify-content:flex-end;" onclick="event.stopPropagation()">
          <button onclick="editarProveedor('${p.id}')" style="background:#EFF6FF;color:#2E7DD6;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">✏️</button>
          <button onclick="eliminarProveedor('${p.id}')" style="background:#FFF0F0;color:#E24B4A;border:none;border-radius:7px;padding:5px 8px;cursor:pointer;font-size:12px;">🗑</button>
        </div>
      </div>
    </div>`;
  }).join('');

  _provRenderPag(Math.ceil(total/_provPorPag),_provPag);
}

/* ── Paginación ── */
function _provRenderPag(totalPags,actual){
  const cont=document.getElementById('prov-pag-btns');
  if(!cont) return;
  if(totalPags<=1){cont.innerHTML='';return;}
  let html=`<button class="prov-pag-btn" onclick="provCambiarPag(${actual-1})" ${actual===1?'disabled':''}><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M15 19l-7-7 7-7"/></svg></button>`;
  for(let p=1;p<=totalPags;p++){
    if(p===1||p===totalPags||Math.abs(p-actual)<=1)
      html+=`<button class="prov-pag-btn${p===actual?' on':''}" onclick="provCambiarPag(${p})">${p}</button>`;
    else if(Math.abs(p-actual)===2)
      html+=`<span style="padding:0 4px;color:#8FA3BF;">...</span>`;
  }
  html+=`<button class="prov-pag-btn" onclick="provCambiarPag(${actual+1})" ${actual===totalPags?'disabled':''}><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="13" height="13"><path d="M9 5l7 7-7 7"/></svg></button>`;
  cont.innerHTML=html;
}
function provCambiarPag(p){
  const t=Math.ceil(_provLista.length/_provPorPag)||1;
  if(p<1||p>t)return; _provPag=p; _provRenderLista(_provLista);
  document.getElementById('sec-proveedores')?.scrollTo(0,0);
}

/* ── Ver detalle proveedor ── */
function verProveedor(id){
  const p=DB_PROVEEDORES.find(x=>x.id===id);
  if(!p) return;
  toast(`🏪 ${p.nombre} · ${p.telefono||''} · ${p.email||''}`);
}

/* ══ MODAL PROVEEDOR ══ */
function _crearModalProvSiNoExiste(){
  if(document.getElementById('m-prov')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="m-prov" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)cerrarModalProv()">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="m-prov-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">🏪 Nuevo Proveedor</div>
        <button onclick="cerrarModalProv()" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="m-prov-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Nombre *</label>
          <input id="m-prov-nombre" type="text" placeholder="Nombre del proveedor" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Tipo / Categoría</label>
          <select id="m-prov-cat" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="">Seleccionar...</option>
            <option>Medicamentos</option><option>Alimentos</option><option>Equipos</option>
            <option>Semillas</option><option>Servicios</option><option>Transporte</option><option>Otros</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">RUC</label>
          <input id="m-prov-ruc" type="text" placeholder="Ej: 20123456789" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Teléfono</label>
          <input id="m-prov-tel" type="text" placeholder="Ej: 987654321" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Email</label>
          <input id="m-prov-email" type="email" placeholder="correo@empresa.com" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Contacto</label>
          <input id="m-prov-contacto" type="text" placeholder="Nombre del contacto" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Ciudad</label>
          <input id="m-prov-ciudad" type="text" placeholder="Ej: Lima, Arequipa..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Sitio Web</label>
          <input id="m-prov-web" type="text" placeholder="www.empresa.com" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Dirección</label>
          <input id="m-prov-dir" type="text" placeholder="Dirección completa" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Productos que provee</label>
          <input id="m-prov-productos" type="text" placeholder="Ej: Ivermectina, Alimento balanceado..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Observaciones</label>
          <textarea id="m-prov-obs" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>
      </div>
      <div id="m-prov-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="cerrarModalProv()" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarProveedor()" id="m-prov-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#F0A500;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

function abrirModalProveedor(){
  _crearModalProvSiNoExiste();
  document.getElementById('m-prov-id').value='';
  document.getElementById('m-prov-titulo').textContent='🏪 Nuevo Proveedor';
  document.getElementById('m-prov-btn').textContent='💾 Guardar';
  ['m-prov-nombre','m-prov-tel','m-prov-email','m-prov-contacto','m-prov-ciudad',
   'm-prov-dir','m-prov-obs','m-prov-ruc','m-prov-web','m-prov-productos']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';})
  document.getElementById('m-prov-cat').value='';
  document.getElementById('m-prov-error').style.display='none';
  document.getElementById('m-prov').style.display='flex';
}
function cerrarModalProv(){ document.getElementById('m-prov').style.display='none'; }

function editarProveedor(id){
  const p=DB_PROVEEDORES.find(x=>x.id===id);
  if(!p) return;
  _crearModalProvSiNoExiste();
  document.getElementById('m-prov-id').value     = p.id;
  document.getElementById('m-prov-titulo').textContent='✏️ Editar Proveedor';
  document.getElementById('m-prov-btn').textContent='💾 Actualizar';
  document.getElementById('m-prov-nombre').value  = p.nombre        ||'';
  document.getElementById('m-prov-cat').value      = p.tipo          ||'';
  document.getElementById('m-prov-tel').value      = p.telefono      ||'';
  document.getElementById('m-prov-email').value    = p.email         ||'';
  document.getElementById('m-prov-contacto').value = p.contacto      ||'';
  document.getElementById('m-prov-ciudad').value   = p.ciudad        ||'';
  document.getElementById('m-prov-dir').value      = p.direccion     ||'';
  document.getElementById('m-prov-obs').value      = p.obs          ||'';
  const rucEl=document.getElementById('m-prov-ruc'); if(rucEl) rucEl.value=p.ruc||'';
  const webEl=document.getElementById('m-prov-web'); if(webEl) webEl.value=p.web||'';
  const prodEl=document.getElementById('m-prov-productos'); if(prodEl) prodEl.value=p.productos||'';
  const emailEl=document.getElementById('m-prov-email'); if(emailEl) emailEl.value=p.email||'';
  document.getElementById('m-prov-error').style.display='none';
  document.getElementById('m-prov').style.display='flex';
}

async function guardarProveedor(){
  const id     = document.getElementById('m-prov-id').value;
  const nombre = document.getElementById('m-prov-nombre').value.trim();
  const errEl  = document.getElementById('m-prov-error');
  errEl.style.display='none';
  if(!nombre){errEl.textContent='El nombre es obligatorio.';errEl.style.display='block';return;}
  const btn=document.getElementById('m-prov-btn');
  btn.textContent='⏳ Guardando...';btn.disabled=true;
  /* Campos base que siempre existen */
  const payload={
    id:        id || crypto.randomUUID(),
    rancho_id: String(SESSION.rancho_id),
    nombre,
    tipo:      document.getElementById('m-prov-cat').value.trim()       ||null,
    telefono:  document.getElementById('m-prov-tel').value.trim()       ||null,
    contacto:  document.getElementById('m-prov-contacto').value.trim()  ||null,
    obs:       document.getElementById('m-prov-obs').value.trim()       ||null,
    fecha:     new Date().toISOString().split('T')[0],
  };
  /* Campos extendidos — se agregan solo si tienen valor
     (Supabase los ignorará si la columna no existe aún) */
  const ext={
    email:     document.getElementById('m-prov-email')?.value.trim()     ||null,
    ciudad:    document.getElementById('m-prov-ciudad')?.value.trim()    ||null,
    direccion: document.getElementById('m-prov-dir')?.value.trim()       ||null,
    ruc:       document.getElementById('m-prov-ruc')?.value.trim()       ||null,
    web:       document.getElementById('m-prov-web')?.value.trim()       ||null,
    productos: document.getElementById('m-prov-productos')?.value.trim() ||null,
    categoria: document.getElementById('m-prov-cat')?.value.trim()       ||null,
  };
  Object.entries(ext).forEach(([k,v])=>{ if(v) payload[k]=v; });
  try{
    const url=id?`${SB_URL}/rest/v1/proveedores?id=eq.${id}`:`${SB_URL}/rest/v1/proveedores`;
    const body={...payload}; if(id) delete body.id;
    const res=await fetch(url,{method:id?'PATCH':'POST',headers:SB_HEADERS,body:JSON.stringify(body)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}
    cerrarModalProv();
    toast(id?'✅ Proveedor actualizado':'✅ Proveedor registrado');
    await cargarProveedores();
  }catch(e){errEl.textContent=e.message;errEl.style.display='block';}
  finally{btn.textContent=id?'💾 Actualizar':'💾 Guardar';btn.disabled=false;}
}

async function eliminarProveedor(id){
  const p=DB_PROVEEDORES.find(x=>x.id===id);
  if(!confirm(`¿Eliminar proveedor "${p?.nombre}"?`)) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/proveedores?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Proveedor eliminado');
    DB_PROVEEDORES=DB_PROVEEDORES.filter(x=>x.id!==id);
    _provLista=_provLista.filter(x=>x.id!==id);
    _provRenderLista(_provLista);
    _provRenderStats();
  }catch(e){toast('❌ '+e.message);}
}

/* ══════════════════════════════════════════
   MÓDULO BANCO GENÉTICO — Supabase real
   ══════════════════════════════════════════ */

let DB_BANCO   = [];   // semen_toros
let _bkTab     = 'toros';  // 'toros' | 'dosis'
let _bkBusqQ   = '';
let _bkFiltRaza= '';

/* ── Cargar banco ── */
async function cargarBanco(){
  const grid=document.getElementById('bk-grid');
  if(grid) grid.innerHTML='<div style="text-align:center;padding:40px;color:#8FA3BF;grid-column:1/-1;">⏳ Cargando...</div>';

  const ranchoId=await _asegurarRanchoId();
  if(!ranchoId){
    if(grid) grid.innerHTML='<div style="text-align:center;padding:30px;color:#e07b00;grid-column:1/-1;">⚠️ Sin rancho asignado.</div>';
    return;
  }
  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/semen_toros?rancho_id=eq.${ranchoId}&select=*&order=created_at.desc`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    if(!res.ok) throw new Error(data.message||`Error ${res.status}`);
    DB_BANCO=Array.isArray(data)?data:[];
    _bkRenderStats();
    _bkRenderRazas();
    bkTab(_bkTab);
  }catch(e){
    console.error('[Banco]',e);
    if(grid) grid.innerHTML=`<div style="text-align:center;padding:30px;color:#e53e3e;grid-column:1/-1;">❌ ${escH(e.message)}</div>`;
  }
}

/* ── Stats ── */
function _bkRenderStats(){
  const total  = DB_BANCO.length;
  const razas  = new Set(DB_BANCO.map(t=>t['Raza']).filter(Boolean)).size;
  const dosis  = DB_BANCO.reduce((s,t)=>s+parseInt(t['Pajillas']||0),0);
  const activos= DB_BANCO.filter(t=>t['Notas']!=='Inactivo').length;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('bk-s-toros',   total);
  set('bk-s-razas',   razas);
  set('bk-s-dosis',   dosis);
  set('bk-s-activos', activos);
  // Tabs
  const t1=document.getElementById('bk-t1');
  const t2=document.getElementById('bk-t2');
  if(t1){ const n=t1.querySelector('.bk-tab-n'); if(n) n.textContent=total; }
  if(t2){ const n=t2.querySelector('.bk-tab-n'); if(n) n.textContent=dosis; }
}

/* ── Poblar select de razas ── */
function _bkRenderRazas(){
  const sel=document.getElementById('bk-raza');
  if(!sel) return;
  const razas=[...new Set(DB_BANCO.map(t=>t['Raza']).filter(Boolean))].sort();
  sel.innerHTML='<option value="">Todas las razas</option>'+
    razas.map(r=>`<option value="${escH(r)}">${escH(r)}</option>`).join('');
  sel.onchange=()=>{ _bkFiltRaza=sel.value; _bkRenderGrid(); };
}

/* ── Tabs ── */
function bkTab(tab){
  _bkTab=tab;
  const t1=document.getElementById('bk-t1');
  const t2=document.getElementById('bk-t2');
  if(t1) t1.classList.toggle('on',tab==='toros');
  if(t2) t2.classList.toggle('on',tab==='dosis');
  const grid=document.getElementById('bk-grid');
  const dosis=document.getElementById('bk-dosis');
  if(grid) grid.style.display=tab==='toros'?'':'none';
  if(dosis) dosis.style.display=tab==='dosis'?'block':'none';
  if(tab==='toros') _bkRenderGrid();
  else _bkRenderDosis();
}

/* ── Buscador ── */
function bkBuscar(q){ _bkBusqQ=q; _bkRenderGrid(); }

/* ── Render grid de toros ── */
function _bkRenderGrid(){
  const grid=document.getElementById('bk-grid');
  if(!grid) return;

  let lista=[...DB_BANCO];
  if(_bkBusqQ){
    const q=_bkBusqQ.toLowerCase();
    lista=lista.filter(t=>(t['Nombre']||'').toLowerCase().includes(q)||(t['Raza']||'').toLowerCase().includes(q)||(t['Codigo']||'').toLowerCase().includes(q));
  }
  if(_bkFiltRaza) lista=lista.filter(t=>t['Raza']===_bkFiltRaza);

  if(!lista.length){
    grid.innerHTML=`<div style="text-align:center;padding:50px;color:#8FA3BF;grid-column:1/-1;">
      ${_bkBusqQ||_bkFiltRaza?'🔍 Sin resultados.':'🐂 Sin toros registrados en el banco. ¡Agrega el primero!'}
    </div>`;
    return;
  }

  const COLORES=['#2E7DD6','#22C55E','#F0A500','#E24B4A','#9333EA','#0891B2'];

  grid.innerHTML=lista.map((t,i)=>{
    const dosis=parseInt(t['Pajillas']||0);
    const activo=t['Notas']!=='Inactivo';
    const color=COLORES[i%COLORES.length];
    const inicial=(t['Nombre']||'T').charAt(0).toUpperCase();
    return `<div class="bk-card">
      <div class="bk-card-top">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:46px;height:46px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:'Montserrat',sans-serif;font-size:20px;font-weight:800;color:#fff;">${inicial}</div>
          <div>
            <div style="font-family:'Montserrat',sans-serif;font-size:14px;font-weight:700;color:#0D2B6B;">${escH(t['Nombre']||'—')}</div>
            <div style="font-size:11px;color:#8FA3BF;">${escH(t['Codigo']||'')} ${t['Codigo']&&t['Raza']?'·':''} ${escH(t['Raza']||'')}</div>
          </div>
        </div>
        <span style="background:${activo?'#e8f5e9':'#fee2e2'};color:${activo?'#1b8e4e':'#e53e3e'};padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;">${activo?'● Activo':'● Inactivo'}</span>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <div style="background:#F8FAFF;border-radius:9px;padding:10px;">
          <div style="font-size:10px;color:#8FA3BF;text-transform:uppercase;font-weight:600;">Dosis disponibles</div>
          <div style="font-size:20px;font-weight:800;color:${dosis>5?'#22C55E':dosis>0?'#F0A500':'#E24B4A'};">${dosis}</div>
        </div>
        <div style="background:#F8FAFF;border-radius:9px;padding:10px;">
          <div style="font-size:10px;color:#8FA3BF;text-transform:uppercase;font-weight:600;">Precio / dosis</div>
          <div style="font-size:16px;font-weight:700;color:#0D2B6B;">${t['Precio']?fmtMoney(t['Precio']):'—'}</div>
        </div>
      </div>

      ${t['Dep']||t['Empresa']||t['Pais']?`
      <div style="font-size:12px;color:#5A6A85;line-height:1.5;">
        ${t['Empresa']?`<div>🏢 <strong>Empresa:</strong> ${escH(t['Empresa'])}</div>`:''}
        ${t['Pais']?`<div>🌍 <strong>País:</strong> ${escH(t['Pais'])}</div>`:''}
        ${t['Dep']?`<div>⭐ <strong>DEP:</strong> ${escH(t['Dep'])}</div>`:''}
      </div>`:''}

      <div style="display:flex;gap:6px;justify-content:flex-end;border-top:1px solid #F0F4FA;padding-top:10px;">
        <button onclick="editarToro('${t.id}')" style="background:#EFF6FF;color:#2E7DD6;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">✏️ Editar</button>
        <button onclick="eliminarToro('${t.id}')" style="background:#FFF0F0;color:#E24B4A;border:none;border-radius:7px;padding:6px 12px;cursor:pointer;font-size:12px;font-weight:600;">🗑</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Render panel dosis ── */
function _bkRenderDosis(){
  const cont=document.getElementById('bk-dosis');
  if(!cont) return;

  if(!DB_BANCO.length){
    cont.innerHTML='<div style="text-align:center;padding:40px;color:#8FA3BF;">Sin toros registrados.</div>';
    return;
  }

  cont.style.display='block';
  cont.innerHTML=`
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E8EEF8;">
      <thead>
        <tr style="background:#F8FAFF;font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">
          <th style="padding:12px 16px;text-align:left;">Toro</th>
          <th style="padding:12px 16px;text-align:left;">Raza</th>
          <th style="padding:12px 16px;text-align:right;">Dosis</th>
          <th style="padding:12px 16px;text-align:right;">Precio/dosis</th>
          <th style="padding:12px 16px;text-align:left;">Estado</th>
          <th style="padding:12px 16px;text-align:left;">Origen</th>
        </tr>
      </thead>
      <tbody>
        ${DB_BANCO.map(t=>{
          const dosis=parseInt(t.dosis_disponibles||t.dosis||0);
          const color=dosis>5?'#22C55E':dosis>0?'#F0A500':'#E24B4A';
          return `<tr style="border-bottom:1px solid #F0F4FA;">
            <td style="padding:12px 16px;font-weight:700;color:#0D2B6B;">${escH(t['Nombre']||'—')}</td>
            <td style="padding:12px 16px;color:#5A6A85;">${escH(t['Raza']||'—')}</td>
            <td style="padding:12px 16px;text-align:right;font-weight:800;color:${color};font-size:16px;">${dosis}</td>
            <td style="padding:12px 16px;text-align:right;color:#22C55E;font-weight:600;">${t['Precio']?fmtMoney(t['Precio']):'—'}</td>
            <td style="padding:12px 16px;"><span style="background:${t['Notas']!=='Inactivo'?'#e8f5e9':'#fee2e2'};color:${t['Notas']!=='Inactivo'?'#1b8e4e':'#e53e3e'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;">${t['Notas']==='Inactivo'?'Inactivo':'Activo'}</span></td>
            <td style="padding:12px 16px;color:#8FA3BF;font-size:12px;">${escH(t['Empresa']||'—')}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

/* ══ MODAL TORO ══ */
function bkModal(abrir, id=''){
  let modal=document.getElementById('bk-modal');
  if(!abrir){ if(modal) modal.style.display='none'; return; }

  // Si el modal ya existe en el HTML, usarlo
  if(modal){
    // Limpiar el form del modal original del HTML
    modal.querySelector && _bkLlenarModal(id);
    modal.style.display='flex';
    return;
  }
  // Crear modal dinámico si no existe
  _crearModalToro();
  _bkLlenarModal(id);
  document.getElementById('bk-modal').style.display='flex';
}

function _crearModalToro(){
  if(document.getElementById('bk-modal')) return;
  const div=document.createElement('div');
  div.innerHTML=`
  <div id="bk-modal" style="display:none;position:fixed;inset:0;background:rgba(13,43,107,.5);z-index:9999;align-items:center;justify-content:center;padding:16px;" onclick="if(event.target===this)bkModal(false)">
    <div style="background:#fff;border-radius:18px;width:100%;max-width:540px;max-height:92vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <div id="bk-modal-titulo" style="font-family:'Montserrat',sans-serif;font-size:17px;font-weight:700;color:#0D2B6B;">🐂 Nuevo Toro</div>
        <button onclick="bkModal(false)" style="background:none;border:none;font-size:26px;cursor:pointer;color:#9eaaba;line-height:1;">×</button>
      </div>
      <input type="hidden" id="bk-id">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Nombre del toro *</label>
          <input id="bk-nombre" type="text" placeholder="Ej: Don Rufino" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Código</label>
          <input id="bk-codigo" type="text" placeholder="Ej: T-001" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Raza *</label>
          <input id="bk-raza-m" type="text" placeholder="Ej: Brahman, Angus..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Dosis disponibles</label>
          <input id="bk-dosis-m" type="number" placeholder="0" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Precio por dosis (S/)</label>
          <input id="bk-precio" type="number" step="0.01" placeholder="0.00" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Estado</label>
          <select id="bk-estado" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;background:#fff;">
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">Empresa / Casa genética</label>
          <input id="bk-origen" type="text" placeholder="Ej: ABS, Semex..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">País de origen</label>
          <input id="bk-eval" type="text" placeholder="Ej: EE.UU., Brasil..." style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;">
        </div>
        <div style="grid-column:1/-1;">
          <label style="font-size:11px;font-weight:700;color:#5A6A85;text-transform:uppercase;">DEP / Evaluación genética</label>
          <textarea id="bk-pedigree" rows="2" style="width:100%;margin-top:4px;border:1.5px solid #E0E8F4;border-radius:9px;padding:9px 12px;font-size:13px;outline:none;box-sizing:border-box;resize:none;"></textarea>
        </div>
      </div>
      <div id="bk-modal-error" style="display:none;background:#fce8e8;color:#e53e3e;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:12px;"></div>
      <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
        <button onclick="bkModal(false)" style="padding:10px 20px;border-radius:9px;border:1.5px solid #E0E8F4;background:#fff;color:#5A6A85;font-size:13px;font-weight:600;cursor:pointer;">Cancelar</button>
        <button onclick="guardarToro()" id="bk-modal-btn" style="padding:10px 22px;border-radius:9px;border:none;background:#2E7DD6;color:#fff;font-size:13px;font-weight:600;cursor:pointer;">💾 Guardar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(div.firstElementChild);
}

function _bkLlenarModal(id){
  const t=DB_BANCO.find(x=>x.id===id)||{};
  const eid=document.getElementById('bk-id'); if(eid) eid.value=id;
  const tit=document.getElementById('bk-modal-titulo');
  if(tit) tit.textContent=id?'✏️ Editar Toro':'🐂 Nuevo Toro';
  const btn=document.getElementById('bk-modal-btn');
  if(btn) btn.textContent=id?'💾 Actualizar':'💾 Guardar';
  const fields={
    'bk-nombre':t['Nombre']||'','bk-codigo':t['Codigo']||'','bk-raza-m':t['Raza']||'',
    'bk-dosis-m':t['Pajillas']||'','bk-precio':t['Precio']||'',
    'bk-origen':t['Empresa']||'','bk-eval':t['Pais']||'','bk-pedigree':t['Dep']||''
  };
  Object.entries(fields).forEach(([fid,val])=>{
    const el=document.getElementById(fid); if(el) el.value=val;
  });
  const est=document.getElementById('bk-estado');
  if(est) est.value=t['Notas']==='Inactivo'?'Inactivo':'Activo';
  const errEl=document.getElementById('bk-modal-error');
  if(errEl) errEl.style.display='none';
}

function editarToro(id){ _crearModalToro(); _bkLlenarModal(id); document.getElementById('bk-modal').style.display='flex'; }

async function guardarToro(){
  const id     = document.getElementById('bk-id')?.value;
  const nombre = document.getElementById('bk-nombre')?.value.trim();
  const raza   = document.getElementById('bk-raza-m')?.value.trim();
  const errEl  = document.getElementById('bk-modal-error');
  if(errEl) errEl.style.display='none';
  if(!nombre||!raza){
    if(errEl){errEl.textContent='Nombre y raza son obligatorios.';errEl.style.display='block';} return;
  }
  const btn=document.getElementById('bk-modal-btn');
  if(btn){btn.textContent='⏳ Guardando...';btn.disabled=true;}
  const payload={
    rancho_id:  SESSION.rancho_id,
    "Nombre":   nombre,
    "Raza":     raza,
    "Codigo":   document.getElementById('bk-codigo')?.value.trim()   ||null,
    "Pajillas": parseInt(document.getElementById('bk-dosis-m')?.value)||0,
    "Precio":   parseFloat(document.getElementById('bk-precio')?.value)||0,
    "Empresa":  document.getElementById('bk-origen')?.value.trim()   ||null,
    "Pais":     document.getElementById('bk-eval')?.value.trim()     ||null,
    "Dep":      document.getElementById('bk-pedigree')?.value.trim() ||null,
    "Notas":    document.getElementById('bk-estado')?.value==='Inactivo'?'Inactivo':null,
  };
  try{
    const url=id?`${SB_URL}/rest/v1/semen_toros?id=eq.${id}`:`${SB_URL}/rest/v1/semen_toros`;
    const res=await fetch(url,{method:id?'PATCH':'POST',headers:SB_HEADERS,body:JSON.stringify(payload)});
    if(!res.ok){const e=await res.json();throw new Error(e.message||e.details||'Error al guardar');}
    bkModal(false);
    toast(id?'✅ Toro actualizado':'✅ Toro registrado');
    await cargarBanco();
  }catch(e){
    if(errEl){errEl.textContent=e.message;errEl.style.display='block';}
  }finally{
    if(btn){btn.textContent=id?'💾 Actualizar':'💾 Guardar';btn.disabled=false;}
  }
}

async function eliminarToro(id){
  const t=DB_BANCO.find(x=>x.id===id);
  if(!confirm(`¿Eliminar toro "${t?.nombre}"?`)) return;
  try{
    const res=await fetch(`${SB_URL}/rest/v1/semen_toros?id=eq.${id}`,{method:'DELETE',headers:SB_HEADERS});
    if(!res.ok) throw new Error('Error al eliminar');
    toast('🗑 Toro eliminado');
    DB_BANCO=DB_BANCO.filter(x=>x.id!==id);
    _bkRenderStats();
    _bkRenderGrid();
  }catch(e){toast('❌ '+e.message);}
}

/* Conectar buscador del HTML */
document.addEventListener('DOMContentLoaded',()=>{
  const bkQ=document.getElementById('bk-q');
  if(bkQ) bkQ.addEventListener('input',e=>bkBuscar(e.target.value));
});

/* ══════════════════════════════════════════
   MÓDULO SOPORTE
   ══════════════════════════════════════════ */

function spEnviar(){
  /* Recoger campos del formulario */
  const campos = document.querySelectorAll('#sec-soporte .sp-field select, #sec-soporte .sp-field textarea, #sec-soporte .sp-field input');
  let tipo='', desc='', nombre=SESSION?.nombre||'', rancho=SESSION?.rancho||'';

  campos.forEach(el=>{
    const lbl=el.closest('.sp-field')?.querySelector('label')?.textContent||'';
    if(lbl.toLowerCase().includes('tipo')||lbl.toLowerCase().includes('asunto')) tipo=el.value;
    if(lbl.toLowerCase().includes('descri')||lbl.toLowerCase().includes('mensaje')) desc=el.value;
  });

  if(!desc.trim()){
    toast('⚠️ Escribe tu mensaje antes de enviar.');
    return;
  }

  /* Armar mensaje para WhatsApp */
  const msg = `🐄 *VaqueroApp - Soporte*\n\n👤 *Usuario:* ${nombre}\n🏡 *Rancho:* ${rancho}\n📋 *Tipo:* ${tipo||'Consulta general'}\n\n💬 *Mensaje:*\n${desc}`;
  const url = `https://wa.me/51938957726?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function spFaqToggle(el){
  const ans = el.querySelector('.sp-faq-a');
  const ico = el.querySelector('.sp-faq-ico');
  if(!ans) return;
  const open = ans.style.display === 'block';
  ans.style.display = open ? 'none' : 'block';
  if(ico) ico.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
}

/* ══════════════════════════════════════════
   MÓDULO SUSCRIPCIÓN
   ══════════════════════════════════════════ */

async function cargarSuscripcion(){
  /* Datos de la sesión actual */
  const plan     = SESSION?.plan       || 'free';
  const limite   = SESSION?.limite     || 50;
  const usados   = DB_ANIMALES.length  || 0;
  const pct      = limite>0 ? Math.min(Math.round(usados/limite*100),100) : 0;

  /* Nombre del plan legible */
  const planNombres = {
    'free':'Trial Gratuito','basic':'Plan Básico',
    'estandar':'Plan Estándar','premium':'Plan Premium',
    'basico':'Plan Básico'
  };
  const planLabel = planNombres[plan] || plan || 'Trial Gratuito';

  /* Actualizar UI */
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('su-plan-nombre', planLabel);
  set('su-stat-usados', usados);
  set('su-stat-limite', limite);
  set('su-prog-pct', pct+'%');

  const bar=document.getElementById('su-prog-bar');
  if(bar){
    bar.style.width=pct+'%';
    bar.style.background=pct>=90?'linear-gradient(90deg,#E24B4A,#f87171)':
      pct>=70?'linear-gradient(90deg,#F0A500,#fbbf24)':
      'linear-gradient(90deg,#2E7DD6,#5ba3f0)';
  }

  /* Si no hay animales cargados, hacer fetch rápido del conteo */
  if(!DB_ANIMALES.length && SESSION?.rancho_id){
    try{
      const res=await fetch(
        `${SB_URL}/rest/v1/animales?rancho_id=eq.${SESSION.rancho_id}&select=id`,
        {headers:SB_HEADERS}
      );
      const data=await res.json();
      const total=Array.isArray(data)?data.length:0;
      const pct2=limite>0?Math.min(Math.round(total/limite*100),100):0;
      set('su-stat-usados',total);
      set('su-prog-pct',pct2+'%');
      if(bar){ bar.style.width=pct2+'%'; }
    }catch(e){}
  }
}

/* ── Toggle mensual / anual ── */
function suToggle(tipo){
  const tMes=document.getElementById('su-t-mes');
  const tAnu=document.getElementById('su-t-anu');
  if(tMes) tMes.classList.toggle('on', tipo==='mes');
  if(tAnu) tAnu.classList.toggle('on', tipo==='anual');

  /* Actualizar precios */
  const precios={
    mes:   {basico:35,  estandar:70,  premium:120},
    anual: {basico:28,  estandar:56,  premium:96},
  };
  const p=precios[tipo];
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('su-price-basico',    p.basico);
  set('su-price-estandar',  p.estandar);
  set('su-price-premium',   p.premium);
}

/* ── Seleccionar plan ── */
function suSeleccionarPlan(plan){
  const sel=document.getElementById('su-plan-sel');
  if(sel){
    /* Buscar opción que coincida */
    for(let i=0;i<sel.options.length;i++){
      if(sel.options[i].text.includes(plan.split(' - ')[0])){
        sel.selectedIndex=i; break;
      }
    }
  }
  /* Scroll al formulario de pago */
  const form=document.querySelector('#sec-suscripcion .su-pago-card');
  if(form) form.scrollIntoView({behavior:'smooth',block:'start'});
  toast(`📋 Plan seleccionado: ${plan}`);
}

/* ── Método de pago ── */
function suMetodo(el){
  document.querySelectorAll('#sec-suscripcion .su-metodo').forEach(m=>m.classList.remove('sel'));
  el.closest('.su-metodo')?.classList.add('sel');
}

/* ── Procesar pago ── */
function suPagar(){
  const plan=document.getElementById('su-plan-sel')?.value||'';
  if(!plan){ toast('⚠️ Selecciona un plan primero.'); return; }

  const msg=`💳 *VaqueroApp - Suscripción*\n\n👤 *Usuario:* ${SESSION?.nombre||''}\n📧 *Email:* ${SESSION?.email||''}\n🏡 *Rancho:* ${SESSION?.rancho||''}\n\n📋 *Plan solicitado:* ${plan}\n\n¡Hola! Deseo activar este plan en VaqueroApp.`;
  window.open(`https://wa.me/51938957726?text=${encodeURIComponent(msg)}`, '_blank');
  toast('📱 Te redirigimos a WhatsApp para coordinar el pago.');
}

/* ══════════════════════════════════════════
   MÓDULO PERFIL — datos reales Supabase
   ══════════════════════════════════════════ */

async function cargarPerfil(){
  /* 1. Llenar campos de cuenta con datos de sesión */
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||'';};
  set('pf-cuenta-nombre', SESSION?.nombre || '');
  set('pf-cuenta-email',  SESSION?.email  || '');
  set('pf-cuenta-rol',    'Administrador');

  /* 2. Cargar datos del rancho desde Supabase */
  if(!SESSION?.rancho_id) return;
  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/ranchos?id=eq.${SESSION.rancho_id}&select=*&limit=1`,
      {headers:SB_HEADERS}
    );
    const data=await res.json();
    const rancho=Array.isArray(data)?data[0]:{};
    if(!rancho) return;

    /* Llenar campos del rancho */
    set('pf-nombre-ganaderia', rancho.nombre        || SESSION?.rancho || '');
    set('pf-ruc',              rancho.ruc            || '');
    set('pf-direccion',        rancho.direccion      || '');
    set('pf-razon',            rancho.razon_social   || rancho.nombre || '');

    /* Vista previa PDF */
    const prevName=document.getElementById('pf-preview-name');
    const prevMeta=document.getElementById('pf-preview-meta');
    if(prevName) prevName.textContent=rancho.nombre||SESSION?.rancho||'Mi Rancho';
    if(prevMeta) prevMeta.innerHTML=`${rancho.ruc?'RUC: '+rancho.ruc+'<br>':''}${rancho.direccion||''}`;

    /* Logo */
    if(rancho.logo){
      const logoEl=document.getElementById('pf-logo-img');
      const prevLogo=document.getElementById('pf-preview-img');
      if(logoEl) logoEl.src=rancho.logo;
      if(prevLogo) prevLogo.src=rancho.logo;
    }

  }catch(e){ console.error('[Perfil]',e); }
}

/* ── Guardar datos del rancho ── */
async function pfGuardarRancho(){
  if(!SESSION?.rancho_id){ toast('⚠️ Sin rancho asignado.'); return; }

  const nombre   = document.getElementById('pf-nombre-ganaderia')?.value.trim();
  const ruc      = document.getElementById('pf-ruc')?.value.trim();
  const direccion= document.getElementById('pf-direccion')?.value.trim();
  const razon    = document.getElementById('pf-razon')?.value.trim();

  if(!nombre){ toast('⚠️ El nombre de la ganadería es obligatorio.'); return; }

  try{
    const res=await fetch(
      `${SB_URL}/rest/v1/ranchos?id=eq.${SESSION.rancho_id}`,
      {
        method:'PATCH',
        headers:SB_HEADERS,
        body:JSON.stringify({
          nombre,
          ruc:            ruc       ||null,
          direccion:      direccion ||null,
          razon_social:   razon     ||null,
        })
      }
    );
    if(!res.ok){const e=await res.json();throw new Error(e.message||'Error al guardar');}

    /* Actualizar sesión */
    SESSION.rancho=nombre;
    try{localStorage.setItem('vq_sesion',JSON.stringify(SESSION));}catch(e){}

    /* Actualizar dashboard */
    if($('d-rancho')) $('d-rancho').textContent=nombre;

    /* Actualizar vista previa */
    const prevName=document.getElementById('pf-preview-name');
    const prevMeta=document.getElementById('pf-preview-meta');
    if(prevName) prevName.textContent=nombre;
    if(prevMeta) prevMeta.innerHTML=`${ruc?'RUC: '+ruc+'<br>':''}${direccion||''}`;

    toast('✅ Datos del rancho actualizados');
  }catch(e){ toast('❌ '+e.message); }
}

/* ── Cambiar logo ── */
function pfCambiarLogo(input){
  const file=input.files[0];
  if(!file) return;
  if(file.size>2*1024*1024){ toast('⚠️ La imagen no debe superar 2MB.'); return; }

  const reader=new FileReader();
  reader.onload=async e=>{
    const base64=e.target.result;
    /* Mostrar preview inmediato */
    const logoEl=document.getElementById('pf-logo-img');
    const prevLogo=document.getElementById('pf-preview-img');
    if(logoEl) logoEl.src=base64;
    if(prevLogo) prevLogo.src=base64;

    /* Guardar en rancho */
    if(SESSION?.rancho_id){
      try{
        await fetch(`${SB_URL}/rest/v1/ranchos?id=eq.${SESSION.rancho_id}`,{
          method:'PATCH',headers:SB_HEADERS,
          body:JSON.stringify({logo:base64})
        });
        toast('✅ Logo actualizado');
      }catch(err){ toast('❌ No se pudo guardar el logo'); }
    }
  };
  reader.readAsDataURL(file);
}

/* ── Cambiar contraseña ── */
async function pfCambiarPassword(){
  const actual = document.querySelector('#sec-perfil input[type="password"]:nth-of-type(1)')?.value;
  const nueva  = document.querySelector('#sec-perfil input[type="password"]:nth-of-type(2)')?.value;
  const conf   = document.querySelector('#sec-perfil input[type="password"]:nth-of-type(3)')?.value;

  if(!nueva||!conf){ toast('⚠️ Ingresa la nueva contraseña.'); return; }
  if(nueva!==conf){ toast('⚠️ Las contraseñas no coinciden.'); return; }
  if(nueva.length<8){ toast('⚠️ Mínimo 8 caracteres.'); return; }

  try{
    const res=await fetch(`${SB_URL}/auth/v1/user`,{
      method:'PUT',
      headers:SB_HEADERS,
      body:JSON.stringify({password:nueva})
    });
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||'Error al cambiar contraseña'); }
    toast('✅ Contraseña actualizada correctamente');
  }catch(e){ toast('❌ '+e.message); }
}

/* ── Toggle switches ── */
function pfToggle(btn){
  btn.classList.toggle('on');
}
