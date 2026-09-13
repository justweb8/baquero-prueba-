'use strict';

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
  $('tab-login').classList.toggle('activo',esLogin);
  $('tab-registro').classList.toggle('activo',!esLogin);
  $('form-login').style.display    = esLogin ? 'block' : 'none';
  $('form-registro').style.display = esLogin ? 'none'  : 'block';
  $('al-login').classList.remove('vis');
  $('al-reg').classList.remove('vis');
}

/* ── INICIAR SESIÓN ── */
async function iniciarSesion(){
  const email = $('email-login').value.trim();
  const pass  = $('pass-login').value;
  $('al-login').classList.remove('vis');
  let ok=true;
  if(!validarEmail(email)){ setErr('email-login',true); ok=false; }
  if(!pass){ setErr('pass-login',true); ok=false; }
  if(!ok) return;
  const btn=$('btn-ingresar');
  btn.classList.add('cargando');
  try{
    await esperar(1300);
    if(email==='demo@vaqueroapp.com' && pass==='demo1234'){
      mostrarDashboard({nombre:'Administrador',rancho:'Ganadería El Vaquero',email});
    } else {
      throw new Error('Credenciales incorrectas');
    }
  }catch(e){
    $('al-login-msg').textContent='Correo o contraseña incorrectos.';
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
  $('pantalla-login').classList.add('oculto');
  const dash=$('pantalla-dash');
  dash.classList.add('visible');
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
function cerrarSesion(){
  try{ localStorage.removeItem('vq_sesion'); }catch(err){}
  $('pantalla-dash').classList.remove('visible');
  $('pantalla-login').classList.remove('oculto');
  document.body.style.overflow='';
  if($('email-login'))$('email-login').value='';
  if($('pass-login')) $('pass-login').value='';
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
      break;
    case 'salud':
      abrirSeccion('sec-salud');
      break;
    case 'inseminacion':
      abrirSeccion('sec-insem');
      break;
    case 'partos':
      abrirSeccion('sec-partos');
      break;
    case 'calendario':
      abrirSeccion('sec-calendario');
      setTimeout(renderCalendario, 100);
      break;
    case 'alertas':
      abrirSeccion('sec-alertas');
      break;
    case 'reportes':
      abrirSeccion('sec-reportes');
      break;
    case 'historial':
      abrirSeccion('sec-historial');
      break;
    case 'gastos':
      abrirSeccion('sec-gastos');
      break;
    case 'inventario':
      abrirSeccion('sec-inventario');
      break;
    case 'proveedores':
      abrirSeccion('sec-proveedores');
      break;
    case 'finanzas':
      abrirSeccion('sec-finanzas');
      break;
    case 'banco-genetico':
      abrirSeccion('sec-banco');
      break;
    case 'soporte':
      abrirSeccion('sec-soporte');
      break;
    case 'documentos':
      inyectarDocumentos();
      abrirSeccion('sec-documentos');
      break;
    case 'perfil':
      abrirSeccion('sec-perfil');
      break;
    case 'suscripcion':
      abrirSeccion('sec-suscripcion');
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
document.addEventListener('DOMContentLoaded',()=>{
  cambiarTab('login');
  [['email-login'],['pass-login'],['reg-nombre'],['reg-rancho'],['reg-email'],['reg-pass']]
    .forEach(([id])=>{ const el=$(id); if(el) el.addEventListener('input',()=>clearErr(id)); });
  $('pass-login')?.addEventListener('keydown',e=>{ if(e.key==='Enter') iniciarSesion(); });
  $('reg-pass')?.addEventListener('keydown',  e=>{ if(e.key==='Enter') crearCuenta(); });
  try{
    const s=JSON.parse(localStorage.getItem('vq_sesion')||'null');
    if(s) mostrarDashboard(s);
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
