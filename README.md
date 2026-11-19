# Rate Store

A store rating and review app with role-based access for administrators, customers, and store owners. Customers can discover stores, leave half-star ratings and reviews, and update their submissions. Administrators manage accounts and stores; owners see the feedback for their store.

## Project overview

- One sign-in flow with role-based permissions
- Store search, listing filters, and ascending/descending sorting
- Admin dashboards and management for users, owners, and stores
- Store owner dashboard with average rating and customer reviews
- Bcrypt password hashing and MySQL-backed login sessions
- Written reviews and optional JPG, PNG, or WebP photos

## Tech stack

- **Frontend:** React and Vite
- **Backend:** Express.js
- **Database:** MySQL with Sequelize

## Roles and access

### System administrator

The administrator dashboard shows total users, stores, and ratings. Admins can create, view, edit, and delete users and stores; filter and sort listings; and view store owner ratings. A store owner is created together with their store.

### Normal user

Users can register, sign in, update their password, search stores by name or address, and submit or edit ratings and reviews. Public signup asks for a name, email, password, and password confirmation. Only an administrator can create admin or store owner accounts.

### Store owner

Owners can sign in, update their password, see their store's average rating, and view the customers who submitted reviews.

## Local administrator account

On a new database, the first API start creates this administrator:

- **Email:** `storeappadmin@gmail.com`
- **Password:** `Appadmin@123`

These are the defaults in `backend/.env.example`. They only seed an account when that email does not already exist. Change the password before deploying the app beyond a local evaluation.

To add optional sample accounts, run `npm.cmd run seed:samples` from the project root. This creates 40 customers, 20 store owners, and their stores. All sample accounts use `Sample@123`; examples are `sample.user01@example.test` and `sample.owner01@example.test`.

## Validation and ratings

- **User name:** 1–60 characters
- **Store name:** 20–60 characters
- **Address:** Up to 400 characters
- **Password:** 8–16 characters, with at least one uppercase letter and one special character
- **Email:** Standard email format
- **Rating:** 0.5–5 in half-star steps
- **Review photo:** JPG, PNG, or WebP, up to 5 MB

Tables can be sorted ascending or descending by relevant fields. Listings also have role-appropriate search and filters. The normalized schema and relationships are described in [docs/database.md](docs/database.md).

## Setup on Windows

Install Node.js LTS and MySQL Server. Create a database named `store_rating` in MySQL Workbench, or run `backend/sql/schema.sql` there. The API creates the application tables when it starts.

Open PowerShell in the project folder and run:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
npm.cmd run install:all
npm.cmd run dev
```

In `backend/.env`, set `DB_PASSWORD` to your MySQL password. The default connection uses `127.0.0.1:3306`. Save and close Notepad before starting the app. `npm.cmd` avoids PowerShell's script execution policy issue with `npm.ps1`.

Open the website at **http://localhost:5173**. The API runs at **http://localhost:4000**. If port 5173 is already in use, Vite prints the alternate website address. Keep PowerShell open while using the app; press `Ctrl+C` in that window to stop it.

## API routes

All routes use the `/api` prefix. Protected routes use the signed-in session and enforce the user's role.

### Authentication

- `POST /api/auth/register` — register a normal user
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — get the current session
- `POST /api/auth/logout` — sign out
- `PUT /api/auth/password` — change password

### Stores and ratings

- `GET /api/stores` — list and search stores (normal users)
- `PUT /api/stores/:id/rating` — submit or update a rating and review (normal users)

### Administrator

- `GET /api/admin/summary` — dashboard counts
- `GET`, `POST /api/admin/users` — list or create users
- `PUT`, `DELETE /api/admin/users/:id` — edit or delete a user
- `GET`, `POST /api/admin/stores` — list or create stores
- `PUT`, `DELETE /api/admin/stores/:id` — edit or delete a store

### Store owner

- `GET /api/owner/dashboard` — store average and customer reviews

### Health

- `GET /api/health` — check API and database availability
