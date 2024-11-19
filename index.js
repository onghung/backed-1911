'use strict'
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const config = require('./config')
const bookRouter = require('./routes/book-routes')
const paypal = require('./services/paypal');
const firebase = require('./db')
const firestore = firebase.firestore();
const admin = require('firebase-admin')
const credentials = require('./serviceAcountKey.json')

let user_email="";

admin.initializeApp({
    credential: admin.credential.cert(credentials)
  });



const app = express();

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));


app.post('/api/signup', async (req, res) => {
  console.log(req.body);
  const user = {
    email: req.body.email,
    password: req.body.password,
    firstName: req.body.firstName,
    lastName: req.body.lastName
  };

  try {
    // Check if the email already exists by attempting to retrieve a user by email
    const existingUser = await admin.auth().getUserByEmail(user.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email đã tồn tại trên hệ thống' });
    }
  } catch (error) {
    // If the error code is 'auth/user-not-found', this means the email is not in use
    if (error.code !== 'auth/user-not-found') {
      return res.status(500).json({ error: 'Lỗi khi kiểm tra email' });
    }
  }

  try {
    // Tạo người dùng mới với email và password
    const userResponse = await admin.auth().createUser({
      email: user.email,
      password: user.password,
      emailVerified: false,
      disabled: false
    });

    // Lưu thông tin người dùng vào Firestore trong collection 'active'
    const data = {
      active: false,
      account: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };
    await firestore.collection('active').add(data);

    const favorite = {
      account: user.email,
    };
    await firestore.collection('favorite').add(data);

    res.json({ message: 'Tạo tài khoản thành công', userResponse });
  } catch (error) {
    // Trả về thông báo lỗi cụ thể
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ error: 'Email đã tồn tại trên hệ thống' });
    }
    console.error('Error creating new user:', error);
    res.status(500).json({ error: 'Lỗi khi tạo người dùng mới' });
  }
});

app.post('/api/favorite', async (req, res) => {
  const { bookId } = req.body; // Lấy bookId từ yêu cầu
  if (!user_email) {
    return res.status(401).json({ error: 'Người dùng chưa đăng nhập' });
  }

  if (!bookId) {
    return res.status(400).json({ error: 'Thiếu thông tin bookId' });
  }

  try {
    const snapshot = await firestore
      .collection('favorite')
      .where('account', '==', user_email)
      .get();

    if (snapshot.empty) {
      // Nếu không tìm thấy, tạo một mục mới
      await firestore.collection('favorite').add({
        account: user_email,
        bookIds: [bookId],
      });
      return res.json({ 
        message: 'Đã thêm sách vào danh sách yêu thích', 
        isFavorite: true // Trạng thái hiện tại
      });
    } else {
      let favoriteDocId;
      let favoriteData;

      // Tìm tài liệu yêu thích hiện tại
      snapshot.forEach((doc) => {
        favoriteDocId = doc.id;
        favoriteData = doc.data();
      });

      const bookIds = favoriteData.bookIds || [];

      if (bookIds.includes(bookId)) {
        // Nếu sách đã tồn tại, xóa khỏi danh sách
        const updatedBookIds = bookIds.filter((id) => id !== bookId);
        await firestore.collection('favorite').doc(favoriteDocId).update({
          bookIds: updatedBookIds,
        });
        return res.json({ 
          message: 'Đã xóa sách khỏi danh sách yêu thích', 
          isFavorite: false // Trạng thái hiện tại
        });
      } else {
        // Nếu sách chưa tồn tại, thêm vào danh sách
        bookIds.push(bookId);
        await firestore.collection('favorite').doc(favoriteDocId).update({
          bookIds: bookIds,
        });
        return res.json({ 
          message: 'Đã thêm sách vào danh sách yêu thích', 
          isFavorite: true // Trạng thái hiện tại
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi xử lý yêu cầu yêu thích:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});
app.get('/api/favorite/status/:bookId', async (req, res) => {
  const bookId = req.params.bookId;
  if (!user_email) {
    return res.status(401).json({ error: 'Người dùng chưa đăng nhập' });
  }

  if (!bookId) {
    return res.status(400).json({ error: 'Thiếu thông tin bookId' });
  }

  try {
    // Truy vấn xem cuốn sách đã được thêm vào danh sách yêu thích của người dùng chưa
    const snapshot = await firestore
      .collection('favorite')
      .where('account', '==', user_email)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Không tìm thấy danh sách yêu thích' });
    }

    let favoriteData;
    snapshot.forEach((doc) => {
      favoriteData = doc.data();
    });

    const bookIds = favoriteData.bookIds || [];
    const isFavorite = bookIds.includes(bookId);

    res.json({
      isFavorite: isFavorite, // Trả về trạng thái yêu thích
    });
  } catch (error) {
    console.error('Lỗi khi truy vấn trạng thái yêu thích:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});
app.get('/api/favorites', async (req, res) => {
  const userEmail = user_email;  // The specific user email you want to check favorites for

  try {
    // Query Firestore to get the favorite books list for the specified user
    const snapshot = await firestore
      .collection('favorite')
      .where('account', '==', userEmail)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ message: 'Không tìm thấy danh sách yêu thích của người dùng' });
    }

    let favoriteData;
    snapshot.forEach((doc) => {
      favoriteData = doc.data();
    });

    // If no books are in the favorites list
    if (!favoriteData || !favoriteData.bookIds || favoriteData.bookIds.length === 0) {
      return res.json({ message: 'Người dùng chưa có sách yêu thích' });
    }

    // Retrieve book details from the books collection for each bookId
    const bookIds = favoriteData.bookIds;
    const books = [];

    for (const bookId of bookIds) {
      const bookSnapshot = await firestore.collection('books').doc(bookId).get();
      if (bookSnapshot.exists) {
        const book = bookSnapshot.data();
        books.push({
          id: bookId,
          name: book.name,
          description: book.description,
          start: book.start,
          price: book.price,
          view: book.view,
          content: book.content,
          url: book.url,
          sound: book.sound,
        });
      }
    }

    // Return the list of favorite books
    res.json(books);
  } catch (error) {
    console.error('Error when fetching favorite books:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

app.get('/api/search', async (req, res) => {
  const query = req.query.query; // Lấy từ khóa tìm kiếm từ query string
  if (!query) {
      return res.status(400).json({ error: 'Thiếu từ khóa tìm kiếm' });
  }

  try {
      // Truy vấn Firestore để tìm kiếm sách theo tên (name) chứa từ khóa
      const snapshot = await firestore
          .collection('books')
          .where('name', '>=', query)  // Tìm các sách có tên bắt đầu bằng từ khóa
          .where('name', '<=', query + '\uf8ff')  // Tìm đến tất cả các sách có tên bắt đầu với từ khóa
          .get();

      // Nếu không tìm thấy sách
      if (snapshot.empty) {
          return res.status(404).json({ message: 'Không tìm thấy sách' });
      }

      // Trả về kết quả tìm kiếm
      const booksArray = [];
      snapshot.forEach(doc => {
          const book = {
              id: doc.id,
              name: doc.data().name,
              description: doc.data().description,
              start: doc.data().start,
              price: doc.data().price,
              view: doc.data().view,
              content: doc.data().content,
              url: doc.data().url,
              sound: doc.data().sound,
          };
          booksArray.push(book); // Thêm sách vào mảng
      });

      // Gửi phản hồi với danh sách sách tìm được
      res.json(booksArray); 
  } catch (error) {
      console.error('Error during book search:', error);
      res.status(400).json({ error: error.message });
  }
});

app.get('/api/account-info', async (req, res) => {
  try {
      const snapshot = await firestore.collection('active').where('account', '==', user_email).get();
      
      if (snapshot.empty) {
          return res.status(404).json({ error: 'Không tìm thấy thông tin người dùng' });
      }

      let accountData;
      snapshot.forEach(doc => {
          accountData = doc.data();
      });

      res.json({
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          active: accountData.active
      });
  } catch (error) {
      console.error('Lỗi khi truy xuất thông tin tài khoản:', error);
      res.status(500).json({ error: 'Lỗi khi truy xuất thông tin tài khoản' });
  }
});
app.put('/api/account-info', async (req, res) => {
  const { firstName, lastName, activeStatus } = req.body;

  // Check if `activeStatus` is provided and is a boolean
  if (typeof activeStatus !== 'boolean') {
      return res.status(400).json({ error: 'activeStatus phải là giá trị boolean' });
  }

  // Validate firstName and lastName
  if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Họ và tên là bắt buộc' });
  }

  try {
      const snapshot = await firestore.collection('active').where('account', '==', user_email).get();
      
      if (snapshot.empty) {
          return res.status(404).json({ error: 'Không tìm thấy người dùng' });
      }

      let docId;
      snapshot.forEach(doc => {
          docId = doc.id;
      });

      // Update the account information with the new values
      await firestore.collection('active').doc(docId).update({
          firstName,
          lastName,
          active: activeStatus
      });

      res.json({ 
          message: 'Cập nhật thông tin tài khoản thành công',
          firstName, 
          lastName, 
          active: activeStatus
      });
  } catch (error) {
      console.error('Lỗi khi cập nhật thông tin tài khoản:', error);
      res.status(500).json({ error: 'Lỗi khi cập nhật thông tin tài khoản' });
  }
});


app.post('/api/reset-password', async (req, res) => {
  const email = req.body.email;
  if (!email) {
      return res.status(400).json({ error: 'Email is required' });
  }
  
  try {
      // Kiểm tra xem email có tồn tại không
      const userRecord = await admin.auth().getUserByEmail(email);
      
      // Nếu email tồn tại, gửi email reset password
      await firebase.auth().sendPasswordResetEmail(email);
      return res.json({ message: 'Password reset email sent' });
  } catch (error) {
      // Kiểm tra xem có phải là lỗi không tìm thấy người dùng không
      if (error.code === 'auth/user-not-found') {
          return res.status(404).json({ error: 'Email không tồn tại trên hệ thống' });
      }
      console.error('Error sending password reset email:', error);
      return res.status(500).json({ error: error.message });
  }
});
app.post('/api/signin', async (req, res) => {
    console.log(req.body);
    const user = {
      email: req.body.email,
      password: req.body.password
    };
    try {
      const userCredential = await firebase.auth().signInWithEmailAndPassword(user.email, user.password);
      const idToken = await userCredential.user.getIdToken();
      // Retrieve user's email from the token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const userEmail = decodedToken.email;
      user_email=userEmail;
      console.log(userEmail);
      res.json({ idToken, email: userEmail });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
});

app.use('/api', bookRouter.routes)
app.get('/pay', async(req, res) => {
    try{
        const url = await paypal.createOrder();
        res.send(url);
    }catch(err){
        res.send('ERROR: ' + err)
    }
})

app.get('/complete-order', async (req, res) => {
    try {
        await paypal.capturePayment(req.query.token)

        const data = {
            active: true,
            account: user_email
        };
        const docRef = await firestore.collection('active').add(data);

        res.send('Hoàn thành đơn hàng')
    }catch(err){
        res.send('ERROR: ' + err)
    }
})

app.get('/api/account-status', async (req, res) => {
  try {
      const snapshot = await firestore.collection('active').where('account', '==', user_email).get();
      if (snapshot.empty) {
          console.log('Không tìm thấy dữ liệu');
          return res.status(404).json({ error: 'Không tìm thấy dữ liệu' });
      }

      let accountStatus;
      snapshot.forEach(doc => {
          accountStatus = doc.data().active;
      });

      res.json({ active: accountStatus });
  } catch (error) {
      console.error('Lỗi khi truy xuất dữ liệu:', error);
      res.status(500).json({ error: 'Lỗi khi truy xuất dữ liệu' });
  }
});


app.get('/cancel-order', (req, res) => {
    res.send("Cancel Order")
})

app.listen(config.port, () => console.log('listening on port ' + config.port))
