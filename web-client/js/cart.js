// Đổi tên biến thành userToken để không đụng hàng với file auth.js
const userToken = localStorage.getItem("token");

if (!userToken) {
    Swal.fire({
        title: 'Chưa đăng nhập!',
        text: "Vui lòng đăng nhập để xem giỏ hàng.",
        icon: 'warning',
        confirmButtonText: 'Đăng nhập ngay'
    }).then(() => {
        window.location.href = "login.html";
    });
}

function loadCart() {
    fetch(`${CONFIG.BASE_URL}/cart`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + userToken }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("cart-body");
        const summaryArea = document.getElementById("cart-summary-area");
        
        tbody.innerHTML = "";
        let total = 0;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="4" class="text-center py-5">
                    <div class="text-muted">
                        <i class="fa-solid fa-cart-flatbed fs-1 mb-3 opacity-25"></i>
                        <p class="mb-0">Giỏ hàng của bạn đang trống.</p>
                    </div>
                </td></tr>`;
            summaryArea.innerHTML = "";
            return;
        }

        data.forEach(item => {
            let itemPrice = Number(item.price);
            total += itemPrice * item.quantity;

            const variantDisplay = item.variant_info 
                ? `<div class="mt-1 small text-muted fst-italic">Phân loại: <span class="fw-bold text-dark">${item.variant_info}</span></div>` 
                : "";

            const fallbackImg = "https://placehold.co/100x100/f8f9fa/a3a3a3?text=LinhLinh";
            const imgUrl = item.image_url ? `${CONFIG.IMAGE_BASE_URL}${item.image_url}` : fallbackImg;

            const tr = document.createElement("tr");
            tr.id = `cart-item-${item.cart_id}`;
            tr.innerHTML = `
                <td class="ps-4">
                    <div class="d-flex align-items-center gap-3">
                        <img src="${imgUrl}" onerror="this.src='${fallbackImg}'" class="cart-item-img border rounded shadow-sm">
                        <div>
                            <a href="detail.html?id=${item.product_id}" class="fw-bold text-dark text-decoration-none hover-red" style="font-size: 15px;">${item.name}</a>
                            ${variantDisplay}
                        </div>
                    </div>
                </td>
                <td class="fw-bold text-danger">
                    ${itemPrice.toLocaleString('vi-VN')} đ
                </td>
                <td class="text-center">
                    <span class="badge bg-light text-dark border px-3 py-2 fs-6 rounded-pill">${item.quantity}</span>
                </td>
                <td class="text-end pe-4">
                    <button onclick="removeItem(${item.cart_id})" class="btn btn-sm btn-outline-danger border-0 rounded-circle" style="width: 35px; height: 35px;">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderSummary(total);
    })
    .catch(err => console.error(err));
}

function renderSummary(total) {
    const summaryEl = document.getElementById("cart-summary-area");
    if (!summaryEl) return;

    summaryEl.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 p-4 sticky-summary bg-white">
            <h5 class="fw-bold mb-4">Hóa đơn của bạn</h5>
            
            <div class="coupon-box p-3 rounded-3 mb-4">
                <label class="small fw-bold text-danger mb-2 d-block"><i class="fa-solid fa-ticket me-1"></i> Mã giảm giá / Voucher</label>
                <div class="input-group input-group-sm">
                    <input type="text" class="form-control border-0" placeholder="Nhập mã ưu đãi...">
                    <button class="btn btn-danger px-3 fw-bold" onclick="Swal.fire('Mã không hợp lệ', 'Voucher này đã hết hạn hoặc không tồn tại!', 'error')">Áp dụng</button>
                </div>
            </div>

            <div class="d-flex justify-content-between mb-2 text-muted">
                <span>Tạm tính:</span>
                <span class="fw-bold text-dark">${total.toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="d-flex justify-content-between mb-3 text-muted">
                <span>Giao hàng:</span>
                <span class="text-success fw-bold">Miễn phí</span>
            </div>
            <hr class="my-3">
            <div class="d-flex justify-content-between mb-4 align-items-center">
                <span class="fw-bold">Tổng thanh toán:</span>
                <span class="fw-bold fs-4 text-danger">${total.toLocaleString('vi-VN')} đ</span>
            </div>
            
            <button onclick="processCheckout()" class="btn btn-danger w-100 py-3 fw-bold rounded-pill shadow-sm mb-3">
                THANH TOÁN NGAY <i class="fa-solid fa-arrow-right ms-2"></i>
            </button>
            <p class="text-center small text-muted mb-0">
                <i class="fa-solid fa-shield-check text-success"></i> Đảm bảo giao hàng nhanh chóng
            </p>
        </div>
    `;
}

function processCheckout() {
    Swal.fire({
        title: 'Xác nhận đặt hàng?',
        text: "Bạn đang đặt mua các sản phẩm trong giỏ hàng.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Xác nhận đặt',
        cancelButtonText: 'Kiểm tra lại'
    }).then((result) => {
        if (result.isConfirmed) {
            const user = JSON.parse(localStorage.getItem("user") || '{}');
            const checkoutData = {
                payment_method: "COD",
                name: user.full_name || "Khách hàng", 
                phone: user.phone || "0123456789",
                address: user.address || "Hà Nội",
                note: "Đơn hàng từ giỏ"
            };

            fetch(`${CONFIG.BASE_URL}/orders/checkout`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + userToken },
                body: JSON.stringify(checkoutData)
            })
            .then(res => res.json())
            .then(data => {
                if(data.orderId) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Đặt hàng thành công!',
                        text: 'Cảm ơn ông đã tin tưởng LinhLinh Store.',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = "orders.html";
                    });
                } else {
                    Swal.fire('Lỗi', data.message || "Không thể đặt hàng", 'error');
                }
            })
            .catch(err => console.error(err));
        }
    });
}

function removeItem(cartId) {
    Swal.fire({
        title: 'Xóa sản phẩm?',
        text: "Sản phẩm sẽ bị loại bỏ khỏi giỏ hàng.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Xóa đi',
        cancelButtonText: 'Giữ lại'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`${CONFIG.BASE_URL}/cart/${cartId}`, {
                method: "DELETE",
                headers: { "Authorization": "Bearer " + userToken }
            })
            .then(res => res.json())
            .then(() => {
                if(window.updateCartCount) window.updateCartCount();
                loadCart(); 
            })
            .catch(err => console.error(err));
        }
    });
}

document.addEventListener("DOMContentLoaded", loadCart);