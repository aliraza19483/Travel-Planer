const db = require('../models/db');

exports.getTripBudgetSummary = (req, res) => {
  const { id } = req.params;
  const trip = db.trips.findById(id);

  if (!trip) {
    return res.status(404).json({ success: false, message: 'Trip not found.' });
  }

  if (trip.userId !== req.user.id && !trip.isPublic) {
    return res.status(403).json({ success: false, message: 'Access denied.' });
  }

  const expenses = db.expenses.find(e => e.tripId === trip.id);
  const totalSpent = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalBudget = Number(trip.totalBudget) || 0;
  const remaining = Math.max(0, totalBudget - totalSpent);
  const utilizationPercent = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  // Breakdown by category
  const categories = ['Lodging', 'Transport', 'Food', 'Activities', 'Shopping', 'Miscellaneous'];
  const breakdown = {};
  categories.forEach(cat => {
    breakdown[cat] = 0;
  });

  expenses.forEach(e => {
    const cat = categories.includes(e.category) ? e.category : 'Miscellaneous';
    breakdown[cat] = (breakdown[cat] || 0) + (Number(e.amount) || 0);
  });

  res.json({
    success: true,
    budget: {
      totalBudget,
      totalSpent,
      remaining,
      utilizationPercent,
      isOverBudget: totalSpent > totalBudget,
      breakdown,
      expenses: expenses.sort((a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt))
    }
  });
};

exports.addExpense = (req, res) => {
  const { id } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const { category, amount, description, expenseDate } = req.body;

  if (!category || !amount || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Category and positive expense amount are required.'
    });
  }

  const newExpense = db.expenses.create({
    tripId: trip.id,
    category: category.trim(),
    amount: Number(amount),
    description: description ? description.trim() : '',
    expenseDate: expenseDate || new Date().toISOString().split('T')[0]
  });

  res.status(201).json({
    success: true,
    message: 'Expense recorded successfully.',
    expense: newExpense
  });
};

exports.deleteExpense = (req, res) => {
  const { id, expId } = req.params;
  const trip = db.trips.findById(id);

  if (!trip || trip.userId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Unauthorized.' });
  }

  const deleted = db.expenses.deleteById(expId);
  if (!deleted) {
    return res.status(404).json({ success: false, message: 'Expense record not found.' });
  }

  res.json({
    success: true,
    message: 'Expense removed.'
  });
};
