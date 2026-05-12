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
        const username = user?.username || "Khách";

        authArea.innerHTML = `
            <div class="dropdown">
                <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
                    <i class="fa-solid fa-user-circle fa-lg"></i>
                    <span>${username}</span>
                </button>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="profile.html"><i class="fa-solid fa-id-card me-2"></i> Hồ sơ cá nhân</a></li>
                    <li><a class="dropdown-item" href="orders.html"><i class="fa-solid fa-box-open me-2"></i> Đơn mua</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()"><i class="fa-solid fa-right-from-bracket me-2"></i> Đăng xuất</a></li>
                </ul>
            </div>
            
            <a href="cart.html" class="btn btn-warning position-relative rounded-circle ms-2">
                <i class="fa-solid fa-cart-shopping"></i>
                <span id="cart-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display: none;">
                    0
                </span>
            </a>
        `;
        updateCartCount();
    } else {
        authArea.innerHTML = `
            <a href="login.html" class="btn btn-light btn-sm fw-bold">Đăng nhập</a>
            <a href="register.html" class="btn btn-outline-light btn-sm">Đăng ký</a>
        `;
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