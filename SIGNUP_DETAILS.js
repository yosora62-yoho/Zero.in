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

function sanitizeInput(str, isEmail = false) {
    if (!str) return "";
    let cleaned = str.toString()
        .replace(/[<>\"'`;\/\\\(\)\[\]\{\}]/g, '')
        .trim()
        .slice(0, 100);
    if (isEmail) {
        cleaned = cleaned.replace(/[^a-zA-Z0-9_\-@.]/g, '');
    }
    return cleaned;
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
        }).then(res => {
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            return res.json();
        }).catch(err => ({ status: -1, error: err.message }))
    );
    const results = await Promise.all(promises);
    return results.find(r => r?.status === 1) || results[0];
}
function showNotify(message, type = 'default') {
    const container = document.getElementById('notify-container');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'notify-box';
    box.innerText = message;
    let borderColor = '#ff4444';
    let bgColor = 'rgba(0,0,0,0.85)';
    if (type === 'success') borderColor = '#00ff88';
    if (type === 'warning') borderColor = '#ffbb33';
    if (type === 'info') borderColor = '#3399ff';
    box.style.cssText = `
        padding: 12px 20px; border-radius: 8px; margin: 8px 0;
        background: ${bgColor}; color: #fff; border: 1px solid ${borderColor};
        font-size: 14px; transition: all 0.3s ease; text-align: center;
    `;
    container.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transform = 'translateY(-5px)';
        setTimeout(() => box.remove(), 500);
    }, 4000);
}

(function checkAccess() {
    if (!localStorage.getItem('signup_data')) {
        showNotify("⚠ Session expired or invalid. Redirecting...", 'warning');
        setTimeout(() => window.location.replace('SIGNUP.html'), 1500);
        return;
    }
    const ua = navigator.userAgent.toLowerCase();
    const isPC = /windows|macintosh|linux/.test(ua) && !/android|iphone|ipad/.test(ua);
    if (isPC) {
        localStorage.clear();
        showNotify("⚠ Access denied! Website is only available on mobile devices.", 'default');
        setTimeout(() => window.location.replace('SIGNUP.html'), 2000);
        return;
    }
    history.pushState(null, null, location.href);
    window.onpopstate = () => { history.go(-2); };
})();

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey || e.altKey) && (e.key === 'u' || e.key === 's' || e.key === 'i' || e.keyCode === 123)) {
        e.preventDefault();
        showNotify("⚠ Security protection active! View source is disabled.", 'warning');
        return false;
    }
});

window.onload = () => {
    const rawData = localStorage.getItem('signup_data');
    const displayInput = document.getElementById('display-name');
    const userIdInput = document.getElementById('user-id');
    const emailInput = document.getElementById('display-email');

    if (rawData) {
        try {
            const data = JSON.parse(rawData);
            if (!data.username || !data.userId || !data.email) {
                showNotify("⚠ Incomplete data received. Please start over.", 'default');
                localStorage.clear();
                setTimeout(() => window.location.replace('SIGNUP.html'), 2000);
                return;
            }

            if (data.username && displayInput) {
                displayInput.value = sanitizeInput(data.username);
                showNotify("✔ Name loaded successfully", 'success');
            }
            if (data.userId && userIdInput) {
                userIdInput.value = sanitizeInput(data.userId);
                showNotify("✔ User ID generated successfully", 'success');
            }
            if (data.email && emailInput) {
                emailInput.value = sanitizeInput(data.email, true).toLowerCase();
                emailInput.setAttribute('readonly', true);
                emailInput.style.opacity = '0.8';
                showNotify("✔ Email verified and locked", 'info');
            }

            localStorage.removeItem('signup_data');
            document.body.style.display = 'block';
            document.body.style.visibility = 'visible';
            
            showNotify("Secure Connection Established. All systems ready.", 'info');

        } catch (err) {
            console.error("Data error:", err);
            showNotify("⚠ Corrupted data detected! Security block activated.", 'default');
            localStorage.clear();
            setTimeout(() => window.location.replace('SIGNUP.html'), 2000);
        }
    } else {
        showNotify("⚠ No data found. Redirecting to signup...", 'warning');
        setTimeout(() => window.location.replace('SIGNUP.html'), 1500);
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
    if (pass.length === 0) return 0;
    if (!minLen) { showNotify("⚠ Password too short! Min 8 characters required.", 'warning'); return 0; }
    if (!hasUpper || !hasLower) { showNotify("⚠ Mix uppercase & lowercase letters for better security.", 'warning'); return 0; }
    if (!hasNumber) { showNotify("⚠ Add at least one number to make it stronger.", 'warning'); return 0; }
    if (!hasSpecial) { showNotify("⚠ Add special chars (!@#$%^&*) for maximum security.", 'warning'); return 0; }
    showNotify("✔ Password strength: STRONG ✔", 'success');
    return minLen && hasUpper && hasLower && hasNumber && hasSpecial;
}

function togglePass(id, el) {
    const input = document.getElementById(id);
    if (!input) return;
    el.classList.toggle('active');
    input.type = input.type === 'password' ? 'text' : 'password';
    if (input.type === 'text') {
        showNotify(" Password visible for 3 seconds...", 'info');
        setTimeout(() => {
            input.type = 'password';
            el.classList.remove('active');
            showNotify(" Password hidden again", 'info');
        }, 3000);
    }
}

function generateSystemId() {
    const part1 = Math.floor(100000 + Math.random() * 900000);
    const part2 = Date.now().toString(36).toUpperCase().slice(-4);
    const newId = `${part1}${part2}`;
    showNotify(" Generating unique System ID...", 'info');
    return newId;
}
let isSubmitting = false;
async function finalSubmit() {
    if (isSubmitting) { 
        showNotify("Request in progress... Please wait patiently.", 'warning');
        return; 
    }
    isSubmitting = true;
    const rawDisplayName = document.getElementById('display-name').value;
    const rawUserId = document.getElementById('user-id').value;
    const rawEmail = document.getElementById('display-email').value;
    const password = document.getElementById('password').value.trim();
    const confirmPass = document.getElementById('confirm-password').value.trim();
    const rawBirthMonth = document.getElementById('birth-month').value;
    const rawBirthDay = document.getElementById('birth-day').value;
    const rawBirthYear = document.getElementById('birth-year').value;
    const ageNum = parseInt(document.getElementById('age-display').textContent) || 0;
    if (!rawDisplayName) { showNotify("⚠ ERROR: Display Name cannot be empty!", 'default'); isSubmitting=false; return; }
    if (!rawUserId) { showNotify("⚠ ERROR: User ID is missing or invalid!", 'default'); isSubmitting=false; return; }
    if (!rawEmail) { showNotify("⚠ ERROR: Email Address is required!", 'default'); isSubmitting=false; return; }
    if (!password) { showNotify("⚠ ERROR: Create Password field is empty!", 'default'); isSubmitting=false; return; }
    if (!confirmPass) { showNotify("⚠ ERROR: Confirm Password field is empty!", 'default'); isSubmitting=false; return; }
    if (!rawBirthMonth || !rawBirthDay || !rawBirthYear) { showNotify("⚠ ERROR: Complete Birth Date required! Select all fields.", 'default'); isSubmitting=false; return; }
    const displayName = sanitizeInput(rawDisplayName);
    const userId = sanitizeInput(rawUserId).toLowerCase();
    const email = sanitizeInput(rawEmail, true).toLowerCase();
    if (displayName.length < 2 || displayName.length > 23) { showNotify("⚠ RULE: Display Name must be 2‑23 characters only!", 'warning'); isSubmitting=false; return; }
    if (userId.length < 4 || userId.length > 20) { showNotify("⚠ RULE: User ID must be 4‑20 characters only!", 'warning'); isSubmitting=false; return; }
    if (/[^a-z0-9._-]/.test(userId)) { showNotify("⚠ RULE: User ID allows only: a‑z 0‑9 . _ -", 'warning'); isSubmitting=false; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotify("⚠ RULE: Invalid Email format! Example: user@domain.com", 'warning'); isSubmitting=false; return; }
    if (email.length > 40) { showNotify("⚠ RULE: Email too long! Max 40 characters allowed.", 'warning'); isSubmitting=false; return; }
    if (!checkPasswordStrength(password)) { 
        showNotify("⚠ SECURITY: Password does NOT meet minimum requirements!", 'default');
        isSubmitting=false; return; 
    }
    if (password !== confirmPass) { showNotify("⚠ MISMATCH: Passwords do not match! Re‑type carefully.", 'default'); isSubmitting=false; return; }
    if (ageNum < 13 || ageNum > 120) { showNotify("⚠ AGE POLICY: You must be 13‑120 years old to register.", 'default'); isSubmitting=false; return; }
    const birthMonth = sanitizeInput(rawBirthMonth);
    const birthDay = sanitizeInput(rawBirthDay);
    const birthYear = sanitizeInput(rawBirthYear);
    const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

    try {
        showNotify(" CONNECTING: Sending data to secure servers...", 'info');
        showNotify(" DO NOT CLOSE OR REFRESH! Encryption in progress...", 'warning');
        const systemId = generateSystemId();
        const result = await sendToAllServers('/api/auth/register-full', {
            displayName, userId, systemId, email, password, birthday, age: ageNum
        });
        if (result.status === 1) {
            showNotify(`✔ SUCCESS: Account created successfully!`, 'success');
            showNotify(`YOUR ID: #${systemId}`, 'success');
            document.querySelectorAll('input').forEach(i => i.value = '');
            setTimeout(() => {
                showNotify("Redirecting to Home Page...", 'info');
                window.location.href = 'home.html';
            }, 2000);
        } else {
            if (result.message === 'SYSTEMID_EXISTS') {
                showNotify(" CONFLICT: ID already exists. Generating new one...", 'warning');
                setTimeout(() => { finalSubmit(); }, 1000);
                return;
            } else if (result.message === 'USER_ID_EXISTS') {
                showNotify("⚠ DENIED: This USER ID is already taken! Choose another.", 'default');
            } else if (result.message === 'EMAIL_EXISTS') {
                showNotify("⚠ DENIED: This EMAIL is already registered! Use 'Forgot Password'.", 'default');
            } else if (result.error) {
                showNotify("NETWORK: Server unreachable or offline. Check internet.", 'default');
            } else {
                showNotify(`⚠ ERROR: ${result.message || 'Unknown system failure!'}`, 'default');
            }
            isSubmitting = false;
        }

    } catch (err) {
        showNotify("⚠ CRITICAL: Secure connection failed! Firewall or Network error.", 'default');
        showNotify("⚠ TRY: Restart app or switch network connection.", 'warning');
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
        birthDay.innerHTML = '<option value="" disabled selected>Select Day</option>';
        
        if (!m || !y) {
            showNotify(" Please select Month & Year first", 'info');
            return calculateAge();
        }
        
        const maxDay = getDaysInMonth(m, y);
        showNotify(` Loading days: ${maxDay} days found`, 'info');
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
            ageDisplay.className = 'age-value invalid';
            submitBtn.classList.remove('active');
            showNotify("Waiting for complete date selection...", 'info');
            return;
        }
        const birth = new Date(y, m - 1, d);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monDiff = today.getMonth() - birth.getMonth();
        if (monDiff < 0 || (monDiff === 0 && today.getDate() < birth.getDate())) age--;
        ageDisplay.textContent = `${age} YEARS OLD`;
        if (age >= 13 && age <= 120) {
            ageDisplay.className = 'age-value valid';
            submitBtn.classList.add('active');
            showNotify(`✔ AGE OK: ${age} years old • You are eligible`, 'success');
        } else {
            ageDisplay.className = 'age-value invalid';
            submitBtn.classList.remove('active');
            if (age < 13) showNotify(`⚠ REJECTED: Age ${age} is too young (Min 13)`, 'default');
            if (age > 120) showNotify(`⚠ REJECTED: Age ${age} exceeds limit (Max 120)`, 'default');
        }
    }
    birthMonth.addEventListener('change', updateDays);
    birthYear.addEventListener('change', updateDays);
    birthDay.addEventListener('change', calculateAge);
    submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (submitBtn.classList.contains('active')) {
            showNotify(" Starting secure registration process...", 'info');
            finalSubmit();
        } else {
            showNotify("⚠ CANNOT SUBMIT: Fix errors or complete all fields first!", 'warning');
            showNotify(" Check: Age, Empty fields, Invalid characters", 'info');
        }
    });
});
