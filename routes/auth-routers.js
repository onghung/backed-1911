const express = require('express');
const router = express.Router();
const userController = require('../controllers/signUpController');

router.post('/create', userController.createUser);

module.exports = {
    routes: router
}