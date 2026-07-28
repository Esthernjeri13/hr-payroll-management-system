(function () {
  const currentUser = window.hrAuth.requireAuth();
  if (!currentUser) {
    return;
  }
  const { request, formatDate, escapeHtml, setStatus, badgeClass } = window.hrApp;

  const leaveForm = document.getElementById('leaveForm');
  const leaveFormStatus = document.getElementById('leaveFormStatus');
  const leaveListStatus = document.getElementById('leaveListStatus');
  const leaveListBody = document.getElementById('leaveListBody');
  const leaveType = document.getElementById('leaveType');
  const leaveStartDate = document.getElementById('leaveStartDate');
  const leaveEndDate = document.getElementById('leaveEndDate');

  function renderLeaveRequests(rows) {
    if (!rows.length) {
      leaveListBody.innerHTML = '<tr><td colspan="6"><div class="empty">No leave requests yet.</div></td></tr>';
      return;
    }

    leaveListBody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.employee_name)}</strong><br />
          <span class="muted">${escapeHtml(row.team || '')}</span>
        </td>
        <td>${formatDate(row.start_date)} - ${formatDate(row.end_date)}</td>
        <td>${escapeHtml(row.leave_type)}</td>
        <td>${escapeHtml(row.total_days)} days</td>
        <td><span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>${escapeHtml(row.manager_comments || '-')}</td>
      </tr>
    `
      )
      .join('');
  }

  async function loadLeaveRequests() {
    try {
      const data = await request('/leave');
      renderLeaveRequests(data.leave_requests);
      setStatus(leaveListStatus, 'Leave requests loaded.', 'success');
    } catch (error) {
      setStatus(leaveListStatus, error.message, 'error');
    }
  }

  async function submitLeave(event) {
    event.preventDefault();

    try {
      await request('/leave', {
        method: 'POST',
        body: JSON.stringify({
          leave_type: leaveType.value,
          start_date: leaveStartDate.value,
          end_date: leaveEndDate.value,
        }),
      });

      setStatus(leaveFormStatus, 'Leave request submitted successfully.', 'success');
      leaveForm.reset();
      await loadLeaveRequests();
    } catch (error) {
      setStatus(leaveFormStatus, error.message, 'error');
    }
  }

  leaveForm.addEventListener('submit', submitLeave);
  loadLeaveRequests();
})();
