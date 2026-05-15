const API_SERVERS = [
    "https://zero-in-backend.onrender.com"
];
const SECRET_KEY = "ZeroInSecure_2026_Protected!@#";

function encryptData(data) {
    try {
        const str = JSON.stringify(data);
        let encrypted = "";
        for (let i = 0; i < str.length; i++) {
            encrypted += String.fromCharCode(str.charCodeAt(i) + SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
        }
        return btoa(encrypted);
    } catch (e) { return null; }
}

function sanitizeInput(str) {
    if (!str) return "";
    return str.toString()
        .replace(/[<>\"'`;\/\\\(\)\[\]\{\}]/g, '')
        .trim()
        .slice(0, 100);
}

async function sendToAllServers(endpoint, payload) {
    const securePayload = {
        data: encryptData(payload),
        ts: Date.now(),
        ver: "3.0",
        check: btoa(SECRET_KEY + Date.now().toString().slice(0, 8))
    };

    const promises = API_SERVERS.map(base =>
        fetch(`${base}${endpoint}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-Secure-Access": "ZeroIn_Protected",
                "X-Request-ID": btoa(Math.random().toString())
            },
            mode: "cors",
            credentials: "omit",
            body: JSON.stringify(securePayload)
        }).then(res => res.ok ? res.json() : ({ status: -1 })).catch(() => ({ status: -1 }))
    );
    const results = await Promise.all(promises);
    return results.find(r => r?.status === 1) || results[0];
}

function showNotify(message) {
    const container = document.getElementById('notify-container');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'notify-box';
    box.innerText = message;
    box.style.cssText = `
        padding: 12px 20px; border-radius: 8px; margin: 8px 0;
        background: rgba(0,0,0,0.85); color: #fff; border: 1px solid #ff4444;
        font-size: 14px; transition: all 0.3s ease;
    `;
    container.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        setTimeout(() => box.remove(), 500);
    }, 3000);
}

(function checkAccess() {
    if (!localStorage.getItem('signup_data')) {
        window.location.replace('SIGNUP.html');
        return;
    }
    
    const ua = navigator.userAgent.toLowerCase();
    const isPC = /windows|macintosh|linux/.test(ua) && !/android|iphone|ipad/.test(ua);
    if (isPC) {
        localStorage.clear();
        window.location.replace('SIGNUP.html');
        return;
    }
    history.pushState(null, null, location.href);
    window.onpopstate = () => { history.go(-2); };
})();
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'u' || e.key === 's' || e.key === 'i' || e.key === 'c' || e.keyCode === 123)) {
        e.preventDefault();
        return false;
    }
});

window.onload = () => {
    const rawData = localStorage.getItem('signup_data');
    const displayInput = document.getElementById('display-name');
    const userIdInput = document.getElementById('user-id');
    const emailInput = document.getElementById('display-email');
    let hasShownWelcomeNote = false;

    if (rawData) {
        try {
            const data = JSON.parse(rawData);
            if (data.username && displayInput) displayInput.value = sanitizeInput(data.username);
            if (data.userId && userIdInput) userIdInput.value = sanitizeInput(data.userId);
            if (data.email && emailInput) {
                emailInput.value = sanitizeInput(data.email).toLowerCase();
                emailInput.setAttribute('readonly', true);
                emailInput.style.opacity = '0.8';
            }
            localStorage.removeItem('signup_data');
            document.body.style.display = 'block';
            document.body.style.visibility = 'visible';
            if (!hasShownWelcomeNote) {
                showNotify(" Secure mode active. Please fill all fields.");
                hasShownWelcomeNote = true;
            }
        } catch (err) {
            console.error("Data error:", err);
            localStorage.clear();
            window.location.replace('SIGNUP.html');
        }
    } else {
        window.location.replace('SIGNUP.html');
    }
};

window.onunload = () => {
    localStorage.clear();
    sessionStorage.clear();
};
function checkPasswordStrength(pass) {
    const minLen = pass.length >= 8;
    const hasUpper = /[A-Z]/.test(pass);
    const hasLower = /[a-z]/.test(pass);
    const hasNumber = /[0-9]/.test(pass);
    const hasSpecial = /[!@#$%^&*]/.test(pass);
    return minLen && hasUpper && hasLower && hasNumber && hasSpecial;
}

function togglePass(id, el) {
    const input = document.getElementById(id);
    if (!input) return;
    el.classList.toggle('active');
    input.type = input.type === 'password' ? 'text' : 'password';
    if (input.type === 'text') {
        setTimeout(() => {
            input.type = 'password';
            el.classList.remove('active');
        }, 3000);
    }
}

function generateSystemId() {
    const part1 = Math.floor(100000 + Math.random() * 900000);
    const part2 = Date.now().toString(36).toUpperCase().slice(-4);
    return `${part1}${part2}`;
}

let isSubmitting = false;
async function finalSubmit() {
    if (isSubmitting) return showNotify("Please wait...");
    isSubmitting = true;
    const displayName = sanitizeInput(document.getElementById('display-name').value);
    const userId = sanitizeInput(document.getElementById('user-id').value).toLowerCase();
    const password = document.getElementById('password').value.trim();
    const confirmPass = document.getElementById('confirm-password').value.trim();
    const birthMonth = sanitizeInput(document.getElementById('birth-month').value);
    const birthDay = sanitizeInput(document.getElementById('birth-day').value);
    const birthYear = sanitizeInput(document.getElementById('birth-year').value);
    const ageNum = parseInt(document.getElementById('age-display').textContent) || 0;
    const email = sanitizeInput(document.getElementById('display-email').value).toLowerCase();
    if (!displayName) { showNotify("Display name is required. Cannot be empty."); isSubmitting=false; return; }
    if (displayName.length < 2 || displayName.length > 23) { showNotify("Display name: 2‑23 characters only."); isSubmitting=false; return; }
    if (!userId) { showNotify("Invalid User ID. Cannot be empty."); isSubmitting=false; return; }
    if (userId.length < 4 || userId.length > 20) { showNotify("User ID: Min 4 characters."); isSubmitting=false; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotify("Email: Valid format only."); isSubmitting=false; return; }
    if (email.length > 40) { showNotify("Email: Maximum 40 characters."); isSubmitting=false; return; }
    if (!password) { showNotify("Create password is required."); isSubmitting=false; return; }
    if (!checkPasswordStrength(password)) { 
        showNotify("Password: Min 8 chars | Must include: Uppercase, Lowercase, Number, Special (!@#$%^&*)"); 
        isSubmitting=false; return; 
    }
    if (!confirmPass) { showNotify("Confirm password is required."); isSubmitting=false; return; }
    if (password !== confirmPass) { showNotify("Passwords do not match."); isSubmitting=false; return; }
    if (!birthMonth || !birthDay || !birthYear) { showNotify("Please select your complete birth date."); isSubmitting=false; return; }
    if (ageNum < 13 || ageNum > 120) { showNotify("Age must be between 13 and 120 years."); isSubmitting=false; return; }

    const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

    try {
        showNotify(" Processing secure data...");

        const systemId = generateSystemId();
        const result = await sendToAllServers('/api/auth/register-full', {
            displayName, userId, systemId, email, password, birthday, age: ageNum
        });

        if (result.status === 1) {
            showNotify(`✔ Registration successful! Welcome • Your ID: #${systemId}`);
            document.querySelectorAll('input').forEach(i => i.value = '');
            setTimeout(() => window.location.href = 'home.html', 1800);
        } else {
            if (result.message === 'SYSTEMID_EXISTS') {
                showNotify(" Regenerating ID...");
                setTimeout(() => { finalSubmit(); }, 800);
                return;
            } else if (result.message === 'USER_ID_EXISTS') {
                showNotify("This USER ID is already taken.");
            } else if (result.message === 'EMAIL_EXISTS') {
                showNotify("This email is already registered.");
            } else {
                showNotify("✖ " + (result.message || "An error occurred."));
            }
            isSubmitting = false;
        }

    } catch (err) {
        showNotify("✖ Secure connection failed.");
        console.warn("Security Block:", err);
        isSubmitting = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const birthMonth = document.getElementById('birth-month');
    const birthDay = document.getElementById('birth-day');
    const birthYear = document.getElementById('birth-year');
    const ageDisplay = document.getElementById('age-display');
    const submitBtn = document.getElementById('submit-signup');
    const nowYear = new Date().getFullYear();

    for (let y = nowYear; y >= nowYear - 100; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        birthYear.appendChild(opt);
    }

    function getDaysInMonth(m, y) {
        return new Date(y, m, 0).getDate();
    }

    function updateDays() {
        const m = parseInt(birthMonth.value) || 0;
        const y = parseInt(birthYear.value) || 0;
        birthDay.innerHTML = '<option value="" disabled selected></option>';
        if (!m || !y) return calculateAge();
        const maxDay = getDaysInMonth(m, y);
        for (let d = 1; d <= maxDay; d++) {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = String(d).padStart(2, '0');
            birthDay.appendChild(opt);
        }
        calculateAge();
    }

    function calculateAge() {
        const m = parseInt(birthMonth.value);
        const d = parseInt(birthDay.value);
        const y = parseInt(birthYear.value);
        if (!m || !d || !y) {
            ageDisplay.textContent = '-- YEARS OLD';
            ageDisplay.className = 'age-value';
            submitBtn.classList.remove('active');
            return;
        }
        const birth = new Date(y, m - 1, d);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monDiff = today.getMonth() - birth.getMonth();
        if (monDiff < 0 || (monDiff === 0 && today.getDate() < birth.getDate())) age--;
        ageDisplay.textContent = `${age} YEARS OLD`;
        ageDisplay.className = age >= 13 ? 'age-value valid' : 'age-value invalid';
        submitBtn.classList.toggle('active', age >= 13);
    }

    birthMonth.addEventListener('change', updateDays);
    birthYear.addEventListener('change', updateDays);
    birthDay.addEventListener('change', calculateAge);
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (submitBtn.classList.contains('active')) finalSubmit();
        else showNotify("⚠ Complete all fields correctly first");
    });
});
