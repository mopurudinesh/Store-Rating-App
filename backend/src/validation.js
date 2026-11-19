import { body, validationResult } from 'express-validator';

const credentialsRules = [
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('password').isLength({ min: 8, max: 16 }).withMessage('Password must be 8–16 characters.').matches(/[A-Z]/).withMessage('Password needs an uppercase letter.').matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character.')
];

export const accountRules = [
  body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1–60 characters.'),
  ...credentialsRules,
  body('role').optional().isIn(['admin', 'user', 'owner']).withMessage('Choose a valid account role.'),
  body('address').if((_value, { req }) => req.body.role !== 'owner').trim().notEmpty().withMessage('Address is required.').bail().isLength({ max: 400 }).withMessage('Address must be 400 characters or fewer.'),
  body('storeName').if((_value, { req }) => req.body.role === 'owner').trim().isLength({ min: 20, max: 60 }).withMessage('Store name must be between 20 and 60 characters.'),
  body('storeAddress').if((_value, { req }) => req.body.role === 'owner').trim().notEmpty().withMessage('Add the store details to create a store owner.').bail().isLength({ max: 400 }).withMessage('Address must be 400 characters or fewer.')
];

export const accountUpdateRules = [
  body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1–60 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('address').trim().notEmpty().withMessage('Address is required.').bail().isLength({ max: 400 }).withMessage('Address must be 400 characters or fewer.'),
  body('password').optional({ checkFalsy: true }).isLength({ min: 8, max: 16 }).withMessage('Password must be 8–16 characters.').matches(/[A-Z]/).withMessage('Password needs an uppercase letter.').matches(/[^A-Za-z0-9]/).withMessage('Password needs a special character.')
];

export const registrationRules = [
  body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Name must be 1–60 characters.'),
  ...credentialsRules,
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match.')
];

export const storeUpdateRules = [
  body('name').trim().isLength({ min: 20, max: 60 }).withMessage('Store name must be between 20 and 60 characters.'),
  body('address').trim().notEmpty().withMessage('Address is required.').bail().isLength({ max: 400 }).withMessage('Address must be 400 characters or fewer.')
];
export const ownerStoreUpdateRules = [
  body('name').trim().isLength({ min: 1, max: 60 }).withMessage('Owner name must be 1–60 characters.'),
  body('email').trim().isEmail().withMessage('Enter a valid email address.').normalizeEmail(),
  body('storeName').trim().isLength({ min: 20, max: 60 }).withMessage('Store name must be between 20 and 60 characters.'),
  body('address').trim().notEmpty().withMessage('Address is required.').bail().isLength({ max: 400 }).withMessage('Address must be 400 characters or fewer.')
];
export const checkValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array()[0].msg, errors: errors.array() });
  next();
};
