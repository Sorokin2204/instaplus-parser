var { Schema, model } = require('mongoose');
var Account = new Schema({
  dateCreated: {
    type: Date,
    required: true,
    default: Date.now,
  },
  status: {
    type: String,
    required: true,
    enum: ['pendingProcessing', 'processing', 'acceptNoSite', 'acceptBadSite', 'acceptTaplinkNoSite', 'acceptTaplinkWithSite','acceptTaplinkMultipage', 'deniedBadSite', 'deniedGoodSite' ,  'sent'],
  },
  login: {
    type: String,
    required: true,
    unique: true,
  },
  title: {
    type: String,
  },
  phone: {
    type: Number,
  },
  email: {
    type: String,
  },
  description: {
    type: String,
  },
  
  messengers: {
    whatsApp: [
      {
        type: String,
      },
    ],
    telegram: [
      {
        type: String,
      },
    ],
    viber: [
      {
        type: String,
      },
    ],
  },
  links: {
    instagramLink: {
      type: String,
    },
    tapLinkImage: 
      {type: String,}
    ,
    parsedLinks: [
      {
        type: String,
      },
    ],
    filterLinks: [
      {
        link: {
          type: String,
        },
        image: {
          type: String
        }
      },
    ],
    selectedLink: {
      type: String,
    },
  },
  Category: [
    {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Category',
    },
  ],
  File: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'File',
  },
});

module.exports = model('Account', Account);
