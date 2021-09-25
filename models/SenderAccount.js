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
  email: {
    type: String,
  },
  emailPassword: {
    type: String,
  },
  countSent: {
    type: Number,
    default: 0,
  },
  proxyHost: {
    type: String,
  },
  errorStatus: {
    type: String,
  }
});

module.exports = model('SenderAccount', SenderAccount);
