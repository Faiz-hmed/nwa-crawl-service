const fs = require('fs/promises');
const url = require('url');
const puppeteer = require('puppeteer');
const amqp = require("amqplib");
const path = require('path');
const download = require('./utils/download');
const utils = require('./utils/arr_fns');
const filters = require('./cat_extract');
const hashes = require("./utils/hash_fns");

async function connect(){
    const message = await scrape();

    try {
        const connection = await amqp.connect("amqp://mq:5672");
        const channel = await connection.createChannel();
        const result = await channel.assertQueue("Articles");

        console.log("Sending message to Queue ...")
        channel.sendToQueue("Articles",Buffer.from(message));


        console.log(`Message with title: "${JSON.parse(message).Title}" is sent!`);
        
        await channel.close();
        await connection.close();
    }
    catch(e){
        console.error(e);
    }
}

async function scrape (){
    const browser = await puppeteer.launch({
        args:[
            "--no-sandbox"
        ]
    });
    const page = await browser.newPage();

    let reqPageURL = new URL(process.argv[2]);
    const reqPage = reqPageURL.toString();
    const reqPageHost = reqPageURL.hostname.toString();

    console.log(reqPage);
    await page.goto(reqPage,{waitUntil:'networkidle2'});
    

    const date = new Date();
    let month = date.getMonth()+1;
    month = month.toString();
    let year = date.getFullYear().toString();
    let ndate = date.getDate().toString();


    console.log("Page opened! trying to pull text & images");
    let paraElems;      //Included in final message
    let titleElem;      //Included in final message
    let authorElem;     //Included in final message
    let imageElems;     
    let imageElemsSelector;
    let imgPathArr = [];     //Included in final message
    let imgTHeight, imgTWidth;
    let wc = 0;
    
    let categoryElems;  //Included in final message
    let timeElem;       //Included in final message
    let publisher;  
    
    let pcategoryElems = reqPageURL.pathname.split('/').slice(1,);
    // console.log(pcategoryElems)

    if (reqPageHost.includes('cnn')) {
        publisher = "cnn";
        paraElems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.zn-body__paragraph')).map(x => x.textContent);
            
        });
        titleElem = await page.evaluate(() => {
            return document.querySelector('.pg-headline').textContent.trim();
            
        });
        authorElem = await page.evaluate(() =>{
            aNames = document.querySelector('.metadata__byline__author').textContent;
            const aNameMatcher = /(?<=By|by )[\s\S]*(?=, CNN)/;

            aNames = aNames.match(aNameMatcher);
            aNames = aNames[0].split(',');
            const lName = aNames.pop();

            const and = ' and ';

            if(lName.includes(and)){
                aNames.push(...lName.split(and));
            }else{
                aNames.push(lName);
            }
            
            return aNames;
        });
        timeElem = await page.evaluate(() => {
            timeElem = document.querySelector('.update-time').textContent;
            
            timeSearch = /(\d{2})(\d{2})\sGMT[\s\S]*\)\s([\s\S]*)\s$/;
            timeExtract = timeElem.match(timeSearch);
            if(timeExtract){
                hours = timeExtract[1];
                minutes = timeExtract[2];
                date = timeExtract[3];

                
                return Array(date,hours,minutes);
            }
        });
        if(timeElem){
            timeElem = new Date(timeElem[0]+" "+timeElem[1]+":"+timeElem[2]);
            // console.log("Time before converting to timestamp ...",timeElem);
            timeElem = timeElem.getTime();
        } 
        
        // slug = pcategoryElems.slice(4,5).pop();
        // console.log("slug...",slug);
        // pcategoryElems = pcategoryElems[3];
        // console.log("pcategoryElems...", pcategoryElems)
        categoryElems= await filters.getAllCategories({url:reqPageURL,publication:publisher});

        imageElemsSelector = '#large-media > div:nth-child(1) > img:nth-child(1), .media__image--responsive';
        imgTHeight = 250;
        imgTWidth = 168;
        
    }

    if (reqPageHost.includes('fox')){
        publisher = "fox";
        paraElems = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.article-body > p, .article-body > h2')).map(x => x.textContent)
        });
        titleElem = await page.evaluate(() => {
            return document.querySelector('.headline').textContent.trim()
        });
        authorElem = await page.evaluate(() => {
            return document.querySelector('.author-byline > span:nth-child(2) > span:nth-child(1) > a:nth-child(1), .author-byline > span:nth-child(1) > span:nth-child(1) > a:nth-child(1)').textContent
        });

        // let cat_selector = '.eyebrow > a:nth-child(1)';
        // const efn = x=> x.getAttribute('href');
        // categoryElems = await filters.getAllCategories({page: page, selector: cat_selector,efn: efn, url: reqPageURL,publication:publisher});


        categoryElems = await page.evaluate(() => {
            return document.querySelector('.eyebrow > a:nth-child(1)').getAttribute('href');
        })
        let  categoryElemsObj = new URL(categoryElems);
        let categoryElemsArr = categoryElemsObj.pathname.toString().split('/');
        
        categoryElems = utils.removeItemAll(categoryElemsArr, 'category').slice(1,);
        

        slugElem = pcategoryElems[1];
        //console.log("... Checking slugElems", slugElem)
        console.log(slugElem);
        //console.log("... checking category elems before sending..",categoryElems);
        categoryElems = filters.getCategories({slug: slugElem, pc: categoryElems});


        imageElemsSelector = 'div.embed-media > div:nth-child(1) > div:nth-child(1) > a:nth-child(1) > img:nth-child(1), div.image-ct > div:nth-child(1) > picture:nth-child(1) > img:nth-child(3), .featured-image img';
        imgTHeight = 250;
        imgTWidth = 250;
    }
    if(!publisher) return

    fname = titleElem.replace(/[\s\W]+/g,'-').toLowerCase();
    fname = fname[fname.length-1] == '-'? fname.slice(0,fname.length-1)+".json" : fname+"-"+publisher+".json";
    fname = hashes.gethash(fname);
    
    let fpath = path.join('vol','web','media','articles',year,month,ndate);
    await fs.mkdir(fpath, {recursive:true});
    fpath = path.join(fpath,fname);
    await fs.writeFile(fpath, JSON.stringify(paraElems, null, 2));
    fpath = path.join('articles',year,month,ndate,fname);     //Overwriting the filepath, to make it relative to MEDIA_ROOT in django
    for (const sec of paraElems){
        wc+=utils.getWordCount(sec);
    }


    imageElems = await page.evaluate((imageElemsSelector,imgTHeight,imgTWidth) => {
        let imgArr = [];
        Array.from(document.querySelectorAll(imageElemsSelector)).map(
            x=>{
                if (x.naturalHeight>imgTHeight && x.naturalWidth>imgTWidth){
                    imgArr.push(x.src);
                }
            }
        );
        return imgArr
    }, imageElemsSelector, imgTHeight, imgTWidth);

    imageElems = imageElems.map(url => {
        if(url.includes('?')){
            return url.split('?').shift();
        }
        return url;
    });
    
    const imgDirPath = path.join('vol','web','media','article_images',year,month,ndate)
    await fs.mkdir(imgDirPath, {recursive: true});
    for (const img of imageElems){
        
        let imgBaseName = path.basename(img);
        imgBaseName = hashes.gethash(imgBaseName);
        
        let imgPath = path.join(imgDirPath, imgBaseName);
        download.download(img, imgPath)
        
        imgPathArr.push(path.join('article_images',year,month,ndate,imgBaseName));
    }

    console.log(paraElems,'\n',titleElem,'\n',authorElem);
    console.log(categoryElems,'\n',imgPathArr,'\n',timeElem,'\n',wc);

    await page.close();
    await browser.close();

    return JSON.stringify({
        ContentFileName: fpath,
        Publication: publisher,
        Title: titleElem,
        Link: reqPage,
        Author: authorElem,
        Category : categoryElems,
        TimeWritten: timeElem,
        Images : imgPathArr,
        Reading_time : wc
    });
}
// async function evaluate(page, many=false, selector, efn){
//     let content;
//     if(!many){
//         content = await page.evaluate((selector ,efn)=>{
//             elem = document.querySelector(selector);
//             if(!efn)
//                 return elem.textContent;

//             return efn(sel = elem);
//         },selector, efn)
//     }
//     return page.$$eval(selector, efn)
// }


connect();

// console.log(Array.from(document.querySelectorAll('div.image-ct > div:nth-child(1) > picture:nth-child(1) > img:nth-child(3)')).map(x=>x.src));

// console.log(Array.from(document.querySelectorAll('div.embed-media > div:nth-child(1) > div:nth-child(1) > a:nth-child(1) > img:nth-child(1), div.image-ct > div:nth-child(1) > picture:nth-child(1) > img:nth-child(3), .featured-image img')).map(x=>x.src));