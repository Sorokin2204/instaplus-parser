const { Router } = require('express');
const router = Router();
const Account = require('../models/Account');
const Category = require('../models/Category');
const File = require('../models/File');
const BlackLink = require('../models/BlackLink');
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
const { setTimeout } = require('timers/promises');

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
    var accountQuantity = 30;
    /// Check file exist
    isOldFile = await File.exists({ excelFileName: req.file.originalname });

    if (isOldFile) {
      throw new Error('Такой файл уже существует');
    }
    sheetJson = sheetJson.slice(0, 30);
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

    var newFile = new File({
      _id: new Types.ObjectId(),
      excelFileName: req.file.originalname,
      excelFile: req.file.buffer,
      status: 'loading',
      accountsRepeating: accountsRepeating.map(
        (repeatAccount) => repeatAccount._id,
      ),
    });
await newFile.save();
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
                   newFile.status = 'active';
                   newFile.save().then(() =>{
                      io.to('exportRoom').emit('connection', '');
                     console.log('FINISH');
                   }).catch(() => {
                      console.log('ERRROR CHANGE STATUS FILE');
                   })

                 })
                 .catch((error) => {
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
        let accountsDeniedCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: { $regex: 'denied' },
        });
        let accountsPendingProcessingCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'pendingProcessing',
        });

        let accountsRepeatingCount = file.accountsRepeating.length;
        delete file.accountsRepeating;
        file.accountsAllCount = accountsAnalyzedCount + accountsRepeatingCount;
        file.accountsAnalyzedCount = accountsAnalyzedCount;
        file.accountsAcceptCount = accountsAcceptCount;
        file.accountsDeniedCount = accountsDeniedCount;
        file.accountsPendingProcessingCount = accountsPendingProcessingCount;
        file.accountsRepeatingCount = accountsRepeatingCount;
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
      await File.findByIdAndUpdate(req.params.id, { status: 'pendingSending' });
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
    

////1.CHECK COOKIE
// instagram.hasActiveSession().then((result) => {
//   if (result.isLoggedIn) {
//     console.log('TRY GET FROM COOKIE');
//      authenticatedUser = result.userInfo
//        //console.log(authenticatedUser);
//        let nickName = 'tais.iiakomarova963';
//          instagram
//            .searchUsers(nickName)
//            .then((users) => {
//              try {
//                 if (users.users.length != 0) {
//                   let userIndex = users.users.findIndex((user) => {
//                     return user.username === nickName;
//                   });
//                   if (userIndex != -1) {
//                     console.log('ACCOUNT FOUND ACCEPT!');
//                     let nickNamePK = [users.users[userIndex].pk];
//                     console.log(nickNamePK);
//                      instagram
//                        .sendNewChatMessage('Добрый день', nickNamePK)
//                        .then((chat) => {
//                          console.log('MESSAGE SEND ACCEPT! THIS CHAT :');
//                          console.log(chat);
//                              console.log('TRY GET CHAT THREAD');
//                          getChat(null, chat.thread_id)
//                            .then((thread) => {
//                              console.log('CHAT THREAD ACCEPT! THIS THREAD :');
//                              console.log(thread);
//                            })
//                            .catch((error) => {
//                              getErrorMsg('!!!ERROR GET CHAT: ', error);
//                            });;
//                        })
//                        .catch((error) => {
//                          ////ACCOUNT NOT FOUND OR WAS DELETE. SET STAUTS "NOT SENT"
//                          getErrorMsg('!!!ERROR SEND MESSAGE : ', error);
//                        });

//                   } else {
//                       console.log('NOT FOUND ACCOUNT');
//                     ////ACCOUNT NOT FOUND OR WAS DELETE. SET STAUTS "NOT SENT"
//                   }
//                 } else {
//                   console.log('NOT FOUND ACCOUNT');
//                   ////ACCOUNT NOT FOUND OR WAS DELETE. SET STAUTS "NOT SENT"
//                 }
//              } catch (error) {
//                   getErrorMsg('!!!ERROR SEARCH ACCEPT, BUT NOT SUCCESS : ', error);
//              }
//            })
//            .catch((error) => {
//              getErrorMsg('!!!ERROR SEARCH : ', error);
//            });
//     ////2.1 FIND USER AND SEND
//   } else  {
//     console.log('TRY LOGIN');
//     login('tati.anapavlova683', 'ODXBiKDw');
//     ////2.2 LOGIN
//   }

// });

   res.status(201).json({ message: 'Отправка начилась' });
   
  }
  catch(e) {
   res.status(500).json({ message: e.message });
  }

})





  const login = (username, password) => {
    instagram
      .login(username, password)
      .then((userInfo) => {
        console.log('LOGIN ACCEPT');
        authenticatedUser = userInfo;
        console.log(authenticatedUser);
      })
      .catch((error) => {
        if (instagram.isCheckpointError(error)) {
          getErrorMsg('!!!ERROR CHECK POINT : ', error);
        } else if (instagram.isTwoFactorError(error)) {
          getErrorMsg('!!!ERROR TWO FACTOR : ', error);
        } else {
          getErrorMsg('!!!ERROR OTHER : ', error);
        }
      });
  };

  const getErrorMsg = (errorText, error) => {
    return (
      errorText + (error.text || error.message || 'An unknown error occurred.')
    );
  };





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
