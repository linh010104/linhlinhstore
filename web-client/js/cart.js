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

        cartTotalAmount = total; 
        renderSummary(); 
    })
    .catch(err => console.error(err));
}

function renderSummary() {
    const summaryEl = document.getElementById("cart-summary-area");
    if (!summaryEl) return;

    let discountHTML = "";
    let finalTotal = cartTotalAmount;

    if (appliedVoucher) {
        finalTotal = cartTotalAmount - appliedVoucher.discount_amount;
        if (finalTotal < 0) finalTotal = 0; 
        
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
            
            <!-- 🔥 SỬA NÚT NÀY: Gọi hàm bật Modal thay vì hỏi alert 🔥 -->
            <button onclick="processCheckout()" class="btn btn-danger w-100 py-3 fw-bold rounded-pill shadow-sm mb-3">
                THANH TOÁN NGAY <i class="fa-solid fa-arrow-right ms-2"></i>
            </button>
            <p class="text-center small text-muted mb-0">
                <i class="fa-solid fa-shield-check text-success"></i> Đảm bảo giao hàng nhanh chóng
            </p>
        </div>
    `;
}

function applyVoucher() {
    const code = document.getElementById('voucher-input').value.trim();
    if (!code) return UIHelper.showWarning("Thiếu thông tin", "Vui lòng nhập mã voucher trước khi áp dụng!");

    API.post('/vouchers/check', { code: code, order_total: cartTotalAmount })
    .then(res => {
        if (res.success || res.discount_amount) {
            // Chỉnh lại một chút để tương thích với object trả về của API voucher
            appliedVoucher = {
                code: code,
                discount_amount: Number(res.discount_amount)
            };
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

function removeVoucher() {
    appliedVoucher = null;
    renderSummary();
}

// 🔥 HÀM MỚI TỪ DETAIL BÊ SANG: TẢI SỔ ĐỊA CHỈ
function loadSavedAddresses() {
    API.get('/addresses/my', true)
        .then(response => {
            const addresses = Array.isArray(response) ? response : (response.data || []);
            const selectEl = document.getElementById('savedAddressSelect');
            const txtAddress = document.getElementById('checkout-address');
            
            selectEl.innerHTML = '<option value="custom">-- Nhập địa chỉ khác (Tự gõ) --</option>';

            if (addresses && addresses.length > 0) {
                let hasDefault = false;

                addresses.forEach(addr => {
                    const fullAddress = `${addr.address_detail}, ${addr.ward}, ${addr.district}, ${addr.province}`;
                    const option = document.createElement('option');
                    option.value = fullAddress;
                    option.textContent = fullAddress + (addr.is_default === 1 ? ' (Mặc định)' : '');
                    selectEl.appendChild(option);

                    if (addr.is_default === 1) {
                        selectEl.value = fullAddress;
                        txtAddress.value = fullAddress;
                        hasDefault = true;
                    }
                });

                if (!hasDefault && addresses.length > 0) {
                    selectEl.value = selectEl.options[1].value;
                    txtAddress.value = selectEl.options[1].value;
                }
            }
        })
        .catch(err => console.error("Lỗi tải địa chỉ:", err));
}

// 🔥 HÀM MỚI TỪ DETAIL BÊ SANG: BẮT SỰ KIỆN CHỌN ĐỊA CHỈ
window.handleAddressSelect = function() {
    const selectEl = document.getElementById('savedAddressSelect');
    const txtAddress = document.getElementById('checkout-address');

    if (selectEl.value === 'custom') {
        txtAddress.value = '';
        txtAddress.focus(); 
    } else {
        txtAddress.value = selectEl.value; 
    }
};

// 🔥 SỬA HÀM NÀY: MỞ MODAL THAY VÌ XÁC NHẬN LUÔN
function processCheckout() {
    if (cartTotalAmount <= 0) {
        UIHelper.showWarning("Giỏ hàng trống", "Vui lòng chọn mua sản phẩm trước khi thanh toán.");
        return;
    }

    const user = StorageHelper.getUser();
    
    // Điền sẵn thông tin user vào Modal
    if(document.getElementById("checkout-name")) document.getElementById("checkout-name").value = user?.full_name || user?.username || "";
    if(document.getElementById("checkout-phone")) document.getElementById("checkout-phone").value = user?.phone || "";
    if(document.getElementById("checkout-email")) document.getElementById("checkout-email").value = user?.email || "";
    
    // Đồng bộ Phương thức thanh toán từ Giao diện ngoài vào Modal
    const externalPayment = document.getElementById("cart-payment-method").value;
    document.getElementById("modal-payment-method").value = externalPayment;

    // Cập nhật giá trị hiển thị trên Modal
    document.getElementById("modal-subtotal").innerText = UIHelper.formatPrice(cartTotalAmount);
    
    let finalTotal = cartTotalAmount;
    if (appliedVoucher) {
        document.getElementById("modal-discount-row").classList.remove("d-none");
        document.getElementById("modal-discount-amount").innerText = `-${UIHelper.formatPrice(appliedVoucher.discount_amount)}`;
        finalTotal = cartTotalAmount - appliedVoucher.discount_amount;
        if (finalTotal < 0) finalTotal = 0;
    } else {
        document.getElementById("modal-discount-row").classList.add("d-none");
    }
    
    document.getElementById("modal-final-total").innerText = UIHelper.formatPrice(finalTotal);

    // Tải danh sách địa chỉ
    loadSavedAddresses();

    // Bật Modal
    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🔥 HÀM MỚI: GỬI DỮ LIỆU TỪ MODAL XUỐNG BACKEND (DÀNH CHO GIỎ HÀNG)
function submitCartCheckout() {
    const name = document.getElementById("checkout-name").value.trim();
    const phone = document.getElementById("checkout-phone").value.trim();
    const address = document.getElementById("checkout-address").value.trim();
    const payment = document.getElementById("modal-payment-method").value; 
    const note = document.getElementById("checkout-note").value.trim();

    if (!name || !phone || !address) {
        UIHelper.showWarning("Thiếu thông tin", "Vui lòng điền đầy đủ Tên, Số điện thoại và Địa chỉ nhận hàng!");
        return;
    }

    const checkoutData = {
        payment_method: payment, 
        name: name, 
        phone: phone,
        address: address,
        note: note,
        voucher_code: appliedVoucher ? appliedVoucher.code : null,
        discount_amount: appliedVoucher ? appliedVoucher.discount_amount : 0
    };

    const btnSubmit = document.querySelector("#checkoutModal .btn-danger");
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    btnSubmit.disabled = true;

    API.post('/orders/checkout', checkoutData, true)
    .then(data => {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (data.success || data.isSuccess || data.paymentUrl) {
            // Tắt modal
            const modalEl = document.getElementById('checkoutModal');
            bootstrap.Modal.getInstance(modalEl).hide();

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
                UIHelper.showSuccess('Thành công', 'Đã đặt hàng thành công!', () => {
                    window.location.href = "orders.html";
                });
            }
        } else {
            UIHelper.showError('Lỗi', data.message || 'Có lỗi xảy ra khi tạo đơn hàng');
        }
    })
    .catch(err => {
        console.error("Lỗi đặt hàng:", err);
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
        UIHelper.showError('Lỗi', 'Hệ thống đang bận, vui lòng thử lại.');
    });
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