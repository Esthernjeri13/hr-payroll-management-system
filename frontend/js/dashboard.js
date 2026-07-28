(function () {
  const currentUser = window.hrAuth.requireAuth();
  if (!currentUser) {
    return;
  }
  const isHR = currentUser.role === 'HR';
  const {
    request,
    formatMoney,
    formatDate,
    escapeHtml,
    setStatus,
    clearStatus,
    badgeClass,
  } = window.hrApp;

  const pendingLeaveBody = document.getElementById('pendingLeaveBody');
  const currentLeaveBody = document.getElementById('currentLeaveBody');
  const balancesBody = document.getElementById('balancesBody');
  const payrollBody = document.getElementById('payrollBody');

  const pendingLeaveStatus = document.getElementById('pendingLeaveStatus');
  const currentLeaveStatus = document.getElementById('currentLeaveStatus');
  const balancesStatus = document.getElementById('balancesStatus');
  const payrollStatus = document.getElementById('payrollStatus');
  const dashboardPayrollStatus = document.getElementById('dashboardPayrollStatus');

  const pendingCount = document.getElementById('pendingCount');
  const currentLeaveCount = document.getElementById('currentLeaveCount');
  const balanceCount = document.getElementById('balanceCount');
  const payrollCount = document.getElementById('payrollCount');
  const payrollPeriod = document.getElementById('dashboardPayrollPeriod');
  const payrollForm = document.getElementById('dashboardPayrollForm');
  const approveLeaveButton = document.getElementById('approveLeaveButton');
  const generatePayrollButton = document.getElementById('generatePayrollButton');
  const pendingLeaveSection = document.getElementById('pendingLeaveSection');

  function renderPendingRows(rows) {
    if (!rows.length) {
      pendingLeaveBody.innerHTML = '<tr><td colspan="6"><div class="empty">No pending approvals right now.</div></td></tr>';
      return;
    }

    pendingLeaveBody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td>
          <strong>${escapeHtml(row.employee_name)}</strong><br />
          <span class="muted">${escapeHtml(row.team)}</span>
        </td>
        <td>${formatDate(row.start_date)} - ${formatDate(row.end_date)}</td>
        <td>${escapeHtml(row.leave_type)}</td>
        <td>${escapeHtml(row.manager_name || 'None')}</td>
        <td><span class="badge ${badgeClass(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>
          ${isHR ? `
            <div class="inline-actions">
              <button class="success" data-action="approve" data-id="${row.id}">Approve</button>
              <button class="danger" data-action="reject" data-id="${row.id}">Reject</button>
            </div>
          ` : '<span class="muted">HR only</span>'}
        </td>
      </tr>
    `
      )
      .join('');
  }

  function renderCurrentLeaveRows(rows) {
    if (!rows.length) {
      currentLeaveBody.innerHTML = '<tr><td colspan="4"><div class="empty">No employees are on leave today.</div></td></tr>';
      return;
    }

    currentLeaveBody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.full_name)}</td>
        <td>${escapeHtml(row.team)}</td>
        <td>${formatDate(row.start_date)} - ${formatDate(row.end_date)}</td>
        <td>${escapeHtml(row.leave_type)}</td>
      </tr>
    `
      )
      .join('');
  }

  function renderBalancesRows(rows) {
    if (!rows.length) {
      balancesBody.innerHTML = '<tr><td colspan="4"><div class="empty">No active employees found.</div></td></tr>';
      return;
    }

    balancesBody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.full_name)}</td>
        <td>${escapeHtml(row.team)}</td>
        <td>${escapeHtml(row.used_days)} days</td>
        <td>${escapeHtml(row.balance_days)} days</td>
      </tr>
    `
      )
      .join('');
  }

  function renderPayrollRows(rows) {
    if (!rows.length) {
      payrollBody.innerHTML = '<tr><td colspan="7"><div class="empty">No payroll has been generated yet.</div></td></tr>';
      return;
    }

    payrollBody.innerHTML = rows
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.employee_name)}</td>
        <td>${row.month}/${row.year}</td>
        <td>${formatMoney(row.gross_pay)}</td>
        <td>${escapeHtml(row.unpaid_leave_days)} days</td>
        <td>${formatMoney(row.tax)}</td>
        <td>${formatMoney(row.social_security)}</td>
        <td><strong>${formatMoney(row.net_pay)}</strong></td>
      </tr>
    `
      )
      .join('');
  }

  async function loadDashboard() {
    try {
      const data = await request('/dashboard');
      const dashboard = data.dashboard;

      pendingCount.textContent = dashboard.pending_requests.length;
      currentLeaveCount.textContent = dashboard.current_on_leave.length;
      balanceCount.textContent = dashboard.leave_balances.length;
      payrollCount.textContent = dashboard.payroll_history.length;

      renderPendingRows(dashboard.pending_requests);
      renderCurrentLeaveRows(dashboard.current_on_leave);
      renderBalancesRows(dashboard.leave_balances);
      renderPayrollRows(dashboard.payroll_history);

      setStatus(pendingLeaveStatus, dashboard.pending_requests.length ? 'Pending approvals loaded.' : 'No pending leave requests.', 'success');
      setStatus(currentLeaveStatus, dashboard.current_on_leave.length ? 'Current leave loaded.' : 'Nobody is on leave today.', 'success');
      setStatus(balancesStatus, 'Leave balances loaded.', 'success');
      setStatus(payrollStatus, dashboard.payroll_history.length ? 'Payroll history loaded.' : 'No payroll records yet.', 'success');
    } catch (error) {
      setStatus(pendingLeaveStatus, error.message, 'error');
      setStatus(currentLeaveStatus, error.message, 'error');
      setStatus(balancesStatus, error.message, 'error');
      setStatus(payrollStatus, error.message, 'error');
    }
  }

  async function submitPayrollGeneration(event) {
    event.preventDefault();

    try {
      const value = payrollPeriod.value;
      if (!value) {
        throw new Error('Choose a month first.');
      }

      const [year, month] = value.split('-').map(Number);
      setStatus(dashboardPayrollStatus, 'Generating payroll...', '');
      const result = await request('/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });

      const message = result.skipped_count > 0
        ? `${result.message} ${result.skipped_count} existing record(s) were skipped.`
        : result.message;

      setStatus(dashboardPayrollStatus, `${message} Generated ${result.generated_count} record(s).`, 'success');
      await loadDashboard();
    } catch (error) {
      setStatus(dashboardPayrollStatus, error.message, 'error');
    }
  }

  async function handlePendingAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button || !isHR) {
      return;
    }

    const leaveId = button.getAttribute('data-id');
    const action = button.getAttribute('data-action');
    const comment = window.prompt('Add manager comments (optional):', '') || '';

    try {
      await request(`/leave/${leaveId}/${action}`, {
        method: 'PUT',
        body: JSON.stringify({
          manager_comments: comment,
        }),
      });

      await loadDashboard();
    } catch (error) {
      alert(error.message);
    }
  }

  approveLeaveButton.addEventListener('click', () => {
    pendingLeaveSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  generatePayrollButton.addEventListener('click', () => {
    payrollForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  payrollForm.addEventListener('submit', submitPayrollGeneration);
  pendingLeaveBody.addEventListener('click', handlePendingAction);

  if (!isHR) {
    document.getElementById('dashboardPayrollForm').parentElement.style.display = 'none';
    generatePayrollButton.style.display = 'none';
    approveLeaveButton.style.display = 'none';
  }

  const today = new Date();
  payrollPeriod.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  clearStatus(pendingLeaveStatus);
  clearStatus(currentLeaveStatus);
  clearStatus(balancesStatus);
  clearStatus(payrollStatus);
  loadDashboard();
})();
