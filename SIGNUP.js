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
    let cleanName = name.toLowerCase().replace(/\s+/g, '');
    if (cleanName.length > 20) {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let randomPrefix = '';
        for (let i = 0; i < 5; i++) {
            randomPrefix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        cleanName = randomPrefix;
    }
    const symbols = '._-';
    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
    const randomNumber = Math.floor(100000 + Math.random() * 900000);
    const finalId = `@${cleanName}${randomSymbol}${randomNumber}`;
    return finalId.length > 20 ? finalId.substring(0, 20) : finalId;
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
            const userId = generateUniqueId(userData.name);
            localStorage.setItem('signup_data', JSON.stringify({
                username: userData.name,
                email: userData.email.toLowerCase(),
                userId: userId
            }));
            
            window.location.href = `SIGNUP_DETAILS.html?name=${encodeURIComponent(userData.name)}&email=${encodeURIComponent(userData.email)}&id=${encodeURIComponent(userId)}`;
        })
        .catch(err => {
            console.error("Get Google profile error:", err);
            alert("❌ ไม่สามารถดึงข้อมูลบัญชีได้ กรุณาลองใหม่อีกครั้ง");
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
    
    if (name.length > 23) {
        showNotify("Display Name must not exceed 23 characters");
        return;
    }

    if (!name && !email) {
        showNotify("Please enter your Name and Email");
        return;
    }
    
    if (!name) {
        showNotify("Please enter your Name to start signing up");
        return;
    }
    
    if (!email) {
        showNotify("Please enter your Email to start signing up");
        return;
    }

    const isAllowed = ALLOWED_DOMAINS.some(domain => email.endsWith(domain));
    if (!isAllowed) {
        showNotify("This email domain is not allowed. Please use a trusted provider.");
        return;
    }
    
    if (!email.includes('@') || email.length < 10) {
        showNotify("Please check your Email");
        return;
    }

    const userId = generateUniqueId(name);

    localStorage.setItem('signup_data', JSON.stringify({ 
        username: name, 
        email: email, 
        userId: userId
    }));

    const nextUrl = `SIGNUP_DETAILS.html?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&id=${encodeURIComponent(userId)}`;
    window.location.href = nextUrl;
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
    container.appendChild(box);
    setTimeout(() => {
        box.style.opacity = '0';
        box.style.transition = '0.5s ease';
        setTimeout(() => box.remove(), 500);
    }, 3000);
}