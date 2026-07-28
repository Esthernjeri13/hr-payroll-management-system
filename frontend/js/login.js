(function () {
  if (!window.hrAuth.requireGuest()) {
    return;
  }

  const { request, setStatus } = window.hrApp;
  const loginForm = document.getElementById('loginForm');
  const loginStatus = document.getElementById('loginStatus');
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');

  async function submitLogin(event) {
    event.preventDefault();

    try {
      const result = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail.value,
          password: loginPassword.value,
        }),
      });

      window.hrAuth.setCurrentUser({
        id: result.user.id,
        name: result.user.full_name,
        role: result.user.role,
      });

      window.location.href = './index.html';
    } catch (error) {
      setStatus(loginStatus, error.message, 'error');
    }
  }

  loginForm.addEventListener('submit', submitLogin);
})();
