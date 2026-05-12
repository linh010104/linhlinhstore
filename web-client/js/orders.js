let currentOrderId = null;

document.addEventListener("DOMContentLoaded", () => {
    if (!UIHelper.ensureLogin()) { 
        return; 
    }
    loadOrders();
});

function loadOrders() {
    API.get('/orders/mine', true)
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
                <td class="text-danger fw-bold">${UIHelper.formatPrice(Number(order.total_amount))}</td>
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
    API.get(`/orders/${id}`, true)
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
                    <div class="text-muted mt-1">SL: ${item.quantity} <span class="mx-1">x</span> ${UIHelper.formatPrice(Number(item.price))}</div>
                </div>
                <div class="fw-bold text-danger text-end" style="font-size: 15px;">
                    ${UIHelper.formatPrice(Number(item.price * item.quantity))}
                </div>
            </div>
            `;
        }).join('');

        document.getElementById("modal-total").innerText = UIHelper.formatPrice(Number(order.total_amount));

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
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng điền đủ Tên, SĐT và Địa chỉ nhận hàng!'); 
        return;
    }

    API.put(`/orders/${currentOrderId}/update-info`, data, true)
    .then(d => {
        const { isSuccess, message } = UIHelper.parseResponse(d);
        
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => location.reload());
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => console.error(err));
}

function cancelOrder() {
    UIHelper.showConfirm(
        'Hủy đơn hàng?',
        "Bạn chắc chắn muốn hủy đơn hàng này chứ? (Không thể hoàn tác!)",
        'Đồng ý hủy',
        'Không',
        () => {
            API.put(`/orders/${currentOrderId}/user-status`, { status: 'CANCELLED' }, true)
            .then(d => {
                const { isSuccess, message } = UIHelper.parseResponse(d);
                
                if (isSuccess) {
                    UIHelper.showSuccess('Đã hủy', message, () => location.reload());
                } else {
                    UIHelper.showError('Lỗi', message);
                }
            })
            .catch(err => console.error(err));
        }
    );
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
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng chọn lý do trả hàng!'); 
        return; 
    }

    const finalReason = detail ? `${main} (Chi tiết: ${detail})` : main;
    const btn = document.getElementById("btn-confirm-return");
    btn.disabled = true;

    API.put(`/orders/${currentOrderId}/request-return`, { reason: finalReason }, true)
    .then(d => {
        const { isSuccess, message } = UIHelper.parseResponse(d);
        
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => location.reload());
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => { 
        console.error(err); 
        btn.disabled = false; 
    });
}

function updateStatus(status) {
    UIHelper.showConfirm(
        'Xác nhận?',
        "Bạn đã nhận được hàng và xác nhận đơn hàng này?",
        'Đã nhận hàng',
        'Để sau',
        () => {
            API.put(`/orders/${currentOrderId}/user-status`, { status }, true)
            .then(d => {
                const { isSuccess, message } = UIHelper.parseResponse(d);
                
                if (isSuccess) {
                    UIHelper.showSuccess('Cảm ơn!', message, () => location.reload());
                } else {
                    UIHelper.showError('Lỗi', message);
                }
            })
            .catch(err => console.error(err));
        }
    );
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