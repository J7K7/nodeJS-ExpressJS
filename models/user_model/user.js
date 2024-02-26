const bcrypt = require('bcrypt')
const {executeQuery} = require("../../db/connection");
const Role = require('./role');

class User {
  constructor(email, password, firstName, lastName, phoneNumber, profilePic) {
    this.email = email;
    this.password = password;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phoneNumber = phoneNumber;
    this.profilePic = profilePic || null; // default to null if no image
  }

  async register() {
    try {
      // check if email already exists
      let query = "select count(email) as cnt from usermaster where email = ? and isDeleted = 0";
      let queryParam = [this.email];
      let resp = await executeQuery(query, queryParam);
      if (resp[0].cnt > 0) {
        throw new Error(`The user already exists.`);
      }

      //check if the phoneNumber already exists
      query =
        "select count(phoneNumber) as cnt from usermaster where phoneNumber = ? and isDeleted = 0";
      queryParam = [this.phoneNumber];
      resp = await executeQuery(query, queryParam);
      if (resp[0].cnt > 0) {
        throw new Error(`This phone number is already registered.`);
      }

      //hash the password and insert  into db
      this.password = await bcrypt.hash(this.password, 10);
      query =
        "insert into usermaster (email, password, firstName, lastName, phoneNumber, profilePic) values (?, ?, ?, ?, ?, ?)";
      queryParam = [
        this.email,
        this.password,
        this.firstName,
        this.lastName,
        this.phoneNumber,
        this.profilePic,
      ];
      const result = await executeQuery(query, queryParam);
      if (!result || result.affectedRows < 0) {
        throw new Error(`Unable to add user ${this.email}`);
      }
      return result;

    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  //this function is used while user registration
  //the role will always be user, so this functions inserts userId and roleId(user) into userrole_relation table
  async insertRoleAsUser(role, insertId) {
    try {
      const roleData = await Role.findRoleByName(role);
      let query = "insert into userrole_relation (userId, roleId) values (?,?)";
      let params = [insertId, roleData.roleId];
      const res = await executeQuery(query, params);
      if (!res || !res.affectedRows) {
        throw new Error("failed to assign role");
      }
      return res;
    } catch (error) {
      let query = `DELETE FROM usermaster WHERE userId=?`;
      let params = [insertId];
      // if  any failure in assigning role then delete that user from usersmaster table
      await executeQuery(query, params).catch((err) => {
        console.log("Error in deleting the User : ", err);
      });
      console.log("ERROR IN USERROLE RELATION INSERTION", error);
      throw error;
    }
  }

  //this function is used while registering  new user from admin panel
  //we take roleId from request body and insertId from the new  registered user id
  async insertRole(register_as_role, insertId) {
    try {
      // check whether exists  or not
      let query =
        "select count(roleId) as count from role where roleId = ? and isDeleted=0";
      let queryParam = [register_as_role]; 
      const result = await executeQuery(query, queryParam);
      if (result[0].count < 1) {
        throw new Error(`No such role found `);
      }

      //insert the biding  between user and role
      const userId = insertId;
      query = `insert into userrole_relation (userId, roleId) values(?,?)`;
      queryParam = [userId, register_as_role];
      let r = await executeQuery(query, queryParam);
      if (!r || r.length < 0) throw new Error("Failed to assign user a role");
      return r;

    } catch (error) {
      //delete  the user who failed to get assigned with a role
      let query = `DELETE FROM usermaster WHERE userId=?`;
      let params = [insertId];
      await executeQuery(query, params).catch((err) => {
        console.log("Error in deleting the User : ", err);
      });
      console.log("ERROR IN USERROLE RELATION INSERTION", error);
      throw error;
    }
  }

  static findUserByEmail = async (email) => {
    if (!email) {
      throw new Error("Email is required");
    }

    const query =
      "SELECT userId, email, password, firstName, lastName, phoneNumber, profilePic FROM usermaster WHERE email = ? AND isDeleted = 0";
    // const query = "select * from usermaster"
    const queryparam = [email];

    try {
      const result = await executeQuery(query, queryparam);
      // console.log(result);
      return result.length > 0 ? result[0] : null;
    } catch (err) {
      throw new Error("Error while fetching user by email");
    }
  };

  static findUserById = async (id) => {
    try {
      let query =
        "select userId, email, password, firstName, lastName, phoneNumber, profilePic from usermaster where userId=? AND isDeleted = 0";
      let queryparam = [id];
      const result = await executeQuery(query, queryparam);
      if (!result) {
        throw new Error(`No User found`);
      }
      return result[0];
    } catch (error) {
      throw error;
    }
  };

  //Updates the profile of a user identified by their unique ID.
  // only firstName, lastName, profilePic can be updated as of now
  //All fields are necessary and should not be empty.
  //If the user does not wish to change a certain field, they must send that field with the same value.
  static updateProfile = async (userdata, id) => {
    try {

      let query = 'UPDATE usermaster SET  firstName = ?,  lastName = ? , profilePic = ? where userId = ? AND isDeleted = 0'

      let queryParam =  [userdata.firstName, userdata.lastName, userdata.profilePic || null, id];
      const result = await executeQuery(query, queryParam);
      if  (!result.affectedRows) {
          throw "No User Found";
      }
      return result;
    } catch (error) {
      console.log("Error in updating profile: ", error);
      throw error;
    }
  }

  static updateProfilePic = async  (userId, imageUrl) => {
    try {
      console.log(imageUrl);
      let query = 'UPDATE usermaster SET profilePic = ? where userId = ? AND isDeleted = 0'
      let queryParam =  [imageUrl, userId];
      const res = await executeQuery(query, queryParam);
      if  (!res.affectedRows) {
        throw "unable to update  Image for this user.";
    }
    return res;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
  
  //update password of the user
  static updatePasswordOfUser = async (userId, hashedPassword) => {
    try {
      let query = "update usermaster set password = ? where userId=?";
      let params = [hashedPassword , userId];
      let res = await executeQuery(query,params);
      // console.log(res);
      if (!res || !res.affectedRows > 0 ) {
        throw new Error(`Unable to Update Password`);
      }
      return res;
    } catch (error) {
      console.log('Error in updating the User Password ', error);
      throw error;
    }
  }

  //function to delete a  user from the database given an id
  static deleteProfile = async (userId) => {
    try {
      //here we update  the isDeleted flag to true for the user who's being deleted
      let  query = 'update usermaster set isDeleted = 1  where userid = ? and  isDeleted=0' ;
      let queryParam = [userId];
      const res = await executeQuery(query, queryParam);
      if (!res.affectedRows ) {
        throw new Error (`unable to delete`);
      }

      //delete role mapping for this userId
      query = 'delete from userrole_relation  where userId =? ';
      queryParam = [userId];
      const result = await executeQuery(query, queryParam);
      if (!result.affectedRows ){
         throw new Error ('User Role Mapping not deleted');
       }
      return result;

    } catch (error) {
      console.log ("Delete Profile Error", error);
      throw error;
    }
  }

  //get all user details along with their role
  static getUserRole = async () => {
    try {
      let query = "SELECT um.email, um.firstName, um.lastName, um.phoneNumber, um.profilePic, um.timestamp, r.roleId, r.roleName FROM usermaster um JOIN userrole_relation ur ON um.userId = ur.userId JOIN role r ON ur.roleId = r.roleId WHERE um.isDeleted = 0 AND r.isDeleted = 0; "
      let result = await executeQuery(query);
      if(!result){
        throw new Error("No data found")
      }
      return result;
    } catch (error) {
      console.log("Error in getting user roles", error);
      throw error;
    }
  }

}

module.exports = User;
