# Rate Store database layout

The database is named `store_rating`. It uses three application tables plus a session table managed by `connect-session-sequelize`.

## Relationships

```text
users 1 ───── 0..1 stores       (a store may have one owner)
users 1 ──────── * ratings      (a customer can rate many stores)
stores 1 ─────── * ratings      (a store can receive many ratings)
```

`users` is the shared account table. The `role` column distinguishes `admin`, `user` (customer), and `owner` accounts. A store owner is attached through `stores.owner_id`; it is nullable so an administrator can add a store before creating its owner account.

`ratings` is the link between a customer and a store. The unique `(user_id, store_id)` key makes each rating and review editable instead of allowing duplicate submissions. `rating_value` is a decimal between 0.5 and 5 in half-star steps. Reviews are stored as text; uploaded image files are stored under `backend/uploads/` and their relative paths are stored in `image_path`. Deleting a customer or store removes its ratings and associated review photos. Through the admin interface, deleting an owner also deletes their store and its ratings; deleting a store directly leaves the owner account available to link to another store.

## Tables

| Table | Purpose | Important fields |
| --- | --- | --- |
| `users` | Sign-in and roles for every account | `password_hash`, `role`, unique `email` |
| `stores` | Store directory and owner association | `owner_id`, `name`, `address` |
| `ratings` | Customer reviews for stores | `user_id`, `store_id`, `rating_value`, `review`, `image_path`, unique user/store pair |
| `sessions` | Persistent login sessions | Created and maintained by the session store package |

Run `backend/sql/schema.sql` to create the database and business tables. The API creates the session table and upgrades an existing ratings table with decimal scores, reviews, and image paths when it starts.
