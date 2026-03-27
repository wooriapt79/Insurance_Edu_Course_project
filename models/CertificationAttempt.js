const mongoose = require('mongoose');

const certificationAttemptSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EducationCourse',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    answer: mongoose.Schema.Types.Mixed,
    timeSpentSeconds: Number,
    rawResponse: String,
    agentConfidence: Number,
    partialScore: Number
  }],
  score: Number,
  passed: {
    type: Boolean,
    default: false
  },
  certificateIssued: {
    type: Boolean,
    default: false
  },
  certificateNumber: String,
  certificateUrl: String,
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

certificationAttemptSchema.index({ courseId: 1, userId: 1 }, { unique: true, partialFilterExpression: { passed: false } });

module.exports = mongoose.model('CertificationAttempt', certificationAttemptSchema);
