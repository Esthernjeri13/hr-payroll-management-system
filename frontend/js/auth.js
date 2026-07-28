(function () {
  const {
    getCurrentUser,
    setCurrentUser,
    clearCurrentUser,
    escapeHtml,
    request,
  } = window.hrApp;

  function requireAuth() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = './login.html';
      return null;
    }

    return currentUser;
  }

  function requireGuest() {
    const currentUser = getCurrentUser();
    if (currentUser) {
      window.location.href = './index.html';
      return false;
    }

    return true;
  }

  function logout() {
    clearCurrentUser();
    window.location.href = './login.html';
  }

  function renderTopbarControls() {
    const currentUser = getCurrentUser();
    const topbar = document.querySelector('.topbar');

    if (!currentUser || !topbar || topbar.querySelector('.auth-tools')) {
      return;
    }

    const tools = document.createElement('div');
    tools.className = 'auth-tools';
    tools.innerHTML = `
      <span class="auth-chip">${escapeHtml(currentUser.name)} - ${escapeHtml(currentUser.role)}</span>
      <button type="button" class="secondary">Logout</button>
    `;

    tools.querySelector('button').addEventListener('click', logout);
    topbar.appendChild(tools);
    refreshNotificationBadge();
  }

  async function refreshNotificationBadge() {
    const notificationsLink = document.querySelector('.nav a[href="./notification.html"]');
    if (!notificationsLink) {
      return;
    }

    try {
      const data = await request('/notifications');
      const unreadCount = data.notifications.filter((notification) => !notification.is_read).length;

      let badge = notificationsLink.querySelector('.notification-count');
      if (unreadCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notification-count';
          notificationsLink.appendChild(badge);
        }

        badge.textContent = unreadCount;
      } else if (badge) {
        badge.remove();
      }
    } catch (error) {
      return;
    }
  }

  window.hrAuth = {
    clearCurrentUser,
    getCurrentUser,
    refreshNotificationBadge,
    logout,
    requireAuth,
    requireGuest,
    renderTopbarControls,
    setCurrentUser,
  };

  document.addEventListener('DOMContentLoaded', renderTopbarControls);
})();
