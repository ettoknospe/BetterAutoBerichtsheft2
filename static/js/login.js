const logo = document.querySelector(".logo img");
if (logo) {
    const hideLogo = () => { logo.style.display = "none"; };
    logo.addEventListener("error", hideLogo);
    if (logo.complete && logo.naturalWidth === 0) hideLogo();
}

const form = document.getElementById('loginForm');
const errorDiv = document.getElementById('errorMsg');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.classList.remove('show');
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;

    try {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (res.ok) {
            window.location.href = '/';
        } else {
            const data = await res.json();
            errorDiv.textContent = data.detail || 'Anmeldung fehlgeschlagen';
            errorDiv.classList.add('show');
        }
    } catch (err) {
        errorDiv.textContent = 'Netzwerkfehler: ' + err.message;
        errorDiv.classList.add('show');
    } finally {
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
    }
});
