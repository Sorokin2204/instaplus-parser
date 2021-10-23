
const { Builder, By, Key, until,Options, WebDrive } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const randomUseragent = require('random-useragent');
const accountInfo = require('./accountInfoGenerator');
const verifiCode = require('./getCode');
const email = require('./createFakeMail');
const chromedriver = require('chromedriver');
const generatorPassword = require('generate-password');
const SenderAccount = require('../../models/SenderAccount');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const  request = require('request');
const { spawn } = require('child_process');
var generatorUsername = require('random-username-generator');
const fetch = require('node-fetch');
const { resolve } = require('path');

const apiKey = 'cGFzcz0kMnkkMTAkRlBMODNtd1VoME5XeFYyR0M4dHJ0Ljh6Nno5QmFiLklEdWRieVpqcVRwdDdVTk5zazdJQ0smaWQ9MTA4Mjk1';
 var userAgent = randomUseragent.getRandom((ua) => {
   return (
     ((ua.osName === 'Windows' && ua.osVersion === '10') ||
       (ua.osName === 'Mac OS' &&
         (ua.osVersion === '10.10.1' ||
           ua.osVersion === '10.10.2' ||
           ua.osVersion === '10.10.3' ||
           ua.osVersion === '10.10.4' ||
           ua.osVersion === '10.10.5' ||
           ua.osVersion === '10.11' ||
           ua.osVersion === '10.11.2' ||
           ua.osVersion === '10.11.3' ||
           ua.osVersion === '10.11.4' ||
           ua.osVersion === '10.11.5' ||
           ua.osVersion === '10.11.6' ||
           ua.osVersion === '10.12' ||
           ua.osVersion === '10.12.1' ||
           ua.osVersion === '10.12.2' ||
           ua.osVersion === '10.12.3' ||
           ua.osVersion === '10.12.4' ||
           ua.osVersion === '10.12.5' ||
           ua.osVersion === '10.12.6' ||
           ua.osVersion === '10.13' ||
           ua.osVersion === '10.13.1' ||
           ua.osVersion === '10.13.2' ||
           ua.osVersion === '10.13.3' ||
           ua.osVersion === '10.13.4' ||
           ua.osVersion === '10.13.5' ||
           ua.osVersion === '10.13.6' ||
           ua.osVersion === '10.14' ||
           ua.osVersion === '10.14.1' ||
           ua.osVersion === '10.14.2' ||
           ua.osVersion === '10.14.3' ||
           ua.osVersion === '10.14.4' ||
           ua.osVersion === '10.14.5' ||
           ua.osVersion === '10.14.6' ||
           ua.osVersion === '10.15' ||
           ua.osVersion === '10.15.1' ||
           ua.osVersion === '10.15.2' ||
           ua.osVersion === '10.15.3' ||
           ua.osVersion === '10.15.4' ||
           ua.osVersion === '10.15.5' ||
           ua.osVersion === '10.15.6' ||
           ua.osVersion === '10.15.7' ||
           ua.osVersion === '11.0' ||
           ua.osVersion === '11.0.1' ||
           ua.osVersion === '11.1' ||
           ua.osVersion === '11.2' ||
           ua.osVersion === '11.2.1' ||
           ua.osVersion === '11.2.2' ||
           ua.osVersion === '11.2.3' ||
           ua.osVersion === '11.3' ||
           ua.osVersion === '11.3.1' ||
           ua.osVersion === '11.4' ||
           ua.osVersion === '11.5' ||
           ua.osVersion === '11.5.1' ||
           ua.osVersion === '11.5.2' ||
           ua.osVersion === '11.6'))) &&
     (ua.browserName === 'Chrome' ||
       ua.browserName === 'Mozilla' ||
       ua.browserName === 'Firefox' ||
       ua.browserName === 'Edge' ||
       ua.browserName === 'Opera')
   );
 });
 var resolutions = [
     '800,600',
     '832,624',

     '960,540',
     '960,544',
     '960,640',
     '960,720',
     '1024,576',
     '1024,600',
     '1024,640',
     '1024,768',
     '1024,800',
     '1024,1024',
     '1080,1200',
     '1120,832',
     '1136,640',
     '1138,640',
     '1152,720',
     '1152,768',
     '1152,864',
     '1152,900',
     '1280,720',
     '1280,768',
     '1280,800',
     '1280,854',
     '1280,960',
     '1280,1024',
     '1334,750',
     '1366,768',
     '1400,1050',
     '1440,900',
     '1440,900',
     '1440,960',
     '1440,1024',
     '1440,1080',
     '1440,1440',
     '1600,768',
     '1600,900',
     '1600,1024',
     '1600,1200',
     '1600,1280',
     '1680,1050',
     '1776,1000',
     '1792,1344',
     '1800,1440',
     '1856,1392',
     '1920,1080',
     '1920,1200',
     '1920,1280',
     '1920,1400',
     '1920,1440',
   ];
var mounth = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

exports.fakeInstagramAccount = async function (proxyAddress) {
  try {
    let browser = await initBrowser(proxyAddress);
    await regStepsUntilSendCode(browser);
 
    //   await bypassCapcha(browser);
  } catch (e) {
    console.log(e);
  } finally {
    // await browser.quit();
  }
};

function getApi(url) {
  return new Promise((resolve, reject) => {
    fetch(url, {
      method: 'get',
    })
      .then((res) => res.text())
      .then((out) => {
        console.log(out);
        resolve(out);
      })
      .catch((err) => {
        console.log(err);
        reject();
      });
  });
}

const sleep = (waitTimeInMs) =>
  new Promise((resolve) => setTimeout(resolve, waitTimeInMs));

async function  initBrowser(proxyAddress) {
  //  option.addExtensions(
  //    fs.readFileSync(path.resolve(__dirname, 'AdBlock.crx'), {
  //      encoding: 'base64',
  //    }),
  //  );
  let randomResolution = _.sample(resolutions).split(',');
  let option = new chrome.Options();
  console.log('USER AGENT - ' + userAgent);
  option.addArguments(`--proxy-server=${proxyAddress}`);
  option.addArguments(`--user-agent="${userAgent}"`);
  option.windowSize({
    width: +randomResolution[0],
    height: +randomResolution[1],
  });
  option.addExtensions(
    fs.readFileSync(path.resolve(__dirname, 'Block-image.crx'), {
      encoding: 'base64',
    }),
  );

  let browser = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(option)
    .build();
  return browser;
};

async function initSmsActivate() {
    let fakeNumber = await getApi(
      `http://smsvk.net/stubs/handler_api.php?api_key=${apiKey}&action=getNumber&service=ig`,
    );
    if (
      fakeNumber.includes('NO_BALANCE') ||
      fakeNumber.includes('NO_NUMBERS')
    ) {
      throw new Error(fakeNumber);
    }
    console.log('[INFO] Number got');
    fakeNumber = fakeNumber.split(':');
    let idNumber = fakeNumber[1];
    let number = fakeNumber[2];
    let status = await getApi(
      `http://smsvk.net/stubs/handler_api.php?api_key=${apiKey}&action=setStatus&status=1&id=${idNumber}`,
    );
    console.log('[INFO] Status number change');
    return fakeNumber;
}

async function regStepsUntilSendCode(browser) {
  let inputMount = _.random(1, 12).toString();
  let inputDay = _.random(1, 28).toString();
  let inputYear = _.random(1960, 2000).toString();
  generatorUsername.setSeperator('_');
  let username = await generatorUsername.generate().toLowerCase();
  let password = generatorPassword.generate({
    length: 10,
    numbers: true,
  });
  //let fakeMail = await email.getFakeMail();
  let numberData = await initSmsActivate();
      let idNumber = numberData[1];
      let number = numberData[2];
  await browser.get('https://www.instagram.com/accounts/emailsignup/');
  await sleep(5000);
  //// PAGE SIGNUP
  console.log('Phone input');
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/form/div[3]/div/label/input',
      ),
    )
    .sendKeys(number, Key.RETURN);
  console.log('Name input');
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/form/div[4]/div/label/input',
      ),
    )
    .sendKeys(await accountInfo.generatingName(), Key.RETURN);
  console.log('Username input');
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/form/div[5]/div/label/input',
      ),
    )
    .sendKeys(username, Key.RETURN);
  await sleep(3000);
  console.log('Password input');
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/form/div[6]/div/label/input',
      ),
    )
    .sendKeys(password, Key.RETURN);
  await sleep(15000);
  //// PAGE BIRTHDAY
  console.log('Select date birth');
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/div[4]/div/div/span/span[1]/select',
      ),
    )
    .sendKeys(inputMount);
  await sleep(8000);
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/div[4]/div/div/span/span[2]/select',
      ),
    )
    .sendKeys(inputDay);
  await sleep(8000);
  await browser
    .findElement(
      By.xpath(
        '/html/body/div[1]/section/main/div/div/div[1]/div/div[4]/div/div/span/span[3]/select',
      ),
    )
    .sendKeys(inputYear);
  await sleep(8000);
  await browser
    .findElement(
      By.xpath('/html/body/div[1]/section/main/div/div/div[1]/div/div[6]'),
    )
    .click();
  await sleep(1000);

  getCode(idNumber,browser);
  // console.log('[INFO] Code - ' + code);
  // let fMail = fakeMail.split('@');
  // let mailName = fMail[0];
  // let domain = fMail[1];
  // let veriCode = await verifiCode.getInstCode(domain, mailName, browser);
  // console.log(veriCode);
  // sleep(15000);
  // console.log('Email code input');
  // await browser
  //   .findElement(By.name('email_confirmation_code'))
  //   .sendKeys(veriCode, Key.RETURN);
  // console.log('Login' + username, 'Password' + password);
  //await sleep(20000);
  // let newSenderAcc = new SenderAccount({
  //   login: username,
  //   password: password,
  // });
  // await newSenderAcc.save().then(() => {
  //   console.log('ACCOUNT SAVE IN BASE');
  // });
}

async function bypassCapcha (browser) {
  try {
    let srcRecaptcha = await browser
      .findElement(By.id('recaptcha-iframe'))
      .getAttribute('src');
      await browser.switchTo().newWindow('tab');
      let tab = await browser.getAllWindowHandles();
      await browser.switchTo().window(tab[2]);
    await sleep(2000);
     await browser.get(srcRecaptcha);
    await sleep(2000);
    var recaptchaChallangeFrame;
    var recaptchaControlFrame;

    recaptchaControlFrame = await browser
      .findElement(By.xpath("//iframe[@title='reCAPTCHA']"))
      .then(null, (err) => {
        if (err.name === 'NoSuchElementError') {
          throw new Error('Not found reCaptha');
        }
      });
    recaptchaChallangeFrame = await browser
      .findElement(By.xpath("//iframe[@title='проверка recaptcha']"))
      .then(null, (err) => {
        if (err.name === 'NoSuchElementError') {
          recaptchaChallangeFrame = browser
            .findElement(By.xpath("//iframe[@title='challenge recaptcha']"))
            .then(null, (err) => {
              if (err.name === 'NoSuchElementError') {
                recaptchaChallangeFrame = browser
                  .findElement(
                    By.xpath("//iframe[@title='challenge-recaptcha']"),
                  )
                  .then(null, (err) => {
                    if (err.name === 'NoSuchElementError') {
                      recaptchaChallangeFrame = browser
                        .findElement(
                          By.xpath("//iframe[@title='recaptcha-challenge']"),
                        )
                        .then(null, (err) => {
                          if (err.name === 'NoSuchElementError') {
                            throw new Error('Not found reCaptha');
                          }
                        });
                    }
                  });
              }
            });
        }
      });
    if (!recaptchaChallangeFrame && !recaptchaControlFrame) {
      throw new Error('Not found reCaptha');
    }

    await browser.switchTo().frame(recaptchaControlFrame);
    await sleep(2000);
    await browser
      .findElement(By.className('recaptcha-checkbox-border'))
      .click();
    await sleep(2000);
    await browser.switchTo().defaultContent();
    await sleep(3000);
    await browser.switchTo().frame(recaptchaChallangeFrame);
    await sleep(2000);
    await browser.findElement(By.id('recaptcha-audio-button')).click();
    await sleep(1000);
    await browser.switchTo().defaultContent();
    await sleep(3000);
    await browser.switchTo().frame(recaptchaChallangeFrame);
    let src = await browser
      .findElement(By.id('audio-source'))
      .getAttribute('src');
    console.log('SRC CAPTCHA -' + src);

    var codeCaptach;
    const proc = spawn('python', [__dirname + '\\python.py', 'newUser', src]);

    proc.stdout.on('data', function (data) {
      console.log(data.toString());
      codeCaptach = data.toString().toLowerCase();
    });

    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', function (data) {
      console.log(data);
    });

    proc.on('close', async function () {
      console.log('finished');
      await browser.findElement(By.id('audio-response')).sendKeys(codeCaptach);
      await sleep(1000);
      await browser.findElement(By.id('audio-response')).sendKeys(Key.ENTER);
      // await sleep(1000);
      // await browser.switchTo().defaultContent();
      // await browser.findElement(By.id('recaptcha-demo-submit')).click();
    });
  } catch (error) {
    console.log(error);
  }
    }


   function getCode(idNumber,browser) {

        tryGetCode(idNumber).then(async (code) => {
           await browser
             .findElement(
               By.xpath(
                 '/html/body/div[1]/section/main/div/div/div[1]/div/div/div/form/div[1]/div/label/input',
               ),
             )
             .sendKeys(code, Key.RETURN);

 await getApi(
      `http://smsvk.net/stubs/handler_api.php?api_key=${apiKey}&action=setStatus&status=6&id=${idNumber}`,
    );
        }).catch(() => {
         return getCode(idNumber,browser);
        });
      
    }

    function tryGetCode(idNumber) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          console.log('[INFO] Try find code');
          getApi(
            `http://smsvk.net/stubs/handler_api.php?api_key=${apiKey}&action=getStatus&id=${idNumber}`,
          ).then((code) => {
 if (code.includes('STATUS_OK')) {
   code = code.split(':')[1];
   console.log('[INFO] Code found! - ' + code);
   resolve(code);
 } else {
   console.log('[WARN] Code NOT Found ! - ' + code);
   reject();
 }
          });
         
        }, 10000);
      });
    }