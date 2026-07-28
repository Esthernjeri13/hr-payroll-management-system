(function () {
  const currentUser = window.hrAuth.requireAuth();
  if (!currentUser) {
    return;
  }
  const isHR = currentUser.role === 'HR';
  const { request, formatMoney, escapeHtml, setStatus } = window.hrApp;

  const employeeForm = document.getElementById('employeeForm');
  const employeeFormTitle = document.getElementById('employeeFormTitle');
  const employeeFormStatus = document.getElementById('employeeFormStatus');
  const employeeList = document.getElementById('employeeList');
  const employeeListStatus = document.getElementById('employeeListStatus');
  const managerIdSelect = document.getElementById('managerId');
  const cancelEditButton = document.getElementById('cancelEditButton');
  const employeeFormPanel = document.getElementById('employeeFormPanel');

  const fields = {
    id: document.getElementById('employeeId'),
    full_name: document.getElementById('fullName'),
    role: document.getElementById('role'),
    team: document.getElementById('team'),
    manager_id: document.getElementById('managerId'),
    start_date: document.getElementById('startDate'),
    salary: document.getElementById('salary'),
    employment_type: document.getElementById('employmentType'),
  };

  let employees = [];

  function resetForm() {
    employeeForm.reset();
    fields.id.value = '';
    employeeFormTitle.textContent = 'Create employee';
    setStatus(employeeFormStatus, '', 'info');
  }

  function fillManagerOptions(list) {
    const currentValue = managerIdSelect.value;
    managerIdSelect.innerHTML =
      '<option value="">No manager</option>' +
      list
        .map(
          (employee) => `
      <option value="${employee.id}">${escapeHtml(employee.full_name)} (${escapeHtml(employee.team)})</option>
    `
        )
        .join('');
    managerIdSelect.value = currentValue;
  }

  function renderEmployees(list) {
    if (!list.length) {
      employeeList.innerHTML = '<div class="empty">No employees yet. Create the first one on the left.</div>';
      return;
    }

    employeeList.innerHTML = list
      .map(
        (employee) => `
      <div class="panel">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div>
            <h3 style="margin:0 0 6px;">${escapeHtml(employee.full_name)}</h3>
            <div class="muted">${escapeHtml(employee.role)} - ${escapeHtml(employee.team)}</div>
            <div class="muted">Manager: ${escapeHtml(employee.manager_name || 'None')}</div>
            <div class="muted">Start date: ${escapeHtml(employee.start_date)}</div>
            <div class="muted">Salary: ${formatMoney(employee.salary)}</div>
            <div class="muted">Employment type: ${escapeHtml(employee.employment_type)}</div>
            <div class="muted">Status: ${employee.active ? 'Active' : 'Inactive'}</div>
          </div>
          <span class="badge ${employee.active ? 'approved' : 'rejected'}">${employee.active ? 'Active' : 'Inactive'}</span>
        </div>
        ${isHR ? `
          <div class="actions">
            <button class="secondary" data-action="edit" data-id="${employee.id}">Edit</button>
            <button class="danger" data-action="deactivate" data-id="${employee.id}" ${employee.active ? '' : 'disabled'}>Deactivate</button>
          </div>
        ` : '<div class="muted" style="margin-top:12px;">HR only</div>'}
      </div>
    `
      )
      .join('');
  }

  function syncForm(employee) {
    fields.id.value = employee.id;
    fields.full_name.value = employee.full_name;
    fields.role.value = employee.role;
    fields.team.value = employee.team;
    fields.manager_id.value = employee.manager_id || '';
    fields.start_date.value = employee.start_date;
    fields.salary.value = employee.salary;
    fields.employment_type.value = employee.employment_type;
    employeeFormTitle.textContent = `Edit ${employee.full_name}`;
  }

  async function loadEmployees() {
    try {
      const data = await request('/employees');
      employees = data.employees;
      renderEmployees(employees);
      fillManagerOptions(employees.filter((employee) => employee.active));
      setStatus(employeeListStatus, 'Employees loaded.', 'success');
    } catch (error) {
      setStatus(employeeListStatus, error.message, 'error');
    }
  }

  async function submitEmployee(event) {
    event.preventDefault();

    if (!isHR) {
      return;
    }

    try {
      const payload = {
        full_name: fields.full_name.value.trim(),
        role: fields.role.value.trim(),
        team: fields.team.value.trim(),
        manager_id: fields.manager_id.value ? Number(fields.manager_id.value) : null,
        start_date: fields.start_date.value,
        salary: Number(fields.salary.value),
        employment_type: fields.employment_type.value,
      };

      const employeeId = fields.id.value;
      if (employeeId) {
        await request(`/employees/${employeeId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setStatus(employeeFormStatus, `Employee ${employeeId ? 'updated' : 'created'} successfully.`, 'success');
      resetForm();
      await loadEmployees();
    } catch (error) {
      setStatus(employeeFormStatus, error.message, 'error');
    }
  }

  async function handleEmployeeActions(event) {
    if (!isHR) {
      return;
    }

    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const action = button.getAttribute('data-action');
    const employeeId = button.getAttribute('data-id');
    const employee = employees.find((item) => String(item.id) === String(employeeId));

    if (action === 'edit' && employee) {
      syncForm(employee);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (action === 'deactivate') {
      if (!window.confirm('Deactivate this employee?')) {
        return;
      }

      try {
        await request(`/employees/${employeeId}`, { method: 'DELETE' });
        await loadEmployees();
      } catch (error) {
        alert(error.message);
      }
    }
  }

  if (!isHR) {
    employeeFormPanel.style.display = 'none';
    cancelEditButton.style.display = 'none';
  }

  employeeForm.addEventListener('submit', submitEmployee);
  employeeList.addEventListener('click', handleEmployeeActions);
  cancelEditButton.addEventListener('click', resetForm);

  resetForm();
  loadEmployees();
})();
