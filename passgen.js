// Скопируй этот код и запусти его в Node.js

const bcrypt = require('bcryptjs');

const username = '123';
const password = '123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) throw err;
  console.log('Login:', username);
  console.log('Hashed password:', hash);
});
