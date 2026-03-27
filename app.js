const express = require('express');
const mongoose = require('mongoose');
const educationRoutes = require('./routes/education_routes'); // Corrected path

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json()); // For parsing application/json

// Database Connection
mongoose.connect('mongodb://localhost:27017/educationPlatform', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

// Routes
app.use('/api/education', educationRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('Education Platform API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
