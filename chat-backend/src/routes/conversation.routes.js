
const router = require('express').Router();
const {
  getOrCreateDirect,
  createGroup,
  getMyConversations,
} = require('../controllers/conversation.controller');
const { protect }  = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');
const { apiLimiter }        = require('../middleware/rateLimit.middleware');

router.use(protect);
router.use(apiLimiter);

router.get( '/',        getMyConversations);                              // GET  /api/conversations
router.post('/direct',  getOrCreateDirect);                              // POST /api/conversations/direct
router.post('/group',   validate(schemas.createGroup), createGroup);     // POST /api/conversations/group

module.exports = router;