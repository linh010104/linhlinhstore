/* File: js/product.js */

document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadProducts(); // Mặc định load tất cả
});

// --- 1. HÀM LOAD DANH MỤC ---
function loadCategories() {
    fetch(`${CONFIG.BASE_URL}/categories`)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("category-list");
            if (!list) return; // Chặn lỗi nếu trang không có list danh mục
            
            list.innerHTML = `<li class="list-group-item list-group-item-action fw-bold" style="cursor:pointer" onclick="filterByCategory(null, 'Tất cả sản phẩm')">Tất cả</li>`;

            data.forEach(c => {
                const li = document.createElement("li");
                li.className = "list-group-item list-group-item-action";
                li.style.cursor = "pointer";
                li.innerHTML = `<i class="fa-solid fa-chevron-right me-2 text-muted small"></i> ${c.name}`;
                li.onclick = () => filterByCategory(c.id, c.name);
                list.appendChild(li);
            });
        })
        .catch(err => console.error("Lỗi load danh mục:", err));
}

// --- 2. HÀM LOAD SẢN PHẨM ---
function loadProducts(keyword = "", categoryId = "") {
    let url = `${CONFIG.BASE_URL}/products?`;
    
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
    if (categoryId) url += `category_id=${categoryId}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("product-list");
            if (!list) return;
            
            list.innerHTML = "";

            if (data.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Không tìm thấy sản phẩm nào.</p></div>`;
                return;
            }

            data.forEach(p => {
                const col = document.createElement("div");
                col.className = "col-6 col-md-4"; 

                const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : "https://via.placeholder.com/300x300";

                col.innerHTML = `
                    <div class="card card-product h-100 shadow-sm border transition-all">
                        <div class="position-relative overflow-hidden">
                            <a href="detail.html?id=${p.id}">
                                <img src="${imgUrl}" class="card-img-top" alt="${p.name}">
                            </a>
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h5 class="card-title text-truncate">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark">${p.name}</a>
                            </h5>
                            <p class="card-text text-danger fw-bold fs-5">${Number(p.price).toLocaleString()} đ</p>
                            
                            <div class="mt-auto card-actions d-flex gap-2">
                                <button onclick="buyNow(${p.id})" class="btn btn-danger flex-grow-1 fw-bold rounded-pill btn-sm">
                                    Mua Ngay
                                </button>
                                <button onclick="addToCart(${p.id})" class="btn btn-outline-primary rounded-circle btn-sm" title="Thêm vào giỏ" style="width: 34px; height: 34px;">
                                    <i class="fa-solid fa-cart-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                list.appendChild(col);
            });
        })
        .catch(err => console.error("Lỗi tải sản phẩm:", err));
}

// --- 3. CÁC HÀM SỰ KIỆN ---

function searchProduct() {
    const keyword = document.getElementById("search-input").value;
    const titleEl = document.getElementById("page-title");
    if(titleEl) titleEl.innerText = `Kết quả tìm kiếm: "${keyword}"`;
    loadProducts(keyword, null); 
}

function filterByCategory(id, name) {
    const titleEl = document.getElementById("page-title");
    if(titleEl) titleEl.innerText = name;
    loadProducts("", id); 
}

function addToCart(productId) {
    const token = localStorage.getItem("token");
    if (!token) {
        if (confirm("Bạn cần đăng nhập để mua hàng. Đến trang đăng nhập ngay?")) {
            window.location.href = "login.html";
        }
        return;
    }

    fetch(`${CONFIG.BASE_URL}/cart/add`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token 
        },
        body: JSON.stringify({ productId: productId, quantity: 1 })
    })
    .then(res => {
        if (res.status === 401 || res.status === 403) {
            alert("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            localStorage.clear();
            window.location.href = "login.html";
            return;
        }
        return res.json();
    })
    .then(data => {
        if (data) {
            alert(data.message);
            if (typeof window.updateCartCount === "function") {
                window.updateCartCount();
            }
        }
    })
    .catch(err => console.error("Lỗi:", err));
}