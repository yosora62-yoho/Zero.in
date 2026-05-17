let userData = [];
let selectedUserId = null;
const API_URL = "https://zero-in-backend.onrender.com";
async function loadRealData() {
    try {
        const response = await fetch(`${API_URL}/api/user/get/all`);
        if (!response.ok) throw new Error("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        const result = await response.json();
        if (result.status === 1) {
            userData = result.userList;
        } else {
            userData = [];
        }
    } catch (err) {
        console.error("โหลดข้อมูลล้มเหลว:", err);
        alert(" ไม่สามารถโหลดข้อมูลจากเซิร์ฟเวอร์ได้");
        userData = [];
    } finally {
        renderData('all');
    }
}
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderData(btn.dataset.filter, document.getElementById('search-input').value.trim().toLowerCase());
    });
});
document.getElementById('search-input').addEventListener('input', (e) => {
    renderData(document.querySelector('.tab-btn.active').dataset.filter, e.target.value.trim().toLowerCase());
});
function renderData(filterType, keyword = '') {
    let filtered = userData.filter(u => {
        let passFilter = false;
        if (filterType === 'all') passFilter = true;
        if (filterType === 'male') passFilter = (u.gender === 'male');
        if (filterType === 'female') passFilter = (u.gender === 'female');
        if (filterType === 'block') passFilter = (u.status === 'blocked');
        let passSearch = true;
        if (keyword) {
            passSearch = (u.displayName?.toLowerCase().includes(keyword) || u.userId?.toLowerCase().includes(keyword));
        }
        return passFilter && passSearch;
    });

    const container = document.getElementById('dataContainer');
    container.innerHTML = '';

    if (filtered.length === 0) {
        container.innerHTML = '<div class="empty-text">ไม่พบข้อมูล</div>';
        return;
    }
    filtered.forEach((u) => {
        const wrap = document.createElement('div');
        wrap.className = 'item-wrap';
        const item = document.createElement('div');
        item.className = 'profile-item';
        item.innerHTML = `
            <div class="profile-avatar">Z</div>
            <div class="profile-info">
                <div class="profile-name">${u.displayName || 'ไม่มีชื่อ'}</div>
                <div class="profile-username">@${u.userId || 'user'}</div>
            </div>
            <div class="more-btn" data-uid="${u.id || u.userId}" style="margin-left:auto; color:var(--dim); font-size:22px; font-weight:bold; padding:2px 6px; cursor:pointer;">⋮</div>
        `;

        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        codeBlock.innerHTML = `<pre class="code-content">${JSON.stringify(u, null, 4)}</pre>`;
        item.addEventListener('click', (e) => {
            if (!e.target.classList.contains('more-btn')) {
                codeBlock.classList.toggle('open');
            }
        });

        wrap.appendChild(item);
        wrap.appendChild(codeBlock);
        container.appendChild(wrap);
    });

    bindMenuButtons();
}
function bindMenuButtons() {
    const menu = document.getElementById('contextMenu');
    document.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedUserId = btn.dataset.uid;

            const rect = btn.getBoundingClientRect();
            menu.style.left = `${rect.left - 120}px`;
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.display = 'block';
        });
    });
    document.addEventListener('click', () => {
        menu.style.display = 'none';
    });
}
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        const action = item.dataset.action;
        const user = userData.find(u => (u.id || u.userId) === selectedUserId);
        document.getElementById('contextMenu').style.display = 'none';

        if (action === 'edit') {
            document.getElementById('mainPage').style.display = 'none';
            document.getElementById('editPage').style.display = 'block';
            document.getElementById('jsonEditor').value = JSON.stringify(user, null, 4);
        }

        if (action === 'profile') {
            alert(`👤 โปรไฟล์: ${user.displayName || '-'}\nอีเมล: ${user.email || '-'}`);
        }

        if (action === 'delete') {
            document.getElementById('deleteConfirm').style.display = 'block';
            document.getElementById('deleteInput').value = '';
        }
    });
});
document.getElementById('saveData').addEventListener('click', async () => {
    try {
        const updated = JSON.parse(document.getElementById('jsonEditor').value);
        const res = await fetch(`${API_URL}/api/user/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        });
        const result = await res.json();

        if (result.status === 1) {
            alert('✅ บันทึกเรียบร้อย');
            await loadRealData();
            document.getElementById('mainPage').style.display = 'block';
            document.getElementById('editPage').style.display = 'none';
        } else {
            alert('❌ ' + (result.message || 'บันทึกไม่สำเร็จ'));
        }

    } catch (err) {
        alert('❌ JSON ผิดพลาด หรือเชื่อมต่อไม่ได้: ' + err.message);
    }
});

document.getElementById('backFromEdit').addEventListener('click', () => {
    document.getElementById('mainPage').style.display = 'block';
    document.getElementById('editPage').style.display = 'none';
});
document.getElementById('confirmDelete').addEventListener('click', async () => {
    if (document.getElementById('deleteInput').value.trim() === 'ลบ') {
        try {
            const res = await fetch(`${API_URL}/api/user/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: selectedUserId })
            });
            const result = await res.json();

            if (result.status === 1) {
                alert('🗑️ ลบเรียบร้อย');
                await loadRealData();
            } else {
                alert('❌ ' + (result.message || 'ลบไม่สำเร็จ'));
            }
        } catch (err) {
            alert('❌ เชื่อมต่อผิดพลาด: ' + err.message);
        }
        document.getElementById('deleteConfirm').style.display = 'none';
    } else {
        alert('❌ พิมพ์คำว่า "ลบ" ให้ถูกต้อง');
    }
});
document.getElementById('cancelDelete').addEventListener('click', () => {
    document.getElementById('deleteConfirm').style.display = 'none';
});
loadRealData();