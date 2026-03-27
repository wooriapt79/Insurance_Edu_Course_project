const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String, enum: ['insurance', 'finance', 'law', 'technical', 'soft skill'], default: 'technical' },
  certification: {
    type: Boolean,
    default: false
  },
  certificationProvider: String,
  validPeriod: Number, // days
  renewable: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Skill', skillSchema);
