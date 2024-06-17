const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



// Configuration de MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Définition des schémas
const userSchema = new mongoose.Schema({
  username: String
});

const exerciseSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: Date,
  userId: String
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Middleware pour parser les données JSON entrantes
app.use(bodyParser.urlencoded({ extended: false }));

// Gestionnaire de route pour la racine
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Créer un nouvel utilisateur
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const user = new User({ username });
  await user.save();
  res.json({ username: user.username, _id: user._id });
});

// Obtenir la liste des utilisateurs
app.get('/api/users', async (req, res) => {
  const users = await User.find({}).select('username _id');
  res.json(users);
});

// Ajouter un exercice pour un utilisateur
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  const exerciseDate = date ? new Date(date) : new Date();

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const exercise = new Exercise({
    description,
    duration,
    date: exerciseDate,
    userId: _id
  });

  await exercise.save();

  res.json({
    _id: user._id,
    username: user.username,
    date: exerciseDate.toDateString(),
    duration: exercise.duration,
    description: exercise.description
  });
});

// Obtenir le journal d'exercices d'un utilisateur
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const user = await User.findById(_id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const query = { userId: _id };
  if (from) query.date = { $gte: new Date(from) };
  if (to) query.date = { ...query.date, $lte: new Date(to) };

  const exercises = await Exercise.find(query)
    .select('description duration date')
    .limit(limit ? parseInt(limit) : 0)
    .sort({ date: 'asc' });

  const log = exercises.map(exercise => ({
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date.toDateString()
  }));

  res.json({
    _id: user._id,
    username: user.username,
    count: exercises.length,
    log
  });
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});