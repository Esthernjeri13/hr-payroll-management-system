(function () {
  const API_BASE = '/api';
  const STORAGE_KEY = 'hr_auth_user';

  function getCurrentUser() {
    try {
      const rawValue = localStorage.getItem(STORAGE_KEY);
      return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function request(path, options = {}) {
    const currentUser = getCurrentUser();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (currentUser) {
      headers['X-User-Id'] = String(currentUser.id);
      headers['X-User-Name'] = currentUser.name;
      headers['X-User-Role'] = currentUser.role;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      headers,
      ...options,
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(data.error || 'Request failed.');
    }

    return data;
  }

  function formatMoney(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(amount);
  }

  function formatDate(value) {
    if (value === undefined || value === null || value === '') {
      return '-';
    }

    const date = value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())
        ? new Date(`${String(value).trim()}T00:00:00`)
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function setStatus(element, message, type = 'info') {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = `status ${type === 'error' ? 'error' : type === 'success' ? 'success' : ''}`.trim();
  }

  function clearStatus(element) {
    if (!element) {
      return;
    }

    element.textContent = '';
    element.className = 'status';
  }

  function badgeClass(value) {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    return 'pending';
  }

  window.hrApp = {
    clearCurrentUser,
    getCurrentUser,
    request,
    formatMoney,
    formatDate,
    escapeHtml,
    setCurrentUser,
    setStatus,
    clearStatus,
    badgeClass,
  };
})();
