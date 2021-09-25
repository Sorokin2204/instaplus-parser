var { Schema, model } = require('mongoose');
var Proxy = new Schema({
  lastActiveDate: {
    type: Date,
  },
  expirationDate: {
    type: Date,
    required: true,
  },
  host: {
    type: String,
    required: true,
    unique: true,
  },
  port: {
    type: Number,
    required: true,
  },
  login: {
    type: String,
  },
  password: {
    type: String,
  },
  numberUnknownErrors: {
    type: Number,
    default: 0,
  },
  error: {
      type: String,
  },
  status: {
    type: String,
    enum: ['work', 'unknown_error', 'other_error', 'not_paid'],
  },
});
module.exports = model('Proxy', Proxy);
