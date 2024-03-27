const jwt = require('jsonwebtoken')
const { findRoleByName,checkPermission } = require('../common/userQueries');

// this is  middleware for authentication and  authorization.
//first  it checks if the user has a valid token in their request header.
//if yes then it will check if he/she has permission to access that route or not.
const auth = async (req, res, next) => { 
    try {
      //if  no token provided , send unauthorized error message.
      // console.log(req.headers.authorization);
      if (!req.headers.authorization) {
        return res
          .status(403)
          .json({ msg: "No token provided", Status: false });
      }

      // here  we are splitting bearer with space so that we can get prefix and token.
      const [bearerPrefix, token] = req.headers.authorization.split(" ");
      if (bearerPrefix !== "Bearer" || !token) {
        return res
          .status(401)
          .json({ msg: "Invalid authentication method", Status: false });
      }

      // here we are verifying the token using json web token .
      const userData = await jwt.verify(token, process.env.SECRET_KEY);
      //token is already signed with roleId

      let currentUrl = req.url; // this gives us the url of the requested resource.
      // console.log("current url",currentUrl)
      // console.log("this is current url", currentUrl);
      // remove / from starting of the url
      // currentUrl = currentUrl.slice(1);
      //remove "/" and "numbers" from the url string
      // currentUrl = currentUrl.replace(/\/|\d/g, '');

      // Split the URL by forward slash
      let urlSegments = currentUrl.split("/");

      // Remove the first empty string (since URL starts with '/')
      urlSegments.shift();

      // Extract the desired segment based on the URL structure
      let segment=urlSegments[0];
      let urlSegmentsSplit = segment.split("?");
      let urlSegment2 = urlSegmentsSplit[0]
      // urlSegments.shift();

      // console.log("segment",segment);
      // console.log("urlSegment2",urlSegment2);
    //   if (urlSegments.length > 1) {
    //     // Case: /getProducts/12
    //     segment = urlSegments[0];
    //   } else {
    //     // Case: /login
    //     segment = urlSegments[0];
    //   }

    //   console.log("Desired segment:", segment);

      // console.log(cleanedUrl);

      // Check if the user has permission to access the specified URL.
      // The URL string and the role that can access the URL are stored in the database.
      const hasPermission = await checkPermission(
        userData.userId,
        userData.roleId,
        urlSegment2
      );
      if (!hasPermission) {
        return res
          .status(403)
          .send({ msg: "unauthorized access", Status: false });
      }
      //add user data to the request object.
      req.user = userData;
      next();
    } catch (error) {
        return res.status(500).json({msg: error.message || error,Status :false});
    }
}

module.exports = auth