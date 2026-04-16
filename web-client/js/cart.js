/* File: js/cart.js */

const token = localStorage.getItem("token");

if (!token) {
    alert("Bạn chưa đăng nhập!");
    window.location.href = "login.html";
}

// Hàm tải dữ liệu giỏ hàng
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
            const itemTotal = item.price * item.quantity;
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
                        </div>
                    </div>
                </td>
                <td>${Number(item.price).toLocaleString()} đ</td>
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

        totalPriceEl.innerText = total.toLocaleString() + " đ";
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
        // Xóa dòng DOM trực tiếp
        const row = document.getElementById(`cart-item-${cartId}`);
        if(row) row.remove();
        
        // Cập nhật lại số lượng và tổng tiền
        if(window.updateCartCount) window.updateCartCount();
        loadCart(); 
        alert(data.message || "Đã xóa sản phẩm khỏi giỏ!");
    })
    .catch(err => console.error(err));
}

// Chạy hàm khi trang vừa load xong
document.addEventListener("DOMContentLoaded", loadCart);