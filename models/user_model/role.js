const {executeQuery} = require("../../db/connection");


class Role {
  constructor(roleName) {
    this.roleName = roleName;
  }

  //function to create  a new role in the database
  //addrole is not static  because we need an instance of the class to access 'this' keyword which refers to the current object
  //rest all are static as  we don't need an instance of the class to perform these actions and we  can use them directly from the class itself
  async addRole() {
    try {
      let query = "insert into role (roleName) values (?)";
      let queryparam = [this.roleName];
      let result = await executeQuery(query, queryparam);
      if (result.affectedRows > 0) return true;
      //if  no rows affected then it means that there was an error while inserting data
      else throw new Error("Error in adding the role"); 
    } catch (error) {
      console.log(`Error in adding the role: ${error}`);
      return `Error in adding the role: ${error}`;
    }
  }

  //find role of a user from  the database using their id
  static findRoleofUser = async (id) => {
    if (!id && typeof id !== "number") {
      throw "Invalid User Id";
    }
    let query =
      "SELECT roleId, roleName FROM role WHERE roleId = (SELECT ur.roleId FROM usermaster AS u LEFT JOIN userrole_relation AS ur ON u.userId = ur.userId WHERE u.userId = ?) and isDeleted=0;";
    let queryParam = [id];
    try {
      const result = await executeQuery(query, queryParam);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw error;
    }
  };

  // get role details from rolename
  static findRoleByName = async (name) => {
    try {
      if (!name) {
        throw "Invalid Role Name";
      }
      let query = "SELECT roleId, roleName FROM role WHERE roleName=?";
      let queryParam = [name];
      const result = await executeQuery(query, queryParam);
      // console.log(result);
      if (!result || result.length < 1) {
        throw new Error("No Such Role Found");
      }
      return result[0];
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  //to check if role exists or not
  static roleExistsByName = async (name) => {
    try {
      if (!name) {
        throw "Invalid Role Name";
      }
      let query =
        "SELECT roleId, roleName FROM role WHERE roleName=? and isDeleted=0";
      let queryParam = [name];
      const result = await executeQuery(query, queryParam);
      return result.length
      // result.length > 0 ? true : false;
      
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  static roleExistsById = async (id) => {
    try {
      if (!id) {
        throw "Invalid Role Name";
      }
      let query =
        "SELECT roleId, roleName FROM role WHERE roleId=? and isDeleted=0";
      let queryParam = [id];
      const result = await executeQuery(query, queryParam);
      return result.length
      // result.length > 0 ? true : false;
      
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  // get all roles
  static getRoles = async () => {
    try {
      let query = "select roleId, roleName from role where isDeleted = 0";
      let roles = await executeQuery(query);
      if (roles.length) {
        return roles;
      } else {
        throw new Error("No Roles Found");
      }
    } catch (error) {
      console.log(`Error in getting all roles : ${error}`);
      throw error;
    }
  };

  //update name of a role
  static updateNameOfRole = async (roleId, roleName) => {
    try {
      let  query = 'UPDATE role SET roleName = ? WHERE roleId = ? and isDeleted = 0'
      let queryParam = [roleName, roleId];
      let result = await executeQuery(query, queryParam);
      if (result.affectedRows < 1 ) {
       throw `Unable to Update the Role name`;
      }
      return result;
    } catch (error) {
      console.log(`Error in updating Role name: ${error}`);
      throw error;
    }
  }
  
  // delete a role i.e. make isDeleted = 1.
  //first check if there are some users  associated with this role then don't allow to delete it.
  //if no user is associated with this role then only proceed for deletion.
  //then delete all the permissions that  are linked with this role.
  // transactions can be  used here as we need to rollback both permission and role table operations if any failure occurs.
  static removeRole = async (roleId) => {
    try {
      //check if there are users having  this role . If yes , then can not delete the role.
      let query = "select count(userId)as count_of_users from userrole_relation where roleId = ?"
      let params = [roleId];
      let result = await  executeQuery(query,params);
      if(result[0].count_of_users > 0 ) {
        throw `Cannot delete the role as it is being used by some users.`;
      }

      //updating isDeleted to 1 
      query =  "update role set isDeleted = 1 where roleId =? and isDeleted  = 0 ";
      params = [roleId];
      let resp = await executeQuery(query, params);
      if(!resp || resp.affectedRows != 1){
        throw `Could not perform Delete operation`;
      }

      // permanently deleting  permission related to this role.
      query = "delete from rolepermission_relation where roleId=?" ;
      let queryParam = [roleId]
      let r = await  executeQuery(query,queryParam);
      return r;
    } catch (error) {
      console.log("Error in deleting the role: ", error);
      throw error;
    }
  };
  
  //check if the role is deleted  or not.
  static checkIfRoleDeleted = async (roleId) => {
    try {
      let query = 'SELECT isDeleted FROM role WHERE roleId = ?';
      let queryParam = [roleId]
      const data = await executeQuery(query, queryParam);
      if (data[0].isDeleted == 1) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log('Error in checking If Role Deleted : ', error);
      throw error;
    }
  } 
  
  //show all permissions
  static showAllPermissions = async () => {
    try {
      let query = "select permissionId, permissionName from permission"
      let result =  await executeQuery(query);
      return result;
    } catch (error) {
      console.log("showing all permissions failed", error);
      throw error;
    }
  }
  
  // insert which roles have which permissions
  static insertRolePermission = async (roleId, permissionIds) => {
    try {
      //checking whether role is deleted  or not
      let query =  `SELECT roleName FROM role WHERE roleId=? and  isDeleted=0`;
      let params = [roleId]
      let res = await executeQuery(query ,params );
      if(!res.length ) {
        throw new Error('The Role Is Deleted');
      }

      
      //permissionIds is an array and we dont know how many permissions are there so  we use s to make the ? placeholders dynamically
      let s = '(?,?)';
      for(let j=1; j<permissionIds.length; j++){
        s += ',(?,?)'
      };

      // here queryParam  contain array of arrays [roleid, permisionid,roleid,permisionid] for  inserting into db
      let queryParam = [];
      for(const i of permissionIds){
        queryParam.push(roleId, i);
      }
      // concatinating  the parameters to make it as a single string of query
      query = "insert into rolepermission_relation(roleId, permissionId) values " + s;
      const result = await executeQuery(query, queryParam);
      if(!result.affectedRows) throw new Error('Failed to add the permission');
      else return result;

    } catch (error) {
     console.log("adding permission to role failed", error);
     throw error;
    }
  }
  
  //update the role of a user
  static userToRoleUpdate =  async (userId, newRoleId) => {
    try {
      // first check whether userId exists in relation table if not present then it means it is deleted
      let query = `select id, userId, roleId from userrole_relation where userId= ?` ;
      let param =[userId];
      let userDetails = await executeQuery(query,param);
      if (!userDetails.length) {
        throw new Error(`User does not exist.`);
      }

      //check whether roleId is valid  or not
      query =  `select count(roleId) as count from role where roleId= ? and isDeleted=0;`;
      param = [newRoleId];
      let roleCount = await executeQuery(query,param);
      if(roleCount[0].count == 0) {
        throw new Error(`Invalid Role Id`);
      }

      //update operation
      query = 'update userrole_relation set roleId=? where  userId=?' ;
      let updateParams=[newRoleId, userId ];
      const result = await executeQuery(query, updateParams);
      if (!result || !result.affectedRows) throw new Error('Updation Failed');
      return  result;

    } catch (error) {
      console.log('Error in updating User To Role', error);
      throw error;
    }
  }
  
  //update permissions of a role
  static updateRoleToPermission = async (roleId, permissionIds) => {
    try {
      //delete all the previous  permissions related to this role
      let query = 'delete from rolepermission_relation where roleId=?'
      let deleteParam = [roleId]
      let resDelete = await executeQuery(query , deleteParam );
      if(!resDelete){
        throw new Error ('Deletion of existing permissions failed')
      }

      //insert the new permissions for this role
      const result = await Role.insertRolePermission(roleId, permissionIds);
      if  (!result) throw new Error ("Adding Permissions to Role failed");
      return result;
    } catch (error) {
      console.log('Error in Updating Role To Permission ', error);
      throw error;
    }
  }
  

  //gets roles with their associated permissions
  static getRolesWithPermission = async  () =>{
    try {
      let query = "select * from role as r join rolepermission_relation as rp on r.roleId = rp.roleId join permission as p on rp.permissionId = p.permissionId where r.isDeleted = 0"
      let result = await executeQuery(query);
      if(!result){
        throw  new Error("Failed to fetch Roles with their respective permissions.")
      }
      return  result;
    } catch (error) {
      console.log("Error in Fetching Roles With Permissions ", error);
      throw error;
    }
  }
}

module.exports = Role