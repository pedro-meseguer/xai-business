const test = require('node:test');
const assert = require('node:assert/strict');
const { buildStructuredReport, renderReportDoc } = require('../server');

function fixture(overrides = {}) {
  return {
    user: { id: 'usr-1', fullName: 'Ana Pérez', email: 'ana@example.com' },
    model: {
      id: 'mdl-1',
      name: 'credit-model',
      modelType: 'xgboost',
      objective: 'Evaluar crédito',
      techniques: ['shap']
    },
    caseItem: {
      id: 'case-1',
      personName: 'Luis Martín',
      personIdentifier: '123A',
      decision: 'Denegado',
      inputValues: [
        { name: 'ingresos', value: '1100' },
        { name: 'deuda', value: '950' }
      ],
      createdAt: '2026-02-19T10:00:00.000Z'
    },
    payload: { flow: 'upload' },
    ...overrides
  };
}

test('buildStructuredReport includes individual inputs and techniques', () => {
  const report = buildStructuredReport(fixture());
  assert.equal(report.subject.personName, 'Luis Martín');
  assert.equal(report.modelContext.modelType, 'xgboost');
  assert.deepEqual(report.explainability.perPersonInputs, ['ingresos: 1100', 'deuda: 950']);
  assert.deepEqual(report.explainability.techniques, ['shap']);
});

test('renderReportDoc outputs readable document sections', () => {
  const report = buildStructuredReport(fixture());
  const doc = renderReportDoc(report, 'Narrativa de prueba');

  assert.match(doc, /Reporte justificativo XAI/);
  assert.match(doc, /Narrativa de justificación/);
  assert.match(doc, /Luis Martín/);
  assert.match(doc, /Narrativa de prueba/);
});
