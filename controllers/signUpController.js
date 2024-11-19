// const firebaseAdmin = require('firebase-admin');
// const serviceAccount = require('../serviceAccountKey.json');
// const User = require('../models/signUp');

// firebaseAdmin.initializeApp({
//     credential: firebaseAdmin.credential.cert(serviceAccount)
// });

// exports.createUser = async (req, res) => {
//     try {
//         const { email, password } = req.body;

//         // Tạo tài khoản Firebase
//         const userRecord = await firebaseAdmin.auth().createUser({
//             email,
//             password,
//             emailVerified: false,
//             disabled: false
//         });

//         // Lưu thông tin người dùng vào cơ sở dữ liệu nếu cần
//         const newUser = new User(userRecord.uid, email);
//         res.send(newUser); // Trả về thông tin người dùng đã được tạo

//     } catch (error) {
//         console.error('Lỗi khi tạo tài khoản:', error);
//         res.status(500).json({ error: 'Đã xảy ra lỗi khi tạo tài khoản' });
//     }
// };
