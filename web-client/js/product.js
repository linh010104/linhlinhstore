document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadProducts(); // Mặc định load tất cả
});
let allCategoriesData = [];
function loadCategories() {
    Promise.all([
        fetch(`${CONFIG.BASE_URL}/categories`).then(res => res.json()),
        fetch(`${CONFIG.BASE_URL}/brands/mapping`).then(res => res.json()).catch(() => []) 
    ])
    .then(([categoriesData, mappingData]) => {
        allCategoriesData = categoriesData; 
        const list = document.getElementById("category-list");
        if (!list) return;
        
        list.innerHTML = `<a href="#" class="list-group-item d-flex justify-content-between align-items-center text-decoration-none text-dark" onclick="filterByCategory(null, 'Tất cả sản phẩm'); return false;">
            <span><i class="fa-solid fa-layer-group me-2 text-muted"></i> Tất cả sản phẩm</span>
        </a>`;

        const parentCategories = categoriesData.filter(c => !c.parent_id);
        const childCategories = categoriesData.filter(c => c.parent_id);

        parentCategories.forEach(parent => {
            let iconClass = "fa-box"; 
            let nameLower = parent.name.toLowerCase();
            if (nameLower.includes("laptop") || nameLower.includes("máy tính")) iconClass = "fa-laptop";
            else if (nameLower.includes("điện thoại") || nameLower.includes("phone")) iconClass = "fa-mobile-screen";
            else if (nameLower.includes("tai nghe") || nameLower.includes("âm thanh")) iconClass = "fa-headphones";
            else if (nameLower.includes("chuột") || nameLower.includes("phụ kiện")) iconClass = "fa-computer-mouse";

            const myChildren = childCategories.filter(child => child.parent_id === parent.id);
            const liTag = document.createElement("li");
            liTag.className = "list-group-item position-static"; 
            
            let innerHTML = `
                <div class="d-flex justify-content-between align-items-center text-decoration-none text-dark" style="cursor:pointer;" onclick="filterByCategory(${parent.id}, '${parent.name}')">
                    <span><i class="fa-solid ${iconClass} me-2 text-muted"></i> ${parent.name}</span>
                    <i class="fa-solid fa-chevron-right small text-muted"></i>
                </div>
            `;

            // BÂY GIỜ LUÔN TẠO MEGA MENU DÙ CÓ HAY KHÔNG CÓ DANH MỤC CON
            let dynamicBrandHTML = "";
            const brandsForThisCategory = mappingData.filter(m => m.main_category_id === parent.id);

            if (brandsForThisCategory.length > 0) {
                brandsForThisCategory.forEach(b => {
                    dynamicBrandHTML += `<a href="#" class="brand-item" onclick="filterByBrand(${b.brand_id}, '${b.brand_name}'); return false;">${b.brand_name}</a>`;
                });
            } else {
                dynamicBrandHTML = `<span class="text-muted small">Đang cập nhật...</span>`;
            }

            let childrenHTML = `<div class="mega-menu-content">`;

            // Chỉ vẽ cột "Loại sản phẩm" nếu thực sự có danh mục con
            if (myChildren.length > 0) {
                childrenHTML += `<div class="mega-column"><div class="mega-title">Loại sản phẩm</div><div class="mega-list">`;
                myChildren.forEach(child => {
                    childrenHTML += `<a href="#" onclick="filterByCategory(${child.id}, '${child.name}'); return false;">${child.name}</a>`;
                });
                childrenHTML += `</div></div>`;
            }

            // Vẽ 2 cột Hãng và Giá cố định
            childrenHTML += `
                <div class="mega-column">
                    <div class="mega-title">Chọn theo hãng</div>
                    <div class="brand-grid">
                        ${dynamicBrandHTML}
                    </div>
                </div>
                <div class="mega-column">
                    <div class="mega-title">Mức giá</div>
                    <div class="mega-list">
                        <a href="#">Dưới 2 triệu</a>
                        <a href="#">Từ 2 - 5 triệu</a>
                        <a href="#">Từ 5 - 10 triệu</a>
                        <a href="#">Từ 10 - 20 triệu</a>
                        <a href="#">Trên 20 triệu</a>
                    </div>
                </div>
            </div>`;

            innerHTML += childrenHTML;
            liTag.innerHTML = innerHTML;
            list.appendChild(liTag);
        });
    })
    .catch(err => console.error("Lỗi load API:", err));
}
function loadProducts(keyword = "", categoryId = "") {
    let url = `${CONFIG.BASE_URL}/products?`;
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;

    let isParent = false;
    let childIds = [];

    if (categoryId) {
        const selectedCat = allCategoriesData.find(c => c.id == categoryId);
        if (selectedCat && !selectedCat.parent_id) {
            isParent = true;
            childIds = allCategoriesData.filter(c => c.parent_id == categoryId).map(c => c.id);
        }

        // Nếu là danh mục Cha thì KHÔNG gửi ID lên server, bắt server nhả hết data về để Frontend tự lọc
        if (!isParent) {
            url += `category_id=${categoryId}`;
        }
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("product-list");
            if (!list) return;
            list.innerHTML = "";

            // BỘ LỌC FRONTEND (Fixed: Bỏ điều kiện childIds.length > 0)
            if (categoryId && isParent && !keyword) {
                // Giữ lại SP nếu nó thuộc Cha HOẶC thuộc Con của Cha đó
                data = data.filter(p => p.category_id == categoryId || childIds.includes(p.category_id));
            }

            if (data.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Không tìm thấy sản phẩm nào.</p></div>`;
                return;
            }

            data.forEach(p => {
                const col = document.createElement("div");
                col.className = "col-6 col-md-4 col-lg-3 mb-3"; 
                const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : "https://via.placeholder.com/300x300";

                col.innerHTML = `
                    <div class="card h-100">
                        <a href="detail.html?id=${p.id}" class="text-center">
                            <img src="${imgUrl}" class="card-img-top" alt="${p.name}">
                        </a>
                        <div class="card-body">
                            <h5 class="card-title">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark">${p.name}</a>
                            </h5>
                            <div class="price-tag">${Number(p.price).toLocaleString('vi-VN')} đ</div>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="buyNow(${p.id})" class="btn btn-primary flex-grow-1">Mua Ngay</button>
                                <button onclick="addToCart(${p.id})" class="btn btn-outline-danger" title="Thêm vào giỏ" style="width: 40px; border-radius: 5px;">
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
// --- CÁC HÀM SỰ KIỆN ---
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
// --- HÀM LỌC SẢN PHẨM THEO HÃNG ---
function filterByBrand(brandId, brandName) {
    // 1. Đổi tiêu đề để người dùng biết đang xem hãng nào
    const titleEl = document.querySelector("h3.text-uppercase"); 
    if (titleEl) titleEl.innerText = `Sản phẩm hãng: ${brandName}`;

    const list = document.getElementById("product-list");
    if (!list) return;
    
    // 2. Hiện hiệu ứng xoay xoay đang tải
    list.innerHTML = `<div class="text-center py-5 w-100"><div class="spinner-border text-danger" role="status"></div></div>`;

    // 3. Gọi API và tự lọc bằng Javascript
    fetch(`${CONFIG.BASE_URL}/products`)
        .then(res => res.json())
        .then(data => {
            // Lọc ra các sản phẩm có brand_id khớp với hãng vừa click
            const filteredProducts = data.filter(p => p.brand_id == brandId);
            
            list.innerHTML = "";
            if (filteredProducts.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Chưa có sản phẩm nào thuộc hãng ${brandName}.</p></div>`;
                return;
            }

            // In các sản phẩm đã lọc ra màn hình
            filteredProducts.forEach(p => {
                const col = document.createElement("div");
                col.className = "col-6 col-md-4 col-lg-3 mb-3"; 
                const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : "https://via.placeholder.com/300x300";

                col.innerHTML = `
                    <div class="card h-100">
                        <a href="detail.html?id=${p.id}" class="text-center">
                            <img src="${imgUrl}" class="card-img-top" alt="${p.name}">
                        </a>
                        <div class="card-body">
                            <h5 class="card-title">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark">${p.name}</a>
                            </h5>
                            <div class="price-tag">${Number(p.price).toLocaleString('vi-VN')} đ</div>
                            <div class="mt-auto d-flex gap-2">
                                <button onclick="buyNow(${p.id})" class="btn btn-primary flex-grow-1">Mua Ngay</button>
                                <button onclick="addToCart(${p.id})" class="btn btn-outline-danger" title="Thêm vào giỏ" style="width: 40px; border-radius: 5px;">
                                    <i class="fa-solid fa-cart-plus"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                list.appendChild(col);
            });
        })
        .catch(err => console.error("Lỗi lọc hãng:", err));
}