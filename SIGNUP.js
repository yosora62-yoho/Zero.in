if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = "https://www.google.com/404";
}
const ALLOWED_DOMAINS = [
    '@gmail.com', '@outlook.com', '@hotmail.com', '@icloud.com',
    '@proton.me', '@yahoo.com', '@protonmail.com', '@zoho.com',
    '@yandex.com', '@mail.ru', '@163.com', '@qq.com', '@facebook.com',
    '@github.com', '@tiktok.com', '@discord.com', '@wechat.com'
];
function generateUniqueId(name) {
    if (!name || name.trim().length === 0) {
        const randomBase = Math.random().toString(36).substring(2, 8);
        return `user_${randomBase}`;
    }
    let cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    cleanName = cleanName.slice(0, 12);
    if (cleanName.length < 4) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        while (cleanName.length < 6) {
            cleanName += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    const symbols = ['_', '.', '-'];
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 90000);
    let finalId = `${cleanName}${randomSymbol}${randomNumber}`;
    finalId = `@${finalId.substring(0, 18)}`;
    return finalId;
}

window.onload = () => {
    const loading = document.getElementById('loading-page');
    const main = document.getElementById('main-page');
    const urlParams = new URLSearchParams(window.location.hash.substring(1));
    const token = urlParams.get('access_token');
    if (token) {
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(userData => {
            if (!userData.name || !userData.email) {
                alert("⚠ Incomplete account data received. Please try again.");
                return;
            }

            const cleanName = userData.name.trim();
            const cleanEmail = userData.email.trim().toLowerCase();
            const isAllowed = ALLOWED_DOMAINS.some(domain => cleanEmail.endsWith(domain));
            if (!isAllowed) {
                alert("⚠ This email domain is not supported. Please use another account.");
                return;
            }

            const userId = generateUniqueId(cleanName);
            localStorage.setItem('signup_data', JSON.stringify({
                username: cleanName,
                email: cleanEmail,
                userId: userId
            }));
            
            window.location.href = `SIGNUP_DETAILS.html`;
        })
        .catch(err => {
            console.error("Get Google profile error:", err);
            alert("⚠ Failed to connect to Google. Please check your internet or try again later.");
        });
    }
    setTimeout(() => {
        if (loading) {
            loading.style.opacity = '0';
            loading.style.display = 'none';
        }
        if (main) {
            main.classList.add('active');
        }
    }, 0); 
};
function goToDetails() {
    const name = document.getElementById('username').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase(); 
    if (!name) {
        showNotify("️⚠ Display Name cannot be empty. Please enter your name.");
        return;
    }
    if (name.length < 2) {
        showNotify("⚠ Display Name is too short. Minimum 2 characters required.");
        return;
    }
    if (name.length > 23) {
        showNotify("⚠ Display Name is too long. Maximum 23 characters allowed.");
        return;
    }
    if (/[<>\"'%;()&+\/\\]/.test(name)) {
        showNotify("⚠ Display Name contains invalid characters. Please use letters and numbers only.");
        return;
    }
    if (!email) {
        showNotify("⚠ Email Address cannot be empty. Please enter your email.");
        return;
    }
    if (email.length < 10) {
        showNotify("⚠ Email Address is too short. Please check again.");
        return;
    }
    if (email.length > 40) {
        showNotify("⚠ Email Address is too long. Maximum 40 characters allowed.");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotify("⚠ Invalid Email format. Example: name@example.com");
        return;
    }
    const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
    if (!isAllowed) {
        showNotify("⚠ his Email domain is not allowed. Please use Gmail, Outlook, Yahoo or other trusted providers.");
        return;
    }
    const userId = generateUniqueId(name);
    localStorage.setItem('signup_data', JSON.stringify({ 
        username: name, 
        email: email, 
        userId: userId
    }));

    showNotify("✔ Information verified! Redirecting to details page...");
    
    setTimeout(() => {
        window.location.href = `SIGNUP_DETAILS.html`;
    }, 800);
}

const googleId = '778254561339-e8if7rcjiaoepb09b0ef8ietql29a2pa.apps.googleusercontent.com';
const facebookId = '1003964725619886';
const githubId = 'Ov23lijBov1QHujGticS';
const tiktokKey = 'awphc9efsebgb3qe';
const discordId = '1502643313352900748';
const wechatId = 'b8irhkf8oi282yoz60mrlhu3o0nih7';

function googleLogin() {
    const uri = window.location.origin;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleId}&redirect_uri=${uri}&response_type=token&scope=email profile`;
    window.location.href = url;
}
function facebookLogin() {
    const isLocal = window.location.hostname === 'localhost';
    const redirect = isLocal ? 'http://localhost:8158/login.html' : 'https://yosora62-yoho.github.io/';
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${facebookId}&redirect_uri=${redirect}&response_type=token&scope=public_profile,email`;
}
function githubLogin() {
    const redirect_uri = window.location.origin; 
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${githubId}&redirect_uri=${redirect_uri}&scope=user:email`;
}
function tiktokLogin() {
    const isLocal = window.location.hostname === 'localhost';
    const redirect = isLocal ? 'http://localhost:8158/login.html' : 'https://yosora62-yoho.github.io/';
    window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${tiktokKey}&scope=user.info.basic&redirect_uri=${encodeURIComponent(redirect)}`;
}
function discordLogin() {
    const redirect = encodeURIComponent(window.location.origin);
    const url = `https://discord.com/api/oauth2/authorize?client_id=${discordId}&redirect_uri=${redirect}&response_type=token&scope=identify email`;
    window.location.href = url;
}
function wechatLogin() {
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `https://open.weixin.qq.com/connect/qrconnect?appid=${wechatId}&redirect_uri=${redirect}&response_type=code&scope=snsapi_login`;
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
        box.style.transform = 'translateY(-10px)';
        box.style.transition = 'all 0.5s ease';
        setTimeout(() => box.remove(), 500);
    }, 3000);
}
