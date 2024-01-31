require('dotenv').config();

const config = {
    db: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        waitForConnections: true,
        connectTimeout: 60000,
        queueLimit: 0,
      },
    listPerPage: null,
};

module.exports = config;
