const mongoose = require('mongoose');
const { generateToken } = require('./middleware/auth');
const User = require('./models/User'); // User 모델 임포트

// Use the same JWT_SECRET as in auth.js for consistency
process.env.JWT_SECRET = 'your_jwt_secret_key';

const MONGODB_URI = 'mongodb://localhost:27017/educationPlatform';

async function createTokenAndUser() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB connected for token generation.');

  let testUser = await User.findOne({ email: 'testuser@example.com' });

  if (!testUser) {
    testUser = new User({
      username: 'testagent',
      email: 'testuser@example.com',
      password: 'testpassword', // In a real app, this would be hashed
      role: 'user'
    });
    await testUser.save();
    console.log('Test user created: ' + testUser.username);
  } else {
    console.log('Using existing test user: ' + testUser.username);
  }

  const token = generateToken(testUser);
  console.log('\nGenerated JWT Token for testagent:');
  console.log(token);

  await mongoose.disconnect();
  console.log('MongoDB disconnected.');
}

createTokenAndUser().catch(err => {
  console.error('Error generating token:', err);
  mongoose.disconnect();
});
