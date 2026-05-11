/* File: js/orders.js */
let currentOrderId = null;
const orderToken = localStorage.getItem("token"); // Khai báo global đổi tên thành orderToken

document.addEventListener("DOMContentLoaded", () => {
    if (!orderToken) { 
        window.location.href = "login.html"; 
        return; 
    }
    loadOrders();
});

function loadOrders() {
    fetch(`${CONFIG.BASE_URL}/orders/mine`, {
        headers: { "Authorization": "Bearer " + orderToken }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("order-history-list");
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Bạn chưa có đơn hàng nào.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(order => `
            <tr>
                <td class="ps-4 fw-bold text-primary">#${order.id}</td>
                <td>${new Date(order.created_at).toLocaleString('vi-VN')}</td>
                <td class="text-danger fw-bold">${Number(order.total_amount).toLocaleString('vi-VN')} đ</td>
                <td>${getStatusBadge(order.status)}</td>
                <td class="text-end pe-4">
                    <button onclick="viewDetail(${order.id})" class="btn btn-primary btn-sm rounded-pill px-3 shadow-sm">
                        <i class="fa-solid fa-eye me-1"></i> Chi tiết
                    </button>
                </td>
            </tr>
        `).join('');
    })
    .catch(err => console.error(err));
}

function viewDetail(id) {
    currentOrderId = id;
    fetch(`${CONFIG.BASE_URL}/orders/${id}`, {
        headers: { "Authorization": "Bearer " + orderToken }
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
            const fallbackImg = "https://placehold.co/50x50/f8f9fa/a3a3a3?text=LL";
            const imgUrl = item.image_url ? `${CONFIG.IMAGE_BASE_URL}${item.image_url}` : fallbackImg;
            const variantHtml = item.variant_info ? `<div class="text-muted" style="font-size: 12px; font-style: italic;">Phân loại: <span class="text-dark fw-bold">${item.variant_info}</span></div>` : '';

            return `
            <div class="list-group-item d-flex align-items-center gap-3 py-3">
                <img src="${imgUrl}" onerror="this.src='${fallbackImg}'" style="width: 55px; height: 55px; object-fit: contain;" class="rounded border shadow-sm p-1">
                <div class="flex-grow-1 small">
                    <div class="fw-bold text-dark" style="font-size: 14px;">${item.name}</div>
                    ${variantHtml}
                    <div class="text-muted mt-1">SL: ${item.quantity} <span class="mx-1">x</span> ${Number(item.price).toLocaleString('vi-VN')} đ</div>
                </div>
                <div class="fw-bold text-danger text-end" style="font-size: 15px;">
                    ${Number(item.price * item.quantity).toLocaleString('vi-VN')} đ
                </div>
            </div>
            `;
        }).join('');

        document.getElementById("modal-total").innerText = Number(order.total_amount).toLocaleString('vi-VN') + " đ";

        const footer = document.getElementById("modal-footer-actions");
        footer.innerHTML = '<button class="btn btn-secondary rounded-pill px-4" data-bs-dismiss="modal">Đóng</button>';
        
        if (isNew) {
            footer.innerHTML += `<button onclick="saveOrderInfo()" class="btn btn-primary rounded-pill px-4 ms-2"><i class="fa-solid fa-floppy-disk me-1"></i> Cập nhật</button>`;
            footer.innerHTML += `<button onclick="cancelOrder()" class="btn btn-outline-danger rounded-pill px-4 ms-2"><i class="fa-solid fa-ban me-1"></i> Hủy đơn</button>`;
        } else if (order.status === 'DONE') {
            footer.innerHTML += '<button onclick="submitReturnRequest()" class="btn btn-outline-danger rounded-pill px-4 ms-2"><i class="fa-solid fa-rotate-left me-1"></i> Trả hàng</button>';
        } else if (order.status === 'SHIPPED') {
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
        Swal.fire('Thiếu thông tin', 'Vui lòng điền đủ Tên, SĐT và Địa chỉ nhận hàng!', 'warning'); 
        return;
    }

    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/update-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + orderToken },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(d => {
        if (!d.error) {
            Swal.fire('Thành công', d.message, 'success').then(() => location.reload());
        } else {
            Swal.fire('Lỗi', d.message, 'error');
        }
    })
    .catch(err => console.error(err));
}

function cancelOrder() {
    Swal.fire({
        title: 'Hủy đơn hàng?',
        text: "Bạn chắc chắn muốn hủy đơn hàng này chứ? (Không thể hoàn tác!)",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đồng ý hủy',
        cancelButtonText: 'Không'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/user-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + orderToken },
                body: JSON.stringify({ status: 'CANCELLED' })
            })
            .then(res => res.json())
            .then(d => {
                if (!d.error) {
                    Swal.fire('Đã hủy', d.message, 'success').then(() => location.reload());
                } else {
                    Swal.fire('Lỗi', d.message, 'error');
                }
            })
            .catch(err => console.error(err));
        }
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
    if (!main) { 
        Swal.fire('Thiếu thông tin', 'Vui lòng chọn lý do trả hàng!', 'warning'); 
        return; 
    }

    const finalReason = detail ? `${main} (Chi tiết: ${detail})` : main;
    const btn = document.getElementById("btn-confirm-return");
    btn.disabled = true;

    fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/request-return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + orderToken },
        body: JSON.stringify({ reason: finalReason })
    })
    .then(res => res.json())
    .then(d => { 
        Swal.fire('Thành công', d.message, 'success').then(() => location.reload());
    })
    .catch(err => { 
        console.error(err); 
        btn.disabled = false; 
    });
}

function updateStatus(status) {
    Swal.fire({
        title: 'Xác nhận?',
        text: "Bạn đã nhận được hàng và xác nhận đơn hàng này?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Đã nhận hàng'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${CONFIG.BASE_URL}/orders/${currentOrderId}/user-status`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + orderToken },
                body: JSON.stringify({ status })
            })
            .then(res => res.json())
            .then(d => { 
                Swal.fire('Cảm ơn!', d.message, 'success').then(() => location.reload());
            })
            .catch(err => console.error(err));
        }
    });
}

function getStatusBadge(status) {
    switch(status) {
        case 'NEW': return '<span class="badge rounded-pill bg-primary px-3">Chờ xác nhận</span>';
        case 'CONFIRMED': return '<span class="badge rounded-pill bg-info text-dark px-3">Đã xác nhận</span>';
        case 'SHIPPED': return '<span class="badge rounded-pill bg-warning text-dark px-3">Đang giao hàng</span>';
        case 'DONE': return '<span class="badge rounded-pill bg-success px-3">Hoàn tất</span>';
        case 'RETURN_REQUESTED': return '<span class="badge rounded-pill bg-warning text-dark px-3">Chờ duyệt trả</span>';
        case 'RETURNED': return '<span class="badge rounded-pill bg-secondary px-3">Đã hoàn trả</span>';
        case 'CANCELLED': return '<span class="badge rounded-pill bg-danger px-3">Đã hủy</span>';
        default: return `<span class="badge rounded-pill bg-dark px-3">${status}</span>`;
    }
}