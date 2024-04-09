const express = require("express");
const userController = require("../../controllers/user_controller/userController");
const registerValidation  = require('../../middlewares/register_validation');
const auth = require("../../middlewares/auth");
const router = express.Router()
const upload = require('../../middlewares/profile_pic_upload');

router.post('/register', registerValidation , userController.userRegister)
router.get('/getProfile', auth, userController.userGetProfile)
router.put("/updateProfile", auth, upload , userController.userUpdateProfile)
router.delete('/deleteProfile', auth,  userController.userDeleteAccount)
router.put('/updatePassword', auth, registerValidation,  userController.updatePassword)
router.put('/updateProfilePicture', auth, upload, userController.updateProfilePicture)
router.get('/getBusinessCategory', auth, userController.getBusinessCategory);

module.exports = router;