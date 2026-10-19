const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { app } = require('../index');

let server;
let baseUrl;
let aliceToken;
let bobToken;

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
}

async function registerAndLogin(username) {
  const registration = await request('/register', {
    method: 'POST',
    body: JSON.stringify({ username, password: 'test-password' })
  });
  assert.equal(registration.status, 201);

  const login = await request('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ username, password: 'test-password' })
  });
  assert.equal(login.status, 200);
  return (await login.json()).token;
}

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  aliceToken = await registerAndLogin('alice-test');
  bobToken = await registerAndLogin('bob-test');
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

test('public endpoints list and search the seeded books', async () => {
  const allBooks = await request('/');
  assert.equal(allBooks.status, 200);
  const allBooksBody = await allBooks.text();
  assert.match(allBooksBody, /^\{\r?\n/);
  assert.equal(Object.keys(JSON.parse(allBooksBody)).length, 10);

  const byIsbn = await request('/isbn/1');
  assert.equal((await byIsbn.json()).title, 'Things Fall Apart');

  const byAuthor = await request('/author/jane%20austen');
  assert.equal((await byAuthor.json())[0].isbn, '8');

  const byTitle = await request('/title/pride');
  assert.equal((await byTitle.json())[0].title, 'Pride and Prejudice');

  const reviews = await request('/review/1');
  assert.deepEqual(await reviews.json(), {});
});

test('registration validates fields and rejects duplicate usernames', async () => {
  const missingFields = await request('/register', {
    method: 'POST',
    body: JSON.stringify({ username: '', password: '' })
  });
  assert.equal(missingFields.status, 400);

  const duplicate = await request('/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice-test', password: 'another-password' })
  });
  assert.equal(duplicate.status, 409);

  const invalidLogin = await request('/customer/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'alice-test', password: 'wrong-password' })
  });
  assert.equal(invalidLogin.status, 401);
});

test('authenticated users can add, update, and delete only their own reviews', async () => {
  const unauthorized = await request('/customer/auth/review/1', {
    method: 'PUT',
    body: JSON.stringify({ review: 'A thoughtful book' })
  });
  assert.equal(unauthorized.status, 401);

  const addReview = await request('/customer/auth/review/1', {
    method: 'PUT',
    headers: { authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({ review: 'A thoughtful book' })
  });
  assert.equal(addReview.status, 200);
  assert.equal((await addReview.json()).reviews['alice-test'], 'A thoughtful book');

  const updateReview = await request('/customer/auth/review/1', {
    method: 'PUT',
    headers: { authorization: `Bearer ${aliceToken}` },
    body: JSON.stringify({ review: 'Updated review' })
  });
  assert.equal((await updateReview.json()).reviews['alice-test'], 'Updated review');

  const bobDelete = await request('/customer/auth/review/1', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${bobToken}` }
  });
  assert.equal(bobDelete.status, 404);

  const aliceDelete = await request('/customer/auth/review/1', {
    method: 'DELETE',
    headers: { authorization: `Bearer ${aliceToken}` }
  });
  assert.equal(aliceDelete.status, 200);
  assert.deepEqual((await aliceDelete.json()).reviews, {});
});
