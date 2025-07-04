const { body, validationResult } = require('express-validator');

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors, " errorserrors")
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array()[0].msg });
    }
    next();
};

const createUserValidationRules = () => {
    return [
        body('name').notEmpty().withMessage('Name is required'),
        body('email').isEmail().withMessage('Invalid email'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    ];
};

function isEmpty(value) {
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
}

function isEmail(email) {
    // Regular expression for a basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Test the email against the regex
    return emailRegex.test(email);
}

const validatePassword = (password) => {
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    return regex.test(password);
};

function isValidPhoneNumber(phoneNumber) {
    const phoneNumberRegex = /^\d{10}$/;
    return phoneNumberRegex.test(phoneNumber);
}


//validation empty------------------------------
const validateEmpty = (obj) => {
    if (Object.keys(obj).length == 0) {
        return `Please provide required parameters`;
    }
    for (const key in obj) {
        if (!obj[key] && obj[key] < 0) {
            return `Please provide ${key} value`;
        }
    }
    return '';
}



// Function to dynamically generate validation rules based on keys sent in the request body
// const generateValidationRules = (keys) => {
//     const validationRules = [];
//     keys.forEach(key => {
//         switch (key) {
//             case 'fullname':
//                 validationRules.push(body('fullname').notEmpty().withMessage('Fullname is required'));
//                 break;
//             case 'email':
//                 validationRules.push(body('email').isEmail().withMessage('Invalid email'));
//                 break;
//             case 'password':
//                 validationRules.push(body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'));
//                 break;
//             // case 'refferalTo':
//             //   validationRules.push(body('refferalTo').optional().isString().withMessage('Referral must be a string'));
//             //   break;
//             case 'country_code':
//                 validationRules.push(body('country_code').optional().isString().withMessage('Country code must be a string'));
//                 break;
//             case 'phoneno':
//                 validationRules.push(body('phoneno').optional().isNumeric().withMessage('Phone number must be numeric'));
//                 break;
//             default:
//                 break;
//         }
//     });
//     return validationRules;
// };

module.exports = {
    validateRequest,
    createUserValidationRules,
    isEmpty,
    isEmail,
    validatePassword,
    isValidPhoneNumber,
    validateEmpty
    // generateValidationRules
};
