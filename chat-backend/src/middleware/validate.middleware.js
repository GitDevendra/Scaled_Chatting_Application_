const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return res.status(400).json({ status: 'error', messages });
  }

  req.body = result.data; 
  next();
};


const schemas = {
  register: z.object({
    username: z.string().min(3).max(30),
    email:    z.string().email(),
    password: z.string().min(8),
  }),

  login: z.object({
    email:    z.string().email(),
    password: z.string().min(1),
  }),

  sendMessage: z.object({
    content: z.string().min(1).max(5000),
    type:    z.enum(['text', 'image', 'file', 'system']).default('text'),
  }),

  createGroup: z.object({
    name:           z.string().min(2).max(50),
    participantIds: z.array(z.string().length(24)).min(1),
  }),

  updateProfile: z.object({
    username: z.string().min(3).max(30).optional(),
    avatar:   z.string().url().or(z.literal('')).optional(),
  }),
};

module.exports = { validate, schemas };