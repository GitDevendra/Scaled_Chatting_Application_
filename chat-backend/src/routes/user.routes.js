// src/routes/user.routes.js
const router  = require('express').Router();
const { searchUsers, getUserById, updateMyProfile } = require('../controllers/user.controller');
const { protect }  = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');
const { apiLimiter }        = require('../middleware/rateLimit.middleware');

router.use(protect);       
router.use(apiLimiter);

router.get('/search',   searchUsers);           // GET /api/users/search?q=alice
router.get('/:id',      getUserById);           // GET /api/users/:id
router.patch('/me',     validate(schemas.updateProfile), updateMyProfile); // PATCH /api/users/me

module.exports = router;