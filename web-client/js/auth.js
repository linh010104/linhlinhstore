function login() {
    const usernameVal = document.getElementById("username").value;
    const passwordVal = document.getElementById("password").value;

    if (!usernameVal || !passwordVal) {
        Swal.fire('Thiếu thông tin', 'Vui lòng nhập tài khoản và mật khẩu', 'warning');
        return;
    }
    fetch(`${CONFIG.BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: usernameVal,
            password: passwordVal,
            clientType: "WEB" 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            
            Swal.fire({
                icon: 'success',
                title: 'Thành công',
                text: 'Đăng nhập thành công',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "index.html";
            });
        } else {
            Swal.fire('Đăng nhập thất bại', data.message || "Sai tài khoản hoặc mật khẩu", 'error');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Lỗi', 'Lỗi kết nối server', 'error');
    });
}

function register() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("full_name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    if (!username || !password || !fullName) {
        Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ các trường bắt buộc!', 'warning');
        return;
    }

    fetch(`${CONFIG.BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            password: password,
            full_name: fullName,
            email: email, 
            phone: phone 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.message && (data.message.includes("thành công") || data.message.includes("success"))) {
            Swal.fire('Thành công', 'Đăng ký thành công! Hãy đăng nhập.', 'success').then(() => {
                window.location.href = "login.html";
            });
        } else if (data.error) {
            Swal.fire('Lỗi', data.error, 'error');
        } else {
            Swal.fire('Thành công', 'Đăng ký thành công!', 'success').then(() => {
                window.location.href = "login.html";
            });
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi kết nối server.', 'error');
    });
}

function logout() {
    Swal.fire({
        title: 'Đăng xuất?',
        text: "Bạn có chắc muốn đăng xuất khỏi hệ thống?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Đăng xuất',
        cancelButtonText: 'Hủy'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = "index.html";
        }
    });
}

// ============================================================
// 2. XỬ LÝ GIAO DIỆN (HEADER, MENU USER)
// ============================================================

const authArea = document.getElementById("authArea");
const token = localStorage.getItem("token");

if (authArea) {
    if (token) {
        const user = JSON.parse(localStorage.getItem("user") || '{}');
        const username = user.username || "Khách";

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
// 3. QUẢN LÝ GIỎ HÀNG & THANH TOÁN
// ============================================================

function updateCartCount() {
    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${CONFIG.BASE_URL}/cart`, {
        method: "GET",
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
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
    const token = localStorage.getItem("token");
    if (!token) {
        Swal.fire({
            title: 'Chưa đăng nhập!',
            text: "Cần đăng nhập để mua hàng. Đăng nhập ngay?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Đăng nhập',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "login.html";
            }
        });
        return;
    }

    if (productId) {
        const hiddenInput = document.getElementById("direct-buy-product-id");
        if(hiddenInput) hiddenInput.value = productId;
    }

    const user = JSON.parse(localStorage.getItem("user") || '{}');
    const inputName = document.getElementById("order-name");
    const inputPhone = document.getElementById("order-phone");
    const inputEmail = document.getElementById("order-email"); 

    if(inputName) inputName.value = user.full_name || "";
    if(inputPhone) inputPhone.value = user.phone || "";
    if(inputEmail) inputEmail.value = user.email || "";

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
        Swal.fire('Thiếu thông tin', 'Vui lòng điền đủ tên, số điện thoại và địa chỉ nhận hàng!', 'warning');
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
        apiUrl = `${CONFIG.BASE_URL}/orders/direct`;
        bodyData.productId = directProductId;
        bodyData.quantity = 1; 
    } else {
        apiUrl = `${CONFIG.BASE_URL}/orders`;
    }
    
    const token = localStorage.getItem("token");
    fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(bodyData)
    })
    .then(res => res.json())
    .then(data => {
        if(data.message && (data.message.includes("thành công") || data.message.includes("success"))) {
            Swal.fire('Thành công', data.message, 'success').then(() => {
                location.reload(); 
            });
        } else {
            Swal.fire('Lỗi', data.message || 'Lỗi đặt hàng', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        Swal.fire('Lỗi', 'Lỗi hệ thống khi đặt hàng', 'error');
    });
}

function updatePassword() {
    const oldPass = document.getElementById("old-password").value;
    const newPass = document.getElementById("new-password").value;
    const confirmPass = document.getElementById("confirm-password").value;

    if (!oldPass || !newPass || !confirmPass) {
        Swal.fire('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin!', 'warning');
        return;
    }
    if (newPass !== confirmPass) {
        Swal.fire('Lỗi', 'Mật khẩu mới không khớp!', 'error');
        return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
        Swal.fire('Chưa đăng nhập', 'Bạn chưa đăng nhập!', 'warning').then(() => {
            window.location.href = "login.html";
        });
        return;
    }

    fetch(`${CONFIG.BASE_URL}/auth/change-password`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ 
            oldPassword: oldPass, 
            newPassword: newPass 
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success || data.message.includes("thành công")) {
            Swal.fire('Thành công', data.message, 'success').then(() => {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "login.html"; 
            });
        } else {
            Swal.fire('Lỗi', data.message, 'error');
        }
    })
    .catch(err => {
        console.error("Lỗi đổi mật khẩu:", err);
        Swal.fire('Lỗi', 'Lỗi kết nối tới Server!', 'error');
    });
}