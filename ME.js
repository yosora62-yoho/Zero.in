const API_SERVERS = [
    "https://zero-in-backend.onrender.com"
];
let currentUserData = null;
async function fetchFromServers(endpoint, method = "GET", body = null) {
    const promises = API_SERVERS.map(base =>
        fetch(`${base}${endpoint}`, {
            method,
            headers: { 
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            mode: "cors",
            body: body ? JSON.stringify(body) : undefined
        })
        .then(res => res.ok ? res.json() : { status: -1 })
        .catch(() => ({ status: -1 }))
    );
    const results = await Promise.all(promises);
    return results.find(r => r?.status === 1) || results[0] || { status: -1 };
}
function showToast(text = "✔ System ID copied successfully!") {
    const toast = document.getElementById("copy-toast");
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2800);
}
function copyUserId() {
    if (!currentUserData?.systemId) return showToast("⚠︎ No ID available");
    navigator.clipboard.writeText(currentUserData.systemId)
        .then(() => showToast(`✔ ID #${currentUserData.systemId} copied!`))
        .catch(() => showToast("⚠ Copy failed, try again"));
}
function switchTab(el, tabName) {
    document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
    el.classList.add("active");
    if (tabName === "posts") {
        document.getElementById("lock-comments").style.display = "none";
        document.getElementById("lock-reposts").style.display = "none";
        document.getElementById("lock-likes").style.display = "none";
        document.getElementById("lock-saves").style.display = "none";
        updateStatusBar(currentUserData?.counts?.posts || 0, "POSTS");
        return;
    }
    const lockMap = {
        comments: "lock-comments",
        reposts: "lock-reposts",
        likes: "lock-likes",
        saves: "lock-saves"
    };
    const countMap = {
        comments: "comments",
        reposts: "reposts",
        likes: "likes",
        saves: "saves"
    };
    const lockEl = document.getElementById(lockMap[tabName]);
    const isLocked = currentUserData?.privacy?.[tabName] === true;
    lockEl.style.display = isLocked ? "inline-block" : "none";
    updateStatusBar(currentUserData?.counts?.[countMap[tabName]] || 0, tabName.toUpperCase());
}
function updateStatusBar(count, label) {
    document.getElementById("stat-count").textContent = count;
    document.getElementById("stat-label").textContent = label;
}
function toggleSearch() {
    const searchBox = document.getElementById("search-input");
    searchBox.classList.toggle("expanded");
    searchBox.focus();
    if (!searchBox.classList.contains("expanded")) searchBox.value = "";
}
async function loadProfile() {
    const systemId = localStorage.getItem("active_system_id") || sessionStorage.getItem("active_system_id");
    if (!systemId) {
        showToast("⚠ Please log in first");
        setTimeout(() => window.location.href = "LOGIN.html", 1800);
        return;
    }
    try {
        const res = await fetchFromServers(`/api/user/get?systemId=${encodeURIComponent(systemId)}`);
        if (res.status !== 1 || !res.userData) throw new Error("User not found");
        currentUserData = res.userData;
        document.getElementById("display-name").textContent = currentUserData.displayName || "ZERO USER";
        document.getElementById("user-handle").textContent = currentUserData.userHandle || `@zero.in.${currentUserData.userId || systemId}`;
        document.getElementById("user-bio").textContent = currentUserData.bio || "-----";
        document.getElementById("count-following").textContent = currentUserData.stats?.following || 0;
        document.getElementById("count-followers").textContent = currentUserData.stats?.followers || 0;
        document.getElementById("count-friends").textContent = currentUserData.stats?.friends || 0;
        if (currentUserData.avatar) {
            document.getElementById("profile-img").src = currentUserData.avatar;
            document.getElementById("profile-img").style.display = "block";
            document.getElementById("default-z").style.display = "none";
        } else {
            document.getElementById("default-z").style.display = "flex";
            document.getElementById("profile-img").style.display = "none";
        }
        if (currentUserData.cover) {
            document.getElementById("cover-img").src = currentUserData.cover;
            document.getElementById("cover-img").style.display = "block";
        } else {
            document.getElementById("cover-img").style.display = "none";
        }
        const p = currentUserData.privacy || {};
        document.getElementById("lock-comments").style.display = p.comments ? "inline-block" : "none";
        document.getElementById("lock-reposts").style.display = p.reposts ? "inline-block" : "none";
        document.getElementById("lock-likes").style.display = p.likes ? "inline-block" : "none";
        document.getElementById("lock-saves").style.display = p.saves ? "inline-block" : "none";
        document.querySelector('.tab-item.active')?.classList.remove('active');
        document.querySelectorAll('.tab-item')[1].classList.add('active');
        updateStatusBar(currentUserData.counts?.comments || 0, "COMMENTS");
        console.log(`✔ PROFILE LOADED: #${currentUserData.systemId} | ${currentUserData.displayName}`);
    } catch (err) {
        console.error("[LOAD PROFILE ERROR]", err);
        showToast("✖ Failed to load profile");
        setTimeout(() => window.location.href = "LOGIN.html", 2000);
    }
}
document.addEventListener("DOMContentLoaded", loadProfile);