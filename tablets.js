var transliterations;

function grep_tablets( selection ) {
  var search_str = selection.left.split(" ");
  search_str = search_str.slice(0,search_str.length-1).join(" ");
  search_str += " "+selection.right.trim();
  console.log(search_str);

  var tablets_with_string = [];
  for ( var i = 0; i < transliterations.length; i++ ) {
    if ( transliterations[i].includes(search_str) ) {
      //console.log( transliterations[i] );
      tablets_with_string.push( transliterations[i] );
    }
  }

  $( "#tablet_previews" ).html( '' );
  for ( var i = 0; i < tablets_with_string.length; i++ ) {
    // add preview
    var preview = document.createElement( "div" );
    preview.className = "tablet_preview";
    preview.innerHTML = tablets_with_string[i];
    $( "#tablet_previews" ).append( preview );
  }
}
