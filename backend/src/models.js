import { DataTypes } from 'sequelize';
import { sequelize } from './db.js';

export const User = sequelize.define('users', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(60),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true
  },
  address: {
    type: DataTypes.STRING(400),
    allowNull: false
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.ENUM('admin', 'user', 'owner'),
    allowNull: false,
    defaultValue: 'user'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

export const Store = sequelize.define('stores', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(60),
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(254),
    allowNull: false
  },
  address: {
    type: DataTypes.STRING(400),
    allowNull: false
  },
  ownerId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: true,
    unique: true,
    field: 'owner_id'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

export const Rating = sequelize.define('ratings', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    field: 'user_id'
  },
  storeId: {
    type: DataTypes.BIGINT.UNSIGNED,
    allowNull: false,
    field: 'store_id'
  },
  score: {
    type: DataTypes.DECIMAL(2, 1),
    allowNull: false,
    field: 'rating_value',
    validate: { min: 0.5, max: 5 }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  imagePath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_path'
  }
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{
    unique: true,
    name: 'uq_ratings_user_store',
    fields: ['user_id', 'store_id']
  }]
});

// Relationships: a user can own one store and submit ratings for many stores.
User.hasOne(Store, { foreignKey: 'ownerId', as: 'store' });
Store.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

User.hasMany(Rating, { foreignKey: 'userId', as: 'ratings' });
Rating.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Store.hasMany(Rating, { foreignKey: 'storeId', as: 'ratings' });
Rating.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
