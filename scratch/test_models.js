const mongoose = require('mongoose');
try {
  require('./models/user');
  require('./models/subject');
  require('./models/question');
  require('./models/note');
  require('./models/playlist');
  console.log("All models loaded successfully!");
} catch (err) {
  console.error("Error loading models:", err);
}
