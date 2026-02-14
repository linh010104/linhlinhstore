/* File: js/orders.js */

let currentOrderId = null;
let currentStatus = "";

// 1. TỰ ĐỘNG CHẠY KHI TRANG LOAD XONG
document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    
    // Nếu chưa đăng nhập thì đá về trang login
    if (!token) {
        alert("Vui lòng đăng nhập để xem đơn hàng!");
        window.location.href = "login.html";
        return;
    }

    // Gọi API lấy danh sách đơn hàng
    fetch("http://localhost:3000/api/orders/mine", {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("order-history-list");
        tbody.innerHTML = "";

        // Nếu không có đơn hàng nào
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-muted">Bạn chưa có đơn hàng nào.</td></tr>`;
            return;
        }

        // Duyệt qua từng đơn hàng để vẽ bảng
        data.forEach(order => {
            let badge = getStatusBadge(order.status);
            const date = new Date(order.created_at).toLocaleString('vi-VN');

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="ps-4 fw-bold">#${order.id}</td>
                <td>${date}</td>
                <td class="text-danger fw-bold">${Number(order.total_amount).toLocaleString()} đ</td>
                <td>${badge}</td>
                <td class="text-end pe-4">
                    <button onclick="viewDetail(${order.id})" class="btn btn-outline-primary btn-sm rounded-pill px-3">
                        Xem chi tiết
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    })
    .catch(err => console.error("Lỗi tải đơn hàng:", err));
});

// 2. HÀM XEM CHI TIẾT (Gắn vào nút "Xem chi tiết")
function viewDetail(id) {
    currentOrderId = id;
    const token = localStorage.getItem("token");

    // Gọi API lấy chi tiết đơn hàng
    fetch(`http://localhost:3000/api/orders/${id}`, {
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(order => {
        currentStatus = order.status;
        document.getElementById("modal-order-id").innerText = order.id;
        
        // Điền thông tin vào form
        document.getElementById("modal-name").value = order.receiver_name || "";
        document.getElementById("modal-phone").value = order.phone || "";
        document.getElementById("modal-address").value = order.address || "";
        document.getElementById("modal-note").value = order.note || "";

        // Logic Khóa/Mở form (Chỉ cho sửa khi đơn là NEW)
        const isNew = (order.status === 'NEW');
        
        // Disable các ô input nếu không phải đơn mới
        document.getElementById("modal-name").disabled = !isNew;
        document.getElementById("modal-phone").disabled = !isNew;
        document.getElementById("modal-address").disabled = !isNew;
        document.getElementById("modal-note").disabled = !isNew;
        
        // Ẩn/Hiện nút Lưu và Thông báo khóa
        const btnSave = document.getElementById("btn-save-info");
        const msgLocked = document.getElementById("msg-locked");
        
        if (isNew) {
            btnSave.classList.remove("d-none");   // Hiện nút lưu
            msgLocked.classList.add("d-none");    // Ẩn thông báo khóa
        } else {
            btnSave.classList.add("d-none");      // Ẩn nút lưu
            msgLocked.classList.remove("d-none"); // Hiện thông báo khóa
        }

        // Điền danh sách sản phẩm bên phải
        const list = document.getElementById("modal-items-list");
        list.innerHTML = "";
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const imgUrl = item.image_url ? `http://localhost:3000${item.image_url}` : "https://via.placeholder.com/50";
                
                list.innerHTML += `
                    <div class="list-group-item d-flex align-items-center gap-3">
                        <img src="${imgUrl}" style="width: 50px; height: 50px; object-fit: cover;" class="rounded border">
                        <div class="flex-grow-1">
                            <div class="fw-bold small text-truncate" style="max-width: 200px;">${item.name}</div>
                            <div class="text-muted small">SL: ${item.quantity} x ${Number(item.price).toLocaleString()}</div>
                        </div>
                        <div class="fw-bold text-end">${Number(item.price * item.quantity).toLocaleString()}</div>
                    </div>
                `;
            });
        } else {
            list.innerHTML = `<div class="p-3 text-center text-muted">Không có sản phẩm nào</div>`;
        }
        
        document.getElementById("modal-total").innerText = Number(order.total_amount).toLocaleString() + " đ";

        // Xử lý nút hành động ở Footer (Hủy / Đã nhận hàng)
        const footer = document.getElementById("modal-footer-actions");
        footer.innerHTML = `<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>`;
        
        if (order.status === 'NEW') {
            footer.innerHTML += `<button onclick="updateStatus('CANCELLED')" class="btn btn-danger ms-2">Hủy đơn hàng</button>`;
        } else if (order.status === 'SHIPPING') {
            footer.innerHTML += `<button onclick="updateStatus('DONE')" class="btn btn-success ms-2">Đã nhận được hàng</button>`;
        }

        // Hiện Modal lên
        const modalEl = document.getElementById('orderDetailModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    })
    .catch(err => console.error("Lỗi xem chi tiết:", err));
}

// 3. HÀM LƯU THÔNG TIN (Khi bấm nút Lưu thay đổi)
function saveOrderInfo() {
    if (!confirm("Bạn có chắc muốn lưu thay đổi thông tin nhận hàng?")) return;
    
    const body = {
        name: document.getElementById("modal-name").value,
        phone: document.getElementById("modal-phone").value,
        address: document.getElementById("modal-address").value,
        note: document.getElementById("modal-note").value
    };

    const token = localStorage.getItem("token");
    
    fetch(`http://localhost:3000/api/orders/${currentOrderId}/info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(body)
    })
    .then(res => res.json())
    .then(d => { 
        alert(d.message); 
        location.reload(); // Tải lại trang để cập nhật
    })
    .catch(err => console.error(err));
}

// 4. HÀM CẬP NHẬT TRẠNG THÁI (Hủy hoặc Đã nhận)
function updateStatus(status) {
    let msg = (status === 'CANCELLED') ? "Bạn chắc chắn muốn hủy đơn này?" : "Xác nhận bạn đã nhận được hàng và hài lòng?";
    if (!confirm(msg)) return;

    const token = localStorage.getItem("token");
    
    fetch(`http://localhost:3000/api/orders/${currentOrderId}/user-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({ status })
    })
    .then(res => res.json())
    .then(d => { 
        alert(d.message); 
        location.reload(); 
    })
    .catch(err => console.error(err));
}

// 5. HÀM HELPER: Lấy màu sắc cho trạng thái
function getStatusBadge(status) {
    switch(status) {
        case 'NEW': return '<span class="badge bg-warning text-dark">Chờ duyệt</span>';
        case 'CONFIRMED': return '<span class="badge bg-info">Đã duyệt</span>';
        case 'SHIPPING': return '<span class="badge bg-primary">Đang giao</span>';
        case 'DONE': return '<span class="badge bg-success">Hoàn thành</span>';
        case 'CANCELLED': return '<span class="badge bg-danger">Đã hủy</span>';
        default: return '<span class="badge bg-secondary">'+status+'</span>';
    }
}