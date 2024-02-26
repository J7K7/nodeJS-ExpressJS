const User = require("../../models/user_model/user");
const Role  = require("../../models/user_model/role");
const { validationResult } = require("express-validator");
const { compare, hash } = require("bcrypt");
const fs = require( "fs" );
const { checkPermissionIds } = require("../../common/userQueries");
const { removeImageFile } = require("../../common/common");

const userController = {
  //normal user registration controller 
  userRegister: async (req, res) => {
    // console.log(req.body);
    try {
      //email password firstName lastName phoneNumber should be present and not undefined
      if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName || !req.body.phoneNumber){
        console.log(!req.body.email);
        console.log(!req.body.password);
        console.log(!req.body.firstName);
        console.log(!req.body.lastName);
        console.log(!req.body.phoneNumber);
        return res
        .status(400)
        .json({ msg: "All necessary fields are required", status: false });
      }
      const { email, password, firstName, lastName, phoneNumber} = req.body;
      
      
      // validate  the incoming request, registration_validation in middleware catches errors and then we respond the error here
      const errors = validationResult(req);
      if (!errors.isEmpty()) { 
        // join all the  errors together to send them as a single error message
        const errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(", ");
        return res.status(422).json({ msg: errorMessages, Status: false }); 
      }

      // create an instance of the model 'User' with the data from the request body
      //here we are not taking profile image. the ProfilePic will be null
      const newUser = new User(
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      ); 

      //register the user in db
      const result = await newUser.register();

        if(!result){
          return res.status(500).send('Error creating account');
        }

      // insert role of user  into the database table userrole_relation
      const r = await newUser.insertRoleAsUser('user', result.insertId)
      if (!r || r.affectedRows == 0) {
        throw Error("Error in assigning role to the user");
      } else {
        return res
          .status(201)
          .json({ msg: "user registration successful", Status: true });
      }

    } catch (error) {
      return res
        .status(500)
        .json({ msg: `error while registration : ${error}`, status: false });
    }
  },

  //registration for admin panel
  adminRegister : async ( req , res) => {
    try {
      //email password firstName lastName phoneNumber should be present and not undefined
      if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName || !req.body.phoneNumber || !req.body.register_as_role){
        return res
        .status(400)
        .json({ msg: "All necessary fields are required", status: false });
      }

      //admin will send the id of the role that  he/she wants to assign to the user (register_as_role)
      let { email, password, firstName, lastName, phoneNumber, register_as_role} = req.body;

      //check register_as_role is int or not
      if (isNaN(parseInt(register_as_role))) {
        return res.status(400).json({msg:"Invalid Role ID"});
      }
      register_as_role = parseInt(register_as_role);

      const isExist = await Role.roleExistsById(register_as_role)
      if(!isExist){
         return res.status(400).json({msg:`The provided roleId does not exists`})  
       }

      
      // validate  the incoming request, registration_validation in middleware catches errors and then we respond the error here
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // join all the  errors together to send them as a single error message
        const errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(", ");
        return res.status(422).json({ msg: errorMessages, Status: false }); //this is for validation purposes
      }

      // creating new instance  of User model class
      const newUser = new User(
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      );


      //register the user in the database
      const result = await newUser.register()

      //insert the user and role in userrole_relation table
      const r = await newUser.insertRole(register_as_role, result.insertId)
      if (!r || r.affectedRows == 0) {
        throw Error("Error in assigning role to the user");
      } else {
        return res
          .status(201)
          .json({ msg: "user registration successful", Status: true });
      }

    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ msg: `error while registration : ${error}`, status: false });
    }
  },

  updatePassword: async (req, res) => {
    try {
      //email password firstName lastName phoneNumber should be present and not undefined
      if (!req.body.oldPassword || !req.body.password ){
        return res
        .status(400)
        .json({ msg: "All necessary fields are required", status: false });
      }
      const { oldPassword, password} = req.body;
      
      // the input fields are oldPassword and password(this is the new password)
      // the password will get validated in register_validation middleware
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorMessages = errors
        .array()
        .map((error) => error.msg)
        .join(", ");
        return res.status(422).json({ msg: errorMessages, Status: false }); 
      }

      if (password == oldPassword){
        return res.status(400).json({ msg:"New Password cannot be same as Old Password" ,Status:false})
      }

      //get userdata 
      const userData = await User.findUserById(req.user.userId)

      // validate  the old Password
      const validPassword = await compare(oldPassword, userData.password);
      if(!validPassword){
        return res.status(401).json({ msg:"Invalid old Password" ,Status:false}) 
      }

      //hash the new password
      const hashedPassword = await hash(password, 10);

      //set updated password in the database
      const result = await User.updatePasswordOfUser(req.user.userId, hashedPassword)
      if (result.affected == 0) {
        return res.status(404).json({ msg: "password not updated", Status: false })
      }
      return res.status(200).send({ msg: 'Password Updated Successfully', Status:true});
    } catch (error) {
      return res.status(500).json({ msg:`Error in updating the password ${error}` ,Status: false}) ;
    }
  },

  //add new role 
  adminAddRole: async (req, res) => {
    try {
      let { roleName } = req.body;
      if (!roleName) {
        return res
          .status(400)
          .json({ msg: "Please provide all required fields", Status: false });
      }
      roleName = roleName.split(" ").join(""); //  remove spaces and convert to lower case
      roleName = roleName.toLowerCase();

      // check if the role already exists in DB
      const isExist = await Role.roleExistsByName(roleName);
      //if roleData is not empty that means role already exists
      console.log(isExist);
      if (isExist) {
        return res
          .status(409)
          .json({ msg: `${roleName} Role Already Exists`, Status: false });
      }

      //make new instance of Role model  with data from request body
      const newRole = new Role(roleName);

      //insert newrole inside  the roles table
      const success = await newRole.addRole();
      if (success === true) {
        return res
          .status(201)
          .json({ msg: "New Role Added Successfully", Status: true });
      }
      return res
        .status(500)
        .json({ msg: "Internal Server Error", Status: false });
    } catch (error) {
      console.log("addRole Error: ", error);
      return res.status(500).json({ msg: "Server Error", Status: false });
    }
  },

  //get all roles
  adminGetRoles: async (req, res) => {
    try {
      const result = await Role.getRoles();
      // console.log(result);
      if (result) {
        return res
          .status(200)
          .json({ result, msg: "Successful", Status: true });
      }
      return res.status(404).json({ msg: "No Roles Found!", Status: false });
    } catch (error) {
      console.log("getRoles Error: ", error);
      return res
        .status(500)
        .json({ msg: "Error while getting roles", Status: false });
    }
  },

  //update role, only  name can be updated
  updateRole: async (req, res) => {
    try {
      let { roleId, roleName } = req.body;
      //check if roleId exists and roleName exists and roleId is a number
      if (!roleId || !roleName || isNaN(Number(roleId))) {
        return res
          .status(400)
          .json({
            msg: "Invalid Request! Please Provide Valid Data.",
            Status: false,
          });
      }

      //check if the roleID is deleted or not
      const isDeleted = await Role.checkIfRoleDeleted(roleId);
      if (isDeleted) {
        return res
          .status(403)
          .json({ msg: "This Role Is Deleted.", Status: false });
      }
      roleName = roleName.split(" ").join(""); //  remove spaces and convert to lower case
      roleName = roleName.toLowerCase();
      // check if the role already exists in DB
      const isExist = await Role.roleExistsByName(roleName);
      if (isExist) {
        return res
          .status(409)
          .json({ msg: `${roleName} Role Already Exists`, Status: false });
      }
      const result = await Role.updateNameOfRole(roleId, roleName);
      if (result.affectedRows > 0) {
        return res
          .status(200)
          .json({ msg: "Role Updated Successfully", Status: true });
      }
      return res
        .status(500)
        .json({
          msg: "Something Went Wrong While Updating The Role.",
          Status: false,
        });
    } catch (error) {
      console.log("updateRole Error: ", error);
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //delete role 
  deleteRole: async (req, res) => {
    try {
      const roleId = req.body.roleId;
      //roleID should be number  and   not null or empty string
      if (!roleId || isNaN(parseInt(roleId))) {
        return res.status(400).json({ msg: "Invalid Inputs", Status: false });
      }
      const result = await Role.removeRole(roleId);
      if (!result) {
        return res.status(404).json({ msg: "Role Could not be deleted", Status: false });
      }
      return res.status(200).json({ msg: "Deleted Succesfully", Status: true });
    } catch (error) {
      console.log("Delete Role Error ", error);
      return res.status(500).json({ msg: error, Status: false });
    }
  },

  //get user profile
  userGetProfile: async (req, res) => {
    try {
      const result = await User.findUserById(req.user.userId);
      //delete  password from the response object to prevent security leaks
      delete result.password;
      // console.log(result);
      if (!result) {
        return res.status(404).json({ msg: "User Not Found", Status: false });
      }
      return res.status(200).json({ result, msg: "Successfull", Status: true });
    } catch (error) {
      return res.status(500).json({ msg: error.message || error, Status: false });
    }
  },

  //update profile of the user 
  //here we are updating profilePic fo the user
  userUpdateProfile: async (req, res) => {
    //only fistName,lastName,profilePic can be updated as of now
    //fistName,lastName,profilePic are necessary and need to be  there in request body
    //if user does not want to update then too  he/she has to send these fields with previous  values
    //profileImage is the new image and profilePic  is old one which needs to be replaced by new one
    try {
      let {  firstName, lastName, profilePic} = req.body;
      //firstName, lastname cannot be null
      if (!firstName || !lastName) {
        return res.status(400).json({ msg: "First Name or Last Name Cannot Be Empty" ,Status :false});
      }
      
      //if the req.file is present then update the imageUrl or else set imageUrl to previous image
      // if the imageUrl gets updated  then also remove old Image
      let imageUrl;

      // req.file is not  empty so there must be a file uploaded
      if (req.file != undefined) {
        imageUrl = req.file.filename;
        //unlink  old Image from the server folder if old image present
        if(req.body.profilePic !== ""){
          removeImageFile(req.body.profilePic, req.file.filename);
          
          // fs.unlinkSync(`public/images/user/${req.body.profilePic}`, (err) => {
          //   if (err) throw err;
          //   else console.log("Old Profile Picture has been Deleted");
          // })
        }
      } else {
        imageUrl = profilePic;
      }

      //updated data object
      const updatedData = { ...req.body, profilePic: imageUrl };
      const result = await User.updateProfile(updatedData, req.user.userId);
      if (!result || result.affectedRows === 0) {
        return res.status(400).json({ msg: "Failed To Update Profile", Status: false });
      }
      return res.status(200).json({ msg: "Profile Updated Successfully", Status: true });

    } catch (error) {
      return res.status(500).json({ msg: error.message, Status: false });
    }
  },

  //delete user 
  userDeleteAccount: async (req, res) => {
    try {
      //when user is deleted remove their role mapping from userrole_relation
      const result = await User.deleteProfile(req.user.userId);
      if (!result) {
        return res
          .status(401)
          .json({ message: "profile was not deleted", Status: false });
      }

      // Remove the session/token when user is deleted (will be implemented afterwards)
      return res
        .status(200)
        .json({ msg: "User Account Deleted Successfully", Status: true });
    } catch (error) {
      return res.status(500).send("Server Error");
    }
  },

  //get all permisssions
  getPermissions: async (req, res) => {
    try {
      let result = await Role.showAllPermissions();
      if (!result) {
        return res
          .status(404)
          .json({ msg: "No Permission Found", Status: false });
      }
      return res.status(201).json({ result, msg: "Successfull", Status: true });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //add role and its associated  permissions 
  // setRolePermission: async (req, res) => {
  //   try {
  //     // permissiosnIds is an array  of permission ids to add in this role
  //     let { roleId, permissionIds } = req.body;
  //     if (!roleId || !permissionIds ) {
  //       return res
  //         .status(400)
  //         .json({ msg: "Please provide all fields.", Status: false });
  //     }
  //     //roleId should be integer
  //     if  (isNaN(parseInt(roleId))) {
  //       return res.status(400).json({
  //         msg: "Invalid Data provided for roleId ",
  //         Status: false,
  //       });
  //     }
  //     roleId =  parseInt(roleId);
      
  //     //permissionIds should be an array of integers
  //     permissionIds = JSON.parse(permissionIds)
  //     if  (!Array.isArray(permissionIds)  || permissionIds.some((id)=> isNaN(parseInt(id)))){
  //       return res.status(400).json({
  //         msg: "Invalid data type for permission Ids , it should be Array of Integers.",
  //         Status: false,
  //       })
  //     }


  //     //insert in db
  //     const result = await Role.insertRolePermission(roleId, permissionIds);
  //     if (!result) {
  //       return res
  //         .status(409)
  //         .json({
  //           msg: "error occured while  adding permissions to role",
  //           Status: false,
  //         });
  //     }
  //     return res
  //       .status(201)
  //       .json({
  //         msg: "Role and permissions are binded successfully.",
  //         Status: true,
  //       });
  //   } catch (error) {
  //     return res.status(500).json({ msg: error.message, Status: false });
  //   }
  // },

  //update role of a user 
  updateUserRole: async (req, res) => {
    try {
      const { userId, newRoleId } = req.body;
      if (!userId || !newRoleId) {
        return res
          .status(400)
          .json({
            msg: "all fields are necessary",
            Status: false,
          });
      }

      if (isNaN(parseInt(userId)) || isNaN(parseInt(newRoleId))) {
        return res.status(400).json({
          msg: "userid and role id should be integer ",
          Status: false,
        });
      }

      //update the user in database
      const result = await Role.userToRoleUpdate(userId, newRoleId);
      if (result.affectedRows > 0) {
        return res
          .status(201)
          .json({
            msg: `User role has been updated Successfully`,
            Status: true,
          });
      }
      return res
        .status(404)
        .json({ msg: `Unable to Update User Role.`, Status: false });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //update permission associated with a role
  updateRolePermission: async (req, res) => {
    try {
      let { roleId, permissionIds } = req.body;
      if (!roleId || !permissionIds ) {
        return res
          .status(400)
          .json({ msg: "Please provide all fields.", Status: false });
      }
      //roleId should be integer
      if  (isNaN(parseInt(roleId))) {
        return res.status(400).json({
          msg: "Invalid Data provided for roleId ",
          Status: false,
        });
      }
      roleId =  parseInt(roleId);
      
      //permissionIds should be an array of integers
      permissionIds = JSON.parse(permissionIds)
      if (permissionIds.length  === 0 ){
        return res.status(400).json({
          msg:"At least one Permission is required",
          Status:false
        })
      }
      if  (!Array.isArray(permissionIds)  || permissionIds.some((id)=> isNaN(parseInt(id)))){
        return res.status(400).json({
          msg: "Invalid data type for permission Ids , it should be Array of Integers.",
          Status: false,
        })
      }
      
      //check if roleId exists or not
      const isExist = await Role.roleExistsById(roleId)
      if(!isExist){
         return res.status(404).json({
           msg :"Invalid RoleId",
           Status: false
         })
      }

      //check if all the permissionIds  are valid or not
      const isValid = await checkPermissionIds(permissionIds)
      if(!isValid){
        return res.status(404).json({
            msg :"Invalid Permission Id's",
            Status: false
        })
      }

      //update in the db 
      const result = await Role.updateRoleToPermission(roleId, permissionIds);
      if (!result.affectedRows) {
        return res
          .status(409)
          .json({ msg: "could not update role to permission", Status: false });
      }
      return res
        .status(201)
        .json({
          msg: "Role and Permissions are Updated Successfully.",
          Status: true,
        });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //display all users with their details and their roles
  displayAllUserRole: async (req, res) => {
    try {
      const result = await User.getUserRole();
      if (result.length === 0) {
        return res.status(404).json({ msg: "No Data Found.", Status: false });
      }
      return res
        .status(200)
        .json({ result, msg: "all users along with their role", Status: true });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //Retrieves all roles along with their associated permissions and sends the response to the client.
  displayRolesWithPermission: async (req, res) => {
    try {
      // Retrieve roles with permissions from the database
      const result = await Role.getRolesWithPermission();

      // If no roles are found, send a 404 response
      if (!result.length) {
        return res
          .status(404)
          .json({ msg: "No Roles found with permissions.", Status: false });
      }

      // Initialize an empty object to store roles with their permissions
      let response = {};
      for (const item of result) {
        // If the role is encountered for the first time, initialize its entry in the response object
        if (!response[item.roleId]) {
          response[item.roleId] = {
            roleId: item.roleId,
            roleName: item.roleName,
            permissions: [],
          };
        }

        // If the permission exists, add it to the permissions array of the corresponding role
        if (item.permissionId) {
          response[item.roleId].permissions.push({
            PermissionId: item.permissionId,
            PermissionName: item.permissionName,
          });
        }
      }

      /**
       * Structure of the response:
       *
       * {
       *   responseArray: [
       *     {
       *       roleId: number,            // The unique identifier of the role.
       *       roleName: string,          // The name of the role.
       *       permissions: [             // An array containing permissions associated with the role.
       *         {
       *           PermissionId: number,  // The unique identifier of the permission.
       *           PermissionName: string // The name of the permission.
       *         },
       *         // Additional permissions for the role, if any...
       *       ]
       *     },
       *     // Additional roles with their permissions, if any...
       *   ],
       *   msg: string,                   // A message indicating the status or purpose of the response.
       *   Status: boolean               // A boolean indicating the success status of the response.
       * }
       */

      // Convert the response object to an array for sending
      const responseArray = Object.values(response);
      // Send the response with a success status
      res
        .status(201)
        .json({ responseArray, msg: "Roles With Permissions", Status: true });
    } catch (error) {
      return res
        .status(500)
        .json({ msg: error.message || error, Status: false });
    }
  },

  //updates/deletes the profile picture
  //if profileImage(newImage) file is provided it will upload it and update the profilePic field in the usermaster table
  //if oldProfilePic is provided it will unlink it
  updateProfilePicture: async (req,res) => {
    try {
      const {oldProfilePic} = req.body;
      if (oldProfilePic !== ""){
        removeImageFile(oldProfilePic,req.file.filename);
      }
      let imageUrl = null;
      if(req.file != undefined){
        imageUrl = req.file.filename
      }
      // console.log(imageUrl);
      const result = await User.updateProfilePic(req.user.userId, imageUrl)
      if (!result) throw new Error('Failed to Update Profile Picture');
      return  res.status(200).send({msg:"Updated Successfully", Status: true});
    } catch (error) {
      console.log(error);
      return res.status(500).json({
        msg: error.message || error,
        Status:false
      })
    }
  }
};

module.exports = userController;