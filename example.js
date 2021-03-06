const puppeteer = require('puppeteer');
const crypto = require('crypto');

puppeteer.launch().then(async browser => {
  const page = await browser.newPage();
  await page.goto("https://www.foxnews.com/us/missouri-interstate-crash-five-dead");
  page.on('console', msg => console.log(msg.text()));
  
  await page.exposeFunction('md5', text =>
    //crypto.createHash('md5').update(text).digest('hex')
    `great ${text}`
  );
  await page.evaluate(async () => {
    // use window.md5 to compute hashes
    console.log("has md5?",!!md5);
    const myString = 'PUPPETEER';
    const myHash = await window.md5(myString);
    console.log(`md5 of ${myString} is ${myHash}`);
  });
  await browser.close();
});