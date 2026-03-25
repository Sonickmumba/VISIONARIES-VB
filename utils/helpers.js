const { v4: uuidv4 } = require('uuid');

// Generate UUID
const generateId = () => uuidv4();


module.exports = {
  generateId,
};