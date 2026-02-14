/* File: js/detail.js - Bản Fix Lỗi Ảnh */

let currentProductId = null;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Lấy ID từ URL
    const params = new URLSearchParams(window.location.search);
    currentProductId = params.get("id");

    if (!currentProductId) {
        alert("Không tìm thấy sản phẩm!");
        window.location.href = "index.html";
        return;
    }

    loadProductDetail();
});

// Hàm lấy đường dẫn ảnh chuẩn (Dựa theo code cũ của ông)
function getImgPath(urlFromDb) {
    if (!urlFromDb) return 'https://via.placeholder.com/500?text=No+Image';
    // Nếu trong DB lưu đường dẫn tương đối (ví dụ /uploads/abc.jpg) thì nối thêm localhost vào
    return `http://localhost:3000${urlFromDb}`;
}

function loadProductDetail() {
    fetch(`http://localhost:3000/api/products/${currentProductId}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.message) {
                alert("Sản phẩm không tồn tại");
                return;
            }

            // --- ĐIỀN THÔNG TIN ---
            document.getElementById("detail-name").innerText = data.name;
            document.getElementById("breadcrumb-name").innerText = data.name;
            
            // Danh mục
            const catName = data.category_name || "Sản phẩm";
            document.getElementById("detail-category").innerText = catName;

            // Giá
            const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
            document.getElementById("detail-price").innerText = price;

            // Mô tả
            document.getElementById("detail-desc").innerText = data.description || "Chưa có mô tả chi tiết.";
            
            // --- ẢNH (Dùng hàm mới sửa) ---
            // Code cũ dùng data.image_url, nên ở đây ta cũng dùng thế
            document.getElementById("detail-img").src = getImgPath(data.image_url);

            // --- TẢI SẢN PHẨM TƯƠNG TỰ ---
            loadRelatedProducts(data.category_id);
        })
        .catch(err => console.error(err));
}

// Hàm tải sản phẩm liên quan
function loadRelatedProducts(catId) {
    const container = document.getElementById("related-products");
    
    fetch("http://localhost:3000/api/products")
    .then(res => res.json())
    .then(all => {
        // Lọc sản phẩm cùng loại trừ chính nó
        const related = all.filter(p => p.category_id == catId && p.id != currentProductId).slice(0, 4);

        container.innerHTML = "";
        if(related.length === 0) {
            container.innerHTML = "<div class='col-12 text-center text-muted'>Không có sản phẩm tương tự.</div>";
            return;
        }

        related.forEach(p => {
             const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price);
             const img = getImgPath(p.image_url); // Dùng lại hàm lấy ảnh chuẩn
             
             container.innerHTML += `
                <div class="col-6 col-md-3">
                    <div class="card h-100 shadow-sm border-0">
                        <a href="detail.html?id=${p.id}">
                            <div class="p-3" style="height: 180px; display: flex; align-items: center; justify-content: center;">
                                <img src="${img}" class="img-fluid" style="max-height: 100%;" alt="${p.name}">
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

// Thêm vào giỏ (Logic cũ nhưng gắn vào nút mới)
function addToCartFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Đăng nhập để mua hàng?")) window.location.href="login.html";
        return;
    }
    const qty = parseInt(document.getElementById("qty-input").value);

    fetch("http://localhost:3000/api/cart/add", { // Dùng đúng link API cũ của ông
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

// Mua ngay (Gọi modal)
function buyNowFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Đăng nhập để mua ngay?")) window.location.href="login.html";
        return;
    }
    document.getElementById("direct-buy-product-id").value = currentProductId;
    
    // Mở modal Bootstrap
    if(typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
        modal.show();
    } else {
        alert("Lỗi thư viện Modal");
    }
}