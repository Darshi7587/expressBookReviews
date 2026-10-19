const express = require('express');
const books = require('./booksdb');
const { registerUser } = require('./auth_users');

const general = express.Router();

general.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || username.trim().length === 0
      || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    if (!await registerUser(username, password)) {
      return res.status(409).json({ message: 'Username is already registered' });
    }

    return res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    return next(error);
  }
});

general.get('/', (req, res) => {
  res.type('json').send(JSON.stringify(books, null, 2));
});

general.get('/isbn/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.json(book)
    : res.status(404).json({ message: 'Book not found' });
});

general.get('/author/:author', (req, res) => {
  const author = req.params.author.toLocaleLowerCase();
  const matches = Object.entries(books)
    .filter(([, book]) => book.author.toLocaleLowerCase().includes(author))
    .map(([isbn, book]) => ({ isbn, ...book }));

  return res.json(matches);
});

general.get('/title/:title', (req, res) => {
  const title = req.params.title.toLocaleLowerCase();
  const matches = Object.entries(books)
    .filter(([, book]) => book.title.toLocaleLowerCase().includes(title))
    .map(([isbn, book]) => ({ isbn, ...book }));

  return res.json(matches);
});

general.get('/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  return book
    ? res.json(book.reviews)
    : res.status(404).json({ message: 'Book not found' });
});

module.exports = { general };
