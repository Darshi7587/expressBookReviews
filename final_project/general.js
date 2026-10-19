const axios = require('axios');

const api = axios.create({
  baseURL: process.env.BOOKS_API_URL || 'http://localhost:5000',
  timeout: 5000
});

async function getAllBooks() {
  const response = await api.get('/');
  return response.data;
}

async function getBookByISBN(isbn) {
  const response = await api.get(`/isbn/${encodeURIComponent(isbn)}`);
  return response.data;
}

async function getBooksByAuthor(author) {
  const response = await api.get(`/author/${encodeURIComponent(author)}`);
  return response.data;
}

async function getBooksByTitle(title) {
  const response = await api.get(`/title/${encodeURIComponent(title)}`);
  return response.data;
}

module.exports = {
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle
};
