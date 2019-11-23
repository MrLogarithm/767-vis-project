//https://stackoverflow.com/questions/1985260/javascript-array-rotate
//https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
//https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
var transliterations;

var pages = [];
var search_str_saved = "";
var current_page = 0;

function show_page( n ) {
  current_page += n;
  n = current_page;

  $( "#tablet_previews" ).html( '' );

  var buttons = document.createElement("div");
  //buttons.className = "tablet_preview";
  buttons.id = "preview_buttons";
  buttons.style= "text-align:center;padding-right:4px;";
  var nextPg = document.createElement("a");
  nextPg.href="javascript:void(0);";
  nextPg.innerHTML = "&nbsp;&gt; next page&nbsp;";
  nextPg.onclick = function(){show_page(1);};
  var lastPg = document.createElement("a");
  lastPg.href="javascript:void(0);";
  lastPg.innerHTML = "&nbsp;prev page &lt;&nbsp;";
  lastPg.onclick = function(){show_page(-1);};
  if ( current_page > 0 ) {
    buttons.appendChild( lastPg );
  }
  if ( current_page < Math.ceil(pages.length/5)-1 ) {
    buttons.appendChild( nextPg );
  }
  $( "#tablet_previews" ).append( buttons );

  Array.prototype.rotate = (function() {
    // save references to array functions to make lookup faster
    var push = Array.prototype.push,
        splice = Array.prototype.splice;

    return function(count) {
        var len = this.length >>> 0, // convert to uint
            count = count >> 0; // convert to int

        // convert count to value in range [0, len)
        count = ((count % len) + len) % len;

        // use splice.call() instead of this.splice() to make function generic
        push.apply(this, splice.call(this, 0, count));
        return this;
    };
})();


  var search_str = search_str_saved;
  var tablets_with_string = pages.slice(5*n,5*(1+n));
  //var hilites = myDiff( tablets_with_string, search_str );
  var rotated = [...pages];
  var hilites = myDiff( rotated.rotate(5*n).slice(0,30), search_str );
  //console.log(hilites);

  for ( var i = 0; i < tablets_with_string.length; i++ ) {
    var hilite = false;
    var color = "";
    // add preview
    var preview = document.createElement( "div" );
    preview.className = "tablet_preview";
    var split_tablet = tablets_with_string[i];
    preview.innerHTML = "<a href='https://cdli.ucla.edu/search/archival_view.php?ObjectID="+split_tablet[0]+"'>"+split_tablet[0]+"</a><br/>"; // CDLI Number
    var tmp = "<p>";
    for ( var j = 1; j < split_tablet.length; j++ ) {
      //preview.innerHTML += "<img src='pngs/PE_mainforms/"+"M388"+".png' alt='"+split_tablet[j]+"' style='height:12px;width:12px;'/>";
      if (split_tablet[j]=="<br/>") {
	tmp += "</p><p>"
      }
      else {
	/*preview.innerHTML*/ tmp += "<span id='char_"+i+"_"+j+"'>"+split_tablet[j]+" </span>";
      }
    }
    preview.innerHTML += tmp;
    $( "#tablet_previews" ).append( preview );
  }
  for ( var key in hilites ) {
    //console.log("DEBUG",key,hilites[key],getColor(hilites[key]));
    $( key ).css("background-color",getColor(hilites[key]));
    $( key ).css("color",invertColor(getColor(hilites[key]),bw=true));
  }
}
function padZero(str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

function invertColor(hex, bw) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    var r = parseInt(hex.slice(0, 2), 16),
        g = parseInt(hex.slice(2, 4), 16),
        b = parseInt(hex.slice(4, 6), 16);
    if (bw) {
        // http://stackoverflow.com/a/3943023/112731
        return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 180)
            ? '#000000'
            : '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
}


function grep_tablets( selection ) {
  //console.log("enter grep");
  var search_str = selection.left.split(" ");
  search_str = search_str.slice(0,search_str.length-(document.getElementById("center_sign").value.split(" ").length)).join(" ");
  search_str += " "+selection.right;
  search_str = search_str.replace("x","+").replace("lpar","(").replace("rpar",")").replace("unk","[...]").replace("x","+");
  while (/( |^)([^ |]*\+[^| ]*)( |$)/.test(search_str)) {
    //console.log("replace",search_str);
    search_str = search_str.replace(/( |^)([^ |]*\+[^| ]*)( |$)/,
      function(match,p1,p2,p3){return " |"+p2+"| "} 
    )
    //console.log("replaced",search_str);
  }
  //console.log("untrim",search_str);
  search_str = search_str.trim();
  console.log(search_str);

  var tablets_with_string = [];
  for ( var i = 0; i < transliterations.length; i++ ) {
    // add space to account for variants
    if ( (transliterations[i]+" ").includes(search_str+" ") ) {
      //console.log( transliterations[i] );
      tablets_with_string.push( transliterations[i].split(" ") );
      /*if ( tablets_with_string.length >= 5) {
	break;
      }*/
    }
  }
  pages = tablets_with_string;
  pages = pages.sort(function(b,a){return a.length - b.length});
  search_str_saved = search_str;
  show_page(0);

}

function myDiff( files, search_str ) {
  var open  = new Object();
  var pastFinds = new Object();
  var counter = 0;
  // highlight the selected signs
  for ( var i = 0; i < files.length; i++ ) {
        for ( var j = i+1; j < files.length; j++ ) {
    for (var len = 5; len > 1; len-- ) {
      for ( var start = 0; start < files[i].length-len+1; start++ ){
        var str = files[i].slice(start,start+len).join(" ");
	  if (str.includes("N") || !str.includes("M") || str.includes("...") || str.includes("X") || str.includes("br")){
	    continue;
	  }
          //for (var len2 = 3; len2 < 4; len2++ ) {
	  var len2 = len;
            for ( var start2 = 0; start2 < files[j].length+1-len2; start2++ ){
	      var str2 = files[j].slice(start2,start2+len2).join(" ");
	      if ( str == str2 ) {
		var skip = false; // avoid recoloring
		for ( var idx = start; idx < start+len; idx++ ) {
		  var key = "#char_"+i+"_"+idx;
		  if ( open[key] ){
		    skip = true;
		  }
		}
		for ( var idx = start2; idx < start2+len2; idx++ ) {
		  var key = "#char_"+j+"_"+idx;
		  if ( open[key] ){
		    skip = true;
		  }
		}
		if ( ! skip ) {
		  /*var whichFind;
		  //console.log(pastFinds,pastFinds[str], str);
		  if ( pastFinds[str] !== undefined ) {
		    whichFind = pastFinds[str];
		  } else {
		    pastFinds[str] = counter;
		    whichFind = counter++;
		  }*/
		  var whichFind = colhash(str.trim());
		  //console.log(pastFinds,pastFinds[str], str, whichFind);
		  for ( var idx = start; idx < start+len; idx++ ) {
		    var key = "#char_"+i+"_"+idx;
		    open[key] = whichFind;
		  }
		  for ( var idx = start2; idx < start2+len2; idx++ ) {
		    var key = "#char_"+j+"_"+idx;
		    open[key] = whichFind;
		  }
		}
		//start = len;
		start2+=len2;
	      }
	    }
	  //}
	}
      }
    }
  }
  for ( var i = 0; i < files.length; i++ ) {
    var len = search_str.trim().split(" ").length;
    for ( var start = 0; start < files[i].length-len+1; start++ ){
      var str = files[i].slice(start,start+len).join(" ");
      if (str.trim() == search_str.trim()) {
		  var whichFind = colhash(str.trim());
		  //console.log(pastFinds,pastFinds[str], str);
		  /*if ( pastFinds[str] !== undefined ) {
		    whichFind = pastFinds[str];
		  } else {
		    pastFinds[str] = counter;
		    whichFind = counter++;
		  }*/
		  //console.log(pastFinds,pastFinds[str], str, whichFind);
		  for ( var idx = start; idx < start+len; idx++ ) {
		    var key = "#char_"+i+"_"+idx;
		    open[key] = whichFind;
		  }
      }
    }
  }
  return open;
}

var colList = ['#FF6633', '#FFB399', '#aa80aa', '#FFFF99', '#00B3E6', 
'#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
'#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', 
'#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
'#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', 
'#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
'#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', 
'#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
'#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', 
'#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF']; 
String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
function colhash( str) {
  //return Math.abs(str.hashCode()) % colList.length;
  return Math.abs(str.hashCode());
}
function getColor( num ) {
  return "#"+ num.toString(16).slice(0,6);
}
