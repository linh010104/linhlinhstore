fetch("http://localhost:3000/api/products")
  .then(res => res.json())
  .then(data => {
    const list = document.getElementById("product-list");
    list.innerHTML = "";

    data.forEach(p => {
      // Tạo cột cho Grid System của Bootstrap
      const col = document.createElement("div");
      col.className = "col-6 col-md-4 col-lg-3"; 

      const imgUrl = p.image_url
        ? `http://localhost:3000${p.image_url}` 
        : "https://via.placeholder.com/300x300?text=No+Image";

      // Render thẻ Card Bootstrap
      // LƯU Ý: Đã thêm sự kiện onclick="addToCart(${p.id})" vào nút button bên dưới
      col.innerHTML = `
        <div class="card card-product h-100">
            <div class="position-relative">
                <span class="badge bg-danger position-absolute top-0 start-0 m-2"></span>
                <img src="${imgUrl}" class="card-img-top" alt="${p.name}">
            </div>
            <div class="card-body d-flex flex-column">
                <h5 class="card-title text-truncate" title="${p.name}">${p.name}</h5>
                <p class="card-text text-muted small flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${p.description || "Sản phẩm chính hãng chất lượng cao."}
                </p>
                <div class="mt-auto">
                    <p class="price-tag mb-2">${Number(p.price).toLocaleString()} VNĐ </p>
                    
                    <button onclick="addToCart(${p.id})" class="btn btn-primary w-100 rounded-pill">
                        <i class="fa-solid fa-cart-plus me-1"></i> Thêm vào giỏ
                    </button>
                    
                </div>
            </div>
        </div>
      `;

      list.appendChild(col);
    });
  })
  .catch(err => console.error("Lỗi tải sản phẩm:", err));


// 2. Hàm xử lý thêm vào giỏ hàng
function addToCart(productId) {
    const token = localStorage.getItem("token");

    // Kiểm tra xem đã đăng nhập chưa
    if (!token) {
        if (confirm("Bạn cần đăng nhập để mua hàng. Đến trang đăng nhập ngay?")) {
            window.location.href = "login.html";
        }
        return;
    }

    // Gọi API thêm vào giỏ
    fetch("http://localhost:3000/api/cart/add", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token 
        },
        body: JSON.stringify({
            productId: productId,
            quantity: 1
        })
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
            alert(data.message); // Hiện thông báo từ server

            if (typeof updateCartCount === "function") {
                updateCartCount();
            }
        }
    })
    
    .catch(err => console.error("Lỗi:", err));
}
document.addEventListener("DOMContentLoaded", () => {
    loadCategories();
    loadProducts(); // Mặc định load tất cả
});

// --- 1. HÀM LOAD DANH MỤC ---
function loadCategories() {
    fetch("http://localhost:3000/api/categories")
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("category-list");
            // Thêm mục "Tất cả" đầu tiên
            list.innerHTML = `<li class="list-group-item list-group-item-action fw-bold" style="cursor:pointer" onclick="filterByCategory(null, 'Tất cả sản phẩm')">Tất cả</li>`;

            data.forEach(c => {
                const li = document.createElement("li");
                li.className = "list-group-item list-group-item-action";
                li.style.cursor = "pointer";
                li.innerHTML = `<i class="fa-solid fa-chevron-right me-2 text-muted small"></i> ${c.name}`;
                
                // Bấm vào danh mục thì gọi hàm lọc
                li.onclick = () => filterByCategory(c.id, c.name);
                list.appendChild(li);
            });
        })
        .catch(err => console.error("Lỗi load danh mục (Kiểm tra lại Route backend):", err));
}

// --- 2. HÀM LOAD SẢN PHẨM (Có hỗ trợ filter) ---
function loadProducts(keyword = "", categoryId = "") {
    // Tạo URL API kèm tham số
    let url = "http://localhost:3000/api/products?";
    
    if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
    if (categoryId) url += `category_id=${categoryId}`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById("product-list");
            list.innerHTML = "";

            if (data.length === 0) {
                list.innerHTML = `<div class="col-12 text-center mt-5"><p class="text-muted">Không tìm thấy sản phẩm nào.</p></div>`;
                return;
            }

            data.forEach(p => {
                const col = document.createElement("div");
                // Chú ý: Cột bên phải nhỏ hơn nên dùng col-lg-4 (3 sản phẩm/hàng)
                col.className = "col-6 col-md-4"; 

                const imgUrl = p.image_url ? `http://localhost:3000${p.image_url}` : "https://via.placeholder.com/300x300";

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

// Tìm kiếm
function searchProduct() {
    const keyword = document.getElementById("search-input").value;
    document.getElementById("page-title").innerText = `Kết quả tìm kiếm: "${keyword}"`;
    loadProducts(keyword, null); // Gọi hàm load với từ khóa, category để null
}

// Lọc theo danh mục
function filterByCategory(id, name) {
    document.getElementById("page-title").innerText = name;
    loadProducts("", id); // Gọi hàm load không từ khóa, có id danh mục
}

// Thêm vào giỏ hàng (Code cũ của bạn, giữ nguyên logic)
function addToCart(productId) {
    const token = localStorage.getItem("token");
    if (!token) {
        if(confirm("Bạn cần đăng nhập để mua hàng. Đến trang đăng nhập ngay?")) {
            window.location.href="login.html";
        }
        return;
    }
    fetch("http://localhost:3000/api/cart/add", {
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": "Bearer "+token },
        body: JSON.stringify({ productId: productId, quantity: 1 })
    })
    .then(r => r.json())
    .then(d => { 
        alert(d.message); 
        // Cập nhật số lượng trên header nếu hàm đó tồn tại (trong auth.js)
        if(window.updateCartCount) window.updateCartCount(); 
    })
    .catch(e => console.error(e));
}