const express = require('express');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const books = require('./booksdb');
const { jwtSecret } = require('../config');

const scrypt = promisify(crypto.scrypt);
const regd_users = express.Router();
const users = [];
const pendingUsernames = new Set();

const isValid = (username) => (
  typeof username === 'string'
  && username.trim().length > 0
  && !users.some((user) => user.username === username.trim())
  && !pendingUsernames.has(username.trim())
);

async function registerUser(username, password) {
  if (!isValid(username) || typeof password !== 'string' || password.length === 0) {
    return false;
  }

  const normalizedUsername = username.trim();
  pendingUsernames.add(normalizedUsername);
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = await scrypt(password, salt, 64);
    users.push({ username: normalizedUsername, salt, passwordHash });
    return true;
  } finally {
    pendingUsernames.delete(normalizedUsername);
  }
}

async function authenticatedUser(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') {
    return false;
  }

  const user = users.find((candidate) => candidate.username === username.trim());
  if (!user) {
    return false;
  }

  const passwordHash = await scrypt(password, user.salt, 64);
  return crypto.timingSafeEqual(user.passwordHash, passwordHash);
}

//only registered users can login
regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!await authenticatedUser(username, password)) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const normalizedUsername = username.trim();
    req.session.username = normalizedUsername;
    const token = jwt.sign({ username: normalizedUsername }, jwtSecret, { expiresIn: '1h' });
    return res.json({ message: 'Login successful', token });
  } catch (error) {
    return next(error);
  }
});

// Add a book review
regd_users.put('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  const review = req.body && req.body.review;
  if (typeof review !== 'string' || review.trim().length === 0) {
    return res.status(400).json({ message: 'A non-empty review is required' });
  }

  book.reviews[req.user.username] = review.trim();
  return res.json({
    message: 'Review added or updated successfully',
    reviews: book.reviews
  });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: 'Book not found' });
  }

  if (!Object.hasOwn(book.reviews, req.user.username)) {
    return res.status(404).json({ message: 'Review not found for this user' });
  }

  delete book.reviews[req.user.username];
  return res.json({ message: 'Review deleted successfully', reviews: book.reviews });
});

module.exports.authenticated = regd_users;
module.exports.isValid = isValid;
module.exports.users = users;
module.exports.registerUser = registerUser;
module.exports.authenticatedUser = authenticatedUser;
