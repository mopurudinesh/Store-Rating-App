# Rate Store

## Project overview

Rate Store is a web app for customers to find stores and submit ratings. It has one login system with role-based access for a System Administrator, Normal Users, and Store Owners. Admins manage the platform, customers rate stores, and owners can see the feedback for their store.

## Tech stack

- **Frontend:** React.js and Vite
- **Backend:** Node.js and Express.js
- **Database:** MySQL with Sequelize
- **Authentication:** MySQL-backed sessions
- **Password storage:** bcrypt hashing

## User roles and permissions

### System Administrator

- See totals for users, stores, and submitted ratings.
- Add, edit, and delete users and stores. Admins can create customer or admin accounts.
- Create a store owner and their store together in one form. Each owner has exactly one store, and every store has exactly one owner.
- View user name, email, address, role, and—when applicable—the owner's store rating.
- View store name, owner name, email, address, and overall rating.
- Filter users by name, email, address, and role; filter stores by their details and rating. Sort lists in ascending or descending order.
- Change password and sign out.

### Normal User

- Register, sign in, change password, and sign out.
- Search stores by name or address.
- See each store's address and overall rating, along with their own submitted rating.
- Submit or change a store rating, and add a written review with an optional image.

Public registration creates Normal User accounts only. The form asks for name, email, password, and password confirmation. Admins create admin and Store Owner accounts.

### Store Owner

- Sign in, change password, and sign out.
- Edit their name, email, store name, and store address. Changes appear in store listings and admin pages.
- Delete their store. This also deletes the linked owner account, its ratings, and review photos.
- See the average rating for their store.
- View the users who rated the store and their submitted ratings and reviews.

## Key features

- Ratings use half-star steps from 0.5 to 5, with consistent star colors across the app.
- Reviews can include a JPG, PNG, or WebP image up to 5 MB.
- User, store, and rating tables support ascending and descending sorting. Admin lists can also be searched and filtered.
- Role access is checked by the API as well as the frontend.
- The owner's email is the single email used to sign in and shown on the store listing. Owners can change it from their profile menu; the store listing updates with it.
- A store cannot be unlinked from its owner. Deleting a store also deletes its owner account and store ratings; deleting an owner account also removes that owner's store.

## Form validation rules

- **User name:** 1–60 characters.
- **Store name:** 20–60 characters.
- **Address:** Up to 400 characters.
- **Password:** 8–16 characters, with at least one uppercase letter and one special character.
- **Email:** Must use a valid email format.

The minimum name length applies to store names. The public user registration form does not ask for an address; admins enter addresses when creating accounts.

## Demo credentials

On a new database, the API creates the initial administrator the first time it starts:

- **Email:** `storeappadmin@gmail.com`
- **Password:** `Appadmin@123`

For sample customer and store owner accounts, first run `npm.cmd run seed:samples` from the project folder. Their shared password is `Sample@123`:

- **Normal User:** `sample.user01@example.test`
- **Store Owner:** `sample.owner01@example.test`

The sample accounts are only available after running the seed command. If the admin account already exists in the database, use its existing password.

## Setup instructions

### 1. Install the requirements

Install Node.js LTS, npm, and MySQL Server. Start MySQL before running the app.

### 2. Clone the project

```sh
git clone https://github.com/mopurudinesh/Store-Rating-App.git
cd Store-Rating-App
```

### 3. Create the database

Open `backend/sql/schema.sql` in MySQL Workbench and run it. This creates the `store_rating` database and its tables.

### 4. Configure the database connection

In Windows PowerShell, copy the example settings and open the new file:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `DB_PASSWORD` to your MySQL password, then save and close Notepad. The defaults are host `127.0.0.1`, port `3306`, database `store_rating`, and user `root`.

On macOS or Linux, run `cp backend/.env.example backend/.env` and edit `backend/.env` with your text editor.

### 5. Install and run

From the project folder in PowerShell, run:

```powershell
npm.cmd run install:all
npm.cmd run dev
```

Open **http://localhost:5173** in your browser. The API runs at **http://localhost:4000**. Keep the terminal open while using the app; press `Ctrl+C` to stop it. If PowerShell blocks `npm.ps1`, use `npm.cmd` as shown. On macOS or Linux, run the same scripts with `npm` instead of `npm.cmd`.

## API endpoints

All routes start with `/api`.

- **Authentication:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`, `PUT /auth/password`.
- **Stores and ratings:** `GET /stores`, `PUT /stores/:id/rating` (submit or update a rating and review).
- **Administrator:** `GET /admin/summary`; `GET` and `POST /admin/users`; `PUT` and `DELETE /admin/users/:id`; `GET`, `PUT`, and `DELETE /admin/stores/:id`.
- **Store Owner:** `GET /owner/dashboard`, `PUT /owner/profile`, `DELETE /owner/store`.
- **Health check:** `GET /health`.

See [frontend/README.md](frontend/README.md) for frontend details and [backend/README.md](backend/README.md) for the API and database structure.
