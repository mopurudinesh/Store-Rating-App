# Backend

The API is built with Express and Sequelize. It handles accounts, roles, stores, ratings, and reviews. MySQL stores the application data and login sessions.

## How it works

In development, Vite forwards browser requests to Express. Express reads the session, checks the user's role, validates the request, and runs the matching route. Sequelize reads and writes the database. Review images are kept in `uploads/` and served from `/uploads`.

The main tables are:

- `users` — account details, password hash, and role (`admin`, `user`, or `owner`).
- `stores` — store name, address, and a required unique owner link. The owner's account email is used on the store listing and for sign-in.
- `ratings` — one rating and review per customer for each store; image paths are optional.
- `sessions` — sign-in sessions, managed by `connect-session-sequelize`.

Each store must have one owner, and each owner must have one store. Admins create both together from the user form; the owner email is the only email for the pair and can be changed by the owner. Removing a store removes its owner account and ratings, while removing an owner account removes the linked store. Ratings use half-star steps from 0.5 to 5. See [`sql/schema.sql`](sql/schema.sql) for the schema.

## Run the API

From the project root, copy the example settings and enter your MySQL password in `backend/.env`:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

The defaults use `127.0.0.1:3306`, database `store_rating`, and MySQL user `root`. Run `sql/schema.sql` in MySQL Workbench to create the database. Install the dependencies from the project root with `npm.cmd run install:all`.

To start the frontend and backend together, run `npm.cmd run dev` from the project root. To run only the API, open a terminal in `backend/` and run:

```powershell
npm.cmd run dev
```

The API listens on `http://localhost:4000`. Visit `http://localhost:4000/api/health` to check its database connection.

On macOS or Linux, copy the env file with `cp backend/.env.example backend/.env` and use `npm` instead of `npm.cmd`.

## Routes

All routes start with `/api`.

- **Sign-in:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password`.
- **Stores and ratings:** `GET /stores`, `PUT /stores/:id/rating`.
- **Admin:** `GET /admin/summary`; list or add users with `GET` and `POST /admin/users`, then edit or remove them with `PUT` and `DELETE /admin/users/:id`. List, edit, or delete stores with `GET /admin/stores` and `PUT` or `DELETE /admin/stores/:id`. Adding an owner account also creates their store.
- **Owner:** `GET /owner/dashboard`, `PUT /owner/profile` to update owner and store details, `DELETE /owner/store` to remove the linked store and owner account.

The API checks roles on protected routes. Public registration only creates customer accounts; admins add admin and owner accounts.
