/* File: js/auth.js */

// ============================================================
// 1. CÁC HÀM XÁC THỰC (ĐĂNG NHẬP, ĐĂNG KÝ, ĐĂNG XUẤT)
// ============================================================

function login() {
    const usernameVal = document.getElementById("username").value;
    const passwordVal = document.getElementById("password").value;

    if (!usernameVal || !passwordVal) {
        alert("Vui lòng nhập tài khoản và mật khẩu");
        return;
    }

    fetch("http://localhost:3000/api/auth/login-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: usernameVal,
            password: passwordVal
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            localStorage.setItem("token", data.token);
            localStorage.setItem("user", JSON.stringify(data.user));
            alert("Đăng nhập thành công");
            window.location.href = "index.html";
        } else {
            alert(data.message || "Sai tài khoản hoặc mật khẩu");
        }
    })
    .catch(err => {
        console.error(err);
        alert("Lỗi kết nối server");
    });
}

function register() {
    // Lấy dữ liệu từ form
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const fullName = document.getElementById("full_name").value;
    const email = document.getElementById("email").value;
    const phone = document.getElementById("phone").value;

    // Kiểm tra sơ bộ
    if (!username || !password || !fullName) {
        alert("Vui lòng điền đầy đủ các trường bắt buộc!");
        return;
    }

    fetch("http://localhost:3000/api/auth/register", {
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
            alert("Đăng ký thành công! Hãy đăng nhập.");
            window.location.href = "login.html";
        } else if (data.error) {
            alert("Lỗi: " + data.error);
        } else {
            alert("Đăng ký thành công!");
            window.location.href = "login.html";
        }
    })
    .catch(err => {
        console.error(err);
        alert("Có lỗi xảy ra khi kết nối server.");
    });
}

function logout() {
    if(confirm("Bạn có chắc muốn đăng xuất?")) {
        localStorage.clear();
        window.location.href = "index.html";
    }
}

// ============================================================
// 2. XỬ LÝ GIAO DIỆN (HEADER, MENU USER)
// ============================================================

const authArea = document.getElementById("authArea");
const token = localStorage.getItem("token");

if (authArea) {
    if (token) {
        // ĐÃ ĐĂNG NHẬP
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
        // Gọi hàm cập nhật số lượng giỏ hàng
        updateCartCount();
    } else {
        // CHƯA ĐĂNG NHẬP
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

    fetch("http://localhost:3000/api/cart", {
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

// Hàm mở Modal Mua hàng (Dùng chung cho Mua Ngay và Thanh toán giỏ hàng)
function buyNow(productId) {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Cần đăng nhập để mua hàng. Đăng nhập ngay?")) window.location.href="login.html";
        return;
    }

    // Nếu có productId truyền vào -> Là Mua Ngay -> Gán vào ô input ẩn
    if (productId) {
        const hiddenInput = document.getElementById("direct-buy-product-id");
        if(hiddenInput) hiddenInput.value = productId;
    }

    // Điền sẵn thông tin user vào form (nếu có trong localStorage)
    const user = JSON.parse(localStorage.getItem("user") || '{}');
    const inputName = document.getElementById("order-name");
    const inputPhone = document.getElementById("order-phone");
    const inputEmail = document.getElementById("order-email"); // Nếu form có ô email

    if(inputName) inputName.value = user.full_name || "";
    if(inputPhone) inputPhone.value = user.phone || "";
    if(inputEmail) inputEmail.value = user.email || "";

    // Mở Modal lên
    // Lưu ý: Đảm bảo trang HTML có Modal ID là 'checkoutModal'
    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        console.error("Không tìm thấy Modal checkoutModal trong HTML");
    }
}

// Hàm xử lý khi bấm nút "Xác nhận đặt hàng" trong Modal
function processOrder() {
    const name = document.getElementById("order-name").value.trim();
    const phone = document.getElementById("order-phone").value.trim();
    const address = document.getElementById("order-address").value.trim();
    
    if (!name || !phone || !address) {
        alert("Vui lòng điền đủ tên, số điện thoại và địa chỉ nhận hàng!");
        return;
    }

    // Kiểm tra xem là Mua Ngay hay Mua Giỏ Hàng
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
        // ==> MUA NGAY (1 sản phẩm)
        apiUrl = "http://localhost:3000/api/orders/direct";
        bodyData.productId = directProductId;
        bodyData.quantity = 1; 
    } else {
        // ==> MUA TỪ GIỎ HÀNG
        apiUrl = "http://localhost:3000/api/orders";
    }
    
    // Gửi request lên Server
    const token = localStorage.getItem("token");
    fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify(bodyData)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if(data.message && (data.message.includes("thành công") || data.message.includes("success"))) {
             location.reload(); 
        }
    })
    .catch(err => console.error(err));
}