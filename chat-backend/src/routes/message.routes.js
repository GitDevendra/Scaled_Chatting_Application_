// src/routes/message.routes.js
const router = require('express').Router({ mergeParams: true });
const { sendMessage, getMessages } = require('../controllers/message.controller');
const { protect }  = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');
const { messageLimiter, apiLimiter } = require('../middleware/rateLimit.middleware');

router.use(protect);

// GET  /api/messages/:conversationId         — paginated history
router.get( '/:conversationId', apiLimiter,     getMessages);

// POST /api/messages/:conversationId         — send a message
router.post('/:conversationId', messageLimiter, validate(schemas.sendMessage), sendMessage);

module.exports = router;