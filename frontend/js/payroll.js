(function () {
  const currentUser = window.hrAuth.requireAuth();
  if (!currentUser) {
    return;
  }
  const isHR = currentUser.role === 'HR';
  const { request, formatMoney, escapeHtml, setStatus } = window.hrApp;

  const payrollForm = document.getElementById('payrollForm');
  const payrollFormStatus = document.getElementById('payrollFormStatus');
  const payrollListStatus = document.getElementById('payrollListStatus');
  const payrollListBody = document.getElementById('payrollListBody');
  const payrollPeriod = document.getElementById('payrollPeriod');

  function getPayrollFilterQuery() {
    if (!payrollPeriod.value) {
      return '';
    }

    const [year, month] = payrollPeriod.value.split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      return '';
    }

    return `?month=${month}&year=${year}`;
  }

  function renderPayrollRows(rows) {
    if (!rows.length) {
      payrollListBody.innerHTML = '<tr><td colspan="7"><div class="empty">No payroll generated for this period yet.</div></td></tr>';
      return;
    }

    payrollListBody.innerHTML = rows
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

  async function loadPayroll() {
    try {
      const data = await request(`/payroll${getPayrollFilterQuery()}`);
      renderPayrollRows(data.payroll);
      setStatus(payrollListStatus, 'Payroll records loaded.', 'success');
    } catch (error) {
      setStatus(payrollListStatus, error.message, 'error');
    }
  }

  async function generatePayroll(event) {
    event.preventDefault();

    if (!isHR) {
      return;
    }

    try {
      const value = payrollPeriod.value;
      if (!value) {
        throw new Error('Choose a payroll month first.');
      }

      const [year, month] = value.split('-').map(Number);
      const result = await request('/payroll/generate', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      });

      const message =
        result.skipped_count > 0
          ? `${result.message} ${result.skipped_count} existing record(s) were skipped.`
          : result.message;

      setStatus(payrollFormStatus, `${message} Generated ${result.generated_count} record(s).`, 'success');
      await loadPayroll();
    } catch (error) {
      setStatus(payrollFormStatus, error.message, 'error');
    }
  }

  if (!isHR) {
    payrollForm.parentElement.style.display = 'none';
  }

  const today = new Date();
  payrollPeriod.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  payrollForm.addEventListener('submit', generatePayroll);
  payrollPeriod.addEventListener('change', loadPayroll);
  loadPayroll();
})();
