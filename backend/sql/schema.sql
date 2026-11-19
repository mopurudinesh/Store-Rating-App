-- Rate Store database
-- Run this file once before starting the API if the database does not exist yet.

CREATE DATABASE IF NOT EXISTS store_rating
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE store_rating;

-- One account table serves every role. Only store owners are linked to a store.
CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(60) NOT NULL,
  email         VARCHAR(254) NOT NULL,
  address       VARCHAR(400) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'user', 'owner') NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_users PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email),
  INDEX idx_users_name (name),
  INDEX idx_users_role (role)
);

-- owner_id is nullable so a store can be registered before its owner account.
-- UNIQUE keeps one store attached to each store-owner account.
CREATE TABLE IF NOT EXISTS stores (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(60) NOT NULL,
  email      VARCHAR(254) NOT NULL,
  address    VARCHAR(400) NOT NULL,
  owner_id   BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pk_stores PRIMARY KEY (id),
  CONSTRAINT uq_stores_owner UNIQUE (owner_id),
  CONSTRAINT fk_stores_owner
    FOREIGN KEY (owner_id) REFERENCES users (id)
    ON DELETE SET NULL,
  INDEX idx_stores_name (name)
);

-- A rating belongs to exactly one user and one store. The unique pair enforces
-- one editable review per user for each store; ratings use half-star steps.
CREATE TABLE IF NOT EXISTS ratings (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  store_id     BIGINT UNSIGNED NOT NULL,
  rating_value DECIMAL(2,1) NOT NULL,
  review       TEXT NULL,
  image_path   VARCHAR(500) NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
               ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT pk_ratings PRIMARY KEY (id),
  CONSTRAINT uq_ratings_user_store UNIQUE (user_id, store_id),
  CONSTRAINT chk_ratings_value CHECK (
    rating_value BETWEEN 0.5 AND 5 AND MOD(rating_value * 2, 1) = 0
  ),
  CONSTRAINT fk_ratings_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_ratings_store
    FOREIGN KEY (store_id) REFERENCES stores (id)
    ON DELETE CASCADE,
  INDEX idx_ratings_store (store_id)
);
