const { Router } = require('express');
const router = Router();
const Account = require('../models/Account');
const Category = require('../models/Category');
const File = require('../models/File');
const BlackLink = require('../models/BlackLink');
const SenderAccount = require('../models/SenderAccount');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const upload = multer();
const request = require('request');
const cheerio = require('cheerio');
const xlsx = require('xlsx');
const psl = require('psl');
const { Types } = require('mongoose');
const html2canvas = require('html2canvas');
const puppeteer = require('puppeteer');
const Pageres = require('pageres');
const jsdom = require('jsdom');
const filenamifyUrl = require('filenamify-url');
const { JSDOM } = jsdom;
const webp = require('webp-converter');
//const imagemin = require('imagemin');
const imagemin = require('imagemin');
const imageminWebp = require('imagemin-webp');
const sharp = require('sharp');
const instagram = require('../logic/instagram');
const utils = require('../logic/utils');
const { resolve } = require('path');
const nodemailer = require('nodemailer');
const ImapClient = require('emailjs-imap-client').default;
// const { setTimeout } = require('timers/promises');

// const shttps = require('socks-proxy-agent'); // you should install SOCKS5 client via: npm i socks-proxy-agent

// const { IgApiClient } = require('instagram-private-api');

const __appdir = path.dirname(require.main.filename);
const __uploadDir = __appdir + '\\client\\public\\uploads\\';

function excelToJson(buffer) {
  let workbook = xlsx.read(buffer);
  const wsname = workbook.SheetNames[0];
  const ws = workbook.Sheets[wsname];
  return xlsx.utils.sheet_to_json(ws);
}

////api/exports/add
router.post('/add', upload.single('excelFile'), async (req, res) => {
  try {
var io = req.app.get('socketio');

var numberAccount = 0; 
    // const black = new BlackLink({
    //   domainName: 'google.com',
    // });

    // await black.save();

    // const cat2 = new Category({
    //   name: 'Какой то лидер',
    //   keyWords: ['лидер', 'бизнес'],
    // });

    // await cat2.save();

    ///Convert form Excel file to JSON
    let sheetJson = excelToJson(req.file.buffer);
    //var accountQuantity = sheetJson.length;
    var accountQuantity = 40;
    /// Check file exist
    isOldFile = await File.exists({ excelFileName: req.file.originalname });

   
    sheetJson = sheetJson.slice(20, 60);
    ///Get all login from excel
    sheetAccounts = sheetJson.map((acc) => acc.Логин);

    /// Find repeating account
    const accountsRepeating = await Account.find({
      login: { $in: sheetAccounts },
    }).select('login');
    ///Remove repeating login
    if (accountsRepeating && accountsRepeating.length != 0) {
      sheetJson = sheetJson.filter((obj) => {
        return (
          accountsRepeating.findIndex((repeatAccount) => {
            return repeatAccount.login === obj['Логин'];
          }) < 0
        );
      });
    }

    if (sheetJson.length == 0) {
      throw new Error('Новых аккаунтов не найдено');
    }
 var newFile = {};
 if (isOldFile) {
   newFile = await File.findOne({ excelFileName: req.file.originalname });
  await File.findByIdAndUpdate(newFile._id, { status: 'loading' });
   //throw new Error('Такой файл уже существует');
 } else { 
   newFile = new File({
    _id: new Types.ObjectId(),
    excelFileName: req.file.originalname,
    excelFile: req.file.buffer,
    status: 'loading',
    accountsRepeating: accountsRepeating.map(
      (repeatAccount) => repeatAccount._id,
    ),
  });
  await newFile.save();
 }

   res.status(202).json({
     message: 'Обработка началась',
   });

   const startAccountAnalyze = async () => {
     /// Foreach all new account (without repeating)
     let categories = [];
     let newAccounts = [];
     var count = 0;
     Category.find({})
       .then((doc) => {
         categories = doc;
       })
       .then(async () => {
         const browser = await puppeteer.launch();

         Promise.allSettled(
           sheetJson.map((obj) => {
             return new Promise((resolve, reject) => {
               // sheetJson.forEach((obj) => {
               // Object.entries(obj).forEach(([key, value]) => {});
               let newAccount = new Account({
                 login: obj['Логин'],
                 title: obj['Имя аккаунта'],
                 phone: obj['Телефон'].replace('+', ''),
                 email: obj['Email'],
                 description: obj['Описание аккаунта'],
                 messengers: {
                   whatsApp: [],
                   telegram: [],
                   viber: [],
                 },
                 message:'',
                 links: {
                   instagramLink: obj['Активная ссылка'],
                   parsedLinks: [],
                   filterLinks: [],
                   selectedLink: '',
                   tapLinkImage: '',
                 },
                 Category: [],
                 File: newFile._id,
               });

               ///Scaping instagram URL - get messangers and list sites
               if (newAccount.links.instagramLink) {
                 if (newAccount.links.instagramLink.includes('taplink.cc')) {
                   grabpage(browser, newAccount.links.instagramLink)
                     .then((fileName) => {
                       newAccount.links.tapLinkImage = fileName;
                     })
                     .then(() => {
                       let promise = scrapingUrl(newAccount);
                       promise
                         .then(() => {
                           filterUrl(browser, newAccount)
                             .then(() => {
                               resolve(newAccount);
                             })
                             .catch(() => {
                               resolve(newAccount);
                               console.log(
                                 '\x1b[31m%s\x1b[0m',
                                 'PROMISE ALL ERROR',
                               );
                             });
                         })
                         .catch((reason) => {
                           resolve(newAccount);
                           console.log(
                             '\x1b[31m%s\x1b[0m',
                             'TAPLINK ANALYZE ERROR - ' +
                               reason +
                               '\n' +
                               'LINK - ' +
                               newAccount.links.instagramLink,
                           );
                         });
                     });
                 } else if (
                   newAccount.links.instagramLink.includes('wa.me/') ||
                   newAccount.links.instagramLink.includes('whatsapp.com/')
                 ) {
                   newAccount.messengers.whatsApp.push(
                     newAccount.links.instagramLink,
                   );
                   resolve(newAccount);
                 } else if (newAccount.links.instagramLink.includes('t.me/')) {
                   newAccount.messengers.telegram.push(
                     newAccount.links.instagramLink,
                   );
                   resolve(newAccount);
                 } else if (
                   !newAccount.links.instagramLink.includes('facebook') &&
                   !newAccount.links.instagramLink.includes('youtu.be') &&
                   !newAccount.links.instagramLink.includes('youtube')
                 ) {
                   newAccount.links.selectedLink =
                     newAccount.links.instagramLink;
                   grabpage(browser, newAccount.links.instagramLink).then(
                     (fileName) => {
                       newAccount.links.filterLinks.push({
                         link: newAccount.links.instagramLink,
                         image: fileName,
                       });
                       resolve(newAccount);
                     },
                   );
                 } else {
                   resolve(newAccount);
                 }
               } else {
                 resolve(newAccount);
               }

               /// Find category
               if (newAccount.description) {
                 for (cat of categories) {
                   var isKeyWordExist = false;
                   if (cat.keyWords.length != 0) {
                     cat.keyWords.forEach((word) => {
                       if (
                         newAccount.description.toLowerCase().includes(word)
                       ) {
                         isKeyWordExist = true;
                       }
                     });
                     //// AND OPERATION
                     //  regWord = cat.keyWords
                     //    .map((word) => (word = `(?=[\\s\\S]*${word})`))
                     //    .join('');
                     //  regWord += '[\\s\\S]*$';

                     if (isKeyWordExist) {
                       newAccount.Category.push(cat._id);
                     }
                   }
                 }
               }
               newAccounts.push(newAccount);
               ///Check instagram PHONE on messengers  - get messegmers
               // if (newAccount.phone && (!newAccount.messengers.telegram || !newAccount.messengers.whatsApp)) {
               //WhatsApp ALI CHECK NUMBER
               //Telegram ALI CHECK NUMBER
               //Viber ALI CHECK NUMBER
               // }
               ///Check instagram DESCRIPTION on messengers - get messegmers
               // if (
               //   newAccount.description &&
               //   (!newAccount.messengers.telegram || !newAccount.messengers.whatsApp)
               // ) {
               //GET NUMBERS FORM TEXT
               //Check each number
               //WhatsApp ALI CHECK NUMBER
               //Telegram ALI CHECK NUMBER
               //Viber ALI CHECK NUMBER
               // }
             }).then((account) => {
               if (account.links.filterLinks.length == 0) {
                 account.status = 'acceptNoSite';
               } else {
                 account.status = 'pendingProcessing';
               }
               numberAccount++;
               console.log(`Осталось: ${numberAccount}/${accountQuantity}`);
               
               io.to('exportRoom').emit('connection', `Осталось: ${numberAccount}/${accountQuantity}`);
             });
           }),
         )
           .then(() => {
             browser.close().then(() => {
               // console.log('FINISH');
               // res.status(201).json({
               //   message: 'Файл добавлен',
               // });
               firstPendingAccountIndex = newAccounts.findIndex((el) => {
                 return el.status == 'pendingProcessing';
               });

               if (firstPendingAccountIndex != -1)
                 newAccounts[firstPendingAccountIndex].status = 'processing';
               

               Promise.all([
                 Account.insertMany(newAccounts),
               ])
                 .then(() => {
                   if(isOldFile) {
File.findByIdAndUpdate(newFile._id, { status: 'active' })
  .then(() => {
    io.to('exportRoom').emit('connection', '');
    console.log('FINISH');
  })
  .catch(() => {
    console.log('ERRROR CHANGE STATUS FILE');
  });;
                   } else {
 newFile.status = 'active';
 newFile
   .save()
   .then(() => {
     io.to('exportRoom').emit('connection', '');
     console.log('FINISH');
   })
   .catch(() => {
     console.log('ERRROR CHANGE STATUS FILE');
   });
                   }
                 })
                 .catch((error) => {


   if (isOldFile) {
     File.findByIdAndUpdate(newFile._id, { status: 'errorLoading' })
       .then(() => {
         io.to('exportRoom').emit('connection', '');
         console.log('FINISH');
       })
       .catch(() => {
         console.log('ERRROR CHANGE STATUS FILE');
       });
   } else {
     newFile.status = 'errorLoading';
     newFile
       .save()
       .then(() => {
         io.to('exportRoom').emit('connection', '');
         console.log('FINISH');
       })
       .catch(() => {
         console.log('ERRROR CHANGE STATUS FILE');
       });
   }
                   // res.status(500).json({
                   //   message:  error.message || 'Что-то пошло не так, попробуйте снова',
                   // });
                   console.log('ERROR FINISH');
                 });
             });
           })
           .catch((error) => {
             console.log('ERROR FOREACH ACCOUNT - ' + error.message);
             // res.status(500).json({
             //   message: error.message || 'Что-то пошло не так, попробуйте снова',
             // });
           });
       });
   }
   startAccountAnalyze();
  } catch (error) {
    console.log('ERROR ADD EXPORT - ' +  error.message );
    // res.status(500).json({
    //   message:|| 'Что-то пошло не так, попробуйте снова',
    // });
  }
});

////api/exports/list
router.get('/list', async (req, res) => {
  try {
    let files = await File.find({})
      .select('dateCreated excelFileName status accountsRepeating')
      .lean();
    const filesTable = await Promise.all(
      files.map(async (file) => {
        let accountsAnalyzedCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
        });
        let accountsAcceptCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: {$regex: 'accept'} ,
        });

       
        let accountsAcceptNoSite = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'acceptNoSite',
        });
        let accountsAcceptBadSite = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'acceptBadSite',
        });
        let accountsAcceptTaplinkNoSite = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'acceptTaplinkNoSite',
        });
        let accountsAcceptTaplinkWithSite = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'acceptTaplinkWithSite',
        });
        let accountsAcceptTaplinkMultipage = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'acceptTaplinkMultipage',
        });

        let accountsDeniedCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: { $regex: 'denied' },
        });
        let accountsPendingProcessingCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'pendingProcessing',
        });
        let accountsSent = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'successfullySent',
        });

        let accountsRepeatingCount = file.accountsRepeating.length;
        delete file.accountsRepeating;
        file.accountsAllCount = accountsAnalyzedCount + accountsRepeatingCount;
        file.accountsAnalyzedCount = accountsAnalyzedCount;
        file.accountsAcceptCount = accountsAcceptCount;
        file.accountsAcceptNoSite = accountsAcceptNoSite;
        file.accountsAcceptBadSite = accountsAcceptBadSite;
        file.accountsAcceptTaplinkNoSite = accountsAcceptTaplinkNoSite;
        file.accountsAcceptTaplinkWithSite = accountsAcceptTaplinkWithSite;
        file.accountsAcceptTaplinkMultipage = accountsAcceptTaplinkMultipage;
        file.accountsDeniedCount = accountsDeniedCount;
        file.accountsPendingProcessingCount = accountsPendingProcessingCount;
        file.accountsRepeatingCount = accountsRepeatingCount;
        file.accountsSent = accountsSent;
        return file;
      }),
    );

    res.json(filesTable);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка: ' + e.message });
  }
});

////api/exports/:id
router.get('/:id', async (req, res) => {
  try {

    const currentAccount = await findNextPendingAccount(req.params.id);
    if (currentAccount) {
      currentAccount.links.domainFilterLinks =
        currentAccount.links.filterLinks.map((filterLink) => {
          var parsed = psl.parse(extractHostname(filterLink.link));
          return (
            (parsed.subdomain ? parsed.subdomain + '.' : '') + parsed.domain
          );
        });
      res.json({
        currentAccount: currentAccount,
      
      });
    } else {
      if (
        !(await Account.exists({
          File: req.params.id,
          status: 'pendingProcessing',
        })) 
      ) {
await File.findByIdAndUpdate(req.params.id, {
  status: 'pendingSending',
});
      }
        
      res.json({
        message: 'Все аккаунты просмотренны',
        currentAccount: currentAccount,
      });
    }
  } catch (e) {
    res.status(500).json({ message: e.message + 'line : ' + e.lineNumber });
  }
});
////api/exports/:id
router.post('/:id', async (req, res) => {
  try {
    let { currentAccount, blackDomains } = req.body;
   delete currentAccount.links.domainFilterLinks;
 currentAccount.links.filterLinks = currentAccount.links.filterLinks.filter(
   (filterLink) => {
     if (filterLink.link == currentAccount.links.selectedLink) {
       return true;
     } else {
if (filterLink.image && fs.existsSync(__uploadDir + filterLink.image)) {
  fs.unlinkSync(__uploadDir + filterLink.image);
}

       return false;
     }
   },
 );
   
 
    // ///Update account
     await Account.findByIdAndUpdate(currentAccount._id, currentAccount);
    // ///Add non-selected links form "filterLinks" domains in blacklist
    if (blackDomains.length != 0) {
      blackDomains = blackDomains.map((domain) => {
        return {
          domainName: domain,
        };
      });
      await BlackLink.insertMany(blackDomains);
    }
    res.status(201).json({
      message: 'Аккаунт обработан',
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

let authenticatedUser;
router.get('/send/:id', async (req,res) => {
  try {
     res.status(201).json({ message: 'Отправка началась' });
 // generateAccountMessage(req.params.id);

startSend(req.params.id);
  //  var smtpTransport = nodemailer.createTransport({
  //    service: 'Mail.ru',
  //    auth: {
  //      user: 'wacxiv8qc@mail.ru',
  //      pass: '3G07pzxtDdW',
  //    },
  //  });
  //  smtpTransport.verify(function (error, success) {
  //    if (error) {
  //      console.log(error);
  //    } else {
  //      console.log('Server is ready to take our messages');
  //    }
  //  });

 
  }
  catch(e) {
    console.log('ERROR SENDER ACCOUNT - ' + e.message);
   res.status(500).json({ message: e.message });
  }

})

function getCodeFromMail(email,password, prevCount = null) { 
  return new Promise((resolve,reject) => {
    try {
      const client = new ImapClient('imap.mail.ru', 993, {
        logLevel: 1000,
        auth: {
          user: email,
          pass: password,
        },
      });
      // client.connect().then(() => {
      //   console.log('connected');
      //   client.selectMailbox('INBOX').then((inbox) => {
      //     currCount = inbox.exists;
      //     console.log('# messages: ' + currCount);
      //           client.close().then(() => {
      //             setTimeout(() => {
      //                   resolve();
      //                   if(prevCount && prevCount != currCount) {
      //                     console.log('NEW MESSAGE');
      //                   } else {
      //                   getCodeFromMail(email, password, currCount); 
      //                   }
      //             }, 1000);
              
      //           });
      //   });
      // });

// getAllMessagesFromMail(client).then(() => {
      client.close().then(() => {
       // resolve();
      });
// });

client.connect().then(() => {
  console.log('Mail connected');
  client.selectMailbox('INBOX').then((inbox) => {
    numberEmails = inbox.exists;
    console.log('Now messages: ' + numberEmails);
  });
});

client.onupdate = function (path, type, value) {
  var allCodes = [];
  // console.log("Update: path: "+path+", type: "+type+", value: "+value);
  if (type === 'expunge') {
    console.log('expunge');
       client.listMessages('inbox', value, ['body[]']).then((messages) => {
         for (const message of messages) {
           const messageBody = message['body[]'];
           var code = messageBody.match('<font size=3D"6">(.*?)</font>');
         
                client.close().then(() => {
                   if (code) {
                     resolve(code[1]);
                   } else {
                     resolve();
                   }
                });
         }
       });
  } else if (type === 'exists') {
       console.log('exists');
    client.listMessages('inbox', value, ['body[]']).then((messages) => {
 for (const message of messages) {
   const messageBody = message['body[]'];
   var code = messageBody.match('<font size=3D"6">(.*?)</font>');
 client.close().then(() => {
   if (code) {
     resolve(code[1]);
   } else {
     resolve();
   }
 });
   
 }
    });
  } else if (type === 'fetch') {
  }
};
client.onclosemailbox = function (path) {
  console.log('Closed: ' + path);
};
      // Handling imap mail error
      client.onerror = (err) => {
        throw new Error(`Error IMAP handling: ${err}`);
      };

      // client.connect().then(() => {
      //   console.log('Mail connection open');
      //   // client.onupdate = function (path, type, value) {
      //   //   if (type === 'expunge') {
      //   //     console.log('expunge- ' + value);
      //   //     // untagged EXPUNGE response, e.g. "* EXPUNGE 123"
      //   //     // value is the sequence number of the deleted message prior to deletion, so adapt your cache accordingly
      //   //   } else if (type === 'exists') {
      //   //             console.log('exists- ' + value);
      //   //     // untagged EXISTS response, e.g. "* EXISTS 123"
      //   //     // value is new EXISTS message count in the selected mailbox
      //   //   } else if (type === 'fetch') {
      //   //             console.log('fetch- ' + value);
      //   //     // untagged FETCH response, e.g. "* 123 FETCH (FLAGS (\Seen))"
      //   //     // add a considerable amount of input tolerance here!
      //   //     // probably some flag updates, a message or messages have been altered in some way
      //   //     // UID is probably not listed, probably includes only the sequence number `#` and `flags` array
      //   //   }
         
      //   // };
      //   getAllMessagesFromMail(client);
      //     // client.close().then(() => {
      //     //   console.log('Mail connection close');
      //     //   resolve();
      //     // });
      //   // client.onselectmailbox = function (path, mailbox) {
      //   //   console.log('Opened %s with %s messages', path, mailbox.exists);
      //   //   client.close().then(() => {
      //   //     console.log('Mail connection close');
      //   //     resolve();
      //   //   });
      //   // };
      //   // getAllMessagesFromMail(client).then(() => {

      //   // });
      // });

      // // Getting messages on mail
      // const listMessages = await 

      // for (const message of listMessages) {
      //   const messageDate = new Date(message.envelope.date);
      //   const messageSubject = message.envelope.subject;
      //   const messageBody = message['body[]'];

      //   //console.log(messageBody);
      //   let deg = messageBody.match('<font size=3D"6">(.*?)</font>');
      //   console.log(deg ? deg[1] : '');
      // }

      // Close mail connection
      
    } catch (error) {
      reject(error)
    }
  })
}

function getAllMessagesFromMail(client) {
 return new Promise ((resolve,reject) => {
   client.listMessages('INBOX', '1:*', ['body[]']).then((listMessages) => {
     console.log(`NOW  ${listMessages.length} MESSAGES`);
     resolve();
    //  let allCodes = [];
    //  for (const message of listMessages) {
    //    //  const messageDate = new Date(message.envelope.date);
    //    //  const messageSubject = message.envelope.subject;
    //    const messageBody = message['body[]'];
    //    //console.log(messageBody);
    //    let code = messageBody.match('<font size=3D"6">(.*?)</font>');
    //    if (code) {
    //      allCodes.push(code[1]);
    //    }
    //  }
   });
 })
}


router.post('/sender-accounts/add', async (req, res) => {
  try {
    const { listSenderAccounts } = req.body;
 let arrSenderAccounts = listSenderAccounts.split('\n').map((acc) => {
   let splitAcc = acc.split(':');
   return { login: splitAcc[0] , password: splitAcc[1]}
 });
 console.log(arrSenderAccounts);

 await SenderAccount.insertMany(arrSenderAccounts).then(() => {

    res.status(201).json({ message: 'Добавленны аккаунты оправители' });
 }).catch((e) => {
    console.log('ERROR ADD SENDER ACCOUNTS - ' + e.message);
    res.status(500).json({ message: e.message });
 });

  } catch (e) {
    console.log('ERROR ADD SENDER ACCOUNTS - ' + e.message);
    res.status(500).json({ message: e.message });
  }
});

router.post('/sender-accounts/reset/:id', async (req, res) => {
  try {
    SenderAccount.findByIdAndUpdate(req.params.id, {
      isWork: true,
      $unset: { lastSentDate: "" },
    })
      .then(() => {
        res.status(201).json({ message: 'Авторег активирован' });
      })
      .catch((e) => {
        console.log('ERROR ACTIVE SENDER ACCOUNTS - ' + e.message);
        res.status(500).json({ message: e.message });
      });
  } catch (e) {
    console.log('ERROR ACTIVE SENDER ACCOUNTS - ' + e.message);
    res.status(500).json({ message: e.message });
  }
});


router.get('/sender-accounts/list', async (req, res) => {
  try {
    await SenderAccount.find({})
      .then((senderAccounts) => {
        res
          .status(201)
          .json({
            message: 'Добавленны аккаунты оправители',
            senderAccounts: senderAccounts,
          });
      })
      .catch((e) => {
        console.log('ERROR ADD SENDER ACCOUNTS - ' + e.message);
        res.status(500).json({ message: e.message });
      });
  } catch (e) {
    console.log('ERROR GET SENDER ACCOUNTS - ' + e.message);
    res.status(500).json({ message: e.message });
  }
});


function getSortedAccounts(accounts) {
  let accountsSorted = [];

  let accountsAcceptNoSite = accounts
    .filter((acc) => {
      if (acc.status === 'acceptNoSite') return acc;
    })
    .slice(0, 3);
  let accountsAcceptacceptBadSite = accounts
    .filter((acc) => {
      if (acc.status === 'acceptBadSite') return acc;
    })
    .slice(0, 3);
  let accountsAcceptTaplinkNoSite = accounts
    .filter((acc) => {
      if (acc.status === 'acceptTaplinkNoSite') return acc;
    })
    .slice(0, 3);
  let accountsAcceptTaplinkWithSite = accounts
    .filter((acc) => {
      if (acc.status === 'acceptTaplinkWithSite') return acc;
    })
    .slice(0, 3);
  let accountsAcceptTaplinkMultipage = accounts
    .filter((acc) => {
      if (acc.status === 'acceptTaplinkMultipage') return acc;
    })
    .slice(0, 3);
  for (let i = 0; i < 3; i++) {
    if (accountsAcceptNoSite.length != 0 && accountsAcceptNoSite[i]) {
      accountsSorted.push(accountsAcceptNoSite[i]);
    }
    if (
      accountsAcceptacceptBadSite.length != 0 &&
      accountsAcceptacceptBadSite[i]
    )
      accountsSorted.push(accountsAcceptacceptBadSite[i]);
    if (
      accountsAcceptTaplinkNoSite.length != 0 &&
      accountsAcceptTaplinkNoSite[i]
    )
      accountsSorted.push(accountsAcceptTaplinkNoSite[i]);
    if (
      accountsAcceptTaplinkWithSite.length != 0 &&
      accountsAcceptTaplinkWithSite[i]
    )
      accountsSorted.push(accountsAcceptTaplinkWithSite[i]);
    if (
      accountsAcceptTaplinkMultipage.length != 0 &&
      accountsAcceptTaplinkMultipage[i]
    )
      accountsSorted.push(accountsAcceptTaplinkMultipage[i]);
  }
  return accountsSorted;
}


function convertToWebp() {
  const folder = 'D:/laleli_backup/.vscode/wp-content/uploads/2021/09';
  const uploadFolder = 'D:/laleli_backup/.vscode/wp-content/uploads-webp/2021/09';

  fs.readdirSync(folder).forEach((file) => {
    let filePath = path.extname(file);
    if (filePath === '.jpeg' || filePath === '.png' || filePath === '.jpg') {
  sharp(folder + '/' + file)
    .toFormat('webp')
    .toFile(uploadFolder + '/' + file + '.webp');
    }
      // console.log(filePath);
  });
}

function randomIntFromInterval(min, max) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// function startSend (accounts) {
//   //1.CHECK COOKIE
//   instagram
//     .hasActiveSession()
//     .then((result) => {
//       if (result.isLoggedIn) {
//         console.log('TRY GET FROM COOKIE');
//         authenticatedUser = result.userInfo;
//         if (authenticatedUser) console.log('LOGIN FROM COOKIE ACCEPT')
//          var currentTime = 0;
//              accounts.map((account) => {
//               //  let timeRand = randomIntFromInterval(18, 21);
//               //  currentTime += +(timeRand.toString() + '00000');
//                let timeRand = 400;
//                currentTime += timeRand;
//                setTimeout(function () {
//                  findAndSend(account.login, account.message);
//                }, currentTime);
//              });
//         ////2.1 FIND USER AND SEND
//       } else {
//         console.log('TRY LOGIN');
//         login('tati.anapavlova683', 'danila22009644', accounts);
//         ////2.2 LOGIN
//       }
//     })
//     .catch((error) => {
//       getErrorMsg('!!!ERROR ACTIVE SESSION : ', error);
//     });
// }

function startSend(FileId) {
  ////Ищем 15 сообщений
    Account.find({
      File: FileId,
      status: { $regex: 'accept' },
    })
      .select('_id login message status')
      .limit(15)
      .then((accounts) => {
        if (accounts.length != 0) {
          ////Если нашло больше 0,то ищем авторег
        //  var OneDay = new Date().getTime() + 1 * 24 * 60 * 60 * 1000;
        SenderAccount.findOne({
          isWork: true,
          $or: [
            { lastSentDate: { $exists: false } },
            // { lastSentDate: { $gte: OneDay } },
          ],
        }).then((senderAccount) => {
          if (senderAccount) {
            ////Нашел активные авторег
            try {
               sending(senderAccount, accounts)
                 .then(() => {
                   instagram
                     .logout()
                     .then(() => {
                         console.log('LOGOUT ACCEPT');
                       startSend(FileId);
                     })
                     .catch(() => {
                       console.log('ERROR LOGOUT');
                     });
                 })
                 .catch(() => {
                   console.log('ERROR SEND MESSAGE WITH AUTOREG');
                   instagram.logout().then(() => {
                     console.log('LOGOUT ACCEPT');
                   });
                 });
            } catch (error) {
               instagram.logout().then(() => {
                 console.log('LOGOUT ACCEPT');
               });
            }
          } else {
            console.log('SENDER ACCOUNTS EMPTY');
            ///Авторегов валидных нет
          }
        });
        } else {
           console.log('ACCEPTED ACCOUNTS EMPTY');
          ///Иначе все сообщения отправлены
        }
        // let accountsSorted = getSortedAccounts(accounts);
      })
      .catch(() => {
        console.log('ERROR GET ACCEPTED ACCOUNTS');
      });
}

function sending(senderAccount, accounts) {
return new Promise((resolve,reject) => {
  try {
      // instagram
      //   .hasActiveSession()
      //   .then((result) => {
      //     if (result.isLoggedIn) {
      //       console.log('TRY GET FROM COOKIE');
      //       authenticatedUser = result.userInfo;
      //       if (authenticatedUser) console.log('LOGIN FROM COOKIE ACCEPT')
            
      //     } else {
            console.log('TRY LOGIN');
            login(senderAccount.login, senderAccount.password)
              .then(() => {
                new Promise(function (resolve) {
                  setTimeout(resolve, 3000);
                }).then(() => {
                  ////Если успешно вошли, ищем и отправляем сообщения
                  processSend(accounts)
                    .then(() => {
                      ////Если прошелся по всем аккаунтам и инстаграм не заблокировал ПОИСК и ОТПРАВКУ
                      setStatusSenderAccount(senderAccount.login, true)
                        .then(() => {
                          console.log('SENDER ACCOUNT CHANGE STATUS ACCEPT');
                          resolve();
                        })
                        .catch((e) => {
                          reject();
                          console.log(
                            'ERROR CHANGE SENDER ACCOUNT - ' + e.message,
                          );
                        });
                    })
                    .catch(() => {
                      ///Если инстаграм забанил аккаунт при поиские или отправке
                      ///Если не смогли войти, помечаем аккаунт неактивным
                      setStatusSenderAccount(senderAccount.login, false)
                        .then(() => {
                          console.log('SENDER ACCOUNT CHANGE STATUS ACCEPT');
                          resolve();
                        })
                        .catch((e) => {
                          reject();
                          console.log(
                            'ERROR CHANGE SENDER ACCOUNT - ' + e.message,
                          );
                        });
                    });
                });
              })
              .catch(() => {
                ///Если не смогли войти, помечаем аккаунт неактивным
                setStatusSenderAccount(senderAccount.login, false)
                  .then(() => {
                    console.log('SENDER ACCOUNT CHANGE STATUS ACCEPT');
                    resolve();
                  })
                  .catch((e) => {
                    reject();
                    console.log('ERROR CHANGE SENDER ACCOUNT - ' + e.message);
                  });
              });
        //   }
        // })
        // .catch((error) => {
        //   getErrorMsg('!!!ERROR ACTIVE SESSION : ', error);
        // });

  } catch (error) {
    reject();
  }
})
}



function processSend(array) {
  return array.reduce(function (p, item) {
    return p.then(function () {
      return findAndSend(item.login, item.message);
    });
  }, Promise.resolve());
}





function  findAndSend(login,message) {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      instagram
        .searchUsers(login)
        .then((users) => {
          try {
            if (users.users.length != 0) {
              let userIndex = users.users.findIndex((user) => {
                return user.username === login;
              });
              if (userIndex != -1) {
                console.log('ACCOUNT FOUND ACCEPT!');
                let nickNamePK = [users.users[userIndex].pk];
                instagram
                  .sendNewChatMessage(message, nickNamePK)
                  .then((chat) => {
                    console.log('MESSAGE SEND ACCEPT');
                    setStatusAccount(login, 'successfullySent')
                      .then(() => {
                        resolve();
                      })
                      .catch(() => {
                        resolve();
                      });
                  })
                  .catch((error) => {
                    reject();
                    setStatusAccount(login);
                    getErrorMsg('!!!ERROR SEND MESSAGE : ', error);
                  });
              } else {
                resolve();
                setStatusAccount(login);

                console.log('NOT FOUND ACCOUNT');
              }
            } else {
              resolve();
              setStatusAccount(login);
              console.log('NOT FOUND ACCOUNT');
            }
          } catch (error) {
            reject();
            getErrorMsg(
              '!!!ERROR SEARCH ACCEPT, BUT NOT MATCH : ',
              error.message,
            );
          }
        })
        .catch((error) => {
          reject();
          getErrorMsg('!!!ERROR SEARCH : ', error);
        });
    }, 500);
  })
}


function setStatusAccount(login, status = 'failedSent') {
 return new Promise((resolve,reject) => {
 Account.findOneAndUpdate({ login: login }, { status: status })
   .then(() => {
     console.log('STATUS ACCOUNT CHANGE !');
     resolve();
   })
   .catch((error) => {
     console.log('!!!ERROR STATUS CHANGE ! - ' + error.message);
     reject();
   });
 })
}

function setStatusSenderAccount (login,isWork) {
return SenderAccount.findOneAndUpdate({login: login }, {
  isWork: isWork,
  lastSentDate: new Date(),
});
}

  const login = (username, password) => {
    return new Promise((resolve,reject) => {
 instagram
   .login(
     username,
     password,
     '213.232.117.229',
     30010,
     'daniil_sorokin_228_g',
     '66c0bc2ca5',
   )
   .then((userInfo) => {
     console.log('LOGIN ACCEPT');
     authenticatedUser = userInfo;
     resolve(userInfo);
   })
   .catch((error) => {
     if (instagram.isCheckpointError(error)) {
        getErrorMsg('!!!ERROR LOGIN CHECKPOINT : ', error);

console.log('CHECKPOINT  - ' + JSON.stringify(instagram.getInfoCheckpoint())); 
//console.log('CHALLENGE   - ' + JSON.stringify(instagram.getChallengeCheckpoint())); 
instagram.sendCodeToMail().then(() => {
  console.log('CODE SEND TO MAIL');
 getCodeFromMail('wacxiv8qc@mail.ru', '3G07pzxtDdW').then((code) => {
   if(code) {
     instagram.sendSecurityCode(code).then(() => {
         console.log('SECURITY CODE ACCEPT. TRY LOGIN');
         login(username, password).then(() => {
          console.log('LOGIN REPEAT ACCEPT'); 
          resolve();
         }).catch(() => {
           console.log('!!! ERROR LOGIN REPEAT. EXIT');
           reject();
         })
     }).catch(() => {
          console.log('!!! ERROR PASS CODE WRONG');
          reject();
     })
console.log('GET CODES - ' + code);
   } else {
       console.log('MESSAGE DONT FOUND INSTAGRAM CODE');
         reject();
   }
   
 }).catch(() => {
    console.log('!!! ERROR LOGIN IN EMAIL - ' + error);
  
 });
}).catch((error) => {
  console.log('!!! ERROR SEND CODE - ' + error);
  reject();
})
//  instagram
//    .startCheckpoint()
//    .then((challenge) => {
//      console.log('CHALLANGE - ' + challenge.step_name);
//      console.log(
//        'CHECKPOINT  - ' + JSON.stringify(instagram.getInfoCheckpoint()),
//      ); 
//      //challenge.sendSecurityCode(data.code).then(resolve).catch(reject);
//      //console.log('CHECKPOINT ACCEPT. NOW TRY LOGIN');
//      //getErrorMsg('!!!ERROR RESOLVE CHECKPOINT : ', error);
//    })
//    .catch((error) => {
//      getErrorMsg('!!!ERROR RESOLVE AUTO CHECKPOINT : ', error);
//    });
       
     } else if (instagram.isTwoFactorError(error)) {
       getErrorMsg('!!!ERROR LOGIN TWO FACTOR : ', error);
       reject();
     } else {
       getErrorMsg('!!!ERROR LOGIN OTHER : ', error);
       reject();
     }
   });
    })
   
  };

  const getErrorMsg = (errorText, error) => {
   console.log(
     errorText + (error.text || error.message || 'An unknown error occurred.'),
   );
      };



  async function generateAccountMessage(fileId) {
     const accounts = await Account.find({
       File: fileId,
       status: { $regex: 'accept' },
     }).select('_id status Category');

  // let categories = accounts.map(account => account.Category);

  //    let categoriesWithGoodSite = await Account.find({
  //      Category: { $in: categories },
  //      status: 'deniedGoodSite',
  //    }).select('links.selectedLink');
  //let accountWithGoodSite = await Account.find({Category: {$in: acc.Category[0]  } ,status: 'deniedGoodSite'});


 return Promise.allSettled(
   accounts.map((acc) => {
     return new Promise((resolve, reject) => {
       try {
  //let isValidLinks = messageLinks !== '' && messageLinks.split('\n').length > 1;
  let newMessage = getMessage(acc.status, '', false);
  Account.findByIdAndUpdate(acc._id,{ message : newMessage}).then(() => {
    resolve();
  })
       } catch (error) {
         console.log('ERROR GENERATE MESSAGE - ' + error.message);
         reject();
       }
     });
   }),
 );

    
  }


function getMessage(status, messageLinks,isValidLinks) {
  let preMessageLink = '';
  let message = '';
  switch (status) {
    case 'acceptNoSite':
      {
        preMessageLink = isValidLinks
          ? `Например, у них:\n${messageLinks}`
          : '';
        message = `Здравствуйте, я случайно нашел ваш аккаунт и заметил, что у вас нет сайта. 
Если у вас только один инстаграм для рекламы своих услуг, то вы теряете львиную долю клиентов, которые заходят в первую очередь в поисковик и ищут нужные им услуги там.
В вашей сфере большая конкуренция, особенно когда у каждого есть свой собственный сайт и соц.сети.
После просмотра инстаграм, я как ваш клиент, задал себе следующий вопрос: “А где ваш сайт на котором можно посмотреть расценки, отзывы и т.д”.
Клиенту будет проще закрыть ваш аккаунт и зайти к вашим конкурентам, чем спрашивать у вас в директе, то что можно найти на сайте, где будет современный дизайн, видео-отзывы и калькулятор цен.${preMessageLink}
Даже сайты с плохим дизайном, вызывают недоверие, а его отсутствие и подавно. 
Я создаю сайты “под ключ” для бизнеса подобно вашему и если у вас появиться желание создать сайт, вот мой инстаграм @anton_webdesigner_`;
      }
      break;
    case 'acceptBadSite':
      {
        preMessageLink = isValidLinks
          ? `Вот несколько сайтов ваших конкурентов, для наглядности:\n${messageLinks}`
          : '';
        message = `Здравствуйте, мне случайно попался ваш аккаунт и я нашел на вашем сайте проблемы из-за которых вы, теряете большую часть клиентов.
 Самая популярная ошибка, которые многие недооценивают - это дизайн, многие думают, что “хоть какой-нибудь сайт лучше, чем вообще ничего”, но с учетом высокой конкуренции в этой отрасли на сегодняшний день, такое мышление ошибочное.
 Как показывает моя практика, человек на подсознательном уровне выбирает “по обложке” - сайты с хорошим дизайном на 70% имеют больше конверсии.${preMessageLink}
 Кроме того, я заметил, на сайте и другие недочеты, которые в сочетании с плохим дизайном, со стороны клиента, на корню убивают доверие.
 Я занимаюсь разработкой сайтов “под ключ” для бизнеса подобно вашему и если у вас возникнет желание исправить ситуацию, вот мой инстаграм @anton_webdesigner_`;
      }
      break;
    case 'acceptTaplinkNoSite':
      {
        preMessageLink = isValidLinks
          ? `,особенно если сравнивать с сайтами ваших конкурентов:\n${messageLinks}`
          : '.';
        message = `Здравствуйте, я посмотрел ваш профиль и хотел бы поделиться своим мнением со стороны клиента.
После просмотра хорошо заполненного профиля, я зашел на таплинк и доверие сразу улетучилось.
Возможно я ошибаюсь, но в сочетании с грамотно заполненным инстаграмом, каких то пару ссылок в таплинке выглядит несерьезно${preMessageLink}
Не знаю есть ли у вас еще каналы продвижения кроме инстаграмма, но имея сайт, можно продвигаться самым популярным способом - через поисковик. Наличие собственного сайта, ставит вас выше как специалиста, в глазах клиента, среди тех у кого его нет - их клиенты сразу отсеивает.
Я занимаюсь разработкой сайтов “под ключ” для бизнеса подобно вашему и если у вас возникнет желание создать качественный сайт, вот мой инстаграм @anton_webdesigner_`;
      }
      break;
    case 'acceptTaplinkWithSite':
      {
        preMessageLink = isValidLinks
          ? `Я подумал возможно так у всех в вашей сфере, но мои сомнения развеялись когда я зашел на сайты ваших конкурентов:\n${messageLinks}`
          : '';
        message = `Здравствуйте, я наткнулся на ваш профиль и обнаружил ошибки из-за, которых вы не дополучаете клиентов.
Я поставил себя на место вашего клиента, просмотрел ваш профиль, зашел на таплинк и обнаружил кучу ссылок, в том числе сайт с устаревшим дизайном.
В этом всем было сложно разобраться и это не вызвало доверие, у меня как у клиента.${preMessageLink}
И кончено качество услуг в вашей сфере на первом месте, но клиент в первую очередь выбирает“по обложке”, и как клиент я бы сначала ознакомился с услугами ваших конкурентов, на сайте с приятным дизайном, видео-отзывами, калькулятором цен, где легко разобраться и который вызывает доверие.
Увы это психология человека.
Я занимаюсь редизайном сайтов “под ключ” для бизнеса подобно вашему и если у вас возникнет желание исправить ситуацию, вот мой инстаграм @anton_webdesigner_
`;
      }
      break;
    case 'acceptTaplinkMultipage':
      {
        preMessageLink = isValidLinks
          ? `Вот только несколько из них:\n${messageLinks}`
          : '.';
        message = `Здравствуйте, я зашел на ваш таплинк и хотел бы поделиться своим мнением, как специалиста в сфере создания сайтов.
Одна из главных ошибок - отсутствие индивидуального дизайна - человек который зайдет не вернется к вам снова, потому-что он ничем не отличается от сотен таких же шаблонных таплинков. 
Такое решение не серьезно в ваше сфере, особенно с такой конкуренцией, где почти у каждого есть свой сайт.
Большая часть людей, наверно также как и вы, ищут услуги в первую очередь в поисковике, где и попадают на сайты ваших конкурентов.${preMessageLink}
Но у вас есть и преимущество - уже есть контент для сайта. Это хорошая основа для полноценного лендинга, который можно будет продвигать в поисковой выдачи и соц.сетях.
Я занимаюсь созданием сайтов “под ключ” для бизнеса подобно вашему и если у вас возникнет желание создать свой сайт, вот мой инстаграм @anton_webdesigner_`;
      }
      break;
    default:
      break;
  }

  return message;
}

async function findNextPendingAccount(idFile) {
let processingAccount = await Account.findOne({
  File: idFile,
  status: 'processing',
}).lean();
if(processingAccount) {
return processingAccount;
} 
 else {
  var nextAccount = await Account.findOne({
    File: idFile,
    status: 'pendingProcessing',
  }).lean();

  if (nextAccount) {
    nextAccount.links.filterLinks = await findUrlInBlackList(nextAccount);
    if (nextAccount.links.filterLinks != 0) {
      nextAccount.status = 'processing';
      await Account.findByIdAndUpdate(nextAccount._id, nextAccount);
      return nextAccount;
    } else {
      nextAccount.status = 'acceptNoSite';
      await Account.findByIdAndUpdate(nextAccount._id, nextAccount);
      findNextPendingAccount(idFile);
    }
  } else {
    return '';
  }
 }

}

function findUrlInBlackList(account) {
  let newFilterLinks = [];
  return Promise.allSettled(
    account.links.filterLinks.map((filterLink, i) => {
      return new Promise((resolve, reject) => {
        try {
          let domain = psl.get(extractHostname(filterLink.link));
          BlackLink.exists({ domainName: domain }).then((isBlackLink) => {
            if (isBlackLink ) {
              if ( filterLink.image && fs.existsSync(__uploadDir + filterLink.image)) {
                fs.unlinkSync(__uploadDir + filterLink.image);
              }
            } else {
              newFilterLinks.push(filterLink);
            }
            resolve();
          });
        } catch (error) {
          reject();
        }
      });
    }),
  ).then(() => {
    return newFilterLinks;
  });
}

function scrapingUrl(newAccount) {
  return new Promise((resolve, reject) => {
    request(newAccount.links.instagramLink, (error, response, html) => {
      if (!error && response.statusCode == 200) {
        try {
          var $ = cheerio.load(html);
          let links = [];

          links = $('script')
            .get()[0]
            .children[0].data.match(
              /(\b(https?|http|viber):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
            );
          if (links) {
            if (links.length != 0) {
              links = links.filter(
                (item, index) => links.indexOf(item) === index,
              );
              newAccount.links.parsedLinks = links;
              resolve();
            } else {
              reject();
            }
          } else {
            reject();
          }
        } catch (error) {
          console.log('ERROR :' + error.message);
          reject();
        }
      } else {
        console.log(
          `REQUEST ERROR : ${error} - STATUS : ${response.statusCode}`,
        );
        reject();
      }
    });
  });
}

function filterUrl(browser, newAccount) {
  var allPromis = Promise.allSettled(
    newAccount.links.parsedLinks.map((url) => {
      return new Promise((resolve, reject) => {
        try {
          if (url.includes('t.me')) {
            newAccount.messengers.telegram.push(url);
            //  console.log('\x1b[31m%s\x1b[0m', url + '');
            resolve();
          } else if (url.includes('wa.me/') || url.includes('whatsapp.com/')) {
            newAccount.messengers.whatsApp.push(url);
            // console.log('\x1b[31m%s\x1b[0m', url + '');
            resolve();
          } else if (url.includes('viber:')) {
            newAccount.messengers.viber.push(url);
            //   console.log('\x1b[31m%s\x1b[0m', url + '');
            resolve();
          } else {
            domain = psl.get(extractHostname(url));
            BlackLink.exists({ domainName: domain }).then((isBlackLink) => {
              //console.log(isBlackLink);
              if (isBlackLink) {
                //   console.log('\x1b[34m%s\x1b[0m', url);
                resolve();
              } else {
                grabpage(browser, url).then((fileName) => {
                  newAccount.links.filterLinks.push({
                    link: url,
                    image: fileName,
                  });
                  resolve();
                });
              }
            });
          }
        } catch (error) {
          reject();
          console.log('\x1b[31m%s\x1b[0m', 'PROMISE INNER ');
        }
        var index = 0;
      });
    }),
  );
  return allPromis;
}

async function grabpage(browser, url) {
  try {
     const fileName = filenamifyUrl(url);
  const pathFile = __uploadDir + fileName;
  if (
    !fs.existsSync(pathFile + '.jpeg') &&
    !fs.existsSync(pathFile + '.webp')
  ) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1240 , height: 1024 });
    await page.setDefaultNavigationTimeout(0);
    await page.goto(url);

    let height = await page.evaluate(
      () => document.documentElement.offsetHeight,
    );
    await autoScroll(page);

    await page.screenshot({
      type: 'jpeg',
      path: pathFile + '.jpeg',
      fullPage: true,
      quality: 80,
   
    });
    await page.close();
    if (height > 16380) {
      return fileName + '.jpeg ';
    } else {
      await sharp(pathFile + '.jpeg')
        .toFormat('webp')
        .toFile(pathFile + '.webp');
      fs.unlinkSync(pathFile + '.jpeg');
      return fileName + '.webp';
    }
  } else {
    if (fs.existsSync(pathFile + '.webp')) {
      return fileName + '.webp';
    } else {
      return fileName + '.jpeg';
    }
  }
   
  } catch (error) {
       console.log('\x1b[31m%s\x1b[0m', 'SAVE IMAGE ERROR: ' + error.message);
       console.log('\x1b[31m%s\x1b[0m', 'IMAGE: ' + fileName);
      console.log('\x1b[31m%s\x1b[0m', 'URL: ' + url);
    return '';
  }
 
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve, reject) => {
      var totalHeight = 0;
      var distance = 100;
      var timer = setInterval(() => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}


function extractHostname(url) {
  var hostname;
  //find & remove protocol (http, ftp, etc.) and get hostname

  if (url.indexOf('//') > -1) {
    hostname = url.split('/')[2];
  } else {
    hostname = url.split('/')[0];
  }

  //find & remove port number
  hostname = hostname.split(':')[0];
  //find & remove "?"
  hostname = hostname.split('?')[0];

  return hostname;
}

const iterate = (links, obj) => {
  if (obj) {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] == 'string' && obj[key].indexOf('http') > -1)
        links.push(obj[key]);

      if (typeof obj[key] === 'object') {
        iterate(links, obj[key]);
      }
    });
  }
};

////INSTAGRAM



module.exports = router;
