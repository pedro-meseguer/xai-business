function getUser() {
  return JSON.parse(localStorage.getItem('xai_user') || 'null');
}

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

function parseInputs(text) {
  return text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [name, value] = item.split('=').map((v) => v.trim());
      return { name, value };
    });
}

const user = getUser();
if (!user) location.href = '/login.html';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('xai_user');
  location.href = '/login.html';
});

async function loadModelsAndCases() {
  const [modelsData, casesData] = await Promise.all([
    api(`/api/models?userId=${encodeURIComponent(user.id)}`),
    api(`/api/cases?userId=${encodeURIComponent(user.id)}`)
  ]);

  const modelSelect = document.getElementById('modelSelect');
  modelSelect.innerHTML = '<option value="">Sin modelo (cuestionario)</option>';
  modelsData.models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name} (${model.modelType})`;
    modelSelect.appendChild(option);
  });

  const caseSelect = document.getElementById('caseSelect');
  caseSelect.innerHTML = '';
  casesData.cases.forEach((caseItem) => {
    const option = document.createElement('option');
    option.value = caseItem.id;
    option.textContent = `${caseItem.personName} · ${caseItem.decision}`;
    caseSelect.appendChild(option);
  });
}

document.getElementById('saveCaseBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  try {
    await api('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        modelId: document.getElementById('modelSelect').value || null,
        personName: document.getElementById('personName').value,
        personIdentifier: document.getElementById('personIdentifier').value,
        decision: document.getElementById('decision').value,
        inputValues: parseInputs(document.getElementById('inputs').value)
      })
    });
    status.textContent = 'Caso guardado';
    await loadModelsAndCases();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.getElementById('generateBtn').addEventListener('click', async () => {
  try {
    const result = await api('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        caseId: document.getElementById('caseSelect').value,
        highlights: document.getElementById('highlights').value,
        humanOversight: document.getElementById('humanOversight').value
      })
    });

    document.getElementById('preview').innerHTML = result.previewHtml;
    const download = document.getElementById('downloadDoc');
    download.href = `/api/reports/${result.reportId}/doc`;
    download.textContent = '⬇ Descargar reporte en Word (.doc)';
    download.classList.remove('hidden');
  } catch (error) {
    document.getElementById('status').textContent = error.message;
  }
});

loadModelsAndCases().catch((error) => {
  document.getElementById('status').textContent = error.message;
});
