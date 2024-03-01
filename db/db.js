const mysql = require('mysql2/promise');
const config = require('../config');
const tables = require('./tables')
const statusController = require('../controllers/booking_controller/statusController');
const User = require('../models/user_model/user');
const Role = require('../models/user_model/role');
const { executeQuery } = require('./connection');
const Permission = require('../models/user_model/permission');

// Function to check if the database exists or create it
async function checkDatabaseExistence() {
  // Create a connection to the MySQL server with the provided configuration
  config.db.database = ''
  let connection = await mysql.createConnection(config.db);

  try {
    // SQL query to create the database if it does not exist
    const query = `CREATE DATABASE IF NOT EXISTS finaldb`;
    // Execute the query
    await connection.execute(query);
    config.db.database = "finaldb";
    console.log('Database Created If Not Exists !');
  } catch (error) {
    console.error('Error checking database existence:', error);
  } finally {
    // Close the database connection
    connection.end();
  }
}

// Function to create tables in the database
async function createTables() {

  // Create a connection to the MySQL server with the updated configuration
  let connection = await mysql.createConnection(config.db);

  try {

    // The order of the tables which consists the relationship should not change 

    // Independent Tables 
    await connection.execute(tables.announcementsTable);
    await connection.execute(tables.carouselImageTable);
    await connection.execute(tables.socialMediaHandleTable);

    // Booking Tables 
    await connection.execute(tables.bookingStatusesTable);
    await connection.execute(tables.bookingsMasterTable);

    // Master Tables
    await connection.execute(tables.userMasterTable);
    await connection.execute(tables.slotMasterTable);
    await connection.execute(tables.productMasterTable);
    await connection.execute(tables.bookProductTable);

    // User Tables 
    await connection.execute(tables.roleTable);
    await connection.execute(tables.userRoleRelationTable);
    await connection.execute(tables.permissionTable);
    await connection.execute(tables.rolePermissionRelationTable);

    // User Booking Relation 
    await connection.execute(tables.userBookingRelationTable);

    // Product Tables
    await connection.execute(tables.productFeaturesTable);
    await connection.execute(tables.productImagesTable);
 
    await connection.execute(tables.featuresProductRelationtable);
    await connection.execute(tables.imageProductRelationTable);
  
    await connection.execute(tables.slotProductRelationTable);

    await connection.execute(tables.bookingCategory)




  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    // Close the database connection
    connection.end();
  }
}





// console.log("before entry");

async function isTableEmpty(tableName, connection) {
  try {
    const [rows] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    return rows[0].count === 0;
  } catch (error) {
    console.error(`Error checking if table ${tableName} is empty: ${error.message}`);
    throw error;
  }
}



async function defaultEntries(connection) {
  try {
    const isEmptyRoleTable = await isTableEmpty("role", connection);
    if (isEmptyRoleTable) {
      await insertDefaultRoles();
    }

    const isEmptyUserTable = await isTableEmpty("usermaster", connection);
    if (isEmptyUserTable) {
      await insertDefaultAdmin();
    }

    const permissionNames = ['registerRole', 'getRoles', 'addRole', 'getPermissions', 'updateRole', 'deleteRole', 'updateUserRole', 'updateRolePermission', 'displayUserRole', 'displayRolesWithPermission', 'login', 'register', 'getProfile', 'updateProfile', 'deleteProfile', 'updatePassword', 'updateProfilePicture', 'cart', 'addToCart', 'removeFromCart', 'confirmBooking', 'cancelBooking', 'orders', 'addProduct', 'updateFeature', 'addFeature', 'deleteFeature', 'deleteImage', 'addImage', 'getProductDetails', 'getAllProductDetails', 'updateSlotById', 'updateSlotStatus', 'deleteSlotById', 'addSingleSlotByProductId', 'updateProductStatus', 'deleteProduct', 'updateProductDetails'];
    const isEmptyPermissionTable = await isTableEmpty("permission", connection);
    if (isEmptyPermissionTable) {
      await insertDefaultPermissions(permissionNames);
    }

    const isEmptyRolePermissionTable = await isTableEmpty("rolepermission_relation", connection);
    if (isEmptyRolePermissionTable) {
      await insertDefaultRolePermissions();
    }

    const isEmptyBookingCategoryTable = await isTableEmpty("booking_category", connection);
    if (isEmptyBookingCategoryTable) {  
      await insertDefaultBookingCategories(connection);
    }

    await statusController.addStatus(connection);
  } catch (error) {
    console.error(`Error inserting default entries: ${error.message}`);
    throw error;
  }
}



async function insertDefaultRoles() {
  try {
    const adminRole = new Role("admin");
    const userRole = new Role("user");
    await adminRole.addRole();
    await userRole.addRole();
  } catch (error) {
    console.error(`Error inserting default roles: ${error.message}`);
    throw error;
  }
}

async function insertDefaultAdmin() {
  try {
    const admin = new User(
      process.env.email,
      process.env.password,
      process.env.firstName,
      process.env.lastName,
      process.env.phoneNumber
    );
    const result = await admin.register();
    await admin.insertRole(1, result.insertId);
  } catch (error) {
    console.error(`Error inserting default admin: ${error.message}`);
    throw error;
  }
}

async function insertDefaultPermissions(permissionNames) {
  try {
    for (let name of permissionNames) {
      const newPermission = new Permission(name);
      await newPermission.addPermission();
    }
  } catch (error) {
    console.error(`Error inserting default permissions: ${error.message}`);
    throw error;
  }
}

async function insertDefaultRolePermissions() {
  try {
    await Role.insertRolePermission(1,[1,2,3,4,5,6,7,8,9,10,13,14,15,16,17,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38]); //admin permissions
    await Role.insertRolePermission(2,[13,14,15,16,17,18,19,20,21,22,23,30,31]); // user  permissions
  } catch (error) {
    console.error(`Error inserting default role permissions: ${error.message}`);
    throw error;
  }
}

async function insertDefaultBookingCategories(connection) {
  try {
    const categoryQueries = [
      `INSERT INTO booking_category (booking_category_name, isSelected) VALUES (?, false)`,
      `INSERT INTO booking_category (booking_category_name, isSelected) VALUES (?, false)`
    ];
    await Promise.all(categoryQueries.map(query => connection.execute(query, ['slot', 'dayWise'])));
  } catch (error) {
    console.error(`Error inserting default booking categories: ${error.message}`);
    throw error;
  }
}



async function setupDatabase() {
  try {
    await checkDatabaseExistence();
    await createTables();
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error; // Rethrow the error to terminate the process if setup fails
  }
}


(async () => {
  try {
    console.log("Starting database setup...");
    await setupDatabase();
    console.log("Database setup completed.");
    console.log("Inserting default entries...");
    let connection = await mysql.createConnection(config.db);
    await defaultEntries(connection);
    console.log("Default entries inserted successfully.");
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1); // Terminate the process with non-zero exit code on failure
  }
})();











