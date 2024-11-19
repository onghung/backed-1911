const express = require('express');
const {addBook, 
        getAllBooks,
        getBook,
        deleteBook,
        updateBook,} = require('../controllers/bookController');

const router = express.Router();

router.post('/book', addBook);
router.get('/book', getAllBooks);
router.get('/book/:id', getBook);
router.put('/book/:id', updateBook);
router.delete('/book/:id', deleteBook);

module.exports = {
    routes: router
}