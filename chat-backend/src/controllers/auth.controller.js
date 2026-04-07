
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const sendTokenCookie = (res, token) => {
  res.cookie('jwt', token, {
    httpOnly: true,                                   
    secure: process.env.NODE_ENV === 'production',   
    sameSite: 'strict', 
    maxAge: Number(process.env.JWT_COOKIE_EXPIRES_IN) * 24 * 60 * 60 * 1000,
  });
};

exports.register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: 'Email or username already taken' });
    }

    const user = await User.create({ username, email, password });
    const token = signToken(user._id);

    await redisClient.setex(
      `session:${user._id}`,
      7 * 24 * 60 * 60,   // 7 days TTL
      token
    );

    sendTokenCookie(res, token);

    res.status(201).json({
      status: 'success',
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    await redisClient.setex(`session:${user._id}`, 7 * 24 * 60 * 60, token);

    sendTokenCookie(res, token);

    res.json({
      status: 'success',
      user: { id: user._id, username: user.username, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await redisClient.del(`session:${req.user._id}`);
    res.cookie('jwt', '', { httpOnly: true, expires: new Date(0) });
    res.json({ status: 'success', message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

exports.getMe = async (req, res) => {
  res.json({ status: 'success', user: req.user });
};