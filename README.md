# Rate Store

Rate Store is a full-stack app for discovering stores and sharing ratings and reviews. It has one sign-in system, with different pages and permissions for administrators, customers, and store owners.

## What it does

- Customers can search stores by name or address, sort listings, and submit or edit a rating and review.
- Ratings use half-star steps from 0.5 to 5. Reviews can include a JPG, PNG, or WebP image up to 5 MB.
- Store owners can see their store's average rating and the customers who reviewed it.
- Administrators can see platform totals, create and manage accounts and stores, and sort or filter listings.
- Passwords are hashed with bcrypt. Login sessions are stored in MySQL.

## Roles

| Role | Main capabilities |
| --- | --- |
| **Administrator** | View user, store, and rating totals; add, edit, and delete users and stores; filter and sort listings; view store owner ratings. Creating a store owner also creates their store. |
| **Customer** | Register, browse and search stores, submit or edit a rating and review, and update their password. |
| **Store owner** | Sign in, update their password, view their store's average rating, and see submitted reviews. |

Public registration creates customer accounts only. Administrators create administrator and store owner accounts.

## Validation

- **User name:** 1–60 characters
- **Store name:** 20–60 characters
- **Address:** Up to 400 characters
- **Password:** 8–16 characters, including at least one uppercase letter and one special character
- **Email:** Standard email format

## Technology

- **Frontend:** React, React Router, and Vite
- **Backend:** Node.js and Express
- **Database:** MySQL and Sequelize

## Install and run

### Requirements

- Node.js LTS and npm
- MySQL Server running locally or reachable on your network
- MySQL Workbench if you want to initialize the database with a graphical tool

### 1. Get the project

```text
https://github.com/mopurudinesh/Store-Rating-App
```

Clone it, then open a terminal in the `Store-Rating-App` folder.

```powershell
git clone https://github.com/mopurudinesh/Store-Rating-App.git
Set-Location Store-Rating-App
```

### 2. Create the database

In MySQL Workbench, open and run [`backend/sql/schema.sql`](backend/sql/schema.sql). This creates the `store_rating` database and its application tables. The MySQL account in the app settings needs permission to use the database and create or update tables.

### 3. Set the connection details

In Windows PowerShell, create the local environment file and open it:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Set `DB_PASSWORD` to the password for your MySQL account. The defaults use host `127.0.0.1`, port `3306`, database `store_rating`, and user `root`. Save and close Notepad.

On macOS or Linux, use `cp backend/.env.example backend/.env` and edit `backend/.env` with your preferred text editor.

### 4. Install dependencies

In PowerShell, run:

```powershell
npm.cmd run install:all
```

On macOS or Linux, run `npm run install:all`.

### 5. Start the app

In PowerShell, run:

```powershell
npm.cmd run dev
```

On macOS or Linux, run `npm run dev`. Leave this terminal open while using the app. Press `Ctrl+C` there to stop both servers.

Open **http://localhost:5173** in your browser. The API runs at **http://localhost:4000**. If port 5173 is already occupied, Vite prints the alternate address it selected.

## First login

On a new database, the first API start creates the administrator account from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `backend/.env`. The example defaults are:

- **Email:** `storeappadmin@gmail.com`
- **Password:** `Appadmin@123`

The administrator is only created if that email does not already exist. For an existing database, use the password already assigned to that account.

To create optional sample data, run `npm.cmd run seed:samples` from PowerShell at the project root (`npm run seed:samples` on macOS or Linux). This adds 40 customers, 20 store owners, and their stores. All sample accounts use `Sample@123`; for example, `sample.user01@example.test` and `sample.owner01@example.test`.

## Helpful commands

| Command | Run from | What it does |
| --- | --- | --- |
| `npm.cmd run dev` | Project root | Start frontend and backend together |
| `npm.cmd run install:all` | Project root | Install all project dependencies |
| `npm.cmd run seed:samples` | Project root | Add optional sample accounts and stores |
| `npm.cmd run build` | `frontend/` | Build the frontend for production |
| `npm.cmd start` | `backend/` | Start the API without the development watcher |

For macOS and Linux, use `npm` in place of `npm.cmd`.

## Troubleshooting

- **`npm.ps1` is blocked in PowerShell:** Run the documented commands with `npm.cmd`.
- **API reports a MySQL connection error:** Start MySQL Server and check `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in `backend/.env`.
- **The browser cannot reach the API:** Keep both development servers running in the terminal and check `http://localhost:4000/api/health`.
- **Port 5173 is in use:** Open the alternate local URL printed by Vite, or stop the other process using that port and restart the app.

## Project layout

```text
Store-Rating-App/
├── backend/       # Express API, MySQL models, schema, and backend guide
├── frontend/      # React app, Vite config, and frontend guide
├── docs/          # Database relationship notes
├── package.json   # Root development and setup commands
└── README.md      # Project overview and installation guide
```

The backend architecture and request flow are documented in [`backend/README.md`](backend/README.md). Frontend routes and development details are in [`frontend/README.md`](frontend/README.md).

## Security notes

Do not commit `backend/.env` or files from `backend/uploads/`; both are ignored by Git. Change the default administrator password and set a unique `SESSION_SECRET` of at least 32 characters before deploying beyond local evaluation. The sample password is for local demonstration only.
