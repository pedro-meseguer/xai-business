const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const HOST = '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const techniques = [
  {
    id: 'shap',
    name: 'SHAP',
    type: 'global-local',
    summary: 'Atribuye el peso de cada variable a cada predicción y al comportamiento global.'
  },
  {
    id: 'lime',
    name: 'LIME',
    type: 'local',
    summary: 'Explica decisiones concretas con un modelo local aproximado alrededor del caso.'
  },
  {
    id: 'counterfactual',
    name: 'Counterfactual',
    type: 'recourse',
    summary: 'Muestra qué cambios mínimos podrían alterar una decisión negativa.'
  },
  {
    id: 'pdp-ice',
    name: 'PDP/ICE',
    type: 'global',
    summary: 'Describe cómo cambia la salida del modelo cuando varían las variables.'
  }
];

const db = {
  users: [],
  models: [],
  cases: [],
  reports: []
};

function seedData() {
  const user = {
    id: `usr-${Date.now()}`,
    fullName: 'Marta Gómez',
    email: 'marta.riesgos@empresa.eu',
    createdAt: new Date().toISOString()
  };

  const model = {
    id: `mdl-${Date.now()}`,
    userId: user.id,
    name: 'credit-risk-v4',
    objective: 'Evaluar solicitudes de crédito al consumo',
    inputs: ['edad', 'ingresos', 'deuda_actual', 'historial_pagos'],
    flow: 'upload',
    techniques: ['shap', 'counterfactual'],
    createdAt: new Date().toISOString()
  };

  db.users.push(user);
  db.models.push(model);
}
seedData();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });

    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

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

function buildReport({ user, model, caseItem, payload }) {
  const createdAt = new Date().toISOString();
  const flow = payload.flow === 'upload' ? 'upload' : 'questionnaire';

  const selectedTechniques = Array.isArray(payload.techniques)
    ? payload.techniques.filter(Boolean)
    : model?.techniques || [];
  const finalTechniques = selectedTechniques.length ? selectedTechniques : ['Documentación declarativa'];

  const justificationFactors = Array.isArray(caseItem.inputValues)
    ? caseItem.inputValues.map((entry) => `${entry.name}: ${entry.value}`)
    : [];

  return {
    metadata: {
      reportId: createId('rpt'),
      createdAt,
      regulationScope: 'EU AI Act - decisiones de alto impacto',
      flow
    },
    subject: {
      personName: caseItem.personName,
      personIdentifier: caseItem.personIdentifier,
      ownerUser: user ? { id: user.id, fullName: user.fullName, email: user.email } : null
    },
    modelContext: {
      modelId: model?.id || null,
      modelName: model?.name || payload.modelName || 'Modelo no especificado',
      objective: payload.objective || model?.objective || 'No informado',
      decision: caseItem.decision,
      timestamp: caseItem.createdAt
    },
    explainability: {
      techniques: finalTechniques,
      perPersonInputs: justificationFactors,
      highlights:
        payload.highlights ||
        'Se priorizaron las variables más influyentes para justificar la decisión individual de este caso.'
    },
    compliance: {
      humanOversight:
        payload.humanOversight ||
        'Revisión humana obligatoria para casos frontera, denegaciones y reclamaciones.',
      appealProcess:
        payload.appealProcess ||
        'La persona afectada puede solicitar revisión manual y aportar nueva documentación.'
    },
    limitations: [
      flow === 'upload'
        ? 'Las explicaciones dependen de la calidad de los datos y de la representatividad del entrenamiento.'
        : 'Modo cuestionario: la explicación es declarativa y no sustituye auditoría técnica del modelo.',
      'Mantener trazabilidad de versiones del modelo y registro de decisiones por caso/persona.'
    ]
  };
}

function getPathId(urlPath, basePath) {
  const parts = urlPath.split('/').filter(Boolean);
  const baseParts = basePath.split('/').filter(Boolean);
  if (parts.length === baseParts.length + 1) {
    return parts[parts.length - 1];
  }
  return null;
}

function serveStatic(req, res, pathname) {
  const publicDir = path.join(__dirname, 'public');
  const requested = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(requested).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(filePath);
    const contentTypeMap = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    };

    res.writeHead(200, { 'Content-Type': contentTypeMap[ext] || 'text/plain; charset=utf-8' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (url.pathname === '/api/techniques' && req.method === 'GET') {
    sendJson(res, 200, { techniques });
    return;
  }

  if (url.pathname === '/api/users' && req.method === 'GET') {
    sendJson(res, 200, { users: db.users });
    return;
  }

  if (url.pathname === '/api/users' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.fullName || !payload.email) {
        sendJson(res, 400, { error: 'fullName and email are required' });
        return;
      }

      const user = {
        id: createId('usr'),
        fullName: payload.fullName,
        email: payload.email,
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      sendJson(res, 201, { user });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/models' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const models = userId ? db.models.filter((m) => m.userId === userId) : db.models;
    sendJson(res, 200, { models });
    return;
  }

  if (url.pathname === '/api/models' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.userId || !payload.name) {
        sendJson(res, 400, { error: 'userId and name are required' });
        return;
      }

      const userExists = db.users.some((u) => u.id === payload.userId);
      if (!userExists) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      const model = {
        id: createId('mdl'),
        userId: payload.userId,
        name: payload.name,
        objective: payload.objective || '',
        inputs: Array.isArray(payload.inputs) ? payload.inputs : [],
        flow: payload.flow === 'questionnaire' ? 'questionnaire' : 'upload',
        techniques: Array.isArray(payload.techniques) ? payload.techniques : [],
        createdAt: new Date().toISOString()
      };
      db.models.push(model);
      sendJson(res, 201, { model });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/cases' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const cases = userId ? db.cases.filter((item) => item.userId === userId) : db.cases;
    sendJson(res, 200, { cases });
    return;
  }

  if (url.pathname === '/api/cases' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.userId || !payload.personName || !payload.decision) {
        sendJson(res, 400, { error: 'userId, personName and decision are required' });
        return;
      }

      const userExists = db.users.some((u) => u.id === payload.userId);
      if (!userExists) {
        sendJson(res, 404, { error: 'User not found' });
        return;
      }

      const caseItem = {
        id: createId('case'),
        userId: payload.userId,
        modelId: payload.modelId || null,
        personName: payload.personName,
        personIdentifier: payload.personIdentifier || '',
        decision: payload.decision,
        inputValues: Array.isArray(payload.inputValues) ? payload.inputValues : [],
        createdAt: new Date().toISOString()
      };
      db.cases.push(caseItem);
      sendJson(res, 201, { case: caseItem });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/report' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      if (!payload.userId || !payload.caseId) {
        sendJson(res, 400, { error: 'userId and caseId are required' });
        return;
      }

      const user = db.users.find((u) => u.id === payload.userId);
      const caseItem = db.cases.find((item) => item.id === payload.caseId && item.userId === payload.userId);
      if (!user || !caseItem) {
        sendJson(res, 404, { error: 'User or case not found' });
        return;
      }

      const model = caseItem.modelId ? db.models.find((m) => m.id === caseItem.modelId) : null;
      const report = buildReport({ user, model, caseItem, payload });

      db.reports.push({ id: report.metadata.reportId, userId: user.id, caseId: caseItem.id, report });
      sendJson(res, 200, { report });
    } catch (error) {
      sendJson(res, 400, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/reports' && req.method === 'GET') {
    const userId = url.searchParams.get('userId');
    const reports = userId ? db.reports.filter((r) => r.userId === userId) : db.reports;
    sendJson(res, 200, { reports });
    return;
  }

  const caseId = getPathId(url.pathname, '/api/cases');
  if (caseId && req.method === 'GET') {
    const caseItem = db.cases.find((item) => item.id === caseId);
    if (!caseItem) {
      sendJson(res, 404, { error: 'Case not found' });
      return;
    }
    sendJson(res, 200, { case: caseItem });
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }

  sendJson(res, 404, { error: 'Route not found' });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
  });
}

module.exports = { server, buildReport };
