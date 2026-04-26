let currentOrderId = null;

document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "login.html"; return; }

    fetch("http://localhost:3000/api/orders/mine", {
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
                    <button onclick="viewDetail(${order.id})" class="btn btn-primary btn-sm rounded-pill px-3">Chi tiết</button>
                </td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-5">Trống</td></tr>';
    });
});

function viewDetail(id) {
    currentOrderId = id;
    fetch(`http://localhost:3000/api/orders/${id}`, {
        headers: { "Authorization": "Bearer " + localStorage.getItem("token") }
    })
    .then(res => res.json())
    .then(order => {
        document.getElementById("modal-order-id").innerText = order.id;
        document.getElementById("modal-name").value = order.receiver_name;
        document.getElementById("modal-phone").value = order.phone;
        document.getElementById("modal-address").value = order.address;
        
        const returnBox = document.getElementById("return-info-box");
        if (order.return_reason) {
            returnBox.classList.remove("d-none");
            document.getElementById("modal-return-reason").innerText = order.return_reason;
        } else { returnBox.classList.add("d-none"); }

        const list = document.getElementById("modal-items-list");
        // FIX: Xử lý link ảnh an toàn, nếu null thì gán ảnh trống
        list.innerHTML = order.items.map(item => {
            const imgUrl = item.image_url ? `http://localhost:3000${item.image_url}` : "https://via.placeholder.com/45";
            return `
            <div class="list-group-item d-flex align-items-center gap-3">
                <img src="${imgUrl}" style="width: 45px; height: 45px; object-fit: cover;" class="rounded border">
                <div class="flex-grow-1 small">
                    <div class="fw-bold">${item.name}</div>
                    <div class="text-muted">SL: ${item.quantity}</div>
                </div>
                <div class="fw-bold text-end">${Number(item.price * item.quantity).toLocaleString()} đ</div>
            </div>
            `;
        }).join('');

        document.getElementById("modal-total").innerText = Number(order.total_amount).toLocaleString() + " đ";

        const footer = document.getElementById("modal-footer-actions");
        footer.innerHTML = '<button class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Đóng</button>';
        
        if (order.status === 'DONE') {
            footer.innerHTML += '<button onclick="submitReturnRequest()" class="btn btn-outline-danger rounded-pill px-4 ms-2">Trả hàng</button>';
        } else if (order.status === 'SHIPPING') {
            footer.innerHTML += '<button onclick="updateStatus(\'DONE\')" class="btn btn-success rounded-pill px-4 ms-2">Đã nhận hàng</button>';
        }

        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    });
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

    fetch(`http://localhost:3000/api/orders/${currentOrderId}/request-return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ reason: finalReason })
    })
    .then(res => res.json())
    .then(d => { alert(d.message); location.reload(); });
}

function updateStatus(status) {
    if(!confirm("Xác nhận thao tác này?")) return;
    const token = localStorage.getItem("token");
    fetch(`http://localhost:3000/api/orders/${currentOrderId}/user-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(d => { alert(d.message); location.reload(); });
}

function getStatusBadge(status) {
    switch(status) {
        case 'DONE': return '<span class="badge rounded-pill bg-success">Hoàn tất</span>';
        case 'RETURN_REQUESTED': return '<span class="badge rounded-pill bg-warning text-dark">Chờ duyệt trả</span>';
        case 'RETURNED': return '<span class="badge rounded-pill bg-secondary">Đã hoàn trả</span>';
        default: return `<span class="badge rounded-pill bg-info">${status}</span>`;
    }
}