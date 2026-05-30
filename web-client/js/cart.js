let cartTotalAmount = 0;
let appliedVoucher = null;

function loadCart() {
    if (!StorageHelper.isLoggedIn()) {
        if (window.location.pathname.includes('cart.html')) {
            UIHelper.showWarning(
                'Chưa đăng nhập!',
                "Vui lòng đăng nhập để xem giỏ hàng.",
                () => { window.location.href = "login.html"; }
            );
        }
        return; 
    }

    API.get('/cart', true)
    .then(data => {
        const tbody = document.getElementById("cart-body");
        const summaryArea = document.getElementById("cart-summary-area");
        
        if (tbody) tbody.innerHTML = "";
        let total = 0;

        if (!data || data.length === 0) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr><td colspan="4" class="text-center py-5">
                        <div class="text-muted">
                            <i class="fa-solid fa-cart-flatbed fs-1 mb-3 opacity-25"></i>
                            <p class="mb-0">Giỏ hàng của bạn đang trống.</p>
                        </div>
                    </td></tr>`;
            }
            if (summaryArea) summaryArea.innerHTML = "";
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
                    ${UIHelper.formatPrice(itemPrice)}
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
            if (tbody) tbody.appendChild(tr);
        });

        cartTotalAmount = total; // Lưu lại để tính giảm giá
        renderSummary(); // Không cần truyền total nữa vì đã dùng biến toàn cục
    })
    .catch(err => console.error(err));
}

// Hàm vẽ lại Cục tính tiền bên tay phải
function renderSummary() {
    const summaryEl = document.getElementById("cart-summary-area");
    if (!summaryEl) return;

    let discountHTML = "";
    let finalTotal = cartTotalAmount;

    // Nếu có mã đang áp dụng, tính toán lại tiền và hiển thị dòng Giảm Giá
    if (appliedVoucher) {
        finalTotal = cartTotalAmount - appliedVoucher.discount_amount;
        if (finalTotal < 0) finalTotal = 0; // Đảm bảo không bị âm tiền
        
        discountHTML = `
            <div class="d-flex justify-content-between mb-2 text-danger">
                <span>Mã giảm giá (${appliedVoucher.code}):</span>
                <span class="fw-bold">- ${UIHelper.formatPrice(appliedVoucher.discount_amount)}</span>
            </div>
        `;
    }

    summaryEl.innerHTML = `
        <div class="card border-0 shadow-sm rounded-4 p-4 sticky-summary bg-white">
            <h5 class="fw-bold mb-4">Hóa đơn của bạn</h5>
            
            <div class="coupon-box p-3 rounded-3 mb-4">
                <label class="small fw-bold text-danger mb-2 d-block"><i class="fa-solid fa-ticket me-1"></i> Mã giảm giá / Voucher</label>
                <div class="input-group input-group-sm">
                    <input type="text" id="voucher-input" class="form-control border-0" placeholder="Nhập mã ưu đãi..." value="${appliedVoucher ? appliedVoucher.code : ''}" ${appliedVoucher ? 'disabled' : ''}>
                    ${appliedVoucher 
                        ? `<button class="btn btn-secondary px-3 fw-bold" onclick="removeVoucher()">Hủy mã</button>`
                        : `<button class="btn btn-danger px-3 fw-bold" onclick="applyVoucher()">Áp dụng</button>`
                    }
                </div>
            </div>

            <div class="d-flex justify-content-between mb-2 text-muted">
                <span>Tạm tính:</span>
                <span class="fw-bold text-dark">${UIHelper.formatPrice(cartTotalAmount)}</span>
            </div>
            
            ${discountHTML}
            
            <div class="d-flex justify-content-between mb-3 text-muted">
                <span>Giao hàng:</span>
                <span class="text-success fw-bold">Miễn phí</span>
            </div>
            <hr class="my-3">
            <div class="d-flex justify-content-between mb-4 align-items-center">
                <span class="fw-bold">Tổng thanh toán:</span>
                <span class="fw-bold fs-4 text-danger">${UIHelper.formatPrice(finalTotal)}</span>
            </div>
            
            <div class="mb-4">
                <label class="small fw-bold mb-2">Phương thức thanh toán:</label>
                <select class="form-select border-danger bg-light" id="cart-payment-method">
                    <option value="VNPAY">Thanh toán qua cổng VNPay (Khuyên dùng)</option>
                    <option value="CASH">Thanh toán khi nhận hàng (COD)</option>
                </select>
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

// 🔥 Hàm API kiểm tra và áp dụng mã Voucher 🔥
function applyVoucher() {
    const code = document.getElementById('voucher-input').value.trim();
    if (!code) return UIHelper.showWarning("Thiếu thông tin", "Vui lòng nhập mã voucher trước khi áp dụng!");

    // Chọc API xuống DB để kiểm tra mã
    API.post('/vouchers/check', { code: code })
    .then(res => {
        if (res.success) {
            const voucherData = res.data;
            
            // So sánh xem giỏ hàng đã đủ đơn tối thiểu chưa
            if (cartTotalAmount < voucherData.min_order_value) {
                UIHelper.showError("Chưa đủ điều kiện", `Đơn hàng tối thiểu để dùng mã này là ${UIHelper.formatPrice(voucherData.min_order_value)}.`);
                return;
            }

            // Mọi thứ hoàn hảo -> Lưu mã và render lại
            appliedVoucher = voucherData;
            UIHelper.showSuccess("Thành công", "Áp dụng mã giảm giá thành công!");
            renderSummary();
        } else {
            UIHelper.showError("Lỗi", res.message || "Mã không hợp lệ!");
        }
    })
    .catch(err => {
        console.error(err);
        UIHelper.showError("Không hợp lệ", "Mã voucher này không tồn tại hoặc đã được sử dụng!");
    });
}

// 🔥 Hàm hủy bỏ mã Voucher 🔥
function removeVoucher() {
    appliedVoucher = null;
    renderSummary();
}

function processCheckout() {
    const selectedPayment = document.getElementById("cart-payment-method") ? document.getElementById("cart-payment-method").value : "VNPAY";
    const confirmMsg = selectedPayment === "VNPAY" ? "Bạn sẽ được chuyển hướng sang cổng thanh toán VNPay." : "Đơn hàng sẽ được giao đến bạn và thanh toán bằng tiền mặt.";

    UIHelper.showConfirm(
        'Xác nhận đặt hàng?',
        confirmMsg,
        'Thanh toán ngay',
        'Kiểm tra lại',
        () => {
            const user = StorageHelper.getUser();
            const checkoutData = {
                payment_method: selectedPayment, 
                name: user?.full_name || "Khách hàng", 
                phone: user?.phone || "0123456789",
                address: user?.address || "Hà Nội",
                note: "Đơn hàng từ giỏ",
                voucher_code: appliedVoucher ? appliedVoucher.code : null, // Kẹp thêm mã Voucher gửi xuống cho Backend
                discount_amount: appliedVoucher ? appliedVoucher.discount_amount : 0
            };

            API.post('/orders/checkout', checkoutData, true)
            .then(data => {
                if (data.success || data.isSuccess) {
                    if (data.paymentUrl) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Đang chuyển hướng...',
                            text: 'Hệ thống đang đưa bạn đến cổng thanh toán VNPay!',
                            showConfirmButton: false,
                            timer: 2000
                        }).then(() => {
                            window.location.href = data.paymentUrl;
                        });
                    } else {
                        UIHelper.showSuccess('Đặt hàng thành công!', 'Cảm ơn ông đã tin tưởng LinhLinh Store.', () => {
                            window.location.href = "orders.html";
                        });
                    }
                } else {
                    UIHelper.showError('Lỗi', data.message || 'Có lỗi xảy ra khi tạo đơn hàng');
                }
            })
            .catch(err => {
                console.error("Lỗi đặt hàng:", err);
                UIHelper.showError('Lỗi', 'Hệ thống đang bận hoặc giỏ hàng trống');
            });
        }
    );
}

function removeItem(cartId) {
    UIHelper.showConfirm(
        'Xóa sản phẩm?',
        "Sản phẩm sẽ bị loại bỏ khỏi giỏ hàng.",
        'Xóa đi',
        'Giữ lại',
        () => {
            API.delete(`/cart/${cartId}`, true)
            .then(() => {
                if(window.updateCartCount) window.updateCartCount();
                loadCart(); 
            })
            .catch(err => console.error(err));
        }
    );
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("cart-body")) {
        loadCart();
    }
});