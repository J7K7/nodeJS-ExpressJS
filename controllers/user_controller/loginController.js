const { compare } = require( 'bcrypt');
const User = require('../../models/user_model/user')
const Role =  require('../../models/user_model/role')
const jwt  = require("jsonwebtoken");

const loginController = {
    login: async (req, res) => {
        try {
          const { email, password } = req.body;
          if (!email || !password ) return res.status(400).send({ msg: "Missing data", Status:  false });
          
          // check whether  the user is in the database or not
          const result = await User.findUserByEmail(email); 
          if (!result) {
            return res
              .status(400)
              .json({ msg: "Invalid Email ", Status: false });
          }

          //comapre password  with hashed password stored in the database
          const validPassword = await compare(password, result.password);
          if (!validPassword) {
            return res
              .status(400)
              .json({ msg: "Invalid Password", Status: false });
          }
          // password = await bcrypt.hash(password, 10);
          delete req.body.password
    
          //find role of the user  and add it to the token
          let roleData = await Role.findRoleofUser(result.userId);
          
          //token is signed using userId and roleId
          let token = await jwt.sign(
            { userId: result.userId, roleId: roleData.roleId },
            process.env.SECRET_KEY,
            { expiresIn: "2d" }
          );
    
          if (token === null) {
            return res.status(500).send({ message: "Error creating token", Status : false });
          }
    
          let response = {
            token: token,
            userId: result.userId,
            email:  result.email,
            firstName: result.firstName,
            lastName: result.lastName,
            roleId: roleData.roleId,
            phoneNumber:  result.phoneNumber,
            image: result.profilePic,
            Status: true,
          };
    
          res.status(200).json({response, msg : "user logged in successfully", Status : true});
        } catch (error) {
            console.log(error);
          return res.status(500).json({ msg: error.message, Status: false });
        }
      },
}

module.exports = loginController