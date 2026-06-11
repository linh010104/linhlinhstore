// --- File: js/address.js ---

let localData = [];

// 1. Tải danh sách địa chỉ từ Database
function loadAddresses() {
    const token = typeof StorageHelper !== 'undefined' ? StorageHelper.getToken() : localStorage.getItem('token');
    fetch(`${CONFIG.BASE_URL}/addresses/my`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            let html = '';
            if (result.data.length === 0) {
                html = '<div class="text-center py-4"><i class="fa-solid fa-map-location-dot fs-1 text-muted mb-3"></i><p class="text-muted">Bạn chưa có địa chỉ nào.</p></div>';
            } else {
                result.data.forEach(addr => {
                    const badge = addr.is_default ? '<span class="badge bg-danger">Mặc định</span>' : '';
                    const userName = document.getElementById('overview-name').innerText;
                    const userPhone = document.getElementById('overview-phone').innerText;
                    
                    html += `
                    <div class="card border border-${addr.is_default ? 'danger' : 'light'} shadow-sm rounded-3 mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <div><span class="fw-bold fs-6">${userName}</span><span class="text-muted mx-2">|</span><span class="text-muted">${userPhone}</span></div>
                                ${badge}
                            </div>
                            <p class="text-muted small mb-0">${addr.address_detail}, ${addr.ward}, ${addr.district}, ${addr.province}</p>
                            <div class="mt-3">
                                <a href="javascript:void(0)" onclick="deleteAddress(${addr.id})" class="text-danger text-decoration-none small">Xóa</a>
                            </div>
                        </div>
                    </div>`;
                });
            }
            document.getElementById('address-list-container').innerHTML = html;
        }
    });
}

// 2. Hàm xóa địa chỉ
function deleteAddress(id) {
    if(!confirm("Bạn có chắc muốn xóa địa chỉ này?")) return;
    const token = typeof StorageHelper !== 'undefined' ? StorageHelper.getToken() : localStorage.getItem('token');
    fetch(`${CONFIG.BASE_URL}/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(res => { if(res.success) loadAddresses(); });
}

// 3. Hàm Gắn sự kiện (CHỈ GỌI KHI HTML ĐÃ RÁP XONG)
function initAddressEvents() {
    // Kéo API Tỉnh Thành
    fetch('https://provinces.open-api.vn/api/?depth=3')
        .then(res => res.json())
        .then(data => {
            localData = data;
            let provHtml = '<option value="">Tỉnh/Thành phố</option>';
            data.forEach(p => provHtml += `<option value="${p.code}">${p.name}</option>`);
            document.getElementById('province').innerHTML = provHtml;
        });

    // Lắng nghe chọn Tỉnh -> Xã
    document.getElementById('province').addEventListener('change', function() {
        const pCode = this.value;
        const dSel = document.getElementById('district'); const wSel = document.getElementById('ward');
        wSel.innerHTML = '<option value="">Phường/Xã</option>'; wSel.disabled = true;
        if(!pCode) { dSel.innerHTML = '<option value="">Quận/Huyện</option>'; dSel.disabled = true; return; }
        const dists = localData.find(p => p.code == pCode).districts;
        let dHtml = '<option value="">Quận/Huyện</option>';
        dists.forEach(d => dHtml += `<option value="${d.code}">${d.name}</option>`);
        dSel.innerHTML = dHtml; dSel.disabled = false;
    });

    document.getElementById('district').addEventListener('change', function() {
        const dCode = this.value; const pCode = document.getElementById('province').value;
        const wSel = document.getElementById('ward');
        if(!dCode) { wSel.innerHTML = '<option value="">Phường/Xã</option>'; wSel.disabled = true; return; }
        const wards = localData.find(p => p.code == pCode).districts.find(d => d.code == dCode).wards;
        let wHtml = '<option value="">Phường/Xã</option>';
        wards.forEach(w => wHtml += `<option value="${w.code}">${w.name}</option>`);
        wSel.innerHTML = wHtml; wSel.disabled = false;
    });

    // Lắng nghe nút Submit
    document.getElementById('form-add-address').addEventListener('submit', function(e) {
        e.preventDefault();
        const pSel = document.getElementById('province'); const dSel = document.getElementById('district'); const wSel = document.getElementById('ward');
        const data = {
            province: pSel.options[pSel.selectedIndex].text,
            district: dSel.options[dSel.selectedIndex].text,
            ward: wSel.options[wSel.selectedIndex].text,
            address_detail: document.getElementById('addr-detail').value,
            address_type: document.querySelector('input[name="addr_type"]:checked').value,
            is_default: document.getElementById('is_default').checked ? 1 : 0
        };
        const token = typeof StorageHelper !== 'undefined' ? StorageHelper.getToken() : localStorage.getItem('token');
        fetch(`${CONFIG.BASE_URL}/addresses`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data)
        }).then(res => res.json()).then(result => {
            if(result.success) {
                document.getElementById('close-addr-modal').click();
                loadAddresses(); 
                this.reset(); 
            } else alert("Lỗi: " + result.message);
        });
    });
}