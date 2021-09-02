var { Schema, model } = require('mongoose');
var BlackLink = new Schema({
  domainName: {
    type: String,
    required: true,
    unique: true,
  },
});
module.exports = model('BlackLink', BlackLink);
