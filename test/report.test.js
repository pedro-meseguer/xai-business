const test = require('node:test');
const assert = require('node:assert/strict');
const { buildReport } = require('../server');

function createFixture(overrides = {}) {
  return {
    user: {
      id: 'usr-1',
      fullName: 'Ana Pérez',
      email: 'ana@example.com'
    },
    model: {
      id: 'mdl-1',
      name: 'credit-model',
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
    payload: {
      flow: 'upload'
    },
    ...overrides
  };
}

test('buildReport includes per-person data and model context', () => {
  const report = buildReport(createFixture());

  assert.equal(report.subject.personName, 'Luis Martín');
  assert.equal(report.modelContext.modelName, 'credit-model');
  assert.deepEqual(report.explainability.perPersonInputs, ['ingresos: 1100', 'deuda: 950']);
  assert.equal(report.explainability.techniques[0], 'shap');
});

test('buildReport falls back to declarative mode for questionnaire flow', () => {
  const report = buildReport(
    createFixture({
      model: null,
      payload: { flow: 'questionnaire' }
    })
  );

  assert.equal(report.modelContext.modelName, 'Modelo no especificado');
  assert.equal(report.explainability.techniques[0], 'Documentación declarativa');
  assert.match(report.limitations[0], /declarativa/i);
});
