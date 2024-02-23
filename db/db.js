const mysql = require('mysql2/promise');
const config = require('../config');
const tables = require('./tables')

// Function to check if the database exists or create it
async function checkDatabaseExistence() {
  // Create a connection to the MySQL server with the provided configuration
  config.db.database = ''
  let connection = await mysql.createConnection(config.db);

  try {
    // SQL query to create the database if it does not exist
    const query = `CREATE DATABASE IF NOT EXISTS booking`;
    // Execute the query
    await connection.execute(query);
    config.db.database = "booking";
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

    //  Insert default entries into the Booking Category table
    const  category1Query=`INSERT INTO booking_category (booking_category_name, isSelected) VALUES ('slot', false)`;
    const  category2Query=`INSERT INTO Booking_Category (booking_category_name, isSelected) VALUES ('dayWise', false)`;
    await connection.execute(category1Query);
    await connection.execute(category2Query);
    
    //we need to add admin roles and all necessary permission in all related tables


  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    // Close the database connection
    connection.end();
  }
}

// Function to set up the database (calls the other two functions)
async function setupDatabase() {
  await checkDatabaseExistence();
  await createTables();
}

// Call the function to set up the database
setupDatabase();
