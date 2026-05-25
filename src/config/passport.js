require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db'); 

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`
  },
  function(accessToken, refreshToken, profile, cb) {
    const googleId = profile.id;
    const email = profile.emails[0].value;
    const fullName = profile.displayName;
    const avatarUrl = profile.photos[0].value;

    // 1. Kiểm tra xem user này đã có trong database chưa
    const checkUserSql = 'SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1';
    
    db.query(checkUserSql, [googleId, email], (err, results) => {
        if (err) return cb(err);
        
        if (results.length > 0) {
            let user = results[0];
            // Nếu user có email nhưng chưa có google_id (trước đó đăng ký bằng form), thì cập nhật google_id
            if (!user.google_id) {
                db.query('UPDATE users SET google_id = ?, provider = ?, avatar_url = ? WHERE id = ?', 
                [googleId, 'google', avatarUrl, user.id], (updateErr) => {
                    if (updateErr) return cb(updateErr);
                    user.google_id = googleId;
                    user.provider = 'google';
                    user.avatar_url = avatarUrl;
                    return cb(null, user);
                });
            } else {
                // Đã có tài khoản Google -> Cho qua
                return cb(null, user);
            }
        } else {
            // 2. Chưa có tài khoản -> Tạo mới tự động
            // Lấy tên trước chữ @ làm username, thêm số random để không bị trùng
            const username = email.split('@')[0] + '_' + Math.floor(Math.random() * 10000);
            const dummyPassword = Math.random().toString(36).slice(-10); // Pass ảo vì đăng nhập Google không cần pass
            
            const newUser = {
                google_id: googleId,
                username: username,
                password: dummyPassword, 
                full_name: fullName,
                email: email,
                avatar_url: avatarUrl,
                provider: 'google',
                role_id: 3, // Role 3 là KHACH theo database của ông
                status: 1
            };

            db.query('INSERT INTO users SET ?', newUser, (insertErr, insertResult) => {
                if (insertErr) return cb(insertErr);
                newUser.id = insertResult.insertId;
                return cb(null, newUser);
            });
        }
    });
  }
));

// Đóng gói thông tin user vào Session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Giải mã thông tin user từ Session
passport.deserializeUser((id, done) => {
  db.query('SELECT id, username, full_name, email, avatar_url, role_id FROM users WHERE id = ?', [id], (err, results) => {
    if (err) return done(err);
    done(null, results[0]);
  });
});

module.exports = passport;