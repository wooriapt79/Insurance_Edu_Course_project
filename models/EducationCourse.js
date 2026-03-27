const mongoose = require('mongoose');

const educationCourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['insurance', 'financial', 'legal', 'internal'],
    default: 'internal'
  },
  providerName: String,
  category: {
    type: String,
    enum: ['insurance', 'law', 'finance', 'compliance'],
    required: true
  },
  materials: [{
    type: {
      type: String,
      enum: ['document', 'video', 'quiz', 'link'],
      required: true
    },
    title: String,
    content: String,
    order: Number,
    required: Boolean,
    duration: Number
  }, { _id: false }],
  exam: {
    examInstructions: String, // NEW FIELD
    antiCheatingPolicy: String, // NEW FIELD
    passingScore: {
      type: Number,
      required: true,
      default: 70
    },
    timeLimit: Number,
    questions: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['multiple-choice', 'text', 'boolean'],
        required: true
      },
      options: [String],
      correctAnswerIndex: Number,
      correctAnswerText: String,
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
      },
      topics: [String],
      learningObjectiveId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningObjective'
      },
      points: {
        type: Number,
        default: 1
      },
      explanation: String
    }]
  },
  skillGranted: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  validPeriod: {
    type: Number,
    default: 365
  },
  isActive: {
    type: Boolean,
    default: true
  },
  thumbnail: String,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

educationCourseSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('EducationCourse', educationCourseSchema);
