const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = path.resolve(__dirname, '../../data/travel_planner_db.json');

// Ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const defaultSchema = {
  users: [],
  destinations: [],
  trips: [],
  itineraryDays: [],
  itineraryItems: [],
  expenses: [],
  reviews: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultSchema, null, 2), 'utf-8');
      return defaultSchema;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('Error reading database file:', err);
    return defaultSchema;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing to database file:', err);
  }
}

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

class Collection {
  constructor(name) {
    this.name = name;
  }

  getAll() {
    const db = readDb();
    return db[this.name] || [];
  }

  find(predicate = () => true) {
    const list = this.getAll();
    return list.filter(predicate);
  }

  findOne(predicate) {
    const list = this.getAll();
    return list.find(predicate) || null;
  }

  findById(id) {
    return this.findOne(item => item.id === id);
  }

  create(doc) {
    const db = readDb();
    if (!db[this.name]) db[this.name] = [];
    
    const newDoc = {
      id: doc.id || generateId(),
      ...doc,
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    db[this.name].push(newDoc);
    writeDb(db);
    return newDoc;
  }

  updateById(id, updates) {
    const db = readDb();
    const list = db[this.name] || [];
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return null;

    list[index] = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    writeDb(db);
    return list[index];
  }

  deleteById(id) {
    const db = readDb();
    const list = db[this.name] || [];
    const initialLength = list.length;
    db[this.name] = list.filter(item => item.id !== id);
    writeDb(db);
    return db[this.name].length < initialLength;
  }

  deleteMany(predicate) {
    const db = readDb();
    const list = db[this.name] || [];
    db[this.name] = list.filter(item => !predicate(item));
    writeDb(db);
  }
}

const db = {
  users: new Collection('users'),
  destinations: new Collection('destinations'),
  trips: new Collection('trips'),
  itineraryDays: new Collection('itineraryDays'),
  itineraryItems: new Collection('itineraryItems'),
  expenses: new Collection('expenses'),
  reviews: new Collection('reviews'),
  raw: { readDb, writeDb, generateId }
};

module.exports = db;
