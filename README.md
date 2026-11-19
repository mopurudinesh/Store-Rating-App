# Rate Store

## Project overview

Rate Store is a web app for finding stores and sharing ratings and reviews. It has one login system for three roles: System Administrator, Normal User, and Store Owner. After signing in, each person gets the pages and actions for their role.

Customers can search the store list and leave a rating and review. Store owners can see feedback for their store. The administrator manages accounts and stores and can see totals for the whole platform.

## Tech stack

- **Frontend:** React.js and Vite
- **Backend:** Node.js and Express.js
- **Database:** MySQL with Sequelize
- **Authentication:** Express sessions stored in MySQL
- **Password hashing:** bcrypt

## User roles and permissions

### System Administrator

- View the total number of users, stores, and submitted ratings.
- Add, edit, and delete users and stores, including admin accounts.
- Create a store owner with a temporary password and add the owner's store details in the same form.
- View users by name, email, address, and role. Store owners also show their store's average rating.
- View stores by store name, owner name, store email, address, and overall rating.
- Filter and sort user and store lists.
- Change their password and sign out.

### Normal User

- Register and sign in through the shared login system.
- Search stores by name or address.
- See the store's overall rating and their own submitted rating.
- Submit a rating or change their existing rating.
- Add a written review and optional image to a rating.
- Change their password and sign out.

Public registration creates Normal User accounts only. Its fields are name, email, password, and password confirmation. Admins create administrator and Store Owner accounts.

### Store Owner

- Sign in and change their password.
- See their store's average rating.
- View the customers who rated their store, with their ratings and reviews.
- Sign out.

## Key features

- One role-based login system with server-side access checks.
- Admin dashboard totals and account/store management.
- Search and filters on the user and store lists, with ascending/descending sorting on all data tables.
- Half-star ratings from 0.5 to 5, with the same rating colors throughout the app.
- Editable reviews with optional JPG, PNG, or WebP images, up to 5 MB.
- MySQL relationships keep users, stores, ratings, and sessions organized. See [docs/database.md](docs/database.md).

## Form validation

- **User name:** 1–60 characters.
- **Store name:** 20–60 characters.
- **Address:** Up to 400 characters.
- **Password:** 8–16 characters, including at least one uppercase letter and one special character.
- **Email:** Must use a valid email format.

The public signup form does not ask for an address. Admin-created user accounts and stores include an address; an owner's address is their store address.

## Demo accounts

On a new database, the app creates this administrator the first time the API starts:

- **Email:** `storeappadmin@gmail.com`
- **Password:** `Appadmin@123`

To create sample customer and owner accounts, run `npm.cmd run seed:samples` from the project folder. The sample password is `Sample@123`.

- **Customer:** `sample.user01@example.test`
- **Store Owner:** `sample.owner01@example.test`

The sample accounts are available only after running the seed command. If the admin account already exists in your database, use its current password.

## Setup instructions

### 1. Install the requirements

Install Node.js LTS, npm, and MySQL Server. Start MySQL before launching the app.

### 2. Get the project

```sh
git clone https://github.com/mopurudinesh/Store-Rating-App.git
cd Store-Rating-App
```

### 3. Create the database

Open `backend/sql/schema.sql` in MySQL Workbench and run it. This creates the `store_rating` database and its tables.

### 4. Add your MySQL password

In Windows PowerShell, run:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `DB_PASSWORD` to your MySQL password, then save and close Notepad. The default connection uses `127.0.0.1`, port `3306`, database `store_rating`, and user `root`.

### 5. Install and start the app

From the project folder in PowerShell, run:

```powershell
npm.cmd run install:all
npm.cmd run dev
```

Open **http://localhost:5173**. The API runs at **http://localhost:4000**. Keep the terminal open while using the app; press `Ctrl+C` to stop it. If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown.

On macOS or Linux, copy the settings file with `cp backend/.env.example backend/.env`, edit `backend/.env`, then use `npm` instead of `npm.cmd` for the install and start commands.

## API routes

All routes start with `/api`.

- **Authentication:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password`.
- **Customer stores and ratings:** `GET /stores`, `PUT /stores/:id/rating` (submit or update a rating).
- **Administrator:** `GET /admin/summary`; `GET` and `POST /admin/users`; `PUT` and `DELETE /admin/users/:id`; the same list, add, edit, and delete methods for `/admin/stores`.
- **Store Owner:** `GET /owner/dashboard`.
- **Database health:** `GET /health`.

The [frontend README](frontend/README.md) describes the pages and frontend commands. The [backend README](backend/README.md) covers the API and database implementation.
