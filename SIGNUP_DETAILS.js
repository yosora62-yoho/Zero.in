const API_SERVERS = [
    "https://zero-in-backend.onrender.com"
];

async function sendToAllServers(endpoint, payload) {
    const promises = API_SERVERS.map(base =>
        fetch(`${base}${endpoint}`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            mode: "cors",
            body: JSON.stringify(payload)
        }).then(res => res.ok ? res.json() : ({ status: -1 })).catch(() => ({ status: -1 }))
    );
    const results = await Promise.all(promises);
    return results.find(r => r && r.status !== undefined) || { status: -1, message: "No response from server" };
}

function showNotify(message) {
    const container = document.getElementById('notify-container');
    if (!container) return;
    const box = document.createElement('div');
    box.className = 'notify-box';
    box.innerText = message;
    box.style.cssText = `
        padding: 10px 15px; margin: 8px auto; border-radius: 6px;
        background: rgba(20, 20, 20, 0.9); color: #fff;
        border: 1px solid #ff4444; font-size: 14px;
        max-width: 90%; text-align: center;
    `;
    container.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transition = 'opacity 0.5s ease';
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
            if (data.username && displayInput) displayInput.value = data.username;
            if (data.userId && userIdInput) userIdInput.value = data.userId;
            if (data.email && emailInput) {
                emailInput.value = data.email;
                emailInput.setAttribute('readonly', true);
            }
            document.body.style.display = 'block';
            if (!hasShownWelcomeNote) {
                showNotify("Please provide additional information");
                hasShownWelcomeNote = true;
            }
        } catch (err) {
            console.error("Parse signup data error:", err);
            window.location.replace('SIGNUP.html');
        }
    } else {
        window.location.replace('SIGNUP.html');
    }
};

window.onunload = () => {
    localStorage.removeItem('signup_data');
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
    el.classList.toggle('active');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function generateSystemId() {
    return Math.floor(1000000 + Math.random() * 9000000).toString();
}

let isSubmitting = false;
async function finalSubmit() {
    if (isSubmitting) return;
    isSubmitting = true;
    const displayName = document.getElementById('display-name').value.trim();
    const userId = document.getElementById('user-id').value.trim();
    const password = document.getElementById('password').value.trim();
    const confirmPass = document.getElementById('confirm-password').value.trim();
    const birthMonth = document.getElementById('birth-month').value;
    const birthDay = document.getElementById('birth-day').value;
    const birthYear = document.getElementById('birth-year').value;
    const ageNum = parseInt(document.getElementById('age-display').textContent) || 0;
    const email = document.getElementById('display-email').value.trim();
    if (!displayName) { showNotify("Display name is required. Cannot be empty."); isSubmitting=false; return; }
    if (displayName.length < 2 || displayName.length > 23) { showNotify("Display name: 2‑23 characters only."); isSubmitting=false; return; }
    if (/[<>;"']/.test(displayName)) { showNotify("Display name: Do not use < > \" ' ;"); isSubmitting=false; return; }
    if (!userId) { showNotify("Invalid User ID. Cannot be empty."); isSubmitting=false; return; }
    if (userId.length < 4 || userId.length > 20) { showNotify("User ID: Min 4 characters."); isSubmitting=false; return; }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showNotify("Email: Valid format only."); isSubmitting=false; return; }
    if (email.length > 40) { showNotify("Email: Maximum 40 characters."); isSubmitting=false; return; }
    if (!checkPasswordStrength(password)) { 
        showNotify("Password: Min 8 chars | Must include: Uppercase, Lowercase, Number, Special (!@#$%^&*)"); 
        isSubmitting=false; return; 
    }
    if (password !== confirmPass) { showNotify("Passwords do not match. Please verify your password again."); isSubmitting=false; return; }
    if (!birthMonth || !birthDay || !birthYear) { showNotify("Please select your complete birth date."); isSubmitting=false; return; }
    if (ageNum < 13 || ageNum > 120) { showNotify("Age must be between 13 and 120 years to register."); isSubmitting=false; return; }
    const birthday = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;

    try {
        showNotify("Please wait...");
        const instantRes = await sendToAllServers('/api/auth/zero-register', {
            displayName,
            userId,
            email,
            provider: 'Zero.in'
        });

        console.log("Step 1:", instantRes);
        if (instantRes.message === 'Already registered, redirecting...') {
            showNotify("This email is already registered.");
            isSubmitting = false;
            return;
        }
        if (instantRes.message === 'Invalid endpoint.') {
            showNotify("✖ API Path not found. Check backend route.");
            isSubmitting = false;
            return;
        }

        if (instantRes.status !== 1 && !instantRes.message?.includes('Success')) {
            showNotify("✖ " + (instantRes.message || "Failed step 1."));
            isSubmitting = false;
            return;
        }

        const systemId = generateSystemId();
        const fullRes = await sendToAllServers('/api/auth/zero-register-full', {
            displayName,
            userId,
            systemId,
            email,
            password,
            birthday,
            age: ageNum
        });

        console.log("Step 2:", fullRes);
        if (fullRes.status === 1) {
            showNotify(`✔ Registration successful! Welcome • Your ID: #${systemId}`);
            setTimeout(() => window.location.href = 'home.html', 1800);
        } else {
            if (fullRes.message === 'SYSTEMID_EXISTS') {
                showNotify("Generating unique ID... please wait");
                setTimeout(() => { finalSubmit(); }, 700);
                return;
            } else if (fullRes.message === 'USER_ID_EXISTS') {
                showNotify("This USER ID is already taken. Please use another name.");
            } else if (fullRes.message === 'EMAIL_EXISTS') {
                showNotify("This email is already registered.");
            } else {
                showNotify("✖ " + (fullRes.message || "An error occurred."));
            }
            isSubmitting = false;
        }

    } catch (err) {
        showNotify("✖ Server connection failed. Please try again later");
        console.error(err);
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
    submitBtn.addEventListener('click', finalSubmit);
});
