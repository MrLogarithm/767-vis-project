var transliterations;

var pages = [];
var search_str_saved = "";
var current_page = 0;

function show_page( n ) {
  current_page = n;

  $( "#tablet_previews" ).html( '' );

  var buttons = document.createElement("div");
  //buttons.className = "tablet_preview";
  buttons.id = "preview_buttons";
  buttons.style= "text-align:center;";
  var nextPg = document.createElement("a");
  nextPg.href="javascript:void(0);";
  nextPg.innerHTML = "&nbsp;&gt; next page&nbsp;";
  nextPg.onclick = function(){show_page(current_page+1);};
  var lastPg = document.createElement("a");
  lastPg.href="javascript:void(0);";
  lastPg.innerHTML = "&nbsp;prev page &lt;&nbsp;";
  lastPg.onclick = function(){show_page(current_page-1);};
  if ( current_page > 0 ) {
    buttons.appendChild( lastPg );
  }
  if ( current_page < Math.ceil(pages.length/5)-1 ) {
    buttons.appendChild( nextPg );
  }
  $( "#tablet_previews" ).append( buttons );


  var search_str = search_str_saved;
  var tablets_with_string = pages.slice(5*n,5*(1+n));
  var hilites = myDiff( tablets_with_string, search_str );
  //console.log(hilites);

  for ( var i = 0; i < tablets_with_string.length; i++ ) {
    var hilite = false;
    var color = "";
    // add preview
    var preview = document.createElement( "div" );
    preview.className = "tablet_preview";
    var split_tablet = tablets_with_string[i];
    preview.innerHTML = "<a href='https://cdli.ucla.edu/search/archival_view.php?ObjectID="+split_tablet[0]+"'>"+split_tablet[0]+"</a><br/>"; // CDLI Number
    for ( var j = 1; j < split_tablet.length; j++ ) {
      //preview.innerHTML += "<img src='pngs/PE_mainforms/"+"M388"+".png' alt='"+split_tablet[j]+"' style='height:12px;width:12px;'/>";
	preview.innerHTML += "<span id='char_"+i+"_"+j+"'>"+split_tablet[j]+" </span>";
    }
    $( "#tablet_previews" ).append( preview );
  }
  for ( var key in hilites ) {
    //console.log("DEBUG",key,hilites[key],getColor(hilites[key]));
    $( key ).css("background-color",getColor(hilites[key]));
  }
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
	  if (str.includes("N") || !str.includes("M")){
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
		  var whichFind;
		  //console.log(pastFinds,pastFinds[str], str);
		  if ( pastFinds[str] !== undefined ) {
		    whichFind = pastFinds[str];
		  } else {
		    pastFinds[str] = counter;
		    whichFind = counter++;
		  }
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
		  var whichFind;
		  //console.log(pastFinds,pastFinds[str], str);
		  if ( pastFinds[str] !== undefined ) {
		    whichFind = pastFinds[str];
		  } else {
		    pastFinds[str] = counter;
		    whichFind = counter++;
		  }
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

function getColor( num ) {
  return ['#FF6633', '#FFB399', '#FF33FF', '#FFFF99', '#00B3E6', 
		  '#E6B333', '#3366E6', '#999966', '#99FF99', '#B34D4D',
		  '#80B300', '#809900', '#E6B3B3', '#6680B3', '#66991A', 
		  '#FF99E6', '#CCFF1A', '#FF1A66', '#E6331A', '#33FFCC',
		  '#66994D', '#B366CC', '#4D8000', '#B33300', '#CC80CC', 
		  '#66664D', '#991AFF', '#E666FF', '#4DB3FF', '#1AB399',
		  '#E666B3', '#33991A', '#CC9999', '#B3B31A', '#00E680', 
		  '#4D8066', '#809980', '#E6FF80', '#1AFF33', '#999933',
		  '#FF3380', '#CCCC00', '#66E64D', '#4D80CC', '#9900B3', 
		  '#E64D66', '#4DB380', '#FF4D4D', '#99E6E6', '#6666FF'][num]
}
