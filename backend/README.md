# Backend

The API uses Express, Sequelize, and MySQL. It serves authentication, store ratings and reviews, admin tools, owner dashboards, and uploaded review photos.

## Configure MySQL

From the repository root, copy the example settings and edit the database credentials:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `DB_PASSWORD` for your MySQL account. The default connection uses `127.0.0.1:3306` and database `store_rating`. Create that database in MySQL Workbench or run `sql/schema.sql`. The API creates its tables and session table when it starts.

## Start the API

Install dependencies from the repository root with `npm.cmd run install:all`. Start both the API and website with `npm.cmd run dev`, or run only the API from this folder:

```powershell
npm.cmd run dev
```

The API listens at `http://localhost:4000`; its database health endpoint is `/api/health`.

## Initial accounts and security

On a new database, the API creates the initial administrator from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The example defaults are `storeappadmin@gmail.com` and `Appadmin@123`. Passwords are stored as bcrypt hashes; login sessions are stored in MySQL. Set a unique `SESSION_SECRET` and change the administrator password before deploying beyond a local evaluation.

Never commit `.env` or uploaded review photos. Both are excluded by the repository `.gitignore`.

## Sample data

From the repository root, run `npm.cmd run seed:samples` to create 40 customer accounts, 20 store owners, and their stores. The shared sample password is `Sample@123`.
