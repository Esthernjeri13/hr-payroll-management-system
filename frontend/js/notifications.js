(function () {
  const currentUser = window.hrAuth.requireAuth();
  if (!currentUser) {
    return;
  }
  const { request, formatDate, escapeHtml, setStatus, badgeClass } = window.hrApp;

  const notificationStatus = document.getElementById('notificationStatus');
  const notificationList = document.getElementById('notificationList');

  function renderNotifications(rows) {
    if (!rows.length) {
      notificationList.innerHTML = '<div class="empty">No notifications yet.</div>';
      return;
    }

    notificationList.innerHTML = rows
      .map(
        (notification) => `
      <article class="panel ${notification.is_read ? '' : 'notification-unread'}" data-id="${notification.id}">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div>
            <h3 style="margin:0 0 6px;">${escapeHtml(notification.title)}</h3>
            <p style="margin:0 0 10px;" class="muted">${escapeHtml(notification.message)}</p>
            <small class="muted">${formatDate(notification.created_at)}</small>
          </div>
          <span class="badge ${notification.is_read ? 'approved' : 'pending'}">${notification.is_read ? 'Read' : 'Unread'}</span>
        </div>
        <div class="actions">
          <button class="secondary" data-action="open" data-id="${notification.id}">Open</button>
        </div>
      </article>
    `
      )
      .join('');
  }

  function getNotificationTarget(notification) {
    const title = String(notification.title || '').toLowerCase();

    if (title.includes('leave')) {
      return './leave.html';
    }

    if (title.includes('payroll')) {
      return './payroll.html';
    }

    if (title.includes('employee')) {
      return './employees.html';
    }

    return null;
  }

  async function loadNotifications() {
    try {
      const data = await request('/notifications');
      renderNotifications(data.notifications);
      setStatus(notificationStatus, 'Notifications loaded newest first.', 'success');
      if (window.hrAuth.refreshNotificationBadge) {
        window.hrAuth.refreshNotificationBadge();
      }
    } catch (error) {
      setStatus(notificationStatus, error.message, 'error');
    }
  }

  async function openNotification(notificationId) {
    const result = await request(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
    if (window.hrAuth.refreshNotificationBadge) {
      window.hrAuth.refreshNotificationBadge();
    }

    const targetPage = getNotificationTarget(result.notification);
    if (targetPage) {
      window.location.href = targetPage;
      return;
    }

    await loadNotifications();
  }

  notificationList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action="open"]');
    if (!button) {
      return;
    }

    try {
      await openNotification(button.getAttribute('data-id'));
    } catch (error) {
      alert(error.message);
    }
  });

  loadNotifications();
})();
