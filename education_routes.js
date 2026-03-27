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
  providerName: String,     // 실제 제공처 이름 (예: "ABC보험")
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
    content: String,         // URL, 텍스트 내용, 또는 파일 ID
    order: Number,
    required: Boolean,
    duration: Number         // 예상 소요 시간(분)
  }, { _id: false }], // NOTE: materials 내 각 객체에 _id 생성 방지
  exam: {
    passingScore: {
      type: Number,
      required: true,
      default: 70
    },
    timeLimit: Number,       // 분 단위, 0이면 제한 없음
    questions: [{
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // NEW: question._id를 사용하여 고유 ID 참조
      question: {
        type: String,
        required: true
      },
      type: {
        type: String,
        enum: ['multiple-choice', 'text', 'boolean'],
        required: true
      },
      options: [String],     // 객관식일 경우 선택지
      correctAnswerIndex: Number, // NEW: 'multiple-choice' 타입의 정답 인덱스
      correctAnswerText: String,  // NEW: 'text' 또는 'boolean' 타입의 정답 텍스트
      // NOTE: `correctAnswer` 필드는 `correctAnswerIndex`와 `correctAnswerText`로 대체됨.
      //       기존 데이터와의 호환성을 위해 마이그레이션이 필요할 수 있음.
      // correctAnswer: String, // (Deprecated) 정답 (객관식: 옵션 인덱스 또는 텍스트, 주관식: 키워드)
      difficulty: { // NEW: 난이도 (easy, medium, hard) - AI 학습 데이터 활용
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
      },
      topics: [String], // NEW: 질문이 다루는 주제/태그 (예: ['생명보험', '약관']) - AI 학습 데이터 활용
      learningObjectiveId: { // NEW: 관련 학습 목표 ID - AI 학습 데이터 활용
        type: mongoose.Schema.Types.ObjectId,
        ref: 'LearningObjective' // LearningObjective 모델이 있다고 가정
      },
      points: {
        type: Number,
        default: 1
      },
      explanation: String    // 정답 해설
    }] // NOTE: _id가 명시적으로 auto:true로 설정되었으므로 {_id: false}는 제거
  },
  skillGranted: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  validPeriod: {
    type: Number,            // 유효 기간(일), 0이면 영구
    default: 365
  },
  // NOTE: validPeriod가 0일 때 '영구'임을 명확히 하는 로직 또는 isPermanent 필드 고려
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
    questionId: { // NEW: EducationCourse.exam.questions의 _id를 참조
      type: mongoose.Schema.Types.ObjectId,
      required: true
      // NOTE: Subdocument 참조의 populate는 복잡할 수 있어, 직접적으로 _id를 저장하는 방식으로 진행
    },
    answer: mongoose.Schema.Types.Mixed, // 채점을 위해 정규화된 답변
    timeSpentSeconds: Number, // NEW: 에이전트가 문제 해결에 걸린 시간 (AI 학습 데이터 활용)
    rawResponse: String,      // NEW: 에이전트의 원시 텍스트 응답 (특히 text 타입 질문용 - AI 학습 데이터 활용)
    agentConfidence: Number,  // NEW: 에이전트가 답변에 대해 가진 신뢰도 (0-100%) (AI 학습 데이터 활용)
    partialScore: Number,     // NEW: 부분 점수 (복합 채점 기준이 있는 경우) (AI 학습 데이터 활용)
    // NOTE: isCorrect는 부분 점수가 0보다 크면 true로 판단 가능
    // explanation: String // NEW: 시험 결과에 설명 포함을 위해 EducationCourse에서 가져온 explanation을 저장할 수도 있음
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
  certificateUrl: String,    // PDF 링크
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 인덱스: 사용자별 코스 중복 응시 방지 (미완료/실패 시 재응시 가능)
certificationAttemptSchema.index({ courseId: 1, userId: 1 }, { unique: true, partialFilterExpression: { passed: false } });

module.exports = mongoose.model('CertificationAttempt', certificationAttemptSchema);

// NOTE: 이 필드들은 실제 Skill 모델 파일에 추가되었는지 확인 필요
// 기존 Skill 모델에 아래 필드가 없으면 추가
certification: {
  type: Boolean,
  default: false
},
certificationProvider: String,  // 'insurance', 'financial' 등
validPeriod: Number,
renewable: Boolean

const express = require('express');
const router = express.Router();
const EducationCourse = require('../models/EducationCourse');
const CertificationAttempt = require('../models/CertificationAttempt');
const Skill = require('../models/Skill');
const UserSkill = require('../models/UserSkill'); // 기존 Skill Bank 모델 가정
const { jwtMiddleware, requireRole } = require('../middleware/auth');
const Notification = require('./models/Notification'); // 경로 수정

// ==================== 공개 API ====================

// 모든 활성 교육 과정 목록 (게스트도 볼 수 있음)
router.get('/courses', async (req, res) => {
  try {
    // TODO: Joi 또는 express-validator를 사용하여 req.query 유효성 검사 추가 고려
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
    // TODO: 프로덕션 환경을 위해 console.error 대신 상세 로깅 시스템(Winston, Pino 등) 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' }); // TODO: 사용자에게 더 구체적인 에러 메시지 제공 고려
  }
});

// 과정 상세 (게스트도 열람 가능, 교육 자료는 인증 필요 시 분리 가능)
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await EducationCourse.findById(req.params.id)
      .populate('skillGranted', 'name description')
      .populate('createdBy', 'username');
    if (!course) return res.status(404).json({ success: false, message: '과정을 찾을 수 없습니다.' });
    res.json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 console.error 대신 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' }); // TODO: 사용자에게 더 구체적인 에러 메시지 제공 고려
  }
});

// ==================== 인증 API ====================

// 시험 시작 (응시 세션 생성)
router.post('/courses/:id/start', jwtMiddleware, async (req, res) => {
  try {
    const course = await EducationCourse.findById(req.params.id);
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: '과정을 찾을 수 없습니다.' });
    }

    // 이미 합격한 적 있는지 확인
    const existingPassed = await CertificationAttempt.findOne({
      courseId: course._id,
      userId: req.user.id,
      passed: true
    });
    if (existingPassed && course.validPeriod > 0) {
      // 아직 유효한지 확인
      // TODO: validPeriod가 0인 경우 (영구 자격증)의 expiresAt 처리 로직 명확화
      if (existingPassed.expiresAt && existingPassed.expiresAt > new Date()) {
        return res.status(400).json({ success: false, message: '이미 자격증을 보유하고 있습니다.' });
      }
    }

    // 미완료/실패한 시도가 있으면 재사용? 여기서는 새로 생성
    // 기존 미완료 시도 삭제 (또는 상태 관리)
    // TODO: 사용자 경험을 위해 기존 미완료 시도를 '이어하기' 기능으로 제공하거나, 명시적인 '다시 시작' 액션 필요성 고려
    await CertificationAttempt.deleteMany({
      courseId: course._id,
      userId: req.user.id,
      completedAt: { $exists: false } // 아직 완료되지 않은 시도만 삭제
    });

    const attempt = new CertificationAttempt({
      courseId: course._id,
      userId: req.user.id,
      startedAt: new Date()
    });
    await attempt.save();

    // 시험 문제만 반환 (정답 제외)
    const examQuestions = course.exam.questions.map((q) => ({
      id: q._id, // TODO: question._id를 사용하도록 변경
      question: q.question,
      type: q.type,
      options: q.options || [],
      points: q.points,
      difficulty: q.difficulty, // NEW: AI 학습 데이터 활용을 위해 포함
      topics: q.topics,         // NEW: AI 학습 데이터 활용을 위해 포함
      learningObjectiveId: q.learningObjectiveId // NEW: AI 학습 데이터 활용을 위해 포함
    }));

    res.json({
      success: true,
      attemptId: attempt._id,
      timeLimit: course.exam.timeLimit,
      questions: examQuestions
    });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' }); // TODO: 사용자에게 더 구체적인 에러 메시지 제공 고려
  }
});

// 시험 제출 및 자동 채점
router.post('/attempts/:attemptId/submit', jwtMiddleware, async (req, res) => {
  // TODO: MongoDB 트랜잭션(session)을 사용하여 다중 DB 작업의 원자성(Atomicity) 보장 고려
  try {
    // TODO: Joi 또는 express-validator를 사용하여 req.body.answers 유효성 검사 강화 고려
    //       answers 배열 내에 questionId (ObjectId), answer, timeSpentSeconds, rawResponse, agentConfidence, partialScore 포함 검사
    const attempt = await CertificationAttempt.findById(req.params.attemptId);
    if (!attempt) return res.status(404).json({ success: false, message: '응시 기록이 없습니다.' });
    if (attempt.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    if (attempt.completedAt) {
      return res.status(400).json({ success: false, message: '이미 제출된 시험입니다.' });
    }

    const course = await EducationCourse.findById(attempt.courseId);
    if (!course) return res.status(404).json({ success: false, message: '과정을 찾을 수 없습니다.' });

    const { answers } = req.body; // [{ questionId: "...", answer: "...", timeSpentSeconds: ..., rawResponse: ..., agentConfidence: ..., partialScore: ... }]
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: '답안이 필요합니다.' });
    }

    // 채점
    let totalPoints = 0;
    let earnedPoints = 0;
    const gradedAnswers = [];

    for (let i = 0; i < course.exam.questions.length; i++) {
      const q = course.exam.questions[i];
      totalPoints += q.points || 1;

      // TODO: questionId를 question._id로 일치시켜 찾도록 변경
      const userAnswerObj = answers.find(a => a.questionId.toString() === q._id.toString());
      const userAnswer = userAnswerObj ? userAnswerObj.answer : '';

      let isCorrect = false;
      let pointsEarnedThisQuestion = 0;

      if (userAnswerObj && userAnswerObj.partialScore !== undefined) {
        // NEW: partialScore가 제공된 경우 이를 활용
        pointsEarnedThisQuestion = userAnswerObj.partialScore;
        isCorrect = pointsEarnedThisQuestion > 0; // 부분 점수가 있으면 일단 맞았다고 간주
      } else if (q.type === 'multiple-choice') {
        // 정답은 옵션 인덱스 문자열 또는 텍스트
        // TODO: `q.correctAnswerIndex` 사용하도록 로직 변경
        isCorrect = (userAnswer === q.correctAnswerIndex || userAnswer === q.correctAnswerText); // 호환성을 위해 두 필드 모두 확인 (마이그레이션 후 제거)
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
      } else if (q.type === 'text') {
        // 간단한 키워드 매칭 (공백 제거, 소문자)
        // TODO: `q.correctAnswerText` 사용하도록 로직 변경
        const normalizedUser = userAnswer.toString().trim().toLowerCase();
        const normalizedCorrect = q.correctAnswerText ? q.correctAnswerText.toString().trim().toLowerCase() : '';
        isCorrect = normalizedCorrect && normalizedUser.includes(normalizedCorrect);
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
        // TODO: text 타입 채점 로직을 더 정교하게(예: 유사도, 여러 키워드) 만들지 고려 (rawResponse 활용)
      } else if (q.type === 'boolean') {
        // TODO: `q.correctAnswerText` 사용하도록 로직 변경
        isCorrect = (userAnswer === q.correctAnswerText);
        pointsEarnedThisQuestion = isCorrect ? (q.points || 1) : 0;
      }

      earnedPoints += pointsEarnedThisQuestion;

      gradedAnswers.push({
        questionId: q._id, // TODO: question._id를 사용하는 경우, 여기에 해당 _id를 저장하도록 변경
        answer: userAnswer, // 에이전트가 제출한 답변
        isCorrect,
        pointsEarned: pointsEarnedThisQuestion,
        explanation: q.explanation, // NOTE: 사용자에게 정답과 함께 explanation을 제공하는 것은 학습에 도움이 됨
        timeSpentSeconds: userAnswerObj ? userAnswerObj.timeSpentSeconds : undefined, // NEW: AI 학습 데이터
        rawResponse: userAnswerObj ? userAnswerObj.rawResponse : undefined,       // NEW: AI 학습 데이터
        agentConfidence: userAnswerObj ? userAnswerObj.agentConfidence : undefined, // NEW: AI 학습 데이터
        partialScore: userAnswerObj ? userAnswerObj.partialScore : undefined        // NEW: AI 학습 데이터
      });
    }

    const score = (earnedPoints / totalPoints) * 100;
    const passed = score >= course.exam.passingScore;

    attempt.answers = answers.map(a => ({ // NEW: 응답에 AI 학습 데이터 필드 포함하여 저장
      questionId: a.questionId,
      answer: a.answer,
      timeSpentSeconds: a.timeSpentSeconds,
      rawResponse: a.rawResponse,
      agentConfidence: a.agentConfidence,
      partialScore: a.partialScore
    }));
    attempt.score = score;
    attempt.passed = passed;
    attempt.completedAt = new Date();

    if (passed) {
      // 자격증 발급
      const skill = await Skill.findById(course.skillGranted);
      if (!skill) {
        // TODO: 스킬을 찾을 수 없는 경우 500 에러 처리 대신 좀 더 명확한 메시지 또는 데이터 무결성 검사 필요
        return res.status(500).json({ success: false, message: '연결된 스킬을 찾을 수 없습니다.' });
      }

      // UserSkill 생성 (기존에 없으면)
      let userSkill = await UserSkill.findOne({ userId: req.user.id, skillId: skill._id });
      if (!userSkill) {
        userSkill = new UserSkill({
          userId: req.user.id,
          skillId: skill._id,
          level: 1,
          certified: true,
          certifiedAt: new Date(),
          // TODO: certificateNumber 생성 시 Date.now() 대신 UUID 또는 더 충돌 가능성이 낮은 방법 고려
          certificateNumber: `CERT-${Date.now()}-${req.user.id.slice(-4)}`,
          expiresAt: course.validPeriod ? new Date(Date.now() + course.validPeriod * 86400000) : null
        });
      } else {
        userSkill.certified = true;
        userSkill.certifiedAt = new Date();
        userSkill.certificateNumber = `CERT-${Date.now()}-${req.user.id.slice(-4)}`; // TODO: 위와 동일하게 고유성 보장 방법 고려
        if (course.validPeriod) userSkill.expiresAt = new Date(Date.now() + course.validPeriod * 86400000); // TODO: validPeriod=0 (영구) 처리 로직 명확화
      }
      await userSkill.save();

      attempt.certificateIssued = true;
      attempt.certificateNumber = userSkill.certificateNumber;
      attempt.expiresAt = userSkill.expiresAt;

      // 알림 생성
      await Notification.create({
        userId: req.user.id,
        type: 'system',
        title: '자격증 취득',
        message: `${course.title} 과정에 합격하여 ${skill.name} 자격증을 취득했습니다.`,
        link: `/skills/${skill._id}`
      });
    }

    await attempt.save();

    // 결과 반환
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
        timeSpentSeconds: g.timeSpentSeconds, // NEW: AI 학습 데이터 포함
        rawResponse: g.rawResponse,       // NEW: AI 학습 데이터 포함
        agentConfidence: g.agentConfidence, // NEW: AI 학습 데이터 포함
        partialScore: g.partialScore        // NEW: AI 학습 데이터 포함
      })),
      certificate: passed ? {
        number: attempt.certificateNumber,
        expiresAt: attempt.expiresAt
      } : null
    });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 내 자격증 목록
router.get('/my-certifications', jwtMiddleware, async (req, res) => {
  try {
    const userSkills = await UserSkill.find({ userId: req.user.id, certified: true })
      .populate('skillId')
      .sort('-certifiedAt');
    res.json({ success: true, data: userSkills });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 자격증 상세 (PDF 발급 링크 등)
router.get('/certificates/:certNumber', jwtMiddleware, async (req, res) => {
  try {
    const userSkill = await UserSkill.findOne({ certificateNumber: req.params.certNumber })
      .populate('skillId')
      .populate('userId', 'username email');
    if (!userSkill) return res.status(404).json({ success: false, message: '자격증을 찾을 수 없습니다.' });
    if (userSkill.userId._id.toString() !== req.user.id && req.user.role !== 'CEO') {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    // TODO: 여기서 PDF 생성 로직 또는 미리 생성된 URL 반환 로직 구현 (보안 및 성능 고려하여 서명된 URL 등 사용)
    res.json({ success: true, data: userSkill });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// NEW: 자가 학습을 위한 '자산관리' 모듈 목록 (인증된 사용자 대상)
router.get('/my-self-study-modules', jwtMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    // 사용자가 인증받은 스킬 목록을 가져옵니다.
    const userSkills = await UserSkill.find({ userId, certified: true }).select('skillId');
    const certifiedSkillIds = userSkills.map(us => us.skillId);

    // 해당 스킬을 부여하는 교육 과정 중 'finance' 카테고리 (자산관리)에 해당하는 과정을 찾습니다.
    const selfStudyCourses = await EducationCourse.find({
      skillGranted: { $in: certifiedSkillIds },
      category: 'finance', // '자산관리' 모듈에 해당하는 카테고리로 필터링
      isActive: true // 활성화된 과정만
    })
    .select('title description providerName category thumbnail skillGranted validPeriod')
    .populate('skillGranted', 'name');

    res.json({ success: true, data: selfStudyCourses });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// ==================== 관리자 API ====================

// 과정 생성 (CEO 또는 Core Team)
router.post('/courses', jwtMiddleware, requireRole(['CEO', 'Core Team']), async (req, res) => {
  try {
    // TODO: Joi 또는 express-validator를 사용하여 req.body 유효성 검사 강화 고려 (특히 materials, exam 구조)
    //       exam.questions 내에 _id, difficulty, topics, learningObjectiveId, correctAnswerIndex, correctAnswerText 포함 검사
    const { title, description, provider, providerName, category, materials, exam, skillGranted, validPeriod, thumbnail } = req.body;
    if (!title || !description || !skillGranted) {
      return res.status(400).json({ success: false, message: '필수 항목 누락' });
    }

    // TODO: exam.questions의 _id가 클라이언트에서 제공되지 않을 경우 Mongoose가 자동으로 생성하도록 처리 확인
    const course = new EducationCourse({
      title,
      description,
      provider: provider || 'internal',
      providerName,
      category,
      materials: materials || [],
      exam: exam || { passingScore: 70, questions: [] }, // TODO: exam.questions에 새로운 필드 기본값 설정 고려
      skillGranted,
      validPeriod: validPeriod || 365,
      thumbnail,
      createdBy: req.user.id
    });
    await course.save();
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    console.error(err);
    // TODO: 프로덕션 환경을 위해 상세 로깅 시스템 도입 고려
    res.status(500).json({ success: false, message: '서버 오류' });
  }
});

// 과정 수정, 삭제 등 (생략, 필요시 추가)

module.exports = router;

// NOTE: 이 라우터는 메인 Express 앱 파일에서 다음과 같이 사용될 것입니다.
const educationRoutes = require('./routes/education');
app.use('/api/education', educationRoutes);

/*
// 예시 Curl 명령어들 (API 테스트를 위한 정보)
// - CEO 토큰으로 과정 생성
curl -X POST http://localhost:5000/api/education/courses \
  -H "Authorization: Bearer {ceo_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "보험 판매 자격 과정",
    "description": "ABC보험사의 공식 교육 과정입니다. 시험 합격 시 보험 판매 라이선스가 발급됩니다.",
    "provider": "insurance",
    "providerName": "ABC보험",
    "category": "insurance",
    "exam": {
      "passingScore": 70,
      "timeLimit": 30,
      "questions": [
        {
          // _id는 Mongoose가 자동 생성. 클라이언트에서 보낼 필요 없음
          "question": "보험 계약 시 고지의무 위반 시 발생할 수 있는 결과는?",
          "type": "multiple-choice",
          "options": ["계약 취소", "보험금 삭감", "계약 유지", "모두 가능"],
          "correctAnswerIndex": 3, // `options` 배열의 인덱스 (0부터 시작)
          // "correctAnswerText": "", // 객관식에는 사용하지 않음
          "difficulty": "medium",
          "topics": ["보험계약", "의무위반"],
          // "learningObjectiveId": "{learning_objective_id}",
          "points": 2,
          "explanation": "고지의무 위반 시 보험 계약이 해지되거나 보험금 지급이 거절될 수 있습니다."
        },
        {
          // _id는 Mongoose가 자동 생성
          "question": "보험 상품 설명 시 반드시 포함해야 할 사항은?",
          "type": "text",
          // "correctAnswerIndex": null,
          "correctAnswerText": "약관", // 텍스트/불리언 타입에는 텍스트 정답
          "difficulty": "easy",
          "topics": ["상품설명", "의무사항"],
          // "learningObjectiveId": "{learning_objective_id}",
          "points": 2,
          "explanation": "보험 상품을 설명할 때는 약관의 주요 내용을 반드시 전달해야 합니다."
        }
      ]
    },
    "skillGranted": "{skill_id}",
    "validPeriod": 365,
    "thumbnail": "https://example.com/insurance-course.jpg"
  }'

  // - 일반 사용자로 시험 응시**

  // - `POST /api/education/courses/{course_id}/start` (JWT 필요)
  // - 제출: `POST /api/education/attempts/{attemptId}/submit` (답안 전송)
  //   예시 요청 바디:
  //   -H "Content-Type: application/json" \
  //   -d '{
  //     "answers": [
  //       {
  //         "questionId": "{question_id_1}",
  //         "answer": "3", // 또는 "약관"
  //         "timeSpentSeconds": 30,
  //         "rawResponse": "보험 약관의 핵심 내용을 상세히 설명해야 합니다.",
  //         "agentConfidence": 95,
  //         "partialScore": 2 // 채점 로직에서 계산 후 전송할 수도, 혹은 서버에서 계산할 수도 있음
  //       },
  //       {
  //         "questionId": "{question_id_2}",
  //         "answer": "약관",
  //         "timeSpentSeconds": 15,
  //         "rawResponse": "보험 약관을 설명해야 합니다.",
  //         "agentConfidence": 80
  //       }
  //     ]
  //   }'
// - **자격증 확인**

  // - `GET /api/education/my-certifications`
*/
