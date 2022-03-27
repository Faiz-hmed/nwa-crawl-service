const http = require('http')
const https = require('https')
const fs = require('fs')
const url = require('url')
const path = require('path')

function download(imgurl, imagePath){

    const imgURL = new url.URL(imgurl)
    
    imagePath = imagePath? imagePath: path.basename(imgURL.toString())
    const stream = fs.createWriteStream(imagePath);
    
    const protocol = imgURL.protocol==='https:'? https: http 
    
    const res= protocol.get(imgurl, res => {
        
        res.pipe(stream)
        
        stream.on("error", (err)=>{
            console.log("Error writing to file!");
            console.log(err);
        });

        stream.on('finish', () => {
            console.log("Image saved to," ,"\""+imagePath+"\"");
            stream.close();
        });

    });
    res.on('error', err => {
        console.log("Unable to open the url specified!",url)
        console.log(err)
    });

}

module.exports.download = download