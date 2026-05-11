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

            if (myChildren.length > 0) {
                childrenHTML += `<div class="mega-column"><div class="mega-title">Loại sản phẩm</div><div class="mega-list">`;
                myChildren.forEach(child => {
                    childrenHTML += `<a href="#" onclick="filterByCategory(${child.id}, '${child.name}'); return false;">${child.name}</a>`;
                });
                childrenHTML += `</div></div>`;
            }

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

// HÀM TẠO THẺ SẢN PHẨM (GỘP CHUNG ĐỂ DỄ QUẢN LÝ)
function createProductCard(p) {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4 col-lg-3 mb-4"; 
    
    // Fake giá cũ tăng 15% để làm mồi nhử Marketing
    const oldPrice = Number(p.price) * 1.15; 
    
    // Placeholder ảnh thông minh báo tên shop nếu ảnh lỗi/chưa có
    const fallbackImg = "https://placehold.co/300x300/f8f9fa/a3a3a3?text=LinhLinh+Store";
    const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : fallbackImg;

    col.innerHTML = `
        <div class="card h-100 border-0 shadow-sm" style="border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 20px rgba(0,0,0,0.1)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)'">
            
            <div class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 small fw-bold shadow-sm" style="border-radius: 0 10px 10px 0; z-index: 2; margin-top: 10px;">
                <i class="fa-solid fa-fire-flame-curved"></i> Trợ giá
            </div>
            <div class="position-absolute top-0 end-0 bg-warning text-dark px-2 py-1 small fw-bold shadow-sm" style="border-radius: 10px 0 0 10px; z-index: 2; margin-top: 10px;">
                -15%
            </div>
            
            <a href="detail.html?id=${p.id}" class="text-center d-block position-relative p-4 bg-white">
                <img src="${imgUrl}" onerror="this.src='${fallbackImg}'" class="img-fluid" style="height: 160px; object-fit: contain; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.08)'" onmouseout="this.style.transform='scale(1)'" alt="${p.name}">
            </a>
            
            <div class="card-body d-flex flex-column" style="background-color: #fafafa;">
                <h5 class="card-title text-truncate mb-2" style="font-size: 15px;">
                    <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark fw-bold" title="${p.name}">${p.name}</a>
                </h5>
                
                <div class="d-flex align-items-center mb-1" style="font-size: 12px;">
                    <div class="text-warning me-1">
                        <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                    </div>
                    <span class="text-muted">(128)</span>
                </div>

                <div class="text-muted text-decoration-line-through small" style="font-size: 13px;">${oldPrice.toLocaleString('vi-VN')} đ</div>
                <div class="fw-bold text-danger mb-3" style="font-size: 18px;">${Number(p.price).toLocaleString('vi-VN')} đ</div>
                
                <div class="mt-auto d-flex gap-2">
                    <button onclick="buyNow(${p.id})" class="btn btn-danger flex-grow-1 fw-bold rounded-pill shadow-sm" style="font-size: 14px;">Mua Ngay</button>
                    <button onclick="addToCart(${p.id})" class="btn btn-outline-danger rounded-circle d-flex align-items-center justify-content-center shadow-sm" title="Thêm vào giỏ" style="width: 38px; height: 38px; flex-shrink: 0;">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    return col;
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

            if (categoryId && isParent && !keyword) {
                data = data.filter(p => p.category_id == categoryId || childIds.includes(p.category_id));
            }

            if (data.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Không tìm thấy sản phẩm nào.</p></div>`;
                return;
            }

            // Dùng hàm createProductCard mới viết
            data.forEach(p => {
                list.appendChild(createProductCard(p));
            });
        })
        .catch(err => console.error("Lỗi tải sản phẩm:", err));
}

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
        Swal.fire({
            title: 'Chưa đăng nhập!',
            text: "Bạn cần đăng nhập để thêm vào giỏ. Đến trang đăng nhập ngay?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Đăng nhập',
            cancelButtonText: 'Hủy'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = "login.html";
            }
        });
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
            Swal.fire('Hết hạn phiên!', 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.', 'error').then(() => {
                localStorage.clear();
                window.location.href = "login.html";
            });
            return;
        }
        return res.json();
    })
    .then(data => {
        if (data) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: data.message,
                showConfirmButton: false,
                timer: 3000
            });
            if (typeof window.updateCartCount === "function") {
                window.updateCartCount();
            }
        }
    })
    .catch(err => console.error("Lỗi:", err));
}

function filterByBrand(brandId, brandName) {
    const titleEl = document.querySelector("h3.text-uppercase"); 
    if (titleEl) titleEl.innerText = `Sản phẩm hãng: ${brandName}`;

    const list = document.getElementById("product-list");
    if (!list) return;
    
    list.innerHTML = `<div class="text-center py-5 w-100"><div class="spinner-border text-danger" role="status"></div></div>`;

    fetch(`${CONFIG.BASE_URL}/products`)
        .then(res => res.json())
        .then(data => {
            const filteredProducts = data.filter(p => p.brand_id == brandId);
            
            list.innerHTML = "";
            if (filteredProducts.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Chưa có sản phẩm nào thuộc hãng ${brandName}.</p></div>`;
                return;
            }

            // Dùng hàm createProductCard mới viết
            filteredProducts.forEach(p => {
                list.appendChild(createProductCard(p));
            });
        })
        .catch(err => console.error("Lỗi lọc hãng:", err));
}