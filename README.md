# Rate Store

Rate Store is a store rating and review app built for the Full Stack Intern coding challenge. It uses one sign-in system for three roles: system administrator, normal user (customer), and store owner. Each role sees the pages and actions for its work.

The frontend is React, the API is Express.js, and MySQL stores accounts, stores, ratings, reviews, and login sessions. Passwords are hashed with bcrypt.

## What the app does

### System administrator

The dashboard shows the number of users, stores, and submitted ratings. Admins can add, edit, and delete accounts and stores. Creating a store owner also creates the owner's store. The users list shows name, email, address, and role, with the store rating for owners. The stores list shows the store name, owner, email, address, and overall rating. Both lists support filtering and sorting.

### Normal user

Customers can register and sign in, change their password, search stores by name or address, and see both the overall rating and their own rating. They can submit or update a rating and review. Ratings use half-star steps from 0.5 to 5; a review can include a JPG, PNG, or WebP image up to 5 MB.

Public registration asks for a name, email, password, and password confirmation. It creates a customer account only. Admins create administrator and store owner accounts.

### Store owner

Store owners can sign in, change their password, see their store's average rating, and view the customers who submitted ratings and reviews.

All roles can sign out. Access to role-specific actions is checked by the API as well as the interface.

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

User names can be 1–60 characters; store names must be 20–60. Addresses are limited to 400 characters. Emails must use a valid email format. Passwords must be 8–16 characters and include an uppercase letter and a special character.

The `frontend/` and `backend/` folders each have a README with details about that part of the app. The database relationships are described in [`docs/database.md`](docs/database.md).
