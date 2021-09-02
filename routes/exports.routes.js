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
    /// Check file exist
    isOldFile = await File.exists({ excelFileName: req.file.originalname });

    if (isOldFile) {
      throw new Error('Такой файл уже существует');
    }
    sheetJson = sheetJson.slice(0, 15);
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
      status: 'active',
      accountsRepeating: accountsRepeating.map(
        (repeatAccount) => repeatAccount._id,
      ),
    });

    /// Foreach all new account (without repeating)
    let categories = [];
    let newAccounts = [];
    var count = 0;
    Category.find({})
      .then((doc) => {
        categories = doc;
      })
      .then(async () => {
        const browser = await puppeteer.launch({
          args: ['--window-size=1920,1080'],
        });
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
                isGoodSite: false,
                links: {
                  instagramLink: obj['Активная ссылка'],
                  parsedLinks: [],
                  filterLinks: [],
                  imageFilterLinks: [],
                  selectedLink: '',
                },
                Category: [],
                File: newFile._id,
              });
              ///Scaping instagram URL - get messangers and list sites
              if (newAccount.links.instagramLink) {
                if (newAccount.links.instagramLink.includes('taplink.cc')) {
                  let promise = scrapingUrl(newAccount);
                  promise
                    .then(() => {
                      filterUrl(browser, newAccount)
                        .then(() => {
                          if (newAccount.links.filterLinks.length == 0) {
                            newAccount.status = 'accept';
                          } else {
                            newAccount.status = 'pendingProcessing';
                          }
                          resolve();
                       
                        })
                        .catch(() => {
                          reject();
                          console.log('\x1b[31m%s\x1b[0m', 'PROMISE ALL ERROR');
                        });
                    })
                    .catch((reason) => {
                      reject();
                      console.log(
                        '\x1b[31m%s\x1b[0m',
                        'PROMISE ERROR - ' + newAccount.links.instagramLink,
                      );
                    });
                } else if (
                  newAccount.links.instagramLink.includes('wa.me/') ||
                  newAccount.links.instagramLink.includes('whatsapp.com/')
                ) {
                  newAccount.messengers.whatsApp.push(
                    newAccount.links.instagramLink,
                  );
                  resolve();
                } else if (newAccount.links.instagramLink.includes('t.me/')) {
                  newAccount.messengers.telegram.push(
                    newAccount.links.instagramLink,
                  );
                  resolve();
                } else if (
                  !newAccount.links.instagramLink.includes('facebook') &&
                  !newAccount.links.instagramLink.includes('youtu.be') &&
                  !newAccount.links.instagramLink.includes('youtube')
                ) {
                  newAccount.links.selectedLink =
                    newAccount.links.instagramLink;
                  newAccount.links.filterLinks.push(
                    newAccount.links.instagramLink,
                  );
                    grabpage(browser, newAccount.links.instagramLink).then(
                      (fileName) => {
                        newAccount.links.imageFilterLinks.push(fileName);
                        resolve();
                      },
                    );
                  resolve();
                } else {
                  resolve();
                }
              } else {
                resolve();
              }

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

              /// Find category
              if (newAccount.description) {
                for (cat of categories) {
                  regWord = cat.keyWords
                    .map((word) => (word = `(?=[\\s\\S]*${word})`))
                    .join('');
                  regWord += '[\\s\\S]*$';
                  //console.log(regWord);
                  if (newAccount.description.toLowerCase().match(regWord)) {
                    newAccount.Category.push(cat._id);
                    // console.log('\x1b[32m%s\x1b[0m', 'REGEX FIND ! - ' + cat.name);
                    // console.log(newAccount.description.toLowerCase());
                  } else {
                  }
                }
              }

              if (newAccount.links.filterLinks.length == 0) {
                newAccount.status = 'accept';
              } else {
                newAccount.status = 'pendingProcessing';
              }
              newAccounts.push(newAccount);
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
                newFile.save(),
                Account.insertMany(newAccounts),
              ])
                .then(() => {
                  res.status(201).json({
                    message: 'Файл добавлен',
                    accounts: newAccounts,
                  });
                  console.log('FINISH');
                })
                .catch(() => {
                  res.status(500).json({
                    message:
                      error.message || 'Что-то пошло не так, попробуйте снова',
                  });
                  console.log('ERROR FINISH');
                });
            });
          })
          .catch((error) => {
            res.status(500).json({
              message: error.message || 'Что-то пошло не так, попробуйте снова',
            });
            console.log('ERROR FINISH');
          });
      });
  } catch (error) {
    res.status(500).json({
      message: error.message || 'Что-то пошло не так, попробуйте снова',
    });
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
          status: 'accept',
        });
        let accountsDeniedCount = await Account.countDocuments({
          File: Types.ObjectId(file._id),
          status: 'denied',
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

function millisToMinutesAndSeconds(millis) {
  var minutes = Math.floor(millis / 60000);
  var seconds = ((millis % 60000) / 1000).toFixed(0);
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

router.get('/:id', async (req, res) => {
  try {
    const currentAccount = await findNextPendingAccount(req.params.id);

    if (currentAccount) {
//  await imagemin(['yes-nail.ru.png'], {
//    destination: 'image',
//  })
//    .then((obj) => {
//      console.log('../client/public/uploads/');
//    })
//    .catch(() => {
//      console.log('not CONVERT');
//    });

// await imagemin([__appdir + '/client/public/uploads/*.{jpg,png}'], {
//   destination: __appdir + '/client/public/uploads/',
//   plugins: [
//     imageminWebp({
//       quality: 75,
    
//     }),
//   ],
// }).then(() => {path
//   console.log('FILKj');
// });

      //       var t0 = performance.now();
      //currentAccount.links.imgFilterLinks = await createScreenShotUrl(currentAccount.links.filterLinks);
      // var t1 = performance.now();
      // console.log(
      //   'Call to doSomething took ' +
      //     millisToMinutesAndSeconds(t1 - t0) +
      //     ' sec.',
      // );

      currentAccount.links.domainFilterLinks =
        currentAccount.links.filterLinks.map((link) => {
          var parsed = psl.parse(extractHostname(link));
          return (
            (parsed.subdomain ? parsed.subdomain + '.' : '') + parsed.domain
          );
        });
      const allCategories = await Category.find({});

      res.json({
        currentAccount: currentAccount,
        allCategories: allCategories,
      });
    } else {
      res.json({ message: 'Все аккаунты просмотренны' });
    }
  } catch (e) {
    res.status(500).json({ message: e.message + 'line : ' + e.lineNumber });
  }
});

router.post('/:id', async (req, res) => {
  try {
    let { currentAccount, blackDomains } = req.body;
    ///Remove domains form object
    delete currentAccount.links.domainFilterLinks;
    currentAccount.links.filterLinks = [currentAccount.links.selectedLink];
    ///Update account
    await Account.findByIdAndUpdate(currentAccount._id, currentAccount);
    ///Add non-selected links form "filterLinks" domains in blacklist
    if (blackDomains.length != 0) {
      blackDomains = blackDomains.map((domain) => {
        return {
          domainName: domain,
        };
      });
      await BlackLink.insertMany(blackDomains);
    }
    ///Find next account
    await Account.findOneAndUpdate(
      {
        File: currentAccount.File,
        status: 'pendingProcessing',
      },
      { status: 'processing' },
    );
    res.status(201).json({
      message: 'Обработан',
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

async function findNextPendingAccount(idFile) {
  var nextAccount = await Account.findOne({
    File: idFile,
    status: 'processing',
  }).lean();

  if (nextAccount) {
    nextAccount.links.filterLinks = await findUrlInBlackList(nextAccount,
      nextAccount.links.filterLinks,
    );
    if (nextAccount.links.filterLinks != 0) {
      await Account.findByIdAndUpdate(nextAccount._id, nextAccount);
      return nextAccount;
    } else {
      nextAccount.status = 'accept';
      await Account.findByIdAndUpdate(nextAccount._id, nextAccount);
      findNextPendingAccount(idFile);
    }
  } else {
    return '';
  }
}

function findUrlInBlackList(account,urls) {
  let newFilterLinks = [];
  return Promise.allSettled(
    urls.map((url,i) => {
      return new Promise((resolve, reject) => {
        try {
          let domain = psl.get(extractHostname(url));
          BlackLink.exists({ domainName: domain }).then((isBlackLink) => {
            if (isBlackLink) {
               fs.unlinkSync(__uploadDir + account.links.imageFilterLinks[i]);
                account.links.imageFilterLinks = account.links.imageFilterLinks.splice(i, 1);
            } else {
              newFilterLinks.push(url);
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

function createScreenShotUrl(urls) {
  //        request(url, (error, response, html) => {
  //          if (!error && response.statusCode == 200) {
  //            try {
  //              var $ = cheerio.load(html);

  // //  console.log($('body')[0]);
  // html2canvas($('body').get(0)).then(function (canvas) {
  //   console.log(canvas);
  //     resolve();
  // }).catch((e) => {
  //     console.log('\x1b[31m%s\x1b[0m', 'SCREENSHOT ERROR: ' + e.message);
  // });

  //            } catch (error) {
  //              console.log('\x1b[31m%s\x1b[0m', 'ERROR :' + error.message);

  //              reject();
  //            }
  //          } else {
  //            console.log(
  //              `REQUEST ERROR : ${error} - STATUS : ${response.statusCode}`,
  //            );
  //            reject();
  //          }
  //        });

  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
  //   await page.goto(urls[0]);
  // let screent = await page.screenshot({
  //   path: `client/public/uploads/${urls[0]
  //     .replace(/(^\w+:|^)\/\//, '')
  //     .replace(/\//g, '-')}.png`,
  //   fullPage: true,
  // });
  // await browser.close();
  // return screent;

  //  let pagres = new Pageres();
  //  urls.forEach(url => {
  //    pagres.src(url, ['800x1080', '480x320',]);
  //  })
  //  return pagres.dest('client/public/uploads/').run();

  return new Promise((resolve, reject) => {
    request(urls[0], (error, response, html) => {
      if (!error && response.statusCode == 200) {
        try {
          // var $ = cheerio.load(html);
          // let links = [];
          // links = $('script')
          //   .get()[0]
          //   .children[0].data.match(
          //     /(\b(https?|http|viber):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi,
          //   );
          // if (links) {
          //   if (links.length != 0) {
          //     links = links.filter(
          //       (item, index) => links.indexOf(item) === index,
          //     );
          //     newAccount.links.parsedLinks = links;
          //     resolve();
          //   } else {
          //     reject();
          //   }
          // } else {
          //   reject();
          // }
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
                //   console.log(url);
                newAccount.links.filterLinks.push(url);
                grabpage(browser, url).then((fileName) => {
                  newAccount.links.imageFilterLinks.push(fileName);
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
     const page = await browser.newPage();

 
     await page.setDefaultNavigationTimeout(0);
  await page.goto(url);
  const fileName = filenamifyUrl(url);
  const pathFile = __uploadDir + fileName;
        let height = await page.evaluate(
          () => document.documentElement.offsetHeight,
        );
        await autoScroll(page);

  await page.screenshot({
    type: 'jpeg',
    path: pathFile + '.jpeg',
    fullPage: true,
    quality: 80
  });
    await page.close();
        if(height > 16380) {
 return fileName + '.jpeg ';
        }
         else {
 await sharp(pathFile + '.jpeg')
   .toFormat('webp')
   .toFile(pathFile + '.webp');
   fs.unlinkSync(pathFile + '.jpeg')
   return fileName + '.webp';
         }
  } catch (error) {
    console.log('SAVE IMAGE ERROR: ' + error.message );
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

module.exports = router;
