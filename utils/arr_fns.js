function removeItemAll(arr, value) {
    var i = 0;
    while (i < arr.length) {
      if (arr[i] === value) {
        arr.splice(i, 1);
      } else {
        ++i;
      }
    }
    return arr;
}

function getWordCount(sentence){
  return sentence.split(' ').length  
}

module.exports.getWordCount = getWordCount;
module.exports.removeItemAll = removeItemAll;