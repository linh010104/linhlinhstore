const crypto = require('crypto');
require('dotenv').config();

const VNP_TMN_CODE = process.env.VNPAY_TMN_CODE || 'TMNCODE123';
const VNP_HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'secret_key_123';
const VNP_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_API_URL = process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/merchant_transaction';
const VNP_RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/orders/vnpay-callback';

// 🔥 HÀM SẮP XẾP CHUẨN THEO TÀI LIỆU VNPAY (QUAN TRỌNG NHẤT)
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key)); // Mã hóa Key TRƯỚC khi sort
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        // Mã hóa Value và thay thế khoảng trắng thành +
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

/**
 * Tạo URL thanh toán VNPay
 */
function createPaymentUrl(orderData) {
    const { orderId, amount, orderInfo, ipAddr } = orderData;

    const date = new Date();
    const createDate = date.getFullYear() +
        String(date.getMonth() + 1).padStart(2, '0') +
        String(date.getDate()).padStart(2, '0') +
        String(date.getHours()).padStart(2, '0') +
        String(date.getMinutes()).padStart(2, '0') +
        String(date.getSeconds()).padStart(2, '0');

    let vnp_Params = {
        'vnp_Version': '2.1.0',
        'vnp_Command': 'pay',
        'vnp_TmnCode': VNP_TMN_CODE,
        'vnp_Locale': 'vn',
        'vnp_CurrCode': 'VND',
        'vnp_TxnRef': orderId, 
        'vnp_OrderInfo': orderInfo, 
        'vnp_OrderType': 'other',
        'vnp_Amount': amount * 100, 
        'vnp_ReturnUrl': VNP_RETURN_URL,
        'vnp_IpAddr': ipAddr,
        'vnp_CreateDate': createDate,
    };

    // 1. Sắp xếp params theo chuẩn VNPay
    vnp_Params = sortObject(vnp_Params);

    // 2. Tạo chuỗi ký (signData) bằng cách nối thủ công
    const signData = Object.keys(vnp_Params).map(key => `${key}=${vnp_Params[key]}`).join('&');

    // 3. Băm chuỗi ký với HashSecret
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 4. Ghép chữ ký vào URL
    vnp_Params['vnp_SecureHash'] = signed;
    const finalUrl = `${VNP_URL}?${Object.keys(vnp_Params).map(key => `${key}=${vnp_Params[key]}`).join('&')}`;
    
    return finalUrl;
}

/**
 * Xác minh chữ ký từ callback của VNPay
 */
function verifyPaymentHash(vnp_Params) {
    let vnp_SecureHash = vnp_Params['vnp_SecureHash'];

    // 1. Clone object và xóa 2 trường Hash để chuẩn bị tính toán
    let params = Object.assign({}, vnp_Params);
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    // 2. Dùng lại hàm sortObject (Cực kỳ quan trọng: Nó sẽ mã hóa lại tiếng Việt và đổi dấu cách thành dấu +)
    params = sortObject(params);

    // 3. Nối chuỗi signData theo đúng chuẩn key=value&key=value
    let signData = "";
    let keys = Object.keys(params);
    for (let i = 0; i < keys.length; i++) {
        signData += keys[i] + '=' + params[keys[i]];
        if (i < keys.length - 1) signData += '&';
    }

    // 4. Băm với Hash Secret
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 5. So sánh (VNPay dặn là nên so sánh không phân biệt hoa/thường)
    return vnp_SecureHash.toLowerCase() === signed.toLowerCase();
}

/**
 * Query transaction status từ VNPay API
 */
async function queryTransaction(orderId, transactionDate) {
    const crypto = require('crypto');
    const https = require('https');

    let requestData = {
        "vnp_RequestId": `${orderId}-${Date.now()}`,
        "vnp_Version": "2.1.0",
        "vnp_Command": "querydr",
        "vnp_TmnCode": VNP_TMN_CODE,
        "vnp_TxnRef": orderId,
        "vnp_OrderInfo": `Query transaction ${orderId}`,
        "vnp_TransactionDate": transactionDate,
        "vnp_CreateDate": new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14),
        "vnp_IpAddr": "127.0.0.1"
    };

    const signData = Object.keys(requestData)
        .sort()
        .map(key => `${key}=${requestData[key]}`)
        .join('&'); 

    const vnp_SecureHash = crypto
        .createHmac('sha512', VNP_HASH_SECRET)
        .update(Buffer.from(signData, 'utf-8'))
        .digest('hex');
    requestData['vnp_SecureHash'] = vnp_SecureHash;

    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(requestData);

        const options = {
            hostname: 'sandbox.vnpayment.vn',
            port: 443,
            path: '/merchant_webapi/merchant_transaction',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

module.exports = {
    VNP_TMN_CODE,
    VNP_HASH_SECRET,
    VNP_URL,
    VNP_RETURN_URL,
    createPaymentUrl,
    verifyPaymentHash,
    queryTransaction
};