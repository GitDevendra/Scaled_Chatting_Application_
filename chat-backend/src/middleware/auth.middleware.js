// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

const protect = async (req, res, next) => {
  try {
 
    let token = req.cookies?.jwt;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }


    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    
    const sessionKey = `session:${decoded.id}`;
    const storedToken = await redisClient.get(sessionKey);
    if (!storedToken || storedToken !== token) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User no longer exists' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = { protect };