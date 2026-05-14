function login() {
    const usernameVal = document.getElementById("username").value;
    const passwordVal = document.getElementById("password").value;

    if (!usernameVal || !passwordVal) {
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng nhập tài khoản và mật khẩu');
        return;
    }

    API.post('/auth/login', {
        username: usernameVal,
        password: passwordVal,
        clientType: "WEB" 
    })
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        
        if (isSuccess && data.token) {
            StorageHelper.setToken(data.token);
            StorageHelper.setUser(data.user);
            
            UIHelper.showSuccess('Đăng nhập thành công', 'Chào mừng bạn!', () => {
                window.location.href = "index.html";
            });
        } else {
            UIHelper.showError('Đăng nhập thất bại', message || "Sai tài khoản hoặc mật khẩu");
        }
    })
    .catch(err => {
        console.error(err);
        UIHelper.showError('Lỗi', 'Lỗi kết nối server');
    });
}

function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("full_name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    if (!username || !password || !fullName) {
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc!');
        return;
    }

    API.post('/auth/register', {
        username: username,
        password: password,
        full_name: fullName,
        email: email, 
        phone: phone 
    })
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        
        if (isSuccess) {
            UIHelper.showSuccess('Đăng ký thành công', 'Hãy đăng nhập.', () => {
                window.location.href = "login.html";
            });
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => {
        console.error(err);
        UIHelper.showError('Lỗi', 'Có lỗi xảy ra khi kết nối server.');
    });
}

function logout() {
    UIHelper.showConfirm(
        'Đăng xuất?',
        "Bạn có chắc muốn đăng xuất khỏi hệ thống?",
        'Đăng xuất',
        'Hủy',
        () => {
            StorageHelper.clearAuth();
            window.location.href = "index.html";
        }
    );
}

const authArea = document.getElementById("authArea");

if (authArea) {
    if (StorageHelper.isLoggedIn()) {
        const user = StorageHelper.getUser();
        const username = user?.username || user?.full_name || "Khách";

        // GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP (Giữ nguyên style CellphoneS)
        authArea.innerHTML = `
            <div class="d-flex align-items-center gap-2 cursor-pointer header-item btn-header-custom" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                <i class="fa-solid fa-phone-volume fs-4 text-white"></i>
                <div class="lh-1 small d-none d-lg-block text-white">
                    <div style="font-size: 0.7rem; opacity: 0.9;">Gọi mua hàng</div>
                    <div class="fw-bold mt-1">1800.6969</div>
                </div>
            </div>

            <a href="cart.html" class="d-flex align-items-center gap-2 cursor-pointer header-item text-white text-decoration-none position-relative btn-header-custom" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                <i class="fa-solid fa-bag-shopping fs-4"></i>
                <div class="lh-1 small d-none d-lg-block">
                    <div style="font-size: 0.7rem; opacity: 0.9;">Giỏ hàng</div>
                    <div class="fw-bold mt-1">Của bạn</div>
                </div>
                <span id="cart-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark border border-white" style="margin-top: 5px; margin-left: -15px; display: none;">0</span>
            </a>

            <div class="dropdown">
                <a href="#" class="d-flex align-items-center gap-2 cursor-pointer header-item text-white text-decoration-none btn-header-custom" data-bs-toggle="dropdown" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                    <i class="fa-solid fa-user-check fs-4 text-warning"></i>
                    <div class="lh-1 small d-none d-lg-block">
                        <div style="font-size: 0.7rem; opacity: 0.9;">Xin chào,</div>
                        <div class="fw-bold mt-1 text-truncate" style="max-width: 90px;">${username}</div>
                    </div>
                </a>
                <ul class="dropdown-menu dropdown-menu-end shadow border-0" style="border-radius: 12px; margin-top: 10px;">
                    <li><a class="dropdown-item py-2" href="profile.html"><i class="fa-solid fa-id-card me-2 text-primary"></i> Hồ sơ cá nhân</a></li>
                    <li><a class="dropdown-item py-2" href="orders.html"><i class="fa-solid fa-box-open me-2 text-success"></i> Đơn mua</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item py-2 text-danger" href="#" onclick="logout()"><i class="fa-solid fa-right-from-bracket me-2"></i> Đăng xuất</a></li>
                </ul>
            </div>
        `;
        updateCartCount();
    } else {
        // GIAO DIỆN KHI CHƯA ĐĂNG NHẬP
        authArea.innerHTML = `
            <div class="d-flex align-items-center gap-2 cursor-pointer header-item btn-header-custom" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                <i class="fa-solid fa-phone-volume fs-4 text-white"></i>
                <div class="lh-1 small d-none d-lg-block text-white">
                    <div style="font-size: 0.7rem; opacity: 0.9;">Gọi mua hàng</div>
                    <div class="fw-bold mt-1">1800.6969</div>
                </div>
            </div>

            <a href="cart.html" class="d-flex align-items-center gap-2 cursor-pointer header-item text-white text-decoration-none position-relative btn-header-custom" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                <i class="fa-solid fa-bag-shopping fs-4"></i>
                <div class="lh-1 small d-none d-lg-block">
                    <div style="font-size: 0.7rem; opacity: 0.9;">Giỏ hàng</div>
                    <div class="fw-bold mt-1">Của bạn</div>
                </div>
                <span id="cart-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark border border-white" style="margin-top: 5px; margin-left: -15px; display: none;">0</span>
            </a>

            <a href="login.html" class="d-flex align-items-center gap-2 cursor-pointer header-item text-white text-decoration-none btn-header-custom" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                <i class="fa-regular fa-circle-user fs-4"></i>
                <div class="lh-1 small d-none d-lg-block">
                    <div style="font-size: 0.7rem; opacity: 0.9;">Đăng nhập</div>
                    <div class="fw-bold mt-1">Tài khoản</div>
                </div>
            </a>
        `;
        updateCartCount();
    }
}

// ============================================================
// QUẢN LÝ GIỎ HÀNG & THANH TOÁN
// ============================================================

function updateCartCount() {
    if (!StorageHelper.isLoggedIn()) return;

    API.get('/cart', true)
    .then(data => {
        let totalQty = 0;
        if (Array.isArray(data)) {
            data.forEach(item => {
                totalQty += item.quantity; 
            });
        }

        const badge = document.getElementById("cart-badge");
        if (badge) {
            badge.innerText = totalQty;
            badge.style.display = totalQty > 0 ? "inline-block" : "none";
        }
    })
    .catch(err => console.error("Lỗi đếm giỏ hàng:", err));
}

function buyNow(productId) {
    if (!UIHelper.ensureLogin()) return;

    if (productId) {
        const hiddenInput = document.getElementById("direct-buy-product-id");
        if(hiddenInput) hiddenInput.value = productId;
    }

    const user = StorageHelper.getUser();
    const inputName = document.getElementById("order-name");
    const inputPhone = document.getElementById("order-phone");
    const inputEmail = document.getElementById("order-email"); 

    if(inputName) inputName.value = user?.full_name || "";
    if(inputPhone) inputPhone.value = user?.phone || "";
    if(inputEmail) inputEmail.value = user?.email || "";

    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        console.error("Không tìm thấy Modal checkoutModal trong HTML");
    }
}

function processOrder() {
    const name = document.getElementById("order-name").value.trim();
    const phone = document.getElementById("order-phone").value.trim();
    const address = document.getElementById("order-address").value.trim();
    
    if (!name || !phone || !address) {
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng điền đủ tên, số điện thoại và địa chỉ nhận hàng!');
        return;
    }

    const directProductIdInput = document.getElementById("direct-buy-product-id");
    const directProductId = directProductIdInput ? directProductIdInput.value : null;

    let apiUrl = "";
    let bodyData = {
        name: name, 
        phone: phone, 
        address: address,
        payment_method: document.getElementById("payment-method").value,
        note: document.getElementById("order-note").value
    };

    if (directProductId) {
        apiUrl = `/orders/direct`;
        bodyData.productId = directProductId;
        bodyData.quantity = 1; 
    } else {
        apiUrl = `/orders`;
    }
    
    API.post(apiUrl, bodyData, true)
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => {
                location.reload(); 
            });
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => {
        console.error(err);
        UIHelper.showError('Lỗi', 'Lỗi hệ thống khi đặt hàng');
    });
}

function updatePassword() {
    const oldPass = document.getElementById("old-password").value;
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-password").value;

    if (!oldPass || !newPass || !confirmPass) {
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin!');
        return;
    }
    if (newPass !== confirmPass) {
        UIHelper.showError('Lỗi', 'Mật khẩu mới không khớp!');
        return;
    }

    if (!UIHelper.ensureLogin()) return;

    API.put('/auth/change-password', { 
        oldPassword: oldPass, 
        newPassword: newPass 
    }, true)
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => {
                StorageHelper.clearAuth();
                window.location.href = "login.html"; 
            });
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => {
        console.error("Lỗi đổi mật khẩu:", err);
        UIHelper.showError('Lỗi', 'Lỗi kết nối tới Server!');
    });
}