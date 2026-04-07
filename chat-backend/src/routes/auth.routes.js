
const router = require('express').Router();
const { register, login, logout, getMe } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authLimiter, apiLimiter } = require('../middleware/rateLimit.middleware'); 

router.post('/register', authLimiter, register);
router.post('/login',    authLimiter, login);
router.post('/logout',   protect, apiLimiter, logout);
router.get('/me',        protect, apiLimiter, getMe);

module.exports = router;