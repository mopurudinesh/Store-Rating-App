import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { sequelize } from '../src/db.js';
import { User, Store } from '../src/models.js';

const samplePassword = process.env.SAMPLE_ACCOUNT_PASSWORD || 'Sample@123';
if (!/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/.test(samplePassword)) {
  throw new Error('SAMPLE_ACCOUNT_PASSWORD must be 8–16 characters and include an uppercase letter and a special character.');
}

const customerEmails = Array.from({ length: 40 }, (_, index) => `sample.user${String(index + 1).padStart(2, '0')}@example.test`);
const ownerEmails = Array.from({ length: 20 }, (_, index) => `sample.owner${String(index + 1).padStart(2, '0')}@example.test`);
let createdCustomers = 0;
let createdOwners = 0;
let createdStores = 0;

try {
  await sequelize.authenticate();
  await sequelize.transaction(async transaction => {
    for (let index = 0; index < 40; index++) {
      const number = String(index + 1).padStart(2, '0');
      let user = await User.findOne({ where: { email: customerEmails[index] }, transaction });
      if (!user) {
        user = await User.create({
          name: `Sample Customer ${number}`,
          email: customerEmails[index],
          address: `Sample customer address ${number}, Example City`,
          passwordHash: await bcrypt.hash(samplePassword, 12),
          role: 'user'
        }, { transaction });
        createdCustomers++;
      } else if (user.role !== 'user') {
        throw new Error(`Sample customer email is already used by a ${user.role} account: ${customerEmails[index]}`);
      }
    }

    for (let index = 0; index < 20; index++) {
      const number = String(index + 1).padStart(2, '0');
      let owner = await User.findOne({ where: { email: ownerEmails[index] }, transaction });
      if (!owner) {
        owner = await User.create({
          name: `Sample Store Owner ${number}`,
          email: ownerEmails[index],
          address: `Sample owner address ${number}, Example City`,
          passwordHash: await bcrypt.hash(samplePassword, 12),
          role: 'owner'
        }, { transaction });
        createdOwners++;
      } else if (owner.role !== 'owner') {
        throw new Error(`Sample owner email is already used by a ${owner.role} account: ${ownerEmails[index]}`);
      }

      const store = await Store.findOne({ where: { ownerId: owner.id }, transaction });
      if (!store) {
        await Store.create({
          name: `Sample Market and Shop ${number}`,
          email: `sample.store${number}@example.test`,
          address: `Sample store address ${number}, Example City`,
          ownerId: owner.id
        }, { transaction });
        createdStores++;
      }
    }
  });

  const [customerCount, ownerCount, storeCount] = await Promise.all([
    User.count({ where: { email: { [Op.in]: customerEmails } } }),
    User.count({ where: { email: { [Op.in]: ownerEmails }, role: 'owner' } }),
    Store.count({ where: { email: { [Op.like]: 'sample.store%@example.test' } } })
  ]);
  console.log(`Sample data ready: ${customerCount} customers, ${ownerCount} store owners, ${storeCount} sample stores.`);
  console.log(`Created this run: ${createdCustomers} customers, ${createdOwners} owners, ${createdStores} stores.`);
  console.log(`Shared sample password: ${samplePassword}`);
} finally {
  await sequelize.close();
}
