const express  = require('express');
const userController = require('../../controllers/user_controller/userController');
const auth = require('../../middlewares/auth');
const registerValidation = require('../../middlewares/register_validation');
const router =  express.Router();

router.post('/registerRole', auth, registerValidation, userController.adminRegister)
router.get('/getRoles',auth, userController.adminGetRoles)
router.post('/addRole', auth, userController.adminAddRole)
router.get('/getPermissions',auth, userController.getPermissions)
// router.post('/set_role_permission',auth, userController.setRolePermission)
router.put('/updaterRole', auth, userController.updateRole)
router.delete('/deleteRole', auth,  userController.deleteRole);
router.put('/updateUserRole', auth, userController.updateUserRole)
router.put('/updateRolePermission', auth, userController.updateRolePermission)
router.get('/displayUserRole', auth, userController.displayAllUserRole)
router.get('/displayRolesWithPermission', auth, userController.displayRolesWithPermission)

module.exports = router