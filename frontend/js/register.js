(function () {
  if (!window.hrAuth.requireGuest()) {
    return;
  }

  const { request, setStatus } = window.hrApp;
  const registerForm = document.getElementById('registerForm');
  const registerStatus = document.getElementById('registerStatus');

  function getSelectedRole() {
    const selected = registerForm.querySelector('input[name="role"]:checked');
    return selected ? selected.value : 'Employee';
  }

  async function submitRegistration(event) {
    event.preventDefault();

    const fullName = document.getElementById('registerFullName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;

    try {
      await request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
          role: getSelectedRole(),
        }),
      });

      setStatus(registerStatus, 'Registration successful. Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = './login.html';
      }, 900);
    } catch (error) {
      setStatus(registerStatus, error.message, 'error');
    }
  }

  registerForm.addEventListener('submit', submitRegistration);
})();
