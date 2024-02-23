const { check } = require("express-validator");
 
//the fields in this is set as optional because we need differnt validations for differnt requests
//for ex. for update_password request we only need to validate upcoming password, 
// only available fiels will be validated
const registerValidation = [
    check("email")
        .optional({ nullable: true })
        .isEmail().withMessage("Invalid email address")
        .normalizeEmail(), // Normalize the email address

    check("password")
        .optional({ nullable: true })
        .isLength({ min: 5 }).withMessage("Password must be at least 5 characters long")
        .matches(/^(?=.*\d)(?=.*[a-zA-Z]).{5,}$/).withMessage("Password must contain at least one letter and one number"),

    check("firstName")
        .optional({ nullable: true })
        .trim()
        .notEmpty().withMessage("First name is required")
        .isLength({ max: 45 }).withMessage("First name cannot be more than 45 characters"),

    check("lastName")
        .optional({ nullable: true })
        .trim()
        .notEmpty().withMessage("Last name is required")
        .isLength({ max: 45 }).withMessage("Last name cannot be more than 45 characters"),

    check("phoneNumber")
        .optional({ nullable: true })
        .matches(/^[0-9]{10}$/)
        .withMessage("Invalid phone number format. It should be a 10-digit number."),
];

module.exports = registerValidation;