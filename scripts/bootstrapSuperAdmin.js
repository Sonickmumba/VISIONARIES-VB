require('dotenv').config();

const db = require('../config/database');
const { bootstrapSuperAdmin } = require('../utils/bootstrapSuperAdmin.util');

const isProduction = process.env.NODE_ENV === 'production';
const allowProdBootstrap = process.env.ALLOW_SUPERADMIN_BOOTSTRAP === 'true';

const run = async () => {
  if (isProduction && !allowProdBootstrap) {
    throw new Error('Production bootstrap blocked. Set ALLOW_SUPERADMIN_BOOTSTRAP=true to continue.');
  }

  const result = await bootstrapSuperAdmin({
    db,
    email: process.env.SUPER_ADMIN_EMAIL,
    name: process.env.SUPER_ADMIN_NAME,
    password: process.env.SUPER_ADMIN_PASSWORD,
    nationalId: process.env.SUPER_ADMIN_NATIONAL_ID,
    phone: process.env.SUPER_ADMIN_PHONE,
  });

  return result;
};

run()
  .then((result) => {
    console.log(`✅ ${result.message}`);
    console.log(`Action: ${result.action}`);
    console.log(`User: ${result.user.email} (${result.user.role})`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  });
