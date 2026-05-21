// ============================================================
// BẮT TÍN HIỆU TỪ GOOGLE LOGIN TRẢ VỀ TRÊN URL
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userStr = urlParams.get('user');

    if (token && userStr) {
        try {
            // Giải mã và lưu thông tin
            const user = JSON.parse(decodeURIComponent(userStr));
            StorageHelper.setToken(token);
            StorageHelper.setUser(user);
            
            // Xóa cái đuôi loằng ngoằng trên thanh địa chỉ cho đẹp web
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Báo thành công và load lại giao diện
            if (typeof UIHelper !== 'undefined') {
                UIHelper.showSuccess('Đăng nhập thành công', 'Chào mừng bạn đến với LinhLinh Store!', () => {
                    window.location.reload(); 
                });
            } else {
                window.location.reload();
            }
        } catch (error) {
            console.error("Lỗi khi xử lý dữ liệu Google:", error);
        }
    }
});

// ============================================================
// CÁC HÀM CŨ CỦA ÔNG (GIỮ NGUYÊN)
// ============================================================
function login() {
    const usernameVal = document.getElementById("username").value;
    const passwordVal = document.getElementById("password").value;

    if (!usernameVal || !passwordVal) {
        UIHelper.showWarning('Thiếu thông tin', 'Vui lòng nhập tài khoản và mật khẩu');
        return;
    }

    API.post('/auth/login', { username: usernameVal, password: passwordVal, clientType: "WEB" })
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        if (isSuccess && data.token) {
            StorageHelper.setToken(data.token);
            StorageHelper.setUser(data.user);
            UIHelper.showSuccess('Đăng nhập thành công', 'Chào mừng bạn!', () => { window.location.href = "index.html"; });
        } else {
            UIHelper.showError('Đăng nhập thất bại', message || "Sai tài khoản hoặc mật khẩu");
        }
    })
    .catch(err => { console.error(err); UIHelper.showError('Lỗi', 'Lỗi kết nối server'); });
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

    API.post('/auth/register', { username: username, password: password, full_name: fullName, email: email, phone: phone })
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        if (isSuccess) {
            UIHelper.showSuccess('Đăng ký thành công', 'Hãy đăng nhập.', () => { window.location.href = "login.html"; });
        } else {
            UIHelper.showError('Lỗi', message);
        }
    })
    .catch(err => { console.error(err); UIHelper.showError('Lỗi', 'Có lỗi xảy ra khi kết nối server.'); });
}

function logout() {
    if(typeof UIHelper === 'undefined' || typeof Swal === 'undefined') {
        StorageHelper.clearAuth();
        window.location.href = "index.html";
        return;
    }
    UIHelper.showConfirm(
        'Đăng xuất?', "Bạn có chắc muốn đăng xuất khỏi hệ thống?", 'Đăng xuất', 'Hủy',
        () => { StorageHelper.clearAuth(); window.location.href = "index.html"; }
    );
}

// HÀM MỚI: Xử lý lưu trạng thái "Đã đọc tất cả" vào LocalStorage
window.markAllNotificationsAsRead = function() {
    const badge = document.getElementById('noti-badge');
    if (badge) badge.style.display = 'none';
    localStorage.setItem('hasReadNotifications', 'true');
};

const authArea = document.getElementById("authArea");

if (authArea) {
    if (StorageHelper.isLoggedIn()) {
        const user = StorageHelper.getUser();
        const username = user?.username || user?.full_name || "Khách";

        // GIAO DIỆN KHI ĐÃ ĐĂNG NHẬP
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
                <a href="#" class="d-flex align-items-center gap-2 cursor-pointer header-item text-white text-decoration-none position-relative btn-header-custom" data-bs-toggle="dropdown" data-bs-auto-close="outside" style="background: rgba(255,255,255,0.15); padding: 8px 15px; border-radius: 12px;">
                    <i class="fa-regular fa-circle-user fs-4"></i>
                    <div class="lh-1 small d-none d-lg-block">
                        <div style="font-size: 0.7rem; opacity: 0.9;">Xin chào,</div>
                        <div class="fw-bold mt-1 text-truncate" style="max-width: 90px;">${username}</div>
                    </div>
                    <span id="noti-badge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style="margin-top: 5px; margin-left: -15px; display: none;">0</span>
                </a>
                
                <div class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-0" style="width: 360px; border-radius: 15px; margin-top: 15px;">
                    <div class="p-3">
                        <a href="profile.html" class="d-flex justify-content-between align-items-center border border-danger rounded-3 p-2 text-decoration-none mb-4 shadow-sm" style="background-color: #fffafb;">
                            <div class="d-flex align-items-center">
                                <img src="https://placehold.co/30x30/d70018/ffffff?text=L" class="rounded-circle me-2" style="width:32px; height:32px;">
                                <span class="text-danger fw-bold">Truy cập LinhLinh Profile</span>
                            </div>
                            <i class="fa-solid fa-chevron-right text-danger"></i>
                        </a>
                        <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                            <span class="fw-bold fs-6">Thông báo</span>
                            <a href="#" class="small text-success text-decoration-none" onclick="markAllNotificationsAsRead(); return false;"><i class="fa-solid fa-check-double"></i> Đã đọc tất cả <i class="fa-solid fa-check"></i></a>
                        </div>
                    </div>
                    <div id="noti-list" class="px-3 pb-2" style="max-height: 350px; overflow-y: auto; overflow-x: hidden;">
                        <div class="text-center py-5"><div class="spinner-border text-danger spinner-border-sm" role="status"></div></div>
                    </div>
                    <div class="p-2 border-top text-center bg-light" style="border-radius: 0 0 15px 15px;">
                        <button class="btn btn-link text-primary fw-bold text-decoration-none w-100" onclick="document.querySelector('[data-bs-toggle=dropdown]').click()">Đóng</button>
                    </div>
                </div>
            </div>
        `;
        updateCartCount();
        loadNotifications(); 
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
        if (Array.isArray(data)) { data.forEach(item => { totalQty += item.quantity; }); }
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
        name: name, phone: phone, address: address,
        payment_method: document.getElementById("payment-method").value,
        note: document.getElementById("order-note").value
    };

    if (directProductId) {
        apiUrl = `/orders/direct`;
        bodyData.productId = directProductId;
        bodyData.quantity = 1; 
    } else { apiUrl = `/orders`; }
    
    API.post(apiUrl, bodyData, true)
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => { location.reload(); });
        } else { UIHelper.showError('Lỗi', message); }
    })
    .catch(err => { console.error(err); UIHelper.showError('Lỗi', 'Lỗi hệ thống khi đặt hàng'); });
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

    API.put('/auth/change-password', { oldPassword: oldPass, newPassword: newPass }, true)
    .then(data => {
        const { isSuccess, message } = UIHelper.parseResponse(data);
        if (isSuccess) {
            UIHelper.showSuccess('Thành công', message, () => {
                StorageHelper.clearAuth(); window.location.href = "login.html"; 
            });
        } else { UIHelper.showError('Lỗi', message); }
    })
    .catch(err => { console.error("Lỗi đổi mật khẩu:", err); UIHelper.showError('Lỗi', 'Lỗi kết nối tới Server!'); });
}

// ============================================================
// QUẢN LÝ THÔNG BÁO ĐƠN HÀNG
// ============================================================
function loadNotifications() {
    API.get('/orders/mine', true)
    .then(orders => {
        const notiList = document.getElementById("noti-list");
        const notiBadge = document.getElementById("noti-badge");
        if (!notiList) return;

        if (!Array.isArray(orders) || orders.length === 0) {
            notiList.innerHTML = `
                <div class="text-center py-5 text-muted small">
                    <img src="https://placehold.co/120x120/f4f6f8/d70018?text=O_O" class="mb-3 rounded-circle border" style="padding: 10px;">
                    <br><span class="fw-bold text-dark fs-6">Ở đây hơi trống trải.</span><br>
                    LinhLinhStore sẽ gửi cho bạn những thông báo mới nhất tại đây nhé!
                </div>`;
            return;
        }

        let notiHTML = '';
        let unreadCount = 0;
        const recentOrders = orders.slice(0, 5);

        recentOrders.forEach(order => {
            let statusText = "", iconStr = "", colorStr = "";
            switch (order.status) {
                case 'NEW':
                    statusText = `Đơn hàng <b>#${order.id}</b> đang chờ hệ thống xác nhận.`;
                    iconStr = '<i class="fa-solid fa-box text-warning"></i>'; colorStr = "bg-warning-subtle"; unreadCount++; break;
                case 'SHIPPING':
                    statusText = `Đơn hàng <b>#${order.id}</b> đã được giao cho đơn vị vận chuyển.`;
                    iconStr = '<i class="fa-solid fa-truck-fast text-primary"></i>'; colorStr = "bg-primary-subtle"; unreadCount++; break;
                case 'DONE':
                    statusText = `Đơn hàng <b>#${order.id}</b> đã hoàn tất. Cảm ơn bạn!`;
                    iconStr = '<i class="fa-solid fa-check text-success"></i>'; colorStr = "bg-success-subtle"; break;
                case 'CANCELLED':
                    statusText = `Đơn hàng <b>#${order.id}</b> đã bị hủy.`;
                    iconStr = '<i class="fa-solid fa-xmark text-danger"></i>'; colorStr = "bg-danger-subtle"; break;
                default:
                    statusText = `Có cập nhật mới cho đơn hàng <b>#${order.id}</b>.`;
                    iconStr = '<i class="fa-solid fa-bell text-secondary"></i>'; colorStr = "bg-light";
            }

            const dateStr = new Date(order.created_at).toLocaleDateString('vi-VN');
            notiHTML += `
                <a href="orders.html" class="text-decoration-none">
                    <div class="d-flex p-2 mb-2 rounded border-bottom" style="transition: background 0.2s;">
                        <div class="me-3 mt-1">
                            <div class="rounded-circle d-flex align-items-center justify-content-center ${colorStr}" style="width: 40px; height: 40px;">${iconStr}</div>
                        </div>
                        <div class="text-dark small">
                            ${statusText}
                            <div class="text-muted mt-1" style="font-size: 0.75rem;"><i class="fa-regular fa-clock me-1"></i> ${dateStr}</div>
                        </div>
                    </div>
                </a>`;
        });

        notiList.innerHTML = notiHTML;
        
        // KIỂM TRA LOCALSTORAGE ĐỂ ẨN/HIỆN CHUÔNG
        if (notiBadge) {
            notiBadge.innerText = unreadCount;
            const hasRead = localStorage.getItem('hasReadNotifications');
            notiBadge.style.display = (unreadCount > 0 && hasRead !== 'true') ? "inline-block" : "none";
        }
    })
    .catch(err => { console.error("Lỗi tải thông báo:", err); });
}