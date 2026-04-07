// src/controllers/message.controller.js
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { publishEvent } = require('../config/kafka');

exports.sendMessage = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, type = 'text' } = req.body;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) return res.status(403).json({ message: 'Not a participant' });

    const message = await Message.create({
      conversationId,
      sender: req.user._id,
      content,
      type,
    });

    await message.populate('sender', 'username avatar');

   
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    await publishEvent('chat.messages', conversationId, {
      type: 'NEW_MESSAGE',
      conversationId,
      message: {
        _id: message._id,
        content: message.content,
        type: message.type,
        sender: message.sender,
        createdAt: message.createdAt,
        conversationId,
      },
    });

    res.status(201).json({ status: 'success', message });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;


    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    });
    if (!conversation) return res.status(403).json({ message: 'Not a participant' });

    const messages = await Message.find({
      conversationId,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })   
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar');

    const total = await Message.countDocuments({ conversationId, isDeleted: false });

    res.json({
      status: 'success',
      messages: messages.reverse(),  
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
};