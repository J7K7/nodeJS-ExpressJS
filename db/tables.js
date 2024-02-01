const announcementsTable = `CREATE TABLE IF NOT EXISTS announcements (
    announcementId int NOT NULL AUTO_INCREMENT,
    title text,
    content text,
    publishDate date DEFAULT NULL,
    toDate date DEFAULT NULL,
    isDeleted tinyint NOT NULL DEFAULT 0,
    PRIMARY KEY (announcementId)
  ) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const bookingStatusesTable = `CREATE TABLE IF NOT EXISTS booking_statuses (
    statusId int NOT NULL AUTO_INCREMENT,
    statusName varchar(45) DEFAULT NULL,
    PRIMARY KEY (statusId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`

  const bookingsMasterTable = `
  CREATE TABLE IF NOT EXISTS bookingsmaster (
    bookingId int NOT NULL,
    bookingDate date DEFAULT NULL,
    booking_fromDatetime datetime DEFAULT NULL,
    booking_toDatetime datetime DEFAULT NULL,
    status int DEFAULT NULL,
    grandTotal double DEFAULT NULL,
    timestamp timestamp NULL DEFAULT NULL,
    PRIMARY KEY (bookingId),
    KEY status_idx (status),
    CONSTRAINT status FOREIGN KEY (status) REFERENCES booking_statuses (statusId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

  const bookProductTable = `CREATE TABLE IF NOT EXISTS bookproduct (
    productId int NOT NULL,
    quantity int NOT NULL,
    slotId int NOT NULL,
    productTotal float DEFAULT NULL,
    bookingId int NOT NULL,
    bookingDate date DEFAULT NULL,
    slotFromDateTime datetime DEFAULT NULL,
    slotToDateTime datetime DEFAULT NULL,
    price float DEFAULT NULL,
    KEY bookingIdx_idx (bookingId),
    KEY productId_idx (productId),
    KEY slotId_idx (slotId),
    CONSTRAINT fk_bookproduct_bookingId FOREIGN KEY (bookingId) REFERENCES bookingsmaster (bookingId),
    CONSTRAINT fk_bookproduct_productId FOREIGN KEY (productId) REFERENCES productmaster (productId),
    CONSTRAINT fk_bookproduct_slotId FOREIGN KEY (slotId) REFERENCES slotmaster (slotId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const carouselImageTable = `
  CREATE TABLE IF NOT EXISTS carouselimage (
    carouselImageId int NOT NULL AUTO_INCREMENT,
    imageUrl varchar(100) DEFAULT NULL,
    PRIMARY KEY (carouselImageId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const permissionTable = `
  CREATE TABLE IF NOT EXISTS permission (
    permissionId int NOT NULL AUTO_INCREMENT,
    permissionName varchar(100) NOT NULL,
    PRIMARY KEY (permissionId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const productFeaturesTable = `
  CREATE TABLE IF NOT EXISTS product_features (
    featureId INT AUTO_INCREMENT,
    featureName varchar(45) NOT NULL,
    featureDescription text,
    PRIMARY KEY (featureId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  
  const featuresProductRelationtable = `
  CREATE TABLE IF NOT EXISTS productfeature_relation (
    featureId int DEFAULT NULL,
    productId int DEFAULT NULL,
    id int NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id),
    KEY featureId_idx (featureId),
    KEY productId_idx (productId),
    CONSTRAINT fk_productfeature_relation_featureId FOREIGN KEY (featureId) REFERENCES product_features (featureId),
    CONSTRAINT fk_productfeature_relation_productId FOREIGN KEY (productId) REFERENCES productmaster (productId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `
  
  const productImagesTable = `
  CREATE TABLE IF NOT EXISTS productImages (
    imageId int AUTO_INCREMENT,
    imagePath text,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (imageId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const imageProductRelationTable = `CREATE TABLE IF NOT EXISTS productImage_relation (
    id int NOT NULL AUTO_INCREMENT,
    productId int DEFAULT NULL,
    imageId int DEFAULT NULL,
    PRIMARY KEY (id),
    KEY productId_idx (productId),
    KEY imageId_idx (imageId),
    CONSTRAINT imageId FOREIGN KEY (imageId) REFERENCES productImages (imageId),
    CONSTRAINT productId FOREIGN KEY (productId) REFERENCES productmaster (productId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const productMasterTable = `
  CREATE TABLE IF NOT EXISTS productmaster (
    productId INT AUTO_INCREMENT,
    productName varchar(100) NOT NULL,
    productDescription text,
    advanceBookingDuration int NOT NULL,
    active_fromDate date NOT NULL,
    active_toDate date DEFAULT NULL,
    productCapacity int NOT NULL DEFAULT 1,
    isActive tinyint DEFAULT NULL,
    isDeleted tinyint DEFAULT 0,
    PRIMARY KEY (productId),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const roleTable = `
  CREATE TABLE IF NOT EXISTS role (
    roleId int NOT NULL AUTO_INCREMENT,
    roleName varchar(45) NOT NULL,
    PRIMARY KEY (roleId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const rolePermissionRelationTable = `
  CREATE TABLE IF NOT EXISTS rolepermission_relation (
    roleId int DEFAULT NULL,
    permissionId int DEFAULT NULL,
    id int NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id),
    KEY roleId_idx (roleId),
    KEY permissionId_idx (permissionId),
    CONSTRAINT fk_rolepermission_permissionId FOREIGN KEY (permissionId) REFERENCES permission (permissionId),
    CONSTRAINT fk_rolepermission_roleId FOREIGN KEY (roleId) REFERENCES role (roleId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const slotMasterTable = `
  CREATE TABLE IF NOT EXISTS slotmaster (
    slotId int NOT NULL,
    slotDate date NOT NULL,
    slot_fromDateTime datetime NOT NULL,
    slot_toDateTime datetime DEFAULT NULL,
    slotCapacity int DEFAULT NULL,
    slotPrice float DEFAULT NULL,
    slotActive tinyint DEFAULT NULL,
    PRIMARY KEY (slotId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `
  const slotProductRelationTable = `
  CREATE TABLE IF NOT EXISTS slotproduct_relation (
    slotId int DEFAULT NULL,
    productId int DEFAULT NULL,
    id int NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id),
    KEY slotId_idx (slotId),
    KEY productId_idx (productId),
    CONSTRAINT fk_slotproduct_relation_productId FOREIGN KEY (productId) REFERENCES productmaster (productId),
    CONSTRAINT fk_slotproduct_relation_slotId FOREIGN KEY (slotId) REFERENCES slotmaster (slotId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const socialMediaHandleTable = `
  CREATE TABLE IF NOT EXISTS socialmediahandle (
    handleId int NOT NULL AUTO_INCREMENT,
    platformName varchar(45) DEFAULT NULL,
    platformUrl varchar(100) DEFAULT NULL,
    PRIMARY KEY (handleId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const userRoleRelationTable = `
  CREATE TABLE IF NOT EXISTS userrole_relation (
    userId int DEFAULT NULL,
    roleId int DEFAULT NULL,
    id int NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id),
    KEY roleId_idx (roleId),
    KEY userId (userId),
    CONSTRAINT roleId FOREIGN KEY (roleId) REFERENCES role (roleId),
    CONSTRAINT userId FOREIGN KEY (userId) REFERENCES usermaster (userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const userBookingRelationTable = `
  CREATE TABLE IF NOT EXISTS userbooking_relation (
    userId int DEFAULT NULL,
    bookingId int DEFAULT NULL,
    id int NOT NULL AUTO_INCREMENT,
    PRIMARY KEY (id),
    KEY userid_idx (userId),
    KEY bookingid_idx (bookingId),
    CONSTRAINT fk_userbooking_relation_bookingId FOREIGN KEY (bookingId) REFERENCES bookingsmaster (bookingId),
    CONSTRAINT fk_userbooking_relation_userId FOREIGN KEY (userId) REFERENCES usermaster (userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  const userMasterTable = `
  CREATE TABLE IF NOT EXISTS usermaster (
    userId int NOT NULL AUTO_INCREMENT,
    username varchar(55) DEFAULT NULL,
    email varchar(255) DEFAULT NULL,
    password text NOT NULL,
    firstName varchar(45) NOT NULL,
    lastName varchar(45) NOT NULL,
    phoneNumber varchar(14) NOT NULL,
    profilePic varchar(255), 
    isDeleted tinyint DEFAULT NULL,
    timestamp datetime DEFAULT NULL,
    PRIMARY KEY (userId),
    UNIQUE KEY phoneNumber_UNIQUE (phoneNumber),
    UNIQUE KEY email_UNIQUE (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
  `

  module.exports = {
    announcementsTable,
    bookingStatusesTable,
    bookProductTable,
    bookingsMasterTable,
    carouselImageTable,
    featuresProductRelationtable,
    imageProductRelationTable,
    permissionTable,
    productFeaturesTable,
    productImagesTable,
    productMasterTable,
    roleTable,
    rolePermissionRelationTable,
    slotMasterTable,
    slotProductRelationTable,
    socialMediaHandleTable,
    userRoleRelationTable,
    userBookingRelationTable,
    userMasterTable
};