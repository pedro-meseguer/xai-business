async function api(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

const statusEl = document.getElementById('status');

document.getElementById('loginBtn').addEventListener('click', async () => {
  try {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const data = await api('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('xai_user', JSON.stringify(data.user));
    location.href = '/models.html';
  } catch (error) {
    statusEl.textContent = error.message;
  }
});

document.getElementById('registerBtn').addEventListener('click', async () => {
  try {
    const payload = {
      fullName: document.getElementById('name').value,
      email: document.getElementById('regEmail').value,
      password: document.getElementById('regPassword').value
    };
    const data = await api('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    localStorage.setItem('xai_user', JSON.stringify(data.user));
    location.href = '/models.html';
  } catch (error) {
    statusEl.textContent = error.message;
  }
});
