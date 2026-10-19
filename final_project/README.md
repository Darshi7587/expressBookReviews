# Online Book Review API

Express API for the seeded book catalogue and user reviews.

## Run

```sh
npm install
npm start
```

The server listens on port `5000` by default. Set `PORT`, `SESSION_SECRET`, and
`JWT_SECRET` before deployment.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List all books |
| `GET` | `/isbn/:isbn` | Find a book by catalogue key (`1`–`10`) |
| `GET` | `/author/:author` | Search author names (case-insensitive partial match) |
| `GET` | `/title/:title` | Search titles (case-insensitive partial match) |
| `GET` | `/review/:isbn` | Read a book's reviews |
| `POST` | `/register` | Register using `{"username":"...","password":"..."}` |
| `POST` | `/customer/login` | Log in and receive a JWT |
| `PUT` | `/customer/auth/review/:isbn` | Add or update your review |
| `DELETE` | `/customer/auth/review/:isbn` | Delete only your review |

Protected review endpoints accept a session cookie from login or an
`Authorization: Bearer <token>` header. Passwords are stored as salted scrypt
hashes. Books and reviews are kept in memory and reset when the server stops.

`general.js` exports asynchronous Axios helpers for listing books, looking up an
ISBN, and searching by author or title. Set `BOOKS_API_URL` to change their API
origin. Run the API tests with `npm test`.
