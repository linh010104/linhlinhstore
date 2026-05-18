let currentProductId = null;
let basePrice = 0;               
let currentVariants = [];        
let selectedVariants = {};       

document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    currentProductId = params.get("id");

    if (!currentProductId) {
        UIHelper.showError("Lỗi", "Không tìm thấy sản phẩm!", () => {
            window.location.href = "index.html";
        });
        return;
    }

    loadProductDetail();
});

function loadProductDetail() {
    fetch(`${CONFIG.BASE_URL}/products/${currentProductId}`)
        .then(res => res.json())
        .then(data => {
            if (!data || data.message) return;

            document.getElementById("detail-name").innerText = data.name;
            if(document.getElementById("breadcrumb-name")) document.getElementById("breadcrumb-name").innerText = data.name;
            document.getElementById("detail-price").innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
            
            if (data.variants && data.variants.length > 0) renderVariants(data.variants, Number(data.price));

            // XỬ LÝ ĐỔ MÔ TẢ (DESCRIPTION) TỪ DATABASE XUỐNG BÀI VIẾT
            // Replace \n thành thẻ <br> để HTML hiểu và xuống dòng
            const descContainer = document.getElementById("detail-desc");
            if(descContainer) {
                if(data.description && data.description.trim() !== "") {
                    descContainer.innerHTML = data.description.replace(/\n/g, '<br>');
                } else {
                    descContainer.innerHTML = "Sản phẩm này chưa có mô tả chi tiết từ nhà cung cấp.";
                }
            }
            
            const mainImgUrl = data.image_url ? `${CONFIG.IMAGE_BASE_URL}${data.image_url}` : "https://placehold.co/400x400/f8f9fa/a3a3a3?text=No+Image";
            document.getElementById("detail-img").src = mainImgUrl;

            // Xử lý ảnh thumbnail
            const thumbContainer = document.getElementById("thumbnail-container");
            if (thumbContainer) {
                thumbContainer.innerHTML = ""; 
                let allImages = (data.images && data.images.length > 0) ? data.images : [{ image_url: data.image_url }];
                allImages.forEach(img => {
                    if (!img.image_url) return;
                    const fullUrl = `${CONFIG.IMAGE_BASE_URL}${img.image_url}`;
                    thumbContainer.innerHTML += `<img src="${fullUrl}" class="border rounded thumb-img shadow-sm" style="width: 70px; height: 70px; object-fit: cover; cursor: pointer; transition: 0.2s;" onclick="changeMainImage('${fullUrl}')">`;
                });
            }

            // Xử lý thông số kỹ thuật
            const specTable = document.getElementById("spec-table");
            if (specTable && data.specifications) {
                let htmlSpec = "<tbody>";
                data.specifications.split('\n').forEach(item => {
                    let parts = item.split(':'); 
                    if (parts.length >= 2) {
                        htmlSpec += `<tr><td class="text-muted w-25 ps-4 py-3" style="background-color: #f8f9fa;">${parts[0].trim()}</td><td class="fw-bold py-3 pe-4 text-dark">${parts.slice(1).join(':').trim()}</td></tr>`;
                    }
                });
                specTable.innerHTML = htmlSpec + "</tbody>";
            }

            loadRelatedProducts(data.category_id);
        }).catch(err => console.error(err));
}

function changeMainImage(url) {
    document.getElementById("detail-img").src = url;
}

function renderVariants(variants, defaultPrice) {
    basePrice = defaultPrice;
    currentVariants = variants;
    const container = document.getElementById("variants-container");
    const grouped = variants.reduce((acc, curr) => {
        if (!acc[curr.variant_group]) acc[curr.variant_group] = [];
        acc[curr.variant_group].push(curr);
        return acc;
    }, {});

    let html = "";
    for (const group in grouped) {
        html += `<div class="mb-4"><strong class="d-block mb-2 text-dark" style="font-size: 15px;">Chọn ${group}:</strong><div class="d-flex flex-wrap gap-2">`;
        grouped[group].forEach((v, index) => {
            const isOutOfStock = v.stock_quantity <= 0;
            if (!selectedVariants[group] && index === 0 && !isOutOfStock) selectedVariants[group] = v;
            const isSelected = selectedVariants[group]?.id === v.id;
            
            let boxStyle = isOutOfStock ? "border: 1px dashed #ccc; background: #f8f9fa; opacity: 0.5;" 
                        : (isSelected ? "border: 2px solid #d70018 !important; color: #d70018 !important;" : "border: 1px solid #dee2e6;");
            
            let clickEvent = isOutOfStock ? `onclick="UIHelper.showWarning('Hết hàng', 'Phiên bản này tạm hết!')"` : `onclick="selectVariant('${group}', ${v.id})"`;

            html += `<div class="p-2 rounded px-3 text-center" style="cursor: pointer; min-width: 120px; ${boxStyle}" ${clickEvent}>
                        <div class="fw-bold" style="font-size: 13px;">${v.variant_name}</div>
                        ${Number(v.additional_price) > 0 ? `<div style="font-size: 11px;">+${new Intl.NumberFormat('vi-VN').format(v.additional_price)}đ</div>` : ''}
                    </div>`;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
    updateTotalPrice(); 
}

function selectVariant(group, variantId) {
    selectedVariants[group] = currentVariants.find(v => v.id === variantId);
    renderVariants(currentVariants, basePrice); 
}

function updateTotalPrice() {
    let finalPrice = basePrice;
    for (const group in selectedVariants) finalPrice += Number(selectedVariants[group].additional_price);
    document.getElementById("detail-price").innerText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalPrice);
}

function loadRelatedProducts(catId) {
    fetch(`${CONFIG.BASE_URL}/products`)
    .then(res => res.json())
    .then(all => {
        const related = all.filter(p => p.category_id == catId && p.id != currentProductId).slice(0, 4);
        const container = document.getElementById("related-products");
        if(container && related.length > 0) {
            container.innerHTML = "";
            related.forEach(p => {
                const imgUrl = p.image_url ? `${CONFIG.IMAGE_BASE_URL}${p.image_url}` : "https://placehold.co/300x300";
                container.innerHTML += `
                    <div class="col-6 col-md-3">
                        <div class="card h-100 shadow-sm border-0 bg-white p-2">
                            <a href="detail.html?id=${p.id}"><img src="${imgUrl}" class="img-fluid" style="max-height: 160px; object-fit: contain;"></a>
                            <div class="card-body p-2 mt-2 text-center border-top">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark fw-bold small text-truncate d-block">${p.name}</a>
                                <p class="text-danger fw-bold mb-0">${new Intl.NumberFormat('vi-VN').format(p.price)}đ</p>
                            </div>
                        </div>
                    </div>`;
            });
        }
    }).catch(e => console.log(e));
}

function changeQty(amount) {
    const input = document.getElementById("qty-input");
    let val = parseInt(input.value) + amount;
    input.value = val < 1 ? 1 : val;
}

// Hàm thêm vào giỏ hàng
function addToCartFromDetail() {
    // 1. Kiểm tra đăng nhập (Dùng SweetAlert cho đẹp giống nút Mua Ngay)
    if (!StorageHelper.isLoggedIn()) {
        Swal.fire({
            title: 'Chưa đăng nhập!',
            text: "Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d70018',
            cancelButtonColor: '#6c757d',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Đăng nhập'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = "login.html";
        });
        return;
    }

    // 2. Lấy số lượng và phân loại
    const qty = parseInt(document.getElementById("qty-input").value);
    let variantNames = [];
    for (const group in selectedVariants) {
        if (selectedVariants[group]) variantNames.push(selectedVariants[group].variant_name);
    }

    // 3. Gửi API thêm vào giỏ
    API.post('/cart/add', { 
        productId: currentProductId, 
        quantity: qty, 
        variant_info: variantNames.join(" - ") || null 
    }, true)
    .then(data => { 
        // 4. Báo thành công
        UIHelper.showSuccess('Thành công', 'Đã thêm sản phẩm vào giỏ hàng!');
        
        // Cập nhật lại số lượng trên cục icon giỏ hàng ở Header (nếu ông có viết hàm này)
        if(typeof window.updateCartCount === 'function') window.updateCartCount(); 
    })
    .catch(e => {
        console.error(e);
        UIHelper.showError('Lỗi', 'Không thể thêm vào giỏ hàng, vui lòng thử lại.');
    });
}
function buyNowFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        Swal.fire({
            title: 'Chưa đăng nhập!',
            text: "Bạn cần đăng nhập để tiến hành mua ngay.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d70018',
            cancelButtonColor: '#6c757d',
            cancelButtonText: 'Hủy',
            confirmButtonText: 'Đăng nhập'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = "login.html";
        });
        return;
    }
    
    // Tự động điền thông tin người dùng
    const user = StorageHelper.getUser();
    const nameInput = document.getElementById("checkout-name");
    const phoneInput = document.getElementById("checkout-phone");
    
    if(nameInput) nameInput.value = user?.full_name || user?.username || "";
    if(phoneInput) phoneInput.value = user?.phone || "";

    // Gọi form Modal thanh toán an toàn
    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    } else {
        UIHelper.showError("Lỗi", "Không tìm thấy Form thanh toán trên trang!");
    }
}

// XÁC NHẬN ĐẶT HÀNG TỪ FORM
function submitDirectBuy() {
    const token = localStorage.getItem("token");
    const name = document.getElementById("checkout-name").value.trim();
    const phone = document.getElementById("checkout-phone").value.trim();
    const address = document.getElementById("checkout-address").value.trim();
    const payment = document.getElementById("checkout-payment").value;
    const note = document.getElementById("checkout-note").value.trim();
    const qty = parseInt(document.getElementById("qty-input").value);

    if (!name || !phone || !address) {
        UIHelper.showWarning("Thiếu thông tin", "Vui lòng điền đầy đủ Tên, Số điện thoại và Địa chỉ nhận hàng!");
        return;
    }

    let variantNames = [];
    for (const group in selectedVariants) {
        variantNames.push(selectedVariants[group].variant_name);
    }
    const variantInfoString = variantNames.length > 0 ? variantNames.join(" - ") : null;

    const data = {
        productId: currentProductId,
        quantity: qty,
        variant_info: variantInfoString, 
        name: name,
        phone: phone,
        address: address,
        payment_method: payment,
        note: note
    };

    // Đổi nút thành Đang xử lý để tránh click nhiều lần
    const btnSubmit = document.querySelector("#checkoutModal .btn-danger");
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    btnSubmit.disabled = true;

    fetch(`${CONFIG.BASE_URL}/orders/direct-buy`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json", 
            "Authorization": "Bearer " + token 
        },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(d => {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (d.orderId) {
            UIHelper.showSuccess("Thành công!", "🎉 Đặt hàng thành công! Đã lên đơn tự động.", () => {
                const modalEl = document.getElementById('checkoutModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
                window.location.href = "orders.html";
            });
        } else {
            UIHelper.showError("Lỗi", d.message || "Lỗi khi đặt hàng");
        }
    })
    .catch(e => {
        console.error(e);
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;
        UIHelper.showError("Lỗi", "Lỗi kết nối tới máy chủ.");
    });
}