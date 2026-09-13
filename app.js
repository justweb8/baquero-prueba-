// ══════════════════════════════════════════════════════════
// MODO OFFLINE — VaqueroApp
// ══════════════════════════════════════════════════════════
// MÓDULO: NOTIFICACIONES PUSH (OneSignal)
// ══════════════════════════════════════════════════════════
const OS_APP_ID = '604647f0-b9c4-4ca6-8d0d-756aaa5948da';
const OS_REST_KEY = ''; // Se llenará cuando tengamos la REST API Key

async function initPushNotifications() {
  if(!window.OneSignal) return;
  try {
    OneSignalDeferred.push(async function(OneSignal) {
      // Etiquetar al usuario con su rancho_id para notificaciones segmentadas
      if(SESSION?.rancho_id) {
        await OneSignal.User.addTag('rancho_id', SESSION.rancho_id);
        await OneSignal.User.addTag('email', SESSION.email || '');
      }
      // Reflejar estado actual en el botón de la UI
      actualizarBotonPush();
    });
  } catch(e) { console.warn('OneSignal init error:', e); }
}

async function activarNotificacionesPush() {
  if(!window.OneSignalDeferred) return;
  OneSignalDeferred.push(async function(OneSignal) {
    const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
    if(isSubscribed) {
      toast('✅ Ya tienes las notificaciones activas');
      return;
    }
    // Este clic SÍ es un gesto directo del usuario: el navegador mostrará el permiso
    await OneSignal.Notifications.requestPermission();
    actualizarBotonPush();
  });
}

async function actualizarBotonPush() {
  const btn = document.getElementById('btn-activar-push');
  if(!btn || !window.OneSignalDeferred) return;
  OneSignalDeferred.push(async function(OneSignal) {
    const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
    if(isSubscribed) {
      btn.innerHTML = '🔔 Notificaciones activas';
      btn.disabled = true;
      btn.style.opacity = '.6';
    }
  });
}

function checkNotificacionesLocales() {
  // Verificar vacunas próximas (3 días)
  const hoy = new Date();
  const en3dias = new Date(hoy); en3dias.setDate(hoy.getDate() + 3);
  const en7dias = new Date(hoy); en7dias.setDate(hoy.getDate() + 7);

  const vacunasPendientes = (DB.salud || []).filter(s => {
    if(!s['ProxDosis']) return false;
    const fecha = new Date(s['ProxDosis'] + 'T12:00:00');
    return fecha >= hoy && fecha <= en3dias;
  });

  const partosPendientes = (DB.insem || []).filter(i => {
    if(!i['PartoEstimado'] || i['Resultado'] !== 'Preñada ✓') return false;
    const fecha = new Date(i['PartoEstimado'] + 'T12:00:00');
    return fecha >= hoy && fecha <= en7dias;
  });

  // Mostrar alertas locales en la app
  if(vacunasPendientes.length > 0) {
    const nombres = vacunasPendientes.map(s => s['Animal'] || s['Hembra'] || '').filter(Boolean).join(', ');
    toast(`💉 ${vacunasPendientes.length} vacuna(s) próxima(s): ${nombres}`, 6000);
  }
  if(partosPendientes.length > 0) {
    const nombres = partosPendientes.map(p => p['Hembra'] || '').filter(Boolean).join(', ');
    toast(`🤰 ${partosPendientes.length} parto(s) próximo(s): ${nombres}`, 6000);
  }

  // Guardar en localStorage cuándo fue la última verificación
  localStorage.setItem('vqa_last_notif_check', new Date().toISOString());
}

function mostrarBadgeNotificaciones() {
  const hoy = new Date();
  const en3dias = new Date(hoy); en3dias.setDate(hoy.getDate() + 3);
  const en7dias = new Date(hoy); en7dias.setDate(hoy.getDate() + 7);

  let count = 0;
  (DB.salud || []).forEach(s => {
    if(!s['ProxDosis']) return;
    const f = new Date(s['ProxDosis'] + 'T12:00:00');
    if(f >= hoy && f <= en3dias) count++;
  });
  (DB.insem || []).forEach(i => {
    if(!i['PartoEstimado'] || i['Resultado'] !== 'Preñada ✓') return;
    const f = new Date(i['PartoEstimado'] + 'T12:00:00');
    if(f >= hoy && f <= en7dias) count++;
  });

  // Actualizar badge en el menú de Alertas
  const badge = document.getElementById('alertas-badge-nav');
  if(badge) {
    badge.textContent = count > 0 ? count : '';
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  }
  return count;
}

// ══════════════════════════════════════════════════════════
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(reg => {
      console.log('SW registrado:', reg.scope);
      // Forzar actualización del SW
      reg.update();
      // Pre-cachear esta página inmediatamente
      if('caches' in window) {
        caches.open('vaqueroapp-v5').then(cache => {
          cache.put(window.location.href, new Response(
            document.documentElement.outerHTML,
            {headers: {'Content-Type': 'text/html; charset=utf-8'}}
          ));
        });
      }
    })
    .catch(err => console.log('SW error:', err));
}
function _persistirDatosLocales() {
  try {
    if (DB.animales?.length) localStorage.setItem('vqa_offline_animales', JSON.stringify(DB.animales));
    if (DB.salud?.length)    localStorage.setItem('vqa_offline_salud',    JSON.stringify(DB.salud));
    if (DB.insem?.length)    localStorage.setItem('vqa_offline_insem',    JSON.stringify(DB.insem));
    if (DB.partos?.length)   localStorage.setItem('vqa_offline_partos',   JSON.stringify(DB.partos));
    if (DB.gastos?.length)   localStorage.setItem('vqa_offline_gastos',   JSON.stringify(DB.gastos));
    if (DB.semen_toros?.length) localStorage.setItem('vqa_offline_semen_toros', JSON.stringify(DB.semen_toros));
    // Marcar a qué usuario pertenece este caché
    if(SESSION?.user_id) localStorage.setItem('vqa_cache_owner', SESSION.user_id);
  } catch(e) {}
}
function _restaurarDatosLocales() {
  try {
    const currentUserId = SESSION?.user_id || null;
    // Verificar que el dueño del caché sea el mismo usuario activo
    const cachedOwner = localStorage.getItem('vqa_cache_owner');
    if(currentUserId && cachedOwner && cachedOwner !== currentUserId) {
      // Los datos en cache son de otro usuario — limpiar todo
      console.warn('Cache de otro usuario detectado, limpiando datos locales');
      limpiarCacheDatos();
      return;
    }
    const a=localStorage.getItem('vqa_offline_animales');
    const s=localStorage.getItem('vqa_offline_salud');
    const i=localStorage.getItem('vqa_offline_insem');
    const p=localStorage.getItem('vqa_offline_partos');
    const g=localStorage.getItem('vqa_offline_gastos');
    const st=localStorage.getItem('vqa_offline_semen_toros');
    if(a) DB.animales=JSON.parse(a);
    if(s) DB.salud=JSON.parse(s);
    if(i) DB.insem=JSON.parse(i);
    if(p) DB.partos=JSON.parse(p);
    if(g) DB.gastos=JSON.parse(g);
    if(st) DB.semen_toros=JSON.parse(st);
    try{cargarInventarioLocal();}catch(e){}
    try{cargarVentasLocal();}catch(e){}
  } catch(e) { console.warn('Error restaurando:', e); }
}
window.addEventListener('online', () => {
  const ob = document.getElementById('offline-bar');
  if(ob) ob.classList.remove('show');
  setSyncStatus('syncing','🔄 Reconectando...');
  setTimeout(async () => {
    const q = getOfflineQueue();
    if(q.length) {
      const ok=[];
      for(const op of q){ try{ await apiPost(op.action,op.sheet,op.data,op.id); ok.push(op.ts); }catch(e){} }
      saveOfflineQueue(q.filter(x=>!ok.includes(x.ts))); updatePendingBadge();
      if(ok.length) toast('✅ '+ok.length+' cambios sincronizados');
    }
    recargarTodo();
  }, 1500);
});
window.addEventListener('offline', () => {
  setSyncStatus('err','📵 Sin internet');
  const ob = document.getElementById('offline-bar');
  if(ob){ ob.classList.add('show'); ob.textContent='📵 Sin conexión — los cambios se sincronizarán al reconectar'; }
});
// ══════════════════════════════════════
// CONFIGURACIÓN SUPABASE
// ══════════════════════════════════════
const SB_URL = 'https://tajgjweqvuinfeqzbthw.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhamdqd2VxdnVpbmZlcXpidGh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTQ3NjUsImV4cCI6MjA4ODI5MDc2NX0.mMneyeaMg0aDa-gfA5k6mEe5I3f_khdf6-2Q28GaDQs';
const SB_HEADERS = {
  'apikey': SB_KEY,
  'Authorization': 'Bearer ' + SB_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

let DB = { animales:[], salud:[], insem:[], partos:[], gastos:[], proveedores:[], ordenes_compra:[] };

// ── Variables globales (declaradas al inicio para evitar errores) ──
var SESSION      = null;
var loginAttempts = {count:0, lastAttempt:0, blocked:false};
var MAX_ATTEMPTS  = 5;
var BLOCK_TIME    = 5 * 60 * 1000;
var activityTimer = null;
var SESSION_TIMEOUT = 90 * 60 * 1000; // 90 min — suficiente para registro largo de animales

const PERMISOS = {
  admin:       { eliminar:true,  gastos:true,  config:true  },
  capataz:     { eliminar:false, gastos:true,  config:false },
  empleado:    { eliminar:false, gastos:false, config:false },
  veterinario: { eliminar:false, gastos:false, config:false }
};
const SECCIONES_ROL = {
  admin:       ['dash','animales','salud','insem','partos','cal','alertas','reportes','historial','gastos','inventario','proveedores','finanzas','perfil-buscar','semen','arbol','config-pass','documentos','importar','perfil','exportar','suscripcion'],
  capataz:     ['dash','animales','salud','insem','partos','cal','alertas','historial','gastos','inventario','proveedores','finanzas','perfil-buscar','semen','arbol','documentos','importar','perfil','exportar','suscripcion'],
  empleado:    ['dash','animales','salud','partos','alertas','inventario','perfil-buscar','semen','arbol'],
  veterinario: ['dash','salud','alertas','historial','inventario','perfil-buscar','semen']
};
let calMes = new Date().getMonth(), calAno = new Date().getFullYear();

// ── API Supabase ──
async function apiGet(tabla) {
  if(!SESSION?.rancho_id) return [];
  const rid = SESSION.rancho_id;
  const res = await fetch(`${SB_URL}/rest/v1/${tabla}?select=*&order=created_at.desc&rancho_id=eq.${rid}`, { headers: SB_HEADERS });
  if(!res.ok) { console.error('apiGet error', tabla, await res.text()); return []; }
  const rows = await res.json();
  if(!Array.isArray(rows)) return [];
  return rows.map(r => normalizarFila(tabla, r));
}

async function apiPost(action, sheet, data, id) {
  if(action === 'insert') {
    let rowData = denormalizarFila(sheet, data);
    rowData = sanitizeObject(rowData);
    if(!validarContraInyeccion(rowData)){toast('Contenido no permitido');return {error:true};}
    if(SESSION?.rancho_id) rowData.rancho_id = SESSION.rancho_id;
    const res = await fetch(`${SB_URL}/rest/v1/${sheet}`, { method:'POST', headers:SB_HEADERS, body:JSON.stringify(rowData) });
    if(!res.ok) throw new Error(await res.text());
    return {success:true};
  }
  if(action === 'update') {
    const hasPascal = data && Object.keys(data).some(k => k[0] === k[0].toUpperCase() && k[0] !== k[0].toLowerCase());
    const payload = hasPascal ? denormalizarFila(sheet, data) : data;
    let cleanPayload = Object.fromEntries(
      Object.entries(payload).filter(([k]) => !['id','rancho_id','created_at','ID'].includes(k))
    );
    cleanPayload = sanitizeObject(cleanPayload);
    // Siempre usar id=eq. (minúscula) — columna UUID estándar de Supabase
    const filterUrl = `${SB_URL}/rest/v1/${sheet}?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(filterUrl, { method:'PATCH', headers:SB_HEADERS, body:JSON.stringify(cleanPayload) });
    if(!res.ok) {
      const errText = await res.text();
      // Si falla con id UUID, intentar con el campo 'ID' texto (compatibilidad legacy)
      try {
        const filterUrl2 = `${SB_URL}/rest/v1/${sheet}?ID=eq.${encodeURIComponent(id)}`;
        const res2 = await fetch(filterUrl2, { method:'PATCH', headers:{...SB_HEADERS,'Prefer':'return=minimal'}, body:JSON.stringify(cleanPayload) });
        if(res2.ok) return {success:true};
      } catch(e2){}
      throw new Error(errText);
    }
    return {success:true};
  }
  if(action === 'delete') {
    // Intentar primero con id (UUID), luego con ID (texto legacy)
    let res = await fetch(`${SB_URL}/rest/v1/${sheet}?id=eq.${encodeURIComponent(id)}`, { method:'DELETE', headers:SB_HEADERS });
    if(!res.ok) {
      res = await fetch(`${SB_URL}/rest/v1/${sheet}?ID=eq.${encodeURIComponent(id)}`, { method:'DELETE', headers:SB_HEADERS });
      if(!res.ok) throw new Error(await res.text());
    }
    return {success:true};
  }
  return {error:'Acción no válida'};
}

// Normalizar fila de Supabase al formato que usa el sistema (claves con mayúscula)
function normalizarFila(tabla, r) {
  if(tabla === 'animales') return {
    'ID':r.id||'', 'Arete':r.arete||'', 'Nombre':r.nombre||'',
    'Raza':r.raza||'', 'Sexo':r.sexo||'', 'Nacimiento':r.nacimiento||'',
    'Peso':r.peso||'', 'Peso(kg)':r.peso||'', 'Estado':r.estado||'Activo',
    'Madre':r.madre||'', 'Padre':r.padre||'',
    'Observaciones':r.observaciones||'', 'Foto':r.foto||'',
    'FechaRegistro':r.created_at ? new Date(r.created_at).toLocaleDateString('es-PE') : '',
    'rancho_id':r.rancho_id
  };
  if(tabla === 'salud') return {
    'ID':r.id||'', 'Animal':r.animal||'', 'Tipo':r.tipo||'',
    'Descripcion':r.descripcion||'', 'Dosis':r.dosis||'',
    'FechaAplicacion':r.fecha_aplicacion||'', 'ProximaDosis':r.proxima_dosis||'',
    'Veterinario':r.veterinario||'', 'Costo':r.costo||'',
    'Observaciones':r.observaciones||'', 'rancho_id':r.rancho_id
  };
  if(tabla === 'insem') return {
    'ID':r.id||'', 'Hembra':r.hembra||'', 'Fecha':r.fecha||'',
    'ToroSemen':r.toro_semen||'', 'Tecnica':r.tecnica||'',
    'Tecnico':r.tecnico||'', 'PartoEstimado':r.parto_estimado||'',
    'Resultado':r.resultado||'Pendiente', 'Costo':r.costo||'',
    'Observaciones':r.observaciones||'', 'rancho_id':r.rancho_id
  };
  if(tabla === 'partos') return {
    'ID':r.id||'', 'Fecha':r.fecha||'', 'Madre':r.madre||'',
    'ArieteCria':r.arete_cria||'', 'SexoCria':r.sexo_cria||'',
    'PesoNacimiento':r.peso_nacimiento||'', 'TipoParto':r.tipo_parto||'',
    'EstadoCria':r.estado_cria||'', 'Padre':r.padre||'',
    'Observaciones':r.observaciones||'', 'rancho_id':r.rancho_id
  };
  if(tabla === 'gastos') return {
    'ID':r.id||'', 'Tipo':r.tipo||'', 'Descripcion':r.descripcion||'',
    'Monto':r.monto||0, 'EsIngreso':r.es_ingreso||false,
    'Fecha':r.fecha||'', 'Animal':r.animal||'',
    'Observaciones':r.observaciones||'', 'rancho_id':r.rancho_id
  };
  if(tabla === 'proveedores') return {
    id: r.id||'', nombre: r.nombre||'', tipo: r.tipo||'',
    telefono: r.telefono||'', contacto: r.contacto||'',
    productos: r.productos||'', obs: r.obs||'', fecha: r.fecha||'',
    rancho_id: r.rancho_id
  };
  if(tabla === 'ordenes_compra') return {
    id: r.id||'', numero: r.numero||'',
    proveedorId: r.proveedor_id||r.proveedorId||'',
    proveedorNombre: r.proveedor_nombre||r.proveedorNombre||'',
    proveedorTel: r.proveedor_tel||r.proveedorTel||'',
    items: typeof r.items === 'string' ? JSON.parse(r.items||'[]') : (r.items||[]),
    obs: r.obs||'', estado: r.estado||'enviado',
    fecha: r.fecha||'', fechaActualizacion: r.fecha_actualizacion||'',
    historial: typeof r.historial === 'string' ? JSON.parse(r.historial||'[]') : (r.historial||[]),
    rancho_id: r.rancho_id
  };
  return r;
}

// Convertir del formato del sistema al formato de Supabase (claves minúscula)
function denormalizarFila(tabla, d) {
  if(tabla === 'animales') return {
    arete:         d['Arete']||d.arete||'',
    nombre:        d['Nombre']||d.nombre||'',
    raza:          d['Raza']||d.raza||'',
    sexo:          d['Sexo']||d.sexo||'',
    nacimiento:    d['Nacimiento']||d.nacimiento||null,
    peso:          d['Peso']||d.peso||null,
    estado:        d['Estado']||d.estado||'Activo',
    madre:         d['Madre']||d.madre||'',
    padre:         d['Padre']||d.padre||'',
    observaciones: d['Observaciones']||d.observaciones||'',
    foto:          d['Foto']||d.foto||''
  };
  if(tabla === 'salud') return {
    animal:          d['Animal']||d.animal||'',
    tipo:            d['Tipo']||d.tipo||'',
    descripcion:     d['Descripcion']||d.descripcion||'',
    dosis:           d['Dosis']||d.dosis||'',
    fecha_aplicacion:d['FechaAplicacion']||d.fecha_aplicacion||null,
    proxima_dosis:   d['ProximaDosis']||d.proxima_dosis||null,
    veterinario:     d['Veterinario']||d.veterinario||'',
    costo:           d['Costo']||d.costo||null,
    observaciones:   d['Observaciones']||d.observaciones||''
  };
  if(tabla === 'insem') return {
    hembra:         d['Hembra']||d.hembra||'',
    fecha:          d['Fecha']||d.fecha||null,
    toro_semen:     d['ToroSemen']||d.toro_semen||'',
    tecnica:        d['Tecnica']||d.tecnica||'',
    tecnico:        d['Tecnico']||d.tecnico||'',
    parto_estimado: d['PartoEstimado']||d.parto_estimado||null,
    resultado:      d['Resultado']||d.resultado||'Pendiente',
    costo:          d['Costo']||d.costo||null,
    observaciones:  d['Observaciones']||d.observaciones||''
  };
  if(tabla === 'partos') return {
    fecha:           d['Fecha']||d.fecha||null,
    madre:           d['Madre']||d.madre||'',
    arete_cria:      d['ArieteCria']||d.arete_cria||'',
    sexo_cria:       d['SexoCria']||d.sexo_cria||'',
    peso_nacimiento: d['PesoNacimiento']||d.peso_nacimiento||null,
    tipo_parto:      d['TipoParto']||d.tipo_parto||'',
    estado_cria:     d['EstadoCria']||d.estado_cria||'',
    padre:           d['Padre']||d.padre||'',
    observaciones:   d['Observaciones']||d.observaciones||''
  };
  if(tabla === 'gastos') {
    const _ei = d['EsIngreso']||d.es_ingreso;
    const _esIng = (_ei===true||_ei==='SI'||_ei==='true'||_ei==='1'||_ei===1) ? true : false;
    return {
      tipo:          d['Tipo']||d.tipo||'',
      descripcion:   d['Descripcion']||d.descripcion||'',
      monto:         parseFloat(d['Monto']||d.monto||0),
      es_ingreso:    _esIng,
      fecha:         d['Fecha']||d.fecha||null,
      animal:        d['Animal']||d.animal||'',
      observaciones: d['Observaciones']||d.observaciones||''
    };
  }
  return d;
}

function apiPostFast(action, sheet, data, id) {
  if(!isOnline) {
    const q = getOfflineQueue();
    q.push({action, sheet, data, id, ts: Date.now()});
    saveOfflineQueue(q);
    updatePendingBadge();
    setSyncStatus('err','📵 Sin conexión');
    return Promise.resolve({success:true, offline:true});
  }
  apiPost(action, sheet, data, id)
    .then(() => setSyncStatus('ok','☁ Sincronizado'))
    .catch(err => {
      console.error('Error Supabase ['+sheet+']:', err.message);
      const msg = err.message || '';
      const isDataError = msg.includes('22008')
        || msg.includes('datestyle')
        || msg.includes('invalid input syntax')
        || msg.includes('duplicate')
        || msg.includes('unique')
        || msg.includes('foreign key')
        || msg.includes('not-null');
      const isTableError = msg.includes('relation') && msg.includes('does not exist')
        || msg.includes('42P01');
      if(isTableError) {
        // Solo mostrar "tablas no creadas" si el error es genuinamente de tabla inexistente
        setSyncStatus('err','❌ Tabla "'+sheet+'" no encontrada');
        toast('⚠️ Tabla "'+sheet+'" no existe en Supabase');
      } else if(msg.includes('does not exist') && msg.includes('column')) {
        // Error de columna — loguear pero no bloquear
        console.warn('Columna no encontrada, revisar esquema:', msg);
        setSyncStatus('ok','☁ Sincronizado');
      } else if(isDataError) {
        setSyncStatus('ok','☁ Sincronizado');
      } else {
        setSyncStatus('err','⚠ Pendiente sync');
        const q = getOfflineQueue();
        q.push({action, sheet, data, id, ts: Date.now()});
        saveOfflineQueue(q); updatePendingBadge();
      }
    });
  return Promise.resolve({success:true});
}


function setSyncStatus(type, label) {
  const b = document.getElementById('sync-badge');
  b.className = 'sync-badge '+type;
  b.textContent = label;
}

// ── Toast ──
let TT;
function toast(msg, dur) {
  const t = document.getElementById('vq-toast');
  if(!t) return;
  t.innerHTML = '<svg width="15" height="15" fill="none" stroke="#F0A500" stroke-width="2.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> ' + msg;
  t.classList.add('show');
  clearTimeout(TT); TT=setTimeout(()=>t.classList.remove('show'), dur||3200);
}

// ── Nav ──
function goTo(id) {
  // Adaptador: redirige al sistema de navegación del maquetado
  const mapaNav = {
    'dash': 'dashboard', 'animales': 'animales', 'salud': 'salud',
    'insem': 'inseminacion', 'partos': 'partos', 'cal': 'calendario',
    'alertas': 'alertas', 'reportes': 'reportes', 'historial': 'historial',
    'gastos': 'gastos', 'inventario': 'inventario', 'proveedores': 'proveedores',
    'finanzas': 'finanzas', 'semen': 'banco-genetico', 'arbol': 'arbol',
    'perfil-buscar': 'buscar', 'documentos': 'documentos', 'importar': 'importar',
    'exportar': 'exportar', 'suscripcion': 'suscripcion', 'perfil': 'perfil',
    'config-pass': 'soporte',
  };
  const seccion = mapaNav[id] || id;
  if(typeof navegar === 'function') navegar(seccion, null);
  // Compatibilidad con código que llama funciones tras goTo
  if(id==='dash') renderDash();
  if(id==='semen'){ renderSemen(); }
  if(id==='exportar') renderExportar();
  if(id==='salud'||id==='insem') fillSelects();
  if(id==='partos'){renderPartos();fillSelectMadres();}
  if(id==='cal') renderCal();
  if(id==='alertas') renderAlertas();
  if(id==='reportes') renderReportes();
  if(id==='gastos'){
    if(!DB.gastos) DB.gastos=[];
    fillGastoAnimales();
    apiGet('gastos').then(g=>{ DB.gastos=g||[]; renderGastos(); }).catch(()=>renderGastos());
  }
 
if(id==='historial'){renderHistorialCards(DB.animales);}
  if(id==='config-pass'){} // soporte - no render needed
  if(id==='arbol'){
    // Limpiar búsqueda anterior
    const inp = document.getElementById('arbol-input');
    if(inp && !inp.value) {
      document.getElementById('arbol-resultado').innerHTML = '<div class="arbol-empty"><div class="ei">🧬</div><p>Escribe el arete o nombre de un animal<br>para ver su árbol genealógico.</p></div>';
    }
  }
  if(id==='perfil-buscar'){
    setTimeout(()=>{
      const inp = document.getElementById('buscar-input');
      const res = document.getElementById('buscar-resultado');
      if(inp) inp.value='';
      if(res) res.innerHTML='';
    }, 50);
  }
  if(id==='documentos') renderHistorialDocs();
  if(id==='suscripcion') { cargarSuscripcion().then(()=>renderSuscripcion()); }
  if(id==='perfil') { cargarPerfilDesdeDB().then(()=>cargarConfigPerfil()); }
  if(id==='dash') cargarSuscripcion().then(actualizarBadgePlan);
  if(id==='inventario') { cargarInventarioLocal(); renderInventario(); }
  if(id==='proveedores') { renderProveedores(); }
  if(id==='finanzas')   { cargarVentasLocal(); renderFinanzas(); }
}

// ── Modal ──
function openM(id){
  if(id==='m-salud'||id==='m-insem'){ fillSelects(); poblarSelectInsemToro(); }
  const el = document.getElementById(id);
  if(el){ el.classList.add('open'); if(el.style.display==='none'||el.style.display==='') el.style.display='flex'; }
}
function closeM(id){
  const el = document.getElementById(id);
  if(el){ el.classList.remove('open'); el.style.display='none'; }
}
document.querySelectorAll('.overlay').forEach(o=>{
  o.addEventListener('click', e=>{ if(e.target===o) o.classList.remove('open'); });
});
document.querySelectorAll('.modal').forEach(m=>{
  m.addEventListener('click', e=>e.stopPropagation());
});

// ══ HIDE HAMBURGER ON SCROLL ══
(function(){
  let lastY = 0;
  let ticking = false;
  const main = document.getElementById('pantalla-dash');
  if(main){
    main.addEventListener('scroll', function(){
      if(!ticking){
        requestAnimationFrame(function(){
          const hb = document.getElementById('mob-btn-menu');
          if(!hb) return;
          const currentY = main.scrollTop;
          if(currentY <= 10){
            // Al tope — mostrar
            hb.classList.remove('hb-hidden');
          } else {
            // Scrolleando — ocultar
            hb.classList.add('hb-hidden');
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    });
  }
  // También escuchar en window por si acaso
  window.addEventListener('scroll', function(){
    if(!ticking){
      requestAnimationFrame(function(){
        const hb = document.getElementById('mob-btn-menu');
        if(!hb) return;
        const currentY = window.scrollY || document.documentElement.scrollTop;
        if(currentY <= 10){
          hb.classList.remove('hb-hidden');
        } else {
          hb.classList.add('hb-hidden');
        }
        ticking = false;
      });
      ticking = true;
    }
  });
})();

// iOS fix — scroll modal to top when keyboard appears
if(/iPhone|iPad|iPod/.test(navigator.userAgent)) {
  document.addEventListener('focusin', function(e) {
    if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  });
}

// ── Helpers ──
const v=id=>document.getElementById(id)?.value||'';
const fmt=d=>{
  if(!d||d==='')return'—';
  // Si ya es un objeto Date
  if(d instanceof Date) return d.toLocaleDateString('es-PE');
  const s=String(d).trim();
  // Formato YYYY-MM-DD
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(s+'T12:00:00').toLocaleDateString('es-PE');
  // Formato DD/MM/YYYY
  if(/^\d{2}\/\d{2}\/\d{4}$/.test(s)){const[dd,mm,yy]=s.split('/');return new Date(`${yy}-${mm}-${dd}T12:00:00`).toLocaleDateString('es-PE');}
  // Número serial de Google Sheets (días desde 30/12/1899)
  if(/^\d+$/.test(s)||typeof d==='number'){const serial=Number(d);const date=new Date((serial-25569)*86400000);return isNaN(date)?s:date.toLocaleDateString('es-PE');}
  // Intentar parsear directamente
  const dt=new Date(s);return isNaN(dt)?s:dt.toLocaleDateString('es-PE');
};
const bCls=e=>({'Activo':'bg-green','Gestante':'bg-yellow','En tratamiento':'bg-blue','Vendido':'bg-gray','Muerto':'bg-red'}[e]||'bg-gray');
const eRow=(c,e,m)=>`<tr><td colspan="${c}"><div class="empty"><div class="empty-e">${e}</div><div style="font-size:13px">${m}</div></div></td></tr>`;
const loadRow=(c)=>`<tr class="loading-row"><td colspan="${c}"><div class="spinner"></div> Cargando desde Supabase...</td></tr>`;

// ══ RECARGAR TODO ══
async function recargarTodo() {
  setSyncStatus('syncing','🔄 Sincronizando...');
  document.getElementById('reload-spin').style.display='inline-block';
  try {
    const safeGet = async (tabla) => { try { return await apiGet(tabla); } catch(e) { console.warn('Error cargando '+tabla+':', e.message); return []; }};
    const [a,s,i,p,g,prov,ord,inv,sem] = await Promise.all([
      safeGet('animales'), safeGet('salud'), safeGet('insem'), safeGet('partos'), safeGet('gastos'),
      safeGet('proveedores'), safeGet('ordenes_compra'), safeGet('inventario'), safeGet('semen_toros')
    ]);
    // Restaurar fotos locales
    a.forEach(animal => {
      if(animal['Foto'] && (animal['Foto'].startsWith('https://res.cloudinary') || animal['Foto'].startsWith('https://tajgjweqvuinfeqzbthw'))) return;
      const savedFoto = localStorage.getItem('vaqueroapp_foto_' + animal['ID']);
      if(savedFoto) animal['Foto'] = savedFoto;
    });
    DB.animales = a; DB.salud = s; DB.insem = i; DB.partos = p; DB.gastos = g||[];
    DB.proveedores = prov||[];
    DB.ordenes_compra = ord||[];
    DB.semen_toros = sem||[];
    // Inventario desde Supabase — siempre usar datos de Supabase (ya vienen filtrados por rancho_id)
    DB.inventario = (inv||[]).map(r=>({
      'ID': r.id||'', 'Nombre': r.nombre||'', 'Categoria': r.categoria||'',
      'Unidad': r.unidad||'', 'Stock': r.stock||0, 'Minimo': r.minimo||0,
      'Precio': r.precio||0, 'Proveedor': r.proveedor||'',
      'Vencimiento': r.vencimiento||'', 'Observaciones': r.observaciones||'',
      'FechaReg': r.fecha_reg||'', 'rancho_id': r.rancho_id||''
    }));
    localStorage.setItem('vaqueroapp_inventario', JSON.stringify(DB.inventario));
    localStorage.setItem('vqa_proveedores', JSON.stringify(DB.proveedores));
    localStorage.setItem('vqa_ordenes', JSON.stringify(DB.ordenes_compra));
    cargarVentasLocal();
    _persistirDatosLocales();
    renderAnimales(); renderSalud(); renderInsem(); renderPartos(); renderDash();
    actualizarBadge();
    mostrarBadgeNotificaciones && mostrarBadgeNotificaciones();
    setSyncStatus('ok','☁ Conectado');
    toast('✅ Datos sincronizados');
  } catch(e) {
    console.error('Error recargando:', e);
    setSyncStatus('err','❌ Error');
    toast('❌ Error al conectar con Supabase: ' + e.message.substring(0,60));
  }
  document.getElementById('reload-spin').style.display='none';
}

// ══ ANIMALES ══

// ══════════════════════════════════════════════════════════
// ACTUALIZACIÓN EN CASCADA — cuando cambia Arete o Nombre
// ══════════════════════════════════════════════════════════
async function actualizarEnCascada(editId, areteViejo, areteNuevo, nombreViejo, nombreNuevo) {
  if(areteViejo === areteNuevo && nombreViejo === nombreNuevo) return;

  const cambiosArete = areteViejo !== areteNuevo;
  let actualizados = 0;

  // ── 1. SALUD & VACUNAS — campo: Animal ──
  (DB.salud||[]).forEach((r,i) => {
    if(cambiosArete && String(r['Animal']||'') === areteViejo) {
      DB.salud[i]['Animal'] = areteNuevo;
      apiPostFast('update','salud', DB.salud[i], String(DB.salud[i]['ID']));
      actualizados++;
    }
  });

  // ── 2. INSEMINACIONES — campo: Hembra ──
  (DB.insem||[]).forEach((r,i) => {
    if(cambiosArete && String(r['Hembra']||'') === areteViejo) {
      DB.insem[i]['Hembra'] = areteNuevo;
      apiPostFast('update','insem', DB.insem[i], String(DB.insem[i]['ID']));
      actualizados++;
    }
  });

  // ── 3. PARTOS — campos: Madre, ArieteCria ──
  (DB.partos||[]).forEach((r,i) => {
    let cambio = false;
    if(cambiosArete && String(r['Madre']||'') === areteViejo)      { DB.partos[i]['Madre']      = areteNuevo; cambio=true; }
    if(cambiosArete && String(r['ArieteCria']||'') === areteViejo) { DB.partos[i]['ArieteCria'] = areteNuevo; cambio=true; }
    if(cambio) { apiPostFast('update','partos', DB.partos[i], String(DB.partos[i]['ID'])); actualizados++; }
  });

  // ── 4. GASTOS — campo: Animal ──
  (DB.gastos||[]).forEach((r,i) => {
    if(cambiosArete && String(r['Animal']||'') === areteViejo) {
      DB.gastos[i]['Animal'] = areteNuevo;
      apiPostFast('update','gastos', DB.gastos[i], String(DB.gastos[i]['ID']));
      actualizados++;
    }
  });

  // ── 5. OTROS ANIMALES — campos: Padre, Madre ──
  (DB.animales||[]).forEach((r,i) => {
    if(String(r['ID']) === String(editId)) return; // saltar el propio animal
    let cambio = false;
    if(cambiosArete && String(r['Madre']||'') === areteViejo) { DB.animales[i]['Madre'] = areteNuevo; cambio=true; }
    if(cambiosArete && String(r['Padre']||'') === areteViejo) { DB.animales[i]['Padre'] = areteNuevo; cambio=true; }
    if(cambio) {
      const rowUpd = {
        id: DB.animales[i]['ID'],
        arete: DB.animales[i]['Arete'],
        madre: DB.animales[i]['Madre'],
        padre: DB.animales[i]['Padre'],
        rancho_id: SESSION?.rancho_id||null
      };
      apiPostFast('update','animales', rowUpd, String(DB.animales[i]['ID']));
      actualizados++;
    }
  });

  // ── 6. HISTORIAL DOCS ──
  (DB.historial_docs||[]).forEach((r,i) => {
    if(cambiosArete && String(r['Animal']||'') === areteViejo) {
      DB.historial_docs[i]['Animal'] = areteNuevo;
      apiPostFast('update','historial_docs', DB.historial_docs[i], String(DB.historial_docs[i]['ID']));
      actualizados++;
    }
  });

  if(actualizados > 0) {
    toast(`🔄 Actualizado en ${actualizados} registro(s) relacionado(s)`);
    try { renderSalud(); }   catch(e){}
    try { renderInsem(); }   catch(e){}
    try { renderPartos(); }  catch(e){}
    try { renderGastos(); }  catch(e){}
    try { poblarListasPadresMadres(); } catch(e){}
  }
}

async function saveAnimal() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const arete=v('a-arete'),raza=v('a-raza'),sexo=v('a-sexo');
  if(!arete||!raza||!sexo){toast('⚠️ Completa los campos obligatorios (*)');return;}
  const editId = document.getElementById('a-edit-id').value;
  // Capturar TODOS los valores del form antes de cualquier otra operación
  const _nombre = v('a-nombre');
  const _nac    = v('a-nac');
  const _peso   = document.getElementById('a-peso')?.value?.trim() || '';
  const _estado = v('a-estado') || 'Activo';
  const _madre  = v('a-madre');
  const _padre  = v('a-padre');
  const _obs    = v('a-obs');
  // Verificar límite de suscripción solo si es animal NUEVO
  if(!editId) {
    const check = puedeAgregarAnimal();
    if(!check.puede) {
      mostrarModalSuscripcion(check.motivo || 'limite');
      return;
    }
  }
  const btn=document.getElementById('btn-save-animal');
  btn.innerHTML='<div class="spinner"></div> Guardando...'; btn.disabled=true;
  setSyncStatus('syncing','🔄 Guardando...');

  const limpiarForm = ()=>{
    clearF(['a-arete','a-nombre','a-nac','a-peso','a-padre','a-madre','a-obs']);
    document.getElementById('a-raza').value='';
    document.getElementById('a-sexo').value='';
    document.getElementById('a-edit-id').value='';
    document.getElementById('a-photo').value='';
    document.getElementById('a-photo-preview').innerHTML='<span style="font-size:28px">📸</span><span>Cámara o galería</span>';
    document.getElementById('m-animal-title').innerHTML='🐂 Registrar Animal <span class="mx" onclick="closeM(&quot;m-animal&quot;)">×</span>';
  };

  const foto = document.getElementById('a-photo').value || '';
  const animalId = editId || String(Date.now());
  if(foto) localStorage.setItem('vaqueroapp_foto_' + animalId, foto);

  const row = {
    'id': animalId,
    'rancho_id': SESSION?.rancho_id || null,
    'arete': arete,
    'nombre': _nombre,
    'raza': raza,
    'sexo': sexo,
    'nacimiento': _nac,
    'peso': _peso ? parseFloat(_peso) : null,
    'estado': _estado,
    'madre': _madre,
    'padre': _padre,
    'observaciones': _obs,
    'foto': foto.startsWith('https://') ? foto : ''
  };
  // rowDisplay usa PascalCase para que renderAnimales lo muestre correctamente
  const rowDisplay = {
    'ID':            animalId,
    'Arete':         arete,
    'Nombre':        _nombre,
    'Raza':          raza,
    'Sexo':          sexo,
    'Nacimiento':    _nac,
    'Peso':          _peso,
    'Peso(kg)':      _peso,
    'Estado':        _estado,
    'Madre':         _madre,
    'Padre':         _padre,
    'Observaciones': _obs,
    'Foto':          foto,
    'FechaRegistro': new Date().toLocaleDateString('es-PE'),
    'rancho_id':     SESSION?.rancho_id || null
  };

  try {
    if(editId) {
      // Guardar valores viejos para la cascada
      const animalViejo = DB.animales.find(x=>String(x['ID'])===String(editId));
      const areteViejo  = animalViejo ? (animalViejo['Arete']||'') : '';
      const nombreViejo = animalViejo ? (animalViejo['Nombre']||'') : '';

      apiPostFast('update','animales',row,editId);
      const idx = DB.animales.findIndex(x=>String(x['ID'])===String(editId));
      if(idx>=0) DB.animales[idx] = rowDisplay;
      toast('✅ Animal actualizado');

      // Actualizar en cascada si cambió el Arete o Nombre
      actualizarEnCascada(editId, areteViejo, arete, nombreViejo, _nombre);
    } else {
      apiPostFast('insert','animales',row);
      DB.animales.unshift(rowDisplay);
      toast('✅ Animal guardado');
    }
    setSyncStatus('ok','☁ Sincronizado');
    renderAnimales(); renderDash(); poblarListasPadresMadres();
    closeM('m-animal');
    limpiarForm();
  } catch(e) {
    setSyncStatus('err','❌ Error al guardar');
    toast('❌ Error al guardar: ' + e.message);
  }
  btn.innerHTML='💾 Guardar'; btn.disabled=false;
}
function renderAnimales(q='') {
  const tbody=document.getElementById('an-tbody');
  const mob=document.getElementById('mob-animales');
  let list = q
    ? DB.animales.filter(a=>(a['Arete']||'').toLowerCase().includes(q)||(a['Nombre']||'').toLowerCase().includes(q)||(a['Raza']||'').toLowerCase().includes(q))
    : DB.animales;
  if(_filtroEstadoActual) {
    list = list.filter(a => (a['Estado']||'') === _filtroEstadoActual);
  }
  // Mostrar conteo junto al filtro activo
  const contEl = document.getElementById('filtro-conteo');
  if(contEl) contEl.textContent = list.length + ' animal' + (list.length !== 1 ? 'es' : '');
  if(!list.length){
    tbody.innerHTML=eRow(10,'🐂', _filtroEstadoActual ? 'Sin animales con estado "'+_filtroEstadoActual+'"' : 'Agrega tu primer animal');
    if(mob) mob.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">🐂 ' + (_filtroEstadoActual ? 'Sin animales con ese estado' : 'Agrega tu primer animal') + '</div>';
    return;
  }
  tbody.innerHTML=list.map(a=>`<tr style="cursor:pointer" onclick="verFichaAnimal('${a['ID']}')" onmouseenter="this.style.background='var(--ag)'" onmouseleave="this.style.background=''">
    <td style="display:flex;align-items:center;gap:8px">
      ${a['Foto']?`<img src="${a['Foto']}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0">`:'<div style="width:36px;height:36px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🐄</div>'}
      <b style="color:var(--accent)">${a['Arete']||''}</b>
    </td>
    <td>${a['Nombre']||'—'}</td><td>${a['Raza']||''}</td>
    <td>${a['Sexo']==='Hembra'?'♀ Hembra':'♂ Macho'}</td>
    <td>${fmt(a['Nacimiento'])}</td><td>${a['Peso(kg)']?a['Peso(kg)']+' kg':'—'}</td>
    <td>${a['Madre']||'—'}</td>
    <td>${a['Padre']||'—'}</td>
    <td><span class="badge ${bCls(a['Estado'])}">${a['Estado']||''}</span></td>
    <td style="display:flex;gap:6px" onclick="event.stopPropagation()">
      <button class="btn btn-ghost btn-sm" onclick="editAnimal('${a['ID']}')">✏️</button>
      <button class="btn btn-danger btn-sm" onclick="delAnimal('${a['ID']}')">🗑</button>
    </td>
  </tr>`).join('');
  // Mobile cards
  if(mob) mob.innerHTML=list.map(a=>`
    <div class="m-card" style="cursor:pointer" onclick="verFichaAnimal('${a['ID']}')">
      <div class="m-card-head">
        <div class="m-card-photo">${a['Foto']?`<img src="${a['Foto']}">`:'🐄'}</div>
        <div style="flex:1">
          <div class="m-card-arete">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}</div>
          <div class="m-card-nombre">${a['Raza']||''} | ${a['Sexo']==='Hembra'?'♀ Hembra':'♂ Macho'}</div>
        </div>
        <span class="badge ${bCls(a['Estado'])}">${a['Estado']||''}</span>
      </div>
      <div class="m-card-body">
        <div class="m-card-field"><span class="m-card-label">Nacimiento</span>${fmt(a['Nacimiento'])}</div>
        <div class="m-card-field"><span class="m-card-label">Peso</span>${a['Peso']||a['Peso(kg)']?((a['Peso']||a['Peso(kg)'])+' kg'):'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Madre</span>${a['Madre']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Padre</span>${a['Padre']||'—'}</div>
      </div>
      <div class="m-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-ghost btn-sm" onclick="editAnimal('${a['ID']}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="delAnimal('${a['ID']}')">🗑 Eliminar</button>
      </div>
    </div>`).join('');
}

function verFichaAnimal(id) {
  const a = DB.animales.find(x => String(x['ID']) === String(id));
  if(!a) return;

  // Calcular edad
  function calcEdad(nac) {
    if(!nac) return '—';
    const nacDate = new Date(nac + 'T12:00:00');
    if(isNaN(nacDate)) return '—';
    const hoy = new Date();
    const diffMs = hoy - nacDate;
    const diffDays = Math.floor(diffMs / 86400000);
    if(diffDays < 30) return diffDays + ' días';
    const meses = Math.floor(diffDays / 30.44);
    if(meses < 12) return meses + ' mes' + (meses !== 1 ? 'es' : '');
    const años = Math.floor(meses / 12);
    const mesesRest = meses % 12;
    return años + ' año' + (años !== 1 ? 's' : '') + (mesesRest > 0 ? ' ' + mesesRest + ' mes' + (mesesRest !== 1 ? 'es' : '') : '');
  }

  const sexoIcon = a['Sexo'] === 'Hembra' ? '♀' : '♂';
  const edad = calcEdad(a['Nacimiento']);
  const estadoCls = bCls(a['Estado']);
  const foto = a['Foto'] || '';

  const fichaEl = document.getElementById('m-ficha-animal');
  const contenido = document.getElementById('ficha-animal-content');

  contenido.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div style="width:72px;height:72px;border-radius:14px;overflow:hidden;border:2px solid var(--border2);flex-shrink:0;display:flex;align-items:center;justify-content:center;background:var(--card2);font-size:36px">
        ${foto ? `<img src="${foto}" style="width:100%;height:100%;object-fit:cover">` : '🐄'}
      </div>
      <div>
        <div style="font-size:22px;font-weight:800;color:var(--accent);font-family:'Plus Jakarta Sans',sans-serif;letter-spacing:-.5px">${a['Arete']||''}</div>
        <div style="font-size:14px;color:var(--text2);font-weight:500">${a['Nombre']||'Sin nombre'}</div>
        <span class="badge ${estadoCls}" style="margin-top:5px;display:inline-block">${a['Estado']||''}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Raza</div>
        <div style="font-size:14px;font-weight:600">${a['Raza']||'—'}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Sexo</div>
        <div style="font-size:14px;font-weight:600">${sexoIcon} ${a['Sexo']||'—'}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Edad</div>
        <div style="font-size:14px;font-weight:600">${edad}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Peso</div>
        <div style="font-size:14px;font-weight:600">${a['Peso']||a['Peso(kg)'] ? (a['Peso']||a['Peso(kg)'])+' kg' : '—'}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Madre</div>
        <div style="font-size:13px;font-weight:600">${a['Madre']||'—'}</div>
      </div>
      <div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
        <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Padre</div>
        <div style="font-size:13px;font-weight:600">${a['Padre']||'—'}</div>
      </div>
    </div>
    ${a['Observaciones'] ? `<div style="margin-top:10px;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:10px 13px">
      <div style="font-size:9px;color:var(--accent);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Observaciones</div>
      <div style="font-size:13px;color:var(--text2)">${a['Observaciones']}</div>
    </div>` : ''}
    <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
      <button class="btn btn-ghost" onclick="closeM('m-ficha-animal');editAnimal('${a['ID']}')">✏️ Editar</button>
      <button class="btn btn-primary" onclick="closeM('m-ficha-animal')">Cerrar</button>
    </div>
  `;

  document.getElementById('ficha-animal-titulo').textContent = (a['Arete']||'') + (a['Nombre'] ? ' — ' + a['Nombre'] : '');
  openM('m-ficha-animal');
}

function editAnimal(id) {
  const a = DB.animales.find(x => String(x['ID']) === String(id));
  if(!a) return;
  document.getElementById('a-edit-id').value = id;
  document.getElementById('a-arete').value   = a['Arete'] || '';
  document.getElementById('a-nombre').value  = a['Nombre'] || '';
  document.getElementById('a-raza').value    = a['Raza'] || '';
  document.getElementById('a-sexo').value    = a['Sexo'] || '';
  document.getElementById('a-nac').value     = a['Nacimiento'] || '';
  document.getElementById('a-peso').value    = a['Peso'] || a['Peso(kg)'] || '';
  document.getElementById('a-estado').value  = a['Estado'] || 'Activo';
  // Padre: intentar encontrar en el select, sino mostrar manual
  const padreVal = a['Padre'] || a['padre'] || '';
  const padreSelEl = document.getElementById('a-padre-sel');
  const padreInpEl = document.getElementById('a-padre');
  if(padreSelEl && padreInpEl) {
    poblarListasPadresMadres();
    // Buscar si el valor existe como opción en el select
    const existeOpcion = Array.from(padreSelEl.options).some(o => o.value === padreVal);
    if(padreVal && !existeOpcion) {
      padreSelEl.value = '__manual__';
      padreInpEl.style.display = '';
      padreInpEl.value = padreVal;
    } else {
      padreSelEl.value = padreVal;
      padreInpEl.style.display = 'none';
      padreInpEl.value = padreVal;
    }
  }
  // Madre: intentar encontrar en el select, sino mostrar manual
  const madreVal = a['Madre'] || '';
  const madreSelEl = document.getElementById('a-madre-sel');
  const madreInpEl = document.getElementById('a-madre');
  if(madreSelEl && madreInpEl) {
    const existeMadre = Array.from(madreSelEl.options).some(o => o.value === madreVal);
    if(madreVal && !existeMadre) {
      madreSelEl.value = '__manual__';
      madreInpEl.style.display = '';
      madreInpEl.value = madreVal;
    } else {
      madreSelEl.value = madreVal;
      madreInpEl.style.display = 'none';
      madreInpEl.value = madreVal;
    }
  }
  document.getElementById('a-obs').value     = a['Observaciones'] || '';
  const foto = a['Foto'] || '';
  document.getElementById('a-photo').value = foto;
  const prev = document.getElementById('a-photo-preview');
  if(foto) prev.innerHTML = `<img src="${foto}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
  else prev.innerHTML = '<span style="font-size:28px">📸</span><span>Cámara o galería</span>';
  document.getElementById('m-animal-title').innerHTML = '✏️ Editar Animal <span class="mx" onclick="closeM(&quot;m-animal&quot;)">×</span>';
  poblarListasPadresMadres();
  openM('m-animal');
}

async function delAnimal(id) {
  if(!confirm('¿Eliminar este animal?'))return;
  setSyncStatus('syncing','🔄 Eliminando...');
  try {
    apiPostFast('delete','animales',null,id);
    DB.animales=DB.animales.filter(a=>String(a['ID'])!==String(id));
    renderAnimales(); renderDash(); poblarListasPadresMadres();
    setSyncStatus('ok','☁ Sincronizado');
    toast('🗑 Animal eliminado');
  } catch(e){setSyncStatus('err','❌ Error');toast('❌ Error al eliminar');}
}
let _filtroEstadoActual = '';
function setFiltroEstado(estado, btn) {
  _filtroEstadoActual = estado;
  document.querySelectorAll('#filtros-estado .filtro-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  const q = (document.getElementById('animales-search')?.value || '').toLowerCase();
  renderAnimales(q);
}
function filtrar(q){renderAnimales(q.toLowerCase());}
function poblarListasPadresMadres() {
  // Datalists legacy
  const opts = DB.animales.map(a=>`<option value="${a['Arete']||''}">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}</option>`).join('');
  const dlp = document.getElementById('lista-padres-ani');
  const dlm = document.getElementById('lista-madres-ani');
  if(dlp) dlp.innerHTML = opts;
  if(dlm) dlm.innerHTML = opts;

  // Select de padres: banco de semen + machos en ganadería
  const optSemen = document.getElementById('opt-padre-semen');
  const optMachos = document.getElementById('opt-padre-machos');
  const optHembras = document.getElementById('opt-madre-hembras');

  if(optSemen) {
    const toros = DB.semen_toros||[];
    optSemen.innerHTML = toros.map(t=>
      `<option value="SEMEN:${t.ID}">🐂 ${t.Nombre} (${t.Raza}) · ${t.Pajillas} paj.</option>`
    ).join('');
  }
  if(optMachos) {
    const machos = (DB.animales||[]).filter(a=>a['Sexo']==='Macho' && a['Estado']!=='Muerto' && a['Estado']!=='Vendido');
    optMachos.innerHTML = machos.map(a=>
      `<option value="${a['Arete']||''}">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''} (${a['Raza']||''})</option>`
    ).join('');
  }
  if(optHembras) {
    const hembras = (DB.animales||[]).filter(a=>a['Sexo']==='Hembra' && a['Estado']!=='Muerta' && a['Estado']!=='Vendido');
    optHembras.innerHTML = hembras.map(a=>
      `<option value="${a['Arete']||''}">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''} (${a['Raza']||''})</option>`
    ).join('');
  }
}

function syncPadreInput() {
  const sel = document.getElementById('a-padre-sel');
  const inp = document.getElementById('a-padre');
  if(!sel||!inp) return;
  if(sel.value === '__manual__') {
    inp.style.display = '';
    inp.focus();
    inp.value = '';
  } else if(sel.value.startsWith('SEMEN:')) {
    // Toro del banco de semen — guardar nombre del toro
    const toroID = sel.value.replace('SEMEN:','');
    const toro = (DB.semen_toros||[]).find(t=>t.ID===toroID);
    inp.style.display = 'none';
    inp.value = toro ? `${toro.Nombre} (${toro.Raza})` : '';
    // Descontar pajilla automáticamente al guardar
    inp.dataset.toroId = toroID;
  } else {
    inp.style.display = 'none';
    inp.value = sel.value;
    inp.dataset.toroId = '';
  }
}

function syncMadreInput() {
  const sel = document.getElementById('a-madre-sel');
  const inp = document.getElementById('a-madre');
  if(!sel||!inp) return;
  if(sel.value === '__manual__') {
    inp.style.display = '';
    inp.focus();
    inp.value = '';
  } else {
    inp.style.display = 'none';
    inp.value = sel.value;
  }
}

// ══ SALUD ══
async function saveSalud() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const animal=v('s-animal'),tipo=v('s-tipo'),desc=v('s-desc'),fecha=v('s-fecha');
  if(!animal||!tipo||!desc||!fecha){toast('⚠️ Completa los campos obligatorios (*)');return;}
  setSyncStatus('syncing','🔄 Guardando...');
  const row={'ID':Date.now(),'Animal':animal,'Tipo':tipo,'Descripcion':desc,'Dosis':v('s-dosis'),'FechaAplicacion':fecha,'ProximaDosis':v('s-prox'),'Veterinario':v('s-vet'),'Costo':v('s-costo'),'Observaciones':v('s-obs')};
  try {
    apiPostFast('insert','salud',row);
    DB.salud.unshift(row);
    renderSalud(); actualizarBadge();
    closeM('m-salud');
    clearF(['s-animal','s-tipo','s-desc','s-dosis','s-fecha','s-prox','s-vet','s-costo','s-obs']);
    setSyncStatus('ok','☁ Sincronizado');
    toast('✅ Salud guardada');
  } catch(e){setSyncStatus('err','❌ Error');toast('❌ Error al guardar');}
}
function renderSalud() {
  const tbody=document.getElementById('sv-tbody');
  const mob=document.getElementById('mob-salud');
  if(!DB.salud.length){
    tbody.innerHTML=eRow(8,'💉','Sin registros de salud');
    if(mob) mob.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">💉 Sin registros de salud</div>';
    return;
  }
  const hoy=new Date();
  tbody.innerHTML=DB.salud.map(r=>{
    let est='Aplicado',cls='bg-green';
    if(r['ProximaDosis']){const d=new Date(r['ProximaDosis']+'T12:00:00'),diff=Math.round((d-hoy)/86400000);
      if(diff<0){est='Vencido';cls='bg-red';}else if(diff<=15){est='Por vencer';cls='bg-yellow';}}
    return `<tr>
      <td><b style="color:var(--accent)">${r['Animal']||''}</b></td>
      <td>${r['Tipo']||''}</td><td>${r['Descripcion']||''}</td>
      <td>${fmt(r['FechaAplicacion'])}</td><td>${r['ProximaDosis']?fmt(r['ProximaDosis']):'—'}</td>
      <td>${r['Veterinario']||'—'}</td>
      <td><span class="badge ${cls}">${est}</span></td>
      <td><button class="btn btn-danger btn-sm" onclick="delSalud('${r['ID']}')">🗑</button></td>
    </tr>`;
  }).join('');
  // Mobile cards
  if(mob) mob.innerHTML=DB.salud.map(r=>{
    let est='Aplicado',cls='bg-green';
    if(r['ProximaDosis']){const d=new Date(r['ProximaDosis']+'T12:00:00'),diff=Math.round((d-hoy)/86400000);
      if(diff<0){est='Vencido';cls='bg-red';}else if(diff<=15){est='Por vencer';cls='bg-yellow';}}
    return `<div class="m-card">
      <div class="m-card-head">
        <div style="font-size:28px">💉</div>
        <div style="flex:1">
          <div class="m-card-arete">${r['Animal']||''}</div>
          <div class="m-card-nombre">${r['Tipo']||''} — ${r['Descripcion']||''}</div>
        </div>
        <span class="badge ${cls}">${est}</span>
      </div>
      <div class="m-card-body">
        <div class="m-card-field"><span class="m-card-label">Aplicación</span>${fmt(r['FechaAplicacion'])}</div>
        <div class="m-card-field"><span class="m-card-label">Próxima</span>${r['ProximaDosis']?fmt(r['ProximaDosis']):'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Dosis</span>${r['Dosis']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Veterinario</span>${r['Veterinario']||'—'}</div>
      </div>
      <div class="m-card-actions">
        <button class="btn btn-danger btn-sm" onclick="delSalud('${r['ID']}')">🗑 Eliminar</button>
      </div>
    </div>`;
  }).join('');
}
async function delSalud(id){
  if(!confirm('¿Eliminar?'))return;
  apiPostFast('delete','salud',null,id);
  DB.salud=DB.salud.filter(r=>String(r['ID'])!==String(id));
  renderSalud(); actualizarBadge(); toast('🗑 Eliminado');
}

// ══ INSEMINACIÓN ══
function calcParto(){const f=v('i-fecha');if(!f)return;const d=new Date(f+'T12:00:00');d.setDate(d.getDate()+283);document.getElementById('i-parto').value=d.toISOString().split('T')[0];}
function editInsem(id) {
  const r = DB.insem.find(x => String(x['ID']) === String(id));
  if(!r) return;

  // Primero abrir el modal para que el DOM esté activo
  document.getElementById('i-edit-id').value = id;
  document.getElementById('insem-modal-titulo').textContent = 'Editar Inseminación';
  document.getElementById('insem-save-btn').textContent = '💾 Actualizar';
  openM('m-insem');

  // Pequeño delay para que el modal esté visible y los selects estén listos
  setTimeout(() => {
    // ── HEMBRA ──
    const hembraEl = document.getElementById('i-hembra');
    // Asegurar que la opción existe
    let optExiste = Array.from(hembraEl.options).some(o => o.value === r['Hembra']);
    if(!optExiste && r['Hembra']) {
      const opt = document.createElement('option');
      opt.value = r['Hembra'];
      opt.textContent = r['Hembra'];
      hembraEl.appendChild(opt);
    }
    hembraEl.value = r['Hembra'] || '';

    // ── FECHA ──
    document.getElementById('i-fecha').value = r['Fecha'] || '';

    // ── TORO / SEMEN ── mostrar siempre en modo texto manual con el valor guardado
    const toroInpEl = document.getElementById('i-toro');
    const toroSelEl = document.getElementById('i-toro-sel');
    toroInpEl.value = r['ToroSemen'] || '';
    toroInpEl.style.display = 'block';
    toroSelEl.value = '__manual__';
    document.getElementById('i-toro-stock').style.display = 'none';

    // ── TÉCNICA ──
    const tecEl = document.getElementById('i-tec');
    const tecVal = r['Tecnica'] || 'Inseminación Artificial (IA)';
    // Verificar que la opción existe
    let tecOk = Array.from(tecEl.options).some(o => o.value === tecVal);
    if(tecOk) tecEl.value = tecVal;

    // ── TÉCNICO ──
    document.getElementById('i-tecnico').value = r['Tecnico'] || '';

    // ── PARTO ESTIMADO ──
    document.getElementById('i-parto').value = r['PartoEstimado'] || '';

    // ── RESULTADO ──
    const resEl = document.getElementById('i-res');
    const resVal = r['Resultado'] || 'Pendiente';
    // Normalizar variaciones (ej. "Preñada" vs "Preñada ✓")
    let resOk = Array.from(resEl.options).some(o => o.value === resVal);
    if(resOk) resEl.value = resVal;
    else resEl.value = 'Pendiente';

    // ── COSTO ──
    document.getElementById('i-costo').value = r['Costo'] || '';

    // ── OBSERVACIONES ──
    document.getElementById('i-obs').value = r['Observaciones'] || '';

  }, 60);
}

async function saveInsem() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const editId = v('i-edit-id');
  const isEdit = !!editId;
  const hembra=v('i-hembra'), fecha=v('i-fecha'), toro=v('i-toro');
  if(!hembra||!fecha||!toro){toast('⚠️ Completa los campos obligatorios (*)');return;}
  setSyncStatus('syncing','🔄 Guardando...');
  const res=v('i-res');

  if(isEdit) {
    // MODO EDICIÓN
    const idx = DB.insem.findIndex(x => String(x['ID']) === String(editId));
    if(idx === -1){ toast('❌ Registro no encontrado'); return; }
    const oldRow = DB.insem[idx];
    const updRow = {...oldRow,
      'Hembra': hembra, 'Fecha': fecha, 'ToroSemen': toro,
      'Tecnica': v('i-tec'), 'Tecnico': v('i-tecnico'),
      'PartoEstimado': v('i-parto'), 'Resultado': res,
      'Costo': v('i-costo'), 'Observaciones': v('i-obs')
    };
    try {
      DB.insem[idx] = updRow;
      apiPostFast('update','insem', updRow, editId);
      // Sincronizar estado del animal
      if(res==='Preñada ✓'){const a=DB.animales.find(x=>x['Arete']===hembra);if(a&&a['Estado']!=='Gestante'){a['Estado']='Gestante';apiPostFast('update','animales',a,a['ID']);renderAnimales();}}
      else if(res==='Vacía ✗'||res==='Repetición'){const a=DB.animales.find(x=>x['Arete']===hembra);if(a&&a['Estado']==='Gestante'){a['Estado']='Activo';apiPostFast('update','animales',a,a['ID']);renderAnimales();}}
      renderInsem(); renderDash();
      closeM('m-insem');
      resetInsemModal();
      toast('✅ Inseminación actualizada');
      setSyncStatus('ok','☁ Sincronizado');
    } catch(e){setSyncStatus('err','❌ Error');toast('❌ Error al actualizar');}
    return;
  }

  // MODO INSERCIÓN (código original)
  const toroInp = document.getElementById('i-toro');
  const toroID  = toroInp?.dataset?.toroId || '';
  let toroObj   = null;
  if(toroID) {
    toroObj = (DB.semen_toros||[]).find(t=>t.ID===toroID);
    if(toroObj && parseInt(toroObj.Pajillas)<=0){
      toast('⚠️ Sin pajillas disponibles para este toro');
      setSyncStatus('ok','');
      return;
    }
  }

  const row={'ID':Date.now(),'Hembra':hembra,'Fecha':fecha,'ToroSemen':toro,'ToroID':toroID,'Tecnica':v('i-tec'),'Tecnico':v('i-tecnico'),'PartoEstimado':v('i-parto'),'Resultado':res,'Costo':v('i-costo'),'Observaciones':v('i-obs')};
  try {
    apiPostFast('insert','insem',row);
    DB.insem.unshift(row);

    if(toroObj){
      const pajillasAntes = parseInt(toroObj.Pajillas)||0;
      toroObj.Pajillas = Math.max(0, pajillasAntes - 1);
      apiPostFast('update','semen_toros', toroObj, toroID);
      renderSemen();
      toast(`✅ Inseminación guardada · 💉 ${toroObj.Nombre}: ${pajillasAntes} → ${toroObj.Pajillas} pajillas`);
    } else {
      toast('✅ Inseminación guardada');
    }

    if(res==='Preñada ✓'){const a=DB.animales.find(x=>x['Arete']===hembra);if(a){a['Estado']='Gestante';await apiPost('update','animales',a,a['ID']);}}
    renderInsem(); renderDash();
    closeM('m-insem');
    resetInsemModal();
    setSyncStatus('ok','☁ Sincronizado');
  } catch(e){setSyncStatus('err','❌ Error');toast('❌ Error al guardar');}
}

function resetInsemModal() {
  document.getElementById('i-edit-id').value = '';
  document.getElementById('insem-modal-titulo').textContent = 'Registrar Inseminación';
  document.getElementById('insem-save-btn').textContent = '💾 Guardar';
  clearF(['i-hembra','i-fecha','i-tecnico','i-parto','i-costo','i-obs']);
  try {
    document.getElementById('i-toro-sel').value='';
    document.getElementById('i-toro').value='';
    document.getElementById('i-toro').style.display='none';
    document.getElementById('i-toro').dataset.toroId='';
    document.getElementById('i-toro-stock').style.display='none';
  } catch(e){}
}
function renderInsem() {
  const tbody=document.getElementById('in-tbody');
  const mob=document.getElementById('mob-insem');
  if(!DB.insem.length){
    tbody.innerHTML=eRow(8,'🔬','Sin registros de inseminación');
    if(mob) mob.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">🔬 Sin registros</div>';
    return;
  }
  const resSelect = (id,val) => `<select style="background:var(--card2);border:1px solid var(--border2);border-radius:6px;color:var(--text);padding:4px 8px;font-size:11px;font-weight:600;cursor:pointer;width:100%;" onchange="updateResultadoInsem('${id}',this.value)">
    <option value="Pendiente" ${(val||'Pendiente')==='Pendiente'?'selected':''}>⏳ Pendiente</option>
    <option value="Preñada ✓" ${val==='Preñada ✓'?'selected':''}>✅ Preñada</option>
    <option value="Vacía ✗" ${val==='Vacía ✗'?'selected':''}>❌ Vacía</option>
    <option value="Repetición" ${val==='Repetición'?'selected':''}>🔄 Repetición</option>
  </select>`;
  tbody.innerHTML=DB.insem.map(r=>{
    return `<tr>
      <td><b style="color:var(--accent)">${r['Hembra']||''}</b></td>
      <td>${fmt(r['Fecha'])}</td><td>${r['ToroSemen']||''}</td><td>${r['Tecnica']||''}</td>
      <td>${r['Tecnico']||'—'}</td><td>${r['PartoEstimado']?fmt(r['PartoEstimado']):'—'}</td>
      <td>${resSelect(r['ID'],r['Resultado'])}</td>
      <td style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-sm" title="Editar" onclick="editInsem('${r['ID']}')">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="delInsem('${r['ID']}')">🗑</button>
      </td>
    </tr>`;
  }).join('');
  // Mobile cards
  if(mob) mob.innerHTML=DB.insem.map(r=>`
    <div class="m-card">
      <div class="m-card-head">
        <div style="font-size:28px">🔬</div>
        <div style="flex:1">
          <div class="m-card-arete">${r['Hembra']||''}</div>
          <div class="m-card-nombre">Fecha: ${fmt(r['Fecha'])}</div>
        </div>
      </div>
      <div class="m-card-body">
        <div class="m-card-field"><span class="m-card-label">Toro / Semen</span>${r['ToroSemen']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Técnica</span>${r['Tecnica']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Técnico</span>${r['Tecnico']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Parto Est.</span>${r['PartoEstimado']?fmt(r['PartoEstimado']):'—'}</div>
      </div>
      <div style="margin-top:10px">
        <span class="m-card-label">Resultado</span>
        ${resSelect(r['ID'],r['Resultado'])}
      </div>
      <div class="m-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="editInsem('${r['ID']}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="delInsem('${r['ID']}')">🗑 Eliminar</button>
      </div>
    </div>`).join('');
}
async function updateResultadoInsem(id, resultado) {
  const ins = DB.insem.find(r=>String(r['ID'])===String(id));
  if(!ins) return;
  ins['Resultado'] = resultado;
  apiPostFast('update','insem',ins,id);
  if(resultado==='Preñada ✓') {
    const a=DB.animales.find(x=>x['Arete']===ins['Hembra']);
    if(a&&a['Estado']!=='Gestante'){a['Estado']='Gestante';apiPostFast('update','animales',a,a['ID']);renderAnimales();renderDash();}
  } else if(resultado==='Vacía ✗'||resultado==='Repetición') {
    const a=DB.animales.find(x=>x['Arete']===ins['Hembra']);
    if(a&&a['Estado']==='Gestante'){a['Estado']='Activo';apiPostFast('update','animales',a,a['ID']);renderAnimales();renderDash();}
  }
  toast('✅ Resultado actualizado');
}
async function delInsem(id){
  if(!confirm('¿Eliminar?'))return;
  apiPostFast('delete','insem',null,id);
  DB.insem=DB.insem.filter(r=>String(r['ID'])!==String(id));
  renderInsem(); renderDash(); toast('🗑 Eliminado');
}

// ══ SELECTS ══
function fillSelects(){
  ['s-animal','i-hembra'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    const onlyF=id==='i-hembra';
    el.innerHTML='<option value="">Seleccionar...</option>'+
      DB.animales.filter(a=>!onlyF||a['Sexo']==='Hembra')
        .map(a=>`<option value="${a['Arete']}">${a['Arete']}${a['Nombre']?' — '+a['Nombre']:''}</option>`).join('');
  });
}

// ══ DASHBOARD ══
function renderDash() {
  const hoy=new Date(),en30=new Date();en30.setDate(en30.getDate()+30);
  document.getElementById('dash-s-total').textContent=DB.animales.filter(a=>a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').length;
  document.getElementById('dash-s-gest').textContent=DB.animales.filter(a=>a['Estado']==='Gestante').length;
  document.getElementById('dash-s-crec').textContent=DB.insem.filter(i=>i['Fecha']?.startsWith(new Date().getFullYear())).length;
  document.getElementById('dash-s-trat').textContent=DB.salud.filter(s=>{
    if(!s['ProximaDosis'])return false;const d=new Date(s['ProximaDosis']+'T12:00:00');return d>=hoy&&d<=en30;
  }).length;
  actualizarBadge();
  // Pajillas por raza en dashboard
  const semenDashEl = document.getElementById('dash-semen-razas');
  if(semenDashEl){
    const toros = DB.semen_toros||[];
    if(toros.length){
      const razaMap={};
      toros.forEach(t=>{ const r=t.Raza||'Sin raza'; razaMap[r]=(razaMap[r]||0)+(parseInt(t.Pajillas)||0); });
      const topRazas = Object.entries(razaMap).sort((a,b)=>b[1]-a[1]).slice(0,4);
      semenDashEl.innerHTML = topRazas.map(([r,n])=>
        `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:12px;color:var(--text2)">🐂 ${r}</span>
          <span style="font-size:13px;font-weight:700;color:var(--blue)">${n} paj.</span>
        </div>`
      ).join('');
    } else {
      semenDashEl.innerHTML='<div style="font-size:12px;color:var(--muted);text-align:center;padding:10px">Sin toros registrados</div>';
    }
  }
  const tbody=document.getElementById('dash-an-list');
  const mob=document.getElementById('dash-an-list');
  const list=DB.animales.slice(0,6);
  if(!list.length){
    tbody.innerHTML=eRow(5,'🐄','Sin registros aún');
    if(mob) mob.innerHTML='<div style="text-align:center;padding:20px;color:var(--muted)">🐄 Sin animales registrados</div>';
  } else {
    tbody.innerHTML=list.map(a=>`<tr>
      <td style="display:flex;align-items:center;gap:8px">
        ${a['Foto']?`<img src="${a['Foto']}" style="width:36px;height:36px;border-radius:8px;object-fit:cover;flex-shrink:0">`:'<div style="width:36px;height:36px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">🐄</div>'}
        <b style="color:var(--accent)">${a['Arete']||''}</b>
      </td>
      <td>${a['Nombre']||'—'}</td><td>${a['Raza']||''}</td>
      <td><span class="badge ${bCls(a['Estado'])}">${a['Estado']||''}</span></td>
      <td>${a['FechaRegistro']||a['Fecha Registro']||'—'}</td>
    </tr>`).join('');
    if(mob) mob.innerHTML=list.map(a=>`
      <div class="m-card" style="padding:12px;cursor:pointer" onclick="goTo('animales')" data-section="animales">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="m-card-photo">${a['Foto']?`<img src="${a['Foto']}">`:'🐄'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:var(--accent);font-size:14px">${a['Arete']||''} ${a['Nombre']?'<span style="color:var(--text2);font-weight:400">— '+a['Nombre']+'</span>':''}</div>
            <div style="font-size:11px;color:var(--muted)">${a['Raza']||''}</div>
          </div>
          <span class="badge ${bCls(a['Estado'])}">${a['Estado']||''}</span>
        </div>
      </div>`).join('');
  }

  // ── Panel Alertas Visuales ──
  renderDashAlertas();
  // ── Próximos eventos ──
  renderDashEventos();
  // ── Gráfica Ingresos vs Gastos ──
  renderDashFinanzas();
}

function renderDashAlertas() {
  const cont = document.getElementById('dash-alertas-content');
  if(!cont) return;
  const alerts = buildAlertas().slice(0,5);
  if(!alerts.length) {
    cont.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">✅ Sin alertas urgentes</div>';
    return;
  }
  cont.innerHTML = alerts.map(a=>`
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="font-size:20px;flex-shrink:0">${a.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:${a.color}">${a.title}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${a.sub}</div>
      </div>
    </div>`).join('') + (buildAlertas().length>5?`<div style="text-align:center;padding:8px;font-size:12px;color:var(--muted)">${buildAlertas().length-5} alertas más →</div>`:'');
}

function renderDashEventos() {
  const cont = document.getElementById('dash-eventos-content');
  if(!cont) return;
  const hoy = new Date();
  const en7 = new Date(); en7.setDate(hoy.getDate()+7);
  const eventos = [];
  // Vacunas próximas 7 días
  DB.salud.forEach(s=>{
    if(!s['ProximaDosis']) return;
    const d = new Date(s['ProximaDosis']+'T12:00:00');
    if(d>=hoy && d<=en7) eventos.push({
      fecha: d, icon:'💉', color:'#e05a4a',
      texto: `Vacuna: ${s['Animal']||''} — ${s['Descripcion']||''}`,
      dias: Math.ceil((d-hoy)/86400000)
    });
  });
  // Partos estimados próximos 7 días
  DB.insem.forEach(i=>{
    if(!i['PartoEstimado']) return;
    const d = new Date(i['PartoEstimado']+'T12:00:00');
    if(d>=hoy && d<=en7) eventos.push({
      fecha: d, icon:'🐄', color:'var(--accent)',
      texto: `Parto estimado: ${i['Hembra']||''}`,
      dias: Math.ceil((d-hoy)/86400000)
    });
  });
  eventos.sort((a,b)=>a.fecha-b.fecha);
  if(!eventos.length) {
    cont.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">📅 Sin eventos esta semana</div>';
    return;
  }
  cont.innerHTML = eventos.map(e=>`
    <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
      <div style="width:40px;height:40px;border-radius:10px;background:${e.color}20;border:1px solid ${e.color}40;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${e.icon}</div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--text)">${e.texto}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:1px">${e.fecha.toLocaleDateString('es-PE',{weekday:'long',day:'numeric',month:'short'})}</div>
      </div>
      <div style="background:${e.color}20;color:${e.color};border-radius:8px;padding:3px 8px;font-size:11px;font-weight:700;flex-shrink:0">${e.dias===0?'HOY':e.dias===1?'Mañana':'En '+e.dias+'d'}</div>
    </div>`).join('');
}

function renderDashFinanzas() {
  const resumen = document.getElementById('dash-finanzas-resumen');
  const canvas = document.getElementById('dash-chart');
  if(!resumen||!canvas) return;

  const gastos = DB.gastos||[];
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();

  // Calcular últimos 5 meses
  const meses = [];
  for(let i=4;i>=0;i--) {
    const d = new Date(anioActual, mesActual-i, 1);
    meses.push({ mes: d.getMonth(), anio: d.getFullYear(), label: d.toLocaleDateString('es-PE',{month:'short'}), ingresos:0, egresos:0 });
  }

  gastos.forEach(g=>{
    if(!g['Fecha']) return;
    const d = new Date(g['Fecha']);
    const m = meses.find(x=>x.mes===d.getMonth()&&x.anio===d.getFullYear());
    if(!m) return;
    const monto = parseFloat(g['Monto'])||0;
    const tipo = (g['Tipo']||g['Categoria']||'').toLowerCase();
    if(tipo.includes('ingreso')||tipo.includes('venta')) m.ingresos+=monto;
    else m.egresos+=monto;
  });

  const totalIng = meses.reduce((s,m)=>s+m.ingresos,0);
  const totalEgr = meses.reduce((s,m)=>s+m.egresos,0);
  const balance = totalIng - totalEgr;

  resumen.innerHTML = `
    <div style="background:rgba(184,221,60,.1);border:1px solid rgba(184,221,60,.3);border-radius:12px;padding:10px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px">
      <img src="data:image/png;base64,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" style="width:28px;height:28px;object-fit:contain">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;font-family:var(--font-mono)">Ingresos</div>
      <div style="font-size:16px;font-weight:800;color:var(--accent)">S/${totalIng.toFixed(0)}</div>
    </div>
    <div style="background:rgba(255,100,100,.1);border:1px solid rgba(255,100,100,.3);border-radius:12px;padding:10px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px">
      <img src="data:image/png;base64,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" style="width:28px;height:28px;object-fit:contain">
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;font-family:var(--font-mono)">Gastos</div>
      <div style="font-size:16px;font-weight:800;color:#ff6464">S/${totalEgr.toFixed(0)}</div>
    </div>
    <div style="background:${balance>=0?'rgba(184,221,60,.1)':'rgba(255,100,100,.1)'};border:1px solid ${balance>=0?'rgba(184,221,60,.3)':'rgba(255,100,100,.3)'};border-radius:12px;padding:10px 8px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:4px">
      <div style="font-size:22px">${balance>=0?'📈':'📉'}</div>
      <div style="font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;font-family:var(--font-mono)">Balance</div>
      <div style="font-size:16px;font-weight:800;color:${balance>=0?'var(--accent)':'#ff6464'}">${balance>=0?'+':''}S/${balance.toFixed(0)}</div>
    </div>`;

  // Dibujar gráfica con requestAnimationFrame para asegurar que el DOM esté pintado
  requestAnimationFrame(() => _dibujarGrafica(canvas, meses));
}

function _dibujarGrafica(canvas, meses) {
  const contenedor = canvas.parentElement;
  const W = contenedor.clientWidth || contenedor.offsetWidth || 300;
  if(W < 10) { setTimeout(()=>_dibujarGrafica(canvas, meses), 150); return; }

  const H = 180;
  const dpr = window.devicePixelRatio||1;
  canvas.width = W*dpr; canvas.height = H*dpr;
  canvas.style.width = W+'px'; canvas.style.height = H+'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const isDark = document.documentElement.getAttribute('data-theme')==='dark' || document.body.classList.contains('dark') || window.matchMedia('(prefers-color-scheme: dark)').matches;
  const textColor = isDark?'#666':'#999';
  const gridColor = isDark?'rgba(255,255,255,.05)':'rgba(0,0,0,.05)';

  const maxVal = Math.max(...meses.map(m=>Math.max(m.ingresos,m.egresos)),100);
  ctx.font = '10px Arial';
  const labelW = ctx.measureText('S/'+Math.round(maxVal)).width + 8;
  const padL=Math.ceil(labelW), padR=8, padT=12, padB=28;
  const chartW=W-padL-padR, chartH=H-padT-padB;
  const slotW = chartW/meses.length;
  const barW = Math.max(Math.floor(slotW*0.28), 5);

  // Líneas de grid
  [0,.25,.5,.75,1].forEach(r=>{
    const y = padT + chartH*(1-r);
    ctx.strokeStyle=gridColor; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
    ctx.fillStyle=textColor; ctx.font='9px Arial'; ctx.textAlign='right';
    ctx.fillText('S/'+Math.round(maxVal*r), padL-3, y+3);
  });

  meses.forEach((m,i)=>{
    const cx = padL + i*slotW + slotW/2;
    // Barra ingresos
    if(m.ingresos>0){
      const h = (m.ingresos/maxVal)*chartH;
      ctx.fillStyle='var(--accent)';
      ctx.beginPath();
      ctx.roundRect(cx-barW-1, padT+chartH-h, barW, h, [3,3,0,0]);
      ctx.fill();
    }
    // Barra gastos
    if(m.egresos>0){
      const h = (m.egresos/maxVal)*chartH;
      ctx.fillStyle='#ff6464';
      ctx.beginPath();
      ctx.roundRect(cx+1, padT+chartH-h, barW, h, [3,3,0,0]);
      ctx.fill();
    }
    // Label mes
    ctx.fillStyle=textColor; ctx.font='9px Arial'; ctx.textAlign='center';
    ctx.fillText(m.label.toUpperCase(), cx, H-8);
  });
}

// ══ ALERTAS ══
function buildAlertas(){
  const hoy=new Date(),alerts=[];
  DB.salud.forEach(s=>{
    if(!s['ProximaDosis'])return;
    const d=new Date(s['ProximaDosis']+'T12:00:00'),diff=Math.round((d-hoy)/86400000);
    if(diff<=30)alerts.push({color:diff<0?'var(--red)':diff<=7?'var(--accent2)':'var(--blue)',icon:diff<0?'🚨':diff<=7?'⚠️':'💉',
      title:`${diff<0?'VACUNA VENCIDA':'Vacuna próxima'}: ${s['Animal']} — ${s['Descripcion']}`,
      sub:diff<0?`Venció hace ${-diff} días. Fecha: ${fmt(s['ProximaDosis'])}`:`Vence en ${diff} días (${fmt(s['ProximaDosis'])})`
    });
  });
  DB.insem.forEach(i=>{
    if(!i['PartoEstimado'])return;
    const d=new Date(i['PartoEstimado']+'T12:00:00'),diff=Math.round((d-hoy)/86400000);
    if(diff>=0&&diff<=45)alerts.push({color:'var(--accent2)',icon:'🐄',
      title:`Parto próximo: ${i['Hembra']}`,sub:`Fecha estimada: ${fmt(i['PartoEstimado'])} — en ${diff} días`
    });
  });
  return alerts;
}
function actualizarBadge(){const n=buildAlertas().length;const b=document.getElementById('alertas-badge-nav');b.textContent=n;b.style.display=n?'inline':'none';}
function renderAlertas(){
  const list=document.getElementById('dash-alertas-list'),alerts=buildAlertas();
  if(!alerts.length){list.innerHTML='<div class="empty"><div class="empty-e">✅</div><div style="font-size:13px">¡Todo en orden! Sin alertas activas.</div></div>';return;}
  list.innerHTML=alerts.map(a=>`<div class="alert-card" style="border-left-color:${escH(a.color)}"><div style="font-size:18px;margin-top:1px">${escH(a.icon)}</div><div><div class="alert-title">${escH(a.title)}</div><div class="alert-sub">${escH(a.sub)}</div></div></div>`).join('');
}

// ══ CALENDARIO ══
const calEvCache = {};
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DS=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
function getEvMap(){
  const m={};
  const p=(k,v)=>{if(!k)return;const key=k.substring(0,10);if(!m[key])m[key]=[];m[key].push(v);};
  DB.insem.forEach(i=>{
    if(i['Fecha'])p(i['Fecha'],{icon:'🔬',color:'#4a9eff',txt:`Inseminación: ${i['Hembra']||''}`,tipo:'insem'});
    if(i['PartoEstimado'])p(i['PartoEstimado'],{icon:'🐄',color:'var(--accent)',txt:`Parto estimado: ${i['Hembra']||''}`,tipo:'parto-est'});
  });
  DB.salud.forEach(s=>{
    if(s['ProximaDosis'])p(s['ProximaDosis'],{icon:'💉',color:'#e05a4a',txt:`${s['Tipo']||'Vacuna'}: ${s['Animal']||''} — ${s['Descripcion']||''}`,tipo:'salud'});
    if(s['FechaAplicacion'])p(s['FechaAplicacion'],{icon:'✅',color:'#e05a4a',txt:`Aplicado: ${s['Animal']||''} — ${s['Descripcion']||''}`,tipo:'salud'});
  });
  DB.partos.forEach(p2=>{
    if(p2['Fecha'])p(p2['Fecha'],{icon:'🐣',color:'#f0a500',txt:`Parto: ${p2['Madre']||''} → Cría ${p2['ArieteCria']||'—'}`,tipo:'parto'});
  });
  return m;
}

function showCalPopup(dateStr, el) {
  const events = calEvCache[dateStr] || [];
  if(!events.length) return;
  const popup = document.getElementById('cal-popup');
  document.getElementById('cal-popup-fecha').textContent = fmt(dateStr);
  document.getElementById('cal-popup-content').innerHTML = events.map(e=>`
    <div class="cal-event-item">
      <span class="ev-icon">${e.icon}</span>
      <span class="ev-txt" style="color:${e.color||'var(--text2)'}">${e.txt}</span>
    </div>`).join('');
  // Position popup near clicked element
  const rect = el.getBoundingClientRect();
  popup.style.display = 'block';
  const pw = 280, ph = 200;
  let left = rect.left, top = rect.bottom + 8;
  if(left + pw > window.innerWidth) left = window.innerWidth - pw - 10;
  if(top + ph > window.innerHeight) top = rect.top - ph - 8;
  popup.style.left = Math.max(8,left) + 'px';
  popup.style.top = Math.max(8,top) + 'px';
  // Close on outside click
  setTimeout(()=>{ document.addEventListener('click', function h(e){if(!popup.contains(e.target)){popup.style.display='none';document.removeEventListener('click',h);}},true);},100);
}

function shiftMes(d){calMes+=d;if(calMes>11){calMes=0;calAno++;}if(calMes<0){calMes=11;calAno--;}renderCal();}

function renderCal(){
  document.getElementById('cal-label').textContent=`${MESES[calMes]} ${calAno}`;
  document.getElementById('cal-dh').innerHTML=DS.map(d=>`<div class="cal-dh">${d}</div>`).join('');
  const ev=getEvMap(),hoy=new Date(),todayStr=hoy.toISOString().split('T')[0];
  const first=new Date(calAno,calMes,1).getDay(),total=new Date(calAno,calMes+1,0).getDate();
  let cells = [];
  for(let i=0;i<first;i++) cells.push(`<div class="cc empty"></div>`);
  for(let d=1;d<=total;d++){
    const k=`${calAno}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvs = ev[k]||[];
    const isToday = k===todayStr;
    const dots = [...new Set(dayEvs.map(e=>e.color))].slice(0,4).map(c=>`<span class="cal-dot" style="background:${c}"></span>`).join('');
    if(dayEvs.length) calEvCache[k] = dayEvs;
    const onclick = dayEvs.length ? `onclick="showCalPopup('${k}',this)"` : '';
    cells.push(`<div class="cc${isToday?' today':''}${dayEvs.length?' has-ev':''}" ${onclick}>
      <span class="cal-day-num">${d}</span>
      ${dots?`<div class="cal-day-dots">${dots}</div>`:''}
    </div>`);
  }
  document.getElementById('cal-grid').innerHTML=cells.join('');

  // Próximos eventos
  const flat=[];Object.entries(ev).forEach(([f,arr])=>arr.forEach(e=>flat.push({fecha:f,...e})));
  const prox=flat.filter(e=>e.fecha>=todayStr).sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(0,8);
  const pe=document.getElementById('prox-ev');
  if(!prox.length){pe.innerHTML='<div class="empty"><div class="empty-e">📅</div><div style="font-size:13px">Sin eventos próximos</div></div>';return;}
  pe.innerHTML=`<div class="tl">${prox.map((e,i)=>`<div class="tl-item">${i<prox.length-1?'<div class="tl-vl"></div>':''}<div class="tl-dot">${e.icon}</div><div class="tl-body"><div class="tl-title">${escH(e.txt)}</div><div class="tl-meta">${escH(fmt(e.fecha))}</div></div></div>`).join('')}</div>`;
}

function clearF(ids){ids.forEach(id=>{const el=document.getElementById(id);if(el)el.value=''});}

// ══ MENÚ HAMBURGER MÓVIL ══
function toggleMenu(){
  const sidebar = document.getElementById('pantalla-dash');
  const opening = !sidebar.classList.contains('open');
  sidebar.classList.toggle('open');
  document.getElementById('mobile-overlay').classList.toggle('open');
  const hb = document.getElementById('mob-btn-menu');
  if(hb) hb.classList.toggle('hb-hidden', opening);
  // Bloquear scroll del fondo cuando sidebar está abierto
  if(opening) {
    document.body.classList.add('sidebar-open');
    document.body.style.overflow = 'hidden';
  } else {
    document.body.classList.remove('sidebar-open');
    document.body.style.overflow = '';
  }
}
function closeMenu(){
  document.body.style.overflow = '';
  document.getElementById('pantalla-dash').classList.remove('open');
  document.getElementById('mobile-overlay').classList.remove('open');
  const hb = document.getElementById('mob-btn-menu');
  if(hb) hb.classList.remove('hb-hidden');
}


// ══ SISTEMA OFFLINE ══
var OFFLINE_KEY = 'vaqueroapp_offline_queue';

// Limpiar TODOS los datos de rancho del localStorage (evita mezclar datos entre cuentas)
function limpiarCacheDatos() {
  const claves = [
    'vqa_offline_animales', 'vqa_offline_salud', 'vqa_offline_insem',
    'vqa_offline_partos',   'vqa_offline_gastos', 'vqa_offline_semen_toros', 'vqa_offline_suscripcion',
    'vaqueroapp_offline_queue',
    'vaqueroapp_cache_animales', 'vaqueroapp_cache_salud', 'vaqueroapp_cache_insem',
    'vaqueroapp_cache_partos',   'vaqueroapp_cache_gastos',
    'vaqueroapp_cache_inventario', 'vaqueroapp_inventario',
    'vqa_proveedores', 'vqa_ordenes', 'vaqueroapp_ventas',
    'vaqueroapp_historial_docs',
    'vaqueroapp_doc_guia', 'vaqueroapp_doc_contrato', 'vaqueroapp_doc_certificado',
    'vaqueroapp_config_pdf', 'vaqueroapp_pdf_owner',
    'vqa_cache_owner'
  ];
  claves.forEach(k => localStorage.removeItem(k));
  // También borrar fotos cacheadas de animales
  Object.keys(localStorage).forEach(k => {
    if(k.startsWith('vaqueroapp_foto_')) localStorage.removeItem(k);
  });
  SUSCRIPCION = null;
  MODO_LECTURA = false;
}
let isOnline = true; // Asumir online hasta verificar con fetch real

function getOfflineQueue() {
  return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
}
function saveOfflineQueue(q) {
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(q));
}
function getLocalCache(key) {
  return JSON.parse(localStorage.getItem('vaqueroapp_cache_'+key) || '[]');
}
function saveLocalCache(key, data) {
  localStorage.setItem('vaqueroapp_cache_'+key, JSON.stringify(data));
}

function updateOnlineStatus() {
  isOnline = navigator.onLine;
  const bar = document.getElementById('offline-bar');
  if(bar) {
    if(!isOnline) {
      bar.style.display = 'block';
      bar.textContent = '📵 Sin conexión — los cambios se sincronizarán al reconectar';
      setSyncStatus('err','📵 Sin conexión');
    } else {
      bar.style.display = 'none';
      setSyncStatus('ok','☁ Conectado');
      if(SESSION) syncPending();
    }
  }
  updatePendingBadge();
}

function updatePendingBadge() {
  const q = getOfflineQueue();
  const btn = document.getElementById('sync-pending');
  const cnt = document.getElementById('sync-count');
  if(cnt) cnt.textContent = q.length;
  if(btn) btn.style.display = q.length > 0 ? 'block' : 'none';
}

function limpiarColaOffline() {
  if(confirm('¿Limpiar la cola de sincronización? Esto eliminará los registros pendientes que no pudieron enviarse (por ejemplo, fechas inválidas). Los datos ya guardados en la app no se verán afectados.')) {
    saveOfflineQueue([]);
    updatePendingBadge();
    toast('✅ Cola limpiada correctamente');
  }
}

async function syncPending() {
  if(!isOnline) { toast('📵 Sin conexión — intenta cuando tengas señal'); return; }
  const q = getOfflineQueue();
  if(!q.length) { toast('✅ Todo sincronizado'); return; }
  setSyncStatus('syncing','🔄 Sincronizando '+q.length+' registros...');
  let success = 0;
  const remaining = [];
  for(const item of q) {
    try {
      await apiPost(item.action, item.sheet, item.data, item.id);
      success++;
    } catch(e) {
      remaining.push(item);
    }
  }
  saveOfflineQueue(remaining);
  updatePendingBadge();
  if(remaining.length === 0) {
    setSyncStatus('ok','☁ Sincronizado');
    toast('✅ '+success+' registros sincronizados con Supabase');
    await recargarTodo();
  } else {
    setSyncStatus('err','⚠️ '+remaining.length+' pendientes');
    toast('⚠️ '+success+' sincronizados, '+remaining.length+' pendientes');
  }
}

// API con soporte offline
async function apiPostOffline(action, sheet, data, id) {
  if(!isOnline) {
    // Guardar en cola offline
    const q = getOfflineQueue();
    q.push({action, sheet, data, id, ts: Date.now()});
    saveOfflineQueue(q);
    updatePendingBadge();
    throw new Error('OFFLINE');
  }
  return await apiPost(action, sheet, data, id);
}

// Cargar desde caché cuando no hay internet
function restorePhotos(animals) {
  if(!animals) return animals;
  animals.forEach(a => {
    // Si Sheets ya tiene URL de Cloudinary, usarla
    if(a['Foto'] && a['Foto'].startsWith('https://')) return;
    // Si no, buscar en localStorage
    const foto = localStorage.getItem('vaqueroapp_foto_' + a['ID']);
    if(foto) a['Foto'] = foto;
  });
  return animals;
}

async function apiGetOffline(sheet) {
  if(!isOnline) {
    const cached = getLocalCache(sheet);
    return sheet==='animales' ? restorePhotos(cached||[]) : (cached||[]);
  }
  try {
    const rows = await apiGet(sheet);
    saveLocalCache(sheet, rows);
    return sheet==='animales' ? restorePhotos(rows) : rows;
  } catch(e) {
    const cached = getLocalCache(sheet);
    return sheet==='animales' ? restorePhotos(cached||[]) : (cached||[]);
  }
}

window.addEventListener('online',  updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
// Verificar conexión real solo después de 3 segundos (no mostrar error al inicio)
setTimeout(updateOnlineStatus, 3000);


// ══ TEMA CLARO/OSCURO ══
function cargarTema() {
  const saved = localStorage.getItem('vaqueroapp_tema') || 'light';
  applyTheme(saved);
}

function applyTheme(tema) {
  const btn = document.getElementById('theme-btn');
  if(tema === 'light') {
    document.body.classList.add('light-mode');
    if(btn) btn.textContent = '🌙';
  } else {
    document.body.classList.remove('light-mode');
    if(btn) btn.textContent = '☀️';
  }
  localStorage.setItem('vaqueroapp_tema', tema);
}

function toggleTheme() {
  const current = localStorage.getItem('vaqueroapp_tema') || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ══ INIT ══
updateOnlineStatus();
document.getElementById('fecha-label').textContent=new Date().toLocaleDateString('es-PE',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

cargarTema();
addCSPMeta();
initSecurityListeners();

// Revisar estado del botón de notificaciones SIEMPRE al cargar,
// sin importar si la sesión fue manual o automática (recordada)
if (window.OneSignalDeferred) {
  window.OneSignalDeferred.push(async function() {
    actualizarBotonPush();
  });
}
// ── INICIO: Verificar sesión ──
(async () => {
  const hash   = window.location.hash;
  const search = window.location.search;

  // ── PRIORIDAD 1: RECOVERY — se detectó en el <head>, tiene máxima prioridad ──
  if(window.__IS_RECOVERY__ && window.__RECOVERY_TOKEN__) {
    const rToken = window.__RECOVERY_TOKEN__;
    window.__RECOVERY_TOKEN__ = null;
    window.__IS_RECOVERY__ = false;
    window.history.replaceState({}, '', window.location.pathname);
    document.getElementById('pantalla-login').style.display = 'none';
    const ldR = document.getElementById('app-loading');
    if(ldR) ldR.style.display = 'none';
    mostrarPantallaResetPass(rToken);
    return;
  }
  // Fallback por si acaso
  const _spFallback = new URLSearchParams(search.substring(1));
  const _hpFallback = new URLSearchParams(hash.substring(1));
  if(_spFallback.get('type') === 'recovery' || _hpFallback.get('type') === 'recovery') {
    const rTok = _spFallback.get('token') || _spFallback.get('access_token') || _hpFallback.get('access_token');
    if(rTok) {
      window.history.replaceState({}, '', window.location.pathname);
      document.getElementById('pantalla-login').style.display = 'none';
      const ldR2 = document.getElementById('app-loading');
      if(ldR2) ldR2.style.display = 'none';
      mostrarPantallaResetPass(rTok);
      return;
    }
  }

  const _hasSavedToken = !!localStorage.getItem('vaqueroapp_token');
  // Solo mostrar loading si hay token que verificar
  if(_hasSavedToken || hash.includes('access_token') || search.includes('token')) {
    const ld = document.getElementById('app-loading');
    if(ld) ld.style.display = 'flex';
  } else {
    // Sin token — mostrar login inmediatamente
    document.getElementById('pantalla-login').style.display = 'flex';
    return;
  }

  // 1. Token en URL (OAuth Google o redirect desde landing)
  let urlToken = null;
  if(hash.includes('access_token')) {
    const p = new URLSearchParams(hash.substring(1));
    urlToken = p.get('access_token');
  }
  if(!urlToken && search.length > 1) {
    const p = new URLSearchParams(search.substring(1));
    urlToken = p.get('access_token') || p.get('token');
  }

  if(urlToken) {
    // Detectar si es un link de recuperación de contraseña (fallback)
    const hashParams = new URLSearchParams(hash.substring(1));
    const tokenType  = hashParams.get('type');
    if(tokenType === 'recovery') {
      window.history.replaceState({}, '', window.location.pathname);
      document.getElementById('app-loading').style.display = 'none';
      mostrarPantallaResetPass(urlToken);
      return;
    }
    try {
      const r = await fetch(SB_URL+'/auth/v1/user', {
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+urlToken}
      });
      const u = await r.json();
      if(u && u.id) {
        window.history.replaceState({}, '', window.location.pathname);
        document.getElementById('app-loading').style.display = 'none';
        await iniciarSesion(urlToken, u);
        return;
      }
    } catch(e){ console.warn('URL token error:', e); }
  }

  // 2. Sesión guardada en localStorage (login previo)
  const savedToken   = localStorage.getItem('vaqueroapp_token');
  const savedSession = localStorage.getItem('vaqueroapp_session');

  if(savedToken && savedSession) {
    // ── OFFLINE: entrar directo sin verificar con Supabase ──
    if (!navigator.onLine) {
      SESSION = JSON.parse(savedSession);
      SESSION.token = savedToken;
      SB_HEADERS['Authorization'] = 'Bearer ' + savedToken;
      document.getElementById('app-loading').style.display = 'none';
      document.getElementById('pantalla-login').style.display = 'none';
      aplicarPermisos();
      _restaurarDatosLocales();
      renderAnimales(); renderSalud(); renderInsem(); renderPartos(); renderDash(); actualizarBadge(); poblarListasPadresMadres();
      // Cargar logo desde localStorage si existe
      cargarConfigPerfil();
      try {
        const ss=localStorage.getItem('vqa_offline_suscripcion');
        if(ss) {
          SUSCRIPCION=JSON.parse(ss);
          // Verificar que no esté vencida
          if(SUSCRIPCION && SUSCRIPCION.fecha_vencimiento) {
            const venc = new Date(SUSCRIPCION.fecha_vencimiento);
            if(venc > new Date()) {
              MODO_LECTURA = false; // suscripcion valida
            } else {
              SUSCRIPCION = null;
              MODO_LECTURA = true;
            }
          } else if(SUSCRIPCION) {
            MODO_LECTURA = false; // sin fecha = activa
          }
        }
      } catch(e){}
      actualizarBadgePlan();
      setSyncStatus('err','📵 Sin internet');
      const ob=document.getElementById('offline-bar');
      if(ob){ ob.classList.add('show'); ob.textContent='📵 Sin conexión — mostrando datos guardados'; }
      setTimeout(cargarConfigPerfil, 300);
      return;
    }
    try {
      const r = await fetch(SB_URL+'/auth/v1/user', {
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+savedToken}
      });
      if(r.ok) {
        const u = await r.json();
        SESSION = JSON.parse(savedSession);
        SESSION.token = savedToken;
        SB_HEADERS['Authorization'] = 'Bearer ' + savedToken;

        // Cargar rancho_id si falta
        if(!SESSION.rancho_id) {
          const rr = await fetch(SB_URL+'/rest/v1/ranchos?user_id=eq.'+u.id+'&select=*', {headers:SB_HEADERS});
          const ranchos = await rr.json();
          if(Array.isArray(ranchos) && ranchos.length > 0) {
            SESSION.rancho_id    = ranchos[0].id;
            SESSION.rancho_nombre = ranchos[0].nombre;
          } else {
            // Crear rancho automático
            const cr = await fetch(SB_URL+'/rest/v1/ranchos', {
              method:'POST',
              headers:{...SB_HEADERS,'Prefer':'return=representation'},
              body: JSON.stringify({
                user_id: u.id,
                nombre: u.user_metadata?.rancho_nombre || 'Mi Rancho',
                propietario: u.user_metadata?.nombre || u.email
              })
            });
            const cdata = await cr.json();
            if(Array.isArray(cdata) && cdata[0]) {
              SESSION.rancho_id    = cdata[0].id;
              SESSION.rancho_nombre = cdata[0].nombre;
            }
          }
          localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));
        }

        // Refresh user metadata for correct name
        try {
          const freshUser = await fetch(SB_URL+'/auth/v1/user', {headers:{'apikey':SB_KEY,'Authorization':'Bearer '+savedToken}});
          const fu = await freshUser.json();
          if(fu && fu.user_metadata) {
            SESSION.nombre = fu.user_metadata.nombre || fu.user_metadata.full_name || fu.email.split('@')[0];
            SESSION.email  = fu.email;
            localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));
          }
        } catch(e) {}
        document.getElementById('app-loading').style.display = 'none';
        document.getElementById('pantalla-login').style.display = 'none';
        aplicarPermisos();
        recargarTodo();
        cargarSuscripcion();
        guardarPerfilEnDB();
        setTimeout(()=>cargarPerfilDesdeDB(), 800);
    // Al iniciar sesión: vincular config PDF al usuario actual
    try {
      const _uid = SESSION?.user_id || SESSION?.id || '';
      const _owner = localStorage.getItem('vaqueroapp_pdf_owner');
      // Solo borrar si hay un dueño guardado Y es DIFERENTE al usuario actual
      if(_uid && _owner && _owner !== _uid) {
        localStorage.removeItem('vaqueroapp_config_pdf');
      }
      // Siempre marcar como dueño al usuario actual
      if(_uid) localStorage.setItem('vaqueroapp_pdf_owner', _uid);
    } catch(e){}
        return;
      }
    } catch(e){ console.warn('Saved session error:', e); }
    // Token inválido — limpiar
    localStorage.removeItem('vaqueroapp_token');
    localStorage.removeItem('vaqueroapp_session');
    localStorage.removeItem('vaqueroapp_user');
  }

  // 3. Sin sesión — mostrar login
  console.log('Sin sesión activa — mostrando login');
  document.getElementById('app-loading').style.display = 'none';
  document.getElementById('pantalla-login').style.display = 'flex';
})().catch(e => {
  console.error('Init error:', e);
  document.getElementById('app-loading').style.display = 'none';
  document.getElementById('pantalla-login').style.display = 'flex';
});

// FAILSAFE: si en 5 segundos no cargó, mostrar login
setTimeout(() => {
  const loading = document.getElementById('app-loading');
  if(loading && loading.style.display !== 'none') {
    console.warn('Timeout - forzando login');
    loading.style.display = 'none';
    if(!SESSION) document.getElementById('pantalla-login').style.display = 'flex';
  }
}, 1000);
// renderHistorialDocs se llama cuando se navega a esa sección

// ══ PARTOS ══
async function saveParto() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const fecha=v('p-fecha'), madre=v('p-madre').trim();
  if(!fecha||!madre){toast('⚠️ Completa Fecha y Madre (*)');return;}
  setSyncStatus('syncing','🔄 Guardando...');
  const id=Date.now();

  // Verificar toro del banco de semen
  const padreInp = document.getElementById('p-padre');
  const toroID   = padreInp?.dataset?.toroId || '';
  const toroObj  = toroID ? (DB.semen_toros||[]).find(t=>t.ID===toroID) : null;

  const row={
    'ID':String(id),
    'Fecha':fecha,
    'Madre':madre,
    'ArieteCria':v('p-cria'),
    'SexoCria':v('p-sexo'),
    'PesoNacimiento':v('p-peso'),
    'TipoParto':v('p-tipo'),
    'EstadoCria':v('p-estado'),
    'Padre':v('p-padre'),
    'ToroID':toroID,
    'Observaciones':v('p-obs'),
    'FechaRegistro':new Date().toLocaleDateString('es-PE')
  };
  try {
    apiPostFast('insert','partos',row);
    DB.partos.unshift(row);

    // Registrar cría en el contador del toro del banco de semen
    if(toroObj){
      if(!toroObj.Crias) toroObj.Crias = 0;
      toroObj.Crias = (parseInt(toroObj.Crias)||0) + 1;
      apiPostFast('update','semen_toros', toroObj, toroID);
      renderSemen();
      toast(`✅ Parto registrado 🐣 · ${toroObj.Nombre} ahora tiene ${toroObj.Crias} cría(s)`);
    } else {
      toast('✅ Parto registrado 🐣');
    }

    // Actualizar estado madre a Activo
    const m=DB.animales.find(a=>a['Arete']===madre||a['Nombre']===madre);
    if(m&&m['Estado']==='Gestante'){m['Estado']='Activo';await apiPost('update','animales',m,m['ID']);}
    renderPartos(); renderDash();
    closeM('m-parto');
    clearF(['p-fecha','p-madre','p-cria','p-peso','p-obs','p-padre']);
    document.getElementById('p-sexo').value='';
    document.getElementById('p-padre-sel').value='';
    document.getElementById('p-padre').dataset.toroId='';
    document.getElementById('p-padre-stock').style.display='none';
    setSyncStatus('ok','☁ Sincronizado');
  } catch(e){
    console.error('Error parto:',e);
    setSyncStatus('err','❌ Error');
    toast('❌ Error al guardar: '+e.message);
  }
}

function renderPartos() {
  const tbody=document.getElementById('pt-tbody');
  const mob=document.getElementById('mob-partos');
  if(!DB.partos||!DB.partos.length){
    tbody.innerHTML=eRow(9,'🐣','Sin registros de partos');
    if(mob) mob.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">🐣 Sin registros de partos</div>';
    return;
  }
  tbody.innerHTML=DB.partos.map(r=>`<tr>
    <td>${fmt(r['Fecha'])}</td>
    <td><b style="color:var(--accent)">${r['Madre']||''}</b></td>
    <td>${r['ArieteCria']||'—'}</td>
    <td>${r['SexoCria']==='Hembra'?'♀ Hembra':r['SexoCria']==='Macho'?'♂ Macho':'—'}</td>
    <td>${r['PesoNacimiento']?r['PesoNacimiento']+' kg':'—'}</td>
    <td>${r['TipoParto']||'—'}</td>
    <td><span class="badge ${r['EstadoCria']==='Vivo'?'bg-green':'bg-red'}">${r['EstadoCria']||'—'}</span></td>
    <td>${r['Observaciones']||'—'}</td>
    <td><button class="btn btn-danger btn-sm" onclick="delParto('${r['ID']}')">🗑</button></td>
  </tr>`).join('');
  document.getElementById('sp-total').textContent=DB.partos.length;
  document.getElementById('sp-hembras').textContent=DB.partos.filter(p=>p['SexoCria']==='Hembra').length;
  document.getElementById('sp-machos').textContent=DB.partos.filter(p=>p['SexoCria']==='Macho').length;
  // Mobile cards
  if(mob) mob.innerHTML=DB.partos.map(r=>`
    <div class="m-card">
      <div class="m-card-head">
        <div style="font-size:28px">🐣</div>
        <div style="flex:1">
          <div class="m-card-arete">Madre: ${r['Madre']||''}</div>
          <div class="m-card-nombre">${fmt(r['Fecha'])}</div>
        </div>
        <span class="badge ${r['EstadoCria']==='Vivo'?'bg-green':'bg-red'}">${r['EstadoCria']||'—'}</span>
      </div>
      <div class="m-card-body">
        <div class="m-card-field"><span class="m-card-label">Arete Cría</span>${r['ArieteCria']||'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Sexo Cría</span>${r['SexoCria']==='Hembra'?'♀ Hembra':r['SexoCria']==='Macho'?'♂ Macho':'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Peso Nac.</span>${r['PesoNacimiento']?r['PesoNacimiento']+' kg':'—'}</div>
        <div class="m-card-field"><span class="m-card-label">Tipo Parto</span>${r['TipoParto']||'—'}</div>
        ${r['Padre']?`<div class="m-card-field" style="grid-column:1/-1"><span class="m-card-label">Padre</span>${r['Padre']}</div>`:''}
        ${r['Observaciones']?`<div class="m-card-field" style="grid-column:1/-1"><span class="m-card-label">Observaciones</span>${r['Observaciones']}</div>`:''}
      </div>
      <div class="m-card-actions">
        <button class="btn btn-danger btn-sm" onclick="delParto('${r['ID']}')">🗑 Eliminar</button>
      </div>
    </div>`).join('');
}

async function delParto(id) {
  if(!confirm('¿Eliminar este parto?'))return;
  apiPostFast('delete','partos',null,id);
  DB.partos=DB.partos.filter(r=>String(r['ID'])!==String(id));
  renderPartos(); toast('🗑 Eliminado');
}

function fillSelectMadres() {
  const dl=document.getElementById('lista-madres');
  if(!dl) return;
  dl.innerHTML=DB.animales.filter(a=>a['Sexo']==='Hembra')
    .map(a=>`<option value="${a['Arete']}">${a['Arete']}${a['Nombre']?' — '+a['Nombre']:''}</option>`).join('');
}

// ══ REPORTES ══
let _rAno = new Date().getFullYear();
let _rSexo = 'todos';

function setRFiltroSexo(val, btn) {
  _rSexo = val;
  document.querySelectorAll('.r-filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderReportes();
}

function setRAno(ano, btn) {
  _rAno = ano;
  document.querySelectorAll('.r-ano-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderReportes();
}

function renderReportes() {
  const ano = _rAno;
  const mn = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Construir botones de años disponibles (partos + insem + animales)
  const anosSet = new Set();
  anosSet.add(new Date().getFullYear());
  (DB.partos||[]).forEach(p=>{ if(p['Fecha']) anosSet.add(parseInt(p['Fecha'].split('-')[0])); });
  (DB.insem||[]).forEach(i=>{ if(i['Fecha']) anosSet.add(parseInt(i['Fecha'].split('-')[0])); });
  (DB.salud||[]).forEach(s=>{ if(s['Fecha']) anosSet.add(parseInt(s['Fecha'].split('-')[0])); });
  const anos = [...anosSet].filter(Boolean).sort((a,b)=>b-a);
  const anosEl = document.getElementById('r-anos-btns');
  if(anosEl) anosEl.innerHTML = anos.map(a=>`<button class="r-ano-btn${a===ano?' active':''}" onclick="setRAno(${a},this)">${a}</button>`).join('');

  // Filtrar animales por sexo si aplica
  let animales = DB.animales;
  if(_rSexo !== 'todos') animales = animales.filter(a=>a['Sexo']===_rSexo);

  // KPIs
  const activos = animales.filter(a=>a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').length;
  const gestantes = animales.filter(a=>a['Estado']==='Gestante').length;
  const partosAno = (DB.partos||[]).filter(p=>p['Fecha']&&p['Fecha'].startsWith(ano)).length;
  const insemAno = (DB.insem||[]).filter(i=>i['Fecha']&&i['Fecha'].startsWith(ano)).length;
  const vacunasAno = (DB.salud||[]).filter(s=>s['Fecha']&&s['Fecha'].startsWith(ano)).length;
  const bajasAno = animales.filter(a=>(a['Estado']==='Muerto'||a['Estado']==='Vendido')).length;

  document.getElementById('rep-total').textContent = activos;
  document.getElementById('rep-gest').textContent = gestantes;
  document.getElementById('r-partos').textContent = partosAno;
  document.getElementById('r-insem').textContent = insemAno;
  document.getElementById('r-vacunas').textContent = vacunasAno;
  document.getElementById('r-muertos').textContent = bajasAno;
  const lbl = document.getElementById('r-partos-ano-lbl');
  if(lbl) lbl.textContent = ano;

  // Razas
  const razas={};
  animales.forEach(a=>{if(a['Raza'])razas[a['Raza']]=(razas[a['Raza']]||0)+1;});
  document.getElementById('r-razas').innerHTML = barChart(razas,'var(--accent)');

  // Estados
  const estadoColors = {'Activo':'var(--green)','Gestante':'var(--yellow)','Vendido':'var(--blue)','Muerto':'var(--red)'};
  const estados={};
  animales.forEach(a=>{if(a['Estado'])estados[a['Estado']]=(estados[a['Estado']]||0)+1;});
  document.getElementById('r-estados').innerHTML = barChartColor(estados, estadoColors);

  // Partos por mes
  const partosMes = {};
  mn.forEach(m=>partosMes[m]=0);
  (DB.partos||[]).filter(p=>p['Fecha']&&p['Fecha'].startsWith(ano)).forEach(p=>{
    const m=mn[parseInt(p['Fecha'].split('-')[1])-1];
    partosMes[m]=(partosMes[m]||0)+1;
  });
  const hayPartos = Object.values(partosMes).some(v=>v>0);
  document.getElementById('r-partos-mes').innerHTML = hayPartos
    ? barChartTimeline(partosMes,'var(--accent)')
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin partos registrados en '+ano+'</div>';

  // Resultado inseminaciones
  const res={};
  (DB.insem||[]).filter(i=>i['Fecha']&&i['Fecha'].startsWith(ano)).forEach(i=>{if(i['Resultado'])res[i['Resultado']]=(res[i['Resultado']]||0)+1;});
  document.getElementById('r-insem-res').innerHTML = Object.keys(res).length
    ? barChartColor(res,{'Preñada':'var(--green)','No preñada':'var(--red)','Pendiente':'var(--yellow)','Positivo':'var(--green)','Negativo':'var(--red)'})
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin datos de inseminaciones en '+ano+'</div>';

  // Vacunas por tipo
  const vacTipo={};
  (DB.salud||[]).filter(s=>s['Fecha']&&s['Fecha'].startsWith(ano)).forEach(s=>{const t=s['Tipo']||'Otro';vacTipo[t]=(vacTipo[t]||0)+1;});
  document.getElementById('r-vacunas-tipo').innerHTML = Object.keys(vacTipo).length
    ? barChart(vacTipo,'var(--blue)')
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin vacunas registradas en '+ano+'</div>';

  // Distribución por sexo (donut SVG simple)
  const nHembras = DB.animales.filter(a=>a['Sexo']==='Hembra'&&a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').length;
  const nMachos  = DB.animales.filter(a=>a['Sexo']==='Macho'&&a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').length;
  const totalSexo = nHembras + nMachos || 1;
  const pctH = Math.round(nHembras/totalSexo*100);
  const pctM = 100-pctH;
  document.getElementById('r-sexo').innerHTML = `
    <div class="r-donut-wrap">
      <svg width="90" height="90" viewBox="0 0 36 36" style="flex-shrink:0">
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border2)" stroke-width="4"/>
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent)" stroke-width="4"
          stroke-dasharray="${pctH*0.879} ${(100-pctH)*0.879}" stroke-dashoffset="22" stroke-linecap="round"/>
        <circle cx="18" cy="18" r="14" fill="none" stroke="#4a9eed" stroke-width="4"
          stroke-dasharray="${pctM*0.879} ${(100-pctM)*0.879}" stroke-dashoffset="${22-pctH*0.879}" stroke-linecap="round"/>
        <text x="18" y="20" text-anchor="middle" font-size="6" fill="var(--text)" font-weight="bold">${pctH}%♀</text>
      </svg>
      <div class="r-legend">
        <div class="r-legend-item"><div class="r-legend-dot" style="background:var(--accent)"></div><span style="color:var(--text)">♀ Hembras</span><span style="margin-left:auto;font-weight:700;color:var(--accent)">${nHembras}</span></div>
        <div class="r-legend-item"><div class="r-legend-dot" style="background:#4a9eed"></div><span style="color:var(--text)">♂ Machos</span><span style="margin-left:auto;font-weight:700;color:#4a9eed">${nMachos}</span></div>
        <div class="r-legend-item" style="margin-top:4px;padding-top:6px;border-top:1px solid var(--border2)"><span style="color:var(--muted)">Total activos</span><span style="margin-left:auto;font-weight:700;color:var(--text)">${totalSexo}</span></div>
      </div>
    </div>`;

  // Nacimientos por mes
  const nacMes = {};
  mn.forEach(m=>nacMes[m]=0);
  animales.filter(a=>a['Nacimiento']&&a['Nacimiento'].startsWith(ano)).forEach(a=>{
    const m=mn[parseInt(a['Nacimiento'].split('-')[1])-1];
    nacMes[m]=(nacMes[m]||0)+1;
  });
  const hayNac = Object.values(nacMes).some(v=>v>0);
  document.getElementById('r-nacimientos-mes').innerHTML = hayNac
    ? barChartTimeline(nacMes,'#4a9eed')
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin nacimientos registrados en '+ano+'</div>';

  // Top madres
  const madresCount={};
  (DB.partos||[]).forEach(p=>{if(p['Madre'])madresCount[p['Madre']]=(madresCount[p['Madre']]||0)+1;});
  const topMadres = Object.entries(madresCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
  document.getElementById('r-top-madres').innerHTML = topMadres.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:4px">${topMadres.map(([arete,n],i)=>`
        <div style="background:var(--card);border:1px solid var(--border2);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px;min-width:160px;flex:1">
          <div style="font-size:20px">${i===0?'🥇':i===1?'🥈':i===2?'🥉':'🐄'}</div>
          <div>
            <div style="font-weight:700;color:var(--accent);font-size:13px">${arete}</div>
            <div style="font-size:12px;color:var(--muted)">${n} parto${n>1?'s':''}</div>
          </div>
        </div>`).join('')}</div>`
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin datos de partos</div>';

  // Próximas vacunas (30 días)
  const hoy = new Date();
  const en30 = new Date(); en30.setDate(en30.getDate()+30);
  const proxVac = (DB.salud||[]).filter(s=>{
    if(!s['ProximaDosis']) return false;
    const d = new Date(s['ProximaDosis']+'T12:00:00');
    return d >= hoy && d <= en30;
  }).sort((a,b)=>new Date(a['ProximaDosis'])-new Date(b['ProximaDosis']));
  const vencidas = (DB.salud||[]).filter(s=>{
    if(!s['ProximaDosis']) return false;
    return new Date(s['ProximaDosis']+'T12:00:00') < hoy;
  });
  document.getElementById('r-proximas-vacunas').innerHTML = (proxVac.length||vencidas.length)
    ? `${vencidas.length?`<div style="background:rgba(192,57,43,.12);border:1px solid var(--red);border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;color:var(--red)">🚨 <b>${vencidas.length} vacuna${vencidas.length>1?'s':''} vencida${vencidas.length>1?'s':''}</b> — Revisar sección Salud</div>`:''}
      ${proxVac.map(s=>{
        const d = new Date(s['ProximaDosis']+'T12:00:00');
        const dias = Math.ceil((d-hoy)/86400000);
        const urgente = dias<=7;
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border2)">
          <div style="font-size:18px">${urgente?'🔴':'🟡'}</div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--text)">${s['Animal']||'—'}</div>
            <div style="font-size:12px;color:var(--muted)">${s['Descripcion']||s['Tipo']||'—'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:13px;font-weight:700;color:${urgente?'var(--red)':'var(--yellow)'}">${dias}d</div>
            <div style="font-size:11px;color:var(--muted)">${fmt(s['ProximaDosis'])}</div>
          </div>
        </div>`;
      }).join('')}`
    : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">✅ Sin vacunas pendientes en los próximos 30 días</div>';
}

function barChartTimeline(data, color) {
  const entries = Object.entries(data);
  const max = Math.max(...entries.map(e=>e[1]), 1);
  const minW = entries.length * 44;
  return `
  <div style="width:100%;overflow-x:auto;padding-bottom:4px">
    <div style="display:flex;gap:5px;align-items:flex-end;height:110px;min-width:${minW}px;padding:0 4px 22px;position:relative">
      <div style="position:absolute;left:0;right:0;top:0;height:1px;background:var(--border);opacity:.35"></div>
      <div style="position:absolute;left:0;right:0;top:33%;height:1px;background:var(--border);opacity:.25"></div>
      <div style="position:absolute;left:0;right:0;top:66%;height:1px;background:var(--border);opacity:.25"></div>
      ${entries.map(([k,val])=>`
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;position:relative;min-width:30px">
          <div style="font-size:11px;font-weight:800;margin-bottom:3px;line-height:1;color:${val>0?color:'transparent'}">${val>0?val:'0'}</div>
          <div style="width:72%;background:${val>0?`linear-gradient(180deg,${color},${color}99)`:'var(--border)'};border-radius:5px 5px 0 0;height:${Math.max(val/max*68,val>0?5:2)}px;transition:height .6s ease;box-shadow:${val>0?`0 -2px 8px ${color}44`:'none'}"></div>
          <div style="position:absolute;bottom:-19px;font-size:9px;font-weight:${val>0?'700':'400'};color:${val>0?'var(--text2)':'var(--muted)'};">${k}</div>
        </div>`).join('')}
    </div>
  </div>`;
}

function barChartColor(data, colorMap) {
  const defaultColors = ['var(--accent)','var(--blue)','var(--green)','var(--yellow)','var(--red)','#9b59b6'];
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin datos</div>';
  const max = Math.max(...entries.map(e=>e[1]));
  return entries.map(([k,val],i)=>{
    const color = colorMap[k] || defaultColors[i % defaultColors.length];
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:var(--text2)">${k}</span>
        <span style="font-weight:700;color:${color}">${val}</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
        <div style="height:100%;width:${Math.round(val/max*100)}%;background:${color};border-radius:4px;transition:width .6s ease"></div>
      </div>
    </div>`;
  }).join('');
}

function barChart(data,color) {
  const entries=Object.entries(data).sort((a,b)=>b[1]-a[1]);
  if(!entries.length) return '<div style="color:var(--muted);font-size:12px;text-align:center;padding:20px">Sin datos</div>';
  const max=Math.max(...entries.map(e=>e[1]));
  return entries.map(([k,val])=>`
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px">
        <span style="color:var(--text2)">${k}</span>
        <span style="color:var(--accent);font-weight:700">${val}</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:8px;overflow:hidden">
        <div style="height:100%;width:${Math.round(val/max*100)}%;background:${color};border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>`).join('');
}


// ══ FOTO ANIMAL ══
// Comprime imagen antes de subir (máx 800px, calidad 75%)
function comprimirImagen(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      var MAX = 800;
      let w = img.width, h = img.height;
      if(w > h && w > MAX){ h = Math.round(h*MAX/w); w = MAX; }
      else if(h > MAX){ w = Math.round(w*MAX/h); h = MAX; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob || file);
      }, 'image/jpeg', 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function previewPhoto(input) {
  if(!input.files||!input.files[0]) return;
  const file = input.files[0];
  const prev = document.getElementById('a-photo-preview');

  // Mostrar preview local inmediatamente
  const reader = new FileReader();
  reader.onload = e => {
    prev.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
    document.getElementById('a-photo').value = e.target.result;
  };
  reader.readAsDataURL(file);

  // Comprimir y subir a Supabase Storage
  prev.style.opacity = '0.7';
  prev.title = 'Comprimiendo y subiendo...';
  toast('📸 Comprimiendo foto...');
  try {
    const compressed = await comprimirImagen(file);
    const sizeMB = (compressed.size/1024/1024).toFixed(2);
    toast(`📤 Subiendo foto (${sizeMB}MB)...`);
    const token = localStorage.getItem('vaqueroapp_token') || SB_KEY;
    const fileName = `animales/${SESSION?.rancho_id||'r'}/${Date.now()}.jpg`;
    const res = await fetch(`${SB_URL}/storage/v1/object/fotos-animales/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'image/jpeg',
        'x-upsert': 'true'
      },
      body: compressed
    });
    if(res.ok) {
      const publicUrl = `${SB_URL}/storage/v1/object/public/fotos-animales/${fileName}`;
      document.getElementById('a-photo').value = publicUrl;
      prev.innerHTML = `<img src="${publicUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:10px">`;
      prev.title = '✅ Foto en la nube';
      toast('✅ Foto subida — visible en todos los dispositivos');
    } else {
      const err = await res.text();
      console.error('Supabase Storage error:', err);
      toast('⚠️ Sin internet — foto guardada solo en este dispositivo');
    }
  } catch(err) {
    console.error('Storage error:', err);
    toast('⚠️ Sin internet — foto guardada solo en este dispositivo');
  }
  prev.style.opacity = '1';
}

function getAnimalPhoto(animal) {
  return animal['Foto'] || '';
}

// ══ HISTORIAL ══
function renderHistorialCards(lista) {
  const cont = document.getElementById('hist-cards-container');
  if(!lista.length){cont.innerHTML='<div style="color:var(--muted);text-align:center;padding:40px;grid-column:1/-1;font-size:13px">No se encontraron animales</div>';return;}
  cont.innerHTML = lista.map(a => {
    const nSalud = DB.salud.filter(s=>s['Animal']===a['Arete']).length;
    const nInsem = DB.insem.filter(i=>i['Hembra']===a['Arete']).length;
    const nPartos = DB.partos.filter(p=>p['Madre']===a['Arete']).length;
    const foto = a['Foto']||'';
    return `<div class="histo-animal-card" onclick="openHistorialAnimal('${a['ID']}')">
      <div class="histo-animal-photo">${foto?`<img src="${foto}">`:'🐄'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;color:var(--accent);font-size:14px">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}</div>
        <div style="font-size:11px;color:var(--muted)">${a['Raza']||''} | ${a['Sexo']||''}</div>
        <div class="histo-badges" style="margin-top:6px">
          ${nSalud?`<span class="badge" style="background:rgba(74,158,255,.15);color:#4a9eff">💉 ${nSalud} vacuna${nSalud>1?'s':''}</span>`:''}
          ${nInsem?`<span class="badge" style="background:rgba(184,221,60,.15);color:var(--accent)">🔬 ${nInsem} insem.</span>`:''}
          ${nPartos?`<span class="badge" style="background:rgba(240,165,0,.15);color:#f0a500">🐣 ${nPartos} parto${nPartos>1?'s':''}</span>`:''}
          ${!nSalud&&!nInsem&&!nPartos?`<span style="font-size:11px;color:var(--muted)">Sin registros</span>`:''}
        </div>
      </div>
      <span style="color:var(--muted);font-size:18px">›</span>
    </div>`;
  }).join('');
}

function filtrarHistorial(q) {
  const lista = q.length < 1 ? DB.animales :
    DB.animales.filter(a =>
      (a['Arete']||'').toLowerCase().includes(q.toLowerCase()) ||
      (a['Nombre']||'').toLowerCase().includes(q.toLowerCase())
    );
  renderHistorialCards(lista);
}

function openHistorialAnimal(id) {
  const animal = DB.animales.find(a=>String(a['ID'])===String(id));
  if(!animal) return;
  renderHistorialAnimal(animal);
  openM('m-historial-animal');
}

// ══ HISTORIAL DOCUMENTOS ══
function getContadorDoc(tipo) {
  const n = parseInt(localStorage.getItem('vaqueroapp_doc_' + tipo) || '0') + 1;
  localStorage.setItem('vaqueroapp_doc_' + tipo, String(n));
  return String(n).padStart(3, '0');
}

function registrarDocEmitido(tipo, descripcion, numDoc) {
  const historial = JSON.parse(localStorage.getItem('vaqueroapp_historial_docs') || '[]');
  historial.unshift({
    tipo, descripcion, numDoc,
    fecha: new Date().toLocaleDateString('es-PE', {day:'2-digit', month:'2-digit', year:'numeric'}),
    hora: new Date().toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})
  });
  // Máximo 100 registros
  if(historial.length > 100) historial.pop();
  localStorage.setItem('vaqueroapp_historial_docs', JSON.stringify(historial));
  renderHistorialDocs();
}

function renderHistorialDocs() {
  const cont = document.getElementById('historial-docs-lista');
  if(!cont) return;
  const historial = JSON.parse(localStorage.getItem('vaqueroapp_historial_docs') || '[]');
  if(!historial.length) {
    cont.innerHTML = '<div class="empty" style="padding:28px"><div class="empty-e">📄</div><div style="font-size:13px">Aún no se han generado documentos</div></div>';
    return;
  }

  const cfg = {
    ficha:    { icon:'🩺', label:'Ficha Veterinaria',    color:'var(--blue)',    bg:'rgba(74,157,224,.12)',  prefix:'FV' },
    remision: { icon:'📋', label:'Guía de Remisión',     color:'var(--accent)',  bg:'rgba(184,221,60,.12)', prefix:'GR' },
    sanitario:{ icon:'📜', label:'Certificado Sanitario',color:'var(--green)',   bg:'rgba(78,200,122,.12)', prefix:'CS' }
  };

  cont.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;padding:12px">` +
    historial.map(h => {
      const c = cfg[h.tipo] || cfg.ficha;
      return `<div style="
        background:var(--card2);
        border:1px solid var(--border2);
        border-radius:14px;
        padding:14px 16px;
        display:flex;
        flex-direction:column;
        gap:8px;
        border-left:3px solid ${c.color};
        transition:border-color .15s;
      " onmouseover="this.style.borderColor='${c.color}'" onmouseout="this.style.borderLeftColor='${c.color}'">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:${c.bg};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${c.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:${c.color};text-transform:uppercase;letter-spacing:.6px">${c.label}</div>
            <div style="font-size:11px;font-weight:800;color:var(--text2);margin-top:1px">${h.numDoc||'—'}</div>
          </div>
        </div>
        <div style="background:var(--card);border-radius:8px;padding:9px 11px">
          <div style="font-size:12px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📌 ${h.descripcion||'—'}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:var(--muted)">📅 ${h.fecha||'—'}</div>
          <div style="font-size:11px;color:var(--muted)">🕐 ${h.hora||'—'}</div>
        </div>
      </div>`;
    }).join('') + `</div>`;
}

function limpiarHistorialDocs() {
  if(!confirm('¿Limpiar todo el historial de documentos?')) return;
  localStorage.removeItem('vaqueroapp_historial_docs');
  renderHistorialDocs();
  toast('🗑️ Historial limpiado');
}

// Generar ficha directo desde buscar animal (sin pasar por el select)
function generarFichaVetDirecta(id) {
  const animal = DB.animales.find(a=>String(a['ID'])===String(id));
  if(!animal){toast('❌ Animal no encontrado');return;}
  const arete = animal['Arete'];
  const numDoc = 'FV-' + getContadorDoc('fv');

  const vacunas = DB.salud.filter(s=>s['Animal']===arete);
  const insems = DB.insem.filter(i=>i['Hembra']===arete);
  const partosList = DB.partos.filter(p=>p['Madre']===arete);
  const edad = animal['Nacimiento'] ? Math.floor((new Date()-new Date(animal['Nacimiento']))/(365.25*24*3600*1000)) + ' años' : '—';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ficha Veterinaria — ${arete}</title>${docStyles()}</head><body>
  ${docHeader('🩺 FICHA VETERINARIA', `N° ${numDoc} | Arete: ${arete}`)}
  <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-start">
    ${animal['Foto']?`<img src="${animal['Foto']}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:2px solid #c0d8a0;flex-shrink:0">`:''}
    <div class="info-grid" style="flex:1;margin-bottom:0">
      <div class="info-item"><div class="info-label">Arete</div><div class="info-value">${animal['Arete']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Nombre</div><div class="info-value">${animal['Nombre']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Raza</div><div class="info-value">${animal['Raza']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Sexo</div><div class="info-value">${animal['Sexo']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Edad</div><div class="info-value">${edad}</div></div>
      <div class="info-item"><div class="info-label">Peso</div><div class="info-value">${animal['Peso']?animal['Peso']+' kg':'—'}</div></div>
      <div class="info-item"><div class="info-label">Estado</div><div class="info-value"><span class="badge">${animal['Estado']||'—'}</span></div></div>
      <div class="info-item"><div class="info-label">Madre</div><div class="info-value">${animal['Madre']||'—'}</div></div>
    </div>
  </div>
  <div class="section-title">💉 Historial de Vacunas y Tratamientos</div>
  ${vacunas.length?`<table><thead><tr><th>Tipo / Vacuna</th><th>Descripción</th><th>Fecha Aplicación</th><th>Dosis</th><th>Próxima Dosis</th><th>Veterinario</th></tr></thead><tbody>
  ${vacunas.map(v=>`<tr><td><b>${v['Tipo']||'—'}</b></td><td>${v['Descripcion']||'—'}</td><td>${v['FechaAplicacion']?fmt(v['FechaAplicacion']):'—'}</td><td>${v['Dosis']||'—'}</td><td>${v['ProximaDosis']?fmt(v['ProximaDosis']):'—'}</td><td>${v['Veterinario']||'—'}</td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de vacunas</div>'}
  <div class="section-title">🔬 Historial de Inseminaciones</div>
  ${insems.length?`<table><thead><tr><th>Fecha</th><th>Toro / Semen</th><th>Técnica</th><th>Técnico</th><th>Parto Estimado</th><th>Resultado</th></tr></thead><tbody>
  ${insems.map(i=>`<tr><td>${i['Fecha']?fmt(i['Fecha']):'—'}</td><td>${i['ToroSemen']||'—'}</td><td>${i['Tecnica']||'—'}</td><td>${i['Tecnico']||'—'}</td><td>${i['PartoEstimado']?fmt(i['PartoEstimado']):'—'}</td><td><span class="badge">${i['Resultado']||'Pendiente'}</span></td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de inseminación</div>'}
  <div class="section-title">🐣 Historial de Partos</div>
  ${partosList.length?`<table><thead><tr><th>Fecha</th><th>Arete Cría</th><th>Sexo Cría</th><th>Peso Nacimiento</th><th>Tipo Parto</th><th>Estado Cría</th></tr></thead><tbody>
  ${partosList.map(p=>`<tr><td>${p['Fecha']?fmt(p['Fecha']):'—'}</td><td>${p['ArieteCria']||'—'}</td><td>${p['SexoCria']||'—'}</td><td>${p['PesoNacimiento']?p['PesoNacimiento']+' kg':'—'}</td><td>${p['TipoParto']||'—'}</td><td>${p['EstadoCria']||'—'}</td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de partos</div>'}
  ${animal['Observaciones']?`<div class="section-title">📋 Observaciones</div><div style="background:#f4f9ee;border-radius:8px;padding:12px;border:1px solid #d0e8b0;font-size:12px;color:#333">${animal['Observaciones']}</div>`:''}
  <div class="footer">
    <div>📄 ${getCfgEmpresa()} &nbsp;|&nbsp; ${getCfgRUC() ? "RUC: " + getCfgRUC() : ""}<br>Ficha generada el ${new Date().toLocaleDateString('es-PE')}</div>
    <div class="firma-box">Firma del Veterinario<br><br><br>___________________________<br>Nombre y sello</div>
  </div>
  <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#2d6a00;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700">🖨️ Imprimir</button></div>
  </body>`;
  registrarDocEmitido('ficha', `${animal['Arete']} ${animal['Nombre']?'— '+animal['Nombre']:''}`, numDoc);
  abrirVentanaDoc(html);
}

function generarCertDirecto(id) {
  const sel = document.getElementById('cs-animal');
  sel.innerHTML = '<option value="">— Selecciona —</option>' + DB.animales.map(a=>`<option value="${escH(a['ID'])}">${escH(a['Arete'])} ${a['Nombre']?'— '+escH(a['Nombre']):''}</option>`).join('');
  sel.value = id;
  openM('m-cert-sanitario');
}

// ══ DOCUMENTOS ══
function openDocModal(tipo) {
  if(tipo==='ficha') {
    const sel = document.getElementById('fv-animal');
    sel.innerHTML = '<option value="">— Selecciona —</option>' + DB.animales.map(a=>`<option value="${escH(a['ID'])}">${escH(a['Arete'])} ${a['Nombre']?'— '+escH(a['Nombre']):''}</option>`).join('');
    openM('m-ficha-vet');
  } else if(tipo==='remision') {
    const lista = document.getElementById('gr-animales-lista');
    lista.innerHTML = DB.animales.filter(a=>a['Estado']!=='Muerto').map(a=>`
      <label style="display:flex;align-items:flex-start;gap:10px;font-size:13px;cursor:pointer;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--card2);transition:background .15s;word-break:break-word;">
        <input type="checkbox" value="${a['ID']}" style="accent-color:var(--accent);margin-top:2px;flex-shrink:0;width:18px;height:18px;">
        <span style="flex:1;min-width:0;line-height:1.4;">${a['Arete']}${a['Nombre']?' — '+a['Nombre']:''}<br><small style="color:var(--text2);font-size:11px;">${a['Raza']||'—'} · ${a['Sexo']||'—'} · ${a['Peso']?a['Peso']+' kg':'— kg'}</small></span>
      </label>`).join('');
    openM('m-guia-remision');
  } else if(tipo==='sanitario') {
    const sel = document.getElementById('cs-animal');
    sel.innerHTML = '<option value="">— Selecciona —</option>' + DB.animales.map(a=>`<option value="${escH(a['ID'])}">${escH(a['Arete'])} ${a['Nombre']?'— '+escH(a['Nombre']):''}</option>`).join('');
    openM('m-cert-sanitario');
  }
}

function logoHtml() {
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  if(cfg.logo && cfg.logo.length > 500 && cfg.logo.startsWith('data:image')) {
    return '<img src="' + cfg.logo + '" style="height:60px;max-width:120px;object-fit:contain">';
  }
  return '<div style="font-size:48px;line-height:1">&#x1F404;</div>';
}

function docHeader(titulo, subtitulo='') {
  return `
  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #2d6a00;padding-bottom:14px;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div style="display:flex;align-items:center;gap:14px">
      <div id="doc-logo-area">${logoHtml()}</div>
      <div>
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:22px;font-weight:900;color:#1a3d00">${getCfgEmpresa()}</div>
        <div style="font-size:12px;color:#4a6a30;margin-top:2px">VAQUEROAPP · Gestión Ganadera</div>
        ${getCfgRUC() ? `<div style="font-size:11px;color:#4a6a30;margin-top:1px">RUC: ${getCfgRUC()}</div>` : ''}
        ${getCfgDir() ? `<div style="font-size:11px;color:#4a6a30;margin-top:1px">${getCfgDir()}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:700;color:#2d6a00">${titulo}</div>
      ${subtitulo?`<div style="font-size:11px;color:#6a8a50;margin-top:2px">${subtitulo}</div>`:''}
      <div style="font-size:11px;color:#6a8a50;margin-top:4px">Fecha: ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</div>
    </div>
  </div>`;
}

function docStyles() {
  return `
  <style>
    
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Plus Jakarta Sans',sans-serif;color:#111;background:#fff;padding:20px;font-size:13px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
    th{background:#2d6a00;color:#fff;padding:8px 10px;text-align:left;font-size:11px;font-weight:600;letter-spacing:.5px}
    td{padding:7px 10px;border-bottom:1px solid #e0ead0}
    tr:nth-child(even) td{background:#f4f9ee}
    .section-title{font-size:13px;font-weight:700;color:#2d6a00;margin:16px 0 8px;border-left:4px solid #2d6a00;padding-left:10px}
    .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;background:#e8f5d0;color:#2d6a00}
    .info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;margin-bottom:16px}
    .info-item{background:#f4f9ee;border-radius:8px;padding:10px;border:1px solid #d0e8b0}
    .info-label{font-size:10px;color:#6a8a50;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
    .info-value{font-size:14px;font-weight:700;color:#1a3d00;margin-top:3px}
    .footer{margin-top:30px;padding-top:14px;border-top:1px solid #c0d8a0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:10px;font-size:10px;color:#888}
    .firma-box{text-align:center;border-top:1px solid #555;padding-top:6px;min-width:180px;font-size:11px;color:#444}
    @media print{body{padding:10px}button{display:none!important}}
    @media(max-width:600px){.info-grid{grid-template-columns:1fr 1fr}.footer{flex-direction:column}}
  </style>`;
}

function abrirVentanaDoc(html) {
  // docHeader() already contains the header - no need to inject getPDFHeader
  const win = window.open('','_blank','width=850,height=700');
  win.document.write(html);
  win.document.close();
  setTimeout(()=>win.print(), 800);
}

// 🩺 FICHA VETERINARIA
function generarFichaVet() {
  const id = document.getElementById('fv-animal').value;
  if(!id){toast('⚠️ Selecciona un animal');return;}
  const animal = DB.animales.find(a=>String(a['ID'])===String(id));
  if(!animal){toast('❌ Animal no encontrado');return;}
  const arete = animal['Arete'];
  const numDoc = 'FV-' + getContadorDoc('fv');

  const vacunas = DB.salud.filter(s=>s['Animal']===arete);
  const insems = DB.insem.filter(i=>i['Hembra']===arete);
  const partosList = DB.partos.filter(p=>p['Madre']===arete);

  const edad = animal['Nacimiento'] ? Math.floor((new Date()-new Date(animal['Nacimiento']))/(365.25*24*3600*1000)) + ' años' : '—';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ficha Veterinaria — ${arete}</title>${docStyles()}</head><body>
  ${docHeader('🩺 FICHA VETERINARIA', `Arete: ${arete}`)}

  <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap;align-items:flex-start">
    ${animal['Foto']?`<img src="${animal['Foto']}" style="width:100px;height:100px;object-fit:cover;border-radius:10px;border:2px solid #c0d8a0;flex-shrink:0">`:''}
    <div class="info-grid" style="flex:1;margin-bottom:0">
      <div class="info-item"><div class="info-label">Arete</div><div class="info-value">${animal['Arete']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Nombre</div><div class="info-value">${animal['Nombre']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Raza</div><div class="info-value">${animal['Raza']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Sexo</div><div class="info-value">${animal['Sexo']||'—'}</div></div>
      <div class="info-item"><div class="info-label">Edad</div><div class="info-value">${edad}</div></div>
      <div class="info-item"><div class="info-label">Peso</div><div class="info-value">${animal['Peso']?animal['Peso']+' kg':'—'}</div></div>
      <div class="info-item"><div class="info-label">Estado</div><div class="info-value"><span class="badge">${animal['Estado']||'—'}</span></div></div>
      <div class="info-item"><div class="info-label">Madre</div><div class="info-value">${animal['Madre']||'—'}</div></div>
    </div>
  </div>

  <div class="section-title">💉 Historial de Vacunas y Tratamientos</div>
  ${vacunas.length?`<table><thead><tr><th>Tipo / Vacuna</th><th>Descripción</th><th>Fecha Aplicación</th><th>Dosis</th><th>Próxima Dosis</th><th>Veterinario</th></tr></thead><tbody>
  ${vacunas.map(v=>`<tr><td><b>${v['Tipo']||'—'}</b></td><td>${v['Descripcion']||'—'}</td><td>${v['FechaAplicacion']?fmt(v['FechaAplicacion']):'—'}</td><td>${v['Dosis']||'—'}</td><td>${v['ProximaDosis']?fmt(v['ProximaDosis']):'—'}</td><td>${v['Veterinario']||'—'}</td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de vacunas</div>'}

  <div class="section-title">🔬 Historial de Inseminaciones</div>
  ${insems.length?`<table><thead><tr><th>Fecha</th><th>Toro / Semen</th><th>Técnica</th><th>Técnico</th><th>Parto Estimado</th><th>Resultado</th></tr></thead><tbody>
  ${insems.map(i=>`<tr><td>${i['Fecha']?fmt(i['Fecha']):'—'}</td><td>${i['ToroSemen']||'—'}</td><td>${i['Tecnica']||'—'}</td><td>${i['Tecnico']||'—'}</td><td>${i['PartoEstimado']?fmt(i['PartoEstimado']):'—'}</td><td><span class="badge">${i['Resultado']||'Pendiente'}</span></td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de inseminación</div>'}

  <div class="section-title">🐣 Historial de Partos</div>
  ${partosList.length?`<table><thead><tr><th>Fecha</th><th>Arete Cría</th><th>Sexo Cría</th><th>Peso Nacimiento</th><th>Tipo Parto</th><th>Estado Cría</th></tr></thead><tbody>
  ${partosList.map(p=>`<tr><td>${p['Fecha']?fmt(p['Fecha']):'—'}</td><td>${p['ArieteCria']||'—'}</td><td>${p['SexoCria']||'—'}</td><td>${p['PesoNacimiento']?p['PesoNacimiento']+' kg':'—'}</td><td>${p['TipoParto']||'—'}</td><td>${p['EstadoCria']||'—'}</td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de partos</div>'}

  ${animal['Observaciones']?`<div class="section-title">📋 Observaciones</div><div style="background:#f4f9ee;border-radius:8px;padding:12px;border:1px solid #d0e8b0;font-size:12px;color:#333">${animal['Observaciones']}</div>`:''}

  <div class="footer">
    <div>📄 ${getCfgEmpresa()} &nbsp;|&nbsp; ${getCfgRUC() ? "RUC: " + getCfgRUC() : ""}<br>Ficha generada el ${new Date().toLocaleDateString('es-PE')}</div>
    <div class="firma-box">Firma del Veterinario<br><br><br>___________________________<br>Nombre y sello</div>
  </div>
  <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#2d6a00;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700">🖨️ Imprimir</button></div>
  </body></html>`;
  registrarDocEmitido('ficha', `${animal['Arete']} ${animal['Nombre']?'— '+animal['Nombre']:''}`, numDoc);
  closeM('m-ficha-vet');
  abrirVentanaDoc(html);
}

// 📄 GUÍA DE REMISIÓN
function generarGuiaRemision() {
  const destinatario = document.getElementById('gr-destinatario').value.trim();
  const destino = document.getElementById('gr-destino').value.trim();
  if(!destinatario||!destino){toast('⚠️ Completa destinatario y dirección');return;}
  const motivo = document.getElementById('gr-motivo').value || '—';
  const placa = document.getElementById('gr-placa').value || '—';
  const conductor = document.getElementById('gr-conductor').value || '—';
  const checks = document.querySelectorAll('#gr-animales-lista input[type=checkbox]:checked');
  if(!checks.length){toast('⚠️ Selecciona al menos un animal');return;}
  const animalesSelec = Array.from(checks).map(c=>DB.animales.find(a=>String(a['ID'])===String(c.value))).filter(Boolean);

  const numDoc = 'GR-' + getContadorDoc('gr');
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Guía de Remisión ${numDoc}</title>${docStyles()}</head><body>
  ${docHeader('📄 GUÍA DE REMISIÓN', `N° ${numDoc}`)}

  <div class="info-grid">
    <div class="info-item"><div class="info-label">Remitente</div><div class="info-value">${getCfgEmpresa()}<br><span style='font-size:11px;color:#666'>${getCfgRUC() ? 'RUC: '+getCfgRUC() : ''}</span></div></div>
    <div class="info-item"><div class="info-label">Destinatario</div><div class="info-value">${destinatario}</div></div>
    <div class="info-item"><div class="info-label">Dirección destino</div><div class="info-value">${destino}</div></div>
    <div class="info-item"><div class="info-label">Motivo</div><div class="info-value">${motivo}</div></div>
    <div class="info-item"><div class="info-label">Placa vehículo</div><div class="info-value">${placa}</div></div>
    <div class="info-item"><div class="info-label">Conductor</div><div class="info-value">${conductor}</div></div>
    <div class="info-item"><div class="info-label">Fecha de salida</div><div class="info-value">${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</div></div>
    <div class="info-item"><div class="info-label">Total animales</div><div class="info-value" style="color:#2d6a00">${animalesSelec.length}</div></div>
  </div>

  <div class="section-title">🐄 Lista de Animales Trasladados</div>
  <table><thead><tr><th>#</th><th>Arete</th><th>Nombre</th><th>Raza</th><th>Sexo</th><th>Peso (kg)</th><th>Estado</th></tr></thead><tbody>
  ${animalesSelec.map((a,i)=>`<tr><td>${i+1}</td><td><b>${a['Arete']||'—'}</b></td><td>${a['Nombre']||'—'}</td><td>${a['Raza']||'—'}</td><td>${a['Sexo']||'—'}</td><td>${a['Peso']||'—'}</td><td><span class="badge">${a['Estado']||'—'}</span></td></tr>`).join('')}
  </tbody></table>

  <div class="footer" style="margin-top:40px">
    <div class="firma-box">Firma Remitente<br><br><br>___________________________<br>${getCfgEmpresa()}<br><span style='font-size:10px;color:#888'>${getCfgRUC() ? 'RUC: '+getCfgRUC() : ''}</span></div>
    <div style="text-align:center;font-size:10px;color:#aaa">Documento generado el ${new Date().toLocaleDateString('es-PE')}</div>
    <div class="firma-box">Firma Destinatario<br><br><br>___________________________<br>${destinatario}</div>
  </div>
  <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#2d6a00;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700">🖨️ Imprimir</button></div>
  </body></html>`;
  registrarDocEmitido('remision', `${destinatario} — ${animalesSelec.length} animal(es)`, numDoc);
  closeM('m-guia-remision');
  abrirVentanaDoc(html);
}

// 📜 CERTIFICADO SANITARIO
function generarCertSanitario() {
  const id = document.getElementById('cs-animal').value;
  if(!id){toast('⚠️ Selecciona un animal');return;}
  const animal = DB.animales.find(a=>String(a['ID'])===String(id));
  if(!animal){toast('❌ Animal no encontrado');return;}
  const vet = document.getElementById('cs-vet').value || '—';
  const coleg = document.getElementById('cs-colegiatura').value || '—';
  const obs = document.getElementById('cs-obs').value || 'Animal en buen estado de salud, apto para traslado y/o comercialización.';
  const arete = animal['Arete'];

  const vacunasRecientes = DB.salud.filter(s=>s['Animal']===arete).slice(0,5);
  const numDoc = 'CS-' + getContadorDoc('cs');
  const edad = animal['Nacimiento'] ? Math.floor((new Date()-new Date(animal['Nacimiento']))/(365.25*24*3600*1000)) + ' años' : '—';

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Certificado Sanitario ${numDoc}</title>${docStyles()}</head><body>
  ${docHeader('📜 CERTIFICADO SANITARIO', `N° ${numDoc}`)}

  <div style="background:#f0f9e8;border:2px solid #2d6a00;border-radius:10px;padding:14px;margin-bottom:16px;text-align:center">
    <div style="font-size:13px;color:#2d6a00;font-weight:700">CERTIFICO que el siguiente animal ha sido revisado y se encuentra en buen estado sanitario</div>
  </div>

  <div class="section-title">🐄 Datos del Animal</div>
  <div class="info-grid">
    <div class="info-item"><div class="info-label">Arete</div><div class="info-value">${animal['Arete']||'—'}</div></div>
    <div class="info-item"><div class="info-label">Nombre</div><div class="info-value">${animal['Nombre']||'—'}</div></div>
    <div class="info-item"><div class="info-label">Raza</div><div class="info-value">${animal['Raza']||'—'}</div></div>
    <div class="info-item"><div class="info-label">Sexo</div><div class="info-value">${animal['Sexo']||'—'}</div></div>
    <div class="info-item"><div class="info-label">Edad</div><div class="info-value">${edad}</div></div>
    <div class="info-item"><div class="info-label">Peso</div><div class="info-value">${animal['Peso']?animal['Peso']+' kg':'—'}</div></div>
    <div class="info-item"><div class="info-label">Estado</div><div class="info-value"><span class="badge">${animal['Estado']||'—'}</span></div></div>
    <div class="info-item"><div class="info-label">Ganadería</div><div class="info-value">${getCfgEmpresa()}<br><span style='font-size:11px;color:#666'>${getCfgRUC() ? 'RUC: '+getCfgRUC() : ''}</span></div></div>
  </div>

  <div class="section-title">💉 Últimas Vacunas Aplicadas</div>
  ${vacunasRecientes.length?`<table><thead><tr><th>Tipo</th><th>Descripción</th><th>Fecha</th><th>Dosis</th><th>Veterinario</th></tr></thead><tbody>
  ${vacunasRecientes.map(v=>`<tr><td><b>${v['Tipo']||'—'}</b></td><td>${v['Descripcion']||'—'}</td><td>${v['FechaAplicacion']?fmt(v['FechaAplicacion']):'—'}</td><td>${v['Dosis']||'—'}</td><td>${v['Veterinario']||'—'}</td></tr>`).join('')}
  </tbody></table>`:'<div style="color:#888;font-size:12px;padding:8px">Sin registros de vacunas</div>'}

  <div class="section-title">📋 Observaciones del Veterinario</div>
  <div style="background:#f4f9ee;border-radius:8px;padding:12px;border:1px solid #d0e8b0;font-size:12px;color:#333;min-height:50px">${obs}</div>

  <div class="footer" style="margin-top:50px">
    <div>
      <div style="font-size:11px;color:#555">Emitido por: ${getCfgEmpresa()}</div>
      <div style="font-size:11px;color:#555">RUC: ${getCfgRUC()}</div>
      <div style="font-size:11px;color:#555">Fecha: ${new Date().toLocaleDateString('es-PE',{day:'2-digit',month:'long',year:'numeric'})}</div>
      <div style="font-size:11px;color:#555">Documento N°: ${numDoc}</div>
    </div>
    <div class="firma-box">
      Firma del Veterinario<br><br><br>
      ___________________________<br>
      ${vet}<br>
      <span style="font-size:10px;color:#888">Colegiatura: ${coleg}</span>
    </div>
  </div>
  <div style="text-align:center;margin-top:16px"><button onclick="window.print()" style="background:#2d6a00;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;cursor:pointer;font-weight:700">🖨️ Imprimir</button></div>
  </body></html>`;
  registrarDocEmitido('sanitario', `${animal['Arete']} ${animal['Nombre']?'— '+animal['Nombre']:''} | Vet: ${vet}`, numDoc);
  closeM('m-cert-sanitario');
  abrirVentanaDoc(html);
}

function renderHistorialAnimal(animal) {
  const arete = animal['Arete'];
  const eventos = [];

  // Salud
  DB.salud.filter(s=>s['Animal']===arete).forEach(s=>{
    eventos.push({fecha:s['FechaAplicacion']||'',tipo:'💉 Salud/Vacuna',desc:`${s['Tipo']||''} — ${s['Descripcion']||''}`,sub:`Dosis: ${s['Dosis']||'—'} | Próxima: ${s['ProximaDosis']?fmt(s['ProximaDosis']):'—'}`,color:'var(--blue)'});
  });

  // Inseminación
  DB.insem.filter(i=>i['Hembra']===arete).forEach(i=>{
    eventos.push({fecha:i['Fecha']||'',tipo:'🔬 Inseminación',desc:`Toro/Semen: ${i['ToroSemen']||'—'} | Técnica: ${i['Tecnica']||'—'}`,sub:`Resultado: ${i['Resultado']||'Pendiente'} | Parto est.: ${i['PartoEstimado']?fmt(i['PartoEstimado']):'—'}`,color:'var(--accent)'});
  });

  // Partos (como madre)
  DB.partos.filter(p=>p['Madre']===arete).forEach(p=>{
    eventos.push({fecha:p['Fecha']||'',tipo:'🐣 Parto',desc:`Cría: ${p['ArieteCria']||'—'} (${p['SexoCria']||'—'}) | Peso: ${p['PesoNacimiento']?p['PesoNacimiento']+' kg':'—'}`,sub:`Tipo: ${p['TipoParto']||'—'} | Estado cría: ${p['EstadoCria']||'—'}`,color:'var(--green)'});
  });

  // Ordenar por fecha
  eventos.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));

  document.getElementById('m-hist-title').innerHTML = `📅 ${escH(animal['Arete'])} ${animal['Nombre']?'— '+escH(animal['Nombre']):''} <span class="mx" onclick="closeM('m-historial-animal')">×</span>`;
  const modalContent = document.getElementById('m-hist-content');
  const headerHtml = `
    <div style="display:flex;align-items:center;gap:14px;padding:14px">
      <div style="font-size:36px">${animal['Foto']?`<img src="${animal['Foto']}" style="width:52px;height:52px;border-radius:10px;object-fit:cover">` : '🐄'}</div>
      <div>
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;color:var(--accent)">${animal['Arete']} ${animal['Nombre']?'— '+animal['Nombre']:''}</div>
        <div style="font-size:12px;color:var(--muted)">${animal['Raza']||''} | ${animal['Sexo']||''} | <span class="badge ${bCls(animal['Estado'])}">${animal['Estado']||''}</span></div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-size:20px;font-weight:700;color:var(--accent)">${eventos.length}</div>
        <div style="font-size:10px;color:var(--muted)">eventos</div>
      </div>
    </div>`;

  if(!eventos.length) {
    modalContent.innerHTML = headerHtml + '<div style="color:var(--muted);text-align:center;padding:30px;font-size:13px">Sin registros para este animal</div>';
    return;
  }
  const eventsHtml = eventos.map(ev=>`
    <div class="historial-item" style="border-left-color:${ev.color}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span class="historial-tipo">${ev.tipo}</span>
        <span class="historial-fecha">${ev.fecha?fmt(ev.fecha):'—'}</span>
      </div>
      <div class="historial-desc">${ev.desc}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px">${ev.sub}</div>
    </div>`).join('');
  modalContent.innerHTML = headerHtml + eventsHtml;
}

// ══ VACUNACIÓN MASIVA ══
function openVacunaMasiva() {
  // Llenar checklist de animales
  const cl = document.getElementById('animales-checklist');
  const activos = DB.animales.filter(a=>a['Estado']!=='Vendido'&&a['Estado']!=='Muerto');
  cl.innerHTML = activos.map(a=>`
    <div class="animal-check" id="chk-wrap-${a['ID']}" onclick="toggleCheck('${a['ID']}')">
      <input type="checkbox" id="chk-${a['ID']}" onclick="event.stopPropagation();toggleCheck('${a['ID']}')">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--accent)">${a['Arete']} ${a['Nombre']?'— '+a['Nombre']:''}</div>
        <div style="font-size:11px;color:var(--muted)">${a['Raza']||''} | ${a['Sexo']||''}</div>
      </div>
    </div>`).join('');
  updateCheckCount();
  // Fecha por defecto hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('vm-fecha').value = hoy;
  openM('m-vacuna-masiva');
}

function toggleCheck(id) {
  const chk = document.getElementById('chk-'+id);
  const wrap = document.getElementById('chk-wrap-'+id);
  chk.checked = !chk.checked;
  wrap.classList.toggle('selected', chk.checked);
  updateCheckCount();
}

function selectAllAnimales(val) {
  DB.animales.filter(a=>a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').forEach(a=>{
    const chk = document.getElementById('chk-'+a['ID']);
    const wrap = document.getElementById('chk-wrap-'+a['ID']);
    if(chk){chk.checked=val;wrap.classList.toggle('selected',val);}
  });
  updateCheckCount();
}

function updateCheckCount() {
  const n = document.querySelectorAll('#animales-checklist input:checked').length;
  document.getElementById('check-count').textContent = n;
}

async function saveVacunaMasiva() {
  const tipo=v('vm-tipo'),desc=v('vm-desc'),fecha=v('vm-fecha');
  if(!tipo||!desc||!fecha){toast('⚠️ Completa Tipo, Descripción y Fecha');return;}
  const seleccionados = [...document.querySelectorAll('#animales-checklist input:checked')];
  if(!seleccionados.length){toast('⚠️ Selecciona al menos un animal');return;}

  setSyncStatus('syncing','🔄 Registrando '+seleccionados.length+' animales...');
  let count = 0;
  for(const chk of seleccionados) {
    const animalId = chk.id.replace('chk-','');
    const animal = DB.animales.find(a=>String(a['ID'])===String(animalId));
    if(!animal) continue;
    const row = {
      'ID': String(Date.now()+count),
      'Animal': animal['Arete'],
      'Tipo': tipo,
      'Descripcion': desc,
      'Dosis': v('vm-dosis'),
      'FechaAplicacion': fecha,
      'ProximaDosis': v('vm-prox'),
      'Veterinario': v('vm-vet'),
      'Costo': v('vm-costo'),
      'Observaciones': v('vm-obs')
    };
    apiPostFast('insert','salud',row);
    DB.salud.unshift(row);
    count++;
    await new Promise(r=>setTimeout(r,50)); // pequeña pausa entre registros
  }
  renderSalud(); actualizarBadge();
  closeM('m-vacuna-masiva');
  clearF(['vm-tipo','vm-desc','vm-dosis','vm-fecha','vm-prox','vm-vet','vm-costo','vm-obs']);
  selectAllAnimales(false);
  setSyncStatus('ok','☁ Sincronizado');
  toast('✅ '+count+' animales vacunados registrados');
}

// ══ EXPORTAR PDF ══
function exportarPDF() {
  const hoy = new Date().toLocaleDateString('es-PE');
  let html = `<html><head><meta charset='UTF-8'>
  <style>
    body{font-family:Arial,sans-serif;padding:20px;color:#222;}
    h1{color:#5a8a2a;} h2{color:#5a8a2a;border-bottom:2px solid #5a8a2a;padding-bottom:6px;margin-top:24px;}
    table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px;}
    th{background:#1a1d14;color:var(--accent);padding:8px;text-align:left;}
    td{padding:7px 8px;border-bottom:1px solid #eee;}
    tr:nth-child(even){background:#f9f9f9;}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:3px solid #5a8a2a;}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;}
    .stat{background:#f0f7e0;border-radius:8px;padding:12px;text-align:center;}
    .stat-n{font-size:28px;font-weight:700;color:#5a8a2a;}
    .stat-l{font-size:11px;color:#666;}
  
  /* ══ CALENDARIO MEJORADO ══ */
  .cal-day{border-radius:8px;cursor:pointer;display:flex;flex-direction:column;align-items:center;min-height:52px;padding:4px 2px;transition:background .15s;position:relative;}
  .cal-day:hover{background:var(--ag);}
  .cal-day.today{background:var(--ag);border:2px solid var(--accent);}
  .cal-day.has-ev .cal-day-num{color:var(--accent);font-weight:700;}
  .cal-day-num{font-size:13px;font-weight:500;margin-bottom:2px;}
  .cal-day-dots{display:flex;flex-wrap:wrap;gap:1px;justify-content:center;margin-top:1px;max-width:100%;}
  .cal-dot{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
  .cal-event-popup{position:fixed;background:var(--card2);border:1px solid var(--border2);border-radius:12px;padding:14px;min-width:220px;max-width:280px;z-index:600;box-shadow:0 8px 32px rgba(0,0,0,.5);}
  .cal-event-popup h4{font-size:12px;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px;}
  .cal-event-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
  .cal-event-item:last-child{border-bottom:none;}
  .cal-event-item .ev-icon{font-size:16px;flex-shrink:0;}
  .cal-event-item .ev-txt{font-size:12px;color:var(--text2);line-height:1.4;}

  /* ══ HISTORIAL CARDS ══ */
  .histo-animal-card{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:14px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:all .16s;margin-bottom:8px;}
  .histo-animal-card:hover{border-color:var(--accent);background:var(--ag);}
  .histo-animal-photo{width:44px;height:44px;border-radius:10px;object-fit:cover;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;overflow:hidden;}
  .histo-animal-photo img{width:100%;height:100%;object-fit:cover;}
  .histo-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;}

  /* ══ TARJETAS MÓVIL ══ */
  @media(max-width:768px){
    /* Ocultar tablas, mostrar cards */
    .tbl-wrap { display:none !important; }
    .mobile-cards { display:flex !important; flex-direction:column; gap:16px; padding-bottom:20px; }
    /* Dashboard tabla también */
    .dash-tbl-wrap { display:none !important; }
  }
  @media(min-width:769px){
    .mobile-cards { display:none !important; }
    .dash-tbl-wrap { display:block; }
  }

  /* Animal card */
  .m-card{background:var(--card2);border:1px solid var(--border);border-radius:14px;padding:14px;position:relative;}
  .m-card-head{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
  .m-card-arete{font-size:16px;font-weight:700;color:var(--accent);font-family:'Plus Jakarta Sans',sans-serif;}
  .m-card-nombre{font-size:12px;color:var(--muted);}
  .m-card-body{display:grid;grid-template-columns:1fr 1fr;gap:8px 10px;}
  .m-card-field{background:var(--card);border-radius:8px;padding:7px 10px;font-size:13px;color:var(--text);}
  .m-card-label{font-family:'Plus Jakarta Sans',sans-serif;color:var(--accent);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px;opacity:.9;}
  .m-card-actions{display:flex;gap:8px;margin-top:12px;justify-content:flex-end;}
  .m-card-photo{width:46px;height:46px;border-radius:10px;object-fit:cover;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;overflow:hidden;}
  .m-card-photo img{width:100%;height:100%;object-fit:cover;}

  /* LOGIN */
  #login-screen{position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;}
  .login-box{background:var(--card2);border:1px solid var(--border2);border-radius:20px;padding:36px 32px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,.7);}
  .login-logo{font-size:52px;text-align:center;margin-bottom:6px;}
  .login-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:26px;text-align:center;margin-bottom:4px;}
  .login-title em{color:var(--accent);font-style:normal;}
  .login-sub{text-align:center;color:var(--muted);font-size:12px;margin-bottom:24px;}
  .login-field{margin-bottom:14px;}
  .login-label{font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px;}
  .login-input{width:100%;background:var(--bg);border:1px solid var(--border);border-radius:10px;color:var(--text);padding:13px 16px;font-size:16px;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .18s;}
  .login-input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--ag);}
  .login-btn{width:100%;padding:14px;background:var(--accent);color:#080c07;border:none;border-radius:10px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;margin-top:8px;}
  .login-error{background:rgba(224,90,74,.15);border:1px solid var(--red);border-radius:8px;padding:10px;font-size:12px;color:var(--red);text-align:center;margin-top:12px;display:none;}
  .user-badge{background:var(--ag);border:1px solid var(--accent);border-radius:5px;padding:1px 7px;font-size:9px;font-weight:700;color:var(--accent);letter-spacing:.6px;text-transform:uppercase;}
  .logout-btn{background:none;border:1px solid var(--border2);border-radius:8px;color:var(--muted);padding:7px 12px;font-size:11px;cursor:pointer;width:100%;margin-top:8px;transition:all .18s;font-family:'Plus Jakarta Sans',sans-serif;}
  .logout-btn:hover{border-color:var(--red);color:var(--red);}
  /* GASTOS */
  .gasto-card{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:13px 15px;display:flex;align-items:center;gap:13px;margin-bottom:9px;}
  .gasto-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
  .gi-bg{background:rgba(78,200,122,.15);}
  .gg-bg{background:rgba(224,90,74,.15);}
  .gasto-info{flex:1;min-width:0;}
  .gasto-desc{font-size:13px;font-weight:600;color:var(--text);}
  .gasto-meta{font-size:11px;color:var(--muted);margin-top:2px;}
  .gasto-monto{font-size:15px;font-weight:700;flex-shrink:0;text-align:right;}
  .g-ing{color:var(--green);}
  .g-gas{color:var(--red);}
  .resumen-fin{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
  .res-card{background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
  .res-valor{font-size:17px;font-weight:700;margin-bottom:4px;}
  .res-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;}

</style></head><body>
  <div class="header">
    <div><h1>🐄 VaqueroApp</h1><div style="color:#666;font-size:13px">Sistema de Ganadería</div></div>
    <div style="text-align:right;color:#666;font-size:12px">Reporte generado: ${hoy}</div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-n">${DB.animales.filter(a=>a['Estado']!=='Vendido'&&a['Estado']!=='Muerto').length}</div><div class="stat-l">Total Animales</div></div>
    <div class="stat"><div class="stat-n">${DB.animales.filter(a=>a['Estado']==='Gestante').length}</div><div class="stat-l">Gestantes</div></div>
    <div class="stat"><div class="stat-n">${DB.partos.filter(p=>p['Fecha']&&p['Fecha'].startsWith(new Date().getFullYear())).length}</div><div class="stat-l">Partos este año</div></div>
    <div class="stat"><div class="stat-n">${DB.salud.length}</div><div class="stat-l">Registros Salud</div></div>
  </div>
  <h2>Registro de Animales</h2>
  <table><thead><tr><th>Arete</th><th>Nombre</th><th>Raza</th><th>Sexo</th><th>Estado</th><th>Nacimiento</th></tr></thead><tbody>
  ${DB.animales.map(a=>`<tr><td><b>${a['Arete']||''}</b></td><td>${a['Nombre']||'—'}</td><td>${a['Raza']||''}</td><td>${a['Sexo']||''}</td><td>${a['Estado']||''}</td><td>${fmt(a['Nacimiento'])}</td></tr>`).join('')}
  </tbody></table>
  <h2>Registro de Partos</h2>
  <table><thead><tr><th>Fecha</th><th>Madre</th><th>Arete Cría</th><th>Sexo</th><th>Peso</th><th>Tipo</th></tr></thead><tbody>
  ${DB.partos.map(p=>`<tr><td>${fmt(p['Fecha'])}</td><td><b>${p['Madre']||''}</b></td><td>${p['ArieteCria']||'—'}</td><td>${p['SexoCria']||'—'}</td><td>${p['PesoNacimiento']?p['PesoNacimiento']+' kg':'—'}</td><td>${p['TipoParto']||'—'}</td></tr>`).join('')}
  </tbody></table>
  <h2>Salud & Vacunas</h2>
  <table><thead><tr><th>Animal</th><th>Tipo</th><th>Descripción</th><th>Fecha</th><th>Próxima</th></tr></thead><tbody>
  ${DB.salud.map(s=>`<tr><td><b>${s['Animal']||''}</b></td><td>${s['Tipo']||''}</td><td>${s['Descripcion']||''}</td><td>${fmt(s['FechaAplicacion'])}</td><td>${s['ProximaDosis']?fmt(s['ProximaDosis']):'—'}</td></tr>`).join('')}
  </tbody></table>
  
<!-- Modal Gasto -->
<div class="overlay" id="m-gasto">
  <div class="modal" style="max-width:480px">
    <div class="modal-head">💰 Registrar Movimiento <span class="mx" onclick="closeM('m-gasto')">×</span></div>
    <div class="fg">
      <div class="f"><label>Tipo *</label>
        <select id="gasto-tipo">
          <option value="">Seleccionar...</option>
          <optgroup label="💹 Ingresos">
            <option>Venta de animal</option><option>Otro ingreso</option>
          </optgroup>
          <optgroup label="🔴 Gastos">
            <option>Medicamentos/Vacunas</option><option>Alimentación/Insumos</option><option>Otro gasto</option>
          </optgroup>
        </select>
      </div>
      <div class="f"><label>Descripción *</label><input id="gasto-desc" placeholder="ej. Venta novillo 45JP, Ivermectina 120ml..."></div>
      <div class="f"><label>Monto (S/) *</label><input type="number" id="gasto-monto" placeholder="0.00" step="0.01" min="0"></div>
      <div class="f"><label>Fecha *</label><input type="date" id="gasto-fecha"></div>
      <div class="f"><label>Animal relacionado</label><select id="gasto-animal"><option value="">Ninguno</option></select></div>
      <div class="f fgf"><label>Observaciones</label><textarea id="gasto-obs" rows="2"></textarea></div>
    </div>
    <div class="modal-foot">
      <button class="btn btn-ghost" onclick="closeM('m-gasto')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveGasto()">💾 Guardar</button>
    </div>
  </div>
</div>

</body></html>`;

  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
  w.print();
}

function exportarExcel() {
  let csv = 'REPORTE VAQUEROAPP\n\n';
  csv += 'ANIMALES\n';
  csv += 'ID,Arete,Nombre,Raza,Sexo,Nacimiento,Peso,Estado,Madre,Observaciones\n';
  DB.animales.forEach(a=>{
    csv += `"${a['ID']||''}","${a['Arete']||''}","${a['Nombre']||''}","${a['Raza']||''}","${a['Sexo']||''}","${a['Nacimiento']||''}","${a['Peso']||''}","${a['Estado']||''}","${a['Madre']||''}","${a['Observaciones']||''}"\n`;
  });
  csv += '\nPARTOS\n';
  csv += 'ID,Fecha,Madre,ArieteCria,SexoCria,PesoNacimiento,TipoParto,EstadoCria\n';
  DB.partos.forEach(p=>{
    csv += `"${p['ID']||''}","${p['Fecha']||''}","${p['Madre']||''}","${p['ArieteCria']||''}","${p['SexoCria']||''}","${p['PesoNacimiento']||''}","${p['TipoParto']||''}","${p['EstadoCria']||''}"\n`;
  });
  csv += '\nSALUD & VACUNAS\n';
  csv += 'ID,Animal,Tipo,Descripcion,Dosis,FechaAplicacion,ProximaDosis,Veterinario,Costo\n';
  DB.salud.forEach(s=>{
    csv += `"${s['ID']||''}","${s['Animal']||''}","${s['Tipo']||''}","${s['Descripcion']||''}","${s['Dosis']||''}","${s['FechaAplicacion']||''}","${s['ProximaDosis']||''}","${s['Veterinario']||''}","${s['Costo']||''}"\n`;
  });

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VaqueroApp_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('✅ Archivo descargado');
}


// ══════════════════════════════════════════
// VAQUEROAPP — AUTH con Supabase
// ══════════════════════════════════════════


// ── Tab switcher ──
function switchAuthTab(tab) {
  document.getElementById('tab-login').style.display    = tab==='login'    ? 'block' : 'none';
  document.getElementById('tab-registro').style.display = tab==='registro' ? 'block' : 'none';
  document.getElementById('tab-login').style.background    = tab==='login'    ? 'var(--accent)' : 'transparent';
  document.getElementById('tab-login').style.color         = tab==='login'    ? '#080c07' : 'var(--muted)';
  document.getElementById('tab-registro').style.background      = tab==='registro' ? 'var(--accent)' : 'transparent';
  document.getElementById('tab-registro').style.color           = tab==='registro' ? '#080c07' : 'var(--muted)';
  document.getElementById('al-login-msg').style.display = 'none';
  document.getElementById('login-success').style.display = 'none';
}

// ── LOGIN con email/pass ──
async function doLogin() {
  if(!checkLoginAttempts()) return;
  const emailRaw=document.getElementById('email-login').value.trim();
  const pass=document.getElementById('pass-login').value;
  const btn=document.querySelector('#tab-login .login-btn')||document.getElementById('btn-ingresar');
  const email=sanitizeEmail(emailRaw);
  if(!email){showAuthError('Correo electrónico inválido');return;}
  if(!pass||pass.length<6){showAuthError('Contraseña muy corta');return;}
  if(pass.length>128){showAuthError('Contraseña demasiado larga');return;}
  btn.textContent='Ingresando...';btn.disabled=true;
  if (!navigator.onLine) {
    const savedSession=localStorage.getItem('vaqueroapp_session');
    const savedToken=localStorage.getItem('vaqueroapp_token');
    if(savedSession && savedToken) {
      const s=JSON.parse(savedSession);
      if(s.email && s.email.toLowerCase()===email.toLowerCase()) {
        SESSION=s; SESSION.token=savedToken;
        SB_HEADERS['Authorization']='Bearer '+savedToken;
        document.getElementById('pantalla-login').style.display='none';
      const pDash = document.getElementById('pantalla-dash');
      if(pDash) pDash.style.display='flex';
      document.body.style.overflow='hidden';
      if(document.getElementById('d-nombre')) document.getElementById('d-nombre').textContent = SESSION.nombre||SESSION.email||'Usuario';
      if(document.getElementById('d-rancho')) document.getElementById('d-rancho').textContent = SESSION.rancho_nombre||'Mi Rancho';
        aplicarPermisos(); _restaurarDatosLocales();
        renderAnimales(); renderSalud(); renderInsem(); renderPartos(); renderDash(); actualizarBadge(); poblarListasPadresMadres();
        setTimeout(()=>cargarPerfilDesdeDB(), 600);
        try {
          const ss=localStorage.getItem('vqa_offline_suscripcion');
          if(ss) {
            SUSCRIPCION=JSON.parse(ss);
            if(SUSCRIPCION && SUSCRIPCION.fecha_vencimiento) {
              MODO_LECTURA = new Date(SUSCRIPCION.fecha_vencimiento) <= new Date();
              if(MODO_LECTURA) SUSCRIPCION = null;
            } else if(SUSCRIPCION) { MODO_LECTURA = false; }
          }
        } catch(e){}
        actualizarBadgePlan();
        setSyncStatus('err','📵 Sin internet');
        const ob=document.getElementById('offline-bar');
        if(ob){ob.classList.add('show');ob.textContent='📵 Sin conexión — datos guardados localmente';}
        toast('✅ Sesión restaurada (modo offline)');
        btn.textContent='Ingresar →'; btn.disabled=false; return;
      } else { showAuthError('Sin internet. Solo puedes usar la cuenta: '+(s.email||'')); btn.textContent='Ingresar →'; btn.disabled=false; return; }
    } else { showAuthError('Sin internet y sin sesión guardada. Conéctate al menos una vez primero.'); btn.textContent='Ingresar →'; btn.disabled=false; return; }
  }
  try {
    const res=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{
      method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json','Authorization':'Bearer ' + SB_KEY},
      body:JSON.stringify({email,password:pass})
    });
    const data=await res.json();
    if(!res.ok){registrarIntento(false);throw new Error(data.error_description||data.message||'Correo o contraseña incorrectos');}
    registrarIntento(true);
    await _iniciarSesionInterna(data.access_token,data.user);
  } catch(e){showAuthError(e.message);btn.textContent='Ingresar →';btn.disabled=false;}
}

// ── REGISTRO ──
async function doRegistro() {
  const rancho = document.getElementById('reg-rancho').value.trim();
  const nombre = document.getElementById('reg-nombre').value.trim();
  const email  = document.getElementById('reg-email').value.trim();
  const pass   = document.getElementById('reg-pass').value;
  const pass2  = document.getElementById('reg-pass2').value;
  if(!rancho||!nombre||!email||!pass){ showAuthError('Completa todos los campos'); return; }
  if(pass !== pass2){ showAuthError('Las contraseñas no coinciden'); return; }
  if(pass.length < 6){ showAuthError('La contraseña debe tener al menos 6 caracteres'); return; }
  const btn = document.querySelector('#tab-registro .login-btn')||document.getElementById('btn-registro');
  btn.textContent = 'Creando cuenta...'; btn.disabled = true;
  try {
    // 1. Crear usuario en Supabase Auth
    const res = await fetch(`${SB_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
      body: JSON.stringify({ email, password: pass, data: { nombre, rancho_nombre: rancho } })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error_description || data.msg || 'Error al registrar');
    // 2. Mostrar mensaje de éxito
    document.getElementById('login-success').style.display = 'block';
    document.getElementById('login-success').textContent = '✅ ¡Cuenta creada! Revisa tu correo para confirmar tu cuenta, luego ingresa.';
    btn.textContent = 'Crear cuenta →'; btn.disabled = false;
    setTimeout(() => switchAuthTab('login'), 3000);
  } catch(e) {
    showAuthError(e.message);
    btn.textContent = 'Crear cuenta →'; btn.disabled = false;
  }
}

// ── LOGIN con Google ──
function loginGoogle() {
  // Usar URL base sin hash ni query params
  const base = window.location.origin + window.location.pathname;
  const redirectTo = encodeURIComponent(base);
  window.location.href = SB_URL + '/auth/v1/authorize?provider=google&redirect_to=' + redirectTo;
}


// ── MONKEY PASSWORD TOGGLE ──
function togglePassMonkey(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if(!inp || !btn) return;
  if(inp.type === 'password') {
    inp.type = 'text';
    btn.classList.remove('monkey-open');
    btn.classList.add('monkey-closed');
  } else {
    inp.type = 'password';
    btn.classList.remove('monkey-closed');
    btn.classList.add('monkey-open');
  }
}

// ── Recuperar contraseña ──
async function showForgotPass() {
  const email = prompt('Ingresa tu correo electrónico:');
  if(!email) return;
  const redirectTo = window.location.origin + window.location.pathname;
  await fetch(`${SB_URL}/auth/v1/recover`, {
    method: 'POST',
    headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SB_KEY },
    body: JSON.stringify({ email, redirectTo })
  });
  toast('📧 Revisa tu correo para restablecer tu contraseña');
}

// ── Pantalla Restablecer Contraseña ──
function mostrarPantallaResetPass(token) {
  // Crear overlay de reset
  const overlay = document.createElement('div');
  overlay.id = 'reset-pass-screen';
  overlay.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background-image:radial-gradient(ellipse at 30% 60%,rgba(198,241,53,.07) 0%,transparent 55%)';
  overlay.innerHTML = `
    <div style="background:linear-gradient(145deg,var(--card2),var(--card));border:1px solid var(--border2);border-radius:24px;padding:38px 34px;max-width:400px;width:100%;box-shadow:0 32px 80px rgba(0,0,0,.7)">
      <div style="text-align:center;margin-bottom:28px">
        <div style="font-size:52px;margin-bottom:10px">🔐</div>
        <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:24px;font-weight:800;color:var(--accent);letter-spacing:-.5px">Nueva Contraseña</div>
        <div style="font-size:12px;color:var(--muted);margin-top:6px">Ingresa tu nueva contraseña para VaqueroApp</div>
      </div>
      <div style="margin-bottom:16px">
        <label style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1.8px;display:block;margin-bottom:7px;font-family:'Plus Jakarta Sans',sans-serif">Nueva contraseña</label>
        <input id="reset-pass-1" type="password" placeholder="Mínimo 6 caracteres" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);padding:13px 16px;font-size:15px;font-family:'Plus Jakarta Sans',sans-serif;outline:none">
      </div>
      <div style="margin-bottom:22px">
        <label style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1.8px;display:block;margin-bottom:7px;font-family:'Plus Jakarta Sans',sans-serif">Confirmar contraseña</label>
        <input id="reset-pass-2" type="password" placeholder="Repetir contraseña" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);padding:13px 16px;font-size:15px;font-family:'Plus Jakarta Sans',sans-serif;outline:none">
      </div>
      <div id="reset-pass-error" style="display:none;background:rgba(240,97,77,.12);border:1px solid var(--red);border-radius:10px;padding:10px;font-size:12px;color:var(--red);text-align:center;margin-bottom:14px"></div>
      <button onclick="guardarNuevaPass('${token}')" style="width:100%;padding:15px;background:linear-gradient(135deg,var(--accent),#9bc400);color:#080c07;border:none;border-radius:12px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s">
        Guardar nueva contraseña →
      </button>
    </div>`;
  document.body.appendChild(overlay);
}

async function guardarNuevaPass(token) {
  const p1 = document.getElementById('reset-pass-1').value;
  const p2 = document.getElementById('reset-pass-2').value;
  const err = document.getElementById('reset-pass-error');
  err.style.display = 'none';

  if(!p1 || p1.length < 6) {
    err.textContent = 'La contraseña debe tener al menos 6 caracteres';
    err.style.display = 'block'; return;
  }
  if(p1 !== p2) {
    err.textContent = 'Las contraseñas no coinciden';
    err.style.display = 'block'; return;
  }

  try {
    let accessToken = token;

    // Si es un TokenHash (viene de ?token=...) hay que verificarlo primero para obtener el access_token
    if(token.length < 100) {
      const verifyRes = await fetch(SB_URL+'/auth/v1/verify', {
        method: 'POST',
        headers: { 'apikey': SB_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ token_hash: token, type: 'recovery' })
      });
      const verifyData = await verifyRes.json();
      if(verifyData.access_token) {
        accessToken = verifyData.access_token;
      } else {
        err.textContent = verifyData.msg || verifyData.message || 'Token inválido o expirado. Solicita un nuevo link.';
        err.style.display = 'block'; return;
      }
    }

    // Ahora actualizar la contraseña con el access_token válido
    const res = await fetch(SB_URL+'/auth/v1/user', {
      method: 'PUT',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer '+accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: p1 })
    });
    const data = await res.json();
    if(data.id) {
      document.getElementById('reset-pass-screen').remove();
      toast('✅ Contraseña actualizada correctamente');
      setTimeout(()=>{ document.getElementById('pantalla-login').style.display = 'flex'; }, 1200);
    } else {
      err.textContent = data.msg || data.message || 'Error al actualizar. Intenta de nuevo.';
      err.style.display = 'block';
    }
  } catch(e) {
    err.textContent = 'Error de conexión. Intenta de nuevo.';
    err.style.display = 'block';
  }
}

// ── Iniciar sesión tras autenticar ──
async function _iniciarSesionInterna(token, user) {
  // Guardar token
  localStorage.setItem('vaqueroapp_token', token);
  localStorage.setItem('vaqueroapp_user', JSON.stringify(user));
  
  // Obtener perfil del rancho
  const sbH = { ...SB_HEADERS, 'Authorization': 'Bearer ' + token };
  let ranchoData = null;
  try {
    const rRes = await fetch(`${SB_URL}/rest/v1/ranchos?user_id=eq.${user.id}&select=*`, { headers: sbH });
    const ranchos = await rRes.json();
    if(Array.isArray(ranchos) && ranchos.length > 0) {
      ranchoData = ranchos[0];
    } else {
      // Crear rancho automáticamente si es nuevo usuario
      const nombre_rancho = user.user_metadata?.rancho_nombre || user.user_metadata?.full_name || 'Mi Rancho';
      const propietario = user.user_metadata?.nombre || user.user_metadata?.full_name || user.email;
      const cRes = await fetch(`${SB_URL}/rest/v1/ranchos`, {
        method: 'POST',
        headers: { ...sbH, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ user_id: user.id, nombre: nombre_rancho, propietario })
      });
      const created = await cRes.json();
      ranchoData = Array.isArray(created) ? created[0] : created;
      if(!ranchoData?.id) ranchoData = { id: user.id, nombre: nombre_rancho };
    }
  } catch(e) {
    console.error('Error creando rancho:', e);
    ranchoData = { id: user.id, nombre: 'Mi Rancho' };
  }

  SESSION = {
    user_id: user.id,
    email: user.email,
    nombre: user.user_metadata?.nombre || user.email,
    rancho_id: ranchoData?.id || user.id,
    rancho_nombre: ranchoData?.nombre || 'Mi Rancho',
    rol: ranchoData?.rol || 'admin',
    token
  };
  localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));

  // Limpiar TODOS los datos del rancho anterior para no mezclar datos entre cuentas
  limpiarCacheDatos();

  // Actualizar SB_HEADERS con token del usuario
  SB_HEADERS['Authorization'] = 'Bearer ' + token;

  // ── Verificar si tiene suscripción; si no, crear Trial automáticamente ──
  try {
    const susRes = await fetch(SB_URL + '/rest/v1/suscripciones?user_id=eq.' + user.id +
      '&estado=eq.activo&order=fecha_vencimiento.desc&limit=1', { headers: SB_HEADERS });
    const susData = await susRes.json();
    const tieneSus = Array.isArray(susData) && susData.length > 0 &&
      new Date(susData[0].fecha_vencimiento) > new Date();
    if(!tieneSus) {
      // Crear plan Trial de 7 días y 5 animales
      const hoy = new Date();
      const venc = new Date(hoy);
      venc.setDate(venc.getDate() + 7);
      const trialBody = {
        user_id: user.id,
        plan: 'trial',
        estado: 'activo',
        limite_animales: 5,
        fecha_inicio: hoy.toISOString().split('T')[0],
        fecha_vencimiento: venc.toISOString().split('T')[0]
      };
      const trialRes = await fetch(SB_URL + '/rest/v1/suscripciones', {
        method: 'POST',
        headers: { ...SB_HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify(trialBody)
      });
      const trialCreada = await trialRes.json();
      const sus = Array.isArray(trialCreada) ? trialCreada[0] : trialCreada;
      if(sus?.id) {
        SUSCRIPCION = sus;
        localStorage.setItem('vqa_offline_suscripcion', JSON.stringify(SUSCRIPCION));
      }
    } else {
      SUSCRIPCION = susData[0];
      localStorage.setItem('vqa_offline_suscripcion', JSON.stringify(SUSCRIPCION));
    }
  } catch(e) {
    console.warn('No se pudo verificar/crear suscripción Trial:', e.message);
  }

  document.getElementById('pantalla-login').style.display = 'none';
  aplicarPermisos();
  recargarTodo();
  // Iniciar notificaciones push después de cargar datos
  setTimeout(() => {
    initPushNotifications();
    setTimeout(() => {
      checkNotificacionesLocales();
      mostrarBadgeNotificaciones();
    }, 3000);
  }, 1500);
}

// ── Verificar sesión guardada ──
async function checkSession() {
  const saved = localStorage.getItem('vaqueroapp_session');
  const token = localStorage.getItem('vaqueroapp_token');
  if(!saved || !token) return false;
  try {
    SESSION = JSON.parse(saved);
    SB_HEADERS['Authorization'] = 'Bearer ' + token;
    // Verificar token con Supabase
    const res = await fetch(SB_URL + '/auth/v1/user', {
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + token }
    });
    if(!res.ok) { doLogout(); return false; }
    const userData = await res.json();

    // Limpiar suscripción cacheada si no pertenece al usuario actual
    try {
      const cachedSus = JSON.parse(localStorage.getItem('vqa_offline_suscripcion') || 'null');
      if(cachedSus && cachedSus.user_id && cachedSus.user_id !== userData.id) {
        localStorage.removeItem('vqa_offline_suscripcion');
        SUSCRIPCION = null;
      }
    } catch(e) {}


    if(!SESSION.rancho_id && userData.id) {
      const rRes = await fetch(SB_URL + '/rest/v1/ranchos?user_id=eq.' + userData.id + '&select=*', {
        headers: SB_HEADERS
      });
      const ranchos = await rRes.json();
      if(Array.isArray(ranchos) && ranchos.length > 0) {
        SESSION.rancho_id = ranchos[0].id;
        SESSION.rancho_nombre = ranchos[0].nombre;
        localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));
      } else {
        // Crear rancho si no existe
        const nombre_rancho = userData.user_metadata?.rancho_nombre || 'Mi Rancho';
        const cRes = await fetch(SB_URL + '/rest/v1/ranchos', {
          method: 'POST',
          headers: { ...SB_HEADERS, 'Prefer': 'return=representation' },
          body: JSON.stringify({ user_id: userData.id, nombre: nombre_rancho, propietario: userData.user_metadata?.nombre || userData.email })
        });
        const created = await cRes.json();
        if(Array.isArray(created) && created[0]) {
          SESSION.rancho_id = created[0].id;
          SESSION.rancho_nombre = created[0].nombre;
          localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));
        }
      }
    }
    return true;
  } catch(e) { console.error('checkSession error:', e); return false; }
}

function doLogout() {
  limpiarCacheDatos();
  localStorage.removeItem('vaqueroapp_session');
  localStorage.removeItem('vaqueroapp_token');
  localStorage.removeItem('vaqueroapp_user');
  SESSION = null;
  location.reload();
}

function showAuthError(msg) {
  const el = document.getElementById('al-login-msg');
  el.textContent = '❌ ' + msg;
  el.style.display = 'block';
}

// Roles y permisos (ahora basado en rol del rancho)


function puedeEliminar() { return SESSION && PERMISOS[SESSION.rol]?.eliminar; }
function puedeVerGastos() { return SESSION && PERMISOS[SESSION.rol]?.gastos; }

function aplicarPermisos() {
  if(!SESSION) return;
  const el = document.getElementById('user-name');
  const badge = document.getElementById('user-rol');
  // Mostrar nombre o parte del email
  const displayName = (SESSION.nombre && SESSION.nombre.length > 1 && SESSION.nombre !== SESSION.email)
    ? SESSION.nombre
    : (SESSION.email ? SESSION.email.split('@')[0] : 'Usuario');
  if(el) el.textContent = displayName;
  if(badge) { badge.textContent = SESSION.rol || 'admin'; badge.style.display='inline-block'; }
  // Mostrar nombre del rancho en sidebar
  const logoName = document.querySelector('.logo-name');
  if(logoName) logoName.textContent = SESSION.rancho_nombre || 'Mi Rancho';
  const sidebarRancho = document.getElementById('sidebar-rancho-nombre');
  if(sidebarRancho) sidebarRancho.textContent = SESSION.rancho_nombre || 'Mi Rancho';
  const secciones = SECCIONES_ROL[SESSION.rol || 'admin'] || SECCIONES_ROL['admin'];
  document.querySelectorAll('.nav-item[data-section]').forEach(item => {
    const sec = item.getAttribute('data-section');
    item.style.display = secciones.includes(sec) ? '' : 'none';
  });
  const adminLink = document.getElementById('admin-config-link');
  if(adminLink) adminLink.style.display = (SESSION.rol==='admin') ? 'block' : 'none';
  initActivityMonitor();
}

// ══ GASTOS ══
var TIPOS_INGRESO = ['Venta de animal','Otro ingreso'];

function openGasto() {
  document.getElementById('gasto-fecha').value = new Date().toISOString().split('T')[0];
  fillGastoAnimales();
  openM('m-gasto');
}

function fillGastoAnimales() {
  const sel = document.getElementById('gasto-animal');
  if(!sel) return;
  sel.innerHTML = '<option value="">Ninguno</option>' +
    DB.animales.map(a=>`<option value="${a['Arete']}">${a['Arete']}${a['Nombre']?' — '+a['Nombre']:''}</option>`).join('');
}

async function saveGasto() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const tipo = document.getElementById('gasto-tipo').value;
  const desc = document.getElementById('gasto-desc').value.trim();
  const monto = document.getElementById('gasto-monto').value;
  const fecha = document.getElementById('gasto-fecha').value;
  if(!tipo||!desc||!monto||!fecha){toast('⚠️ Completa los campos obligatorios');return;}
  const esIng = TIPOS_INGRESO.includes(tipo);
  const row = {
    'ID': String(Date.now()),
    'Tipo': tipo,
    'Descripcion': desc,
    'Monto': parseFloat(monto),
    'EsIngreso': esIng ? 'SI' : 'NO',
    'Fecha': fecha,
    'Animal': document.getElementById('gasto-animal').value||'',
    'Observaciones': document.getElementById('gasto-obs').value||''
  };
  apiPostFast('insert','gastos',row);
  if(!DB.gastos) DB.gastos=[];
  DB.gastos.unshift(row);
  renderGastos();
  closeM('m-gasto');
  document.getElementById('gasto-tipo').value='';
  clearF(['gasto-desc','gasto-monto','gasto-obs']);
  toast('✅ Movimiento registrado');
}

// ══ ÁRBOL GENEALÓGICO ══
let _arbolTimer = null;

function arbolBuscarLive(val) {
  clearTimeout(_arbolTimer);
  _arbolTimer = setTimeout(() => {
    if (val.trim().length >= 2) arbolBuscar(val.trim());
    else if (!val.trim()) {
      document.getElementById('arbol-resultado').innerHTML = `<div class="arbol-empty"><div class="ei">🧬</div><p>Escribe el arete o nombre de un animal<br>para ver su árbol genealógico.</p></div>`;
    }
  }, 300);
}

function arbolBuscar(q) {
  const val = (q || document.getElementById('arbol-input').value || '').trim().toLowerCase();
  if (!val) return;
  const animal = DB.animales.find(a =>
    (a['Arete']||'').toLowerCase() === val ||
    (a['Nombre']||'').toLowerCase() === val ||
    (a['Arete']||'').toLowerCase().includes(val) ||
    (a['Nombre']||'').toLowerCase().includes(val)
  );
  if (!animal) {
    document.getElementById('arbol-resultado').innerHTML = `<div class="arbol-empty"><div class="ei">🔍</div><p>No se encontró ningún animal con ese arete o nombre.</p></div>`;
    return;
  }
  const cont = document.getElementById('arbol-resultado');
  cont.dataset.tabArbol = 'padres';
  cont.dataset.arbolRaiz = animal['ID'];
  renderArbolAnimal(animal['ID']);
}

function renderArbolAnimal(id) {
  const animal = DB.animales.find(a => String(a['ID']) === String(id));
  if (!animal) return;

  // ── Utilidades ──────────────────────────────────────────────
  function dotColor(e) {
    if (!e || e === 'Activo' || e === 'Gestante') return 'var(--green)';
    if (e === 'Vendido') return 'var(--muted)';
    if (e === 'Muerto') return 'var(--red)';
    return 'var(--accent2)';
  }

  // Encuentra un animal por su arete (case-insensitive)
  function porArete(arete) {
    if (!arete) return null;
    return DB.animales.find(a => (a['Arete']||'').toLowerCase() === arete.trim().toLowerCase()) || null;
  }

  // Devuelve { padre, padreArete, madre, madreArete } para un animal dado
  function parientes(a) {
    if (!a) return { padre:null, padreArete:'', madre:null, madreArete:'' };
    const padreArete = (a['Padre'] || a['padre'] || '').trim();
    const madreArete = (a['Madre'] || '').trim();
    return {
      padreArete,
      madreArete,
      padre: porArete(padreArete),
      madre: porArete(madreArete)
    };
  }

  // ── Tarjetas HTML ───────────────────────────────────────────
  function cardHTML(a, selected, extraCls) {
    if (!a) return '';
    const sexoCls = a['Sexo'] === 'Macho' ? 'macho' : 'hembra';
    const sel = selected ? ' selected' : '';
    const extra = extraCls ? ' ' + extraCls : '';
    return `<div class="arbol-animal ${sexoCls}${sel}${extra}" onclick="renderArbolAnimal('${a['ID']}')">
      <div class="arbol-dot" style="background:${dotColor(a['Estado'])}"></div>
      <div class="arbol-arete">${a['Arete']||''}</div>
      <div class="arbol-nombre">${a['Nombre']||'—'}</div>
      <div class="arbol-raza">${a['Raza']||''}</div>
      <span class="arbol-sexo ${a['Sexo']==='Macho'?'m':'h'}">${a['Sexo']==='Macho'?'♂ Macho':'♀ Hembra'}</span>
    </div>`;
  }

  function cardExterno(nombre, extraCls) {
    if (!nombre) return '';
    const extra = extraCls ? ' ' + extraCls : '';
    return `<div class="arbol-animal externo${extra}" title="Animal externo — no registrado en el sistema" style="cursor:default">
      <div class="arbol-dot" style="background:var(--accent2)"></div>
      <div class="arbol-arete" style="color:var(--accent2)">${nombre}</div>
      <div class="arbol-nombre" style="font-size:11px;margin-top:4px">Animal externo</div>
      <div class="arbol-raza">Otro rancho / No registrado</div>
      <span class="arbol-externo-badge">🔗 Externo</span>
    </div>`;
  }

  // Renderiza un slot: muestra tarjeta del animal si existe, o tarjeta externa si hay arete, o nada
  function slot(a, arete, extraCls) {
    if (a) return cardHTML(a, false, extraCls);
    if (arete) return cardExterno(arete, extraCls);
    return '';
  }

  // ── Construir árbol de ancestros ────────────────────────────
  const p0 = parientes(animal);                      // Padres
  const p_padre   = parientes(p0.padre);             // Abuelos paternos
  const p_madre   = parientes(p0.madre);             // Abuelos maternos
  const p_abuPP   = parientes(p_padre.padre);        // Bisabuelos paternos-paternos
  const p_abuPM   = parientes(p_padre.madre);        // Bisabuelos paternos-maternos
  const p_abuMP   = parientes(p_madre.padre);        // Bisabuelos maternos-paternos
  const p_abuMM   = parientes(p_madre.madre);        // Bisabuelos maternos-maternos

  // ── Hijos ──────────────────────────────────────────────────
  const areteBase = (animal['Arete'] || '').toLowerCase();
  const hijos = DB.animales.filter(a => {
    const m = (a['Madre'] || '').toLowerCase();
    const p = (a['Padre'] || a['padre'] || '').toLowerCase();
    return String(a['ID']) !== String(id) && (m === areteBase || p === areteBase);
  });
  const machos  = hijos.filter(h => h['Sexo'] === 'Macho').length;
  const hembras = hijos.filter(h => h['Sexo'] === 'Hembra').length;

  // ── Detectar cuántas generaciones hay datos ─────────────────
  const tieneAbuelos    = p0.padre || p0.madre || p0.padreArete || p0.madreArete;
  const tieneAbuelosP   = p_padre.padre || p_padre.madre || p_padre.padreArete || p_padre.madreArete;
  const tieneAbuelosM   = p_madre.padre || p_madre.madre || p_madre.padreArete || p_madre.madreArete;
  const tieneBisabuelos = tieneAbuelosP || tieneAbuelosM;

  // ── Estado de tabs (generaciones a mostrar) ─────────────────
  // Usamos un atributo en el contenedor para persistir el tab activo
  const cont = document.getElementById('arbol-resultado');
  let tabActivo = cont.dataset.tabArbol || 'padres';
  // Si no hay datos para el tab guardado, resetear
  if (tabActivo === 'abuelos' && !tieneAbuelos) tabActivo = 'padres';
  if (tabActivo === 'bisabuelos' && !tieneBisabuelos) tabActivo = tieneAbuelos ? 'abuelos' : 'padres';

  // ── Construir HTML ──────────────────────────────────────────
  let html = '<div class="arbol-wrap">';

  // Tabs de generaciones
  html += `<div class="arbol-gen-tabs">`;
  html += `<div class="arbol-gen-tab${tabActivo==='padres'?' active':''}" onclick="arbolSetTab('padres')">👪 Padres</div>`;
  if (tieneAbuelos) {
    const lbAbu = (tabActivo==='abuelos'||tabActivo==='bisabuelos') ? '− Abuelos' : '+ Abuelos';
    const tgAbu = (tabActivo==='abuelos'||tabActivo==='bisabuelos') ? 'padres' : 'abuelos';
    html += `<div class="arbol-gen-tab${(tabActivo==='abuelos'||tabActivo==='bisabuelos')?' active':''}" onclick="arbolSetTab('${tgAbu}')">🌿 ${lbAbu}</div>`;
  }
  if (tieneBisabuelos) {
    const lbBis = tabActivo==='bisabuelos' ? '− Bisabuelos' : '+ Bisabuelos';
    const tgBis = tabActivo==='bisabuelos' ? 'abuelos' : 'bisabuelos';
    html += `<div class="arbol-gen-tab${tabActivo==='bisabuelos'?' active':''}" onclick="arbolSetTab('${tgBis}')">🌳 ${lbBis}</div>`;
  }
  html += `</div>`;

  // ═══ TAB: BISABUELOS ═══════════════════════════════════════
  if (tabActivo === 'bisabuelos') {
    const hasBisagPP = p_abuPP.padre || p_abuPP.padreArete || p_abuPP.madre || p_abuPP.madreArete;
    const hasBisagPM = p_abuPM.padre || p_abuPM.padreArete || p_abuPM.madre || p_abuPM.madreArete;
    const hasBisagMP = p_abuMP.padre || p_abuMP.padreArete || p_abuMP.madre || p_abuMP.madreArete;
    const hasBisagMM = p_abuMM.padre || p_abuMM.padreArete || p_abuMM.madre || p_abuMM.madreArete;
    if (hasBisagPP || hasBisagPM || hasBisagMP || hasBisagMM) {
      html += `<div class="arbol-nivel-label">Bisabuelos</div>`;
      html += `<div class="arbol-nivel-gen" style="gap:6px">`;
      // Bisabuelos del abuelo paterno (padre del padre)
      const nombreAbuPP = p_padre.padre ? (p_padre.padre['Nombre']||p_padre.padre['Arete']) : p_padre.padreArete;
      // Bisabuelos de la abuela paterna (madre del padre)
      const nombreAbuPM = p_padre.madre ? (p_padre.madre['Nombre']||p_padre.madre['Arete']) : p_padre.madreArete;
      // Bisabuelos del abuelo materno (padre de la madre)
      const nombreAbuMP = p_madre.padre ? (p_madre.padre['Nombre']||p_madre.padre['Arete']) : p_madre.padreArete;
      // Bisabuelos de la abuela materna (madre de la madre)
      const nombreAbuMM = p_madre.madre ? (p_madre.madre['Nombre']||p_madre.madre['Arete']) : p_madre.madreArete;

      if (hasBisagPP) {
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♂ Padres de ${nombreAbuPP||'abuelo paterno'}</div><div class="arbol-nivel">
          ${slot(p_abuPP.padre, p_abuPP.padreArete, 'gen-bisabuelo')}
          ${slot(p_abuPP.madre, p_abuPP.madreArete, 'gen-bisabuelo')}
        </div></div>`;
      }
      if (hasBisagPM) {
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♀ Padres de ${nombreAbuPM||'abuela paterna'}</div><div class="arbol-nivel">
          ${slot(p_abuPM.padre, p_abuPM.padreArete, 'gen-bisabuelo')}
          ${slot(p_abuPM.madre, p_abuPM.madreArete, 'gen-bisabuelo')}
        </div></div>`;
      }
      if (hasBisagMP) {
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♂ Padres de ${nombreAbuMP||'abuelo materno'}</div><div class="arbol-nivel">
          ${slot(p_abuMP.padre, p_abuMP.padreArete, 'gen-bisabuelo')}
          ${slot(p_abuMP.madre, p_abuMP.madreArete, 'gen-bisabuelo')}
        </div></div>`;
      }
      if (hasBisagMM) {
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♀ Padres de ${nombreAbuMM||'abuela materna'}</div><div class="arbol-nivel">
          ${slot(p_abuMM.padre, p_abuMM.padreArete, 'gen-bisabuelo')}
          ${slot(p_abuMM.madre, p_abuMM.madreArete, 'gen-bisabuelo')}
        </div></div>`;
      }
      html += `</div>`;
      html += `<div class="arbol-vline-sm"></div>`;
    }
  }

  // ═══ TAB: ABUELOS ══════════════════════════════════════════
  if (tabActivo === 'abuelos' || tabActivo === 'bisabuelos') {
    const hasAbuelP = p_padre.padre || p_padre.padreArete || p_padre.madre || p_padre.madreArete;
    const hasAbuelM = p_madre.padre || p_madre.padreArete || p_madre.madre || p_madre.madreArete;
    if (hasAbuelP || hasAbuelM) {
      html += `<div class="arbol-nivel-label">Abuelos</div>`;
      html += `<div class="arbol-nivel-gen" style="gap:8px">`;
      // Abuelos paternos: padres del PADRE — siempre a la izquierda
      if (hasAbuelP) {
        const labelP = p0.padre ? `Padres de ${p0.padre['Nombre']||p0.padre['Arete']}` : `Vía padre (${p0.padreArete})`;
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♂ ${labelP}</div><div class="arbol-nivel">
          ${slot(p_padre.padre, p_padre.padreArete, 'gen-abuelo')}
          ${slot(p_padre.madre, p_padre.madreArete, 'gen-abuelo')}
        </div></div>`;
      }
      // Abuelos maternos: padres de la MADRE — siempre a la derecha
      if (hasAbuelM) {
        const labelM = p0.madre ? `Padres de ${p0.madre['Nombre']||p0.madre['Arete']}` : `Vía madre (${p0.madreArete})`;
        html += `<div class="arbol-gen-grupo"><div class="arbol-gen-grupo-label">♀ ${labelM}</div><div class="arbol-nivel">
          ${slot(p_madre.padre, p_madre.padreArete, 'gen-abuelo')}
          ${slot(p_madre.madre, p_madre.madreArete, 'gen-abuelo')}
        </div></div>`;
      }
      html += `</div>`;
      html += `<div class="arbol-vline-sm"></div>`;
    }
  }

  // ═══ PADRES (siempre visibles) — PADRE izquierda, MADRE derecha ═══
  if (p0.padre || p0.madre || p0.padreArete || p0.madreArete) {
    html += `<div class="arbol-nivel-label">Padres</div>`;
    html += `<div class="arbol-nivel">`;
    // Padre (macho) siempre primero/izquierda
    if (p0.padre) html += cardHTML(p0.padre, false, '');
    else if (p0.padreArete) html += cardExterno(p0.padreArete, '');
    // Madre (hembra) siempre segundo/derecha
    if (p0.madre) html += cardHTML(p0.madre, false, '');
    else if (p0.madreArete) html += cardExterno(p0.madreArete, '');
    html += `</div>`;
    html += `<div class="arbol-vline"></div>`;
  }

  // ═══ ANIMAL CENTRAL ════════════════════════════════════════
  html += `<div class="arbol-nivel-label">${animal['Nombre']||animal['Arete']} — seleccionado</div>`;
  html += `<div class="arbol-nivel">${cardHTML(animal, true, '')}</div>`;

  // ═══ CRÍAS ════════════════════════════════════════════════
  if (hijos.length > 0) {
    html += `<div class="arbol-vline"></div>`;
    html += `<div class="arbol-nivel-label" style="width:100%">Crías (${hijos.length})</div>`;
    html += `<div class="arbol-hijos-grid">`;
    hijos.forEach(h => {
      const cls = h['Sexo'] === 'Macho' ? 'macho' : 'hembra';
      html += `<div class="arbol-hijo ${cls}" onclick="renderArbolAnimal('${h['ID']}')">
        <div class="arbol-hijo-arete">${h['Arete']||''} ${h['Nombre']?'— '+h['Nombre']:''}</div>
        <div class="arbol-hijo-info">${h['Raza']||''} · ${h['Sexo']==='Macho'?'♂ Macho':'♀ Hembra'} · <span style="color:${dotColor(h['Estado'])}">${h['Estado']||'Activo'}</span></div>
      </div>`;
    });
    html += `</div>`;
  } else {
    html += `<div style="text-align:center;padding:10px;font-size:12px;color:var(--muted)">Sin crías registradas</div>`;
  }

  // ═══ STATS ════════════════════════════════════════════════
  html += `<div class="arbol-divider"><span>Resumen genético</span></div>`;
  html += `<div class="arbol-stats">
    <div class="arbol-stat"><div class="arbol-stat-val">${hijos.length}</div><div class="arbol-stat-lbl">Total crías</div></div>
    <div class="arbol-stat"><div class="arbol-stat-val" style="color:var(--blue)">${machos}</div><div class="arbol-stat-lbl">Machos</div></div>
    <div class="arbol-stat"><div class="arbol-stat-val" style="color:var(--red)">${hembras}</div><div class="arbol-stat-lbl">Hembras</div></div>
  </div>`;

  // ═══ INFO RESUMEN PADRES ══════════════════════════════════
  if (p0.padre || p0.madre || p0.padreArete || p0.madreArete) {
    html += `<div class="arbol-divider"><span>Información de padres</span></div>`;
    html += `<div class="arbol-padres-info">`;
    if (p0.padreArete) {
      if (p0.padre) html += `<div>🐂 <strong>Padre:</strong> ${p0.padre['Nombre']||''} (${p0.padre['Arete']}) — ${p0.padre['Raza']||''}</div>`;
      else html += `<div>🧬 <strong>Padre (externo):</strong> ${p0.padreArete} <span style="background:rgba(240,200,74,.15);color:var(--accent2);font-size:10px;padding:1px 7px;border-radius:20px;font-weight:700;margin-left:4px">Otro rancho</span></div>`;
    }
    if (p0.madreArete) {
      if (p0.madre) html += `<div>🐄 <strong>Madre:</strong> ${p0.madre['Nombre']||''} (${p0.madre['Arete']}) — ${p0.madre['Raza']||''}</div>`;
      else html += `<div>🐄 <strong>Madre (externa):</strong> ${p0.madreArete} <span style="background:rgba(240,200,74,.15);color:var(--accent2);font-size:10px;padding:1px 7px;border-radius:20px;font-weight:700;margin-left:4px">No registrada</span></div>`;
    }
    html += `</div>`;
  }

  html += '</div>';
  cont.innerHTML = html;
  cont.dataset.tabArbol = tabActivo;
}

// Cambia el tab de generaciones y re-renderiza
function arbolSetTab(tab) {
  const cont = document.getElementById('arbol-resultado');
  cont.dataset.tabArbol = tab;
  const rootId = cont.dataset.arbolRaiz;
  if (rootId) renderArbolAnimal(rootId);
}

// ══ BUSCAR ANIMAL ══
function buscarAnimal(q) {
  const cont = document.getElementById('buscar-resultado');
  if(!cont) return;
  const term = (q||'').toLowerCase().trim();
  if(!term) { cont.innerHTML = ''; return; }
  const list = DB.animales.filter(a =>
    (a['Arete']||'').toLowerCase().includes(term) ||
    (a['Nombre']||'').toLowerCase().includes(term) ||
    (a['Raza']||'').toLowerCase().includes(term)
  );
  if(!list.length) {
    cont.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">🔍 No se encontraron animales</div>';
    return;
  }
  cont.innerHTML = `<div style="background:var(--card2);border:1px solid var(--border2);border-radius:14px;overflow:hidden">` +
    list.map((a, i) => {
      const isLast = i === list.length - 1;
      return `<div onclick="verAnimalDetalle('${a['ID']}')" style="display:flex;align-items:center;gap:12px;padding:14px 16px;cursor:pointer;transition:background .15s;border-bottom:${isLast?'none':'1px solid var(--border2)'}" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background=''">
        <div style="width:38px;height:38px;border-radius:10px;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;overflow:hidden">
          ${a['Foto']?`<img src="${a['Foto']}" style="width:100%;height:100%;object-fit:cover">`:'🐄'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:var(--accent);font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">${a['Raza']||''} | ${a['Sexo']==='Hembra'?'♀ Hembra':'♂ Macho'}</div>
          <div style="font-size:11px;color:var(--muted2,var(--muted));margin-top:1px">${(DB.salud||[]).filter(s=>String(s['AnimalID']||s['Animal']||'').includes(a['Arete']||a['Nombre']||'')).length > 0 ? (DB.salud||[]).filter(s=>String(s['AnimalID']||s['Animal']||'').includes(a['Arete']||a['Nombre']||'')).length+' registros' : 'Sin registros'}</div>
        </div>
        <span class="badge ${bCls(a['Estado'])}" style="flex-shrink:0">${a['Estado']||''}</span>
        <span style="color:var(--muted);font-size:18px;margin-left:4px">›</span>
      </div>`;
    }).join('') + `</div>`;
}

function verAnimalDetalle(id) {
  const a = DB.animales.find(x => String(x['ID']) === String(id));
  if(!a) return;
  const edad = a['Nacimiento'] ? Math.floor((new Date()-new Date(a['Nacimiento']))/(365.25*24*3600*1000)) + ' años' : '—';
  const registrosSalud = (DB.salud||[]).filter(s => String(s['AnimalID']||s['Animal']||'').includes(a['Arete']||a['Nombre']||''));
  const registrosInsem = (DB.insem||[]).filter(r => String(r['Hembra']||'').includes(a['Arete']||a['Nombre']||''));
  const registrosPartos = (DB.partos||[]).filter(r => String(r['Madre']||'').includes(a['Arete']||a['Nombre']||''));
  const totalRegistros = registrosSalud.length + registrosInsem.length + registrosPartos.length;

  const overlay = document.getElementById('m-buscar-detalle');
  const body = document.getElementById('m-buscar-detalle-body');
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div style="width:56px;height:56px;border-radius:14px;background:var(--card);display:flex;align-items:center;justify-content:center;font-size:30px;flex-shrink:0;overflow:hidden;border:2px solid var(--border2)">
        ${a['Foto']?`<img src="${a['Foto']}" style="width:100%;height:100%;object-fit:cover">`:'🐄'}
      </div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:700;color:var(--accent)">${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">${a['Raza']||''} | ${a['Sexo']==='Hembra'?'♀ Hembra':'♂ Macho'}</div>
        <span class="badge ${bCls(a['Estado'])}" style="margin-top:6px;display:inline-block">${a['Estado']||''}</span>
      </div>
      <div style="text-align:center;flex-shrink:0">
        <div style="font-size:26px;font-weight:800;color:var(--accent)">${totalRegistros}</div>
        <div style="font-size:11px;color:var(--muted)">eventos</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px">
      <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border2)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Edad</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${edad}</div>
      </div>
      <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border2)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Peso</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${a['Peso']||a['Peso(kg)'] ? (a['Peso']||a['Peso(kg)'])+' kg' : '—'}</div>
      </div>
      <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border2)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Nacimiento</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${fmt(a['Nacimiento'])}</div>
      </div>
      <div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border2)">
        <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Madre</div>
        <div style="font-size:14px;font-weight:600;color:var(--text)">${a['Madre']||'—'}</div>
      </div>
    </div>
    ${a['Observaciones']?`<div style="background:var(--card);border-radius:10px;padding:12px;border:1px solid var(--border2);margin-bottom:18px">
      <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Observaciones</div>
      <div style="font-size:13px;color:var(--text)">${a['Observaciones']}</div>
    </div>`:''}
    ${registrosSalud.length ? registrosSalud.map(s=>`
      <div style="background:var(--card);border-radius:10px;border:1px solid var(--border2);border-left:3px solid var(--accent);padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px">💉 Salud</div>
          <div style="font-size:12px;color:var(--muted)">${fmt(s['Fecha']||s['Aplicacion']||'')}</div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">${s['Descripcion']||s['Tipo']||'—'}</div>
        <div style="font-size:12px;color:var(--muted)">
          ${[s['Tipo']&&s['Descripcion']?'Tipo: '+s['Tipo']:'', s['Veterinario']?'Dr. '+s['Veterinario']:'', s['ProximaDosis']?'Próx. dosis: '+fmt(s['ProximaDosis']):'', s['Estado']?'Estado: '+s['Estado']:''].filter(Boolean).join(' | ')}
        </div>
      </div>`).join('') : ''}
    ${registrosPartos.length ? registrosPartos.map(r=>`
      <div style="background:var(--card);border-radius:10px;border:1px solid var(--border2);border-left:3px solid var(--accent);padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.6px">🐣 Parto</div>
          <div style="font-size:12px;color:var(--muted)">${fmt(r['Fecha']||'')}</div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">Cría: ${r['Cria']||r['AreteC']||'—'}${r['Sexo']?' ('+( r['Sexo']==='Hembra'?'Hembra':'Macho')+')':''}${r['PesoCria']?' | Peso: '+r['PesoCria']+' kg':''}</div>
        <div style="font-size:12px;color:var(--muted)">
          ${[r['Tipo']?'Tipo: '+r['Tipo']:'', r['EstadoCria']?'Estado cría: '+r['EstadoCria']:'', r['Observaciones']?r['Observaciones']:''].filter(Boolean).join(' | ')}
        </div>
      </div>`).join('') : ''}
    ${registrosInsem.length ? registrosInsem.map(r=>`
      <div style="background:var(--card);border-radius:10px;border:1px solid var(--border2);border-left:3px solid #e8c84a;padding:12px 14px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
          <div style="font-size:11px;font-weight:700;color:#e8c84a;text-transform:uppercase;letter-spacing:.6px">🔬 Inseminación</div>
          <div style="font-size:12px;color:var(--muted)">${fmt(r['Fecha']||'')}</div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:4px">Toro/Semen: ${r['Toro']||r['Semen']||'—'}${r['Tecnica']?' | Técnica: '+r['Tecnica']:''}</div>
        <div style="font-size:12px;color:var(--muted)">
          ${[r['Resultado']?'Resultado: '+r['Resultado']+' ✓':'', r['PartoEst']?'Parto est: '+fmt(r['PartoEst']):'', r['Tecnico']?'Técnico: '+r['Tecnico']:''].filter(Boolean).join(' | ')}
        </div>
      </div>`).join('') : ''}
    ${totalRegistros===0?`<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">📭 Sin registros para este animal</div>`:''}
  `;
  document.getElementById('m-buscar-detalle-title').textContent = `${a['Arete']||''} ${a['Nombre']?'— '+a['Nombre']:''}`;
  openM('m-buscar-detalle');
}

function renderGastos() {
  if(!DB.gastos) DB.gastos=[];
  const filtroTipo = document.getElementById('gf-tipo')?.value||'';
  const filtroMes  = document.getElementById('gf-mes')?.value||'';
  let lista = [...DB.gastos];
  if(filtroTipo) lista = lista.filter(g=>g['Tipo']===filtroTipo);
  if(filtroMes)  lista = lista.filter(g=>(g['Fecha']||'').startsWith(filtroMes));

  const fmtMoney = n => 'S/ ' + parseFloat(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esIngreso = g => { const val = String(g['EsIngreso']||'').toUpperCase(); return val==='SI'||val==='TRUE'||val==='1'; };
  const totalIng = lista.filter(g=>esIngreso(g)).reduce((s,g)=>s+parseFloat(g['Monto']||0),0);
  const totalGas = lista.filter(g=>!esIngreso(g)).reduce((s,g)=>s+parseFloat(g['Monto']||0),0);
  const balance  = totalIng - totalGas;

  const ingEl = document.getElementById('g-ingresos');
  const gasEl = document.getElementById('g-gastos');
  const balEl = document.getElementById('g-balance');
  if(ingEl) ingEl.textContent = fmtMoney(totalIng);
  if(gasEl) gasEl.textContent = fmtMoney(totalGas);
  if(balEl){ balEl.textContent = fmtMoney(balance); balEl.style.color = balance>=0?'var(--green)':'var(--red)'; }

  const cont = document.getElementById('gas-tbody');
  if(!cont) return;
  if(!lista.length){cont.innerHTML='<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">Sin movimientos registrados</div>';return;}
  cont.innerHTML = lista.map(g=>{
    const esIng = String(g['EsIngreso']||'').toUpperCase()==='SI'||String(g['EsIngreso']||'').toUpperCase()==='TRUE';
    const canDel = puedeEliminar();
    return `<div class="gasto-card">
      <div class="gasto-icon ${esIng?'gi-bg':'gg-bg'}" style="background:transparent;padding:2px"><img src="${esIng?'data:image/png;base64,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':'data:image/png;base64,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'}" style="width:100%;height:100%;object-fit:contain"></div>
      <div class="gasto-info">
        <div class="gasto-desc">${g['Descripcion']||''}</div>
        <div class="gasto-meta">${g['Tipo']||''} ${g['Animal']?'· '+g['Animal']:''} · ${g['Fecha']?fmt(g['Fecha']):'—'}</div>
        ${g['Observaciones']?`<div class="gasto-meta">${g['Observaciones']}</div>`:''}
      </div>
      <div>
        <div class="gasto-monto ${esIng?'g-ing':'g-gas'}">${esIng?'+':'−'}${fmtMoney(g['Monto'])}</div>
        ${canDel?`<button class="btn btn-danger btn-sm" style="margin-top:4px;width:100%" onclick="delGasto('${g['ID']}')">🗑</button>`:''}
      </div>
    </div>`;
  }).join('');
}

async function delGasto(id) {
  if(!confirm('¿Eliminar este movimiento?')) return;
  apiPostFast('delete','gastos',null,id);
  DB.gastos = DB.gastos.filter(g=>String(g['ID'])!==String(id));
  renderGastos();
  toast('🗑 Eliminado');
}

// ══ WHATSAPP ══
function alertasWhatsApp() {
  const hoy = new Date();
  const msgs = [];
  DB.salud.forEach(s=>{
    if(!s['ProximaDosis']) return;
    const d = new Date(s['ProximaDosis']+'T12:00:00');
    const diff = Math.round((d-hoy)/86400000);
    if(diff < 0) msgs.push(`🚨 VACUNA VENCIDA: ${s['Animal']} — ${s['Descripcion']} (hace ${-diff} días)`);
    else if(diff <= 7) msgs.push(`💉 Vacuna en ${diff} días: ${s['Animal']} — ${s['Descripcion']} (${fmt(s['ProximaDosis'])})`);
  });
  DB.insem.forEach(i=>{
    if(!i['PartoEstimado']) return;
    const d = new Date(i['PartoEstimado']+'T12:00:00');
    const diff = Math.round((d-hoy)/86400000);
    if(diff >= 0 && diff <= 14) msgs.push(`🐄 Parto estimado en ${diff} días: ${i['Hembra']} (${fmt(i['PartoEstimado'])})`);
  });
  if(!msgs.length){ toast('✅ Sin alertas urgentes esta semana'); return; }
  const texto = `🐄 *VaqueroApp — Alertas*\n📅 ${new Date().toLocaleDateString('es-PE')}\n\n` + msgs.join('\n');
  const numero = prompt('Número de WhatsApp (ej: 51999999999):');
  if(numero && numero.trim()) {
    window.open(`https://wa.me/${numero.trim()}?text=${encodeURIComponent(texto)}`, '_blank');
  }
}



// ╔══════════════════════════════════════════════════════╗
// ║          VAQUEROAPP — SEGURIDAD MÁXIMA               ║
// ╚══════════════════════════════════════════════════════╝

// 1. SANITIZACIÓN
function sanitize(str) {
  if(str===null||str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#x27;')
    .replace(/javascript:/gi,'').replace(/vbscript:/gi,'')
    .replace(/on\w+=/gi,'').replace(/eval\s*\(/gi,'')
    .replace(/alert\s*\(/gi,'').replace(/document\./gi,'').replace(/window\./gi,'')
    .trim();
}
function sanitizePlain(str) {
  if(!str) return '';
  return String(str).replace(/<[^>]*>/g,'').replace(/javascript:/gi,'')
    .replace(/vbscript:/gi,'').replace(/on\w+\s*=/gi,'')
    .replace(/eval\s*\(/gi,'').replace(/[<>]/g,'').trim().substring(0,500);
}
function sanitizeEmail(email) {
  if(!email) return '';
  const clean = email.toLowerCase().trim().substring(0,254);
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(clean) ? clean : '';
}
function sanitizeNumber(val,min=0,max=99999) {
  const n=parseFloat(val); if(isNaN(n)) return null;
  return Math.min(Math.max(n,min),max);
}
function sanitizeDate(val) {
  if(!val) return null;
  const clean=String(val).replace(/[^0-9\-]/g,'').substring(0,10);
  return /^\d{4}-\d{2}-\d{2}$/.test(clean) ? clean : null;
}
function sanitizeObject(obj) {
  const clean={};
  for(const [k,v] of Object.entries(obj)) {
    if(v===null||v===undefined){clean[k]=v;continue;}
    if(typeof v==='number'||typeof v==='boolean'){clean[k]=v;continue;}
    if(k==='email'){clean[k]=sanitizeEmail(v);continue;}
    if(['monto','peso','costo','peso_nacimiento'].includes(k)){clean[k]=sanitizeNumber(v);continue;}
    if(['fecha','nacimiento','fecha_aplicacion','proxima_dosis','parto_estimado'].includes(k)){clean[k]=sanitizeDate(v);continue;}
    if(k==='foto'||k==='rancho_id'||k==='user_id'){clean[k]=v;continue;}
    clean[k]=sanitizePlain(v);
  }
  return clean;
}


// ── HTML ESCAPE para renderizado seguro ──
function escH(str) {
  if(str===null||str===undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#x27;');
}
// 2. ANTI FUERZA BRUTA
// (loginAttempts declarado al inicio del script)
function checkLoginAttempts() {
  const now=Date.now();
  if(now-loginAttempts.lastAttempt>BLOCK_TIME){loginAttempts.count=0;loginAttempts.blocked=false;}
  if(loginAttempts.blocked){
    const min=Math.ceil((BLOCK_TIME-(now-loginAttempts.lastAttempt))/60000);
    showAuthError('Demasiados intentos fallidos. Espera '+min+' minuto(s).');
    return false;
  }
  return true;
}
function registrarIntento(ok) {
  if(ok){loginAttempts.count=0;loginAttempts.blocked=false;return;}
  loginAttempts.count++;
  loginAttempts.lastAttempt=Date.now();
  if(loginAttempts.count>=MAX_ATTEMPTS) loginAttempts.blocked=true;
}

// 3. VALIDACIONES ESTRICTAS
const VALIDACIONES={
  email:{regex:/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,msg:'Correo inválido',maxLen:254},
  password:{regex:/^.{6,128}$/,msg:'La contraseña debe tener entre 6 y 128 caracteres',maxLen:128},
  nombre:{regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s\-\.]{2,100}$/,msg:'Nombre inválido (solo letras, 2-100 caracteres)',maxLen:100},
  rancho:{regex:/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9\s\-\.]{2,150}$/,msg:'Nombre del rancho inválido (2-150 caracteres)',maxLen:150},
  arete:{regex:/^[a-zA-Z0-9\-\/\.]{1,50}$/,msg:'Arete inválido',maxLen:50},
};
function validar(campo,valor,tipo) {
  if(!valor) return campo+' es obligatorio';
  const v=VALIDACIONES[tipo]; if(!v) return null;
  if(valor.length>v.maxLen) return campo+': máximo '+v.maxLen+' caracteres';
  if(!v.regex.test(valor)) return v.msg;
  return null;
}

// 4. DETECCIÓN INYECCIÓN SQL/XSS
function detectarInyeccion(valor) {
  if(!valor) return false;
  const patrones=[
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|EXEC|UNION|ALTER|CREATE)\b/i,
    /(--|;\/\*|\*\/|OR\s+'|AND\s+')/i,
    /(SLEEP\s*\(|WAITFOR\s+DELAY|BENCHMARK\s*\()/i,
    /(\x3cscript|\x3ciframe|\x3cimg[^>]+onerror)/i,
  ];
  return patrones.some(p=>p.test(String(valor)));
}
function validarContraInyeccion(campos) {
  for(const [k,v] of Object.entries(campos)) {
    if(typeof v==='string' && detectarInyeccion(v)){
      logSecurityEvent('INJECTION_ATTEMPT','Campo: '+k);
      return false;
    }
  }
  return true;
}

// 5. LOG SEGURIDAD
function logSecurityEvent(tipo,detalle) {
  const e={tipo,detalle,ts:new Date().toISOString(),ua:navigator.userAgent.substring(0,100)};
  console.warn('SEGURIDAD:', e);
  try {
    const logs=JSON.parse(localStorage.getItem('vqa_security_log')||'[]');
    logs.unshift(e);
    localStorage.setItem('vqa_security_log',JSON.stringify(logs.slice(0,20)));
  } catch(err){}
}

// 6. BLOQUEAR PASTE malicioso
function initSecurityListeners() {
  document.addEventListener('paste',function(e){
    const t=e.target;
    if(!t.matches('input,textarea')) return;
    setTimeout(()=>{
      if(detectarInyeccion(t.value)){
        t.value=sanitizePlain(t.value);
        logSecurityEvent('PASTE_BLOCKED','Contenido malicioso bloqueado');
        toast('Contenido no permitido eliminado');
      }
    },10);
  });
}

// 7. SESSION TIMEOUT 90 min (actividad: click, keydown, keyup, scroll, input, mousemove)
function resetActivityTimer(){
  clearTimeout(activityTimer);
  activityTimer=setTimeout(()=>{
    if(SESSION){logSecurityEvent('TIMEOUT','Sesión cerrada por inactividad');toast('Sesión cerrada por inactividad');setTimeout(doLogout,2000);}
  },SESSION_TIMEOUT);
}
function initActivityMonitor(){
  ['click','keydown','keyup','scroll','touchstart','input','mousemove','pointerdown'].forEach(ev=>
    document.addEventListener(ev,resetActivityTimer,{passive:true}));
  resetActivityTimer();
}


// ══════════════════════════════════════════
// MÓDULO: INVENTARIO
// ══════════════════════════════════════════
if(!DB.inventario) DB.inventario = [];
if(!DB.ventas)     DB.ventas     = [];

let invCatFiltro = '';

function setInvCat(cat, btn) {
  invCatFiltro = cat;
  document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderInventario();
}

function openInventario(id) {
  document.getElementById('inv-edit-id').value = '';
  document.getElementById('inv-modal-title').textContent = 'Agregar Producto';
  clearF(['inv-nombre','inv-stock','inv-minimo','inv-precio','inv-proveedor','inv-vencimiento','inv-obs']);
  document.getElementById('inv-cat').value = '';
  document.getElementById('inv-unidad').value = 'unidades';
  if(id) {
    const item = (DB.inventario||[]).find(x => String(x['ID']) === String(id));
    if(!item) return;
    document.getElementById('inv-edit-id').value = id;
    document.getElementById('inv-modal-title').textContent = 'Editar Producto';
    document.getElementById('inv-nombre').value = item['Nombre']||'';
    document.getElementById('inv-cat').value = item['Categoria']||'';
    document.getElementById('inv-unidad').value = item['Unidad']||'unidades';
    document.getElementById('inv-stock').value = item['Stock']||0;
    document.getElementById('inv-minimo').value = item['Minimo']||0;
    document.getElementById('inv-precio').value = item['Precio']||'';
    document.getElementById('inv-proveedor').value = item['Proveedor']||'';
    document.getElementById('inv-vencimiento').value = item['Vencimiento']||'';
    document.getElementById('inv-obs').value = item['Observaciones']||'';
  }
  openM('m-inventario');
}

async function saveInventario() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const nombre = document.getElementById('inv-nombre').value.trim();
  const cat    = document.getElementById('inv-cat').value;
  const stock  = document.getElementById('inv-stock').value;
  if(!nombre || !cat || stock === '') { toast('⚠️ Completa los campos obligatorios'); return; }
  const editId = document.getElementById('inv-edit-id').value;
  const id = editId || String(Date.now());
  const row = {
    'ID':          id,
    'Nombre':      nombre,
    'Categoria':   cat,
    'Unidad':      document.getElementById('inv-unidad').value,
    'Stock':       parseFloat(stock)||0,
    'Minimo':      parseFloat(document.getElementById('inv-minimo').value)||0,
    'Precio':      parseFloat(document.getElementById('inv-precio').value)||0,
    'Proveedor':   document.getElementById('inv-proveedor').value.trim(),
    'Vencimiento': document.getElementById('inv-vencimiento').value||'',
    'Observaciones': document.getElementById('inv-obs').value.trim(),
    'FechaReg':    new Date().toISOString().split('T')[0]
  };
  if(!DB.inventario) DB.inventario = [];
  if(editId) {
    const idx = DB.inventario.findIndex(x => String(x['ID']) === String(editId));
    if(idx >= 0) DB.inventario[idx] = row; else DB.inventario.unshift(row);
  } else {
    DB.inventario.unshift(row);
  }
  localStorage.setItem('vaqueroapp_inventario', JSON.stringify(DB.inventario));
  // Guardar en Supabase
  const sbRow = {
    id:           id,
    rancho_id:    SESSION?.rancho_id,
    nombre:       nombre,
    categoria:    cat,
    unidad:       row['Unidad'],
    stock:        row['Stock'],
    minimo:       row['Minimo'],
    precio:       row['Precio'],
    proveedor:    row['Proveedor'],
    vencimiento:  row['Vencimiento']||null,
    observaciones: row['Observaciones'],
    fecha_reg:    row['FechaReg']
  };
  const token = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
  if(editId) {
    const res = await fetch(`${SB_URL}/rest/v1/inventario?id=eq.${encodeURIComponent(editId)}`, {
      method:'PATCH', headers, body:JSON.stringify(sbRow)
    });
    if(!res.ok) console.error('inventario update error:', await res.text());
  } else {
    const res = await fetch(`${SB_URL}/rest/v1/inventario`, {
      method:'POST', headers, body:JSON.stringify(sbRow)
    });
    if(!res.ok) console.error('inventario insert error:', await res.text());
  }
  renderInventario();
  closeM('m-inventario');
  toast('✅ Producto guardado');
}

function openMovInventario(id) {
  const item = (DB.inventario||[]).find(x => String(x['ID']) === String(id));
  if(!item) return;
  document.getElementById('inv-mov-title').textContent = item['Nombre'];
  document.getElementById('inv-mov-id').value = id;
  document.getElementById('inv-mov-qty').value = '';
  document.getElementById('inv-mov-motivo').value = '';
  document.getElementById('inv-mov-tipo').value = 'entrada';
  openM('m-inv-mov');
}

function saveMovInventario() {
  const id   = document.getElementById('inv-mov-id').value;
  const tipo = document.getElementById('inv-mov-tipo').value;
  const qty  = parseFloat(document.getElementById('inv-mov-qty').value)||0;
  if(!qty || qty <= 0) { toast('⚠️ Ingresa una cantidad válida'); return; }
  const idx = (DB.inventario||[]).findIndex(x => String(x['ID']) === String(id));
  if(idx < 0) return;
  if(tipo === 'entrada') {
    DB.inventario[idx]['Stock'] = (parseFloat(DB.inventario[idx]['Stock'])||0) + qty;
  } else {
    const actual = parseFloat(DB.inventario[idx]['Stock'])||0;
    if(qty > actual) { toast('⚠️ No hay suficiente stock'); return; }
    DB.inventario[idx]['Stock'] = actual - qty;
  }
  localStorage.setItem('vaqueroapp_inventario', JSON.stringify(DB.inventario));
  renderInventario();
  closeM('m-inv-mov');
  toast(tipo === 'entrada' ? '➕ Entrada registrada' : '➖ Salida registrada');
}

function delInventario(id) {
  if(!confirm('¿Eliminar este producto?')) return;
  DB.inventario = (DB.inventario||[]).filter(x => String(x['ID']) !== String(id));
  localStorage.setItem('vaqueroapp_inventario', JSON.stringify(DB.inventario));
  renderInventario();
  toast('🗑 Eliminado');
}

function renderInventario() {
  if(!DB.inventario) DB.inventario = [];
  const lista = invCatFiltro
    ? DB.inventario.filter(x => x['Categoria'] === invCatFiltro)
    : DB.inventario;

  const bajos    = DB.inventario.filter(x => parseFloat(x['Stock']||0) > 0 && parseFloat(x['Stock']||0) <= parseFloat(x['Minimo']||0)).length;
  const agotados = DB.inventario.filter(x => parseFloat(x['Stock']||0) <= 0).length;
  const totalEl  = document.getElementById('inv-total');
  const bajosEl  = document.getElementById('inv-bajos');
  const agotEl   = document.getElementById('inv-agotados');
  if(totalEl) totalEl.textContent = DB.inventario.length;
  if(bajosEl) bajosEl.textContent = bajos;
  if(agotEl)  agotEl.textContent  = agotados;

  const cont = document.getElementById('inv-tbody');
  if(!cont) return;
  if(!lista.length) {
    cont.innerHTML = '<div class="empty"><div class="empty-e">📦</div>Sin productos registrados</div>';
    return;
  }

  const catEmoji = { 'Medicamento':'💊', 'Alimento':'🌾', 'Insumo':'🔧', 'Otro':'📦' };
  const catColor = { 'Medicamento':'rgba(74,157,224,.15)', 'Alimento':'rgba(78,200,122,.15)', 'Insumo':'rgba(232,184,78,.15)', 'Otro':'rgba(255,255,255,.08)' };

  cont.innerHTML = lista.map(item => {
    const stock  = parseFloat(item['Stock']||0);
    const minimo = parseFloat(item['Minimo']||0);
    const agotado = stock <= 0;
    const bajo    = !agotado && minimo > 0 && stock <= minimo;
    const cls     = agotado ? 'inv-warn' : bajo ? 'inv-low' : 'inv-ok';
    const badge   = agotado ? `<span class="badge bg-red" style="font-size:9px">AGOTADO</span>` : bajo ? `<span class="badge bg-yellow" style="font-size:9px">STOCK BAJO</span>` : '';
    const emoji   = catEmoji[item['Categoria']] || '📦';
    const bgColor = catColor[item['Categoria']] || catColor['Otro'];
    const precio  = parseFloat(item['Precio']||0);
    const venc    = item['Vencimiento'] ? `· Vence: ${fmt(item['Vencimiento'])}` : '';
    return `<div class="inv-card">
      <div class="inv-icon" style="background:${bgColor}">${emoji}</div>
      <div class="inv-info">
        <div class="inv-nombre">${item['Nombre']||''} ${badge}</div>
        <div class="inv-meta">${item['Categoria']||''} · ${item['Unidad']||''} ${precio > 0 ? '· S/ '+precio.toFixed(2) : ''} ${venc}</div>
        ${item['Proveedor']?`<div class="inv-meta" style="font-size:10px">📍 ${item['Proveedor']}</div>`:''}
      </div>
      <div class="inv-stock">
        <div class="inv-qty ${cls}">${stock % 1 === 0 ? stock : stock.toFixed(1)}</div>
        <div class="inv-unit">${item['Unidad']||''}</div>
        ${minimo > 0 ? `<div style="font-size:9px;color:var(--muted)">mín. ${minimo}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-left:8px">
        <button class="btn btn-ghost btn-sm" style="padding:5px 8px;font-size:11px" onclick="openMovInventario('${item['ID']}')">± Mov.</button>
        <button class="btn btn-ghost btn-sm" style="padding:5px 8px;font-size:11px" onclick="openInventario('${item['ID']}')">✏️</button>
        ${puedeEliminar()?`<button class="btn btn-danger btn-sm" style="padding:5px 8px;font-size:11px" onclick="delInventario('${item['ID']}')">🗑</button>`:''}
      </div>
    </div>`;
  }).join('');
}

function cargarInventarioLocal() {
  try {
    const data = localStorage.getItem('vaqueroapp_inventario');
    if(data) {
      const all = JSON.parse(data);
      const rid = SESSION?.rancho_id;
      // Filtrar por rancho_id si está disponible, para evitar mezclar datos de otros ranchos
      DB.inventario = rid ? all.filter(x => !x['rancho_id'] || x['rancho_id'] === rid) : all;
    }
  } catch(e) { DB.inventario = []; }
}

// ══════════════════════════════════════════
// MÓDULO: FINANZAS AVANZADAS
// ══════════════════════════════════════════

let finTabActual = 'resumen';

function setFinTab(tab, btn) {
  finTabActual = tab;
  document.querySelectorAll('.fin-tab-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  ['resumen','ventas','movimientos'].forEach(t => {
    const el = document.getElementById('fin-tab-'+t);
    if(el) el.style.display = t === tab ? '' : 'none';
  });
  renderFinanzas();
}

function openVenta(id) {
  document.getElementById('venta-edit-id').value = '';
  document.getElementById('venta-fecha').value = new Date().toISOString().split('T')[0];
  clearF(['venta-animal','venta-precio','venta-comprador','venta-peso','venta-obs']);
  document.getElementById('venta-tipo').value = 'Venta directa';
  // Llenar datalist animales
  const dl = document.getElementById('lista-venta-animales');
  if(dl) dl.innerHTML = (DB.animales||[]).map(a => `<option value="${escH(a['Arete'])}${a['Nombre']?' — '+escH(a['Nombre']):''}">`).join('');
  if(id) {
    const v = (DB.ventas||[]).find(x => String(x['ID']) === String(id));
    if(!v) return;
    document.getElementById('venta-edit-id').value = id;
    document.getElementById('venta-animal').value = v['Animal']||'';
    document.getElementById('venta-fecha').value = v['Fecha']||'';
    document.getElementById('venta-precio').value = v['Precio']||'';
    document.getElementById('venta-comprador').value = v['Comprador']||'';
    document.getElementById('venta-peso').value = v['Peso']||'';
    document.getElementById('venta-tipo').value = v['TipoVenta']||'Venta directa';
    document.getElementById('venta-obs').value = v['Observaciones']||'';
  }
  openM('m-venta');
}

async function saveVenta() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const animal = document.getElementById('venta-animal').value.trim();
  const precio = document.getElementById('venta-precio').value;
  const fecha  = document.getElementById('venta-fecha').value;
  if(!animal || !precio || !fecha) { toast('⚠️ Completa los campos obligatorios'); return; }
  const editId = document.getElementById('venta-edit-id').value;
  const row = {
    'ID':           editId || String(Date.now()),
    'Animal':       animal,
    'Fecha':        fecha,
    'Precio':       parseFloat(precio)||0,
    'Comprador':    document.getElementById('venta-comprador').value.trim(),
    'Peso':         parseFloat(document.getElementById('venta-peso').value)||0,
    'TipoVenta':    document.getElementById('venta-tipo').value,
    'Observaciones': document.getElementById('venta-obs').value.trim()
  };
  if(!DB.ventas) DB.ventas = [];
  if(editId) {
    const idx = DB.ventas.findIndex(x => String(x['ID']) === String(editId));
    if(idx >= 0) DB.ventas[idx] = row; else DB.ventas.unshift(row);
  } else {
    DB.ventas.unshift(row);
    // También registrar en gastos como ingreso
    const rowGasto = {
      'ID': 'v'+row['ID'],
      'Tipo': 'Venta de animal',
      'Descripcion': `Venta: ${animal}`,
      'Monto': row['Precio'],
      'EsIngreso': 'SI',
      'Fecha': fecha,
      'Animal': animal,
      'Observaciones': row['Comprador'] ? 'Comprador: '+row['Comprador'] : ''
    };
    if(!DB.gastos) DB.gastos = [];
    DB.gastos.unshift(rowGasto);
    apiPostFast('insert','gastos', rowGasto);
  }
  localStorage.setItem('vaqueroapp_ventas', JSON.stringify(DB.ventas));
  renderFinanzas();
  renderGastos();
  closeM('m-venta');
  toast('✅ Venta registrada');
}

function delVenta(id) {
  if(!confirm('¿Eliminar esta venta?')) return;
  DB.ventas = (DB.ventas||[]).filter(x => String(x['ID']) !== String(id));
  localStorage.setItem('vaqueroapp_ventas', JSON.stringify(DB.ventas));
  renderFinanzas();
  toast('🗑 Eliminado');
}

function cargarVentasLocal() {
  try {
    const data = localStorage.getItem('vaqueroapp_ventas');
    if(data) DB.ventas = JSON.parse(data);
  } catch(e) { DB.ventas = []; }
}

function renderFinanzas() {
  if(!DB.gastos)  DB.gastos  = [];
  if(!DB.ventas)  DB.ventas  = [];
  const fmtMoney = n => 'S/ ' + parseFloat(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const esIngreso = g => { const v = String(g['EsIngreso']||'').toUpperCase(); return v==='SI'||v==='TRUE'||v==='1'; };

  // KPIs globales
  const totalIng = DB.gastos.filter(esIngreso).reduce((s,g)=>s+parseFloat(g['Monto']||0),0);
  const totalEgr = DB.gastos.filter(g=>!esIngreso(g)).reduce((s,g)=>s+parseFloat(g['Monto']||0),0);
  const balance  = totalIng - totalEgr;
  const ingEl = document.getElementById('fin-ingresos');
  const egrEl = document.getElementById('fin-egresos');
  const balEl = document.getElementById('fin-balance');
  if(ingEl) ingEl.textContent = fmtMoney(totalIng);
  if(egrEl) egrEl.textContent = fmtMoney(totalEgr);
  if(balEl){ balEl.textContent = fmtMoney(balance); balEl.style.color = balance>=0?'var(--green)':'var(--red)'; }

  if(finTabActual === 'resumen') {
    // Gráfico por mes
    const mesesNom = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const porMes = {};
    DB.gastos.forEach(g => {
      const f = g['Fecha']||''; if(!f) return;
      const key = f.substring(0,7);
      if(!porMes[key]) porMes[key] = {ing:0, egr:0};
      if(esIngreso(g)) porMes[key].ing += parseFloat(g['Monto']||0);
      else             porMes[key].egr += parseFloat(g['Monto']||0);
    });
    const mesesKeys = Object.keys(porMes).sort().slice(-6);
    const maxVal = Math.max(...mesesKeys.map(k => Math.max(porMes[k].ing, porMes[k].egr)), 1);
    const chartEl = document.getElementById('fin-chart-meses');
    if(chartEl) {
      if(!mesesKeys.length) {
        chartEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Sin datos aún</div>';
      } else {
        chartEl.innerHTML = mesesKeys.map(k => {
          const [y,m] = k.split('-');
          const lbl = mesesNom[parseInt(m)-1]+' '+y.slice(2);
          const pIng = Math.round((porMes[k].ing/maxVal)*100);
          const pEgr = Math.round((porMes[k].egr/maxVal)*100);
          const bal  = porMes[k].ing - porMes[k].egr;
          return `<div class="fin-mes-row">
            <div class="fin-mes-lbl">${lbl}</div>
            <div class="fin-mes-bars">
              <div class="fin-chart-bar"><div class="fin-chart-fill" style="width:${pIng}%;background:var(--green)"></div></div>
              <div class="fin-chart-bar"><div class="fin-chart-fill" style="width:${pEgr}%;background:var(--red)"></div></div>
            </div>
            <div class="fin-mes-vals" style="color:${bal>=0?'var(--green)':'var(--red)'}">${bal>=0?'+':''}${fmtMoney(bal)}</div>
          </div>`;
        }).join('');
      }
    }
    // Gráfico por categoría
    const porCat = {};
    DB.gastos.filter(g=>!esIngreso(g)).forEach(g => {
      const cat = g['Tipo']||'Otro';
      porCat[cat] = (porCat[cat]||0) + parseFloat(g['Monto']||0);
    });
    const catKeys = Object.keys(porCat).sort((a,b)=>porCat[b]-porCat[a]);
    const maxCat  = Math.max(...Object.values(porCat), 1);
    const catEl   = document.getElementById('fin-chart-cats');
    if(catEl) {
      if(!catKeys.length) {
        catEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">Sin egresos registrados</div>';
      } else {
        catEl.innerHTML = catKeys.map(cat => {
          const pct = Math.round((porCat[cat]/maxCat)*100);
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
              <span>${cat}</span>
              <span style="color:var(--muted)">${fmtMoney(porCat[cat])}</span>
            </div>
            <div class="fin-chart-bar" style="height:10px"><div class="fin-chart-fill" style="width:${pct}%;background:var(--accent2)"></div></div>
          </div>`;
        }).join('');
      }
    }
  }

  if(finTabActual === 'ventas') {
    const cont = document.getElementById('fin-ventas-list');
    if(!cont) return;
    const ventas = [...DB.ventas].sort((a,b)=>(b['Fecha']||'').localeCompare(a['Fecha']||''));
    if(!ventas.length) {
      cont.innerHTML = '<div class="empty"><div class="empty-e">🐂</div>Sin ventas registradas</div>';
      return;
    }
    cont.innerHTML = ventas.map(v => `<div class="fin-venta-card">
      <div class="fin-venta-head">
        <div>
          <div class="fin-venta-animal">🐄 ${v['Animal']||''}</div>
          <div class="fin-venta-meta">${v['TipoVenta']||''} · ${v['Fecha']?fmt(v['Fecha']):'—'} ${v['Comprador']?'· '+v['Comprador']:''}</div>
          ${v['Peso']>0?`<div class="fin-venta-meta">⚖️ ${v['Peso']} kg</div>`:''}
        </div>
        <div style="text-align:right">
          <div class="fin-venta-monto">${fmtMoney(v['Precio'])}</div>
          ${puedeEliminar()?`<button class="btn btn-danger btn-sm" style="margin-top:4px;font-size:10px" onclick="delVenta('${v['ID']}')">🗑</button>`:''}
        </div>
      </div>
      ${v['Observaciones']?`<div style="font-size:11px;color:var(--muted);margin-top:6px">${v['Observaciones']}</div>`:''}
    </div>`).join('');
  }

  if(finTabActual === 'movimientos') {
    // Llenar select meses
    const selMes = document.getElementById('fin-filtro-mes');
    if(selMes && selMes.options.length <= 1) {
      const mesesDisp = [...new Set(DB.gastos.map(g=>(g['Fecha']||'').substring(0,7)).filter(Boolean))].sort().reverse();
      const mesesNom2 = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      mesesDisp.forEach(m => {
        const [y,mm] = m.split('-');
        const opt = document.createElement('option');
        opt.value = m; opt.textContent = (mesesNom2[parseInt(mm)]||mm)+' '+y;
        selMes.appendChild(opt);
      });
    }
    const filtroTipo = document.getElementById('fin-filtro-tipo')?.value||'';
    const filtroMes2 = document.getElementById('fin-filtro-mes')?.value||'';
    let lista = [...DB.gastos];
    if(filtroTipo === 'ingreso') lista = lista.filter(esIngreso);
    if(filtroTipo === 'egreso')  lista = lista.filter(g=>!esIngreso(g));
    if(filtroMes2) lista = lista.filter(g=>(g['Fecha']||'').startsWith(filtroMes2));
    lista.sort((a,b)=>(b['Fecha']||'').localeCompare(a['Fecha']||''));
    const cont2 = document.getElementById('fin-movimientos-list');
    if(!cont2) return;
    if(!lista.length){cont2.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">Sin movimientos</div>';return;}
    cont2.innerHTML = lista.map(g=>{
      const esIng = esIngreso(g);
      return `<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:13px 15px;margin-bottom:7px;border-left:3px solid ${esIng?'var(--green)':'var(--red)'}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <div style="font-weight:600;font-size:13px">${g['Descripcion']||''}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${g['Tipo']||''} ${g['Animal']?'· '+g['Animal']:''} · ${g['Fecha']?fmt(g['Fecha']):'—'}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:${esIng?'var(--green)':'var(--red)'}">${esIng?'+':'−'}${fmtMoney(g['Monto'])}</div>
            ${puedeEliminar()?`<button class="btn btn-danger btn-sm" style="margin-top:4px;font-size:10px" onclick="delGasto('${g['ID']}');renderFinanzas()">🗑</button>`:''}
          </div>
        </div>
      </div>`;
    }).join('');
  }
}
// ══ FIN MÓDULOS ══

setInterval(async()=>{
  if(!SESSION) return;
  try {
    const token=localStorage.getItem('vaqueroapp_token');
    if(!token) return;
    const r=await fetch(SB_URL+'/auth/v1/user',{headers:{'apikey':SB_KEY,'Authorization':'Bearer '+token}});
    // Solo cerrar sesión si es 401 (token genuinamente inválido/expirado)
    // NO cerrar por errores de red (503, timeout, etc.)
    if(r.status === 401){
      logSecurityEvent('TOKEN_EXPIRED','Token expirado');
      doLogout();
    }
    // Si hay cualquier otro error (red, 500, etc.) → ignorar, no cerrar sesión
  } catch(e){
    // Error de red — NO cerrar sesión, el usuario puede estar sin internet temporalmente
    console.warn('Token check falló por red, ignorando:', e.message);
  }
},30*60*1000); // Cada 30 min en vez de 10 — reduce falsos positivos

// 9. CSP META
// 9. CSP META (ahora se define de forma estática en app.html, antes de cualquier script)
function addCSPMeta(){
  // No-op: el CSP ya está fijo en el <head> del HTML para evitar condiciones de carrera
  // con la carga del SDK de OneSignal.
}


// Registrar Service Worker para modo offline (todos los navegadores)
if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('✅ PWA SW v5 registrado');
        reg.update();
      })
      .catch(err => console.warn('SW error:', err));
  });
}
// Para iOS Safari: mostrar instrucción de instalación
function showInstallTip() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isInStandalone = window.navigator.standalone;
  if(isIOS && !isInStandalone) {
    setTimeout(()=>{
      toast('📱 iPhone: toca Compartir → "Añadir a pantalla de inicio" para usar sin internet');
    }, 1000);
  }
}
showInstallTip();

// Recargar suscripción cada 5 minutos
setInterval(()=>{
  if(SESSION?.user_id) cargarSuscripcion();
}, 5 * 60 * 1000);


// ══ PERFIL / CONFIG PDF ══
function cargarConfigPerfil() {
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  const rucEl = document.getElementById('config-ruc');
  const empEl = document.getElementById('config-empresa');
  const dirEl = document.getElementById('config-direccion');
  if(rucEl && cfg.ruc) rucEl.value = cfg.ruc;
  if(empEl && cfg.empresa) empEl.value = cfg.empresa;
  if(dirEl && cfg.direccion) dirEl.value = cfg.direccion;
  const logoOK = cfg.logo && cfg.logo.length > 500 && cfg.logo.startsWith('data:image');
  const prevImg = document.getElementById('logo-img-preview');
  const prevPh  = document.getElementById('logo-placeholder');
  const prevPdf = document.getElementById('preview-pdf-logo');
  const sb      = document.getElementById('sidebar-logo-display');
  if(logoOK) {
    if(prevImg) { prevImg.src = cfg.logo; prevImg.style.display = 'block'; }
    if(prevPh)  prevPh.style.display = 'none';
    if(prevPdf) prevPdf.innerHTML = '<img src="'+cfg.logo+'" style="height:50px;max-width:80px;object-fit:contain">';
    if(sb) sb.innerHTML = '<img src="'+cfg.logo+'" style="width:48px;height:48px;object-fit:contain;border-radius:8px">';
  } else {
    if(prevImg) prevImg.style.display = 'none';
    if(prevPh)  prevPh.style.display = 'block';
    if(sb) sb.innerHTML = '<span style="font-size:24px">🐄</span>';
  }
  const empPreview = document.getElementById('preview-pdf-empresa');
  const rucPreview = document.getElementById('preview-pdf-ruc');
  const dirPreview = document.getElementById('preview-pdf-dir');
  if(empPreview && cfg.empresa) empPreview.textContent = cfg.empresa;
  if(rucPreview && cfg.ruc) rucPreview.textContent = 'RUC: ' + cfg.ruc;
  if(dirPreview && cfg.direccion) dirPreview.textContent = cfg.direccion;
}

function guardarConfigPerfil() {
  const ruc = document.getElementById('config-ruc').value.trim();
  const empresa = document.getElementById('config-empresa').value.trim();
  const direccion = document.getElementById('config-direccion').value.trim();
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  cfg.ruc = ruc; cfg.empresa = empresa; cfg.direccion = direccion;
  localStorage.setItem('vaqueroapp_config_pdf', JSON.stringify(cfg));
  if(SESSION?.user_id || SESSION?.id) localStorage.setItem('vaqueroapp_pdf_owner', SESSION?.user_id || SESSION?.id);
  // Guardar también en Supabase
  if(SESSION?.user_id) {
    fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id, {
      method:'PATCH',
      headers:{...SB_HEADERS,'Prefer':'return=minimal'},
      body: JSON.stringify({
        ruc: ruc || null,
        empresa: empresa || null,
        direccion: direccion || null
      })
    }).catch(e=>console.warn('cfg save:', e));
  }
  if(empresa) document.getElementById('preview-pdf-empresa').textContent = empresa;
  if(ruc) document.getElementById('preview-pdf-ruc').textContent = 'RUC: ' + ruc;
  if(direccion) document.getElementById('preview-pdf-dir').textContent = direccion;
  toast('✅ Datos guardados en todos los dispositivos');
}

function cargarLogoPreview(input) {
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024) { toast('⚠️ El logo no debe superar 2MB'); return; }
  const reader = new FileReader();
  reader.onload = function(e) {
    const b64 = e.target.result;
    document.getElementById('logo-img-preview').src = b64;
    document.getElementById('logo-img-preview').style.display = 'block';
    document.getElementById('logo-placeholder').style.display = 'none';
    document.getElementById('preview-pdf-logo').innerHTML = '<img src="'+b64+'" style="height:50px;max-width:80px;object-fit:contain">';
    const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
    cfg.logo = b64;
    localStorage.setItem('vaqueroapp_config_pdf', JSON.stringify(cfg));
    if(SESSION?.user_id||SESSION?.id) localStorage.setItem('vaqueroapp_pdf_owner', SESSION?.user_id||SESSION?.id);
    // Actualizar logo en sidebar
    const _sb = document.getElementById('sidebar-logo-display');
    if(_sb) _sb.innerHTML = '<img src="'+b64+'" style="width:48px;height:48px;object-fit:contain;border-radius:8px">';
    // Guardar logo en Supabase para que se vea en todos los dispositivos
    if(SESSION?.user_id) {
      fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id, {
        method:'PATCH',
        headers:{...SB_HEADERS,'Prefer':'return=minimal'},
        body: JSON.stringify({ logo: b64 })
      }).then(r=>{ if(r.ok) toast('✅ Logo guardado en todos los dispositivos'); else r.text().then(t=>console.warn('logo save error:',t)); })
        .catch(e=>console.warn('logo save:', e));
    }
    toast('✅ Logo guardado en todos los dispositivos');
  };
  reader.readAsDataURL(file);
}

function eliminarLogo() {
  document.getElementById('logo-img-preview').style.display = 'none';
  document.getElementById('logo-placeholder').style.display = 'block';
  document.getElementById('preview-pdf-logo').innerHTML = '🐄';
  document.getElementById('logo-upload').value = '';
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  delete cfg.logo;
  localStorage.setItem('vaqueroapp_config_pdf', JSON.stringify(cfg));
  // Borrar logo en Supabase también
  if(SESSION?.user_id) {
    fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id, {
      method:'PATCH',
      headers:{...SB_HEADERS,'Prefer':'return=minimal'},
      body: JSON.stringify({ logo: null })
    }).catch(e=>console.warn('logo delete:', e));
  }
  const sb = document.getElementById('sidebar-logo-display');
  if(sb) sb.innerHTML = '<span style="font-size:24px">🐄</span>';
}


function getCfgRUC() {
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  return cfg.ruc || '';
}
function getCfgEmpresa() {
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  return cfg.empresa || SESSION?.rancho_nombre || 'Mi Ganadería';
}
function getCfgDir() {
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  return cfg.direccion || '';
}

function getPDFHeader() {
  const currentUser = SESSION?.user_id || SESSION?.id || '';
  const savedOwner = localStorage.getItem('vaqueroapp_pdf_owner');
  if(currentUser && savedOwner && savedOwner !== currentUser) {
    localStorage.removeItem('vaqueroapp_config_pdf');
    localStorage.setItem('vaqueroapp_pdf_owner', currentUser);
  }
  const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
  const empresa   = cfg.empresa   || SESSION?.rancho_nombre || 'Mi Ganadería';
  const ruc       = cfg.ruc       || '';
  const direccion = cfg.direccion || '';
  const logoOK    = cfg.logo && cfg.logo.length > 500 && cfg.logo.startsWith('data:image');
  const logoHTML  = logoOK
    ? '<img src="' + cfg.logo + '" style="height:60px;max-width:120px;object-fit:contain">'
    : '<div style="font-size:42px">&#x1F404;</div>';
  const rucHTML  = ruc       ? '<div style="font-size:12px;color:#555">RUC: ' + ruc + '</div>' : '';
  const dirHTML  = direccion ? '<div style="font-size:12px;color:#555">' + direccion + '</div>' : '';
  return '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #4a9e1a;padding-bottom:12px;margin-bottom:16px">'
    + '<div style="display:flex;align-items:center;gap:14px">'
      + '<div>' + logoHTML + '</div>'
      + '<div>'
        + '<div style="font-size:18px;font-weight:700;color:#1a3a0a">' + empresa + '</div>'
        + rucHTML + dirHTML
      + '</div>'
    + '</div>'
    + '<div style="text-align:right">'
      + '<div style="font-weight:700;color:#1a3a0a;font-size:14px">VAQUEROAPP</div>'
      + '<div style="font-size:11px;color:#777">Gestión Ganadera Digital</div>'
      + '<div style="font-size:11px;color:#777">' + new Date().toLocaleDateString('es-PE') + '</div>'
    + '</div>'
  + '</div>';
}


// ══════════════════════════════════════════
// VAQUEROAPP — LÓGICA DE SUSCRIPCIONES
// ══════════════════════════════════════════

var PLAN_INFO = {
  trial:    { nombre:'Trial Gratuito', animales:5,   dias:7,  precio:0,   color:'#888' },
  basico:   { nombre:'Plan Básico',    animales:50,  dias:30, precio:35,  color:'#4a9e1a' },
  estandar: { nombre:'Plan Estándar',  animales:100, dias:30, precio:70,  color:'#2d6a00' },
  premium:  { nombre:'Plan Premium',   animales:999, dias:30, precio:120, color:'var(--accent)' }
};

var SUSCRIPCION = null; // se carga al iniciar sesión
var MODO_LECTURA = false; // true cuando suscripción vencida/suspendida

// Verificar si está en modo lectura
function esModoLectura() { return MODO_LECTURA; }

// Aplicar modo lectura — deshabilita todos los botones de acción
function aplicarModoLectura() {
  MODO_LECTURA = true;
  // Ocultar botones de agregar/guardar/editar/eliminar
  const selectores = [
    'button[onclick*="openM("]',
    'button[onclick*="saveAnimal"]',
    'button[onclick*="saveSalud"]',
    'button[onclick*="saveInsem"]',
    'button[onclick*="saveParto"]',
    'button[onclick*="saveGasto"]',
    'button[onclick*="saveInventario"]',
    'button[onclick*="saveProveedor"]',
    'button[onclick*="saveOrden"]',
    'button[onclick*="saveVenta"]',
    'button[onclick*="openInventario"]',
    'button[onclick*="openGasto"]',
    'button[onclick*="openVenta"]',
    'button[onclick*="openModalProveedor"]',
    'button[onclick*="openModalOrden"]',
    'button[onclick*="eliminar"]',
    'button[onclick*="Eliminar"]',
    '#btn-save-animal'
  ];
  selectores.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.35';
      btn.style.cursor = 'not-allowed';
      btn.title = '🔒 Suscripción vencida — solo lectura';
    });
  });
  // Mostrar banner de modo lectura
  mostrarBannerModoLectura();
}

// Banner fijo arriba avisando modo lectura
function mostrarBannerModoLectura() {
  if(document.getElementById('banner-modo-lectura')) return;
  const banner = document.createElement('div');
  banner.id = 'banner-modo-lectura';
  banner.style.cssText = `
    position:fixed;top:0;left:0;right:0;z-index:9998;
    background:linear-gradient(90deg,#c0392b,#e74c3c);
    color:#fff;text-align:center;padding:10px 16px;
    font-size:13px;font-weight:600;line-height:1.4;
    display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;
    box-shadow:0 2px 12px rgba(0,0,0,.3);
  `;
  banner.innerHTML = `
    <span>🔒 <strong>Modo solo lectura</strong> — Tu suscripción está vencida o suspendida. Puedes ver tus datos pero no editar.</span>
    <button onclick="goTo('suscripcion')" style="background:#fff;color:#c0392b;border:none;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">
      💳 Renovar ahora
    </button>
  `;
  document.body.prepend(banner);
  // Empujar el contenido hacia abajo
  const main = document.getElementById('pantalla-dash');
  if(main) main.style.paddingTop = (parseInt(main.style.paddingTop||0) + 44) + 'px';
  const sidebar = document.querySelector('.sidebar');
  if(sidebar) sidebar.style.paddingTop = (parseInt(sidebar.style.paddingTop||0) + 44) + 'px';
}

// Cargar suscripción del usuario
async function cargarSuscripcion() {
  if(!SESSION?.user_id) return;

  // ── SIEMPRE cargar desde localStorage primero (funciona offline) ──
  try {
    const s = localStorage.getItem('vqa_offline_suscripcion');
    if(s) {
      SUSCRIPCION = JSON.parse(s);
      actualizarBadgePlan();
    }
  } catch(e) {}

  // ── Luego intentar actualizar desde red (si hay conexión) ──
  if (!navigator.onLine) {
    // Sin internet — usar lo que hay en localStorage
    if(!SUSCRIPCION) MODO_LECTURA = true;
    actualizarBadgePlan();
    return SUSCRIPCION;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const r = await fetch(SB_URL + '/rest/v1/suscripciones?user_id=eq.' + SESSION.user_id +
      '&estado=eq.activo&order=fecha_vencimiento.desc&limit=1', {
      headers: SB_HEADERS,
      signal: controller.signal
    });
    clearTimeout(timeout);
    const data = await r.json();
    // Verificar si hay suscripción activa y no vencida
    const susActiva = Array.isArray(data) && data.length > 0 &&
      (!data[0].fecha_vencimiento || new Date(data[0].fecha_vencimiento) > new Date());

    if(susActiva) {
      // Suscripción válida — usar directamente
      SUSCRIPCION = data[0];
      localStorage.setItem('vqa_offline_suscripcion', JSON.stringify(SUSCRIPCION));
    } else {
      // Sin suscripción válida (no existe o vencida) — crear Trial automáticamente
      SUSCRIPCION = null;
      localStorage.removeItem('vqa_offline_suscripcion');
      try {
        const hoy = new Date();
        const venc = new Date(hoy);
        venc.setDate(venc.getDate() + 7);
        const trialBody = {
          user_id: SESSION.user_id,
          plan: 'trial',
          estado: 'activo',
          limite_animales: 5,
          fecha_inicio: hoy.toISOString().split('T')[0],
          fecha_vencimiento: venc.toISOString().split('T')[0]
        };
        const trialRes = await fetch(SB_URL + '/rest/v1/suscripciones', {
          method: 'POST',
          headers: { ...SB_HEADERS, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
          body: JSON.stringify(trialBody)
        });
        const trialCreada = await trialRes.json();
        const trialSus = Array.isArray(trialCreada) ? trialCreada[0] : trialCreada;
        if(trialSus?.id) {
          SUSCRIPCION = trialSus;
          localStorage.setItem('vqa_offline_suscripcion', JSON.stringify(SUSCRIPCION));
            }
      } catch(trialErr) {
        console.warn('No se pudo crear Trial automático:', trialErr.message);
      }
    }
    if(SUSCRIPCION) {
      MODO_LECTURA = false;
    } else {
      MODO_LECTURA = true;
      setTimeout(aplicarModoLectura, 800);
    }
    actualizarBadgePlan(); return SUSCRIPCION;
  } catch(e) {
    // Error de red — usar lo que ya cargamos de localStorage
    console.warn('Suscripción: usando caché local', e.message);
    if(SUSCRIPCION) MODO_LECTURA = false;
    actualizarBadgePlan(); return SUSCRIPCION;
  }
}

// Verificar si puede agregar más animales
function puedeAgregarAnimal() {
  if(!SUSCRIPCION) return { puede: false, motivo: 'sin_plan' };
  const limite = SUSCRIPCION.limite_animales;
  const actual = DB.animales ? DB.animales.length : 0;
  if(limite >= 999) return { puede: true }; // premium ilimitado
  if(actual >= limite) return {
    puede: false,
    motivo: 'limite',
    mensaje: 'Has alcanzado el límite de ' + limite + ' animales de tu plan ' + SUSCRIPCION.plan + '.'
  };
  return { puede: true, restantes: limite - actual };
}

// Mostrar badge del plan en sidebar
function actualizarBadgePlan() {
  const badge = document.getElementById('plan-badge');
  if(!badge) return;
  if(!SUSCRIPCION) {
    badge.innerHTML = '<span style="color:#ff6464;font-size:10px">⚠️ Sin plan activo</span>';
    return;
  }
  const plan = PLAN_INFO[SUSCRIPCION.plan] || { nombre: SUSCRIPCION.plan, color: '#888' };
  const venc = SUSCRIPCION.fecha_vencimiento ? new Date(SUSCRIPCION.fecha_vencimiento) : null;
  const dias = venc ? Math.ceil((venc - new Date()) / (1000*60*60*24)) : null;
  badge.innerHTML = '<span style="background:' + plan.color + '20;color:' + plan.color + 
    ';border:1px solid ' + plan.color + '40;border-radius:8px;padding:2px 8px;font-size:10px;font-weight:700">' +
    plan.nombre + '</span>' +
    (dias !== null ? '<span style="font-size:9px;color:var(--muted);margin-left:4px">' + dias + 'd</span>' : '');
}

// Hook en guardarAnimal para verificar límite
var _guardarAnimalOrig = typeof guardarAnimal === 'function' ? guardarAnimal : null;

// Mostrar modal de suscripción vencida / límite alcanzado
function mostrarModalSuscripcion(motivo) {
  const msg = motivo === 'sin_plan'
    ? '⚠️ No tienes un plan activo. Para continuar usando VaqueroApp necesitas una suscripción.'
    : '🔒 Has alcanzado el límite de animales de tu plan actual. Suscríbete a un plan superior.';
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = `
    <div style="background:var(--card);border-radius:20px;padding:32px;max-width:420px;width:100%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.4)">
      <div style="font-size:48px;margin-bottom:12px">🐄</div>
      <h3 style="font-family:'Plus Jakarta Sans',sans-serif;color:var(--text);margin-bottom:12px">Suscripción requerida</h3>
      <p style="color:var(--muted);font-size:14px;margin-bottom:24px;line-height:1.6">${msg}</p>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="goTo('suscripcion');this.closest('[style*=fixed]').remove()" 
          style="background:var(--accent);color:#fff;border:none;padding:14px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer">
          💳 Ver planes y precios
        </button>
        <button onclick="window.open('https://wa.me/51975561764?text=Hola,%20quiero%20suscribirme%20a%20VaqueroApp','_blank')"
          style="background:#25D366;color:#fff;border:none;padding:12px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer">
          📱 Pagar por WhatsApp
        </button>
        <button onclick="this.closest('[style*=fixed]').remove()"
          style="background:transparent;border:none;color:var(--muted);font-size:13px;cursor:pointer;padding:8px">
          Cancelar
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

// Página de suscripción / planes
function renderSuscripcion() {
  const cont = document.getElementById('page-suscripcion');
  if(!cont) return;
  const plan_actual = SUSCRIPCION?.plan || 'ninguno';
  const venc = SUSCRIPCION?.fecha_vencimiento ? new Date(SUSCRIPCION.fecha_vencimiento).toLocaleDateString('es-PE') : '—';
  const animales_usados = DB.animales ? DB.animales.length : 0;
  const limite = SUSCRIPCION?.limite_animales || 0;
  const dias = SUSCRIPCION?.fecha_vencimiento ? Math.ceil((new Date(SUSCRIPCION.fecha_vencimiento)-new Date())/(1000*60*60*24)) : 0;

  cont.innerHTML = `
  <div class="topbar"><div class="page-title">💳 <em>Mi Suscripción</em></div></div>
  <div style="max-width:680px;margin:0 auto;padding:0 4px">

    <!-- Estado actual -->
    <div class="tcard" style="margin-bottom:16px;border:2px solid var(--accent)">
      <div style="padding:16px 20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Plan actual</div>
          <div style="font-size:20px;font-weight:700;color:var(--text)">${PLAN_INFO[plan_actual]?.nombre || 'Sin plan'}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">Vence: ${venc} ${dias>0?'('+dias+' días)':''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Animales</div>
          <div style="font-size:22px;font-weight:700;color:var(--accent)">${animales_usados}<span style="font-size:13px;color:var(--muted)"> / ${limite>=999?'∞':limite}</span></div>
          <div style="width:100px;height:5px;background:var(--bg2);border-radius:3px;margin-top:5px;overflow:hidden;margin-left:auto">
            <div style="height:100%;background:var(--accent);border-radius:3px;width:${limite>=999?20:Math.min(100,animales_usados/Math.max(limite,1)*100)}%"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Planes -->
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">Planes disponibles</div>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
      ${Object.entries(PLAN_INFO).filter(([k])=>k!=='trial').map(([key,p])=>`
        <div style="background:var(--card);border:2px solid ${key===plan_actual?'var(--accent)':'var(--border2)'};border-radius:14px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s" onclick="seleccionarPlan('${key}')">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${p.nombre}</div>
          <div style="font-size:28px;font-weight:700;color:var(--text)">S/${p.precio}</div>
          <div style="font-size:11px;color:var(--muted);margin:4px 0 10px">/mes</div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:12px">🐄 ${p.animales>=999?'Ilimitados':'Hasta '+p.animales+' animales'}</div>
          ${key!==plan_actual?`<div style="background:var(--accent);color:var(--bg);padding:7px;border-radius:8px;font-size:12px;font-weight:700">Seleccionar →</div>`:`<div style="color:var(--accent);font-weight:700;font-size:12px">✓ Plan actual</div>`}
        </div>`).join('')}
    </div>

    <!-- Formulario de pago con voucher -->
    <div class="tcard" id="form-pago-card">
      <div class="tcard-head"><div class="tcard-title">💰 Realizar pago</div></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:14px">

        <!-- Plan seleccionado -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Plan seleccionado</div>
          <select id="pago-plan" style="width:100%;background:var(--bg2);border:1.5px solid var(--border2);border-radius:10px;color:var(--text);padding:10px 12px;font-size:14px;font-family:inherit;outline:none" onchange="actualizarMontoPago(this)">
            <option value="">— Elige un plan —</option>
            <option value="basico">Básico — 50 animales / S/35</option>
            <option value="estandar">Estándar — 100 animales / S/70</option>
            <option value="premium">Premium — Ilimitado / S/120</option>
          </select>
        </div>

        <!-- Monto -->
        <div id="monto-info" style="display:none;background:rgba(184,221,60,.1);border:1px solid var(--accent);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:11px;color:var(--muted)">Monto a pagar</div>
          <div id="monto-display" style="font-size:24px;font-weight:700;color:var(--accent)">S/0</div>
        </div>

        <!-- Método de pago -->
        <div>
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Método de pago</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div id="btn-yape" onclick="seleccionarMetodo('yape')" style="border:2px solid var(--border2);border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .2s">
              <div style="font-size:20px">📱</div>
              <div style="font-size:12px;font-weight:600;color:var(--text2);margin-top:4px">Plin</div>
            </div>
            <div id="btn-transferencia" onclick="seleccionarMetodo('transferencia')" style="border:2px solid var(--border2);border-radius:10px;padding:12px;text-align:center;cursor:pointer;transition:all .2s">
              <div style="font-size:20px">🏦</div>
              <div style="font-size:12px;font-weight:600;color:var(--text2);margin-top:4px">Transferencia</div>
            </div>
          </div>
        </div>

        <!-- Datos de pago (aparece al seleccionar método) -->
        <div id="datos-pago" style="display:none;background:var(--bg2);border-radius:10px;padding:14px">
          <div id="datos-yape" style="display:none">
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">📱 Datos para Plin:</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.8">
              📞 <strong style="color:var(--accent)">+51 975 561 764</strong><br>
              👤 Nombre: <strong>Jose David Perez</strong><br>
              💬 Concepto: <strong>VaqueroApp - ${SESSION?.email||''}</strong>
            </div>
          </div>
          <div id="datos-transferencia" style="display:none">
            <div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:8px">🏦 Datos bancarios:</div>
            <div style="font-size:13px;color:var(--text2);line-height:1.8">
              🏛️ Banco: <strong>BBWA</strong><br>
              💳 Cuenta: <strong>0011-0579-0237092030</strong><br>
              📋 CCI: <strong>01157900023709203004</strong><br>
              👤 Titular: <strong>Jose David Perez</strong>
            </div>
          </div>
        </div>

        <!-- N° de operación -->
        <div id="campo-operacion" style="display:none">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">N° de operación / referencia</div>
          <input class="inp" type="text" id="pago-referencia" placeholder="Ej: 123456789">
        </div>

        <!-- Subir voucher -->
        <div id="campo-voucher" style="display:none">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">📸 Foto del comprobante</div>
          <label for="voucher-upload" id="voucher-label" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:2px dashed var(--border2);border-radius:12px;padding:20px;cursor:pointer;transition:border-color .2s;min-height:100px">
            <span style="font-size:32px">📎</span>
            <span style="font-size:13px;color:var(--muted)">Toca para subir tu voucher</span>
            <span style="font-size:11px;color:var(--muted)">JPG, PNG · Máx 5MB</span>
          </label>
          <input type="file" id="voucher-upload" accept="image/*" style="display:none" onchange="previsualizarVoucher(this)">
          <div id="voucher-preview" style="display:none;margin-top:10px;text-align:center">
            <img id="voucher-img" style="max-width:100%;max-height:200px;border-radius:10px;border:1px solid var(--border2)">
            <div style="font-size:11px;color:var(--green);margin-top:6px">✅ Voucher listo</div>
          </div>
        </div>

        <!-- Notas opcionales -->
        <div id="campo-notas" style="display:none">
          <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Mensaje opcional</div>
          <textarea id="pago-notas" rows="2" placeholder="Algo que quieras comentar..." style="width:100%;background:var(--bg2);border:1.5px solid var(--border2);border-radius:10px;color:var(--text);padding:10px 12px;font-size:13px;font-family:inherit;outline:none;resize:none"></textarea>
        </div>

        <!-- Botón enviar -->
        <button id="btn-enviar-pago" onclick="enviarSolicitudPago()" style="display:none;width:100%;padding:14px;background:var(--accent);color:var(--bg);border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit">
          📤 Enviar solicitud de pago
        </button>

      </div>
    </div>

    <!-- Historial de pagos -->
    <div class="tcard" style="margin-top:16px">
      <div class="tcard-head"><div class="tcard-title">📋 Mis pagos</div></div>
      <div id="historial-pagos-cliente" style="padding:10px">
        <div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Cargando...</div>
      </div>
    </div>

  </div>`;

  cargarHistorialPagosCliente();
}

var _metodoSeleccionado = '';
var _voucherBase64 = '';

function seleccionarPlan(plan) {
  document.getElementById('pago-plan').value = plan;
  actualizarMontoPago(document.getElementById('pago-plan'));
  document.getElementById('form-pago-card').scrollIntoView({behavior:'smooth'});
}

function actualizarMontoPago(sel) {
  const precios = {basico:35, estandar:70, premium:120};
  const v = sel.value;
  const info = document.getElementById('monto-info');
  const disp = document.getElementById('monto-display');
  if(v && precios[v]) {
    info.style.display = 'block';
    disp.textContent = 'S/' + precios[v];
  } else {
    info.style.display = 'none';
  }
}

function seleccionarMetodo(metodo) {
  _metodoSeleccionado = metodo;
  // Highlight selected
  document.getElementById('btn-yape').style.borderColor = metodo==='yape' ? 'var(--accent)' : 'var(--border2)';
  document.getElementById('btn-transferencia').style.borderColor = metodo==='transferencia' ? 'var(--accent)' : 'var(--border2)';
  // Show datos
  document.getElementById('datos-pago').style.display = 'block';
  document.getElementById('datos-yape').style.display = metodo==='yape' ? 'block' : 'none';
  document.getElementById('datos-transferencia').style.display = metodo==='transferencia' ? 'block' : 'none';
  // Show fields
  document.getElementById('campo-operacion').style.display = 'block';
  document.getElementById('campo-voucher').style.display = 'block';
  document.getElementById('campo-notas').style.display = 'block';
  document.getElementById('btn-enviar-pago').style.display = 'block';
}

function previsualizarVoucher(input) {
  const file = input.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024) { toast('⚠️ El archivo no debe superar 5MB'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    _voucherBase64 = e.target.result;
    document.getElementById('voucher-preview').style.display = 'block';
    document.getElementById('voucher-img').src = _voucherBase64;
    document.getElementById('voucher-label').style.borderColor = 'var(--green)';
  };
  reader.readAsDataURL(file);
}

async function enviarSolicitudPago() {
  const plan = document.getElementById('pago-plan').value;
  const ref  = document.getElementById('pago-referencia').value.trim();
  const notas= document.getElementById('pago-notas')?.value?.trim() || '';
  const precios = {basico:35, estandar:70, premium:120};

  if(!plan)              { toast('⚠️ Selecciona un plan'); return; }
  if(!_metodoSeleccionado){ toast('⚠️ Selecciona un método de pago'); return; }
  if(!ref)               { toast('⚠️ Ingresa el N° de operación'); return; }
  if(!_voucherBase64)    { toast('⚠️ Sube la foto de tu comprobante'); return; }

  const btn = document.getElementById('btn-enviar-pago');
  btn.textContent = '⏳ Enviando...'; btn.disabled = true;

  try {
    // Guardar pago en Supabase
    const res = await fetch(SB_URL+'/rest/v1/pagos', {
      method:'POST',
      headers:{...SB_HEADERS,'Prefer':'return=minimal'},
      body: JSON.stringify({
        user_id:         SESSION.user_id,
        plan,
        monto:           precios[plan],
        moneda:          'PEN',
        metodo_pago:     _metodoSeleccionado,
        estado:          'pendiente',
        referencia_pago: ref,
        notas:           notas + (notas?' | ':'') + 'Email: '+SESSION.email+' | Rancho: '+SESSION.rancho_nombre,
        voucher_url:     _voucherBase64.substring(0,500) // guardamos inicio para referencia
      })
    });

    if(!res.ok) throw new Error('Error al enviar');

    // Notificar por WhatsApp al admin
    const msg = encodeURIComponent(
      '🐄 *NUEVO PAGO VAQUEROAPP*\n\n' +
      '👤 Cliente: ' + SESSION.email + '\n' +
      '🏠 Rancho: ' + (SESSION.rancho_nombre||'—') + '\n' +
      '💳 Plan: ' + plan.charAt(0).toUpperCase()+plan.slice(1) + '\n' +
      '💰 Monto: S/' + precios[plan] + '\n' +
      '📱 Método: ' + _metodoSeleccionado + '\n' +
      '🔢 Operación: ' + ref + '\n' +
      (notas?'📝 Nota: '+notas+'\n':'') +
      '\n✅ Revisar panel admin para aprobar'
    );
    window.open('https://wa.me/51975561764?text='+msg, '_blank');

    toast('✅ Solicitud enviada. Te activamos en menos de 1 hora.');
    btn.textContent = '✅ Solicitud enviada';
    // Reset form
    _voucherBase64 = ''; _metodoSeleccionado = '';
    setTimeout(()=>{ cargarSuscripcion().then(()=>renderSuscripcion()); }, 2000);
  } catch(e) {
    toast('❌ Error: '+e.message);
    btn.textContent = '📤 Enviar solicitud de pago';
    btn.disabled = false;
  }
}

async function cargarHistorialPagosCliente() {
  if(!SESSION?.user_id) return;
  try {
    const r = await fetch(SB_URL+'/rest/v1/pagos?user_id=eq.'+SESSION.user_id+'&order=created_at.desc&limit=10', {
      headers: SB_HEADERS
    });
    const data = await r.json();
    const cont = document.getElementById('historial-pagos-cliente');
    if(!cont) return;
    if(!Array.isArray(data)||!data.length) {
      cont.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">Sin pagos registrados</div>';
      return;
    }
    const estados = {pendiente:'🟡 Pendiente', aprobado:'✅ Aprobado', rechazado:'❌ Rechazado'};
    cont.innerHTML = data.map(p=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:6px">
        <div>
          <div style="font-size:13px;font-weight:600;color:var(--text)">${p.plan?.charAt(0).toUpperCase()+p.plan?.slice(1)||'—'} — S/${p.monto||'—'}</div>
          <div style="font-size:11px;color:var(--muted)">${p.metodo_pago||'—'} · ${new Date(p.created_at).toLocaleDateString('es-PE')}</div>
        </div>
        <div style="font-size:12px;font-weight:600">${estados[p.estado]||p.estado}</div>
      </div>`).join('');
  } catch(e) {}
}


function solicitarPlan(plan) {
  const p = PLAN_INFO[plan];
  const msg = encodeURIComponent('Hola, quiero contratar el ' + p.nombre + ' (S/' + p.precio + '/mes) para mi cuenta en VaqueroApp. Mi correo es: ' + (SESSION?.email || ''));
  window.open('https://wa.me/51975561764?text=' + msg, '_blank');
}


// Guardar perfil en tabla perfiles (para que admin lo vea)
async function guardarPerfilEnDB() {
  if(!SESSION?.user_id) return;
  try {
    const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
    // Primero verificar si ya existe el perfil
    const chk = await fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id+'&select=id', {headers: SB_HEADERS});
    const chkData = await chk.json();
    const method  = chkData && chkData.length > 0 ? 'PATCH' : 'POST';
    const url     = method === 'PATCH'
      ? SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id
      : SB_URL+'/rest/v1/perfiles';
    const body = method === 'PATCH'
      ? { email: SESSION.email, nombre: SESSION.nombre, rancho_nombre: SESSION.rancho_nombre }
      : { id: SESSION.user_id, email: SESSION.email, nombre: SESSION.nombre, rancho_nombre: SESSION.rancho_nombre };
    await fetch(url, {
      method,
      headers:{...SB_HEADERS,'Prefer':'return=minimal'},
      body: JSON.stringify(body)
    });
  } catch(e) { console.warn('perfil save:', e); }
}

async function cargarPerfilDesdeDB() {
  if(!SESSION?.user_id) return;
  try {
    const res = await fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id+'&select=logo,ruc,empresa,direccion,rancho_nombre,nombre', {
      headers: SB_HEADERS
    });
    if(!res.ok) { console.warn('perfil load HTTP:', res.status); return; }
    const data = await res.json();
    if(!data || !data[0]) { console.warn('perfil load: no data'); return; }
    const p = data[0];
    const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf') || '{}');
    // Solo actualizar si Supabase tiene datos (no borrar con null)
    if(p.logo)      cfg.logo      = p.logo;
    if(p.ruc)       cfg.ruc       = p.ruc;
    if(p.empresa)   cfg.empresa   = p.empresa;
    if(p.direccion) cfg.direccion = p.direccion;
    localStorage.setItem('vaqueroapp_config_pdf', JSON.stringify(cfg));
    localStorage.setItem('vaqueroapp_pdf_owner', SESSION.user_id);
    if(p.rancho_nombre) { SESSION.rancho_nombre = p.rancho_nombre; }
    if(p.nombre) { SESSION.nombre = p.nombre; }
    localStorage.setItem('vaqueroapp_session', JSON.stringify(SESSION));
    // Aplicar logo INMEDIATAMENTE en sidebar
    if(p.logo && p.logo.length > 100) {
      const sb = document.getElementById('sidebar-logo-display');
      if(sb) sb.innerHTML = '<img src="'+p.logo+'" style="width:48px;height:48px;object-fit:contain;border-radius:8px">';
    }
    // Actualizar nombre rancho en sidebar
    if(p.rancho_nombre) {
      const rn = document.getElementById('sidebar-rancho-nombre');
      if(rn) rn.textContent = p.rancho_nombre;
    }
    cargarConfigPerfil();
  } catch(e) { console.warn('perfil load error:', e); }
}


// Normalizar campos de animal (Supabase devuelve minúsculas)
function normAnimal(a) {
  if(!a) return a;
  return {
    'ID':           a.id || a['ID'],
    'Arete':        a.arete || a['Arete'],
    'Nombre':       a.nombre || a['Nombre'],
    'Raza':         a.raza || a['Raza'],
    'Sexo':         a.sexo || a['Sexo'],
    'Nacimiento':   a.nacimiento || a['Nacimiento'],
    'Peso':         a.peso || a['Peso'],
    'Estado':       a.estado || a['Estado'] || 'Activo',
    'Madre':        a.madre || a['Madre'],
    'Observaciones':a.observaciones || a['Observaciones'],
    'Foto':         a.foto || a['Foto'],
    'FechaRegistro':a.created_at ? new Date(a.created_at).toLocaleDateString('es-PE') : (a['FechaRegistro']||''),
    'rancho_id':    a.rancho_id
  };
}

// ══ SOPORTE ══
function enviarSoporte(via) {
  const asunto = document.getElementById('soporte-asunto').value;
  const msg    = document.getElementById('soporte-mensaje').value.trim();
  if(!msg) { toast('Escribe tu mensaje primero'); return; }
  const asuntoTexto = document.getElementById('soporte-asunto').options[document.getElementById('soporte-asunto').selectedIndex].text;
  const rancho  = SESSION?.rancho_nombre || '';
  const email   = SESSION?.email || '';
  const fullMsg = `Hola, soy ${email} (Rancho: ${rancho}).%0A%0AAsunto: ${asuntoTexto}%0A%0A${encodeURIComponent(msg)}`;
  if(via === 'whatsapp') {
    window.open('https://wa.me/51975561764?text=' + fullMsg, '_blank');
  } else {
    window.open('mailto:justweb8@gmail.com?subject=VaqueroApp - ' + asuntoTexto + '&body=' + fullMsg, '_blank');
  }
}

function toggleFaq(el) {
  const resp  = el.querySelector('.faq-resp');
  const arrow = el.querySelector('.faq-arrow');
  const open  = resp.style.display === 'block';
  resp.style.display  = open ? 'none' : 'block';
  arrow.style.transform = open ? '' : 'rotate(180deg)';
}



// MÓDULO: IMPORTACIÓN DE ANIMALES
var IMPORT_DATA = {};

function descargarPlantillaAnimales() {
  try {
    var b64data = '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';
    var bc = atob(b64data), ba = new Uint8Array(bc.length);
    for(var i=0;i<bc.length;i++) ba[i]=bc.charCodeAt(i);
    var blob = new Blob([ba],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href=url; a.download='VaqueroApp_Plantilla_Animales.xlsx'; a.click();
    URL.revokeObjectURL(url);
    toast('✅ Plantilla descargada');
  } catch(e){ toast('❌ '+e.message); }
}

function handleImportDrop(e) {
  e.preventDefault();
  document.getElementById('import-dropzone').style.background='';
  var file=e.dataTransfer.files[0]; if(file) handleImportFile(file);
}

function handleImportFile(file) {
  if(!file||!file.name.endsWith('.xlsx')){toast('⚠️ Solo archivos .xlsx');return;}
  document.getElementById('import-file-name').textContent='📄 '+file.name;
  toast('🔄 Leyendo archivo...');
  var reader=new FileReader();
  reader.onload=function(ev){
    try{
      if(typeof XLSX==='undefined'){toast('❌ Librería XLSX no disponible');return;}
      var wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});
      // Buscar la hoja de animales
      var wsName=null;
      wb.SheetNames.forEach(function(n){
        var k=n.toLowerCase().replace(/[^a-z]/g,'');
        if(k.indexOf('animal')>=0||k==='animales') wsName=n;
      });
      if(!wsName) wsName=wb.SheetNames[0]; // fallback: primera hoja
      var ws=wb.Sheets[wsName];
      var raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
      // Auto-detectar fila de headers: primera fila con 3+ celdas no vacías
      var headerIdx=-1;
      for(var hi=0;hi<raw.length;hi++){
        var noEmpty=raw[hi].filter(function(c){return String(c).trim()!=='';});
        if(noEmpty.length>=3){headerIdx=hi;break;}
      }
      if(headerIdx<0){toast('⚠️ No se encontraron columnas');return;}
      var headers=raw[headerIdx].map(function(h){return String(h||'').replace(/^\* /,'').trim().toLowerCase();});
      // Leer filas de datos (desde headerIdx+1)
      var rows=[];
      for(var i=headerIdx+1;i<raw.length;i++){
        var row=raw[i];
        if(!row||!row[0]||String(row[0]).trim()==='') continue;
        var obj={};
        headers.forEach(function(h,ci){ obj[h]=row[ci]!==undefined&&row[ci]!==null?row[ci]:''; });
        rows.push(obj);
      }
      if(!rows.length){toast('⚠️ No hay filas de datos en la plantilla');return;}
      IMPORT_DATA={headers:headers,rows:rows};
      mostrarVistaPrevia(headers,rows);
    }catch(err){toast('❌ Error: '+err.message);console.error(err);}
  };
  reader.readAsArrayBuffer(file);
}

// Mapeo flexible de nombres de columna → campo DB
function mapField(obj, aliases) {
  for(var i=0;i<aliases.length;i++){
    var k=aliases[i].toLowerCase();
    if(obj[k]!==undefined&&obj[k]!=='') return String(obj[k]).trim();
  }
  // Also try without special chars
  for(var i=0;i<aliases.length;i++){
    var k=aliases[i].toLowerCase().replace(/[^a-z0-9 ]/g,'').trim();
    for(var key in obj){
      if(key.toLowerCase().replace(/[^a-z0-9 ]/g,'').trim()===k&&obj[key]!=='') return String(obj[key]).trim();
    }
  }
  return '';
}

function fmtDate(v){
  if(!v) return null;

  // Helper: convierte un objeto Date a AAAA-MM-DD usando hora LOCAL (evita desfase UTC)
  function dateToLocal(d){
    if(isNaN(d.getTime())) return null;
    var yyyy=d.getFullYear();
    var mm=String(d.getMonth()+1).padStart(2,'0');
    var dd=String(d.getDate()).padStart(2,'0');
    return yyyy+'-'+mm+'-'+dd;
  }

  // Ya es Date (cuando Excel parsea fecha nativa)
  if(v instanceof Date) return dateToLocal(v);

  // Número serial de Excel (ej: 44567)
  // Se suma 0.5 días para centrar en mediodía y evitar que el redondeo cambie el día
  if(typeof v==='number'){
    var ms=Math.round((v-25569)*86400*1000);
    var d=new Date(ms);
    // Ajustar al mediodía UTC para que cualquier zona horaria quede en el mismo día
    var dMid=new Date(ms + 12*3600*1000);
    return dateToLocal(dMid);
  }

  var s=String(v).trim();
  if(!s) return null;

  // AAAA-MM-DD (ya correcto)
  if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // DD/MM/AAAA o DD-MM-AAAA (formato latinoamericano)
  var m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m){
    var result=m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');
    // Validar que la fecha resultante sea real
    var test=new Date(result+'T12:00:00');
    if(!isNaN(test.getTime())) return result;
  }

  // DD/MM/YY (año de 2 dígitos)
  var m2=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
  if(m2){
    var yr=parseInt(m2[3],10);
    yr = yr < 30 ? 2000+yr : 1900+yr;
    return yr+'-'+m2[2].padStart(2,'0')+'-'+m2[1].padStart(2,'0');
  }

  // Intento genérico (MM/DD/AAAA americano u otros)
  // Parsear con hora fija para evitar desfase
  var d2=new Date(s+' 12:00:00');
  if(!isNaN(d2.getTime())) return dateToLocal(d2);

  // Último intento: new Date() puro
  var d3=new Date(s);
  return isNaN(d3.getTime())?null:dateToLocal(d3);
}

function mostrarVistaPrevia(headers,rows){
  // Summary
  document.getElementById('import-summary').innerHTML=
    '<strong style="color:var(--accent);font-size:18px">'+rows.length+'</strong> '+
    ' animales listos para importar';

  // Table preview (max 8 rows)
  var COLS=['arete','nombre','raza','sexo','nacimiento (aaaa-mm-dd)','peso (kg)','estado','madre (arete)','observaciones'];
  // Find which headers from COLS exist
  var showCols=COLS.filter(function(c){return headers.indexOf(c)>=0;});
  if(!showCols.length) showCols=headers.slice(0,9);
  
  var filas=rows.slice(0,8);
  var html='<table style="width:100%;border-collapse:collapse;font-size:12px">';
  html+='<thead><tr>'+showCols.map(function(h){
    return '<th style="background:var(--bg3);padding:8px 10px;text-align:left;font-weight:700;color:var(--muted);font-size:10px;text-transform:uppercase;white-space:nowrap;border-bottom:2px solid var(--accent)">'+h+'</th>';
  }).join('')+'</tr></thead><tbody>';
  filas.forEach(function(row,ri){
    html+='<tr style="background:'+(ri%2===0?'var(--card)':'var(--card2)')+'">'+
      showCols.map(function(h){
        var val=row[h]!==undefined?String(row[h]):'';
        return '<td style="padding:7px 10px;border-bottom:1px solid var(--border2);color:var(--text2);white-space:nowrap">'+val+'</td>';
      }).join('')+'</tr>';
  });
  html+='</tbody></table>';
  if(rows.length>8) html+='<div style="text-align:center;padding:8px;font-size:11px;color:var(--muted)">... y '+(rows.length-8)+' más</div>';
  
  document.getElementById('import-preview-table').innerHTML=html;
  document.getElementById('import-preview-card').style.display='';
  document.getElementById('import-result-card').style.display='none';
  document.getElementById('import-preview-card').scrollIntoView({behavior:'smooth',block:'start'});
}

async function confirmarImportacion(){
  if(!IMPORT_DATA.rows||!IMPORT_DATA.rows.length) return;
  var btn=document.getElementById('btn-confirmar-import');
  btn.disabled=true; btn.textContent='⏳ Importando...';
  var ok=0,err=0,errMsgs=[];
  var rows=IMPORT_DATA.rows;
  for(var i=0;i<rows.length;i++){
    try{
      await importarAnimal(rows[i]);
      ok++;
    }catch(e){
      err++;
      errMsgs.push('Fila '+(i+1)+': '+e.message);
    }
  }
  // Recargar TODO desde Supabase igual que al iniciar sesión
  try{ await recargarTodo(); }catch(e){ renderDash(); }
  mostrarResultado(ok,err,errMsgs);
  btn.disabled=false; btn.textContent='✅ Confirmar e Importar';
}

async function importarAnimal(row){
  var rid=SESSION&&SESSION.rancho_id||null;

  var arete=mapField(row,['arete','arete / n° identificación','arete / n identificacion','n° arete','numero arete','tag']);
  if(!arete) throw new Error('Arete vacío');

  // Generar UUID v4 válido para Supabase
  function uuidv4(){
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
      var r=Math.random()*16|0, v=c=='x'?r:(r&0x3|0x8);
      return v.toString(16);
    });
  }

  var pesoRaw=mapField(row,['peso (kg)','peso','weight']);
  var pesoVal=pesoRaw!==''?parseFloat(pesoRaw):null;
  if(isNaN(pesoVal)) pesoVal=null;

  var nacRaw=mapField(row,['nacimiento (aaaa-mm-dd)','nacimiento','fecha nacimiento (aaaa-mm-dd)','fecha nacimiento','fecha de nacimiento','birthdate']);

  var sbRow={
    id: uuidv4(),
    rancho_id: rid,
    arete: arete,
    nombre: mapField(row,['nombre','name'])||'',
    raza: mapField(row,['raza','breed','raza *'])||'',
    sexo: mapField(row,['sexo','sexo *','sex','género','genero'])||'',
    nacimiento: nacRaw?fmtDate(nacRaw):null,
    peso: pesoVal,
    estado: mapField(row,['estado','estado *','status'])||'Activo',
    madre: mapField(row,['madre (arete)','madre','arete madre','mother'])||'',
    observaciones: mapField(row,['observaciones','obs','notas','notes'])||'',
    foto: ''
  };

  var r=await fetch(SB_URL+'/rest/v1/animales',{
    method:'POST',
    headers:Object.assign({},SB_HEADERS,{'Prefer':'return=minimal'}),
    body:JSON.stringify(sbRow)
  });
  if(!r.ok){
    var txt=await r.text();
    // Si ya existe el arete (duplicate), lanzar error claro
    if(txt.indexOf('duplicate')>=0||txt.indexOf('unique')>=0) throw new Error('Arete "'+arete+'" ya existe');
    throw new Error(txt.substring(0,80));
  }
}

function mostrarResultado(ok,err,errMsgs){
  var html='<div style="display:flex;gap:12px;margin-bottom:16px">';
  html+='<div style="flex:1;background:rgba(78,200,122,.12);border:1px solid rgba(78,200,122,.3);border-radius:12px;padding:16px;text-align:center">';
  html+='<div style="font-size:32px;font-weight:800;color:var(--green)">'+ok+'</div><div style="font-size:12px;color:var(--muted)">Importados</div></div>';
  html+='<div style="flex:1;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:16px;text-align:center">';
  html+='<div style="font-size:32px;font-weight:800;color:var(--red)">'+err+'</div><div style="font-size:12px;color:var(--muted)">Errores</div></div></div>';
  if(errMsgs.length){
    html+='<div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:10px;padding:12px;font-size:12px;color:var(--red);margin-bottom:12px">';
    html+=errMsgs.slice(0,5).join('<br>');
    if(errMsgs.length>5) html+='<br>...y '+(errMsgs.length-5)+' más';
    html+='</div>';
  }
  html+='<button class="btn btn-ghost" onclick="resetImport()" style="width:100%">⬆️ Importar otro archivo</button>';
  document.getElementById('import-result-body').innerHTML=html;
  document.getElementById('import-preview-card').style.display='none';
  document.getElementById('import-result-card').style.display='';
  toast(err===0?'✅ '+ok+' animales importados':'✅ '+ok+' importados, ❌ '+err+' errores');
}

function resetImport(){
  IMPORT_DATA={};
  document.getElementById('import-preview-card').style.display='none';
  document.getElementById('import-result-card').style.display='none';
  document.getElementById('import-file-name').textContent='';
  document.getElementById('import-file-input').value='';
}

// ══════════════════════════════════════════════════════
// MÓDULO PROVEEDORES & ÓRDENES DE COMPRA
// ══════════════════════════════════════════════════════

// ── Storage local (cache offline) ──
function getProveedores() { 
  if(DB.proveedores && DB.proveedores.length) return DB.proveedores;
  try { return JSON.parse(localStorage.getItem('vqa_proveedores')||'[]'); } catch(e){ return []; } 
}
function getOrdenes() { 
  if(DB.ordenes_compra && DB.ordenes_compra.length) return DB.ordenes_compra;
  try { return JSON.parse(localStorage.getItem('vqa_ordenes')||'[]'); } catch(e){ return []; } 
}
function _saveProvLocal(d) { DB.proveedores=d; localStorage.setItem('vqa_proveedores', JSON.stringify(d)); }
function _saveOrdLocal(d)  { DB.ordenes_compra=d; localStorage.setItem('vqa_ordenes', JSON.stringify(d)); }

// ── Supabase directo para proveedores/ordenes ──
async function sbInsert(tabla, row) {
  if(!navigator.onLine) return;
  const token = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
  let data = mapearParaSB(tabla, row);
  data.rancho_id = SESSION?.rancho_id;
  const res = await fetch(`${SB_URL}/rest/v1/${tabla}`, {
    method:'POST', headers, body:JSON.stringify(data)
  });
  const txt = await res.text();
  if(!res.ok) {
    console.error('sbInsert error en', tabla, ':', res.status, txt);
    toast('⚠️ Error al guardar: ' + txt.substring(0,80));
  } else {
  }
}
async function sbUpdate(tabla, id, data) {
  if(!navigator.onLine) return;
  const token = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
  };
  const mapped = mapearParaSB(tabla, data);
  const res = await fetch(`${SB_URL}/rest/v1/${tabla}?id=eq.${encodeURIComponent(id)}`, {
    method:'PATCH', headers, body:JSON.stringify(mapped)
  });
  if(!res.ok) console.error('sbUpdate error', res.status, await res.text());
}
async function sbDelete(tabla, id) {
  if(!navigator.onLine) return;
  const token = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  };
  const res = await fetch(`${SB_URL}/rest/v1/${tabla}?id=eq.${encodeURIComponent(id)}`, {
    method:'DELETE', headers
  });
  if(!res.ok) console.error('sbDelete error', await res.text());
}

// Mapear campos JS → columnas Supabase
function mapearParaSB(tabla, d) {
  if(tabla === 'proveedores') return {
    id:        d.id,
    nombre:    d.nombre||'',
    tipo:      d.tipo||'',
    telefono:  d.telefono||'',
    contacto:  d.contacto||'',
    productos: d.productos||'',
    obs:       d.obs||'',
    fecha:     d.fecha||''
  };
  if(tabla === 'ordenes_compra') return {
    id:               d.id,
    numero:           d.numero||'',
    proveedor_id:     d.proveedorId||d.proveedor_id||'',
    proveedor_nombre: d.proveedorNombre||d.proveedor_nombre||'',
    proveedor_tel:    d.proveedorTel||d.proveedor_tel||'',
    items:            typeof d.items === 'string' ? d.items : JSON.stringify(d.items||[]),
    obs:              d.obs||'',
    estado:           d.estado||'enviado',
    fecha:            d.fecha||'',
    fecha_actualizacion: d.fechaActualizacion||d.fecha_actualizacion||'',
    historial:        typeof d.historial === 'string' ? d.historial : JSON.stringify(d.historial||[])
  };
  // Para otras tablas devolver tal cual
  return d;
}

let _filtroOrden = '';

// ── Tabs ──
function setPrvTab(tab, el) {
  document.querySelectorAll('#page-proveedores .inv-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-proveedores').style.display = tab==='proveedores'?'block':'none';
  document.getElementById('panel-ordenes').style.display = tab==='ordenes'?'block':'none';
  if(tab==='ordenes') renderOrdenes();
  else renderProveedores();
}

// ── Render Proveedores ──
function renderProveedores() {
  const lista = document.getElementById('prov-lista-container');
  if(!lista) return;
  const provs = getProveedores();
  if(!provs.length) {
    lista.innerHTML = '<div class="empty"><div class="empty-e">🏢</div><div>No hay proveedores registrados</div><div style="font-size:12px;color:var(--muted);margin-top:4px">Agrega tu primer proveedor</div></div>';
    return;
  }
  const iconos = {
    Veterinario: 'data:image/png;base64,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',
    Alimentos:   'data:image/png;base64,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',
    Insumos:     'data:image/png;base64,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',
    Transportista: 'data:image/png;base64,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',
    Otro:        'data:image/png;base64,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'
  };
  const iconosEsImg = true;
  lista.innerHTML = provs.map(p=>`
    <div class="tcard" style="padding:14px 16px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:12px;background:rgba(184,221,60,.08);border:1px solid rgba(184,221,60,.2);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:4px"><img src="${iconos[p.tipo]||iconos['Otro']}" style="width:100%;height:100%;object-fit:contain"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;color:var(--text);font-size:15px">${p.nombre}</div>
          <div style="font-size:12px;color:var(--muted)">${p.tipo||''} ${p.contacto?'· '+p.contacto:''}</div>
          ${p.productos?`<div style="font-size:11px;color:var(--muted);margin-top:2px">📦 ${p.productos}</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          <a href="https://wa.me/51${p.telefono}" target="_blank" style="background:#25D366;color:#fff;border:none;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;text-decoration:none;display:flex;align-items:center;gap:4px">📱 WA</a>
          <button onclick="nuevaOrdenParaProveedor('${p.id}')" style="background:var(--accent);color:#080c07;border:none;padding:6px 10px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer">📋 Orden</button>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
        <button onclick="editarProveedor('${p.id}')" class="btn btn-ghost btn-sm" style="flex:1">✏️ Editar</button>
        <button onclick="eliminarProveedor('${p.id}')" class="btn btn-ghost btn-sm" style="flex:1;color:var(--red)">🗑️ Eliminar</button>
      </div>
    </div>`).join('');
}

// ── Save Proveedor ──
function openModalProveedor() {
  document.getElementById('prov-modal-title').textContent = 'Nuevo Proveedor';
  document.getElementById('prov-edit-id').value = '';
  ['prov-nombre','prov-tipo','prov-telefono','prov-contacto','prov-productos','prov-obs'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  openM('m-proveedor');
}

function editarProveedor(id) {
  const p = getProveedores().find(x=>x.id===id);
  if(!p) return;
  document.getElementById('prov-modal-title').textContent = 'Editar Proveedor';
  document.getElementById('prov-edit-id').value = id;
  document.getElementById('prov-nombre').value = p.nombre||'';
  document.getElementById('prov-tipo').value = p.tipo||'';
  document.getElementById('prov-telefono').value = p.telefono||'';
  document.getElementById('prov-contacto').value = p.contacto||'';
  document.getElementById('prov-productos').value = p.productos||'';
  document.getElementById('prov-obs').value = p.obs||'';
  openM('m-proveedor');
}

async function saveProveedor() {
  if(MODO_LECTURA){ toast('🔒 Suscripción vencida — solo lectura'); return; }
  const nombre = document.getElementById('prov-nombre').value.trim();
  const tipo   = document.getElementById('prov-tipo').value;
  const tel    = document.getElementById('prov-telefono').value.trim();
  if(!nombre||!tel){ toast('⚠️ Nombre y teléfono son obligatorios'); return; }
  const provs = getProveedores();
  const editId = document.getElementById('prov-edit-id').value;
  const row = {
    id: editId || 'prov_'+Date.now(),
    nombre, tipo, telefono: tel,
    contacto: document.getElementById('prov-contacto').value.trim(),
    productos: document.getElementById('prov-productos').value.trim(),
    obs: document.getElementById('prov-obs').value.trim(),
    fecha: new Date().toISOString().split('T')[0]
  };
  // [debug removed]
  if(editId) {
    const idx = provs.findIndex(x=>x.id===editId);
    if(idx>=0) provs[idx]=row; else provs.unshift(row);
    await sbUpdate('proveedores', editId, row);
  } else {
    provs.unshift(row);
    await sbInsert('proveedores', row);
  }
  _saveProvLocal(provs);
  closeM('m-proveedor');
  renderProveedores();
  toast('✅ Proveedor guardado');
}

async function eliminarProveedor(id) {
  if(!confirm('¿Eliminar este proveedor?')) return;
  _saveProvLocal(getProveedores().filter(x=>x.id!==id));
  await sbDelete('proveedores', id);
  renderProveedores();
  toast('🗑️ Proveedor eliminado');
}

// ── Orden de Compra ──
let _ordItems = [];

function openModalOrden(provId) {
  _ordItems = [];
  document.getElementById('ord-obs').value = '';
  // Llenar select proveedores
  const sel = document.getElementById('ord-proveedor');
  sel.innerHTML = '<option value="">Seleccionar proveedor...</option>';
  getProveedores().forEach(p=>{
    const op=document.createElement('option');
    op.value=p.id; op.textContent=p.nombre+' ('+p.tipo+')';
    sel.appendChild(op);
  });
  if(provId) sel.value = provId;
  renderItemsOrden();
  agregarItemOrden();
  openM('m-orden');
}

function nuevaOrdenParaProveedor(provId) {
  openModalOrden(provId);
}

function agregarItemOrden() {
  _ordItems.push({id:'item_'+Date.now(), nombre:'', cantidad:1, unidad:'unidades'});
  renderItemsOrden();
}

function renderItemsOrden() {
  const cont = document.getElementById('ord-items');
  cont.innerHTML = _ordItems.map((item,i)=>`
    <div style="display:grid;grid-template-columns:1fr 80px 90px 36px;gap:6px;align-items:center">
      <input class="inp" placeholder="Producto (ej. Ivermectina 100ml)" value="${item.nombre}"
        oninput="_ordItems[${i}].nombre=this.value" style="font-size:13px;padding:8px 10px">
      <input class="inp" type="number" min="1" value="${item.cantidad}" placeholder="Qty"
        oninput="_ordItems[${i}].cantidad=parseFloat(this.value)||1" style="font-size:13px;padding:8px 10px;text-align:center">
      <select class="inp" style="font-size:12px;padding:8px 6px" onchange="_ordItems[${i}].unidad=this.value">
        ${['unidades','ml','L','g','kg','sacos','dosis','fardos'].map(u=>`<option ${item.unidad===u?'selected':''}>${u}</option>`).join('')}
      </select>
      <button onclick="_ordItems.splice(${i},1);renderItemsOrden()" style="background:rgba(255,100,100,.15);border:1px solid rgba(255,100,100,.3);color:#ff6464;border-radius:8px;width:36px;height:36px;cursor:pointer;font-size:16px">×</button>
    </div>`).join('');
}

async function saveOrden() {
  const provId = document.getElementById('ord-proveedor').value;
  if(!provId){ toast('⚠️ Selecciona un proveedor'); return; }
  const items = _ordItems.filter(x=>x.nombre.trim());
  if(!items.length){ toast('⚠️ Agrega al menos un producto'); return; }
  const prov = getProveedores().find(x=>x.id===provId);
  const ordenes = getOrdenes();
  const num = 'OC-' + String(ordenes.length+1).padStart(4,'0');
  const orden = {
    id: 'ord_'+Date.now(),
    numero: num,
    proveedorId: provId,
    proveedorNombre: prov?.nombre||'',
    proveedorTel: prov?.telefono||'',
    items,
    obs: document.getElementById('ord-obs').value.trim(),
    estado: 'enviado',
    fecha: new Date().toISOString().split('T')[0],
    fechaActualizacion: new Date().toISOString(),
    historial: [{estado:'enviado', fecha: new Date().toLocaleString('es-PE')}]
  };
  ordenes.unshift(orden);
  _saveOrdLocal(ordenes);
  await sbInsert('ordenes_compra', orden);
  closeM('m-orden');
  enviarOrdenWhatsApp(orden, prov);
  setPrvTab('ordenes', document.getElementById('tab-btn-ord'));
  toast('✅ Orden '+num+' creada');
}

function enviarOrdenWhatsApp(orden, prov) {
  const rancho = SESSION?.rancho_nombre||'Mi Rancho';
  const nombre = SESSION?.nombre||'';
  const lista = orden.items.map(i=>`- ${i.nombre} x${i.cantidad} ${i.unidad}`).join('\n');
  const nota = orden.obs ? '\nNota: '+orden.obs : '';
  const msg = `Hola ${prov?.contacto||prov?.nombre||''}, soy *${nombre}* del Rancho *${rancho}*.\n\nOrden de Compra *${orden.numero}*:\n\n${lista}${nota}\n\nPor favor cotizar y confirmar disponibilidad.\nGracias!`;
  const tel = (prov?.telefono||'').replace(/\D/g,'');
  const url = `https://wa.me/51${tel}?text=${encodeURIComponent(msg)}`;
  window.open(url,'_blank');
}

function generarPDFOrden(id) {
  const o = getOrdenes().find(x=>x.id===id);
  if(!o) return;
  const prov = getProveedores().find(x=>x.id===o.proveedorId);
  const rancho = SESSION?.rancho_nombre||'Mi Rancho';
  const nombre = SESSION?.nombre||'';
  const fecha = new Date(o.fecha).toLocaleDateString('es-PE',{year:'numeric',month:'long',day:'numeric'});
  const estados = {enviado:'Enviada',cotizado:'Cotizada',confirmado:'Confirmada',en_camino:'En camino',recibido:'Recibida',cancelado:'Cancelada'};

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Orden de Compra ${o.numero}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:30px; padding-bottom:20px; border-bottom:3px solid #2d6a00; }
  .logo-area h1 { font-size:26px; color:#2d6a00; font-weight:900; }
  .logo-area p { font-size:13px; color:#666; margin-top:2px; }
  .orden-info { text-align:right; }
  .orden-num { font-size:22px; font-weight:900; color:#2d6a00; }
  .orden-fecha { font-size:13px; color:#666; margin-top:4px; }
  .estado-badge { display:inline-block; background:#e8f5e9; color:#2d6a00; border:1px solid #2d6a00; border-radius:6px; padding:4px 12px; font-size:12px; font-weight:700; margin-top:6px; }
  .section { margin-bottom:24px; }
  .section-title { font-size:11px; font-weight:700; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  .info-box { background:#f8faf5; border-radius:8px; padding:14px; }
  .info-box .label { font-size:11px; color:#888; margin-bottom:4px; }
  .info-box .value { font-size:14px; font-weight:600; color:#1a1a1a; }
  table { width:100%; border-collapse:collapse; margin-bottom:20px; }
  thead tr { background:#2d6a00; color:#fff; }
  thead th { padding:10px 14px; text-align:left; font-size:13px; }
  tbody tr { border-bottom:1px solid #e8f0e0; }
  tbody tr:nth-child(even) { background:#f8faf5; }
  tbody td { padding:10px 14px; font-size:14px; color:#1a1a1a; }
  .td-num { text-align:center; }
  .obs-box { background:#fffde7; border:1px solid #f9c74f; border-radius:8px; padding:14px; margin-bottom:24px; font-size:13px; color:#555; }
  .footer { margin-top:40px; display:grid; grid-template-columns:1fr 1fr; gap:40px; }
  .firma-box { text-align:center; }
  .firma-line { border-top:1px solid #999; padding-top:8px; margin-top:50px; font-size:12px; color:#666; }
  .watermark { text-align:center; margin-top:30px; font-size:11px; color:#bbb; }
  @media print { body { padding:20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <h1>VaqueroApp</h1>
      <p>Gestion Ganadera Digital</p>
      <p style="margin-top:6px;font-size:14px;font-weight:600;color:#1a1a1a">${rancho}</p>
      <p style="font-size:12px;color:#666">${nombre}</p>
    </div>
    <div class="orden-info">
      <div class="orden-num">${o.numero}</div>
      <div class="orden-fecha">Fecha: ${fecha}</div>
      <div class="estado-badge">${estados[o.estado]||o.estado}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Informacion</div>
    <div class="info-grid">
      <div class="info-box">
        <div class="label">Proveedor</div>
        <div class="value">${o.proveedorNombre}</div>
        ${prov?.contacto?`<div style="font-size:12px;color:#666;margin-top:2px">${prov.contacto}</div>`:''}
        ${prov?.telefono?`<div style="font-size:12px;color:#666">Tel: ${prov.telefono}</div>`:''}
      </div>
      <div class="info-box">
        <div class="label">Solicitante</div>
        <div class="value">${nombre}</div>
        <div style="font-size:12px;color:#666;margin-top:2px">${rancho}</div>
        <div style="font-size:12px;color:#666">Fecha: ${fecha}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Productos Solicitados</div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Producto / Descripcion</th>
          <th class="td-num">Cantidad</th>
          <th>Unidad</th>
          <th>Precio Unit. (S/)</th>
          <th>Total (S/)</th>
        </tr>
      </thead>
      <tbody>
        ${o.items.map((item,i)=>`
        <tr>
          <td class="td-num">${i+1}</td>
          <td>${item.nombre}</td>
          <td class="td-num">${item.cantidad}</td>
          <td>${item.unidad}</td>
          <td style="text-align:center;color:#aaa;font-style:italic">........</td>
          <td style="text-align:center;color:#aaa;font-style:italic">........</td>
        </tr>`).join('')}
        <tr style="background:#f0f7eb;font-weight:700">
          <td colspan="4" style="text-align:right;padding-right:14px">TOTAL COTIZADO:</td>
          <td colspan="2" style="text-align:center;font-size:15px;color:#2d6a00">S/ ..................</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${o.obs?`<div class="obs-box"><strong>Observaciones:</strong> ${o.obs}</div>`:''}

  <div class="footer">
    <div class="firma-box">
      <div class="firma-line">Firma del Solicitante<br><strong>${nombre}</strong></div>
    </div>
    <div class="firma-box">
      <div class="firma-line">Firma / Sello del Proveedor<br><strong>${o.proveedorNombre}</strong></div>
    </div>
  </div>

  <div class="watermark">Generado por VaqueroApp - Gestion Ganadera Digital</div>
  <script>window.onload=()=>window.print();<\/script>
</body>
</html>`;

  const w = window.open('','_blank');
  w.document.write(html);
  w.document.close();
}

// ── Render Órdenes ──
function filtrarOrdenes(estado, el) {
  document.querySelectorAll('#panel-ordenes .inv-tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  _filtroOrden = estado;
  renderOrdenes();
}

function renderOrdenes() {
  const lista = document.getElementById('ord-lista');
  if(!lista) return;
  let ordenes = getOrdenes();
  if(_filtroOrden) ordenes = ordenes.filter(o=>o.estado===_filtroOrden);
  if(!ordenes.length) {
    lista.innerHTML = '<div class="empty"><div class="empty-e">📋</div><div>No hay órdenes'+(_filtroOrden?' en este estado':'')+' aún</div></div>';
    return;
  }
  const estados = {
    enviado:    {label:'📤 Enviada',    color:'#4a9ee0', bg:'rgba(74,158,224,.15)'},
    cotizado:   {label:'💬 Cotizada',   color:'#f59e0b', bg:'rgba(245,158,11,.15)'},
    confirmado: {label:'✅ Confirmada', color:'var(--accent)', bg:'rgba(184,221,60,.15)'},
    en_camino:  {label:'🚛 En camino',  color:'#a78bfa', bg:'rgba(167,139,250,.15)'},
    recibido:   {label:'📦 Recibida',   color:'#4a9e1a', bg:'rgba(74,158,26,.15)'},
    cancelado:  {label:'❌ Cancelada',  color:'#ff6464', bg:'rgba(255,100,100,.15)'}
  };
  lista.innerHTML = ordenes.map(o=>{
    const est = estados[o.estado]||estados.enviado;
    const totalItems = o.items?.length||0;
    return `
    <div class="tcard" style="padding:14px 16px;cursor:pointer" onclick="verOrden('${o.id}')">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-weight:700;color:var(--text);font-size:15px">${o.numero}</div>
          <div style="font-size:12px;color:var(--muted)">${o.proveedorNombre} · ${o.fecha}</div>
        </div>
        <span style="background:${est.bg};color:${est.color};border:1px solid ${est.color}40;border-radius:8px;padding:4px 10px;font-size:12px;font-weight:600;white-space:nowrap">${est.label}</span>
      </div>
      <div style="font-size:12px;color:var(--muted)">${totalItems} producto${totalItems!==1?'s':''}: ${o.items?.slice(0,2).map(i=>i.nombre).join(', ')}${totalItems>2?'...':''}</div>
    </div>`;
  }).join('');
}

// ── Ver Orden detalle ──
function verOrden(id) {
  const o = getOrdenes().find(x=>x.id===id);
  if(!o) return;
  const estados = {
    enviado:    {label:'📤 Enviada',    color:'#4a9ee0'},
    cotizado:   {label:'💬 Cotizada',   color:'#f59e0b'},
    confirmado: {label:'✅ Confirmada', color:'var(--accent)'},
    en_camino:  {label:'🚛 En camino',  color:'#a78bfa'},
    recibido:   {label:'📦 Recibida',   color:'#4a9e1a'},
    cancelado:  {label:'❌ Cancelada',  color:'#ff6464'}
  };
  const est = estados[o.estado]||estados.enviado;
  document.getElementById('ver-ord-num').textContent = o.numero;
  document.getElementById('ver-ord-body').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:13px;color:var(--muted)">Proveedor</div>
        <div style="font-weight:700;color:var(--text)">${o.proveedorNombre}</div>
      </div>
      <span style="color:${est.color};font-weight:700;font-size:14px">${est.label}</span>
    </div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">📅 Creada: ${o.fecha}</div>
    <div style="background:var(--bg);border-radius:12px;padding:12px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Productos solicitados</div>
      ${o.items.map(i=>`
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="color:var(--text);font-size:14px">${i.nombre}</span>
          <span style="color:var(--muted);font-size:13px">${i.cantidad} ${i.unidad}</span>
        </div>`).join('')}
    </div>
    ${o.obs?`<div style="background:rgba(184,221,60,.08);border:1px solid rgba(184,221,60,.2);border-radius:10px;padding:10px;margin-bottom:12px;font-size:13px;color:var(--muted)">📝 ${o.obs}</div>`:''}
    ${o.historial?.length?`
    <div style="font-size:11px;color:var(--muted)">
      <div style="font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Historial</div>
      ${o.historial.map(h=>`<div style="padding:3px 0">• ${estados[h.estado]?.label||h.estado} — ${h.fecha}</div>`).join('')}
    </div>`:''}`;

  // Botones según estado actual
  const acciones = document.getElementById('ver-ord-acciones');
  const prov = getProveedores().find(x=>x.id===o.proveedorId);
  let btns = '';
  if(o.estado==='enviado')    btns += `<button class="btn btn-ghost" onclick="cambiarEstadoOrden('${id}','cotizado')">💬 Marcar Cotizada</button>`;
  if(o.estado==='cotizado')   btns += `<button class="btn btn-ghost" onclick="cambiarEstadoOrden('${id}','confirmado')">✅ Confirmar Orden</button>`;
  if(o.estado==='confirmado') btns += `<button class="btn btn-ghost" onclick="cambiarEstadoOrden('${id}','en_camino')">🚛 En Camino</button>`;
  if(o.estado==='en_camino')  btns += `<button class="btn btn-primary" onclick="recibirOrden('${id}')">📦 Marcar Recibida</button>`;
  if(o.estado!=='recibido'&&o.estado!=='cancelado') {
    btns += `<button class="btn btn-ghost" onclick="reenviarOrdenWA('${id}')" style="background:#25D366;color:#fff;border-color:#25D366">📱 Reenviar WA</button>`;
    btns += `<button class="btn btn-ghost" onclick="cambiarEstadoOrden('${id}','cancelado')" style="color:var(--red)">❌ Cancelar</button>`;
  }
  btns += `<button class="btn btn-ghost" onclick="generarPDFOrden('${id}')">🖨️ Ver PDF</button>`;
  acciones.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">${btns}<button class="btn btn-ghost" onclick="closeM('m-ver-orden')">Cerrar</button></div>`;
  openM('m-ver-orden');
}

async function cambiarEstadoOrden(id, nuevoEstado) {
  const ordenes = getOrdenes();
  const idx = ordenes.findIndex(x=>x.id===id);
  if(idx<0) return;
  ordenes[idx].estado = nuevoEstado;
  ordenes[idx].fechaActualizacion = new Date().toISOString();
  if(!ordenes[idx].historial) ordenes[idx].historial=[];
  ordenes[idx].historial.push({estado:nuevoEstado, fecha:new Date().toLocaleString('es-PE')});
  _saveOrdLocal(ordenes);
  await sbUpdate('ordenes_compra', id, {
    estado: nuevoEstado,
    fecha_actualizacion: ordenes[idx].fechaActualizacion,
    historial: JSON.stringify(ordenes[idx].historial)
  });
  closeM('m-ver-orden');
  renderOrdenes();
  toast('✅ Estado actualizado');
}

async function recibirOrden(id) {
  const ordenes = getOrdenes();
  const idx = ordenes.findIndex(x=>x.id===id);
  if(idx<0) return;
  const o = ordenes[idx];
  // Preguntar si confirmar ingreso al inventario
  const productos = o.items.map(i=>`• ${i.nombre} (${i.cantidad} ${i.unidad})`).join('\n');
  if(!confirm(`¿Confirmar recepción e ingresar al inventario?\n\n${productos}`)) return;
  // Actualizar estado
  o.estado = 'recibido';
  o.fechaActualizacion = new Date().toISOString();
  if(!o.historial) o.historial=[];
  o.historial.push({estado:'recibido', fecha:new Date().toLocaleString('es-PE')});
  _saveOrdLocal(ordenes);
  await sbUpdate('ordenes_compra', id, {
    estado: 'recibido',
    fecha_actualizacion: o.fechaActualizacion,
    historial: JSON.stringify(o.historial)
  });
  // ── INGRESAR AL INVENTARIO AUTOMÁTICAMENTE ──
  cargarInventarioLocal();
  let ingresados = 0;
  o.items.forEach(item=>{
    if(!item.nombre.trim()) return;
    const inv = DB.inventario||[];
    // Buscar si ya existe el producto (por nombre similar)
    const nombreLower = item.nombre.toLowerCase();
    const existente = inv.find(x=>(x['Nombre']||'').toLowerCase().includes(nombreLower.split(' ')[0]));
    if(existente) {
      // Sumar al stock existente
      existente['Stock'] = (parseFloat(existente['Stock'])||0) + (parseFloat(item.cantidad)||0);
      existente['Obs'] = (existente['Obs']||'') + ` | Ingreso por ${o.numero} el ${new Date().toLocaleDateString('es-PE')}`;
    } else {
      // Crear nuevo producto en inventario
      const nuevoItem = {
        'ID': 'inv_'+Date.now()+'_'+Math.random().toString(36).substr(2,5),
        'Nombre': item.nombre,
        'Categoria': 'Otro',
        'Unidad': item.unidad,
        'Stock': parseFloat(item.cantidad)||0,
        'StockMinimo': 2,
        'Precio': '',
        'Proveedor': o.proveedorNombre,
        'Obs': `Ingreso por ${o.numero} el ${new Date().toLocaleDateString('es-PE')}`,
        'Vencimiento': ''
      };
      if(!DB.inventario) DB.inventario=[];
      DB.inventario.unshift(nuevoItem);
    }
    ingresados++;
  });
  localStorage.setItem('vaqueroapp_inventario', JSON.stringify(DB.inventario));
  closeM('m-ver-orden');
  renderOrdenes();
  toast(`✅ Orden recibida — ${ingresados} producto(s) ingresados al inventario`);
}

function reenviarOrdenWA(id) {
  const o = getOrdenes().find(x=>x.id===id);
  if(!o) return;
  const prov = getProveedores().find(x=>x.id===o.proveedorId);
  enviarOrdenWhatsApp(o, prov);
}

// Alerta stock bajo → crear orden automática
function verificarStockBajo() {
  cargarInventarioLocal();
  const inv = DB.inventario||[];
  const bajos = inv.filter(x=>{
    const stock = parseFloat(x['Stock'])||0;
    const min = parseFloat(x['StockMinimo'])||2;
    return stock>0 && stock<=min;
  });
  if(!bajos.length) return;
  bajos.forEach(item=>{
    const key = 'alerta_stock_'+item['ID'];
    if(localStorage.getItem(key)) return; // ya alertado hoy
    localStorage.setItem(key, new Date().toDateString());
    // Mostrar alerta con opción de crear orden
    const modal = document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    const prov = getProveedores().find(x=>(x.productos||'').toLowerCase().includes((item['Nombre']||'').toLowerCase().split(' ')[0]));
    modal.innerHTML=`
      <div style="background:var(--card);border-radius:20px;padding:28px;max-width:380px;width:100%;text-align:center">
        <div style="font-size:40px;margin-bottom:10px">⚠️</div>
        <h3 style="color:var(--text);margin-bottom:8px">Stock Bajo</h3>
        <p style="color:var(--muted);font-size:14px;margin-bottom:20px">
          <strong style="color:var(--text)">${item['Nombre']}</strong><br>
          Solo quedan <strong style="color:#f59e0b">${item['Stock']} ${item['Unidad']||'unidades'}</strong>
        </p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${prov?`<button onclick="nuevaOrdenParaProveedor('${prov.id}');goTo('proveedores');this.closest('[style*=fixed]').remove()" style="background:var(--accent);color:#080c07;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">📋 Crear orden a ${prov.nombre}</button>`:'<button onclick="goTo(\'proveedores\');this.closest(\'[style*=fixed]\').remove()" style="background:var(--accent);color:#080c07;border:none;padding:12px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">🛒 Ir a Proveedores</button>'}
          <button onclick="this.closest('[style*=fixed]').remove()" style="background:transparent;border:none;color:var(--muted);cursor:pointer;padding:8px">Ignorar</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  });
}

// Verificar stock bajo cada vez que se carga inventario
const _origCargarInv = typeof cargarInventarioLocal==='function' ? cargarInventarioLocal : null;
setTimeout(()=>{ if(SESSION) verificarStockBajo(); }, 3000);
async function limpiarDuplicados() {
  // Usa el token del usuario + RLS (sin service_role en el cliente)
  const _userTok = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const hdAdmin = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _userTok, 'Content-Type': 'application/json' };
  toast('🗑 Limpiando duplicados...');
  try {
    // Traer todos los animales del rancho
    const r = await fetch(`${SB_URL}/rest/v1/animales?select=id,arete,created_at&rancho_id=eq.${SESSION.rancho_id}&order=created_at.asc`, { headers: hdAdmin });
    const todos = await r.json();

    // Para cada arete, conservar solo el MÁS ANTIGUO y eliminar el resto
    const vistos = {};
    const aEliminar = [];
    todos.forEach(a => {
      const key = (a.arete||'').trim().toLowerCase();
      if(vistos[key]) {
        aEliminar.push(a.id); // eliminar duplicado más nuevo
      } else {
        vistos[key] = a.id;
      }
    });

    if(aEliminar.length === 0) { toast('✅ No hay duplicados'); return; }

    // Eliminar duplicados uno a uno
    let eliminados = 0;
    for(const id of aEliminar) {
      const del = await fetch(`${SB_URL}/rest/v1/animales?id=eq.${id}`, {
        method: 'DELETE',
        headers: Object.assign({}, hdAdmin, {'Prefer':'return=minimal'})
      });
      if(del.ok) eliminados++;
    }

    toast('✅ ' + eliminados + ' duplicados eliminados');
    // Recargar
    await recargarTodo();
    // Cerrar modal de diag si está abierto
    document.querySelectorAll('[data-diag-modal]').forEach(m => m.remove());
  } catch(e) {
    toast('❌ Error: ' + e.message);
    console.error(e);
  }
}

async function diagnosticarDatos() {
  // Usa el token del usuario + RLS (sin service_role en el cliente)
  const _userTok = localStorage.getItem('vaqueroapp_token') || SB_KEY;
  const hdAdmin = { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + _userTok, 'Content-Type': 'application/json' };
  toast('🔍 Diagnosticando...');
  try {
    // Total SIN filtro (service key ignora RLS)
    // Solo consulta los animales del rancho actual (RLS)
    const r1 = await fetch(`${SB_URL}/rest/v1/animales?select=id,rancho_id,arete,estado&rancho_id=eq.${SESSION.rancho_id}`, { headers: hdAdmin });
    const todos = r1.ok ? await r1.json() : [];

    // Filtrado por rancho_id del usuario actual
    const r2 = await fetch(`${SB_URL}/rest/v1/animales?select=id,rancho_id,arete&rancho_id=eq.${SESSION.rancho_id}`, { headers: hdAdmin });
    const porRID = r2.ok ? await r2.json() : [];

    // Agrupar por rancho_id
    const grupos = {};
    todos.forEach(a => {
      const k = (a.rancho_id||'(sin rancho_id)').slice(0,36);
      grupos[k] = (grupos[k]||0) + 1;
    });

    // Contar duplicados por arete en los del rancho actual
    const aretes = porRID.map(a=>a.arete);
    const dupls = aretes.filter((a,i)=>aretes.indexOf(a)!==i);

    const html = '<div style="font-family:monospace;font-size:12px;line-height:2">' +
      '<b style="font-size:14px;color:var(--accent)">📊 DIAGNÓSTICO</b><br><br>' +
      '<b>Total en Supabase (sin filtro):</b> ' + todos.length + '<br>' +
      '<b>Con tu rancho_id:</b> ' + porRID.length + '<br>' +
      '<b>En memoria (DB.animales):</b> ' + DB.animales.length + '<br>' +
      '<b>Aretes duplicados en tu rancho:</b> ' + (dupls.length ? dupls.join(', ') : 'Ninguno') + '<br><br>' +
      '<b>Tu rancho_id:</b><br><small>' + SESSION.rancho_id + '</small><br><br>' +
      '<b>Distribución por rancho_id en Supabase:</b><br>' +
      Object.entries(grupos).map(([k,v]) =>
        '<span style="color:'+(k===SESSION.rancho_id?'var(--accent)':'var(--red)')+'">  ' +
        k.slice(0,8)+'... → <b>'+v+'</b>'+(k===SESSION.rancho_id?' ← TU RANCHO':'') + '</span>'
      ).join('<br>') + '</div>';

    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    const inner = document.createElement('div');
    inner.style.cssText = 'background:var(--card);border:1px solid var(--accent);border-radius:16px;padding:24px;max-width:560px;width:100%;max-height:85vh;overflow-y:auto';
    inner.innerHTML = html;
    inner.setAttribute('data-diag-modal','1');
    modal.setAttribute('data-diag-modal','1');
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;margin-top:16px';
    const cleanBtn = document.createElement('button');
    cleanBtn.className = 'btn btn-danger';
    cleanBtn.style.cssText = 'flex:1';
    cleanBtn.textContent = '🗑 Eliminar duplicados';
    cleanBtn.onclick = function(){ modal.remove(); limpiarDuplicados(); };
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-ghost';
    closeBtn.style.cssText = 'flex:1';
    closeBtn.textContent = 'Cerrar';
    closeBtn.onclick = function(){ modal.remove(); };
    btnRow.appendChild(cleanBtn);
    btnRow.appendChild(closeBtn);
    inner.appendChild(btnRow);
    modal.appendChild(inner);
    document.body.appendChild(modal);
  } catch(e) {
    toast('❌ Error diagnóstico: ' + e.message);
    console.error(e);
  }
}

// ── ACCESO SECRETO AL DIAGNÓSTICO (5 clics en el logo) ──
var _diagClicks = 0, _diagTimer = null;
function secretDiag() {
  _diagClicks++;
  clearTimeout(_diagTimer);
  if(_diagClicks >= 5) {
    _diagClicks = 0;
    diagnosticarDatos();
  } else {
    _diagTimer = setTimeout(function(){ _diagClicks = 0; }, 2000);
  }
}

// ══════════════════════════════════════════════════════════
// MÓDULO: EXPORTACIÓN A EXCEL
// ══════════════════════════════════════════════════════════

function renderExportar() {
  // Actualizar contadores con datos en memoria
  const upd = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
  upd('exp-count-animales', DB.animales ? DB.animales.length : 0);
  upd('exp-count-salud',    DB.salud    ? DB.salud.length    : 0);
  upd('exp-count-gastos',   DB.gastos   ? DB.gastos.length   : 0);
  upd('exp-count-inventario', DB.inventario ? DB.inventario.length : 0);
}

function xlsxEstilo(ws, headers) {
  // Ancho de columnas automático
  const colWidths = headers.map(h => ({ wch: Math.max(h.length + 4, 14) }));
  ws['!cols'] = colWidths;
}

function exportarModulo(modulo) {
  if(typeof XLSX === 'undefined') { toast('❌ Librería XLSX no disponible'); return; }

  const cfg = {
    animales:  {
      label: 'Animales',
      data: DB.animales || [],
      cols: ['Arete','Nombre','Raza','Sexo','Nacimiento','Peso','Estado','Madre','Observaciones','FechaRegistro'],
      map: r => [r['Arete'],r['Nombre'],r['Raza'],r['Sexo'],r['Nacimiento'],r['Peso'],r['Estado'],r['Madre'],r['Observaciones'],r['FechaRegistro']]
    },
    salud: {
      label: 'Salud',
      data: DB.salud || [],
      cols: ['Animal','Tipo','Descripcion','Dosis','FechaAplicacion','ProximaDosis','Veterinario','Costo','Observaciones'],
      map: r => [r['Animal'],r['Tipo'],r['Descripcion'],r['Dosis'],r['FechaAplicacion'],r['ProximaDosis'],r['Veterinario'],r['Costo'],r['Observaciones']]
    },
    gastos: {
      label: 'Gastos',
      data: DB.gastos || [],
      cols: ['Tipo','Descripcion','Monto','EsIngreso','Fecha','Animal','Observaciones'],
      map: r => [r['Tipo'],r['Descripcion'],r['Monto'],r['EsIngreso'],r['Fecha'],r['Animal'],r['Observaciones']]
    },
    inventario: {
      label: 'Inventario',
      data: DB.inventario || [],
      cols: ['Nombre','Categoria','Unidad','Stock','Minimo','Precio','Proveedor','Vencimiento','Observaciones'],
      map: r => [r['nombre']||r['Nombre'],r['categoria']||r['Categoria'],r['unidad']||r['Unidad'],r['stock']||r['Stock'],r['minimo']||r['Minimo'],r['precio']||r['Precio'],r['proveedor']||r['Proveedor'],r['vencimiento']||r['Vencimiento'],r['observaciones']||r['Observaciones']]
    }
  };

  const c = cfg[modulo];
  if(!c) return;
  if(!c.data.length) { toast('⚠️ No hay datos de ' + c.label); return; }

  const wb = XLSX.utils.book_new();
  const rows = [c.cols, ...c.data.map(c.map)];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  xlsxEstilo(ws, c.cols);
  XLSX.utils.book_append_sheet(wb, ws, c.label);

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, 'VaqueroApp_' + c.label + '_' + fecha + '.xlsx');
  toast('✅ ' + c.label + ' exportado (' + c.data.length + ' registros)');
}

async function exportarTodoExcel() {
  if(typeof XLSX === 'undefined') { toast('❌ Librería XLSX no disponible'); return; }
  toast('📊 Generando Excel...');

  // Recargar datos frescos de Supabase
  try {
    const [animales, salud, gastos, inventario] = await Promise.all([
      apiGet('animales').catch(()=>[]),
      apiGet('salud').catch(()=>[]),
      apiGet('gastos').catch(()=>[]),
      apiGet('inventario').catch(()=>[])
    ]);
    DB.animales   = animales;
    DB.salud      = salud;
    DB.gastos     = gastos;
    DB.inventario = inventario;
    renderExportar();
  } catch(e) { console.warn('Export reload error:', e); }

  const wb = XLSX.utils.book_new();
  const rancho = SESSION?.rancho_nombre || 'Rancho';
  const fecha  = new Date().toISOString().split('T')[0];

  // Hoja 1: Animales
  const hdA = ['Arete','Nombre','Raza','Sexo','Nacimiento','Peso (kg)','Estado','Madre','Observaciones','Fecha Registro'];
  const rowsA = (DB.animales||[]).map(r=>[r['Arete'],r['Nombre'],r['Raza'],r['Sexo'],r['Nacimiento'],r['Peso'],r['Estado'],r['Madre'],r['Observaciones'],r['FechaRegistro']]);
  const wsA = XLSX.utils.aoa_to_sheet([hdA,...rowsA]);
  xlsxEstilo(wsA, hdA);
  XLSX.utils.book_append_sheet(wb, wsA, '🐂 Animales');

  // Hoja 2: Salud
  const hdS = ['Animal (Arete)','Tipo','Descripción','Dosis','Fecha Aplicación','Próxima Dosis','Veterinario','Costo (S/)','Observaciones'];
  const rowsS = (DB.salud||[]).map(r=>[r['Animal'],r['Tipo'],r['Descripcion'],r['Dosis'],r['FechaAplicacion'],r['ProximaDosis'],r['Veterinario'],r['Costo'],r['Observaciones']]);
  const wsS = XLSX.utils.aoa_to_sheet([hdS,...rowsS]);
  xlsxEstilo(wsS, hdS);
  XLSX.utils.book_append_sheet(wb, wsS, '💉 Salud');

  // Hoja 3: Gastos e Ingresos
  const hdG = ['Tipo','Descripción','Monto (S/)','Es Ingreso','Fecha','Animal','Observaciones'];
  const rowsG = (DB.gastos||[]).map(r=>[r['Tipo'],r['Descripcion'],r['Monto'],r['EsIngreso'],r['Fecha'],r['Animal'],r['Observaciones']]);
  const wsG = XLSX.utils.aoa_to_sheet([hdG,...rowsG]);
  xlsxEstilo(wsG, hdG);
  XLSX.utils.book_append_sheet(wb, wsG, '💰 Gastos');

  // Hoja 4: Inventario
  const hdI = ['Nombre','Categoría','Unidad','Stock','Mínimo','Precio (S/)','Proveedor','Vencimiento','Observaciones'];
  const rowsI = (DB.inventario||[]).map(r=>[r['nombre']||r['Nombre'],r['categoria']||r['Categoria'],r['unidad']||r['Unidad'],r['stock']||r['Stock'],r['minimo']||r['Minimo'],r['precio']||r['Precio'],r['proveedor']||r['Proveedor'],r['vencimiento']||r['Vencimiento'],r['observaciones']||r['Observaciones']]);
  const wsI = XLSX.utils.aoa_to_sheet([hdI,...rowsI]);
  xlsxEstilo(wsI, hdI);
  XLSX.utils.book_append_sheet(wb, wsI, '📦 Inventario');

  XLSX.writeFile(wb, 'VaqueroApp_' + rancho + '_' + fecha + '.xlsx');
  const total = (DB.animales||[]).length + (DB.salud||[]).length + (DB.gastos||[]).length + (DB.inventario||[]).length;
  toast('✅ Excel descargado — ' + total + ' registros en 4 hojas');
}

// ══════════════════════════════════════════════════
// BANCO DE SEMEN
// ══════════════════════════════════════════════════
function renderSemen(){
  const lista = document.getElementById('bk-grid');
  const resumen = document.getElementById('semen-raza-resumen');
  if(!lista) return;
  const toros = DB.semen_toros || [];

  // Resumen por raza
  const razaMap = {};
  toros.forEach(t=>{
    const r = t.Raza||'Sin raza';
    razaMap[r] = (razaMap[r]||0) + (parseInt(t.Pajillas)||0);
  });
  if(Object.keys(razaMap).length){
    resumen.innerHTML = '<div class="semen-raza-grid">' +
      Object.entries(razaMap).sort((a,b)=>b[1]-a[1]).map(([r,n])=>
        `<div class="semen-raza-item">
          <div class="semen-raza-nombre">${r}</div>
          <div class="semen-raza-total">${n}</div>
          <div style="font-size:10px;color:var(--muted)">pajillas</div>
        </div>`
      ).join('') + '</div>';
  } else {
    resumen.innerHTML = '<div style="text-align:center;padding:14px;color:var(--muted);font-size:13px">🧬 Sin toros registrados aún</div>';
  }

  // Lista de toros
  if(!toros.length){
    lista.innerHTML = `<div class="tcard"><div style="text-align:center;padding:40px 20px;color:var(--muted)">
      <div style="font-size:48px;margin-bottom:12px">🐂</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">Sin toros registrados</div>
      <div style="font-size:13px">Agrega toros reproductores para llevar el control de su semen</div>
      <button class="btn btn-primary" onclick="abrirModalToro()" style="margin-top:16px">+ Agregar primer toro</button>
    </div></div>`;
    return;
  }

  lista.innerHTML = '<div class="toro-grid">' + toros.map(t=>{
    const paj = parseInt(t.Pajillas)||0;
    const min = parseInt(t.Minimo)||5;
    const cls = paj===0?'zero':paj<=min?'low':'ok';
    // Contar por ToroID (nuevo) O por nombre del toro en el campo ToroSemen (legacy)
    const toroNombre = (t.Nombre||'').toLowerCase();
    const criasCount = (DB.partos||[]).filter(p=>
      p.ToroID===t.ID || 
      (p['Padre']||'').toLowerCase().includes(toroNombre) && toroNombre.length > 2
    ).length || (parseInt(t.Crias)||0);
    const insemCount = (DB.insem||[]).filter(i=>
      i.ToroID===t.ID || 
      (i['ToroSemen']||'').toLowerCase().includes(toroNombre) && toroNombre.length > 2
    ).length;
    return `<div class="toro-card">
      <div class="toro-head">
        <div class="toro-foto">🐂</div>
        <div class="toro-info">
          <div class="toro-nombre">${t.Nombre||'Sin nombre'}</div>
          <div class="toro-raza">${t.Raza||''}</div>
          <div class="toro-empresa">${t.Empresa?'📦 '+t.Empresa:''} ${t.Pais?'🌍 '+t.Pais:''}</div>
        </div>
      </div>
      <div class="toro-pajillas">
        <div>
          <div class="toro-pajillas-num ${cls}">${paj}</div>
          <div class="toro-pajillas-label">Pajillas<br>disponibles</div>
        </div>
        <div style="flex:1;padding-left:10px;border-left:1px solid var(--border)">
          ${t.Precio?`<div style="font-size:12px;color:var(--muted)">Precio/pajilla</div><div style="font-size:14px;font-weight:700;color:var(--accent)">S/ ${parseFloat(t.Precio||0).toFixed(2)}</div>`:''}
          ${paj<=min&&paj>0?`<div style="font-size:11px;color:#f59e0b;margin-top:2px">⚠️ Stock bajo (mín. ${min})</div>`:''}
          ${paj===0?`<div style="font-size:11px;color:var(--red);margin-top:2px">❌ Sin stock</div>`:''}
        </div>
      </div>
      <div class="toro-stats">
        <div class="toro-stat">
          <div class="toro-stat-label">Inseminaciones</div>
          <div class="toro-stat-val">${insemCount}</div>
        </div>
        <div class="toro-stat">
          <div class="toro-stat-label">Crías</div>
          <div class="toro-stat-val">${criasCount}</div>
        </div>
        ${t.Codigo?`<div class="toro-stat"><div class="toro-stat-label">Código</div><div class="toro-stat-val" style="font-size:12px">${t.Codigo}</div></div>`:''}
        ${t.Dep?`<div class="toro-stat" style="grid-column:1/-1"><div class="toro-stat-label">DEP / Características</div><div class="toro-stat-val" style="font-size:11px;font-weight:400;color:var(--text2)">${t.Dep}</div></div>`:''}
      </div>
      <div class="toro-actions">
        <button class="btn btn-ghost btn-sm" onclick="editarToro('${t.ID}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="ajustarPajillas('${t.ID}')">💉 Pajillas</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="eliminarToro('${t.ID}')">🗑</button>
      </div>
    </div>`;
  }).join('') + '</div>';
}

function abrirModalToro(id){
  document.getElementById('toro-edit-id').value = '';
  document.getElementById('m-toro-titulo').textContent = '🐂 Nuevo Toro Reproductor';
  ['toro-nombre','toro-empresa','toro-pais','toro-codigo','toro-dep','toro-notas'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('toro-raza').value='';
  document.getElementById('toro-pajillas').value='0';
  document.getElementById('toro-precio').value='';
  document.getElementById('toro-minimo').value='5';
  openM('m-toro');
}

function editarToro(id){
  const t = (DB.semen_toros||[]).find(x=>x.ID===id);
  if(!t) return;
  document.getElementById('toro-edit-id').value = id;
  document.getElementById('m-toro-titulo').textContent = '✏️ Editar Toro';
  document.getElementById('toro-nombre').value = t.Nombre||'';
  document.getElementById('toro-raza').value = t.Raza||'';
  document.getElementById('toro-empresa').value = t.Empresa||'';
  document.getElementById('toro-pais').value = t.Pais||'';
  document.getElementById('toro-codigo').value = t.Codigo||'';
  document.getElementById('toro-pajillas').value = t.Pajillas||0;
  document.getElementById('toro-precio').value = t.Precio||'';
  document.getElementById('toro-minimo').value = t.Minimo||5;
  document.getElementById('toro-dep').value = t.Dep||'';
  document.getElementById('toro-notas').value = t.Notas||'';
  openM('m-toro');
}

function guardarToro(){
  const nombre = document.getElementById('toro-nombre').value.trim();
  const raza = document.getElementById('toro-raza').value;
  if(!nombre){ toast('⚠️ Ingresa el nombre del toro'); return; }
  if(!raza){ toast('⚠️ Selecciona la raza'); return; }
  const paj = parseInt(document.getElementById('toro-pajillas').value)||0;
  if(paj<0){ toast('⚠️ Las pajillas no pueden ser negativas'); return; }

  if(!DB.semen_toros) DB.semen_toros = [];
  const editId = document.getElementById('toro-edit-id').value;
  const toroID = editId || ('toro_' + Date.now());
  const toro = {
    ID: toroID,
    Nombre: nombre,
    Raza: raza,
    Empresa: document.getElementById('toro-empresa').value.trim(),
    Pais: document.getElementById('toro-pais').value.trim(),
    Codigo: document.getElementById('toro-codigo').value.trim(),
    Pajillas: paj,
    Precio: parseFloat(document.getElementById('toro-precio').value)||0,
    Minimo: parseInt(document.getElementById('toro-minimo').value)||5,
    Dep: document.getElementById('toro-dep').value.trim(),
    Notas: document.getElementById('toro-notas').value.trim(),
    rancho_id: SESSION?.rancho_id || null,
    FechaReg: editId ? ((DB.semen_toros.find(x=>x.ID===editId)||{}).FechaReg || new Date().toLocaleDateString('es-PE')) : new Date().toLocaleDateString('es-PE')
  };

  if(editId){
    const idx = DB.semen_toros.findIndex(x=>x.ID===editId);
    if(idx>=0) DB.semen_toros[idx]=toro;
    apiPostFast('update','semen_toros',toro,editId);
  } else {
    DB.semen_toros.push(toro);
    apiPostFast('insert','semen_toros',toro,null);
  }
  closeM('m-toro');
  renderSemen();
  renderDash();
  toast('✅ Toro guardado');
}

function ajustarPajillas(id){
  const t = (DB.semen_toros||[]).find(x=>x.ID===id);
  if(!t) return;
  const act = prompt(`Pajillas actuales de "${t.Nombre}": ${t.Pajillas}

Ingresa el nuevo total de pajillas:`, t.Pajillas);
  if(act===null) return;
  const n = parseInt(act);
  if(isNaN(n)||n<0){ toast('⚠️ Número inválido'); return; }
  t.Pajillas = n;
  apiPostFast('update','semen_toros',DB.semen_toros,null);
  renderSemen();
  renderDash();
  toast(`💉 Pajillas actualizadas: ${n}`);
}

function eliminarToro(id){
  const t = (DB.semen_toros||[]).find(x=>x.ID===id);
  if(!t) return;
  if(!confirm(`¿Eliminar toro "${t.Nombre}"?\nEsto no eliminará las inseminaciones registradas.`)) return;
  DB.semen_toros = (DB.semen_toros||[]).filter(x=>x.ID!==id);
  apiPostFast('delete','semen_toros',null,id);
  renderSemen();
  renderDash();
  toast('🗑 Toro eliminado');
}

// Poblar select de toros en modal de inseminación
function poblarSelectToros(){
  const sel = document.getElementById('insem-toro-ext');
  if(!sel) return;
  const toros = DB.semen_toros||[];
  sel.innerHTML = '<option value="">— Ninguno —</option>' +
    toros.map(t=>`<option value="${t.ID}">${t.Nombre} (${t.Raza}) · ${t.Pajillas} paj.</option>`).join('');
}

function poblarSelectInsemToro(){
  const optSemen  = document.getElementById('opt-insem-semen');
  const optMachos = document.getElementById('opt-insem-machos');
  if(!optSemen) return;
  const toros = DB.semen_toros||[];
  optSemen.innerHTML = toros.map(t=>{
    const paj = parseInt(t.Pajillas)||0;
    const cls = paj===0?'color:var(--red)':paj<=( parseInt(t.Minimo)||5)?'color:#f59e0b':'color:var(--accent)';
    return `<option value="SEMEN:${t.ID}" ${paj===0?'disabled':''}>${t.Nombre} (${t.Raza}) · ${paj} pajillas</option>`;
  }).join('');
  if(optMachos){
    const machos = (DB.animales||[]).filter(a=>a['Sexo']==='Macho'&&a['Estado']!=='Muerto'&&a['Estado']!=='Vendido');
    optMachos.innerHTML = machos.map(a=>
      `<option value="MACHO:${a['Arete']}">${a['Arete']} — ${a['Nombre']||''} (${a['Raza']||''})</option>`
    ).join('');
  }
}

function syncInsemToro(){
  const sel   = document.getElementById('i-toro-sel');
  const inp   = document.getElementById('i-toro');
  const stock = document.getElementById('i-toro-stock');
  if(!sel||!inp) return;
  if(sel.value === '__manual__'){
    inp.style.display='';
    inp.value='';
    inp.focus();
    if(stock) stock.style.display='none';
    inp.dataset.toroId='';
  } else if(sel.value.startsWith('SEMEN:')){
    const toroID = sel.value.replace('SEMEN:','');
    const toro = (DB.semen_toros||[]).find(t=>t.ID===toroID);
    inp.style.display='none';
    inp.value = toro ? `${toro.Nombre} (${toro.Raza})` : '';
    inp.dataset.toroId = toroID;
    if(stock && toro){
      const paj = parseInt(toro.Pajillas)||0;
      const min = parseInt(toro.Minimo)||5;
      const col = paj===0?'var(--red)':paj<=min?'#f59e0b':'var(--accent)';
      stock.style.display='';
      stock.innerHTML = `💉 Stock actual: <b style="color:${col}">${paj} pajillas</b>${paj===0?' ⚠️ Sin stock':paj<=min?' ⚠️ Stock bajo':''}`;
    }
  } else if(sel.value.startsWith('MACHO:')){
    const arete = sel.value.replace('MACHO:','');
    inp.style.display='none';
    inp.value = arete;
    inp.dataset.toroId='';
    if(stock) stock.style.display='none';
  } else {
    inp.style.display='none';
    inp.value='';
    inp.dataset.toroId='';
    if(stock) stock.style.display='none';
  }
}


async function diagLogo() {
  try {
    const res = await fetch(SB_URL+'/rest/v1/perfiles?id=eq.'+SESSION.user_id+'&select=logo,rancho_nombre', {headers: SB_HEADERS});
    const data = await res.json();
    const p = data && data[0];
    const logoLen = p?.logo ? p.logo.length : 0;
    const cfg = JSON.parse(localStorage.getItem('vaqueroapp_config_pdf')||'{}');
    const localLogoLen = cfg.logo ? cfg.logo.length : 0;
    alert(
      '👤 User ID: ' + SESSION.user_id + '\n' +
      '🏠 Rancho: ' + (p?.rancho_nombre||'?') + '\n' +
      '☁️ Logo en Supabase: ' + (logoLen > 100 ? '✅ '+logoLen+' chars' : '❌ Sin logo') + '\n' +
      '📱 Logo en dispositivo: ' + (localLogoLen > 100 ? '✅ '+localLogoLen+' chars' : '❌ Sin logo') + '\n' +
      '🔄 SW version: v7'
    );
    // Si hay logo en Supabase, aplicarlo ahora mismo
    if(logoLen > 100) {
      const sb = document.getElementById('sidebar-logo-display');
      if(sb) sb.innerHTML = '<img src="'+p.logo+'" style="width:48px;height:48px;object-fit:contain;border-radius:8px">';
      cfg.logo = p.logo;
      localStorage.setItem('vaqueroapp_config_pdf', JSON.stringify(cfg));
      toast('✅ Logo aplicado desde Supabase');
    }
  } catch(e) {
    alert('❌ Error: ' + e.message);
  }
}

function poblarSelectPartoPadre(){
  const optSemen  = document.getElementById('opt-parto-semen');
  const optMachos = document.getElementById('opt-parto-machos');
  if(!optSemen) return;
  const toros = DB.semen_toros||[];
  optSemen.innerHTML = toros.map(t=>{
    const paj = parseInt(t.Pajillas)||0;
    return `<option value="SEMEN:${t.ID}">${t.Nombre} (${t.Raza}) · ${paj} pajillas</option>`;
  }).join('');
  if(optMachos){
    const machos = (DB.animales||[]).filter(a=>a['Sexo']==='Macho'&&a['Estado']!=='Muerto');
    optMachos.innerHTML = machos.map(a=>
      `<option value="MACHO:${a['Arete']}">${a['Arete']} — ${a['Nombre']||''} (${a['Raza']||''})</option>`
    ).join('');
  }
}

function syncPartoPadre(){
  const sel   = document.getElementById('p-padre-sel');
  const inp   = document.getElementById('p-padre');
  const stock = document.getElementById('p-padre-stock');
  if(!sel||!inp) return;
  if(sel.value==='__manual__'){
    inp.style.display=''; inp.value=''; inp.focus();
    if(stock) stock.style.display='none';
    inp.dataset.toroId='';
  } else if(sel.value.startsWith('SEMEN:')){
    const toroID = sel.value.replace('SEMEN:','');
    const toro   = (DB.semen_toros||[]).find(t=>t.ID===toroID);
    inp.style.display='none';
    inp.value = toro ? `${toro.Nombre} (${toro.Raza})` : '';
    inp.dataset.toroId = toroID;
    if(stock && toro){
      const paj = parseInt(toro.Pajillas)||0;
      const col = paj===0?'var(--red)':paj<=(parseInt(toro.Minimo)||5)?'#f59e0b':'var(--accent)';
      stock.style.display='';
      stock.innerHTML=`💉 Stock: <b style="color:${col}">${paj} pajillas</b>`;
    }
  } else if(sel.value.startsWith('MACHO:')){
    inp.style.display='none';
    inp.value = sel.value.replace('MACHO:','');
    inp.dataset.toroId='';
    if(stock) stock.style.display='none';
  } else {
    inp.style.display='none'; inp.value=''; inp.dataset.toroId='';
    if(stock) stock.style.display='none';
  }
}

// ═══════════════════════════════════════════
// ADAPTADORES para HTML maquetado
// ═══════════════════════════════════════════
// El maquetado llama iniciarSesion() — el original usa doLogin()
function iniciarSesion(){ doLogin(); }
// El maquetado llama crearCuenta() — el original usa doRegistro()
function crearCuenta(){ doRegistro(); }
// Compatibilidad de navegación
function navegar(seccion, el){
  const mapaNav = {
    'dashboard':'dash','inicio':'dash','animales':'animales','salud':'salud',
    'inseminacion':'insem','partos':'partos','calendario':'cal','alertas':'alertas',
    'reportes':'reportes','historial':'historial','gastos':'gastos',
    'inventario':'inventario','proveedores':'proveedores','finanzas':'finanzas',
    'banco-genetico':'semen','arbol':'arbol','arbol-genealogico':'arbol',
    'buscar':'perfil-buscar','soporte':'config-pass','suscripcion':'suscripcion',
    'perfil':'perfil','documentos':'documentos','importar':'importar','exportar':'exportar',
  };
  const id = mapaNav[seccion] || seccion;
  // Actualizar clase activa en sidebar maquetado
  document.querySelectorAll('.d-item').forEach(i=>i.classList.remove('on'));
  if(el) el.classList.add('on');
  // Ocultar/mostrar banner
  const banner = document.querySelector('.d-banner');
  const scroll = document.querySelector('.d-scroll');
  const isInicio = (seccion==='inicio'||seccion==='dashboard');
  if(banner) banner.style.display = isInicio ? '' : 'none';
  if(scroll) scroll.style.display = isInicio ? '' : 'none';
  // Ocultar todas las secciones sec-*
  document.querySelectorAll('[id^="sec-"]').forEach(s=>s.style.display='none');
  // Llamar al goTo original
  goTo(id);
}
// Compatibilidad cerrarSesion
function cerrarSesion(){ doLogout(); }
// switchAuthTab del maquetado → switchAuthTab del original
function cambiarTab(tab){ switchAuthTab(tab==='login'?'login':'registro'); }

// ── togglePass (el maquetado llama togglePass, el original tiene togglePassMonkey) ──
function togglePass(inputId, iconEl) {
  const inp = document.getElementById(inputId);
  if(!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  iconEl.innerHTML = inp.type === 'text'
    ? `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>`
    : `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="15" height="15"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
}
