let currentProductId = null;
let currentVariants = [];        
let selectedVariants = {};   

let currentCheckoutSubtotal = 0;
let appliedVoucherCode = null;
let appliedDiscountAmount = 0;    

// Đưa các biến giá trị ra toàn cục để dễ tính toán
let globalOriginalPrice = 0;
let globalDiscountPercent = 0;
let currentFinalPrice = 0;
let globalStockQuantity = 0;

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
            
            // 🔥 LOGIC GIÁ KHUYẾN MÃI MỚI 🔥
            globalOriginalPrice = Number(data.price);
            globalDiscountPercent = data.discount_percent ? Number(data.discount_percent) : 0;
            globalStockQuantity = Number(data.stock_quantity);
            
            // Gọi hàm tính tiền để nó tự động vẽ Giá gạch ngang và Badge giảm giá
            updateTotalPrice();
            
            // 🔥 LƯU VẾT HÀNH VI KHÁCH HÀNG VÀO TRÌNH DUYỆT 🔥
            if (data.category_id) {
                let viewedCats = JSON.parse(localStorage.getItem('viewed_categories')) || [];
                if (!viewedCats.includes(data.category_id)) {
                    viewedCats.unshift(data.category_id); 
                    if (viewedCats.length > 5) viewedCats.pop(); 
                    localStorage.setItem('viewed_categories', JSON.stringify(viewedCats));
                }
            }

            const btnBuyNow = document.querySelector(".btn-danger"); 
            const btnAddToCart = document.querySelector(".btn-outline-danger"); 
            const qtyControl = document.querySelector(".input-group"); 

            if (data.stock_quantity <= 0) {
                if (btnBuyNow) {
                    btnBuyNow.disabled = true;
                    btnBuyNow.innerHTML = "ĐÃ HẾT HÀNG";
                    btnBuyNow.classList.replace("btn-danger", "btn-secondary"); 
                }
                if (btnAddToCart) {
                    btnAddToCart.disabled = true;
                    btnAddToCart.innerHTML = '<i class="fa-solid fa-cart-shopping"></i> Tạm Hết Hàng';
                    btnAddToCart.classList.replace("text-danger", "text-secondary");
                    btnAddToCart.style.borderColor = "#6c757d";
                }
                if (qtyControl) {
                    qtyControl.style.opacity = "0.5";
                    qtyControl.style.pointerEvents = "none"; 
                }
            }
            
            if (data.variants && data.variants.length > 0) renderVariants(data.variants);

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

function renderVariants(variants) {
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
    renderVariants(currentVariants); 
}

function updateTotalPrice() {
    let addedVariantPrice = 0;
    
    // Cộng thêm tiền nếu khách chọn Option xịn hơn
    for (const group in selectedVariants) {
        if (selectedVariants[group]) {
            addedVariantPrice += Number(selectedVariants[group].additional_price);
        }
    }
    
    // Giá trị thực (Giá gốc + Giá Option)
    const finalOriginalPrice = globalOriginalPrice + addedVariantPrice;
    
    // Giá sau khi áp dụng % giảm giá
    currentFinalPrice = finalOriginalPrice - (finalOriginalPrice * globalDiscountPercent / 100);

    // Dựng cục HTML hiển thị cho Khách xem
    let priceHtml = `${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(currentFinalPrice)}`;
    
    if (globalDiscountPercent > 0) {
        priceHtml += ` <span class="text-muted text-decoration-line-through fs-5 fw-normal ms-3">${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(finalOriginalPrice)}</span>`;
        priceHtml += ` <span class="badge bg-danger ms-2 fs-6 mb-2 align-middle">Giảm ${globalDiscountPercent}%</span>`;
    }
    
    document.getElementById("detail-price").innerHTML = priceHtml;
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
                
                // Đồng bộ giá giảm cho danh sách Liên Quan
                const oPrice = Number(p.price);
                const dPercent = p.discount_percent ? Number(p.discount_percent) : 0;
                const sPrice = oPrice - (oPrice * dPercent / 100);

                container.innerHTML += `
                    <div class="col-6 col-md-3">
                        <div class="card h-100 shadow-sm border-0 bg-white p-2">
                            ${dPercent > 0 ? `<div class="position-absolute top-0 start-0 bg-danger text-white px-2 py-1 fw-bold" style="font-size:10px; border-radius:5px 0 5px 0;">Giảm ${dPercent}%</div>` : ''}
                            <a href="detail.html?id=${p.id}"><img src="${imgUrl}" class="img-fluid" style="max-height: 160px; object-fit: contain;"></a>
                            <div class="card-body p-2 mt-2 text-center border-top">
                                <a href="detail.html?id=${p.id}" class="text-decoration-none text-dark fw-bold small text-truncate d-block">${p.name}</a>
                                <p class="text-danger fw-bold mb-0">${new Intl.NumberFormat('vi-VN').format(sPrice)}đ</p>
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
    
    // 1. Chặn không cho mua dưới 1 cái
    if (val < 1) {
        val = 1;
    }
    
    // 2. Chặn không cho mua VƯỢT QUÁ SỐ LƯỢNG TRONG KHO (Lấy trực tiếp từ DB)
    if (val > globalStockQuantity) {
        // Tắt thông báo rườm rà, chỉ cần không tăng số lượng lên nữa là đủ hiểu
        val = globalStockQuantity;
        UIHelper.showWarning("Hết giới hạn", `Shop chỉ còn đúng ${globalStockQuantity} sản phẩm trong kho!`);
    }
    
    input.value = val;
}

function addToCartFromDetail() {
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

    const qty = parseInt(document.getElementById("qty-input").value);
    let variantNames = [];
    for (const group in selectedVariants) {
        if (selectedVariants[group]) variantNames.push(selectedVariants[group].variant_name);
    }

    API.post('/cart/add', { 
        productId: currentProductId, 
        quantity: qty, 
        variant_info: variantNames.join(" - ") || null 
    }, true)
    .then(data => { 
        UIHelper.showSuccess('Thành công', 'Đã thêm sản phẩm vào giỏ hàng!');
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
            title: 'Chưa đăng nhập!', text: "Bạn cần đăng nhập để tiến hành mua ngay.", icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d70018', cancelButtonColor: '#6c757d',
            cancelButtonText: 'Hủy', confirmButtonText: 'Đăng nhập'
        }).then((result) => { if (result.isConfirmed) window.location.href = "login.html"; });
        return;
    }
    
    const user = StorageHelper.getUser();
    if(document.getElementById("checkout-name")) document.getElementById("checkout-name").value = user?.full_name || user?.username || "";
    if(document.getElementById("checkout-phone")) document.getElementById("checkout-phone").value = user?.phone || "";
    if(document.getElementById("checkout-email")) document.getElementById("checkout-email").value = user?.email || "";

    // Reset lại Voucher mỗi lần mở Form
    appliedVoucherCode = null;
    appliedDiscountAmount = 0;
    document.getElementById("checkout-voucher-code").value = "";
    document.getElementById("voucher-message").innerHTML = "";
    document.getElementById("checkout-discount-row").classList.add("d-none");

    // Tính toán Tạm tính
    const qty = parseInt(document.getElementById("qty-input").value);
    currentCheckoutSubtotal = currentFinalPrice * qty;

    // Cập nhật lên Giao diện
    document.getElementById("checkout-qty-display").innerText = qty;
    document.getElementById("checkout-subtotal").innerText = UIHelper.formatPrice(currentCheckoutSubtotal);
    document.getElementById("checkout-final-total").innerText = UIHelper.formatPrice(currentCheckoutSubtotal);

    const modalEl = document.getElementById('checkoutModal');
    if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modal.show();
    }
}

// 🔥 HÀM MỚI: XỬ LÝ KIỂM TRA MÃ VOUCHER
function applyVoucher() {
    const code = document.getElementById("checkout-voucher-code").value.trim().toUpperCase();
    const msgBox = document.getElementById("voucher-message");

    if (!code) {
        msgBox.innerHTML = '<span class="text-danger"><i class="fa-solid fa-circle-xmark"></i> Vui lòng nhập mã Voucher!</span>';
        return;
    }

    msgBox.innerHTML = '<span class="text-muted"><span class="spinner-border spinner-border-sm me-1"></span> Đang kiểm tra mã...</span>';

    // Gọi API Backend để check mã có tồn tại và thỏa mãn điều kiện Min_Order không
    API.post('/vouchers/check', { 
        code: code, 
        order_total: currentCheckoutSubtotal // Gửi tổng tiền lên để Backend so sánh với min_order_value
    }, true)
    .then(res => {
        if (res.success || res.discount_amount) {
            appliedVoucherCode = code;
            appliedDiscountAmount = Number(res.discount_amount);

            // Cập nhật giao diện khi áp mã thành công
            msgBox.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check"></i> Đã áp dụng mã giảm ${UIHelper.formatPrice(appliedDiscountAmount)}!</span>`;
            document.getElementById("checkout-discount-row").classList.remove("d-none");
            document.getElementById("checkout-discount-amount").innerText = `-${UIHelper.formatPrice(appliedDiscountAmount)}`;
            
            const finalPay = currentCheckoutSubtotal - appliedDiscountAmount;
            document.getElementById("checkout-final-total").innerText = UIHelper.formatPrice(finalPay > 0 ? finalPay : 0);
        } else {
            // Xóa mã nếu báo lỗi (Đơn không đủ điều kiện)
            appliedVoucherCode = null;
            appliedDiscountAmount = 0;
            document.getElementById("checkout-discount-row").classList.add("d-none");
            document.getElementById("checkout-final-total").innerText = UIHelper.formatPrice(currentCheckoutSubtotal);
            msgBox.innerHTML = `<span class="text-danger"><i class="fa-solid fa-circle-xmark"></i> ${res.message || 'Mã không hợp lệ hoặc đơn chưa đủ điều kiện!'}</span>`;
        }
    })
    .catch(err => {
        console.error(err);
        msgBox.innerHTML = '<span class="text-danger"><i class="fa-solid fa-circle-xmark"></i> Lỗi kiểm tra mã.</span>';
    });
}

function submitDirectBuy() {
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
    for (const group in selectedVariants) { variantNames.push(selectedVariants[group].variant_name); }
    const variantInfoString = variantNames.length > 0 ? variantNames.join(" - ") : null;
    
    // Tổng tiền thanh toán cuối cùng gửi lên Backend
    let finalPayForBackend = currentCheckoutSubtotal - appliedDiscountAmount;
    if (finalPayForBackend < 0) finalPayForBackend = 0;

    const data = {
        product_id: currentProductId, 
        quantity: qty,
        price: finalPayForBackend, // Gửi giá đã trừ Voucher lên VNPay
        variant_info: variantInfoString, 
        name: name,
        phone: phone,
        address: address,
        payment_method: payment, 
        note: note,
        voucher_code: appliedVoucherCode // Gửi kèm mã Voucher để Backend lưu vào DB
    };

    const btnSubmit = document.querySelector("#checkoutModal .btn-danger");
    const originalText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Đang xử lý...';
    btnSubmit.disabled = true;

    API.post('/orders/direct-buy', data, true)
    .then(d => {
        btnSubmit.innerHTML = originalText;
        btnSubmit.disabled = false;

        if (d.success || d.orderId) {
            const modalEl = document.getElementById('checkoutModal');
            bootstrap.Modal.getInstance(modalEl).hide();

            if (d.paymentUrl) {
                Swal.fire({
                    icon: 'success', title: 'Đang chuyển hướng...', text: 'Hệ thống đang đưa bạn đến cổng thanh toán VNPay!',
                    showConfirmButton: false, timer: 2000
                }).then(() => { window.location.href = d.paymentUrl; });
            } else {
                UIHelper.showSuccess("Thành công!", "🎉 Đặt hàng thành công! Đã lên đơn tự động.", () => {
                    window.location.href = "orders.html";
                });
            }
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
    
    // Sử dụng currentFinalPrice (chuẩn từng xu) thay vì lọc số từ HTML dễ sinh lỗi
    const finalPrice = currentFinalPrice || globalOriginalPrice; 

    const data = {
        product_id: currentProductId, 
        quantity: qty,
        price: finalPrice, 
        variant_info: variantInfoString, 
        name: name,
        phone: phone,
        address: address,
        payment_method: payment, 
        note: note
    };

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

        if (d.success || d.orderId) {
            const modalEl = document.getElementById('checkoutModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();

            if (d.paymentUrl) {
                Swal.fire({
                    icon: 'success',
                    title: 'Đang chuyển hướng...',
                    text: 'Hệ thống đang đưa bạn đến cổng thanh toán VNPay!',
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    window.location.href = d.paymentUrl;
                });
            } else {
                UIHelper.showSuccess("Thành công!", "🎉 Đặt hàng thành công! Đã lên đơn tự động.", () => {
                    window.location.href = "orders.html";
                });
            }
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