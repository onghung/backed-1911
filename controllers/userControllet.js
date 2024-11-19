'use strict'

const firebase = require('../db');
const firestore = firebase.firestore();
const admin = require('firebase-admin');
const User = require('../models/user');

// Lấy thông tin người dùng hiện tại (người đăng nhập)
const getUser = async (req, res, next) => {
    try {
        // Lấy token từ request header (được gửi từ client)
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).send('Authentication token is missing');
        }

        // Xác thực token và lấy UID của người dùng
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Lấy thông tin người dùng từ Firestore bằng UID
        const userDoc = await firestore.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return res.status(404).send('User not found');
        }

        // Trả về dữ liệu người dùng
        const userData = userDoc.data();
        const user = new User(
            userDoc.id, 
            userData.account, 
            userData.active, 
            userData.firstName, 
            userData.lastName
        );

        res.send(user); // Gửi thông tin người dùng hiện tại
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).send('Internal server error');
    }
}

// Sửa tên người dùng (firstName, lastName)
const updateUserName = async (req, res, next) => {
    try {
        // Lấy token từ request header (được gửi từ client)
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).send('Authentication token is missing');
        }

        // Xác thực token và lấy UID của người dùng
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Lấy thông tin cập nhật từ request body
        const { firstName, lastName } = req.body;

        // Kiểm tra xem thông tin truyền vào có hợp lệ không
        if (!firstName && !lastName) {
            return res.status(400).send('No valid fields to update');
        }

        // Cập nhật thông tin người dùng
        const userRef = firestore.collection('users').doc(uid);

        // Thực hiện cập nhật tên
        const updatedData = {};
        if (firstName) updatedData.firstName = firstName;
        if (lastName) updatedData.lastName = lastName;

        await userRef.update(updatedData);

        res.send('User name updated successfully');
    } catch (error) {
        console.error('Error updating user name:', error);
        res.status(500).send('Internal server error');
    }
}

// Sửa trạng thái active của người dùng
const updateUserActiveStatus = async (req, res, next) => {
    try {
        // Lấy token từ request header (được gửi từ client)
        const idToken = req.headers.authorization?.split('Bearer ')[1];

        if (!idToken) {
            return res.status(401).send('Authentication token is missing');
        }

        // Xác thực token và lấy UID của người dùng
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Lấy thông tin cập nhật từ request body
        const { active } = req.body;

        // Kiểm tra xem trạng thái active có hợp lệ không
        if (active === undefined) {
            return res.status(400).send('Active status is required');
        }

        // Cập nhật trạng thái active
        const userRef = firestore.collection('users').doc(uid);

        // Thực hiện cập nhật trạng thái active
        await userRef.update({ active });

        res.send('User active status updated successfully');
    } catch (error) {
        console.error('Error updating user active status:', error);
        res.status(500).send('Internal server error');
    }
}

module.exports = {
    getUser,
    updateUserName,
    updateUserActiveStatus,
}
