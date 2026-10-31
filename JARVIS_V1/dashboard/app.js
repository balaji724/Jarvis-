// JARVIS V1 Dashboard Client Script

const API_BASE = window.location.origin.includes(':8000') || window.location.origin.includes(':3000') 
  ? window.location.origin 
  : '';

async function fetchStatus() {
  try {
    const res = await fetch(`${API_BASE}/status`);
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('valTotal').textContent = data.total_companies || 0;
    document.getElementById('valCompleted').textContent = data.completed || 0;
    document.getElementById('valProcessing').textContent = data.processing || 0;
    document.getElementById('valNeedsReview').textContent = data.needs_review || 0;
    document.getElementById('valFailed').textContent = data.failed || 0;
    document.getElementById('valRemaining').textContent = data.remaining || 0;

    document.getElementById('valCurrentCompany').textContent = data.current_company || 'Idle';
    document.getElementById('valCurrentStep').textContent = data.current_step || 'Standby';
    document.getElementById('valConfidence').textContent = `${data.confidence || 0}%`;
    document.getElementById('systemState').textContent = `SYSTEM: ${(data.state || 'STANDBY').toUpperCase()}`;
  } catch (err) {
    console.warn('Status poll error:', err);
  }
}

async function fetchResults() {
  try {
    const res = await fetch(`${API_BASE}/results?limit=50`);
    if (!res.ok) return;
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.warn('Results fetch error:', err);
  }
}

function renderTable(items) {
  const tbody = document.getElementById('resultsBody');
  document.getElementById('resultsCount').textContent = `${items.length} entries`;

  if (!items || items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-msg">No research results loaded yet.</td></tr>';
    return;
  }

  tbody.innerHTML = items.map(item => {
    let badgeClass = 'badge-review';
    if (item.verification_status === 'VERIFIED') badgeClass = 'badge-verified';
    if (item.verification_status === 'FAILED') badgeClass = 'badge-failed';

    const linkedinCell = item.linkedin_url && item.linkedin_url !== 'NOT_FOUND'
      ? `<a href="${escapeHtml(item.linkedin_url)}" target="_blank" class="source-link">Profile ↗</a>`
      : '<span style="color:#64748b">NOT_FOUND</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(item.company)}</strong></td>
        <td><code>${escapeHtml(item.domain || '-')}</code></td>
        <td>${escapeHtml(item.full_name || '-')}</td>
        <td>${escapeHtml(item.designation || '-')}</td>
        <td>${escapeHtml(item.email || 'NOT_FOUND')}</td>
        <td><small>${escapeHtml(item.email_status || 'NOT_FOUND')}</small></td>
        <td>${linkedinCell}</td>
        <td><strong>${item.confidence || 0}%</strong></td>
        <td><span class="badge-tag ${badgeClass}">${escapeHtml(item.verification_status)}</span></td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

// Button Listeners
document.getElementById('btnStart').addEventListener('click', async () => {
  await fetch(`${API_BASE}/jobs/start`, { method: 'POST' });
  fetchStatus();
});

document.getElementById('btnPause').addEventListener('click', async () => {
  await fetch(`${API_BASE}/jobs/pause`, { method: 'POST' });
  fetchStatus();
});

document.getElementById('btnResume').addEventListener('click', async () => {
  await fetch(`${API_BASE}/jobs/resume`, { method: 'POST' });
  fetchStatus();
});

document.getElementById('btnStop').addEventListener('click', async () => {
  await fetch(`${API_BASE}/jobs/stop`, { method: 'POST' });
  fetchStatus();
});

document.getElementById('btnExport').addEventListener('click', async () => {
  const res = await fetch(`${API_BASE}/export/excel`, { method: 'POST' });
  const data = await res.json();
  alert(`Export generated: ${data.file_path || 'Success'}`);
});

document.getElementById('btnRefresh').addEventListener('click', () => {
  fetchStatus();
  fetchResults();
});

// Single Research Submission
document.getElementById('singleForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const company = document.getElementById('inputCompany').value.trim();
  const city = document.getElementById('inputCity').value.trim();
  const country = document.getElementById('inputCountry').value.trim();
  const role = document.getElementById('inputRole').value.trim() || 'CEO';

  const btn = e.target.querySelector('button');
  btn.textContent = 'Researching...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/research/company`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, city, country, role, max_people: 1 })
    });
    const result = await res.json();
    fetchResults();
    fetchStatus();
  } catch (err) {
    alert('Research error: ' + err.message);
  } finally {
    btn.textContent = 'Research Company';
    btn.disabled = false;
  }
});

// Polling interval
setInterval(fetchStatus, 3000);
fetchStatus();
fetchResults();
