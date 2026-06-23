import json

# Define the JavaScript code segments

viewstate_code = """const html = $input.first().json.data;

if (!html || typeof html !== 'string') {
  throw new Error('ComprAR no devolvió HTML válido. Status: ' + JSON.stringify($input.first().json));
}

const getHidden = (id) => {
  const m = html.match(new RegExp(`name="${id}"[^>]*value="([^"]*)"`, 'i'))
           || html.match(new RegExp(`id="${id}"\\\\s+value="([^"]*)"`, 'i'));
  return m ? m[1] : '';
};

const viewstate = getHidden('__VIEWSTATE');
const eventvalidation = getHidden('__EVENTVALIDATION');
const viewstateGenerator = getHidden('__VIEWSTATEGENERATOR');

let excelTarget = '';
const patterns = [
  /__doPostBack\\('([^']*(?:xcel|xport|Export|Excel|escargar|nform)[^']*)',''/i,
  /href="javascript:__doPostBack\\('([^']*)','(?:|Excel|export)'\\)"[^>]*>[^<]*[Ee]xcel/i
];
for (const p of patterns) {
  const m = html.match(p);
  if (m) { excelTarget = m[1]; break; }
}

// Extraer links de detalle de cada licitación del HTML de resultados.
// Cada fila tiene un anchor apuntando a VistaPreviaPliegoCiudadano.aspx?qs=<token>
// El token es opaco (firmado por el server), no reconstruible desde el numero.
const urlMap = {};
const urlRegex = /(?:href|action)=['"]([^'"]*VistaPreviaPliegoCiudadano\\.aspx\\?qs=[^'"]*)['"]|window\\.(?:open|location\\.href)\\s*=?\\s*['"]([^'"]*VistaPreviaPliegoCiudadano\\.aspx\\?qs=[^'"]*)['"]/gi;
const allUrls = [];
let m;
while ((m = urlRegex.exec(html)) !== null) {
  let rawUrl = (m[1] || m[2]).replace(/&amp;/g, '&');
  const url = rawUrl.startsWith('http') ? rawUrl : 'https://comprar.gob.ar' + rawUrl;
  allUrls.push({ index: m.index, url });
}

// Número de proceso: formato dd/ddd-dddd-LETRASdd (ej: 84/37-0355-LPU26)
const numRegex = /\\b(\\d{2,4}\\/\\d{2,4}-\\d{3,6}-[A-Z]{2,6}\\d{1,4})\\b/g;
const allNumeros = [];
while ((m = numRegex.exec(html)) !== null) {
  allNumeros.push({ index: m.index, numero: m[1] });
}

// Para cada URL encontrada, asociar con el número de proceso más cercano (anterior en el HTML)
for (const { index: urlIdx, url } of allUrls) {
  let closest = null;
  for (const { index: numIdx, numero } of allNumeros) {
    if (numIdx < urlIdx && (closest === null || numIdx > closest.index)) {
      closest = { index: numIdx, numero };
    }
  }
  if (closest) urlMap[closest.numero] = url;
}

const prev = $('Preparar Fechas').item.json;

return [{
  json: {
    viewstate,
    eventvalidation,
    viewstateGenerator,
    excelTarget,
    urlMap,
    fechaDesde: prev.fechaDesde,
    fechaHasta: prev.fechaHasta,
    fechaHoyISO: prev.fechaHoyISO,
    fechaHoyDisplay: prev.fechaHoyDisplay,
    debug_htmlLength: html.length,
    debug_viewstateFound: viewstate.length > 0,
    debug_excelFound: excelTarget.length > 0,
    debug_urlsFound: Object.keys(urlMap).length,
  }
}];"""

score_code = """const RUBROS = {
  informatica: ['informatic','tecnolog','software','hardware','sistema','licencia','computadora','servidor','internet','digital','electroni','impres','monitor','teclado','mouse','router','switch','firewall','ups'],
  ferreteria: ['ferreter','herramienta','tornillo','pintura','construcc','materiales','buloneria','soldadura','caño','tubo','cable elect'],
  indumentaria: ['indumentaria','calzado','ropa','uniforme','vestimenta','textil','tela','prenda','campera','pantalon','camisa','bota'],
  epp: ['epp','protecci personal','casco','guante','chaleco','barbijo','seguridad laboral','equipo de protecci','antiparras','respirador','mameluco','arnes'],
  bazar: ['bazar','vajilla','utensilio','cocina','menaje','cristaler','cubierto','olla','bandeja','cafetera','dispenser'],
  mantenimiento: ['mantenimiento','limpieza','edificio','plomeria','plomería','electricidad','electric','sanitario','aire acondicionado','ascensor','pintura','jardineria','jardinería','fumigacion','fumigación','conservacion','conservación','reparacion','reparación'],
};

const norm = (s) => {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
};

const prev = $('Preparar Fechas').item.json;
const hoyISO = prev.fechaHoyISO;
const hoyDisplay = prev.fechaHoyDisplay;

// urlMap extraído del HTML de búsqueda en el paso anterior
const urlMap = ($('Extraer ViewState').item.json.urlMap) || {};

let alta = 0, media = 0, baja = 0;
const licitaciones = [];
const rows = $input.all();

for (const item of rows) {
  const row = item.json;
  if (!row || Object.keys(row).length === 0) continue;

  const tituloKey = Object.keys(row).find(k => k.startsWith('Nombre') || k.startsWith('nombre'));
  const titulo = (tituloKey ? String(row[tituloKey]) : '') || row['Descripcion'] || row['Descripción'] || '';
  const numero = row['Número de Proceso'] || row['Numero de Proceso'] || row['número de proceso'] || '';
  const organismo = row['Unidad Ejecutora'] || row['Organismo'] || row['unidad ejecutora'] || '';
  const fechaCierreRaw = row['Fecha de Apertura'] || row['Fecha Apertura'] || '';
  const fechaPubRaw = row['Fecha de Publicación'] || row['Fecha Publicacion'] || row['Fecha de Publicacion'] || '';
  const montoRaw = row['Monto Estimado'] || row['Presupuesto Oficial'] || null;
  const monto = montoRaw ? parseFloat(String(montoRaw).replace(/[$.,' ]/g, '').replace(',', '.')) : null;

  const tituloNorm = norm(titulo);
  let rubroMatch = null;
  for (const [rubro, keywords] of Object.entries(RUBROS)) {
    if (keywords.some(kw => tituloNorm.includes(norm(kw)))) {
      rubroMatch = rubro;
      break;
    }
  }
  if (!rubroMatch) continue;

  let fechaCierreISO = null;
  let diasAlCierre = null;
  const matchCierre = String(fechaCierreRaw).match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
  if (matchCierre) {
    const [, d, mo, y] = matchCierre;
    fechaCierreISO = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
    diasAlCierre = Math.ceil((new Date(fechaCierreISO + 'T23:59:59') - new Date(hoyISO + 'T00:00:00')) / 86400000);
  }

  let fechaPubISO = null;
  const matchPub = String(fechaPubRaw).match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
  if (matchPub) {
    const [, d, mo, y] = matchPub;
    fechaPubISO = `${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  let score = 50;
  if (monto !== null && !isNaN(monto)) {
    if (monto >= 5000000) score += 15;
    else if (monto >= 1000000) score += 10;
    else if (monto >= 500000) score += 5;
    else score += 2;
  } else {
    score += 5;
  }
  if (diasAlCierre !== null) {
    if (diasAlCierre <= 0) score += 0;
    else if (diasAlCierre <= 3) score += 5;
    else if (diasAlCierre <= 7) score += 10;
    else if (diasAlCierre <= 15) score += 15;
    else score += 8;
  }

  const prioridad = score >= 70 ? 'alta' : score >= 40 ? 'media' : 'baja';
  if (prioridad === 'alta') alta++;
  else if (prioridad === 'media') media++;
  else baja++;

  const numeroTrim = String(numero).trim();
  licitaciones.push({
    portal: 'nacional',
    numero: numeroTrim,
    titulo: String(titulo).trim(),
    organismo: String(organismo).trim(),
    rubro: rubroMatch,
    monto_estimado: (monto !== null && !isNaN(monto)) ? monto : null,
    fecha_publicacion: fechaPubISO,
    fecha_cierre: fechaCierreISO,
    url: urlMap[numeroTrim] || null,
    estado: 'nueva',
    score,
    prioridad,
    participacion_previa: false,
  });
}

return [{ json: { licitaciones, count: licitaciones.length, alta, media, baja, fechaHoy: hoyDisplay } }];"""

puppeteer_code = """const puppeteer = require('puppeteer');
const item = $input.item.json;

// Si ya tenemos una URL válida de urlMap
let url = item.url;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  headless: 'new'
});

const page = await browser.newPage();
try {
  if (!url) {
    // Si no hay URL, buscamos por número de proceso en BuscarAvanzado.aspx
    await page.goto("https://comprar.gob.ar/BuscarAvanzado.aspx", { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.waitForSelector('#ctl00_CPH1_txtNumeroProceso');
    await page.type('#ctl00_CPH1_txtNumeroProceso', item.numero);
    
    // Enviamos la búsqueda
    await page.evaluate(() => {
      const btn = document.getElementById('ctl00_CPH1_btnListarPliegoNumero');
      if (btn) btn.click();
    });

    // Esperamos a que cargue la tabla de resultados
    await page.waitForSelector('#ctl00_CPH1_GridListaPliegos', { timeout: 20000 });
    
    // Obtenemos el ID del link
    const linkId = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[id*="lnkNumeroProceso"]'));
      return anchors.length > 0 ? anchors[0].id : null;
    });

    if (!linkId) {
      throw new Error("Licitación no encontrada en la búsqueda por número");
    }

    // Hacemos click nativo para ir al detalle
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }),
      page.click('#' + linkId)
    ]);
    
    url = page.url();
  } else {
    // Si ya tenemos la URL directa, navegamos directamente
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  }

  // Extraemos la información del detalle
  const data = await page.evaluate(() => {
    const getVal = (id) => {
      const el = document.querySelector(`[id*="${id}"]`);
      return el ? el.textContent.trim() : null;
    };

    const numero_expediente = getVal('usrCabeceraPliego_lblNumExpediente');
    const tipo_procedimiento = getVal('UC_InformacionBasica_lblProcedimientoSeleccion');
    const modalidad = getVal('UC_InformacionBasica_lblModalidad');

    const publicacion = getVal('UC_Cronograma_lblFechaPublicacion');
    const fin_consultas = getVal('UC_Cronograma_lblFechaFinalConsultas');
    const apertura = getVal('UC_Cronograma_lblFechaActoApertura');
    const cronograma_detalle = { publicacion, fin_consultas, apertura };

    const renglones = [];
    const renglonesRows = Array.from(document.querySelectorAll('[id*="UC_DetalleProductos_gvLineaPliego"] tr')).slice(1);
    for (const tr of renglonesRows) {
      const tds = tr.querySelectorAll('td');
      if (tds.length >= 5) {
        renglones.push({
          numero: tds[0].textContent.trim(),
          objeto_gasto: tds[1].textContent.trim(),
          codigo: tds[2].textContent.trim(),
          descripcion: tds[3].textContent.trim(),
          cantidad: tds[4].textContent.trim()
        });
      }
    }

    const proveedores_invitados = [];
    const provTable = document.querySelector('table[id*="Proveedores"]');
    if (provTable) {
      const rows = Array.from(provTable.querySelectorAll('tr')).slice(1);
      for (const tr of rows) {
        const tds = tr.querySelectorAll('td');
        if (tds.length >= 2) {
          proveedores_invitados.push({
            razon_social: tds[0].textContent.trim(),
            cuit: tds[1].textContent.trim()
          });
        }
      }
    }

    return {
      numero_expediente,
      tipo_procedimiento,
      modalidad,
      cronograma_detalle,
      renglones,
      proveedores_invitados
    };
  });

  return [{
    json: {
      ...item,
      url_detalle: url,
      numero_expediente: data.numero_expediente,
      tipo_procedimiento: data.tipo_procedimiento,
      modalidad: data.modalidad,
      cronograma_detalle: data.cronograma_detalle,
      renglones: data.renglones,
      proveedores_invitados: data.proveedores_invitados
    }
  }];

} catch (err) {
  console.error("Error al obtener detalle de ComprAR para " + item.numero + ": " + err.message);
  return [{
    json: {
      ...item,
      url_detalle: url || null,
      _error: err.message
    }
  }];
} finally {
  await browser.close();
}"""

# Read current workflow JSON
workflow_path = 'n8n/workflows/comprar-importacion-diaria.json'
with open(workflow_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find the nodes and update their jsCode parameters
for node in data.get('nodes', []):
    if node.get('id') == 'node-viewstate':
        node['parameters']['jsCode'] = viewstate_code
        print("Updated Extraer ViewState node code.")
    elif node.get('id') == 'node-score':
        node['parameters']['jsCode'] = score_code
        print("Updated Mapear y Calcular Score node code.")
    elif node.get('id') == 'node-puppeteer-detalle':
        node['parameters']['jsCode'] = puppeteer_code
        print("Updated Obtener Detalle ComprAR node code.")

# Write compiled workflow JSON back
with open(workflow_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
print("Workflow compiled and written successfully.")
