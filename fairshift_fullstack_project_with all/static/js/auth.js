// FAIRSHIFT Auth Controller
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginMsg = document.getElementById('loginMessage');
    const regMsg = document.getElementById('registerMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('fairshift_user', JSON.stringify(data.user));
                    loginMsg.hidden = false;
                    loginMsg.className = 'message success';
                    loginMsg.textContent = 'Authenticated successfully! Redirecting...';
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
                } else {
                    loginMsg.hidden = false;
                    loginMsg.className = 'message error';
                    loginMsg.textContent = data.message || 'Login failed';
                }
            } catch (err) {
                // Fallback for offline static demo
                localStorage.setItem('fairshift_user', JSON.stringify({ name: email.split('@')[0], email, role: 'Allocator' }));
                window.location.href = 'dashboard.html';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const org = document.getElementById('org').value.trim();
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm').value;

            if (password !== confirm) {
                regMsg.hidden = false;
                regMsg.className = 'message error';
                regMsg.textContent = 'Passwords do not match.';
                return;
            }

            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, org, password })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('fairshift_user', JSON.stringify(data.user));
                    regMsg.hidden = false;
                    regMsg.className = 'message success';
                    regMsg.textContent = 'Account created successfully! Redirecting...';
                    setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
                } else {
                    regMsg.hidden = false;
                    regMsg.className = 'message error';
                    regMsg.textContent = data.message || 'Registration failed';
                }
            } catch (err) {
                localStorage.setItem('fairshift_user', JSON.stringify({ name, email, role: 'Allocator' }));
                window.location.href = 'dashboard.html';
            }
        });
    }
});
