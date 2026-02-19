const state = {
  techniques: [],
  users: [],
  models: [],
  cases: [],
  selectedUserId: null
};

const el = {
  userName: document.getElementById('userName'),
  userEmail: document.getElementById('userEmail'),
  createUserBtn: document.getElementById('createUserBtn'),
  userSelect: document.getElementById('userSelect'),
  modelName: document.getElementById('modelName'),
  modelObjective: document.getElementById('modelObjective'),
  modelInputs: document.getElementById('modelInputs'),
  createModelBtn: document.getElementById('createModelBtn'),
  techniques: document.getElementById('techniques'),
  caseModelSelect: document.getElementById('caseModelSelect'),
  personName: document.getElementById('personName'),
  personId: document.getElementById('personId'),
  decision: document.getElementById('decision'),
  caseInputs: document.getElementById('caseInputs'),
  createCaseBtn: document.getElementById('createCaseBtn'),
  modelsList: document.getElementById('modelsList'),
  casesList: document.getElementById('casesList'),
  reportCaseSelect: document.getElementById('reportCaseSelect'),
  humanOversight: document.getElementById('humanOversight'),
  highlights: document.getElementById('highlights'),
  generateReportBtn: document.getElementById('generateReportBtn'),
  reportOutput: document.getElementById('reportOutput')
};

function selectedFlow() {
  return document.querySelector('input[name="flow"]:checked')?.value || 'upload';
}

function selectedTechniqueIds() {
  return [...el.techniques.querySelectorAll('input[type="checkbox"]:checked')].map((item) => item.value);
}

function parseCommaValues(input) {
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCaseInputs(text) {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [name, value] = entry.split('=').map((part) => part.trim());
      return { name: name || 'input', value: value || '' };
    });
}

async function api(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Error en la petición');
  }
  return data;
}

function renderUsers() {
  el.userSelect.innerHTML = '';
  state.users.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = `${user.fullName} (${user.email})`;
    el.userSelect.appendChild(option);
  });

  if (state.users.length) {
    if (!state.selectedUserId || !state.users.some((u) => u.id === state.selectedUserId)) {
      state.selectedUserId = state.users[0].id;
    }
    el.userSelect.value = state.selectedUserId;
  }
}

function renderTechniques() {
  el.techniques.innerHTML = '';
  state.techniques.forEach((technique) => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${technique.id}" /> ${technique.name} — ${technique.summary}`;
    el.techniques.appendChild(label);
  });
}

function renderModels() {
  el.caseModelSelect.innerHTML = '<option value="">Sin modelo (cuestionario)</option>';
  el.modelsList.innerHTML = '';

  state.models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name} · ${model.flow}`;
    el.caseModelSelect.appendChild(option);

    const li = document.createElement('li');
    li.textContent = `${model.name} | objetivo: ${model.objective || '-'} | técnicas: ${model.techniques.join(', ') || 'declarativa'}`;
    el.modelsList.appendChild(li);
  });
}

function renderCases() {
  el.casesList.innerHTML = '';
  el.reportCaseSelect.innerHTML = '';

  state.cases.forEach((caseItem) => {
    const li = document.createElement('li');
    li.textContent = `${caseItem.personName} (${caseItem.personIdentifier || 'sin id'}) → ${caseItem.decision}`;
    el.casesList.appendChild(li);

    const option = document.createElement('option');
    option.value = caseItem.id;
    option.textContent = `${caseItem.personName} · ${caseItem.decision}`;
    el.reportCaseSelect.appendChild(option);
  });
}

async function loadUsers() {
  const data = await api('/api/users');
  state.users = data.users;
  renderUsers();
}

async function loadModels() {
  if (!state.selectedUserId) {
    state.models = [];
    renderModels();
    return;
  }
  const data = await api(`/api/models?userId=${encodeURIComponent(state.selectedUserId)}`);
  state.models = data.models;
  renderModels();
}

async function loadCases() {
  if (!state.selectedUserId) {
    state.cases = [];
    renderCases();
    return;
  }
  const data = await api(`/api/cases?userId=${encodeURIComponent(state.selectedUserId)}`);
  state.cases = data.cases;
  renderCases();
}

async function bootstrap() {
  const t = await api('/api/techniques');
  state.techniques = t.techniques;
  renderTechniques();

  await loadUsers();
  await loadModels();
  await loadCases();
}

el.createUserBtn.addEventListener('click', async () => {
  try {
    await api('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: el.userName.value,
        email: el.userEmail.value
      })
    });

    el.userName.value = '';
    el.userEmail.value = '';
    await loadUsers();
    await loadModels();
    await loadCases();
  } catch (error) {
    alert(error.message);
  }
});

el.userSelect.addEventListener('change', async () => {
  state.selectedUserId = el.userSelect.value;
  await loadModels();
  await loadCases();
});

el.createModelBtn.addEventListener('click', async () => {
  try {
    if (!state.selectedUserId) throw new Error('Selecciona un usuario');

    await api('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.selectedUserId,
        name: el.modelName.value,
        objective: el.modelObjective.value,
        inputs: parseCommaValues(el.modelInputs.value),
        flow: selectedFlow(),
        techniques: selectedTechniqueIds()
      })
    });

    el.modelName.value = '';
    el.modelObjective.value = '';
    el.modelInputs.value = '';
    await loadModels();
  } catch (error) {
    alert(error.message);
  }
});

el.createCaseBtn.addEventListener('click', async () => {
  try {
    if (!state.selectedUserId) throw new Error('Selecciona un usuario');

    await api('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.selectedUserId,
        modelId: el.caseModelSelect.value || null,
        personName: el.personName.value,
        personIdentifier: el.personId.value,
        decision: el.decision.value,
        inputValues: parseCaseInputs(el.caseInputs.value)
      })
    });

    el.personName.value = '';
    el.personId.value = '';
    el.decision.value = '';
    el.caseInputs.value = '';
    await loadCases();
  } catch (error) {
    alert(error.message);
  }
});

el.generateReportBtn.addEventListener('click', async () => {
  try {
    if (!state.selectedUserId) throw new Error('Selecciona un usuario');
    if (!el.reportCaseSelect.value) throw new Error('Selecciona un caso');

    const report = await api('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: state.selectedUserId,
        caseId: el.reportCaseSelect.value,
        flow: selectedFlow(),
        techniques: selectedTechniqueIds(),
        highlights: el.highlights.value,
        humanOversight: el.humanOversight.value
      })
    });

    el.reportOutput.textContent = JSON.stringify(report.report, null, 2);
  } catch (error) {
    alert(error.message);
  }
});

bootstrap().catch((error) => {
  el.reportOutput.textContent = `Error al iniciar: ${error.message}`;
});
