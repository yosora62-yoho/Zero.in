const API_BASE = "https://zero-in-backend.onrender.com"; 
let currentUser = null;
document.addEventListener("DOMContentLoaded", async () => {
    await loadRealProfile();
    initTabSwitch();
    lockToYouTabOnLoad();
    initNavigation();
    initSearchSystem();
    initNotificationBadge();
});
async function loadRealProfile() {
    const systemId = localStorage.getItem("systemId");
    if (!systemId) {
        setDefaultAvatar();
        return;
    }
    try {
        const res = await fetch(`${API_BASE}/api/user/get?systemId=${encodeURIComponent(systemId)}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            mode: "cors"
        });
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const result = await res.json();
        if (result.status === 1) {
            currentUser = result.userData;
            updateHeaderAvatar(currentUser);
        } else {
            setDefaultAvatar();
        }
    } catch (err) {
        console.error("Load profile failed:", err);
        setDefaultAvatar();
    }
}
function updateHeaderAvatar(user) {
    const avatarImg = document.getElementById("header-avatar-img");
    const fallbackText = document.getElementById("header-default-z");
    if (!avatarImg || !fallbackText) return;
    if (user?.avatar?.trim()) {
        avatarImg.src = user.avatar;
        avatarImg.onerror = () => {
            avatarImg.style.display = "none";
            fallbackText.style.display = "flex";
        };
        avatarImg.style.display = "block";
        fallbackText.style.display = "none";
    } else {
        avatarImg.style.display = "none";
        fallbackText.style.display = "flex";
    }
}
function setDefaultAvatar() {
    const avatarImg = document.getElementById("header-avatar-img");
    const fallbackText = document.getElementById("header-default-z");
    if (!avatarImg || !fallbackText) return;
    avatarImg.style.display = "none";
    fallbackText.style.display = "flex";
}
function lockToYouTabOnLoad() {
    const tabs = document.querySelectorAll(".tab-btn");
    const feedBox = document.querySelector(".feed-container");
    const youTab = document.querySelector('.tab-btn[data-tab="you"]');
    if (!tabs.length || !feedBox || !youTab) return;
    tabs.forEach(t => t.classList.remove("active"));
    youTab.classList.add("active");
    feedBox.innerHTML = `
        <div class="empty-feed">
            <p>Your Posts</p>
            <small>Post system is not enabled yet</small>
        </div>
    `;
}
function initTabSwitch() {
    const tabs = document.querySelectorAll(".tab-btn");
    const feedBox = document.querySelector(".feed-container");
    if (!tabs.length || !feedBox) return;
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            const tabName = tab.dataset.tab === "you" ? "Your Posts" : "Posts From People You Follow";

            feedBox.innerHTML = `
                <div class="empty-feed">
                    <p>${tabName}</p>
                    <small>Post system is not enabled yet</small>
                </div>
            `;
        });
    });
}
function initNavigation() {
    const profileBtn = document.querySelector(".profile-trigger");
    const navHome = document.querySelector('.nav-item[onclick*="HOME.html"]');
    const navWhisper = document.querySelector('.nav-item[onclick*="WHISPER.html"]');
    const navCreate = document.querySelector(".nav-center-btn");
    const navChat = document.querySelector('.nav-item[onclick*="CHAT.html"]');
    const navMe = document.querySelector('.nav-item[onclick*="ME.html"]');
    const notifyBtn = document.querySelector(".notify-wrapper");
    profileBtn?.addEventListener("click", () => location.href = "ME.html");
    navHome?.addEventListener("click", () => location.href = "HOME.html");
    navWhisper?.addEventListener("click", () => location.href = "WHISPER.html");
    navCreate?.addEventListener("click", () => location.href = "CREATE_POST.html");
    navChat?.addEventListener("click", () => location.href = "CHAT.html");
    navMe?.addEventListener("click", () => location.href = "ME.html");
    notifyBtn?.addEventListener("click", () => location.href = "NOTIFY.html");
}
function initSearchSystem() {
    const mainPage = document.getElementById("main-page");
    const searchPage = document.getElementById("search-page");
    const searchInput = document.getElementById("search-input");
    if (!mainPage || !searchPage || !searchInput) return;
    window.toggleSearch = function () {
        if (searchPage.classList.contains("active")) return;
        mainPage.classList.remove("active");
        searchPage.classList.add("active");
        history.pushState({ page: "search" }, "", "#search");
        setTimeout(() => searchInput.focus(), 460);
    };
    window.addEventListener("popstate", function () {
        if (searchPage.classList.contains("active")) {
            searchPage.classList.remove("active");
            mainPage.classList.add("active");
            searchInput.value = "";
        }
    });
    window.executeSearch = function () {
        const keyword = searchInput.value.trim();
        if (!keyword) {
            showToast("Please enter something to search");
            return;
        }

        try {
            let searchHistory = JSON.parse(localStorage.getItem("searchHistory") || "[]");
            if (!Array.isArray(searchHistory)) searchHistory = [];
            searchHistory = searchHistory.filter(item => {
                if (typeof item === "string") return item.toLowerCase() !== keyword.toLowerCase();
                if (item && typeof item === "object" && item.text) return item.text.toLowerCase() !== keyword.toLowerCase();
                return true;
            });
            searchHistory.unshift({ text: keyword, time: new Date().toISOString() });
            if (searchHistory.length > 30) searchHistory.pop();
            localStorage.setItem("searchHistory", JSON.stringify(searchHistory));
            showToast(`Search saved: ${keyword}`);
        } catch (err) {
            console.error("Save search failed:", err);
            showToast("Search saved");
        }
    };
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            executeSearch();
        }
    });
}
function initNotificationBadge() {
    const badge = document.getElementById("notify-badge");
    if (!badge) return;
    try {
        const unread = parseInt(localStorage.getItem("unreadNotify") || "0", 10);
        if (unread > 0) {
            badge.textContent = unread > 99 ? "99+" : unread;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    } catch {
        badge.style.display = "none";
    }
}
function showToast(text, duration = 2200) {
    const toast = document.getElementById("copy-toast");
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => toast.classList.remove("show"), duration);
}