const express  = require('express');
const userController = require('../../controllers/user_controller/userController');
const auth = require('../../middlewares/auth');
const registerValidation = require('../../middlewares/register_validation');
const router =  express.Router();

router.post('/register_role', auth, registerValidation, userController.adminRegister)
router.get('/get_roles',auth, userController.adminGetRoles)
router.post('/add_role', auth, userController.adminAddRole)
router.get('/get_permissions',auth, userController.getPermissions)
// router.post('/set_role_permission',auth, userController.setRolePermission)
router.put('/update_role', auth, userController.updateRole)
router.delete('/delete_role', auth,  userController.deleteRole);
router.put('/update_user_role', auth, userController.updateUserRole)
router.put('/update_role_permission', auth, userController.updateRolePermission)
router.get('/display_user_role', auth, userController.displayAllUserRole)
router.get('/display_roles_with_permission', auth, userController.displayRolesWithPermission)

module.exports = router