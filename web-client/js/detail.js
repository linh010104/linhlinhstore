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
            if (!data || data.message) {
                UIHelper.showError("Lỗi", "Sản phẩm không tồn tại", () => {
                    window.location.href = "index.html";
                });
                return;
            }

            // Điền thông tin cơ bản
            document.getElementById("detail-name").innerText = data.name;
            if(document.getElementById("breadcrumb-name")) {
                document.getElementById("breadcrumb-name").innerText = data.name;
            }
            
            const catName = data.category_name || "Sản phẩm";
            document.getElementById("detail-category").innerText = catName;

            const price = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.price);
            document.getElementById("detail-price").innerText = price;
            
            // Vẽ dải nút phiên bản
            if (data.variants && data.variants.length > 0) {
                renderVariants(data.variants, Number(data.price));
            }

            document.getElementById("detail-desc").innerText = data.description || "Chưa có mô tả chi tiết.";
            
            // Xử lý ảnh
            const mainImgUrl = data.image_url ? `${CONFIG.IMAGE_BASE_URL}${data.image_url}` : "https://via.placeholder.com/500?text=No+Image";
            document.getElementById("detail-img").src = mainImgUrl;

            const thumbContainer = document.getElementById("thumbnail-container");
            if (thumbContainer) {
                thumbContainer.innerHTML = ""; 
                let allImages = (data.images && data.images.length > 0) ? data.images : [{ image_url: data.image_url }];

                allImages.forEach(img => {
                    if (!img.image_url) return;
                    const fullUrl = `${CONFIG.IMAGE_BASE_URL}${img.image_url}`;
                    
                    const thumbHtml = `
                        <img src="${fullUrl}" 
                             class="border rounded thumb-img shadow-sm" 
                             style="width: 70px; height: 70px; object-fit: cover; cursor: pointer; transition: 0.2s;" 
                             onclick="changeMainImage('${fullUrl}')"
                             onmouseover="this.style.borderColor='#0d6efd'"
                             onmouseout="this.style.borderColor='#dee2e6'">
                    `;
                    thumbContainer.innerHTML += thumbHtml;
                });
            }

            // XỬ LÝ BẢNG THÔNG SỐ KỸ THUẬT
            const specTable = document.getElementById("spec-table");
            if (specTable) {
                if (data.specifications && data.specifications.trim() !== "") {
                    const specs = data.specifications.split('\n'); 
                    let htmlSpec = "<tbody>";
                    specs.forEach(item => {
                        let parts = item.split(':'); 
                        
                        if (parts.length >= 2) {
                            htmlSpec += `
                                <tr>
                                    <td class="text-muted w-25 ps-4 py-3" style="background-color: #f8f9fa;">${parts[0].trim()}</td>
                                    <td class="fw-bold py-3 pe-4">${parts.slice(1).join(':').trim()}</td>
                                </tr>
                            `;
                        } else if (item.trim() !== "") {
                            htmlSpec += `<tr><td colspan="2" class="ps-4 py-3 fw-semibold bg-light">${item.trim()}</td></tr>`;
                        }
                    });
                    htmlSpec += "</tbody>";
                    specTable.innerHTML = htmlSpec;
                } else {
                    specTable.innerHTML = `<tbody><tr><td class="text-muted text-center py-4">Sản phẩm chưa có thông số kỹ thuật chi tiết.</td></tr></tbody>`;
                }
            }

            loadRelatedProducts(data.category_id);
        })
        .catch(err => console.error(err));
}

function changeMainImage(url) {
    const mainImg = document.getElementById("detail-img");
    mainImg.style.opacity = 0.5;
    setTimeout(() => {
        mainImg.src = url;
        mainImg.style.opacity = 1; 
    }, 150);
}

function renderVariants(variants, defaultPrice) {
    basePrice = defaultPrice;
    currentVariants = variants;
    const container = document.getElementById("variants-container");
    
    // Gom nhóm các phiên bản
    const grouped = variants.reduce((acc, curr) => {
        if (!acc[curr.variant_group]) acc[curr.variant_group] = [];
        acc[curr.variant_group].push(curr);
        return acc;
    }, {});

    let html = "";
    for (const group in grouped) {
        html += `<div class="mb-4">
                    <strong class="d-block mb-2 text-dark" style="font-size: 15px;">Chọn ${group}:</strong>
                    <div class="d-flex flex-wrap gap-2">`;
        
        grouped[group].forEach((v, index) => {
            const isOutOfStock = v.stock_quantity <= 0;
            
            if (!selectedVariants[group] && index === 0 && !isOutOfStock) {
                selectedVariants[group] = v;
            }

            const isSelected = selectedVariants[group]?.id === v.id;
            
            let boxStyle = "border: 1px solid #dee2e6; color: #444; background: #fff;";
            let checkIcon = "";
            let opacity = "1";
            let strikeThrough = "";
            let clickEvent = `onclick="selectVariant('${group}', ${v.id})"`;

            if (isOutOfStock) {
                boxStyle = "border: 1px dashed #ccc; background: #f8f9fa; color: #999;";
                opacity = "0.5";
                strikeThrough = "text-decoration-line-through";
                // Đổi alert thành UIHelper
                clickEvent = `onclick="UIHelper.showWarning('Hết hàng', 'Phiên bản này đang tạm hết hàng!')"`;
            } else if (isSelected) {
                boxStyle = "border: 2px solid #d70018 !important; color: #d70018 !important; background: #fff; position: relative;";
                checkIcon = `<div style="position: absolute; right: -1px; bottom: -1px; width: 16px; height: 16px; background: #d70018; clip-path: polygon(100% 0, 0% 100%, 100% 100%);">
                    <i class="fa-solid fa-check text-white" style="font-size: 8px; position: absolute; bottom: 2px; right: 2px;"></i>
                </div>`;
            }

            const btnPrice = basePrice + Number(v.additional_price);
            const imgHtml = v.image_url ? `<img src="${CONFIG.IMAGE_BASE_URL}${v.image_url}" style="width:24px; height:24px; object-fit:cover;" class="rounded me-2 border">` : "";

            html += `
                <div class="p-2 rounded px-3 d-flex align-items-center justify-content-center" 
                     style="cursor: ${isOutOfStock ? 'not-allowed' : 'pointer'}; min-width: 120px; transition: 0.2s; user-select: none; opacity: ${opacity}; ${boxStyle}"
                     ${clickEvent}>
                    ${imgHtml}
                    <div class="text-center">
                        <div class="fw-bold ${strikeThrough}" style="font-size: 13px;">${v.variant_name}</div>
                        ${Number(v.additional_price) > 0 ? `<div style="font-size: 11px;">+${new Intl.NumberFormat('vi-VN').format(v.additional_price)}đ</div>` : ''}
                    </div>
                    ${checkIcon}
                </div>
            `;
        });
        html += `</div></div>`;
    }
    container.innerHTML = html;
    updateTotalPrice(); 

    const highlightBox = document.getElementById("highlight-features");
    if (highlightBox) {
        highlightBox.innerHTML = `
            <div class="card border-0 shadow-sm rounded-3 p-3 mb-4" style="background: #fdf2f2; border-left: 5px solid #d70018 !important;">
                <h6 class="fw-bold text-danger mb-2"><i class="fa-solid fa-fire-flame-curved me-1"></i> Ưu đãi & Điểm nổi bật</h6>
                <ul class="small mb-0 ps-3 text-dark" style="line-height: 1.6;">
                    <li>Bảo hành chính hãng 12 tháng tại LINHLINH Store.</li>
                    <li>Lỗi 1 đổi 1 trong 30 ngày nếu có lỗi phần cứng từ NSX.</li>
                    <li>Giao hàng hỏa tốc trong 2 giờ (Nội thành Hà Nội).</li>
                    <li>Giảm thêm 5% tối đa 500k khi thanh toán qua VNPay.</li>
                </ul>
            </div>
        `;
    }
}

function selectVariant(group, variantId) {
    selectedVariants[group] = currentVariants.find(v => v.id === variantId);
    renderVariants(currentVariants, basePrice); 
}

function updateTotalPrice() {
    let finalPrice = basePrice;
    for (const group in selectedVariants) {
        finalPrice += Number(selectedVariants[group].additional_price);
    }
    const priceText = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalPrice);
    document.getElementById("detail-price").innerText = priceText;
}

function loadRelatedProducts(catId) {
    const container = document.getElementById("related-products");
    if (!container) return; 
    
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

function changeQty(amount) {
    const input = document.getElementById("qty-input");
    let val = parseInt(input.value) + amount;
    if (val < 1) val = 1;
    input.value = val;
}

// CHỨC NĂNG THÊM GIỎ HÀNG
function addToCartFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        UIHelper.showConfirm(
            'Chưa đăng nhập!',
            'Bạn cần đăng nhập để thêm sản phẩm vào giỏ. Đến trang đăng nhập ngay?',
            'Đăng nhập',
            'Hủy',
            () => { window.location.href = "login.html"; }
        );
        return;
    }
    
    const qty = parseInt(document.getElementById("qty-input").value);
    
    let variantNames = [];
    for (const group in selectedVariants) {
        variantNames.push(selectedVariants[group].variant_name);
    }
    const variantInfoString = variantNames.length > 0 ? variantNames.join(" - ") : null;

    fetch(`${CONFIG.BASE_URL}/cart/add`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": "Bearer "+token },
        body: JSON.stringify({ 
            productId: currentProductId, 
            quantity: qty,
            variant_info: variantInfoString 
        })
    })
    .then(r => r.json())
    .then(d => { 
        UIHelper.showSuccess('Thành công!', d.message || `Đã thêm vào giỏ thành công!`); 
        if(window.updateCartCount) window.updateCartCount(); 
    })
    .catch(e => console.error(e));
}

// CHỨC NĂNG MUA NGAY
function buyNowFromDetail() {
    const token = localStorage.getItem("token");
    if (!token) {
        UIHelper.showConfirm(
            'Chưa đăng nhập!',
            'Bạn cần đăng nhập để tiến hành mua ngay. Đến trang đăng nhập ngay?',
            'Đăng nhập',
            'Hủy',
            () => { window.location.href = "login.html"; }
        );
        return;
    }
    
    if(typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('checkoutModal'));
        modal.show();
    } else {
        UIHelper.showError("Lỗi", "Hệ thống đang gặp sự cố hiển thị.");
    }
}

// XỬ LÝ KHI BẤM XÁC NHẬN MUA NGAY TRÊN MODAL
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
        if (d.orderId) {
            UIHelper.showSuccess("Thành công!", "🎉 Đặt hàng thành công! Đã lên đơn tự động.", () => {
                const modalEl = document.getElementById('checkoutModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();
                window.location.href = "orders.html";
            });
        } else {
            UIHelper.showError("Lỗi", d.message || "Lỗi khi đặt hàng");
        }
    })
    .catch(e => {
        console.error(e);
        UIHelper.showError("Lỗi", "Lỗi kết nối tới máy chủ.");
    });
}