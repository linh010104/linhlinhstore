const crypto = require('crypto');
const qs = require('qs');
require('dotenv').config();

const VNP_TMN_CODE = process.env.VNPAY_TMN_CODE || 'TMNCODE123';
const VNP_HASH_SECRET = process.env.VNPAY_HASH_SECRET || 'secret_key_123';
const VNP_URL = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_API_URL = process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/merchant_webapi/merchant_transaction';
const VNP_RETURN_URL = process.env.VNPAY_RETURN_URL || 'http://localhost:3000/api/orders/vnpay-callback';

// 🔥 HÀM SẮP XẾP CHUẨN THEO TÀI LIỆU VNPAY
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj){
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

/**
 * 1. TẠO URL THANH TOÁN VNPAY (LUỒNG ĐI)
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
        'vnp_IpAddr': ipAddr || '127.0.0.1', // Đề phòng IP rỗng vnpay báo lỗi
        'vnp_CreateDate': createDate,
    };

    // 1. Sắp xếp params
    vnp_Params = sortObject(vnp_Params);

    // 2. Tạo chuỗi ký bằng qs (Cực kỳ an toàn)
    const signData = qs.stringify(vnp_Params, { encode: false });

    // 3. Băm chuỗi ký
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // 4. Ghép chữ ký vào URL
    vnp_Params['vnp_SecureHash'] = signed;
    const finalUrl = `${VNP_URL}?${qs.stringify(vnp_Params, { encode: false })}`;
    
    return finalUrl;
}

/**
 * 2. XÁC MINH CHỮ KÝ TỪ CALLBACK CỦA VNPAY (LUỒNG VỀ)
 */
function verifyPaymentHash(vnp_Params) {
    const secureHash = vnp_Params['vnp_SecureHash'];

    // 🔥 CHỈ LẤY CÁC THAM SỐ CỦA VNPAY (Bỏ qua rác)
    let params = {};
    for (let key in vnp_Params) {
        if (key.startsWith('vnp_')) {
            params[key] = vnp_Params[key];
        }
    }
    
    delete params['vnp_SecureHash'];
    delete params['vnp_SecureHashType'];

    params = sortObject(params);
    const signData = qs.stringify(params, { encode: false });
    const hmac = crypto.createHmac('sha512', VNP_HASH_SECRET);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    return secureHash === signed;
}

async function queryTransaction(orderId, transactionDate) {
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