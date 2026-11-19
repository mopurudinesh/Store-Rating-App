# Rate Store

A role-based store rating app built with React, Express, and MySQL. It includes a system administrator, regular customers, and store owners in one sign-in flow.

## Run locally on Windows

Install Node.js (LTS) and MySQL Server, then create the `store_rating` database. You can run `backend/sql/schema.sql` in MySQL Workbench; the API creates or updates the application tables when it starts.

Open PowerShell in this project folder and run:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
npm.cmd run install:all
npm.cmd run dev
```

In `backend/.env`, set `DB_PASSWORD` to the password for your MySQL account. Keep the port at **3306** unless your MySQL server uses a different one. Save and close Notepad, then start the app. `npm.cmd` works in PowerShell even when script execution policy blocks `npm.ps1`.

Open **http://localhost:5173** in your browser. The API runs at **http://localhost:4000**. Keep the PowerShell window open while using the app; press `Ctrl+C` there to stop it. See [docs/database.md](docs/database.md) for the table relationships and schema notes.

On its first run, the server creates the application tables inside the database and seeds the initial admin account from the environment variables. Its default email is `storeappadmin@gmail.com` and default password is `Appadmin@123`; change `ADMIN_PASSWORD` before exposing the app beyond your machine. Passwords are stored as bcrypt hashes and login state is held in MySQL-backed sessions.

Regular users can register themselves. Admins can create other users, admins, stores, and store owner accounts. Customers can leave half-star ratings, written reviews, and optional JPG, PNG, or WebP photos (up to 5 MB). Rating and listing filters are enforced by the API as well as the interface.

To add example data, run `npm.cmd run seed:samples`. It creates 40 customers, 20 store owners, and one linked store for each owner. Sample accounts share the password `Sample@123`; for example, sign in as `sample.user01@example.test` or `sample.owner01@example.test`.
