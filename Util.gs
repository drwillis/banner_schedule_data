function isArray(what) {
  return Object.prototype.toString.call(what) === '[object Array]';
}

function makeURLEncodedStringWithArrays(JSON_obj) {
  var query = "";
  for (key in JSON_obj) {
    if (isArray(JSON_obj[key])) {
      for (var idx=0; idx < JSON_obj[key].length; idx++) {
        query += encodeURIComponent(key)+"="+encodeURIComponent(JSON_obj[key][idx])+"&";
      }
    } else {
      query += encodeURIComponent(key)+"="+encodeURIComponent(JSON_obj[key])+"&";
    }    
  }
  return query;
}

function getElementsByTagName(element, tagName) {  
  var data = [];
  var descendants = element.getDescendants();  
  for(i in descendants) {
    var elt = descendants[i].asElement();     
    if( elt !=null && elt.getName()== tagName) data.push(elt);      
  }
  return data;
}

function getElementsByClassName(element, classToFind) {  
  var data = [];
  var descendants = element.getDescendants();
  descendants.push(element);  
  for(i in descendants) {
    var elt = descendants[i].asElement();
    if(elt != null) {
      var classes = elt.getAttribute('class');
      if(classes != null) {
        classes = classes.getValue();
        if(classes == classToFind) data.push(elt);
        else {
          classes = classes.split(' ');
          for(j in classes) {
            if(classes[j] == classToFind) {
              data.push(elt);
              break;
            }
          }
        }
      }
    }
  }
  return data;
}

