var { Schema, model } = require('mongoose');
var SenderAccount = new Schema({
  lastSentDate: {
    type: Date,
  },
  isWork: {
    type: Boolean,
    default: true,
  },
  login: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },

});

module.exports = model('SenderAccount', SenderAccount);
