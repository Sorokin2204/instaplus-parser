var { Schema, model } = require('mongoose');
var Category = new Schema({
  name: {
    type: String,
  },
  keyWords: [
    {
      type: String,
    },
  ],
  Account: [
    {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Account',
    },
  ],
});
module.exports = model('Category', Category);
