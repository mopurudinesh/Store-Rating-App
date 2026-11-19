# Rate Store

Rate Store is a small store-rating app built with React, Express, and MySQL. Customers can find stores and leave ratings and reviews. Store owners can see feedback for their store, and administrators manage the accounts and store listings.

## Features

- Customers can register, search stores by name or address, and add or update a rating and review.
- Ratings support half-star steps from 0.5 to 5. Reviews may include a JPG, PNG, or WebP image (up to 5 MB).
- Store owners can see their average rating and the customers who reviewed them.
- Administrators can view platform totals and manage users and stores, including sorting and filters.
- Passwords are hashed with bcrypt. Login sessions are stored in MySQL.

Only customers can register themselves. An administrator creates admin and store owner accounts. When creating an owner, the administrator also enters their store details.

## Run it locally

You will need Node.js LTS, npm, and a running MySQL Server. The default MySQL connection is `127.0.0.1:3306`.

Clone the repository and open a terminal in its folder:

```powershell
git clone https://github.com/mopurudinesh/Store-Rating-App.git
Set-Location Store-Rating-App
```

In MySQL Workbench, run [`backend/sql/schema.sql`](backend/sql/schema.sql). It creates the `store_rating` database and its tables.

Create the backend settings file and set `DB_PASSWORD` to your MySQL password:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Then install dependencies and start the app from the project folder:

```powershell
npm.cmd run install:all
npm.cmd run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:4000**. Leave the terminal open while using the app; press `Ctrl+C` to stop it. In PowerShell, use `npm.cmd` if the system blocks `npm.ps1`. On macOS or Linux, use `cp backend/.env.example backend/.env`, edit that file, then run the same commands with `npm` instead of `npm.cmd`.

## Sign in

On a new database, the first API start creates an administrator using the defaults from `backend/.env.example`:

- Email: `storeappadmin@gmail.com`
- Password: `Appadmin@123`

The account is only created if that email is not already in the database. If you already have an account, use its current password.

For optional sample data, run `npm.cmd run seed:samples` from the project folder. It adds 40 customers, 20 store owners, and their stores. Sample accounts use `Sample@123`; examples include `sample.user01@example.test` and `sample.owner01@example.test`.

## Validation

User names are 1–60 characters; store names are 20–60. Addresses can be up to 400 characters. Passwords must be 8–16 characters and include an uppercase letter and a special character. Email addresses are validated before saving.

## Project folders

- `frontend/` contains the React app. See [frontend/README.md](frontend/README.md) for page and development notes.
- `backend/` contains the Express API, MySQL schema, and seed script. See [backend/README.md](backend/README.md) for API and data details.
- `docs/database.md` describes the database relationships.

Change the default admin password and set a unique `SESSION_SECRET` before deploying the app beyond local evaluation. Do not commit `backend/.env` or uploaded review images; Git ignores both.
