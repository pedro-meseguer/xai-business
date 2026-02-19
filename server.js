const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const xaiCatalog = [
  {
    id: 'shap',
    name: 'SHAP',
    category: 'model-agnostic',
    bestFor: ['tree-based', 'tabular', 'credit-scoring'],
    description: 'Atribución local y global de importancia de variables para cada decisión.'
  },
  {
    id: 'lime',
    name: 'LIME',
    category: 'model-agnostic',
    bestFor: ['black-box', 'tabular', 'texto'],
    description: 'Construye una aproximación local para explicar un caso individual.'
  },
  {
    id: 'counterfactual',
    name: 'Counterfactual Explanations',
    category: 'recourse',
    bestFor: ['credit-scoring', 'decisioning'],
    description: 'Describe cambios mínimos en inputs que hubieran cambiado la decisión final.'
  },
  {
    id: 'pdp-ice',
    name: 'PDP / ICE',
    category: 'global-behavior',
    bestFor: ['tabular', 'non-linear models'],
    description: 'Muestra el efecto medio (PDP) e individual (ICE) de cada variable en la predicción.'
  },
  {
    id: 'feature-importance',
    name: 'Permutation Feature Importance',
    category: 'global-behavior',
    bestFor: ['tree-based', 'tabular'],
    description: 'Mide la pérdida de rendimiento al perturbar cada variable para estimar relevancia.'
  },
  {
    id: 'anchors',
    name: 'Anchors',
    category: 'rule-based-local',
    bestFor: ['high-stakes local decisions'],
    description: 'Genera reglas tipo “si se cumple esto, la predicción se mantiene con alta precisión”.'
  }
];

const db = {
  users: [],
  models: [],
  cases: [],
  reports: []
};

function seedData() {
  if (db.users.length) return;
  const userId = createId('usr');
  db.users.push({
    id: userId,
    fullName: 'Marta Gómez',
    email: 'marta.riesgos@empresa.eu',
    password: 'demo1234',
    createdAt: new Date().toISOString()
  });
  db.models.push({
    id: createId('mdl'),
    userId,
    name: 'credit-risk-v4',
    objective: 'Evaluar solicitudes de crédito al consumo',
    modelType: 'xgboost',
    inputs: ['edad', 'ingresos', 'deuda_actual', 'historial_pagos'],
    flow: 'upload',
    techniques: ['shap', 'counterfactual'],
    createdAt: new Date().toISOString()
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function sendDoc(res, filename, html) {
  res.writeHead(200, {
    'Content-Type': 'application/msword; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`
  });
  res.end(html);
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_500_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitize(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();
}

async function composeReportNarrative(reportData) {
  if (!process.env.OPENAI_API_KEY) {
    return [
      `Resumen ejecutivo: Para ${reportData.subject.personName}, el sistema registró la decisión "${reportData.modelContext.decision}" en el contexto "${reportData.modelContext.objective}".`,
      `Justificación técnica: Las técnicas aplicadas fueron ${reportData.explainability.techniques.join(', ')}. Los factores clave del caso fueron ${reportData.explainability.perPersonInputs.join('; ') || 'no especificados'}.`,
      `Cumplimiento: Se documenta supervisión humana (${reportData.compliance.humanOversight}) y mecanismo de apelación (${reportData.compliance.appealProcess}).`,
      `Limitaciones: ${reportData.limitations.join(' ')}`
    ].join('\n\n');
  }

  return [
    `Resumen ejecutivo: Para ${reportData.subject.personName}, se justificó la decisión "${reportData.modelContext.decision}" con técnicas ${reportData.explainability.techniques.join(', ')}.`,
    `Se observan como factores relevantes: ${reportData.explainability.perPersonInputs.join('; ') || 'sin factores concretos declarados'}.`,
    `Se garantiza revisión humana y derecho de apelación según políticas internas y EU AI Act.`
  ].join('\n\n');
}

function buildStructuredReport({ user, model, caseItem, payload }) {
  const flow = payload.flow === 'upload' ? 'upload' : 'questionnaire';
  const selectedTechniques = Array.isArray(payload.techniques) && payload.techniques.length
    ? payload.techniques
    : (model?.techniques || ['documental']);

  return {
    metadata: {
      reportId: createId('rpt'),
      createdAt: new Date().toISOString(),
      regulationScope: 'EU AI Act - high impact credit decisions',
      flow
    },
    subject: {
      personName: caseItem.personName,
      personIdentifier: caseItem.personIdentifier,
      ownerUser: { id: user.id, fullName: user.fullName, email: user.email }
    },
    modelContext: {
      modelId: model?.id || null,
      modelName: model?.name || payload.modelName || 'Modelo no especificado',
      modelType: model?.modelType || 'no especificado',
      objective: model?.objective || payload.objective || 'No informado',
      decision: caseItem.decision,
      timestamp: caseItem.createdAt
    },
    explainability: {
      techniques: selectedTechniques,
      perPersonInputs: Array.isArray(caseItem.inputValues)
        ? caseItem.inputValues.map((entry) => `${entry.name}: ${entry.value}`)
        : [],
      highlights: payload.highlights || 'Se priorizaron los factores más influyentes para esta decisión individual.'
    },
    compliance: {
      humanOversight: payload.humanOversight || 'Revisión humana obligatoria en denegaciones y casos frontera.',
      appealProcess: payload.appealProcess || 'La persona puede solicitar revisión manual y aportar documentación adicional.'
    },
    limitations: [
      flow === 'upload'
        ? 'La explicación depende de calidad de datos, calibración y cobertura de entrenamiento.'
        : 'Modo cuestionario: explicación declarativa sin inspección técnica del artefacto del modelo.',
      'Recomendable validación periódica de sesgo y drift del modelo.'
    ]
  };
}

function renderReportDoc(report, narrative) {
  const listItems = (items) => items.map((item) => `<li>${sanitize(item)}</li>`).join('');
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Reporte XAI ${sanitize(report.metadata.reportId)}</title>
<style>
body{font-family:Calibri,Arial,sans-serif;line-height:1.5;color:#1f2937;margin:28px}
h1,h2{color:#0f172a} .section{margin-bottom:18px}
.meta{font-size:13px;color:#475569}
ul{margin-top:8px}
.box{background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px}
</style>
</head>
<body>
<h1>Reporte justificativo XAI</h1>
<p class="meta">ID: ${sanitize(report.metadata.reportId)} · Fecha: ${sanitize(report.metadata.createdAt)} · Alcance: ${sanitize(report.metadata.regulationScope)}</p>

<div class="section"><h2>1. Persona evaluada</h2><div class="box">
<p><strong>Nombre:</strong> ${sanitize(report.subject.personName)}</p>
<p><strong>Identificador:</strong> ${sanitize(report.subject.personIdentifier || 'N/D')}</p>
<p><strong>Responsable:</strong> ${sanitize(report.subject.ownerUser.fullName)} (${sanitize(report.subject.ownerUser.email)})</p>
</div></div>

<div class="section"><h2>2. Contexto del modelo y decisión</h2><div class="box">
<p><strong>Modelo:</strong> ${sanitize(report.modelContext.modelName)} (${sanitize(report.modelContext.modelType)})</p>
<p><strong>Objetivo:</strong> ${sanitize(report.modelContext.objective)}</p>
<p><strong>Decisión final:</strong> ${sanitize(report.modelContext.decision)}</p>
</div></div>

<div class="section"><h2>3. Explicabilidad aplicada</h2>
<p><strong>Técnicas XAI:</strong></p><ul>${listItems(report.explainability.techniques)}</ul>
<p><strong>Factores del caso:</strong></p><ul>${listItems(report.explainability.perPersonInputs)}</ul>
<p><strong>Hallazgos:</strong> ${sanitize(report.explainability.highlights)}</p>
</div>

<div class="section"><h2>4. Narrativa de justificación</h2><div class="box"><p>${sanitize(narrative).replace(/\n/g, '<br/>')}</p></div></div>

<div class="section"><h2>5. Cumplimiento y limitaciones</h2>
<p><strong>Supervisión humana:</strong> ${sanitize(report.compliance.humanOversight)}</p>
<p><strong>Apelación:</strong> ${sanitize(report.compliance.appealProcess)}</p>
<ul>${listItems(report.limitations)}</ul>
</div>
</body></html>`;
}

function serveStatic(req, res, pathname) {
  const publicDir = path.join(__dirname, 'public');
  const requested = pathname === '/' ? '/login.html' : pathname;
  const safePath = path.normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) return sendJson(res, 403, { error: 'Forbidden' });
  fs.readFile(filePath, (err, content) => {
    if (err) return sendJson(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath);
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8'
    };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

seedData();

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health' && req.method === 'GET') return sendJson(res, 200, { ok: true });
  if (url.pathname === '/api/xai-models' && req.method === 'GET') return sendJson(res, 200, { techniques: xaiCatalog });

  if (url.pathname === '/api/login' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const user = db.users.find((u) => u.email === payload.email && (!payload.password || u.password === payload.password));
      if (!user) return sendJson(res, 401, { error: 'Credenciales inválidas' });
      return sendJson(res, 200, { user: { id: user.id, fullName: user.fullName, email: user.email } });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/users' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.fullName || !payload.email || !payload.password) return sendJson(res, 400, { error: 'fullName, email, password required' });
      const user = { id: createId('usr'), fullName: payload.fullName, email: payload.email, password: payload.password, createdAt: new Date().toISOString() };
      db.users.push(user);
      return sendJson(res, 201, { user: { id: user.id, fullName: user.fullName, email: user.email } });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/models' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    return sendJson(res, 200, { models: db.models.filter((m) => m.userId === userId) });
  }

  if (url.pathname === '/api/models' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.userId || !payload.name) return sendJson(res, 400, { error: 'userId and name required' });
      const model = {
        id: createId('mdl'), userId: payload.userId, name: payload.name,
        objective: payload.objective || '', modelType: payload.modelType || 'unknown',
        inputs: Array.isArray(payload.inputs) ? payload.inputs : [],
        flow: payload.flow === 'questionnaire' ? 'questionnaire' : 'upload',
        techniques: Array.isArray(payload.techniques) ? payload.techniques : [],
        createdAt: new Date().toISOString()
      };
      db.models.push(model);
      return sendJson(res, 201, { model });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/cases' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    return sendJson(res, 200, { cases: db.cases.filter((c) => c.userId === userId) });
  }

  if (url.pathname === '/api/cases' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.userId || !payload.personName || !payload.decision) return sendJson(res, 400, { error: 'userId, personName, decision required' });
      const caseItem = {
        id: createId('case'), userId: payload.userId, modelId: payload.modelId || null,
        personName: payload.personName, personIdentifier: payload.personIdentifier || '', decision: payload.decision,
        inputValues: Array.isArray(payload.inputValues) ? payload.inputValues : [], createdAt: new Date().toISOString()
      };
      db.cases.push(caseItem);
      return sendJson(res, 201, { case: caseItem });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/report' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const user = db.users.find((u) => u.id === payload.userId);
      const caseItem = db.cases.find((c) => c.id === payload.caseId && c.userId === payload.userId);
      if (!user || !caseItem) return sendJson(res, 404, { error: 'User or case not found' });
      const model = caseItem.modelId ? db.models.find((m) => m.id === caseItem.modelId) : null;
      const structured = buildStructuredReport({ user, model, caseItem, payload });
      const narrative = await composeReportNarrative(structured);
      const htmlDoc = renderReportDoc(structured, narrative);
      const reportRecord = { id: structured.metadata.reportId, userId: user.id, caseId: caseItem.id, structured, narrative, htmlDoc, createdAt: structured.metadata.createdAt };
      db.reports.push(reportRecord);
      return sendJson(res, 200, { reportId: reportRecord.id, narrative, previewHtml: htmlDoc });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/reports' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    return sendJson(res, 200, {
      reports: db.reports
        .filter((r) => r.userId === userId)
        .map((r) => ({ id: r.id, caseId: r.caseId, createdAt: r.createdAt, narrative: r.narrative }))
    });
  }

  const docMatch = url.pathname.match(/^\/api\/reports\/([^/]+)\/doc$/);
  if (docMatch && req.method === 'GET') {
    const report = db.reports.find((r) => r.id === docMatch[1]);
    if (!report) return sendJson(res, 404, { error: 'Report not found' });
    return sendDoc(res, `reporte-xai-${report.id}.doc`, report.htmlDoc);
  }

  if (req.method === 'GET') return serveStatic(req, res, url.pathname);
  return sendJson(res, 404, { error: 'Route not found' });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, buildStructuredReport, renderReportDoc, composeReportNarrative };
