const express = require('express');
const router = express.Router();
const EducationCourse = require('../models/EducationCourse');
const CertificationAttempt = require('../models/CertificationAttempt');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill');
const { jwtMiddleware, requireRole } = require('../middleware/auth');
const Notification = require('../models/Notification'); // Corrected path to Notification model

// ==================== Public API ====================

// All active education courses (guest accessible)
router.get('/courses', async (req, res) => {
  try {
    const { category, provider } = req.query;
    let filter = { isActive: true };
    if (category) filter.category = category;
    if (provider) filter.provider = provider;

    const courses = await EducationCourse.find(filter)
      .select('title description providerName category thumbnail skillGranted validPeriod')
      .populate('skillGranted', 'name');
    res.json({ success: true, data: courses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Course details (guest accessible)
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await EducationCourse.findById(req.params.id)
      .populate('skillGranted', 'name description')
      .populate('createdBy', 'username');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== Authenticated API ====================

// Start exam (create attempt session)
router.post('/courses/:id/start', jwtMiddleware, async (req, res) => {
  try {
    const course = await EducationCourse.findById(req.params.id);
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Course not found or inactive.' });
    }

    const existingPassed = await CertificationAttempt.findOne({
      courseId: course._id,
      userId: req.user.id,
      passed: true
    });
    if (existingPassed && course.validPeriod > 0) {
      if (existingPassed.expiresAt && existingPassed.expiresAt > new Date()) {
        return res.status(400).json({ success: false, message: 'Already certified.' });
      }
    }

    await CertificationAttempt.deleteMany({
      courseId: course._id,
      userId: req.user.id,
      completedAt: { $exists: false }
    });

    const attempt = new CertificationAttempt({
      courseId: course._id,
      userId: req.user.id,
      startedAt: new Date()
    });
    await attempt.save();

    const examQuestions = course.exam.questions.map((q) => ({
      id: q._id,
      question: q.question,
      type: q.type,
      options: q.options || [],
      points: q.points,
      difficulty: q.difficulty,
      topics: q.topics,
      learningObjectiveId: q.learningObjectiveId
    }));

    res.json({
      success: true,
      attemptId: attempt._id,
      timeLimit: course.exam.timeLimit,
      questions: examQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Submit exam and auto-grade
router.post('/attempts/:attemptId/submit', jwtMiddleware, async (req, res) => {
  try {
    const attempt = await CertificationAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: 'Attempt record not found.' });
    if (attempt.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    if (attempt.completedAt) {
      return res.status(400).json({ success: false, message: 'Exam already submitted.' });
    }

    const course = await EducationCourse.findById(attempt.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });

    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'Answers are required.' });
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = [];

    for (let i = 0; i < course.exam.questions.length; i++) {
      const q = course.exam.questions[i];
      totalPoints += q.points || 1;

      const userAnswerObj = answers.find(a => a.questionId.toString() === q._id.toString());
      const userAnswer = userAnswerObj ? userAnswerObj.answer : '';

      let isCorrect = false;
      let pointsEarnedThisQuestion = 0;

      if (userAnswerObj && userAnswerObj.partialScore !== undefined) {
        pointsEarnedThisQuestion = userAnswerObj.partialScore;
        isCorrect = pointsEarnedThisQuestion > 0;
      } else if (q.type === 'multiple-choice') {
        isCorrect = (userAnswer == q.correctAnswerIndex || userAnswer === q.correctAnswerText);
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'text') {
        const normalizedUser = userAnswer.toString().trim().toLowerCase();
        const normalizedCorrect = q.correctAnswerText ? q.correctAnswerText.toString().trim().toLowerCase() : '';
        isCorrect = normalizedCorrect && normalizedUser.includes(normalizedCorrect);
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'boolean') {
        isCorrect = (userAnswer === q.correctAnswerText);
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
      }

      earnedPoints += pointsEarnedThisQuestion;

      gradedAnswers.push({
        questionId: q._id,
        answer: userAnswer,
        isCorrect,
        pointsEarned: pointsEarnedThisQuestion,
        explanation: q.explanation,
        timeSpentSeconds: userAnswerObj ? userAnswerObj.timeSpentSeconds : undefined,
        rawResponse: userAnswerObj ? userAnswerObj.rawResponse : undefined,
        agentConfidence: userAnswerObj ? userAnswerObj.agentConfidence : undefined,
        partialScore: userAnswerObj ? userAnswerObj.partialScore : undefined
      });
    }

    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= course.exam.passingScore;

    attempt.answers = answers.map(a => {
      const gradedAnswer = gradedAnswers.find(ga => ga.questionId.toString() === a.questionId.toString());
      return {
        questionId: a.questionId,
        answer: a.answer,
        timeSpentSeconds: a.timeSpentSeconds,
        rawResponse: a.rawResponse,
        agentConfidence: a.agentConfidence,
        partialScore: a.partialScore,
        isCorrect: gradedAnswer ? gradedAnswer.isCorrect : false,
        pointsEarned: gradedAnswer ? gradedAnswer.pointsEarned : 0
      }
    });
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    if (passed) {
      const skill = await Skill.findById(course.skillGranted);
      if (!skill) {
        return res.status(500).json({ success: false, message: 'Associated skill not found.' });
      }

      let userSkill = await UserSkill.findOne({ userId: req.user.id, skillId: skill._id });
      if (!userSkill) {
        userSkill = new UserSkill({
          userId: req.user.id,
          skillId: skill._id,
          level: 1,
          certified: true,
          certifiedAt: new Date(),
          certificateNumber: `CERT-${Date.now()}-${req.user.id.slice(-4)}`,
          expiresAt: course.validPeriod ? new Date(Date.now() + course.validPeriod * 86400000) : null
        });
      } else {
        userSkill.certified = true;
        userSkill.certifiedAt = new Date();
        userSkill.certificateNumber = `CERT-${Date.now()}-${req.user.id.slice(-4)}`;
        if (course.validPeriod) userSkill.expiresAt = new Date(Date.now() + course.validPeriod * 86400000);
      }
      await userSkill.save();

      attempt.certificateIssued = true;
      attempt.certificateNumber = userSkill.certificateNumber;
      attempt.expiresAt = userSkill.expiresAt;

      await Notification.create({
        userId: req.user.id,
        type: 'system',
        title: 'Certification Acquired',
        message: `You passed the ${course.title} course and acquired the ${skill.name} certification.`,
        link: `/skills/${skill._id}`
      });
    }

    await attempt.save();

    res.json({
      success: true,
      passed,
      score: Math.round(score * 100) / 100,
      passingScore: course.exam.passingScore,
      totalPoints,
      earnedPoints,
      gradedAnswers: gradedAnswers.map(g => ({
        questionId: g.questionId,
        isCorrect: g.isCorrect,
        pointsEarned: g.pointsEarned,
        explanation: g.explanation,
        timeSpentSeconds: g.timeSpentSeconds,
        rawResponse: g.rawResponse,
        agentConfidence: g.agentConfidence,
        partialScore: g.partialScore
      })),
      certificate: passed ? {
        number: attempt.certificateNumber,
        expiresAt: attempt.expiresAt
      } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// My certifications list
router.get('/my-certifications', jwtMiddleware, async (req, res) => {
  try {
    const userSkills = await UserSkill.find({ userId: req.user.id, certified: true })
      .populate('skillId')
      .sort('-certifiedAt');
    res.json({ success: true, data: userSkills });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Certificate details (PDF generation link, etc.)
router.get('/certificates/:certNumber', jwtMiddleware, async (req, res) => {
  try {
    const userSkill = await UserSkill.findOne({ certificateNumber: req.params.certNumber })
      .populate('skillId')
      .populate('userId', 'username email');
    if (!userSkill) return res.status(404).json({ success: false, message: 'Certificate not found.' });
    if (userSkill.userId._id.toString() !== req.user.id && req.user.role !== 'CEO') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }
    res.json({ success: true, data: userSkill });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// NEW: Self-study modules list for certified users
router.get('/my-self-study-modules', jwtMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userSkills = await UserSkill.find({ userId, certified: true }).select('skillId');
    const certifiedSkillIds = userSkills.map(us => us.skillId);

    const selfStudyCourses = await EducationCourse.find({
      skillGranted: { $in: certifiedSkillIds },
      category: 'finance',
      isActive: true
    })
    .select('title description providerName category thumbnail skillGranted validPeriod')
    .populate('skillGranted', 'name');

    res.json({ success: true, data: selfStudyCourses });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ==================== Admin API ====================

// Create course (CEO or Core Team)
router.post('/courses', jwtMiddleware, requireRole(['CEO', 'Core Team']), async (req, res) => {
  try {
    const { title, description, provider, providerName, category, materials, exam, skillGranted, validPeriod, thumbnail } = req.body;
    if (!title || !description || !skillGranted) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const course = new EducationCourse({
      title,
      description,
      provider: provider || 'internal',
      providerName,
      category,
      materials: materials || [],
      exam: exam || { passingScore: 70, questions: [] },
      skillGranted,
      validPeriod: validPeriod || 365,
      thumbnail,
      createdBy: req.user.id
    });
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
