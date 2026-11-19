# Backend

The API uses Express and Sequelize with MySQL. It handles sign-in, role checks, input validation, store listings, ratings, reviews, and review photos.

## How requests move through the app

In development, the browser sends requests through Vite to Express. Express reads the MySQL-backed session, checks the user's role, validates the request, and then calls the route handler. Sequelize reads and writes the users, stores, and ratings tables. Review images are saved under `uploads/` and served from `/uploads`.

For example, when a customer saves a review, the API checks their session, validates the score and image, then inserts or updates the rating for that customer and store. A unique user/store key prevents duplicate reviews. If the image cannot be saved with the review, the API removes the unused upload.

## Database

The schema is in [`sql/schema.sql`](sql/schema.sql). It creates three main tables:

- `users` stores account details and the `admin`, `user`, or `owner` role. Passwords are stored as bcrypt hashes.
- `stores` stores a name, email, address, and optional owner. An owner can be linked to at most one store.
- `ratings` links a customer to a store and stores their half-star score, review, and optional image path. Each customer can leave one editable review per store.

The `sessions` table is created and managed by `connect-session-sequelize`. More detail is in [`../docs/database.md`](../docs/database.md).

## Setup

Create `backend/.env` from the example file and set the MySQL password:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

The defaults use MySQL at `127.0.0.1:3306`, database `store_rating`, and account `root`. Create the database by running `sql/schema.sql` in MySQL Workbench. Install dependencies from the repository root with `npm.cmd run install:all`.

Start both parts of the app from the root with `npm.cmd run dev`. To run only the API, open a terminal in `backend/` and run `npm.cmd run dev`. The API listens at `http://localhost:4000`; `GET /api/health` checks the database connection.

On macOS or Linux, use `cp backend/.env.example backend/.env`, edit the file, and use `npm` instead of `npm.cmd`.

## Configuration and security

The example file sets `PORT`, `CLIENT_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Change `DB_PASSWORD` for your MySQL installation. The initial admin defaults are `storeappadmin@gmail.com` and `Appadmin@123`; the account is only created if the email is not already present.

In development, the app generates a session secret when none is set. Before deploying, set a unique `SESSION_SECRET` of at least 32 characters and change the default admin password. Session cookies are HTTP-only and expire after 24 hours. The `.env` file and uploaded images are excluded by `.gitignore`.

## Routes

All routes are under `/api`. Admin and owner routes check the signed-in role on the server.

- **Authentication:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, and `PUT /auth/password`.
- **Customer stores:** `GET /stores` returns searchable and sortable stores; `PUT /stores/:id/rating` creates or updates a rating and review.
- **Admin:** `GET /admin/summary`; list or create accounts at `/admin/users`, then edit or delete them at `/admin/users/:id`. Store endpoints follow the same pattern at `/admin/stores` and `/admin/stores/:id`.
- **Store owner:** `GET /owner/dashboard` returns the store average and submitted reviews.
- **Health:** `GET /health` checks MySQL connectivity.

## Sample data

From the repository root, run `npm.cmd run seed:samples` to add 40 customers, 20 store owners, and one store for each owner. The shared password is `Sample@123`. The seeder can be run again without duplicating the sample accounts.
