const express = require("express");
const userController = require("../../controllers/user_controller/userController");
const registerValidation  = require('../../middlewares/register_validation');
const auth = require("../../middlewares/auth");
const router = express.Router()
const upload = require('../../middlewares/profile_pic_upload');

router.post('/register', registerValidation , userController.userRegister)
router.get('/get_profile', auth, userController.userGetProfile)
router.put("/update_profile", auth, upload , userController.userUpdateProfile)
router.delete('/delete_profile', auth,  userController.userDeleteAccount)
router.put('/update_password', auth, registerValidation,  userController.updatePassword)
router.put('/update_profile_Picture', auth, upload, userController.updateProfilePicture)

module.exports = router;