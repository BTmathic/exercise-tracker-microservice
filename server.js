'use strict';

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const shortid = require('shortid');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
//app.use(bodyParser.json());

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

/*
// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});
*/

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});

// Initialize exercise database
const Schema = mongoose.Schema;
const TrackerProfileSchema = new Schema({
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    default: shortid.generate
  },
  exerciseLog: [
    {
      description: String,
      duration: Number,
      date: String,
    }
  ]
});
const TrackerUser = mongoose.model('ExerciseTrackerUser', TrackerProfileSchema);

let usernames;
TrackerUser.find({}, (error, results) => {
  if (error) {
    console.log(error);
  }
  usernames = results.map((user) => user.username);
});

// Database methods
let createAndSavePerson = (username) => {
  const newUser = new TrackerUser({
    username: username,
    exerciseLog: []
  });
  if (usernames.indexOf(username) === -1) {
    newUser.save((error, data) => {
      if (error) {
        console.log(error);
      } else {
        console.log('success', data);
      }
    });
    return newUser.userId;
  } else {
    return 0;
  }
}

let addExercise = (exercise, req, res) => {
  TrackerUser.findOne({userId: req.body.userId}, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      data.exerciseLog = data.exerciseLog.concat(exercise);
      data.save((error) => {
        if (error) {
          console.log(error);
        }
      });
      res.send({
        username: data.username,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date
      });
    }
  });
}

// User interaction
app.route('/api/exercise/new-user').post((req, res) => {
  const queryName = req.body.username;
  const userId = createAndSavePerson(queryName);
  if (userId === 0) {
    res.send('Error: username already taken');
  } else { 
    res.send({username: queryName, userId: userId});
  }
});

// Add exercise from user input
app.route('/api/exercise/add').post((req, res) => {
  const exerciseDate = new Date(req.body.date);
  const unixDate = parseInt(exerciseDate.getTime());
  const queryExercise = {
    description: req.body.description,
    duration: req.body.duration,
    date: unixDate
  };
  console.log(queryExercise);
  addExercise(queryExercise, req, res);
});

// Dislpay log API
app.route('/api/exercise/log').get((req, res) => {
  const userId = req.query.userId;
  const from = req.query.from;
  const to = req.query.to;
  const limit = req.query.limit;
  TrackerUser.findOne({userId: userId}, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      let filteredLog = data.exerciseLog.map((exercise) => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date
      }));
      if (!!from) {
        const fromDate = new Date(from);
        filteredLog = filteredLog.filter((exercise) => {
          const exerciseDate = new Date(exercise.date);
          return exerciseDate.getTime() >= fromDate.getTime();
        });
      }
      if (!!to) {
        const toDate = new Date(to);
        filteredLog = filteredLog.filter((exercise) => {
          const exerciseDate = new Date(exercise.date);
          return exerciseDate.getTime() <= toDate.getTime();
        });
      }
      if (!!limit) {
        filteredLog = filteredLog.slice(-limit);
      }
      res.send({
        userId: userId,
        username: data.username,
        from: from,
        to: to,
        count: filteredLog.length,
        log: filteredLog
      });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
