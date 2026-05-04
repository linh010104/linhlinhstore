/* File: js/orders.js */
let currentOrderId = null;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "login.html"; return; }

    fetch(`${CONFIG.BASE_URL}/orders/mine`, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("order-history-list");
        tbody.innerHTML = data.map(order => `
            <tr>
                <td class="ps-4 fw-bold">#${order.id}</td>
                <td>${new Date(order.created_at).toLocaleString('vi-VN')}</td>
                <td class="text-danger fw-bold">${Number(order.total_amount).toLocaleString()} đ</td>
                <td>${getStatusBadge(order.status)}</td>
                <td class="text-end pe-4">
                    <button onclick="viewDetail(${order.id})" class="btn btn-primary btn-sm rounded-pill px-3 shadow-sm">
                        <i class="fa-solid fa-eye me-1"></i> Chi tiết
                    </button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-5 text-muted">Bạn chưa có đơn hàng nào.</td></tr>';
    })
    .catch(err => console.error(err));
});

function viewDetail(id) {
    currentOrderId = id;
    fetch(`${CONFIG.BASE_URL}/orders/${id}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
    .then(res => res.json())
    .then(order => {
        document.getElementById("modal-order-id").innerText = order.id;
        
        const nameInput = document.getElementById("modal-name");
        const phoneInput = document.getElementById("modal-phone");
        const addressInput = document.getElementById("modal-address");
        const noteInput = document.getElementById("modal-note");

        nameInput.value = order.receiver_name || "";
        phoneInput.value = order.phone || "";
        addressInput.value = order.address || "";
        noteInput.value = order.note || "";

        const isNew = order.status === 'NEW';
        nameInput.disabled = !isNew;
        phoneInput.disabled = !isNew;
        addressInput.disabled = !isNew;
        noteInput.disabled = !isNew;
        
        const returnBox = document.getElementById("return-info-box");
        if (order.return_reason) {
            returnBox.classList.remove("d-none");
            document.getElementById("modal-return-reason").innerText = order.return_reason;
        } else { 
            returnBox.classList.add("d-none"); 
        }

        const list = document.getElementById("modal-items-list");
        list.innerHTML = order.items.map(item => {
            const imgUrl = item.image_url ? `${CONFIG.IMAGE_BASE_URL}${item.image_url}` : "https://via.placeholder.com/45";
            const variantHtml = item.variant_info ? `<div class="text-muted" style="font-size: 12px; font-style: italic;">Phân loại: <span class="text-dark fw-bold">${item.variant_info}</span></div>` : '';

            return `
            <div class="list-group-item d-flex align-items-center gap-3">
                <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded border shadow-sm">
                <div class="flex-grow-1 small">
                    <div class="fw-bold" style="font-size: 14px;">${item.name}</div>
                    ${variantHtml}
                    <div class="text-muted mt-1">SL: ${item.quantity} x ${Number(item.price).toLocaleString()} đ</div>
                </div>
                <div class="fw-bold text-danger text-end" style="font-size: 15px;">
                    ${Number(item.price * item.quantity).toLocaleString()} đ
                </div>
            </div>
            `;
        }).join('');

        document.getElementById("modal-total").innerText = Number(order.total_amount).toLocaleString() + " đ";

        const footer = document.getElementById("modal-footer-actions");
        footer.innerHTML = '<button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Đóng</button>';
        
        if (isNew) {
            footer.innerHTML += `<button onclick="saveOrderInfo()" class="btn btn-primary rounded-pill px-4 ms-2"><i class="fa-solid fa-floppy-disk me-1"></i> Cập nhật</button>`;
            footer.innerHTML += `<button onclick="cancelOrder()" class="btn btn-outline-danger rounded-pill px-4 ms-2"><i class="fa-solid fa-ban me-1"></i> Hủy đơn</button>`;
        } else if (order.status === 'DONE') {
            footer.innerHTML += '<button onclick="submitReturnRequest()" class="btn btn-outline-danger rounded-pill px-4 ms-2"><i class="fa-solid fa-rotate-left me-1"></i> Trả hàng</button>';
        } else if (order.status === 'SHIPPING') {
            footer.innerHTML += '<button onclick="updateStatus(\'DONE\')" class="btn btn-success rounded-pill px-4 ms-2"><i class="fa-solid fa-check-circle me-1"></i> Đã nhận hàng</button>';
        }

        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    })
    .catch(err => console.error(err));
}

function saveOrderInfo() {
    const data = {
        name: document.getElementById("modal-name").value.trim(),
        phone: document.getElementById("modal-phone").value.trim(),
        address: document.getElementById("modal-address").value.trim(),
        note: document.getElementById("modal-note").value.trim()
    };

    if (!data.name || !data.phone || !data.address) {
        alert("Vui lòng điền đủ Tên, SĐT và Địa chỉ!"); return;
    }

    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/update-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(d => {
        alert(d.message);
        if (!d.error) location.reload();
    })
    .catch(err => console.error(err));
}

function cancelOrder() {
    if(!confirm("Bạn chắc chắn muốn hủy đơn hàng này chứ? (Không thể hoàn tác!)")) return;
    
    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/user-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ status: 'CANCELLED' })
    })
    .then(res => res.json())
    .then(d => {
        alert(d.message);
        if (!d.error) location.reload();
    })
    .catch(err => console.error(err));
}

function submitReturnRequest() {
    bootstrap.Modal.getInstance(document.getElementById('orderDetailModal')).hide();
    document.getElementById("select-return-reason").value = "";
    document.getElementById("input-return-reason").value = "";
    new bootstrap.Modal(document.getElementById('returnReasonModal')).show();
}

function confirmReturnRequest() {
    const main = document.getElementById("select-return-reason").value;
    const detail = document.getElementById("input-return-reason").value.trim();
    if (!main) { alert("Vui lòng chọn lý do!"); return; }

    const finalReason = detail ? `${main} (Chi tiết: ${detail})` : main;
    const btn = document.getElementById("btn-confirm-return");
    btn.disabled = true;

    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/request-return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ reason: finalReason })
    })
    .then(res => res.json())
    .then(d => { alert(d.message); location.reload(); })
    .catch(err => { console.error(err); btn.disabled = false; });
}

function updateStatus(status) {
    if(!confirm("Xác nhận thao tác này?")) return;
    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/user-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(d => { alert(d.message); location.reload(); })
    .catch(err => console.error(err));
}

function getStatusBadge(status) {
    switch(status) {
        case 'NEW': return '<span class="badge rounded-pill bg-primary">Chờ xác nhận</span>';
        case 'SHIPPING': return '<span class="badge rounded-pill bg-info text-dark">Đang giao hàng</span>';
        case 'DONE': return '<span class="badge rounded-pill bg-success">Hoàn tất</span>';
        case 'RETURN_REQUESTED': return '<span class="badge rounded-pill bg-warning text-dark">Chờ duyệt trả</span>';
        case 'RETURNED': return '<span class="badge rounded-pill bg-secondary">Đã hoàn trả</span>';
        case 'CANCELLED': return '<span class="badge rounded-pill bg-danger">Đã hủy</span>';
        default: return `<span class="badge rounded-pill bg-dark">${status}</span>`;
    }
}