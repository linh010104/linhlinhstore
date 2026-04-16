/* File: js/detail.js */

let currentProductId = null;

document.addEventListener("DOMContentLoaded", () => {
    // Lấy ID từ URL
    const params = new URLSearchParams(window.location.search);
    currentProductId = params.get("id");

    if (!currentProductId) {
        alert("Không tìm thấy sản phẩm!");
        window.location.href = "index.html";
        return;
    }

    loadProductDetail();
});

function loadProductDetail() {
    fetch(`${CONFIG.BASE_URL}/products/${currentProductId}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.message) {
                alert("Sản phẩm không tồn tại");
                return;
            }

            // --- ĐIỀN THÔNG TIN ---
            document.getElementById("detail-name").innerText = data.name;
            if(document.getElementById("breadcrumb-name")) {
                document.getElementById("breadcrumb-name").innerText = data.name;
            }
            
            const catName = data.category_name || "Sản phẩm";
            document.getElementById("detail-category").innerText = catName;

            const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
            document.getElementById("detail-price").innerText = price;

            document.getElementById("detail-desc").innerText = data.description || "Chưa có mô tả chi tiết.";
            
            // --- ẢNH ---
            const imgUrl = data.image_url ? `${CONFIG.IMAGE_BASE_URL}${data.image_url}` : "https://via.placeholder.com/500?text=No+Image";
            document.getElementById("detail-img").src = imgUrl;

            // --- TẢI SẢN PHẨM TƯƠNG TỰ ---
            loadRelatedProducts(data.category_id);
        })
        .catch(err => console.error(err));
}

// Hàm tải sản phẩm liên quan
function loadRelatedProducts(catId) {
    const container = document.getElementById("related-products");
    if (!container) return; // Tránh lỗi nếu trang không có thẻ này
    
    fetch(`${CONFIG.BASE_URL}/products`)
    .then(res => res.json())
    .then(all => {
        const related = all.filter(p => p.category_id == catId && p.id != currentProductId).slice(0, 4);

        container.innerHTML = "";
        if(related.length === 0) {
            container.innerHTML = "<div class='col-12 text-center text-muted'>Không có sản phẩm tương tự.</div>";
            return;
        }

        related.forEach(p => {
             const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price);
             const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : "https://via.placeholder.com/300x300";
             
             container.innerHTML += `
                <div class="col-6 col-md-3">
                    <div class="card h-100 shadow-sm border-0">
                        <a href="detail.html?id=${p.id}">
                            <div class="p-3" style="height: 180px; display: flex; align-items: center; justify-content: center;">
                                <img src="${imgUrl}" class="img-fluid" style="max-height: 100%;" alt="${p.name}">
                            </div>
                        </a>
                        <div class="card-body p-2 text-center">
                            <h6 class="card-title text-truncate mb-1">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark fw-bold">${p.name}</a>
                            </h6>
                            <p class="text-danger fw-bold small mb-0">${price}</p>
                        </div>
                    </div>
                </div>
             `;
        });
    })
    .catch(err => console.error(err));
}

// Tăng giảm số lượng
function changeQty(amount) {
    const input = document.getElementById("qty-input");
    let val = parseInt(input.value) + amount;
    if (val < 1) val = 1;
    input.value = val;
}

// Thêm vào giỏ từ chi tiết
function addToCartFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Đăng nhập để mua hàng?")) window.location.href="login.html";
        return;
    }
    const qty = parseInt(document.getElementById("qty-input").value);

    fetch(`${CONFIG.BASE_URL}/cart/add`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": "Bearer "+token },
        body: JSON.stringify({ productId: currentProductId, quantity: qty })
    })
    .then(r => r.json())
    .then(d => { 
        alert(d.message || "Đã thêm vào giỏ!"); 
        if(window.updateCartCount) window.updateCartCount(); 
    })
    .catch(e => console.error(e));
}

// Mua ngay
function buyNowFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Đăng nhập để mua ngay?")) window.location.href="login.html";
        return;
    }
    document.getElementById("direct-buy-product-id").value = currentProductId;
    
    if(typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
        modal.show();
    } else {
        alert("Lỗi thư viện Modal");
    }
}