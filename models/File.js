var {Schema,model} = require('mongoose');
var File = new Schema({
  dateCreated: {
    type: Date,
    required: true,
    default: Date.now,
  },
  excelFileName: {
    type: String,
  },
  excelFile: {
    type: Buffer,
  },
  status: {
    type: String,
    enum: ['loading', 'active', 'pendingSending', 'sending ', 'complete'],
  },
  accountsPeinding: [
    {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Account',
    },
  ],
  accountsRepeating: [
    {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Account',
    },
  ],
});
module.exports = model('File',File);