# Rate Store

Rate Store lets customers find stores and submit ratings and reviews. Administrators manage accounts and store listings. Store owners can see ratings and reviews for their store.

Built with React, Express, and MySQL. Passwords are hashed with bcrypt, and login sessions are stored in MySQL.

## Features

- Customers can register, search stores by name or address, and add or update a rating and review.
- Ratings range from 0.5 to 5 in half-star steps. Reviews can include a JPG, PNG, or WebP image up to 5 MB.
- Store owners can view their store's average rating and submitted reviews.
- Administrators can manage users and stores, see platform totals, and sort or filter lists.

Only customers can register themselves. Admins create other admin accounts and store owners. Adding a store owner also adds their store.

## Run locally

Install Node.js LTS, npm, and MySQL Server. Clone this repository and open a terminal in the project folder:

```sh
git clone https://github.com/mopurudinesh/Store-Rating-App.git
cd Store-Rating-App
```

In MySQL Workbench, run [`backend/sql/schema.sql`](backend/sql/schema.sql) to create the `store_rating` database and its tables.

Create the local backend settings file and enter your MySQL password as `DB_PASSWORD`:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Install the dependencies and start the app from the project folder:

```powershell
npm.cmd run install:all
npm.cmd run dev
```

Open [http://localhost:5173](http://localhost:5173). The API runs at `http://localhost:4000`. Leave the terminal open while using the app; press `Ctrl+C` to stop it. If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown. On macOS or Linux, copy the env file with `cp backend/.env.example backend/.env` and use `npm` instead of `npm.cmd`.

## Accounts

On a new database, the first start creates the admin account:

- Email: `storeappadmin@gmail.com`
- Password: `Appadmin@123`

It only creates this account if the email is not already in the database. For sample customers and store owners, run `npm.cmd run seed:samples` from the project folder. Sample accounts use `Sample@123`; examples are `sample.user01@example.test` and `sample.owner01@example.test`.

## Validation

User names can be 1–60 characters; store names must be 20–60. Addresses are limited to 400 characters. Passwords must be 8–16 characters and include an uppercase letter and a special character.

The `frontend/` and `backend/` folders each have a README with details about that part of the app. The database relationships are described in [`docs/database.md`](docs/database.md).
