const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const db = require('../models/db');

function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

exports.register = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required fields.'
    });
  }

  const existing = db.users.findOne(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email address already exists.'
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = db.users.create({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: passwordHash,
    role: 'traveler'
  });

  const token = createToken(newUser);

  res.status(201).json({
    success: true,
    message: 'User account created successfully.',
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    }
  });
};

exports.login = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both email and password.'
    });
  }

  const user = db.users.findOne(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. User not found.'
    });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials. Password incorrect.'
    });
  }

  const token = createToken(user);

  res.json({
    success: true,
    message: 'Login successful.',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
};

exports.getMe = (req, res) => {
  const user = db.users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      bio: user.bio || '',
      travelStyle: user.travelStyle || 'Adventure & Culture',
      createdAt: user.createdAt
    }
  });
};

// READ: Detailed profile with trip statistics
exports.getProfile = (req, res) => {
  const user = db.users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const userTrips = db.trips.find(t => t.userId === user.id);
  const tripIds = userTrips.map(t => t.id);
  const userExpenses = db.expenses.find(e => tripIds.includes(e.tripId));
  const totalBudgetSpent = userExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || 'traveler',
      phone: user.phone || '',
      bio: user.bio || '',
      travelStyle: user.travelStyle || 'Adventure & Culture',
      createdAt: user.createdAt,
      stats: {
        totalTrips: userTrips.length,
        totalExpensesLogged: userExpenses.length,
        totalSpent: totalBudgetSpent
      }
    }
  });
};

// READ: All users (useful for Viva demonstration / evaluation)
exports.getAllUsers = (req, res) => {
  const users = db.users.getAll().map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role || 'traveler',
    phone: u.phone || '',
    bio: u.bio || '',
    travelStyle: u.travelStyle || 'Explorer',
    createdAt: u.createdAt,
    tripCount: db.trips.find(t => t.userId === u.id).length
  }));

  res.json({
    success: true,
    count: users.length,
    users
  });
};

// UPDATE: Update profile information
exports.updateProfile = (req, res) => {
  const { name, email, phone, bio, travelStyle } = req.body;
  const user = db.users.findById(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  // If email is changing, verify it's not taken by another user
  if (email && email.trim().toLowerCase() !== user.email.toLowerCase()) {
    const existing = db.users.findOne(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== user.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already in use by another account.'
      });
    }
  }

  const updates = {
    name: (name && name.trim()) ? name.trim() : user.name,
    email: (email && email.trim()) ? email.trim().toLowerCase() : user.email,
    phone: phone !== undefined ? phone.trim() : (user.phone || ''),
    bio: bio !== undefined ? bio.trim() : (user.bio || ''),
    travelStyle: travelStyle !== undefined ? travelStyle.trim() : (user.travelStyle || 'Adventure & Culture')
  };

  const updatedUser = db.users.updateById(user.id, updates);
  const token = createToken(updatedUser);

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    token,
    user: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      travelStyle: updatedUser.travelStyle,
      updatedAt: updatedUser.updatedAt
    }
  });
};

// UPDATE: Change Password
exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Both current password and new password are required.'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'New password must be at least 6 characters long.'
    });
  }

  const user = db.users.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const isMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Current password is incorrect.'
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPassword, salt);

  db.users.updateById(user.id, { passwordHash });

  res.json({
    success: true,
    message: 'Password updated successfully.'
  });
};

// DELETE: Delete user account and cascade delete all associated data
exports.deleteAccount = (req, res) => {
  const userId = req.user.id;
  const user = db.users.findById(userId);

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found.' });
  }

  const userTrips = db.trips.find(t => t.userId === userId);
  const tripIds = userTrips.map(t => t.id);

  if (tripIds.length > 0) {
    db.itineraryItems.deleteMany(item => tripIds.includes(item.tripId));
    db.itineraryDays.deleteMany(day => tripIds.includes(day.tripId));
    db.expenses.deleteMany(exp => tripIds.includes(exp.tripId));
    db.trips.deleteMany(t => t.userId === userId);
  }

  db.users.deleteById(userId);

  res.json({
    success: true,
    message: 'User account and all associated trips and expenses were permanently deleted.'
  });
};
