const { executeQuery } = require("../../db/connection");

class Permission {
  constructor(permissionName) {
    this.permissionName = permissionName;
  }

  async addPermission() {
    try {
      let query = "insert into permission (permissionName) values (?)";
      let queryParam = [this.permissionName];
      const result = await executeQuery(query, queryParam);
      if (result.affectedRows > 0) {
        return true;
      } else throw new Error("Failed to insert data");
    } catch (error) {
        console.log(`Error in adding permission: ${error}`);
        throw error;
    }
  }
}

module.exports = Permission