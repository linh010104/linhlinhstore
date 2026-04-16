/* File: web-client/js/utils.js - Nơi chứa các hàm dùng chung */

const Utils = {
    // 1. Hàm format tiền tệ chuẩn VNĐ
    formatVND: (amount) => {
        return Number(amount).toLocaleString('vi-VN') + " đ";
    },

    // 2. Hàm cập nhật số lượng badge giỏ hàng trên Header
    updateCartBadge: () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        // Dùng luôn biến CONFIG mình đã tạo lúc nãy
        fetch(`${CONFIG.BASE_URL}/cart`, {
            method: "GET",
            headers: { "Authorization": "Bearer " + token }
        })
        .then(res => res.json())
        .then(data => {
            let totalQty = 0;
            if (Array.isArray(data)) {
                data.forEach(item => totalQty += item.quantity);
            }
            const badge = document.getElementById("cart-badge");
            if (badge) {
                badge.innerText = totalQty;
                badge.style.display = totalQty > 0 ? "inline-block" : "none";
            }
        })
        .catch(err => console.error("Lỗi đếm giỏ hàng:", err));
    }
};

window.Utils = Utils;
window.updateCartCount = Utils.updateCartBadge;