//////////////////////////////////////////////////
// tablets.js : displays the tablet previews
// with highlighting, split into pages of 5
// tablets each.
//
// Code by Logan Born

// Variables to make state 
// persistent across function 
// calls:
var transliterations;
var pages = [];
var search_str_saved = "";
var current_page = 0;

// Prints a page of tablets
// to the display. n should
// be +1 (for next page) or
// -1 (for previous page)
function show_page( n ) {

    // Increment page counter:
    current_page += n;
    n = current_page;

    // Erase last page of tablets:
    $("#tablet_previews").html('');

    // add "next page" and "previous page" buttons:
    var buttons = document.createElement("div");
    buttons.id = "preview_buttons";
    buttons.style = "text-align:center;padding-right:4px;";

    var nextPg = document.createElement("a");
    nextPg.href = "javascript:void(0);";
    nextPg.innerHTML = "&nbsp;&gt; next page&nbsp;";
    nextPg.onclick = function() {
        show_page(1);
    };

    var lastPg = document.createElement("a");
    lastPg.href = "javascript:void(0);";
    lastPg.innerHTML = "&nbsp;prev page &lt;&nbsp;";
    lastPg.onclick = function() {
        show_page(-1);
    };
    // Only draw buttons if there is actually 
    // a next/last page to go to:
    if (current_page > 0) {
        buttons.appendChild(lastPg);
    }
    if (current_page < Math.ceil(pages.length / 5) - 1) {
        buttons.appendChild(nextPg);
    }
    $("#tablet_previews").append(buttons);



    // Load the search string (the set of
    // nodes the user has selected in the tree):
    var search_str = search_str_saved;
    // Retrieve the correct page of tablets:
    var tablets_with_string = pages.slice(5 * n, 5 * (1 + n));
    // Make a deep copy so we don't change the pages array:
    var rotated = [...pages];
    // Look for repeated strings. Uses the 5 tablets currently
    // on display plus the next 5 pages of tablets. Doesn't use
    // all of the tablets for reasons of time.
    var hilites = myDiff( 
      rotated.rotate(5 * n).slice(0, 30), 
      search_str
    );

    // Draw the tablets to the page:
    for (var i = 0; i < tablets_with_string.length; i++) {
        var hilite = false;

        // div to hold this tablet:
        var preview = document.createElement("div");
        preview.className = "tablet_preview";

        // Fetch tablet content, with line breaks already inserted:
        var split_tablet = tablets_with_string[i];
        // Print tablet's CDLI catalogue number and a link
        // to the tablet's archival record on the CDLI website:
        preview.innerHTML = "<a href='https://cdli.ucla.edu/search/archival_view.php?ObjectID=" 
	  + split_tablet[0] // split_tablet[0] = the CDLI number
	  + "'>" 
	  + split_tablet[0] 
	  + "</a><br/>";
        var content = "<p>";
        for (var j = 1; j < split_tablet.length; j++) {
	    // Too slow to draw the sign images like this:
            //preview.innerHTML += "<img src='pngs/PE_mainforms/"+"M388"+".png' alt='"+split_tablet[j]+"' style='height:12px;width:12px;'/>";
	    // Convert line breaks to p tags for nicer display:
            if (split_tablet[j] == "<br/>") {
                content += "</p><p>"
            } else {
	        // id uniquely defines this sign as the jth character
	        // in the ith tablet. Id will be used for highlighting.
                content += "<span id='char_" + i + "_" + j + "'>" + split_tablet[j] + " </span>";
            }
        }
        preview.innerHTML += content;
        $("#tablet_previews").append(preview);
    }

    // hilites contains list of indices of characters that should be
    // highlighted. Iterate and highlight each one:
    for (var key in hilites) {
        // Highlight the background:
        $(key).css("background-color", getColor(hilites[key]));
        // Make sure text stands out against background:
        $(key).css("color", invertColor(getColor(hilites[key]), bw = true));
    }
}

// Given a set of selected nodes, construct a
// search string, find tablets containing 
// that string, and save them in an array.
function grep_tablets( selection ) {
    // Convert the list of selected nodes into
    // a search string:
    var search_str = selection.left.split(" ");
    // Remove the sign(s) in the central search box
    // from the string: these signs are also included
    // in selection.right, so if we don't remove them
    // they'll be duplicated:
    search_str = search_str.slice(
      0, 
      search_str.length - (document.getElementById("center_sign").value.split(" ").length)
    ).join(" ");
    // Add the signs from the right subtree:
    search_str += " " + selection.right;
    // Some characters aren't valid in HTML ids. Replace these
    // with HTML-safe characters so we can use the sign names
    // as class names or HTML element ids:
    search_str = search_str
      .replace("x", "+")
      .replace("lpar", "(")
      .replace("rpar", ")")
      .replace("unk", "[...]")
      .replace("x", "+");
    // This fixes compound glyphs like "|M288+M218|", which
    // should be converted to M288xM218 in order to be HTML-safe:
    while (/( |^)([^ |]*\+[^| ]*)( |$)/.test(search_str)) {
        //console.log("replace",search_str);
        search_str = search_str.replace(/( |^)([^ |]*\+[^| ]*)( |$)/,
            function(match, p1, p2, p3) {
                return " |" + p2 + "| "
            }
        )
    }
    search_str = search_str.trim();


    // Find tablets containing this string:
    var tablets_with_string = [];
    for (var i = 0; i < transliterations.length; i++) {
        // Add space to account for sign variants:
        // M218~a != M218!
        if ((transliterations[i] + " ").includes(search_str + " ")) {
            tablets_with_string.push(transliterations[i].split(" "));
	}
    }
    // Save search results:
    pages = tablets_with_string;
    // Sort by length. This makes the display slightly
    // nicer, since there aren't so many big gaps of
    // whitespace between tablet previews. TODO in the
    // future: manually position previews so this step
    // isn't needed.
    pages = pages.sort(function(b, a) {
        return a.length - b.length
    });
    // Save search string for use by other functions:
    search_str_saved = search_str;
    // Display the first page of results:
    current_page = 0;
    show_page(0);
}

// Finds strings that are repeated across multiple
// tablets. Returns a dictionary of indices specifying
// which strings are repeated and where they occur.
function myDiff( files, search_str ) {

    // Dictionary of places where a highlited string begins:
    var highlight_dict = new Object();

    // For every tablet in the selection...
    for (var i = 0; i < files.length; i++) {
        for (var j = i + 1; j < files.length; j++) {
	    // For every string of length 2 to 5...
	    // (TODO precompute all of these strings so we
	    // can highlight things longer than length 5
	    // without being too slow)
            for (var len = 5; len > 1; len--) {
	        // For every possible starting position in the first tablet...
                for (var start = 0; start < files[i].length - len + 1; start++) {
		    // Find the string at this position in the first tablet:
                    var str = files[i].slice(
		      start, 
		      start + len
		    ).join(" ");
		    // Skip over the string if it contains numbers, 
		    // X, ..., or doesn't contain an M-sign: don't want
		    // the view cluttered by useless highlights showing
		    // places where tablets are damaged.
                    if (
		         str.includes("N") 
		      || !str.includes("M") 
		      || str.includes("...") 
		      || str.includes("X") 
		      || str.includes("br")
		    ) {
                        continue;
                    }

		    // Both strings must be the same length, else they
		    // can't possibly be equal to each other:
                    var len2 = len;
		    // For every possible starting position in the second tablet...
                    for (var start2 = 0; start2 < files[j].length + 1 - len2; start2++) {
		        // Get the string at this position:
                        var str2 = files[j].slice(
			  start2, 
			  start2 + len2
			).join(" ");
		        // Does this string occur in both tablets?
                        if ( str == str2 ) {
                            var skip = false; 
			    // Double check that this character isn't already being
			    // highlighted as part of another string:
                            for (var idx = start; idx < start + len; idx++) {
                                var key = "#char_" + i + "_" + idx;
                                if (highlight_dict[key]) {
			            // Don't re-color something that's
				    // already part of another highlighted
				    // section:
                                    skip = true;
                                }
                            }
                            for (var idx = start2; idx < start2 + len2; idx++) {
                                var key = "#char_" + j + "_" + idx;
                                if (highlight_dict[key]) {
			            // Don't re-color something that's
				    // already part of another highlighted
				    // section:
                                    skip = true;
                                }
                            }

			    // If this string isn't highlighted yet,
                            if (!skip) {
			        // Get a hash value based on the string
			        // being highlighted:
                                var hash = colhash( str.trim() );
                                for (var idx = start; idx < start + len; idx++) {
				    // Record each sign that needs to be highlighted:
                                    var key = "#char_" + i + "_" + idx;
                                    highlight_dict[key] = hash;
                                }
                                for (var idx = start2; idx < start2 + len2; idx++) {
				    // Record each sign that needs to be highlighted:
                                    var key = "#char_" + j + "_" + idx;
                                    highlight_dict[key] = hash;
                                }
                            }
			    // Jump ahead to the end of the highlighted section:
                            start2 += len2;
			}
                    }
                }
            }
        }
    }
    // Also highlight the search string whenever it shows up.
    // Do this as an extra step because the above loop only 
    // highlights strings of length >= 2. If one sign is selected
    // it should still be highlighted:
    for (var i = 0; i < files.length; i++) {
        var len = search_str.trim().split(" ").length;
        for (var start = 0; start < files[i].length - len + 1; start++) {
            var str = files[i].slice(start, start + len).join(" ");
            if (str.trim() == search_str.trim()) {
                var hash = colhash(str.trim());
                for (var idx = start; idx < start + len; idx++) {
                    var key = "#char_" + i + "_" + idx;
                    highlight_dict[key] = hash;
                }
            }
        }
    }
    return highlight_dict;
}

// Obsolete: colors are computed by hashing now.
var colList = [ ];

// Compute the hash value for a string. Take
// absolute value because RGB values can't be
// negative.
function colhash( str ) {
    //return Math.abs(str.hashCode()) % colList.length;
    return Math.abs(str.hashCode());
}

// Convert number to hex, take the first 6 digits,
// and prepend # to get an RGB hex value:
function getColor(num) {
    return "#" + num.toString(16).slice(0, 6);
}

//////////////////////////////////////////////////
// Code below this line is not mine! I made minor
// changes to it but it's mostly taken from the
// sources cited in the comments.

// Array rotation implementation from stackoverflow:
// https://stackoverflow.com/questions/1985260/javascript-array-rotate
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

// invertColor implementation from stackoverflow:
// Used to change text color to be readable against
// a highlighted background.
// https://stackoverflow.com/questions/35969656/how-can-i-generate-the-opposite-color-according-to-current-color
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
        return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 180) ?
            '#000000' :
            '#FFFFFF';
    }
    // invert color components
    r = (255 - r).toString(16);
    g = (255 - g).toString(16);
    b = (255 - b).toString(16);
    function padZero(str, len) {
      len = len || 2;
      var zeros = new Array(len).join('0');
      return (zeros + str).slice(-len);
    }
    // pad each with zeros and return
    return "#" + padZero(r) + padZero(g) + padZero(b);
}

// String hash function from stackoverflow.
//https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
String.prototype.hashCode = function() {
    var hash = 0,
        i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr = this.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

