function getUser() {
  return JSON.parse(localStorage.getItem('xai_user') || 'null');
}

async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

const user = getUser();
if (!user) location.href = '/login.html';

document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('xai_user');
  location.href = '/login.html';
});

function selectedTechniques() {
  return [...document.querySelectorAll('#xaiCatalog input[type="checkbox"]:checked')].map((item) => item.value);
}

function parseComma(text) {
  return text.split(',').map((v) => v.trim()).filter(Boolean);
}

async function loadCatalog() {
  const data = await api('/api/xai-models');
  const container = document.getElementById('xaiCatalog');
  container.innerHTML = '';
  data.techniques.forEach((tech) => {
    const card = document.createElement('label');
    card.className = 'mini-card';
    card.innerHTML = `<input type="checkbox" value="${tech.id}"/> <strong>${tech.name}</strong><br/><small>${tech.description}</small><br/><small><em>${tech.bestFor.join(', ')}</em></small>`;
    container.appendChild(card);
  });
}

async function loadModels() {
  const data = await api(`/api/models?userId=${encodeURIComponent(user.id)}`);
  const list = document.getElementById('modelsList');
  list.innerHTML = '';
  data.models.forEach((model) => {
    const li = document.createElement('li');
    li.textContent = `${model.name} (${model.modelType}) · ${model.flow} · técnicas: ${model.techniques.join(', ') || 'ninguna'}`;
    list.appendChild(li);
  });
}

document.getElementById('saveModelBtn').addEventListener('click', async () => {
  const status = document.getElementById('status');
  try {
    await api('/api/models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        name: document.getElementById('modelName').value,
        modelType: document.getElementById('modelType').value,
        objective: document.getElementById('modelObjective').value,
        inputs: parseComma(document.getElementById('modelInputs').value),
        flow: document.querySelector('input[name="flow"]:checked')?.value || 'upload',
        techniques: selectedTechniques()
      })
    });
    status.textContent = 'Modelo guardado';
    loadModels();
  } catch (error) {
    status.textContent = error.message;
  }
});

loadCatalog().then(loadModels).catch((error) => {
  document.getElementById('status').textContent = error.message;
});
