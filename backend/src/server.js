import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import SequelizeStoreInit from 'connect-session-sequelize';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataTypes, Op, fn, col, literal } from 'sequelize';
import { sequelize } from './db.js';
import { User, Store, Rating } from './models.js';
import { accountRules, accountUpdateRules, registrationRules, storeRules, storeUpdateRules, checkValidation } from './validation.js';

const app = express();
const uploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');
const imageTypes = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, uploadDirectory),
    filename: (_req, file, done) => done(null, `${randomUUID()}${imageTypes[file.mimetype] || '.img'}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => imageTypes[file.mimetype]
    ? done(null, true)
    : done(Object.assign(new Error('Choose a JPG, PNG, or WebP image.'), { status: 422 }))
});
const SessionStore = SequelizeStoreInit(session.Store);
const sessionStore = new SessionStore({ db: sequelize, tableName: 'sessions', checkExpirationInterval: 15 * 60 * 1000, expiration: 24 * 60 * 60 * 1000 });
const configuredSecret = process.env.SESSION_SECRET?.trim();
const usableSecret = configuredSecret && configuredSecret.length >= 32 && !configuredSecret.toLowerCase().startsWith('replace-');
if (process.env.NODE_ENV === 'production' && !usableSecret) throw new Error('Set a unique SESSION_SECRET of at least 32 characters before starting in production.');
const sessionSecret = usableSecret ? configuredSecret : randomBytes(32).toString('hex');
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(session({ name: 'store.sid', secret: sessionSecret, store: sessionStore, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } }));
app.use('/uploads', express.static(uploadDirectory, { dotfiles: 'deny', index: false }));

const safeUser = ({ id, name, email, address, role }) => ({ id, name, email, address, role });
const requireAuth = (req, res, next) => req.session.user ? next() : res.status(401).json({ message: 'Please sign in to continue.' });
const requireRole = (...roles) => (req, res, next) => roles.includes(req.session.user?.role) ? next() : res.status(403).json({ message: 'You do not have access to this page.' });
const pageArgs = (req) => ({ limit: Math.min(Math.max(Number(req.query.limit) || 25, 1), 100), offset: Math.max(Number(req.query.offset) || 0, 0) });
const nameWhere = (value) => value ? { [Op.like]: `%${String(value).slice(0, 100)}%` } : undefined;
const addFilters = (where, query, fields) => {
  for (const field of fields) if (query[field]) where[field] = nameWhere(query[field]);
  if (query.q) where[Op.or] = fields.map(field => ({ [field]: nameWhere(query.q) }));
};
const addAndFilter = (where, condition) => { where[Op.and] = [...(where[Op.and] || []), condition]; };
const ratingFilterValue = raw => {
  if (raw == null || String(raw).trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 5 ? value : null;
};
const storeRatingOrder = (sort, direction, userId) => sort === 'rating'
  ? [[literal('(SELECT AVG(r.rating_value) FROM ratings AS r WHERE r.store_id = stores.id)'), direction]]
  : sort === 'userRating'
    ? [[literal(`(SELECT ur.rating_value FROM ratings AS ur WHERE ur.store_id = stores.id AND ur.user_id = ${Number(userId)})`), direction]]
    : sort === 'created'
      ? [[literal('stores.created_at'), direction]]
      : [[sort, direction]];

async function removeUploadedFile(file) {
  if (file?.path) await unlink(file.path).catch(() => {});
}

async function isValidImage(file) {
  const bytes = await readFile(file.path);
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (file.mimetype === 'image/webp') return bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  return false;
}

async function removeStoredImage(imagePath) {
  const filename = path.basename(String(imagePath || ''));
  if (/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) await unlink(path.join(uploadDirectory, filename)).catch(() => {});
}

async function revokeUserSessions(userId, transaction) {
  const [sessions] = await sequelize.query(
    "SELECT sid FROM sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.user.id')) = :userId",
    { replacements: { userId: String(userId) }, transaction }
  );
  const sessionIds = sessions.map(session => session.sid);
  if (sessionIds.length) await sequelize.query('DELETE FROM sessions WHERE sid IN (:sessionIds)', { replacements: { sessionIds }, transaction });
}

app.get('/api/health', async (_req, res) => {
  try { await sequelize.authenticate(); res.json({ ok: true }); }
  catch { res.status(503).json({ ok: false, message: 'The database is not available.' }); }
});
app.post('/api/auth/register', registrationRules, checkValidation, async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const user = await User.create({ name: req.body.name.trim(), email: req.body.email, address: '', passwordHash, role: 'user' });
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = safeUser(user); res.status(201).json({ user: req.session.user });
  } catch (e) { if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'An account with that email already exists.' }); next(e); }
});
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ code: 'ACCOUNT_NOT_FOUND', message: 'No account exists with this email. Create an account to continue.' });
    if (!(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ message: 'Password is incorrect.' });
    await new Promise((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
    req.session.user = safeUser(user); res.json({ user: req.session.user });
  } catch (e) { next(e); }
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.session.user }));
app.post('/api/auth/logout', requireAuth, (req, res, next) => req.session.destroy(err => err ? next(err) : (res.clearCookie('store.sid'), res.json({ message: 'Signed out.' }))));
app.put('/api/auth/password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, password } = req.body;
    const errors = [];
    if (!String(password || '').match(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/)) errors.push('New password must be 8–16 characters and include an uppercase letter and a special character.');
    if (errors.length) return res.status(422).json({ message: errors[0] });
    const user = await User.findByPk(req.session.user.id);
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.passwordHash))) return res.status(400).json({ message: 'Current password is incorrect.' });
    user.passwordHash = await bcrypt.hash(password, 12); await user.save(); res.json({ message: 'Password updated.' });
  } catch (e) { next(e); }
});

app.get('/api/stores', requireAuth, requireRole('user'), async (req, res, next) => {
  try {
    const { limit, offset } = pageArgs(req);
    const where = {};
    addFilters(where, req.query, ['name', 'address']);
    const minRating = ratingFilterValue(req.query.minRating);
    if (minRating != null) addAndFilter(where, literal(`(SELECT AVG(r.rating_value) FROM ratings AS r WHERE r.store_id = stores.id) >= ${minRating}`));
    if (req.query.userRating === 'none') {
      const userId = Number(req.session.user.id);
      addAndFilter(where, literal(`NOT EXISTS (SELECT 1 FROM ratings AS ur WHERE ur.store_id = stores.id AND ur.user_id = ${userId})`));
    } else {
      const userRating = ratingFilterValue(req.query.userRating);
      if (userRating != null) {
        const userId = Number(req.session.user.id);
        addAndFilter(where, literal(`EXISTS (SELECT 1 FROM ratings AS ur WHERE ur.store_id = stores.id AND ur.user_id = ${userId} AND ur.rating_value = ${userRating})`));
      }
    }
    const sort = ['name', 'address', 'email', 'rating', 'userRating', 'created'].includes(req.query.sort) ? req.query.sort : 'name';
    const direction = req.query.direction === 'desc' ? 'DESC' : 'ASC';
    const { count, rows } = await Store.findAndCountAll({ where, limit, offset, order: storeRatingOrder(sort, direction, req.session.user.id) });
    const aggregate = await Rating.findAll({ attributes: ['storeId', [fn('AVG', col('rating_value')), 'averageRating']], group: ['storeId'], raw: true });
    const averages = new Map(aggregate.map(row => [String(row.storeId), Number(row.averageRating)]));
    const own = req.session.user.role === 'user' ? await Rating.findAll({ where: { userId: req.session.user.id }, raw: true }) : [];
    const ownMap = new Map(own.map(row => [String(row.storeId), { score: Number(row.score), review: row.review || '', imagePath: row.imagePath || null }]));
    res.json({ stores: rows.map(s => {
      const ownRating = ownMap.get(String(s.id));
      return { id: s.id, name: s.name, email: s.email, address: s.address, averageRating: averages.get(String(s.id)) || 0, userRating: ownRating?.score ?? null, userReview: ownRating?.review || '', userImageUrl: ownRating?.imagePath || null };
    }), total: count, limit, offset });
  } catch (e) { next(e); }
});
app.put('/api/stores/:id/rating', requireAuth, requireRole('user'), imageUpload.single('image'), async (req, res, next) => {
  try {
    const score = Number(req.body.score);
    const review = String(req.body.review || '').trim();
    if (!Number.isFinite(score) || score < 0.5 || score > 5 || !Number.isInteger(score * 2)) {
      await removeUploadedFile(req.file);
      return res.status(422).json({ message: 'Choose a rating from 0.5 to 5 in half-star steps.' });
    }
    if (review.length > 2000) {
      await removeUploadedFile(req.file);
      return res.status(422).json({ message: 'Reviews must be 2,000 characters or fewer.' });
    }
    if (req.file && !(await isValidImage(req.file))) {
      await removeUploadedFile(req.file);
      return res.status(422).json({ message: 'The uploaded file is not a valid JPG, PNG, or WebP image.' });
    }
    const store = await Store.findByPk(req.params.id);
    if (!store) { await removeUploadedFile(req.file); return res.status(404).json({ message: 'Store not found.' }); }
    const where = { userId: req.session.user.id, storeId: store.id };
    const [rating, created] = await Rating.findOrCreate({ where, defaults: { score, review, imagePath: req.file ? `/uploads/${req.file.filename}` : null } });
    const previousImage = rating.imagePath;
    rating.score = score;
    rating.review = review;
    if (req.file) rating.imagePath = `/uploads/${req.file.filename}`;
    try { await rating.save(); }
    catch (error) { await removeUploadedFile(req.file); throw error; }
    if (req.file && previousImage && previousImage !== rating.imagePath) await removeStoredImage(previousImage);
    res.json({ message: created ? 'Review saved.' : 'Review updated.', score, review, imagePath: rating.imagePath });
  } catch (e) { await removeUploadedFile(req.file); next(e); }
});

app.get('/api/admin/summary', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try { res.json({ users: await User.count(), stores: await Store.count(), ratings: await Rating.count() }); } catch (e) { next(e); }
});
app.get('/api/admin/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { limit, offset } = pageArgs(req); const where = {};
    addFilters(where, req.query, ['name', 'email', 'address']);
    if (['admin', 'user', 'owner'].includes(req.query.role)) where.role = req.query.role;
    const minRating = ratingFilterValue(req.query.minRating);
    if (minRating != null) addAndFilter(where, literal(`EXISTS (SELECT 1 FROM stores AS owner_store WHERE owner_store.owner_id = users.id AND (SELECT AVG(orating.rating_value) FROM ratings AS orating WHERE orating.store_id = owner_store.id) >= ${minRating})`));
    const sort = ['name', 'email', 'address', 'role', 'storeRating'].includes(req.query.sort) ? req.query.sort : 'name'; const order = req.query.direction === 'desc' ? 'DESC' : 'ASC';
    const userOrder = sort === 'storeRating'
      ? [[literal('(SELECT AVG(r.rating_value) FROM ratings AS r JOIN stores AS s ON s.id = r.store_id WHERE s.owner_id = users.id)'), order]]
      : [[sort, order]];
    const result = await User.findAndCountAll({ where, limit, offset, order: userOrder, attributes: ['id', 'name', 'email', 'address', 'role'], include: [{ model: Store, as: 'store', attributes: ['id'], required: false }] });
    const owners = result.rows.filter(u => u.role === 'owner');
    const ownerRatings = owners.length ? await Rating.findAll({ attributes: ['storeId', [fn('AVG', col('rating_value')), 'averageRating']], where: { storeId: owners.map(u => u.store?.id).filter(Boolean) }, group: ['storeId'], raw: true }) : [];
    const averages = new Map(ownerRatings.map(r => [String(r.storeId), Number(r.averageRating)]));
    res.json({ users: result.rows.map(u => ({ ...safeUser(u), ...(u.role === 'owner' ? { averageRating: averages.get(String(u.store?.id)) || 0 } : {}) })), total: result.count, limit, offset });
  } catch (e) { next(e); }
});
app.post('/api/admin/users', requireAuth, requireRole('admin'), accountRules, checkValidation, async (req, res, next) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const role = ['admin', 'user', 'owner'].includes(req.body.role) ? req.body.role : 'user';
    const address = role === 'owner' ? req.body.storeAddress.trim() : req.body.address.trim();
    const user = await User.create({ name: req.body.name.trim(), email: req.body.email, address, passwordHash: await bcrypt.hash(req.body.password, 12), role }, { transaction });
    if (role === 'owner') {
      await Store.create({ name: req.body.storeName.trim(), email: user.email, address, ownerId: user.id }, { transaction });
    }
    await transaction.commit();
    res.status(201).json({ user: safeUser(user) });
  } catch (e) {
    if (transaction) await transaction.rollback().catch(() => {});
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'An account with that email already exists.' });
    next(e);
  }
});
app.put('/api/admin/users/:id', requireAuth, requireRole('admin'), accountUpdateRules, checkValidation, async (req, res, next) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) { await transaction.rollback(); return res.status(404).json({ message: 'User not found.' }); }
    const oldEmail = user.email;
    user.name = req.body.name.trim();
    user.email = req.body.email;
    user.address = req.body.address.trim();
    if (req.body.password) user.passwordHash = await bcrypt.hash(req.body.password, 12);
    await user.save({ transaction });
    if (user.role === 'owner') {
      const store = await Store.findOne({ where: { ownerId: user.id }, transaction });
      if (store) {
        store.address = user.address;
        if (store.email === oldEmail) store.email = user.email;
        await store.save({ transaction });
      }
    }
    const isCurrentUser = Number(user.id) === Number(req.session.user.id);
    if (!isCurrentUser) await revokeUserSessions(user.id, transaction);
    await transaction.commit();
    if (isCurrentUser) {
      req.session.user = safeUser(user);
      await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    }
    res.json({ user: safeUser(user) });
  } catch (e) {
    if (transaction) await transaction.rollback().catch(() => {});
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'An account with that email already exists.' });
    next(e);
  }
});
app.delete('/api/admin/users/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  let transaction;
  let removedImages = [];
  try {
    transaction = await sequelize.transaction();
    const user = await User.findByPk(req.params.id, { transaction });
    if (!user) { await transaction.rollback(); return res.status(404).json({ message: 'User not found.' }); }
    if (Number(user.id) === Number(req.session.user.id)) { await transaction.rollback(); return res.status(409).json({ message: 'You cannot delete the account you are currently using.' }); }
    if (user.role === 'admin' && await User.count({ where: { role: 'admin' }, transaction }) <= 1) {
      await transaction.rollback(); return res.status(409).json({ message: 'The last administrator account cannot be deleted.' });
    }
    const ownedStore = user.role === 'owner' ? await Store.findOne({ where: { ownerId: user.id }, transaction }) : null;
    const ratingWhere = { [Op.or]: [{ userId: user.id }, ...(ownedStore ? [{ storeId: ownedStore.id }] : [])] };
    const relatedRatings = await Rating.findAll({ attributes: ['imagePath'], where: ratingWhere, transaction });
    removedImages = relatedRatings.map(rating => rating.imagePath).filter(Boolean);
    await Rating.destroy({ where: ratingWhere, transaction });
    if (ownedStore) await ownedStore.destroy({ transaction });
    await revokeUserSessions(user.id, transaction);
    await user.destroy({ transaction });
    await transaction.commit();
    await Promise.all(removedImages.map(removeStoredImage));
    res.json({ message: 'User and related records deleted.' });
  } catch (e) {
    if (transaction) await transaction.rollback().catch(() => {});
    next(e);
  }
});
app.get('/api/admin/stores', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { limit, offset } = pageArgs(req); const where = {};
    addFilters(where, req.query, ['name', 'email', 'address']);
    const ownerFilter = req.query.ownerName ? { name: nameWhere(req.query.ownerName) } : undefined;
    if (req.query.owner === 'assigned') where.ownerId = { [Op.not]: null };
    if (req.query.owner === 'unassigned') where.ownerId = null;
    const minRating = ratingFilterValue(req.query.minRating);
    if (minRating != null) addAndFilter(where, literal(`(SELECT AVG(r.rating_value) FROM ratings AS r WHERE r.store_id = stores.id) >= ${minRating}`));
    const sort = ['name', 'ownerName', 'email', 'address', 'rating', 'created'].includes(req.query.sort) ? req.query.sort : 'name'; const direction = req.query.direction === 'desc' ? 'DESC' : 'ASC';
    const result = await Store.findAndCountAll({
      where, limit, offset,
      order: sort === 'ownerName' ? [[{ model: User, as: 'owner' }, 'name', direction]] : storeRatingOrder(sort, direction),
      attributes: ['id', 'name', 'email', 'address', 'ownerId'],
      include: [{ model: User, as: 'owner', attributes: ['id', 'name', 'email'], required: Boolean(ownerFilter), ...(ownerFilter ? { where: ownerFilter } : {}) }]
    });
    const ratings = await Rating.findAll({ attributes: ['storeId', [fn('AVG', col('rating_value')), 'averageRating']], group: ['storeId'], raw: true }); const avg = new Map(ratings.map(r => [String(r.storeId), Number(r.averageRating)]));
    res.json({ stores: result.rows.map(s => ({ ...s.toJSON(), ownerName: s.owner?.name || null, ownerEmail: s.owner?.email || null, averageRating: avg.get(String(s.id)) || 0 })), total: result.count, limit, offset });
  } catch (e) { next(e); }
});
app.post('/api/admin/stores', requireAuth, requireRole('admin'), storeRules, checkValidation, async (req, res, next) => {
  try {
    let ownerId = null;
    if (req.body.ownerEmail) { const owner = await User.findOne({ where: { email: String(req.body.ownerEmail).trim().toLowerCase(), role: 'owner' } }); if (!owner) return res.status(422).json({ message: 'Create a store owner account first, then enter their email.' }); ownerId = owner.id; }
    const store = await Store.create({ name: req.body.name.trim(), email: req.body.email, address: req.body.address.trim(), ownerId }); res.status(201).json({ store });
  } catch (e) { if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'This owner already has a store.' }); next(e); }
});
app.put('/api/admin/stores/:id', requireAuth, requireRole('admin'), storeUpdateRules, checkValidation, async (req, res, next) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const store = await Store.findByPk(req.params.id, { transaction });
    if (!store) { await transaction.rollback(); return res.status(404).json({ message: 'Store not found.' }); }
    let owner = null;
    const ownerEmail = String(req.body.ownerEmail || '').trim().toLowerCase();
    if (ownerEmail) {
      owner = await User.findOne({ where: { email: ownerEmail, role: 'owner' }, transaction });
      if (!owner) { await transaction.rollback(); return res.status(422).json({ message: 'No store owner has that email address.' }); }
      const anotherStore = await Store.findOne({ where: { ownerId: owner.id, id: { [Op.ne]: store.id } }, transaction });
      if (anotherStore) { await transaction.rollback(); return res.status(409).json({ message: 'That owner is already linked to another store.' }); }
    }
    store.name = req.body.name.trim();
    store.email = req.body.email;
    store.address = req.body.address.trim();
    store.ownerId = owner?.id || null;
    await store.save({ transaction });
    if (owner) { owner.address = store.address; await owner.save({ transaction }); }
    await transaction.commit();
    res.json({ store: { ...store.toJSON(), ownerName: owner?.name || null, ownerEmail: owner?.email || null } });
  } catch (e) {
    if (transaction) await transaction.rollback().catch(() => {});
    if (e.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ message: 'That owner is already linked to another store.' });
    next(e);
  }
});
app.delete('/api/admin/stores/:id', requireAuth, requireRole('admin'), async (req, res, next) => {
  let transaction;
  let removedImages = [];
  try {
    transaction = await sequelize.transaction();
    const store = await Store.findByPk(req.params.id, { transaction });
    if (!store) { await transaction.rollback(); return res.status(404).json({ message: 'Store not found.' }); }
    const ratings = await Rating.findAll({ attributes: ['imagePath'], where: { storeId: store.id }, transaction });
    removedImages = ratings.map(rating => rating.imagePath).filter(Boolean);
    await Rating.destroy({ where: { storeId: store.id }, transaction });
    await store.destroy({ transaction });
    await transaction.commit();
    await Promise.all(removedImages.map(removeStoredImage));
    res.json({ message: 'Store and its ratings deleted.' });
  } catch (e) {
    if (transaction) await transaction.rollback().catch(() => {});
    next(e);
  }
});
app.get('/api/owner/dashboard', requireAuth, requireRole('owner'), async (req, res, next) => {
  try {
    const store = await Store.findOne({ where: { ownerId: req.session.user.id } });
    const { limit, offset } = pageArgs(req);
    if (!store) return res.json({ store: null, averageRating: 0, ratings: [], total: 0, limit, offset });
    const sort = ['name', 'email', 'rating', 'review', 'photo', 'updated'].includes(req.query.sort) ? req.query.sort : 'updated';
    const direction = req.query.direction === 'asc' ? 'ASC' : 'DESC';
    const order = sort === 'name' || sort === 'email'
      ? [[{ model: User, as: 'user' }, sort, direction]]
      : sort === 'updated'
        ? [[literal('ratings.updated_at'), direction]]
        : sort === 'review'
          ? [['review', direction]]
          : sort === 'photo'
            ? [['imagePath', direction]]
            : [['score', direction]];
    const ratingWhere = { storeId: store.id };
    const minRating = ratingFilterValue(req.query.minRating);
    if (minRating != null) ratingWhere.score = { [Op.gte]: minRating };
    if (req.query.review) ratingWhere.review = { [Op.like]: `%${String(req.query.review).slice(0, 120)}%` };
    if (req.query.hasPhoto === 'yes') ratingWhere.imagePath = { [Op.not]: null };
    if (req.query.hasPhoto === 'no') ratingWhere.imagePath = null;
    const customerWhere = {};
    if (req.query.name) customerWhere.name = nameWhere(req.query.name);
    if (req.query.email) customerWhere.email = nameWhere(req.query.email);
    if (req.query.updatedOn && /^\d{4}-\d{2}-\d{2}$/.test(req.query.updatedOn)) addAndFilter(ratingWhere, literal(`DATE(ratings.updated_at) = '${req.query.updatedOn}'`));
    const result = await Rating.findAndCountAll({
      where: ratingWhere,
      include: [{ model: User, as: 'user', attributes: ['name', 'email'], ...(Object.keys(customerWhere).length ? { where: customerWhere, required: true } : {}) }],
      order, limit, offset, distinct: true
    });
    const average = await Rating.findOne({
      attributes: [[fn('AVG', col('rating_value')), 'averageRating']],
      where: { storeId: store.id }, raw: true
    });
    res.json({
      store: { id: store.id, name: store.name },
      averageRating: Number(average?.averageRating || 0),
      ratings: result.rows.map(r => ({ id: r.id, name: r.user.name, email: r.user.email, score: Number(r.score), review: r.review || '', imagePath: r.imagePath || null, updatedAt: r.updated_at || r.created_at })),
      total: result.count, limit, offset
    });
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 422).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Images must be 5 MB or smaller.' : 'Only one image can be uploaded.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  console.error(err); res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

async function start() {
  await sequelize.authenticate();
  await sequelize.sync();
  const queryInterface = sequelize.getQueryInterface();
  const ratingColumns = await queryInterface.describeTable('ratings');
  if (!ratingColumns.review) await queryInterface.addColumn('ratings', 'review', { type: DataTypes.TEXT, allowNull: true });
  if (!ratingColumns.image_path) await queryInterface.addColumn('ratings', 'image_path', { type: DataTypes.STRING(500), allowNull: true });
  if (!String(ratingColumns.rating_value.type).toLowerCase().startsWith('decimal')) {
    await queryInterface.changeColumn('ratings', 'rating_value', { type: DataTypes.DECIMAL(2, 1), allowNull: false });
  }
  const [ratingChecks] = await sequelize.query("SELECT tc.CONSTRAINT_NAME AS name, cc.CHECK_CLAUSE AS clause FROM information_schema.TABLE_CONSTRAINTS tc JOIN information_schema.CHECK_CONSTRAINTS cc ON cc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND cc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME WHERE tc.CONSTRAINT_SCHEMA = DATABASE() AND tc.TABLE_NAME = 'ratings' AND tc.CONSTRAINT_TYPE = 'CHECK'");
  const ratingCheck = ratingChecks.find(check => check.name === 'chk_ratings_value');
  const correctRatingCheck = ratingCheck && String(ratingCheck.clause).includes('0.5') && /MOD/i.test(String(ratingCheck.clause));
  if (!correctRatingCheck) {
    if (ratingCheck) await sequelize.query('ALTER TABLE ratings DROP CHECK chk_ratings_value');
    await sequelize.query('ALTER TABLE ratings ADD CONSTRAINT chk_ratings_value CHECK (rating_value >= 0.5 AND rating_value <= 5 AND MOD(rating_value * 2, 1) = 0)');
  }
  await mkdir(uploadDirectory, { recursive: true });
  await sessionStore.sync();
  const email = (process.env.ADMIN_EMAIL || 'storeappadmin@gmail.com').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Appadmin@123';
  if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(password)) {
    throw new Error('ADMIN_PASSWORD must be 8–16 characters and include an uppercase letter and a special character.');
  }
  if (!(await User.findOne({ where: { email } }))) await User.create({ name: 'Store Platform Administrator', email, address: 'Platform administration', passwordHash: await bcrypt.hash(password, 12), role: 'admin' });
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => console.log(`Store Rating API listening on http://localhost:${port}`));
}
start().catch(error => { console.error('Could not start the API. Check MySQL and backend/.env.', error.message); process.exit(1); });
