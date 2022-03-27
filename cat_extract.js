const puppeteer = require('puppeteer');
const arr_fns = require('./utils/arr_fns');

let categoryElems;

vagueWords = [
    'the',
    'a',
    'it',
    'an',
    'did',
    'by',
    'him',
    'her',
    'you',
    'for',
    'intl',
    'its',
    'that',
    'Mine',
    'what',
    'where',
    'our',
    'such',
    'who',
    'why',
    'with',
    '',
    ' '
];


const getAllCategories = async ({page, selector, efn, url,publication}= {}) => {
    /* url should be of type URL*/
    // ARG TEST
    // console.log(page,'\n',typeof page);
    //TEST
    
    let pname = url.pathname.split('/').slice(1,);      //Path name of url obj
    let slug;

    if(publication==='cnn'){
        categoryElems=[];
        
        categoryElems.push(pname[3])
        slug = pname.slice(4,5).pop();
        console.log("slug from cat_extract ...",slug, typeof slug);

        let dt_slug = /\d{2}/g;
        slug = slug.replaceAll(dt_slug,'');

        return await catElem({pc:categoryElems,slug:slug});
    }
    else if(publication==='fox'){
        slug = pname[1];
        categoryElems = await catElem({page:page,selector:selector,efn:efn,rwr:false});

        console.log("categories recieved from evaluate ... ",categoryElems);
        
        let categoryElemsObj = new URL(categoryElems);
        let categoryElemsArr = categoryElemsObj.pathname.toString().split('/');
        
        categoryElems = arr_fns.removeItemAll(categoryElemsArr, 'category').slice(1,);
        return getShortCategories({pc:categoryElems, slug:slug});

    }

}

const catElem = async ({page,selector,rwr=true,slug,efn} ={}) =>{              //efn is evaluate function
    // TEST
    // console.log("efn test ... ", !efn);
    //END TEST
    // if(efn){
    //     console.log("fn function added!");        
        
    // }    
    if(page){
        
        if(!!efn)
            await page.evaluate(()=>{window.efn = efn});

        //await page.exposeFunction("fn", x => console.log(x));
        
        categoryElems = await page.evaluate(async () => {
            // elem = document.querySelector(selector);
            
            if(!window.efn)
                return elem;
            
            return await window.efn(elem);           // passed in function should return what the caller requires    #THREAT
        });
        
        if(!rwr)
            return categoryElems;
        return getShortCategories({slug: slug,pc: categoryElems});
    }
    else
        return getShortCategories({slug: slug});
      
};

const getShortCategories = ({slug, pc}={}) =>{
    let rArr = []
    const cArr = slug.split('-');

    for(cat of cArr){
        if( !vagueWords.includes(cat) ){
            rArr.push(cat)
        }
    }
    
    if(pc){
        
        console.log("After pushing pc ... ",rArr )
        for (const c of pc){

            if (!rArr.includes(c)){
                rArr.push(c);
            }
        }
    }
    return rArr;
}
module.exports.getCategories = getShortCategories;
module.exports.getAllCategories = getAllCategories;