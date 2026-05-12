class UIHelper {
    /**
     * Show success notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {function} callback - Callback after notification closes
     */
    static showSuccess(title, message, callback = null) {
        Swal.fire({
            icon: 'success',
            title: title || 'Thành công',
            text: message || '',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            if (callback) callback();
        });
    }

    /**
     * Show error notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {function} callback - Callback after notification closes
     */
    static showError(title, message, callback = null) {
        Swal.fire({
            icon: 'error',
            title: title || 'Lỗi',
            text: message || '',
            confirmButtonText: 'Đóng'
        }).then(() => {
            if (callback) callback();
        });
    }

    /**
     * Show warning notification
     * @param {string} title - Notification title
     * @param {string} message - Notification message
     * @param {function} callback - Callback after notification closes
     */
    static showWarning(title, message, callback = null) {
        Swal.fire({
            icon: 'warning',
            title: title || 'Cảnh báo',
            text: message || '',
            confirmButtonText: 'Đã hiểu'
        }).then(() => {
            if (callback) callback();
        });
    }

    /**
     * Show confirmation dialog
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {string} confirmText - Confirm button text
     * @param {string} cancelText - Cancel button text
     * @param {function} onConfirm - Callback if user confirms
     * @param {function} onCancel - Callback if user cancels
     */
    static showConfirm(title, message, confirmText, cancelText, onConfirm, onCancel = null) {
        Swal.fire({
            title: title,
            text: message,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6c757d',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText
        }).then((result) => {
            if (result.isConfirmed && onConfirm) {
                onConfirm();
            } else if (!result.isConfirmed && onCancel) {
                onCancel();
            }
        });
    }

    /**
     * Check if user is logged in, redirect if not
     * @param {string} redirectUrl - URL to redirect if not logged in
     */
    static ensureLogin(redirectUrl = 'login.html') {
        if (!API.isAuthenticated()) {
            UIHelper.showWarning(
                'Chưa đăng nhập',
                'Vui lòng đăng nhập để tiếp tục.',
                () => { window.location.href = redirectUrl; }
            );
            return false;
        }
        return true;
    }

    /**
     * Format currency to Vietnamese VND
     * @param {number} value - The number to format
     * @returns {string} Formatted currency string
     */
    static formatPrice(value) {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(value);
    }

    /**
     * Format number with thousand separators
     * @param {number} value - The number to format
     * @returns {string} Formatted number string
     */
    static formatNumber(value) {
        return new Intl.NumberFormat('vi-VN').format(value);
    }

    /**
     * Parse success/error response
     * @param {object} response - API response object
     * @returns {object} { isSuccess: boolean, message: string }
     */
    static parseResponse(response) {
        if (!response) {
            return { isSuccess: false, message: 'Lỗi không xác định' };
        }

        const successKeywords = ['thành công', 'success'];
        const hasSuccess = response.message && 
            successKeywords.some(keyword => response.message.toLowerCase().includes(keyword));

        return {
            isSuccess: hasSuccess || response.success || response.orderId,
            message: response.message || response.error || 'Có lỗi xảy ra'
        };
    }
}