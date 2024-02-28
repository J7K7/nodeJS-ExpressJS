const {executeQuery} = require("../db/connection");


//check permission for user to access the route
const checkPermission = async (userId,roleId, currentUrl) => {
  try {
    //first check the userId  is valid or not
    let query = "select count(userId) as count from usermaster where userId = ? and  isDeleted = 0";
    let queryParam  = [userId] ;
    let rows = await executeQuery(query , queryParam );
    if(!rows[0].count || rows[0].count < 1) {
        throw new Error('Invalid User Id')
    }


    //check if the roleId has the necessary permission 
    // console.log(roleId, currentUrl);
    query = "select count(p.permissionId) as count_of_permission from rolepermission_relation as rp join permission as p on rp.permissionId = p.permissionId where rp.roleId = ? and p.permissionName = ?"
    queryParam = [roleId, currentUrl];
    let result = await executeQuery(query, queryParam);
    // console.log(result);
    if(result[0].count_of_permission  > 0){
        return true;
    }else{
        return false;
    }
  } catch (error) {
    console.log("error in checking permission", error);
    throw error;
  }
}

const checkPermissionIds = async (permissionIds) => {
  try {
    let s = "select count(permissionId) as count from permission where permissionId in "
    let temp = "(?";
    for (let i=2;i<permissionIds.length+1;i++){
      temp += ",?";
    }
    temp+= ")";
    let query = s +temp;
    let queryParam =  permissionIds;
    let res = await executeQuery(query,queryParam);
    if(res[0].count == permissionIds.length){
       return true;
     } else{
       return false;
     }
  } catch (error) {
    console.log("Error in Checking Permission ids : ",error);
    throw error;
  }
}





module.exports = {checkPermission,checkPermissionIds};