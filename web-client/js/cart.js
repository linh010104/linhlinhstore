const token = localStorage.getItem("token");

if (!token) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "login.html";
}

function loadCart() {
    fetch(`${CONFIG.BASE_URL}/cart`, {
        method: "GET",
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(res => res.json())
    .then(data => {
        const tbody = document.getElementById("cart-body");
        const emptyMsg = document.getElementById("empty-cart-msg");
        const totalPriceEl = document.getElementById("total-price");
        
        tbody.innerHTML = "";
        let total = 0;

        if (!data || data.length === 0) {
            emptyMsg.classList.remove("d-none");
            totalPriceEl.innerText = "0 đ";
            return;
        }

        data.forEach(item => {
            // Giá gốc từ bảng product
            let finalPrice = Number(item.price);
            const variantDisplay = item.variant_info 
                ? `<div class="mt-1 small" style="color: #6c757d; font-style: italic;">Phân loại: <span class="fw-bold text-dark">${item.variant_info}</span></div>` 
                : "";

            // Tính tạm thành tiền
            const itemTotal = finalPrice * item.quantity;
            total += itemTotal;

            const imgUrl = item.image_url 
                ? `${CONFIG.IMAGE_BASE_URL}${item.image_url}` 
                : "https://via.placeholder.com/80";

            const tr = document.createElement("tr");
            tr.id = `cart-item-${item.cart_id}`;
            tr.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${imgUrl}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;" class="me-3">
                        <div>
                            <div class="fw-bold">${item.name}</div>
                            <small class="text-muted">SKU: ${item.sku}</small>
                            ${variantDisplay} 
                        </div>
                    </div>
                </td>
                <td>
                    ${finalPrice.toLocaleString()} đ 
                    ${item.variant_info ? '<br><small class="text-muted">(Giá gốc chưa gồm Option)</small>' : ''}
                </td>
                <td>
                    <span class="badge bg-secondary rounded-pill px-3">${item.quantity}</span>
                </td>
                <td class="fw-bold text-danger">${itemTotal.toLocaleString()} đ</td>
                <td>
                    <button onclick="removeItem(${item.cart_id})" class="btn btn-sm btn-outline-danger border-0">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Nút Thanh Toán (Tạm gọi qua API checkout luôn)
        const btnCheckout = document.querySelector(".btn-danger");
        btnCheckout.onclick = function() {
            processCheckout();
        };

        totalPriceEl.innerText = total.toLocaleString() + " đ";
    })
    .catch(err => console.error(err));
}

// Hàm Xử lý Thanh Toán
function processCheckout() {
    if(!confirm("Bạn xác nhận đặt mua giỏ hàng này chứ?")) return;
    
    // Tạo object data cứng tạm thời (Vì ông chưa thiết kế cái form nhập Tên, SDT, Địa chỉ lúc thanh toán)
    const checkoutData = {
        payment_method: "COD",
        name: "LinhLinh", // Tạm để tĩnh, mốt làm Modal sửa sau
        phone: "0123456789",
        address: "Triều Khúc",
        note: "Giao hỏa tốc"
    };

    fetch(`${CONFIG.BASE_URL}/orders/checkout`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token 
        },
        body: JSON.stringify(checkoutData)
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        if(data.orderId) {
            window.location.href = "orders.html"; // Chuyển sang trang lịch sử đơn hàng
        }
    })
    .catch(err => console.error(err));
}

// Hàm xóa sản phẩm khỏi giỏ
function removeItem(cartId) {
    if(!confirm("Bạn muốn xóa sản phẩm này?")) return;

    fetch(`${CONFIG.BASE_URL}/cart/${cartId}`, {
        method: "DELETE",
        headers: { "Authorization": "Bearer " + token }
    })
    .then(res => res.json())
    .then(data => {
        const row = document.getElementById(`cart-item-${cartId}`);
        if(row) row.remove();
        
        if(window.updateCartCount) window.updateCartCount();
        loadCart(); 
        alert(data.message || "Đã xóa sản phẩm khỏi giỏ!");
    })
    .catch(err => console.error(err));
}

document.addEventListener("DOMContentLoaded", loadCart);