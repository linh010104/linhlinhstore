const db = require('../config/db');

/**
 * ✅ LẤY ORDER CÙNG VỚI TRẠNG THÁI THANH TOÁN
 */
exports.getOrderWithPayment = (orderId, callback) => {
    const sql = `
        SELECT id, user_id, total_amount, payment_method, payment_status,
        status, created_at, updated_at
        FROM orders
        WHERE id = ?
    `;
    db.query(sql, [orderId], callback);
};

/**
 * ✅ CẬP NHẬT TRẠNG THÁI THANH TOÁN
 */
exports.updatePaymentStatus = (orderId, paymentStatus, vnpayTransactionNo = null, callback) => {
    const sql = `
        UPDATE orders
        SET payment_status = ?, vnpay_transaction_no = ?, updated_at = NOW()
        WHERE id = ?
    `;
    db.query(sql, [paymentStatus, vnpayTransactionNo, orderId], callback);
};

/**
 * ✅ TẠO ĐƠN HÀNG TỪ GIỎ HÀNG (TRẠNG THÁI PENDING)
 */
exports.createOrder = (userId, data, callback) => {
    db.getConnection(async (err, conn) => {
        if (err) return callback(err);
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return callback(err); }
            try {
                // 1. LẤY ITEMS TỪ GIỎ HÀNG VÀ KIỂM TRA STOCK
                const cartItems = await new Promise((res, rej) => {
                    conn.query(`
                        SELECT c.*, p.price as base_price, p.stock_quantity
                        FROM carts c
                        JOIN products p ON c.product_id = p.id
                        WHERE c.user_id = ?
                    `, [userId], (e, r) => e ? rej(e) : res(r));
                });

                if (cartItems.length === 0) throw "Giỏ hàng trống";

                // 2. ✅ PRE-CHECK STOCK (CRITICAL FIX)
                for (let item of cartItems) {
                    if (Number(item.stock_quantity) < Number(item.quantity)) {
                        throw `Sản phẩm "${item.product_id}" không đủ hàng (còn ${item.stock_quantity}, cần ${item.quantity})`;
                    }
                }

                let totalAmount = 0;
                const orderItemsData = [];

                for (let item of cartItems) {
                    let itemPrice = Number(item.base_price);
                    let qty = Number(item.quantity);

                    if (item.variant_info) {
                        const variantNames = item.variant_info.split(' - ').map(v => v.trim());

                        // ✅ CHECK VARIANT STOCK
                        const variants = await new Promise((res, rej) => {
                            conn.query(
                                "SELECT * FROM product_variants WHERE product_id = ? AND variant_name IN (?)",
                                [item.product_id, variantNames],
                                (e, r) => e ? rej(e) : res(r)
                            );
                        });

                        if (variants.length !== variantNames.length) {
                            throw "Một số phiên bản sản phẩm không tồn tại";
                        }

                        // ✅ CHECK VARIANT STOCK PRE
                        for (let v of variants) {
                            if (Number(v.stock_quantity) < qty) {
                                throw `Phiên bản "${v.variant_name}" không đủ hàng`;
                            }
                            itemPrice += Number(v.additional_price);
                        }

                        // Trừ kho phiên bản
                        for (let vName of variantNames) {
                            await new Promise((res, rej) => {
                                conn.query(
                                    "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND variant_name = ?",
                                    [qty, item.product_id, vName],
                                    (e) => e ? rej(e) : res()
                                );
                            });
                        }
                    }

                    // Trừ kho gốc
                    await new Promise((res, rej) => {
                        conn.query(
                            "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?",
                            [qty, item.product_id],
                            (e) => e ? rej(e) : res()
                        );
                    });

                    totalAmount += (itemPrice * qty);
                    orderItemsData.push([null, item.product_id, item.variant_info, qty, itemPrice]);
                }

                // 3. ✅ TẠO ĐƠN HÀNG VỚI PAYMENT_STATUS = PENDING
                const resultOrder = await new Promise((res, rej) => {
                    conn.query(`
                        INSERT INTO orders
                        (user_id, total_amount, payment_method, payment_status, status,
                        receiver_name, phone, address, note, created_at)
                        VALUES (?, ?, ?, 'PENDING', 'NEW', ?, ?, ?, ?, NOW())
                    `,
                    [userId, totalAmount, data.payment_method, data.name, data.phone, data.address, data.note],
                    (e, r) => e ? rej(e) : res(r)
                    );
                });

                const orderId = resultOrder.insertId;

                // 4. INSERT ORDER ITEMS
                for(let row of orderItemsData) { row[0] = orderId; }
                await new Promise((res, rej) => {
                    conn.query(
                        "INSERT INTO order_items (order_id, product_id, variant_info, quantity, price) VALUES ?",
                        [orderItemsData],
                        (e) => e ? rej(e) : res()
                    );
                });

                // ⚠️ KHÔNG XÓA GIỎ HÀNG NGAY - CHỈ XÓA KHI THANH TOÁN THÀNH CÔNG (Ở Controller)
                
                conn.commit((err) => {
                    if (err) throw err;
                    conn.release();
                    callback(null, orderId, totalAmount); // Trả về totalAmount để frontend tính thanh toán
                });

            } catch (error) {
                conn.rollback(() => {
                    conn.release();
                    callback(error);
                });
            }
        });
    });
};
exports.createDirectOrder = (userId, data, callback) => {
    db.getConnection(async (err, conn) => {
        if (err) return callback(err);
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return callback(err); }
            try {
                let totalAmount = 0;
                let itemPrice = Number(data.price || 0); // Lấy giá từ frontend
                let qty = Number(data.quantity || 1);
                
                // Pre-check stock gốc
                const [product] = await new Promise((res, rej) => {
                    conn.query("SELECT stock_quantity FROM products WHERE id = ?", [data.product_id], (e, r) => e ? rej(e) : res(r));
                });
                
                if (!product || Number(product.stock_quantity) < qty) {
                    throw "Sản phẩm không đủ hàng trong kho!";
                }

                // Nếu có biến thể (Variant), kiểm tra kho của biến thể
                if (data.variant_info) {
                    const variantNames = data.variant_info.split(' - ').map(v => v.trim());
                    const variants = await new Promise((res, rej) => {
                        conn.query(
                            "SELECT * FROM product_variants WHERE product_id = ? AND variant_name IN (?)",
                            [data.product_id, variantNames],
                            (e, r) => e ? rej(e) : res(r)
                        );
                    });

                    if (variants.length !== variantNames.length) {
                        throw "Một số phiên bản sản phẩm không tồn tại";
                    }

                    for (let v of variants) {
                        if (Number(v.stock_quantity) < qty) {
                            throw `Phiên bản "${v.variant_name}" không đủ hàng`;
                        }
                    }

                    // Trừ kho phiên bản
                    for (let vName of variantNames) {
                        await new Promise((res, rej) => {
                            conn.query(
                                "UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND variant_name = ?",
                                [qty, data.product_id, vName],
                                (e) => e ? rej(e) : res()
                            );
                        });
                    }
                }

                // Trừ kho gốc
                await new Promise((res, rej) => {
                    conn.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [qty, data.product_id], (e) => e ? rej(e) : res());
                });

                totalAmount = itemPrice * qty;

                // Tạo đơn (Nếu Modal chọn VNPAY thì gán là VNPAY)
                const paymentMethod = data.payment_method === 'VNPAY' ? 'VNPAY' : 'CASH';

                const resultOrder = await new Promise((res, rej) => {
                    conn.query(`
                        INSERT INTO orders
                        (user_id, total_amount, payment_method, payment_status, status,
                        receiver_name, phone, address, note, created_at)
                        VALUES (?, ?, ?, 'PENDING', 'NEW', ?, ?, ?, ?, NOW())
                    `,
                    [userId, totalAmount, paymentMethod, data.name, data.phone, data.address, data.note],
                    (e, r) => e ? rej(e) : res(r));
                });

                const orderId = resultOrder.insertId;

                // Tạo order item
                await new Promise((res, rej) => {
                    conn.query(
                        "INSERT INTO order_items (order_id, product_id, variant_info, quantity, price) VALUES (?, ?, ?, ?, ?)",
                        [orderId, data.product_id, data.variant_info || null, qty, itemPrice],
                        (e) => e ? rej(e) : res()
                    );
                });

                conn.commit((err) => {
                    if (err) throw err;
                    conn.release();
                    callback(null, orderId, totalAmount);
                });
            } catch (error) {
                conn.rollback(() => {
                    conn.release();
                    callback(error);
                });
            }
        });
    });
};

exports.getOrderDetail = (orderId, callback) => {
    const sqlOrder = "SELECT * FROM orders WHERE id = ?";
    const sqlItems = `
        SELECT oi.*, p.name,
        (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) AS image_url
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
    `;

    db.query(sqlOrder, [orderId], (err, orders) => {
        if (err || orders.length === 0) return callback(err || "Không tìm thấy đơn hàng");

        db.query(sqlItems, [orderId], (err, items) => {
            if (err) return callback(err);
            const orderData = orders[0];
            orderData.items = items;
            callback(null, orderData);
        });
    });
};

exports.cancelOrder = (orderId, userId, callback) => {
    db.getConnection((err, conn) => {
        if (err) return callback(err);
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return callback(err); }
            try {
                // Kiểm tra đơn hàng
                const sqlCheck = userId 
                    ? `SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = 'NEW'`
                    : `SELECT * FROM orders WHERE id = ?`; // Admin ko cần user_id
                
                const paramsCheck = userId ? [orderId, userId] : [orderId];
                
                const [order] = await new Promise((res, rej) => {
                    conn.query(sqlCheck, paramsCheck, (e, r) => e ? rej(e) : res(r));
                });

                if (!order && userId) throw "Đơn hàng không thể hủy (phải ở trạng thái NEW và thuộc về bạn)";
                if (!order && !userId) throw "Không tìm thấy đơn hàng";

                // Lấy items để cộng kho
                const items = await new Promise((res, rej) => {
                    conn.query("SELECT product_id, variant_info, quantity FROM order_items WHERE order_id = ?", [orderId], (e, r) => e ? rej(e) : res(r));
                });

                for (let item of items) {
                    let qty = Number(item.quantity);
                    if (item.variant_info) {
                        const vNames = item.variant_info.split(' - ').map(v => v.trim());
                        for (let vName of vNames) {
                            await new Promise((res, rej) => {
                                conn.query("UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE product_id = ? AND variant_name = ?", [qty, item.product_id, vName], (e) => e ? rej(e) : res());
                            });
                        }
                    }
                    await new Promise((res, rej) => {
                        conn.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?", [qty, item.product_id], (e) => e ? rej(e) : res());
                    });
                }

                // Cập nhật trạng thái
                await new Promise((res, rej) => {
                    conn.query("UPDATE orders SET status = 'CANCELLED', payment_status = 'FAILED' WHERE id = ?", [orderId], (e) => e ? rej(e) : res());
                });

                conn.commit((err) => {
                    if (err) throw err;
                    conn.release();
                    callback(null, { message: "Hủy đơn hàng thành công!" });
                });
            } catch (error) {
                conn.rollback(() => {
                    conn.release();
                    callback(error);
                });
            }
        });
    });
};

exports.getAll = (callback) => {
    const sql = "SELECT * FROM orders ORDER BY created_at DESC";
    db.query(sql, callback);
};

exports.updateStatus = (id, status, callback) => {
    const sql = "UPDATE orders SET status = ? WHERE id = ?";
    db.query(sql, [status, id], callback);
};

exports.getByUserId = (userId, callback) => {
    const sql = "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC";
    db.query(sql, [userId], callback);
};

exports.updateOrderInfo = (orderId, data, callback) => {
    const sql = "UPDATE orders SET receiver_name=?, phone=?, address=?, note=? WHERE id=? AND status='NEW'";
    db.query(sql, [data.name, data.phone, data.address, data.note, orderId], callback);
};

exports.userUpdateStatus = (orderId, status, callback) => {
    if (status === 'DONE') {
        db.query("UPDATE orders SET status='DONE' WHERE id=? AND status='SHIPPING'", [orderId], (err, res) => {
            if(err) return callback(err);
            callback(null, { message: "Đã xác nhận nhận hàng!" });
        });
    } else if (status === 'CANCELLED') {
        exports.cancelOrder(orderId, null, callback);
    } else {
        return callback("Trạng thái không hợp lệ");
    }
};