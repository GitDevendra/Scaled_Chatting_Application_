
const User = require('../models/User');
const { getBulkPresence } = require('../services/presence.service');
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Query must be at least 2 characters' });
    }

    const regex = new RegExp(q.trim(), 'i');
    const users = await User.find({
      _id:      { $ne: req.user._id },
      $or: [{ username: regex }, { email: regex }],
    })
      .select('username email avatar isOnline lastSeen')
      .limit(20);

    const ids      = users.map((u) => u._id.toString());
    const presence = await getBulkPresence(ids);

    const results = users.map((u) => ({
      ...u.toObject(),
      isOnline: presence[u._id.toString()] ?? u.isOnline,
    }));

    res.json({ status: 'success', users: results });
  } catch (err) { next(err); }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username email avatar isOnline lastSeen createdAt');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const presence = await getBulkPresence([user._id.toString()]);
    const result   = { ...user.toObject(), isOnline: presence[user._id.toString()] ?? user.isOnline };

    res.json({ status: 'success', user: result });
  } catch (err) { next(err); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const forbidden = ['password', 'email', 'isOnline'];
    for (const field of forbidden) {
      if (req.body[field] !== undefined) {
        return res.status(400).json({ message: `Cannot update '${field}' via this endpoint` });
      }
    }

    if (username) {
      const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (taken) return res.status(409).json({ message: 'Username already taken' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { ...(username && { username }), ...(avatar !== undefined && { avatar }) },
      { new: true, runValidators: true },
    ).select('-password');
    

    res.json({ status: 'success', user: updated });
  } catch (err) { next(err); }
};