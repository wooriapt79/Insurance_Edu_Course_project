const mongoose = require('mongoose');
const Skill = require('./models/Skill');
const EducationCourse = require('./models/EducationCourse');
const User = require('./models/User');
const UserSkill = require('./models/UserSkill');

const MONGODB_URI = 'mongodb://localhost:27017/educationPlatform';

async function seedData() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB connected for seeding data.');

  try {
    // 1. Create a Skill in the 'finance' category
    let financeSkill = await Skill.findOne({ name: 'Financial Analysis' });
    if (!financeSkill) {
      financeSkill = new Skill({
        name: 'Financial Analysis',
        description: 'Ability to analyze financial statements and make investment decisions.',
        category: 'finance',
        certification: true,
        validPeriod: 365,
        renewable: true,
      });
      await financeSkill.save();
      console.log('Created Skill: Financial Analysis');
    }

    // 2. Create an EducationCourse linked to that Skill and in 'finance' category
    let financeCourse = await EducationCourse.findOne({ title: 'Advanced Financial Modeling' });
    if (!financeCourse) {
      // Find the test user created by generate_token.js
      const testUser = await User.findOne({ email: 'testuser@example.com' });
      if (!testUser) {
        console.error('Test user not found. Please run generate_token.js first.');
        return;
      }

      financeCourse = new EducationCourse({
        title: 'Advanced Financial Modeling',
        description: 'Comprehensive course on building financial models.',
        provider: 'financial',
        providerName: 'Global Finance Academy',
        category: 'finance',
        materials: [],
        exam: { passingScore: 80, questions: [] }, // Empty questions for simplicity
        skillGranted: financeSkill._id,
        validPeriod: 365,
        createdBy: testUser._id,
        isActive: true
      });
      await financeCourse.save();
      console.log('Created EducationCourse: Advanced Financial Modeling');
    }

    // 3. Certify the testagent user for that Skill
    const testUser = await User.findOne({ email: 'testuser@example.com' });
    if (!testUser) {
      console.error('Test user not found. Cannot certify skill.');
      return;
    }

    let userSkill = await UserSkill.findOne({ userId: testUser._id, skillId: financeSkill._id });
    if (!userSkill) {
      userSkill = new UserSkill({
        userId: testUser._id,
        skillId: financeSkill._id,
        level: 1,
        certified: true,
        certifiedAt: new Date(),
        certificateNumber: `CERT-${Date.now()}-${testUser._id.toString().slice(-4)}`,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      });
      await userSkill.save();
      console.log(`Certified user ${testUser.username} for skill ${financeSkill.name}`);
    } else if (!userSkill.certified) {
        userSkill.certified = true;
        userSkill.certifiedAt = new Date();
        userSkill.certificateNumber = `CERT-${Date.now()}-${testUser._id.toString().slice(-4)}`;
        userSkill.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        await userSkill.save();
        console.log(`Updated certification for user ${testUser.username} for skill ${financeSkill.name}`);
    } else {
      console.log(`User ${testUser.username} already certified for skill ${financeSkill.name}`);
    }

  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected from seeding process.');
  }
}

seedData().catch(console.error);
