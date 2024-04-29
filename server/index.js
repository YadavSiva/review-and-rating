const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Report = require('./model/reportmodel');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb+srv://sivaramsynergyuniversal123:sivaram@cluster0.rjsb5om.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then((req, res) => {
    console.log("db connected")
  })

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});




const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating: { type: Number, required: true },
  comment: { type: String, required: true },
  userName: {type:String}
});

const Review = mongoose.model('Review', reviewSchema);

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, 'your_secret_key', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/api/review', async (req, res) => {
  const productReview = await Review.find().populate('userId', 'firstName lastName');
  try {
    res.status(200).json(
      productReview
    )
  } catch (err) {
    res.status(500).json({
      status: 'Failed',
      message: err
    })
  }
})
app.post('/api/reviews',authenticateToken, async (req, res) => {
  try {
    const {  rating, comment } = req.body;
    const userId = req.user.userId; // Get user ID from authenticated request

    // Find the user by ID to get the name
    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }
    const newReview = new Review({ userId, rating, comment,userName: `${user.firstName} ${user.lastName}`, });
    await newReview.save();
    res.status(201).json(newReview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/get-username', authenticateToken, async (req, res) => {
  try {
      const userId = req.user.userId; // Get user ID from authenticated request

      // Find the user by ID
      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ error: 'User not found.' });
      }

      // Send the username in the response
      res.status(200).json({ username: user.firstName });
  } catch (error) {
      console.error('Error fetching username:', error);
      res.status(500).json({ error: 'Failed to fetch username.' });
  }
});
app.put('/api/review/:id', async (req, res) => {
  const updatedreview = await Review.findByIdAndUpdate(req.params.id, req.body);
  try {
    res.status(200).json(updatedreview)
  } catch (err) {
    console.log(err)
  }
})

// Update a review



app.delete('/api/review/:id', async (req, res) => {
  await Review.findByIdAndDelete(req.params.id)

  try {
    res.status(204).json({
      status:'sucess'
    });
  } catch (err) {
    res.status(500).json({
      status: 'Failed',
      message: err
    })
  }
})

app.post('/api/review/report/:id', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    // Create a new report
    const report = new Report({
      reviewId: id,
      reason
    });
    await report.save();
    res.status(200).json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ error: 'An error occurred while reporting the review' });
  }
});

// User model
const User = mongoose.model('User', {
  firstName: String,
  lastName: String,
  email: String,
  password: String,
});

app.use(bodyParser.json());

// Register endpoint
app.post('/register', async (req, res) => {
  try {
    const { firstName,lastName, email, password } = req.body;
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({firstName ,lastName, email, password: hashedPassword });
    await user.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    res.status(500).send('Error registering user');
  }
});

// Login route
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (passwordMatch) {
      const token = jwt.sign({ userId: user._id }, 'your_secret_key');

      res.status(200).json({ token, username: user.firstName });
    } else {
      res.status(401).json({ error: 'Incorrect password.' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed.' });
  }
});


app.get('/get-average-rating', async (req, res) => {
  try {
      // Fetch all ratings from the database
      const ratings = await Review.find({}, 'rating');

      // Calculate the average rating
      const totalRating = ratings.reduce((acc, curr) => acc + curr.rating, 0);
      const averageRating = totalRating / ratings.length;

      res.status(200).json({ averageRating, totalReviews: ratings.length });
  } catch (error) {
      console.error('Error getting average rating:', error);
      res.status(500).json({ error: 'Failed to get average rating.' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
