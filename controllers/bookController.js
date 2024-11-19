'use strict'

const { model } = require('mongoose');
const firebase = require('../db')
const Book = require('../models/book')
const firestore = firebase.firestore();


const addBook = async (req, res, next) => {
    try {
        const data = req.body;
        const book = await firestore.collection('books').doc().set(data)
        res.send('Record saved successfully');
    } catch (error) {
        res.status(400).send(error.message)
    }
}

const getAllBooks = async (req, res, next) => {
    try {
        const books = await firestore.collection('books');
        const data = await books.get();
        const booksArray= [];
        if(data.empty){
            return res.status(404).send('Khong ton tai sach');
        } else {
            data.forEach(doc => {
                const book = new Book(
                    doc.id, 
                    doc.data().name, 
                    doc.data().description, 
                    doc.data().start, 
                    doc.data().price, 
                    doc.data().view,
                    doc.data().content, 
                    doc.data().url,
                    doc.data().sound,
                );
                booksArray.push(book); // Thêm sách vào mảng
            });
            return res.send(booksArray); // Gửi phản hồi sau khi lặp qua tất cả các tài liệu
        }
    } catch (error) {
        return res.status(400).send(error.message);
    }
}

const getBook = async (req, res, next) => {
    try {
        const id = req.params.id;
        const book = await firestore.collection('books').doc(id);
        const data = await book.get();
        if(!data.exists) {
            res.status(404).send('Book with the given ID not found');
        }else {
            res.send(data.data());
        }
    } catch (error) {
        res.status(400).send(error.message);
    }
}

const updateBook = async (req, res, next) => {
    try {
        const id = req.params.id;
        const data = req.body;
        const book =  await firestore.collection('books').doc(id);
        await book.update(data);
        res.send('cap nhat thanh cong');        
    } catch (error) {
        res.status(400).send(error.message);
    }
}

const deleteBook = async (req, res, next) => {
    try {
        const id = req.params.id;
        await firestore.collection('books').doc(id).delete();
        res.send('xoa thanh cong');
    } catch (error) {
        res.status(400).send(error.message);
    }
}








module.exports = {
    addBook,
    getAllBooks,
    getBook,
    updateBook,
    deleteBook,
}