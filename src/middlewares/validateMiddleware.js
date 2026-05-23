const { body, validationResult } = require('express-validator');

/**
 * ✅ VALIDATION MIDDLEWARE CHO PRODUCT
 */
const validateProduct = [
    body('name')
        .trim()
        .notEmpty().withMessage('Tên sản phẩm không được để trống')
        .isLength({ min: 3, max: 255 }).withMessage('Tên sản phẩm phải từ 3-255 ký tự'),
    
    body('sku')
        .trim()
        .notEmpty().withMessage('SKU không được để trống')
        .isLength({ min: 3 }).withMessage('SKU phải ít nhất 3 ký tự'),
    
    body('price')
        .notEmpty().withMessage('Giá không được để trống')
        .isFloat({ min: 0 }).withMessage('Giá phải là số dương'),
    
    body('import_price')
        .optional()
        .isFloat({ min: 0 }).withMessage('Giá nhập phải là số dương'),
    
    body('stock_quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('Tồn kho phải là số nguyên dương'),
    
    body('category_id')
        .notEmpty().withMessage('Danh mục không được để trống')
        .isInt().withMessage('ID danh mục phải là số'),
    
    body('warranty_month')
        .optional()
        .isInt({ min: 0 }).withMessage('Thời gian bảo hành phải là số nguyên')
];

/**
 * ✅ VALIDATION MIDDLEWARE CHO ORDER
 */
const validateCheckout = [
    body('name')
        .trim()
        .notEmpty().withMessage('Tên người nhận không được để trống'),
    
    body('phone')
        .trim()
        .notEmpty().withMessage('Số điện thoại không được để trống')
        .matches(/^[0-9\-\+\(\)]{10,15}$/).withMessage('Số điện thoại không hợp lệ'),
    
    body('address')
        .trim()
        .notEmpty().withMessage('Địa chỉ không được để trống')
        .isLength({ min: 5 }).withMessage('Địa chỉ quá ngắn'),
    
    body('payment_method')
        .notEmpty().withMessage('Phương thức thanh toán không được để trống')
        .isIn(['VNPAY', 'CASH', 'BANK_TRANSFER']).withMessage('Phương thức thanh toán không hợp lệ')
];

/**
 * ✅ VALIDATION MIDDLEWARE CHO AUTH
 */
const validateLogin = [
    body('username')
        .trim()
        .notEmpty().withMessage('Tên đăng nhập không được để trống')
        .isLength({ min: 3 }).withMessage('Tên đăng nhập ít nhất 3 ký tự'),
    
    body('password')
        .notEmpty().withMessage('Mật khẩu không được để trống')
        .isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự')
];

const validateRegister = [
    body('username')
        .trim()
        .notEmpty().withMessage('Tên đăng nhập không được để trống')
        .isLength({ min: 3, max: 50 }).withMessage('Tên đăng nhập 3-50 ký tự')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Tên đăng nhập chỉ chứa chữ, số, -, _'),
    
    body('password')
        .notEmpty().withMessage('Mật khẩu không được để trống')
        .isLength({ min: 6 }).withMessage('Mật khẩu ít nhất 6 ký tự')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Mật khẩu phải chứa chữ hoa, chữ thường, số'),
    
    body('full_name')
        .trim()
        .notEmpty().withMessage('Tên đầy đủ không được để trống'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email không được để trống')
        .isEmail().withMessage('Email không hợp lệ'),
    
    body('phone')
        .trim()
        .notEmpty().withMessage('Số điện thoại không được để trống')
        .matches(/^[0-9\-\+\(\)]{10,15}$/).withMessage('Số điện thoại không hợp lệ')
];

/**
 * ✅ MIDDLEWARE XỬ LÝ VALIDATION ERRORS
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu không hợp lệ',
            errors: errors.array().map(err => ({
                field: err.param,
                message: err.msg
            }))
        });
    }
    next();
};

module.exports = {
    validateProduct,
    validateCheckout,
    validateLogin,
    validateRegister,
    handleValidationErrors
};