const API_SERVERS = [
    "https://zero-in-backend.onrender.com"
];
const SECRET_KEY = "ZeroInSecureKey_2026!@#";
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
        ver: "2.1"
    };
    const promises = API_SERVERS.map(base =>
        fetch(`${base}${endpoint}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-App-Version": "2.1",
                "X-Request-ID": btoa(Math.random().toString())
            },
            mode: "cors",
            credentials: "omit",
            body: JSON.stringify(securePayload)
        }).then(async res => {
            if (!res.ok) throw new Error("Server error");
            return await res.json();
        }).catch(() => ({ status: -1, message: "Connection blocked" }))
    );
    const results = await Promise.all(promises);
    return results.find(r => r?.status === 1) || results[0] || { status: -1 };
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
if (!localStorage.getItem('signup_data')) {
    window.location.replace('SIGNUP.html');
}
history.pushState(null, null, location.href);
window.onpopstate = () => {
    history.go(-2); 
};
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
                showNotify("⚠︎ Secure mode active. Please fill all fields.");
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
    const hasSpecial = /[!@#$%^&*_\-+=?]/.test(pass);
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

    try {
        const displayName = sanitizeInput(document.getElementById('display-name').value);
        const userId = sanitizeInput(document.getElementById('user-id').value).toLowerCase();
        const password = document.getElementById('password').value.trim();
        const confirmPass = document.getElementById('confirm-password').value.trim();
        const birthMonth = sanitizeInput(document.getElementById('birth-month').value);
        const birthDay = sanitizeInput(document.getElementById('birth-day').value);
        const birthYear = sanitizeInput(document.getElementById('birth-year').value);
        const ageNum = parseInt(document.getElementById('age-display').textContent) || 0;
        const email = sanitizeInput(document.getElementById('display-email').value).toLowerCase();
        if (!displayName || displayName.length < 2) throw new Error("Invalid name (min 2 chars)");
        if (!userId || userId.length < 4 || /[^a-z0-9_]/.test(userId)) throw new Error("User ID: only a-z, 0-9, _ allowed (min 4)");
        if (!checkPasswordStrength(password)) throw new Error("Password: 8+ chars, mix of upper, lower, number, symbol");
        if (password !== confirmPass) throw new Error("Password not match");
        if (!/^[0-9]{1,2}$/.test(birthMonth) || !/^[0-9]{1,2}$/.test(birthDay) || !/^[0-9]{4}$/.test(birthYear)) throw new Error("Invalid date format");
        if (ageNum < 13 || ageNum > 120) throw new Error("Age must be 13 - 120 years");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Invalid email format");
        const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
        showNotify("Processing...");
        const systemId = generateSystemId();
        const result = await sendToAllServers('/api/auth/register-full', {
            displayName, userId, systemId, email, password, birthday, age: ageNum
        });
        if (result.status === 1) {
            showNotify(`✔ Success! Your ID: #${systemId}`);
            document.querySelectorAll('input').forEach(i => i.value = '');
            setTimeout(() => window.location.href = 'home.html', 2000);
        } else {
            if (result.message === 'SYSTEMID_EXISTS') {
                showNotify(" Regenerating ID...");
                setTimeout(() => finalSubmit(), 800);
                return;
            } else if (result.message === 'USER_ID_EXISTS') {
                throw new Error("User ID taken, try another");
            } else if (result.message === 'EMAIL_EXISTS') {
                throw new Error("Email already registered");
            } else {
                throw new Error(result.message || "Server rejected request");
            }
        }

    } catch (err) {
        showNotify(`✖ ${err.message}`);
        console.warn("Security Warning:", err);
    } finally {
        setTimeout(() => { isSubmitting = false; }, 1500);
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
        if (m < 1 || m > 12 || y < 1900 || y > nowYear) {
            ageDisplay.textContent = '⚠ Invalid Date';
            ageDisplay.className = 'age-value invalid';
            submitBtn.classList.remove('active');
            return;
        }
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
        if (age < 0 || age > 120) {
            ageDisplay.textContent = '⚠ Invalid Age';
            ageDisplay.className = 'age-value invalid';
            submitBtn.classList.remove('active');
            return;
        }
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
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 's' || e.key === 'i')) e.preventDefault();
    });
});
