
const Conversation = require('../models/Conversation');
const User = require('../models/User');

exports.getOrCreateDirect = async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    const myId = req.user._id;

   
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

  
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: { $all: [myId, targetUserId], $size: 2 },
    }).populate('participants', 'username avatar isOnline lastSeen');

  
    if (!conversation) {
      conversation = await Conversation.create({
        type: 'direct',
        participants: [myId, targetUserId],
      });
      await conversation.populate('participants', 'username avatar isOnline lastSeen');
    }

    res.json({ status: 'success', conversation });
  } catch (err) {
    next(err);
  }
};


exports.createGroup = async (req, res, next) => {
  try {
    const { name, participantIds } = req.body;
    const myId = req.user._id;

    const allParticipants = [...new Set([myId.toString(), ...participantIds])];
    if (allParticipants.length < 2) {
      return res.status(400).json({ message: 'Group needs at least 2 participants' });
    }

    const conversation = await Conversation.create({
      type: 'group',
      name,
      admin: myId,
      participants: allParticipants,
    });

    await conversation.populate('participants', 'username avatar');
    res.status(201).json({ status: 'success', conversation });
  } catch (err) {
    next(err);
  }
};

exports.getMyConversations = async (req, res, next) =>  {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ lastActivity: -1 })
      .populate('participants', 'username avatar isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username' },
      });

    res.json({ status: 'success', conversations });
  } catch (err) {
    next(err);
  }
};