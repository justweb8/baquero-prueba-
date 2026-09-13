'use strict';

/* ── CSS FIX INJECTED VIA JS ── */
(function(){
  var css = [
    /* Banner heights */
    '.an-page-header{position:relative!important;height:160px!important;overflow:hidden!important;flex-shrink:0!important;max-height:160px!important;}',
    '.an-page-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:160px!important;}',
    '.sv-header{position:relative!important;height:140px!important;overflow:hidden!important;flex-shrink:0!important;max-height:140px!important;}',
    '.sv-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:140px!important;}',
    '.in-header{position:relative!important;height:140px!important;overflow:hidden!important;flex-shrink:0!important;max-height:140px!important;}',
    '.in-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:140px!important;}',
    '.pt-header{position:relative!important;height:160px!important;overflow:hidden!important;flex-shrink:0!important;max-height:160px!important;}',
    '.pt-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:160px!important;}',
    '.cal-header{position:relative!important;height:130px!important;overflow:hidden!important;flex-shrink:0!important;max-height:130px!important;}',
    '.cal-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:130px!important;}',
    '.alt-header{position:relative!important;height:130px!important;overflow:hidden!important;flex-shrink:0!important;max-height:130px!important;}',
    '.alt-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;max-height:130px!important;}',
    /* Fix stat icons */
    '.an-stat-ico,.sv-stat-ico,.in-stat-ico,.pt-stat-ico,.his-stat-ico{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important;flex-shrink:0!important;border-radius:10px!important;}',
    '.an-stat-ico svg,.sv-stat-ico svg,.in-stat-ico svg,.pt-stat-ico svg,.his-stat-ico svg{width:22px!important;height:22px!important;max-width:22px!important;max-height:22px!important;flex-shrink:0!important;}',
    /* Fix all section SVGs */
    '#sec-animales svg,#sec-salud svg,#sec-insem svg,#sec-partos svg,#sec-calendario svg,#sec-alertas svg,#sec-reportes svg,#sec-historial svg,#sec-gastos svg,#sec-inventario svg,#sec-proveedores svg,#sec-finanzas svg{max-width:100%;overflow:hidden;}',
    /* Fix button SVGs */
    'button svg{width:16px!important;height:16px!important;max-width:16px!important;max-height:16px!important;pointer-events:none!important;}',
    /* Fix search SVGs */
    '.an-search svg,.sv-search svg,.in-search svg,.his-search svg{width:15px!important;height:15px!important;flex-shrink:0!important;}',
    /* Fix header overlays to show above image */
    '.an-page-header-ov,.sv-header-ov,.in-header-ov,.pt-header-ov,.cal-header-ov{position:absolute!important;inset:0!important;z-index:1!important;display:flex!important;align-items:center!important;}',
  ].join('');
  var el = document.createElement('style');
  el.id = 'vq-css-fix';
  el.textContent = css;
  document.head.appendChild(el);
})();


/* ── Utilidades ── */
function $(id){ return document.getElementById(id); }
function validarEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()); }
function esperar(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ── Toast ── */
function toast(msg){
  var t = $('vq-toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'vq-toast';
    t.className = 'vq-toast';
    document.body.appendChild(t);
  }
  t.innerHTML = '<svg width="15" height="15" fill="none" stroke="#F0A500" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ' + msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(function(){t.classList.remove('show');}, 3200);
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
  const mob = document.querySelector('.mob-nav');
  if(banner) banner.style.display='none';
  if(scroll)  scroll.style.display='none';
  const sec = $(idSec);
  if(sec){
    sec.style.cssText='display:flex;flex-direction:column;flex:1;overflow-y:auto;overflow-x:hidden;min-height:0;max-height:100%;';
    sec.classList.add('visible');
    seccionActual = sec;
    sec.scrollTop = 0;
  }
}

function cerrarSeccion(){
  if(seccionActual){
    seccionActual.style.cssText='display:none;';
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
  /* Apply CSS fix on DOM ready */
  if(!document.getElementById('vq-css-fix')){
    var el=document.createElement('style');
    el.id='vq-css-fix';
    el.textContent='.an-page-header,.sv-header,.in-header,.pt-header,.cal-header,.alt-header{position:relative!important;overflow:hidden!important;flex-shrink:0!important;}.an-page-header{height:160px!important;max-height:160px!important;}.sv-header,.in-header{height:140px!important;max-height:140px!important;}.pt-header{height:160px!important;max-height:160px!important;}.cal-header,.alt-header{height:130px!important;max-height:130px!important;}.an-page-header img,.sv-header img,.in-header img,.pt-header img,.cal-header img,.alt-header img{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;object-fit:cover!important;}.an-page-header-ov,.sv-header-ov,.in-header-ov,.pt-header-ov,.cal-header-ov,.alt-header-ov{position:absolute!important;inset:0!important;z-index:1!important;}.an-stat-ico,.sv-stat-ico,.in-stat-ico,.pt-stat-ico,.his-stat-ico,[class$="-stat-ico"]{width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;overflow:hidden!important;flex-shrink:0!important;}[class$="-stat-ico"] svg{width:22px!important;height:22px!important;max-width:22px!important;max-height:22px!important;}.an-search svg,.sv-search svg,.in-search svg,.his-search svg{width:15px!important;height:15px!important;flex-shrink:0!important;}button svg{width:16px!important;height:16px!important;max-width:16px!important;max-height:16px!important;}';
    document.head.appendChild(el);
  }

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


/* ── BANCO GENÉTICO ── */
function bkTab(t){var g=document.getElementById('bk-grid'),d=document.getElementById('bk-dosis'),t1=document.getElementById('bk-t1'),t2=document.getElementById('bk-t2');if(t==='toros'){g.style.display='grid';d.classList.remove('on');t1.classList.add('on');t2.classList.remove('on');}else{g.style.display='none';d.classList.add('on');t2.classList.add('on');t1.classList.remove('on');}}
function bkFiltrar(){var q=(document.getElementById('bk-q').value||'').toLowerCase(),raza=document.getElementById('bk-raza').value,disp=document.getElementById('bk-disp').value;document.querySelectorAll('#bk-grid .bk-card').forEach(function(c){c.style.display=(!q||(c.dataset.nombre||'').includes(q))&&(!raza||c.dataset.raza===raza)&&(!disp||c.dataset.disp===disp)?'':'none';});}
function bkVista(v){var g=document.getElementById('bk-grid'),vg=document.getElementById('bk-vg'),vl=document.getElementById('bk-vl');if(v==='grid'){g.style.gridTemplateColumns='repeat(auto-fill,minmax(310px,1fr))';vg.classList.add('on');vl.classList.remove('on');}else{g.style.gridTemplateColumns='1fr';vl.classList.add('on');vg.classList.remove('on');}}
function bkModal(open){document.getElementById('bk-modal').style.display=open?'flex':'none';}

/* ── SOPORTE ── */
function spChar(){var v=document.getElementById('sp-msg').value;if(v.length>500)document.getElementById('sp-msg').value=v.slice(0,500);document.getElementById('sp-char-n').textContent=Math.min(v.length,500);}
function spEnviar(){var msg=document.getElementById('sp-msg').value.trim();if(!msg){document.getElementById('sp-msg').style.borderColor='#e53e3e';return;}document.getElementById('sp-msg').style.borderColor='';document.getElementById('sp-msg').value='';document.getElementById('sp-char-n').textContent='0';if(typeof toast==='function')toast('Mensaje enviado. Te responderemos pronto.');}
function spFaqToggle(el){var isOpen=el.classList.contains('open');document.querySelectorAll('.sp-faq-item').forEach(function(i){i.classList.remove('open');});if(!isOpen)el.classList.add('open');}
function spFaqBuscar(q){q=q.toLowerCase();document.querySelectorAll('.sp-faq-item').forEach(function(item){var txt=item.querySelector('.sp-faq-q span').textContent.toLowerCase();item.style.display=(!q||txt.includes(q))?'':'none';});}

/* ── SUSCRIPCIÓN ── */
var suModoAnual=false;
var suPrecios={basico:[35,28],estandar:[70,56],premium:[120,96]};
function suToggle(modo){suModoAnual=(modo==='anual');document.getElementById('su-t-mes').classList.toggle('on',!suModoAnual);document.getElementById('su-t-anu').classList.toggle('on',suModoAnual);var i=suModoAnual?1:0;document.getElementById('su-price-basico').textContent=suPrecios.basico[i];document.getElementById('su-price-estandar').textContent=suPrecios.estandar[i];document.getElementById('su-price-premium').textContent=suPrecios.premium[i];}
function suSeleccionarPlan(plan){var el=document.getElementById('su-plan-sel');for(var i=0;i<el.options.length;i++){if(el.options[i].text===plan){el.selectedIndex=i;break;}}if(typeof toast==='function')toast('Plan seleccionado: '+plan);}
function suMetodo(el){document.querySelectorAll('.su-metodo').forEach(function(m){m.classList.remove('on');});el.classList.add('on');}
function suPagar(){if(typeof toast==='function')toast('Procesando pago...');}
