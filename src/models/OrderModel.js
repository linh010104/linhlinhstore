/* File: models/OrderModel.js */
const db = require('../config/db');

exports.createOrder = (userId, data, callback) => {
    db.getConnection(async (err, conn) => {
        if (err) return callback(err);
        conn.beginTransaction(async (err) => {
            if (err) { conn.release(); return callback(err); }
            try {
                const cartItems = await new Promise((res, rej) => {
                    conn.query("SELECT c.*, p.price as base_price FROM carts c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?", [userId], (e, r) => e ? rej(e) : res(r));
                });
                if (cartItems.length === 0) throw "Giỏ hàng trống";

                let totalAmount = 0;
                const orderItemsData = [];

                for (let item of cartItems) {
                    let itemPrice = item.base_price;
                    if (item.variant_info) {
                        const variantNames = item.variant_info.split(' - ').map(v => v.trim());
                        const variants = await new Promise((res, rej) => {
                            conn.query("SELECT * FROM product_variants WHERE product_id = ? AND variant_name IN (?)", [item.product_id, variantNames], (e, r) => e ? rej(e) : res(r));
                        });
                        variants.forEach(v => { itemPrice += Number(v.additional_price); });

                        for (let vName of variantNames) {
                            await new Promise((res, rej) => {
                                conn.query("UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND variant_name = ?", [item.quantity, item.product_id, vName], (e) => e ? rej(e) : res());
                            });
                        }
                    }

                    await new Promise((res, rej) => {
                        conn.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [item.quantity, item.product_id], (e) => e ? rej(e) : res());
                    });

                    totalAmount += itemPrice * item.quantity;
                    orderItemsData.push([null, item.product_id, item.variant_info, item.quantity, itemPrice]);
                }

                const resultOrder = await new Promise((res, rej) => {
                    conn.query("INSERT INTO orders (user_id, total_amount, payment_method, status, receiver_name, phone, address, note) VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?)",
                    [userId, totalAmount, data.payment_method, data.name, data.phone, data.address, data.note], (e, r) => e ? rej(e) : res(r));
                });
                const orderId = resultOrder.insertId;

                for(let row of orderItemsData) { row[0] = orderId; }
                await new Promise((res, rej) => {
                    conn.query("INSERT INTO order_items (order_id, product_id, variant_info, quantity, price) VALUES ?", [orderItemsData], (e) => e ? rej(e) : res());
                });

                await new Promise((res, rej) => {
                    conn.query("DELETE FROM carts WHERE user_id = ?", [userId], (e) => e ? rej(e) : res());
                });

                conn.commit((err) => {
                    if (err) throw err;
                    conn.release();
                    callback(null, orderId);
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
                const product = await new Promise((res, rej) => {
                    conn.query("SELECT price FROM products WHERE id = ?", [data.productId], (e, r) => e ? rej(e) : res(r));
                });
                if (product.length === 0) throw "Sản phẩm không tồn tại";
                
                let itemPrice = product[0].price;

                if (data.variant_info) {
                    const variantNames = data.variant_info.split(' - ').map(v => v.trim());
                    const variants = await new Promise((res, rej) => {
                        conn.query("SELECT * FROM product_variants WHERE product_id = ? AND variant_name IN (?)", [data.productId, variantNames], (e, r) => e ? rej(e) : res(r));
                    });
                    variants.forEach(v => { itemPrice += Number(v.additional_price); });

                    for (let vName of variantNames) {
                        await new Promise((res, rej) => {
                            conn.query("UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE product_id = ? AND variant_name = ?", [data.quantity, data.productId, vName], (e) => e ? rej(e) : res());
                        });
                    }
                }

                await new Promise((res, rej) => {
                    conn.query("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?", [data.quantity, data.productId], (e) => e ? rej(e) : res());
                });

                const totalAmount = itemPrice * data.quantity;

                const resultOrder = await new Promise((res, rej) => {
                    conn.query("INSERT INTO orders (user_id, total_amount, payment_method, status, receiver_name, phone, address, note) VALUES (?, ?, ?, 'NEW', ?, ?, ?, ?)",
                    [userId, totalAmount, data.payment_method, data.name, data.phone, data.address, data.note], (e, r) => e ? rej(e) : res(r));
                });
                
                await new Promise((res, rej) => {
                    conn.query("INSERT INTO order_items (order_id, product_id, variant_info, quantity, price) VALUES (?, ?, ?, ?, ?)", 
                    [resultOrder.insertId, data.productId, data.variant_info || null, data.quantity, itemPrice], (e) => e ? rej(e) : res());
                });

                conn.commit((err) => {
                    if (err) throw err;
                    conn.release();
                    callback(null, resultOrder.insertId);
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
        SELECT 
            oi.*, 
            p.name, 
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
        db.getConnection((err, conn) => {
            if (err) return callback(err);
            conn.beginTransaction(async (err) => {
                if (err) { conn.release(); return callback(err); }
                try {
                    const [order] = await new Promise((res, rej) => {
                        conn.query("SELECT id FROM orders WHERE id=? AND status='NEW'", [orderId], (e, r) => e ? rej(e) : res(r));
                    });
                    if (!order) throw "Đơn hàng đã được duyệt, không thể hủy!";

                    const items = await new Promise((res, rej) => {
                        conn.query("SELECT product_id, variant_info, quantity FROM order_items WHERE order_id=?", [orderId], (e, r) => e ? rej(e) : res(r));
                    });

                    for (let item of items) {
                        if (item.variant_info) {
                            const vNames = item.variant_info.split(' - ').map(v => v.trim());
                            for (let vName of vNames) {
                                await new Promise((res, rej) => {
                                    conn.query("UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE product_id=? AND variant_name=?", [item.quantity, item.product_id, vName], (e) => e ? rej(e) : res());
                                });
                            }
                        }
                        await new Promise((res, rej) => {
                            conn.query("UPDATE products SET stock_quantity = stock_quantity + ? WHERE id=?", [item.quantity, item.product_id], (e) => e ? rej(e) : res());
                        });
                    }

                    await new Promise((res, rej) => {
                        conn.query("UPDATE orders SET status='CANCELLED' WHERE id=?", [orderId], (e) => e ? rej(e) : res());
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
    } else {
        return callback("Trạng thái không hợp lệ");
    }
};