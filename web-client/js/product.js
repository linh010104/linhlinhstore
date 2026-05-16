document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    // Thay loadProducts() bằng hàm Load phân lô CellphoneS
    loadHomeCategoryBlocks(); 
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

function createProductCard(p) {
   const col = document.createElement("div");
    // Chia 4 cột trên màn XL, 3 cột màn LG
    col.className = "col-6 col-md-4 col-lg-4 col-xl-3 mb-3"; 
    
    const oldPrice = Number(p.price) * 1.15; 
    const fallbackImg = "https://placehold.co/300x300/f8f9fa/a3a3a3?text=LinhLinh+Store";
    const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : fallbackImg;

    col.innerHTML = `
        <div class="card h-100 border-0 shadow-sm cps-card bg-white" style="border-radius: 12px; overflow: hidden;">
            
            <div class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 fw-bold shadow-sm" style="border-radius: 12px 0 10px 0; z-index: 2; font-size: 11px;">
                Giảm 15%
            </div>
            <div class="position-absolute top-0 end-0 px-2 py-1 fw-bold text-primary border border-primary bg-white shadow-sm" style="border-radius: 4px; z-index: 2; margin: 8px; font-size: 10px;">
                Trả góp 0%
            </div>
            
            <a href="detail.html?id=${p.id}" class="text-center d-block position-relative p-3 mt-3">
                <img src="${imgUrl}" onerror="this.src='${fallbackImg}'" class="img-fluid cps-img" alt="${p.name}">
            </a>
            
            <div class="card-body d-flex flex-column p-3 pt-0">
                <h5 class="card-title mb-2 cps-title">
                    <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark fw-bold" title="${p.name}">${p.name}</a>
                </h5>

                <div class="mt-auto">
                    <div class="d-flex align-items-end gap-2 mb-2">
                        <span class="fw-bold text-danger mb-0" style="font-size: 16px;">${Number(p.price).toLocaleString('vi-VN')}đ</span>
                        <span class="text-muted text-decoration-line-through" style="font-size: 12px;">${oldPrice.toLocaleString('vi-VN')}đ</span>
                    </div>

                    <div class="bg-light rounded p-2 mb-3 border" style="font-size: 11px; color: #444;">
                        Liên hệ hotline 1800.6969 để nhận Voucher lên đời tới 3 triệu đồng
                    </div>

                    <div class="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                        <div class="text-warning" style="font-size: 11px;">
                            <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star-half-stroke"></i>
                        </div>
                        <div class="d-flex gap-3">
                        <button class="btn btn-sm text-secondary border-0 p-0 hover-danger" style="font-size: 12px;" onclick="event.preventDefault(); toggleFavorite(${p.id}, '${p.name.replace(/'/g, "\\'")}', '${imgUrl}', ${p.price})">
                            <i class="fa-regular fa-heart"></i> Yêu thích
                        </button>
                            <button class="btn btn-sm text-danger border-0 p-0 hover-danger" style="font-size: 12px;" onclick="addToCart(${p.id})">
                                <i class="fa-solid fa-cart-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    return col;
}

function showFilterArea(titleText) {
    const homeBlocks = document.getElementById("home-blocks-area");
    const filterArea = document.getElementById("filter-result-area");
    const title = document.getElementById("page-title");
    
    if (homeBlocks) homeBlocks.style.display = "none";
    if (filterArea) filterArea.style.display = "block";
    if (title && titleText) title.innerText = titleText;
}

// TẢI SẢN PHẨM PHÂN LÔ CELLPHONES
function loadHomeCategoryBlocks() {
    const homeBlocksArea = document.getElementById("home-blocks-area");
    if (!homeBlocksArea) return;
    
    homeBlocksArea.innerHTML = `<div class="text-center py-5 w-100"><div class="spinner-border text-danger"></div></div>`;

    // Chỉ cần gọi lấy Sản phẩm thôi
    fetch(`${CONFIG.BASE_URL}/products`)
    .then(res => res.json())
    .then(allProducts => {
        homeBlocksArea.innerHTML = ""; // Xóa vòng quay loading

        // Chỉ lấy các danh mục cha (Điện thoại, Laptop...)
        const parentCategories = allCategoriesData.filter(c => !c.parent_id);

        parentCategories.forEach(category => {
            // Lọc 4 sản phẩm đầu tiên của danh mục
            const products = allProducts.filter(p => 
                p.category_id == category.id || 
                allCategoriesData.some(child => child.parent_id == category.id && child.id == p.category_id)
            ).slice(0, 4);

            if (products.length === 0) return; // Nếu danh mục chưa có sản phẩm thì không vẽ

            // 1. Tạo giao diện trước với ảnh mặc định (Placeholder)
            const fallbackUrl = `https://placehold.co/300x650/d70018/ffffff?text=${encodeURIComponent(category.name)}`;
            
            const blockHTML = `
                <div class="category-block mb-5">
                    <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-danger pb-2">
                        <h3 class="fw-bold text-dark text-uppercase fs-5 mb-0">${category.name}</h3>
                        <a href="#" class="text-decoration-none text-danger small" onclick="filterByCategory(${category.id}, '${category.name}'); return false;">Xem tất cả <i class="fa-solid fa-chevron-right ms-1" style="font-size: 10px;"></i></a>
                    </div>
                    
                    <div class="row g-2">
                        <div class="col-xl-2 col-lg-3 d-none d-lg-block">
                            <a href="#" id="banner-link-${category.id}" class="d-block h-100 overflow-hidden rounded-3 vertical-banner-wrapper">
                                <img id="banner-img-${category.id}" src="${fallbackUrl}" class="img-fluid w-100 h-100 object-fit-cover vertical-banner" style="border-radius: 8px;">
                            </a>
                        </div>
                        
                        <div class="col-xl-10 col-lg-9 col-12">
                            <div class="row g-2" id="dynamic-block-${category.id}"></div>
                        </div>
                    </div>
                </div>
            `;

            homeBlocksArea.insertAdjacentHTML('beforeend', blockHTML);

            // Bơm 4 sản phẩm vào
            const container = document.getElementById(`dynamic-block-${category.id}`);
            products.forEach(p => container.appendChild(createProductCard(p)));

            // 2. GỌI API LẤY BANNER XỊN ĐỂ GHI ĐÈ LÊN ẢNH MẶC ĐỊNH
            fetch(`${CONFIG.BASE_URL}/banners/VERTICAL_CATEGORY_${category.id}`)
                .then(res => res.json())
                .then(banners => {
                    // Nếu Backend trả về mảng có banner
                    if(banners && banners.length > 0) {
                        const imgEl = document.getElementById(`banner-img-${category.id}`);
                        const linkEl = document.getElementById(`banner-link-${category.id}`);
                        
                        if(imgEl) imgEl.src = `${CONFIG.IMAGE_BASE_URL}${banners[0].image_url}`;
                        if(linkEl && banners[0].link_url) linkEl.href = banners[0].link_url;
                    }
                })
                .catch(e => console.log("Danh mục này chưa được upload Banner dọc", e));
        });
    })
    .catch(err => {
        console.error("Lỗi load Home Blocks:", err);
        homeBlocksArea.innerHTML = `<p class="text-danger text-center">Lỗi tải dữ liệu!</p>`;
    });
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

            data.forEach(p => {
                list.appendChild(createProductCard(p));
            });
        })
        .catch(err => console.error("Lỗi tải sản phẩm:", err));
}

function searchProduct() {
    const keyword = document.getElementById("search-input").value;
    showFilterArea(`Kết quả tìm kiếm: "${keyword}"`);
    loadProducts(keyword, null); 
}

function filterByCategory(id, name) {
    if (!id) {
        // Tắt bộ lọc, trở về trang chủ phân lô
        const homeBlocks = document.getElementById("home-blocks-area");
        const filterArea = document.getElementById("filter-result-area");
        if (homeBlocks) homeBlocks.style.display = "block";
        if (filterArea) filterArea.style.display = "none";
        loadHomeCategoryBlocks();
    } else {
        showFilterArea(`Sản phẩm: ${name}`);
        loadProducts("", id); 
    }
}

function filterByBrand(brandId, brandName) {
    showFilterArea(`Sản phẩm hãng: ${brandName}`);

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

            filteredProducts.forEach(p => {
                list.appendChild(createProductCard(p));
            });
        })
        .catch(err => console.error("Lỗi lọc hãng:", err));
}

function addToCart(productId) {
    const token = localStorage.getItem("token");
    if (!token) {
        Swal.fire({
            title: 'Chưa đăng nhập!',
            text: "Bạn cần đăng nhập để thêm vào giỏ. Đến trang đăng nhập ngay?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d70018',
            cancelButtonColor: '#6c757d',
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
                title: data.message || 'Thêm thành công!',
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

function buyNow(id) {
    if(typeof window.buyNow === "function" && typeof UIHelper !== "undefined") {
        UIHelper.showWarning('Thông báo', 'Vui lòng vào chi tiết sản phẩm để mua ngay!');
    }
}
function toggleFavorite(id, name, image, price) {
    // Lấy danh sách hiện tại từ LocalStorage (nếu chưa có thì tạo mảng rỗng)
    let favs = JSON.parse(localStorage.getItem('linhlinh_favorites')) || [];
    
    // Kiểm tra xem sản phẩm đã có trong danh sách chưa
    const index = favs.findIndex(item => item.id === id);
    
    if(index === -1) {
        // Nếu chưa có -> Thêm vào
        favs.push({ id, name, image, price });
        if(typeof UIHelper !== 'undefined') {
            UIHelper.showSuccess('Tuyệt vời!', `Đã thêm <b>${name}</b> vào danh sách yêu thích.`);
        }
    } else {
        // Nếu có rồi -> Xóa đi (Bỏ thích)
        favs.splice(index, 1);
        if(typeof UIHelper !== 'undefined') {
            UIHelper.showSuccess('Đã bỏ thích', `Đã xóa <b>${name}</b> khỏi danh sách yêu thích.`);
        }
    }
    
    // Lưu ngược lại vào trình duyệt
    localStorage.setItem('linhlinh_favorites', JSON.stringify(favs));
}