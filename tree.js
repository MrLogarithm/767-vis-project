// Adapted from https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd

var ngram_counts;
var embeddings;

// Set the dimensions and margins of the diagram
var margin = {top: 20, right: 20, bottom: 20, left: 20},
    width =  795 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;
var imgsize = 35;

var tree_zoom_handler = d3.zoom()
.on("zoom", function() {
  // Disable move on scroll
  //console.log(d3.event.transform);
});

function scaleByPosition( d, offset ) {
  // This is the derivative of the sigmoidDispersion function
  // but scaled so that it has a maximum value of 1
  // (removed the `dispersion' from the numerator and added
  // a factor of 4 to scale to the right height).
  var dx = d.x - focus_height;
  dx /= 100;
  return 4*(Math.exp(-1*dispersion*dx)) / (1 + Math.exp(-1*dispersion*dx))**2;
}
function scrollMapTransform( d ) {
  var offset = scrollMap(d);
  var size = scaleByPosition(d, offset);
  if (document.getElementById("check_scale").checked){
    var scale = scaleByFreq(d);
    var minScale = 0.75;
    scale = scale<minScale?minScale:scale;
    size *= scale;
  }
  return "translate("+d.y+","+offset+") scale("+size+")";
}
function sigmoidDispersion( dx, usable_space ) {
  dx /= 100;
  return height / (1 + Math.exp(-1*dispersion * dx));
}
function polynomialDispersion( dx, space ) {
  var half_ht = height/2;
  if ( dx < 0 ) {
    return half_ht * (1 - Math.abs(dx/space)**dispersion);
  } else {
    return half_ht * (1 + (dx/space)**dispersion);
  }
}
var dispersionMetric = sigmoidDispersion;
//var dispersionMetric = polynomialDispersion;
function scrollMap( d ) {
  // Force root to center
  if ( d === null ) {
    return;
  }
  if ( d == root.left || d == root.right ) {
    d.x = height/2;
  }
  var offset;
  var dx = d.x - focus_height;
  var space = dx < 0 ? focus_height : height-focus_height;
  return dispersionMetric( dx, space );
}

// appends a 'group' element to 'svg'
// moves the 'group' element to the top left margin
var svg_tree = d3.select("#svg_trees")
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate("+ margin.left + "," + margin.top + ")"
    )
;
svg_tree
.append("rect")
.attr("x",0)
.attr("y",0)
.attr("width",width)
.attr("height",height)
.style("fill","white")
.lower()
.on("wheel", wheelHandler)
.call(tree_zoom_handler) // disable scrolling when hovering on tree

var dispersion=1;

function wheelHandler(){
  dispersion = (20-parseInt(document.getElementById("slider_dispersion").value))/50;
  if (d3.event){
    focus_height += d3.event.deltaY;
    focus_height = (focus_height < 0) ?
      0 :
      (focus_height > height) ?
        height :
        focus_height;
  }

  $("#center_sign").css('top', scrollMap(root.left)+280);
  $("#focus_img").css('top', scrollMap(root.left)+240);
  d3.selectAll("g.node").attr("transform", scrollMapTransform)
  ;

  d3.selectAll('path.link')//.transition()
      //.duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) })
  ;
}
/*.enter().append("rect")
.attr("width",width)
.attr("height",height)
.attr("x",0)
.attr("y",0)
.style("fill","white")
.on('scroll',function(test){
  console.log("test");
})*/
;

var i = 0;
var duration = 0;
var root = {"left":null, "right":null};
var prune = {"left":null, "right":null};
var selected = {"left":[], "right":[]};
var ctx = { "left": "M217", "right": "M217" };

// declares a tree layout and assigns the size
var treemap = {
  "left":  d3.tree().size([height, width/2]),
  "right": d3.tree().size([height, width/2])
  };


var corr = "corrections included";
var vars = "variants separate";

var focus_height = height/2;


function change_focus(keep_old_selection=false) {
  var Process = function(start) {
    this.start=start
  }
  Process.prototype.run = function(){
  var new_focus = document.getElementById("center_sign").value;
  while ( /\+|\(|\)|unk|\|/.test(new_focus)) {
    new_focus = new_focus.replace("+","x").replace("(", "lpar").replace(")","rpar").replace("unk","[...]").replace("|","");
  }
  console.log("hello " + new_focus);
  document.getElementById("center_sign").value = new_focus;
  if ( new_focus.split(" ").length == 1 ) {
    $("#focus_img").attr("src", "pngs/PE_mainforms/"+new_focus+".trans.png");
  } else {
    $("#focus_img").attr("src", "");
  }
  //if (keep_old_selection == false) {
    ctx.left  = new_focus;
    ctx.right = new_focus;
  /*} else {
    var mov_dir = keep_old_selection;
    var left_split = ctx.left.split(" ");
    var rigt_split = ctx.right.split(" ");
    if (mov_dir=="left"){
      ctx.left  = left_split.slice(0,left_split.length-1-1);
      ctx.right = new_focus + " " + rigt_split;
    } else {
      ctx.left  = left_split + " " + new_focus;
      ctx.right = rigt_split.slice(1,rigt_split.length-1);
    }
    console.log(ctx);
  }*/
  // change left and right contexts
  // collapse and redraw trees
  // find similar signs in embedding space
  // redraw vertical suggestion bar with similar signs
  root = {"left":null, "right":null};
  prune = {"left":null, "right":null};
  selected = {"left":[], "right":[]};
  //
  for ( var i = 0; i < 2; i++ ) {
    var dir = ["left","right"][i];
    // Full tree rooted in focussed sign:
    console.log(dir);
    var treeData = get_treedata(
      document.getElementById("center_sign").value,
      document.getElementById("center_sign").value.split(" ").length,
      dir
    );

    root[dir]  = d3.hierarchy(
      treeData,
      function(d) { return d.children; }
    );
  }

  try {
    var new_disp = -2*(Math.max(root.left.children.length, root.right.children.length));
    new_disp = new_disp<-250?-250:
      new_disp>-10?0:new_disp;
    console.log(new_disp);
    $("#slider_dispersion").val(new_disp);
    dispersion = (20-new_disp)/50;
  } catch (err) {
    // In case the root doesn't exist yet
  }

    setup("left" );
    setup("right" );
  }
  $("#loading").show();
  $.ajax().done(function(){
    var p = new Process();
    p.run();
    $("#loading").hide();
  });
  $("#center_sign").css('top', scrollMap(root.left)+280);
  $("#focus_img").css('top', scrollMap(root.left)+240);
}

// Memoization speeds this up by a factor of ~10!
var memoize = new Object();
function get_treedata( sign, depth, dir ) {

  if ( memoize[sign+depth+dir] ){
    return memoize[sign+depth+dir];
  } else {

  var children = [];
  var trimmed = (dir=="left")?" "+sign.trim():sign.trim()+" ";
  for ( var k in ngram_counts["corrections included"]["variants separate"] ) {
    if ( 
         (
	   ((dir == "left") && k.endsWith(trimmed)) || 
	   ((dir == "right") && k.startsWith(trimmed))
	 ) &&
         (k.split(" ").length-1 == depth) 
         //&&(ngram_counts["corrections included"]["variants separate"][k] >= 1 )
    ) {
      children.push( get_treedata(k, depth+1, dir) );
    }
  }
  children.sort(
  function(a,b){
    /*var a_count = ngram_counts["corrections included"]["variants separate"][a.name];
    var b_count = ngram_counts["corrections included"]["variants separate"][b.name];
    return a_count > b_count ? 1 : a_count < b_count ? -1 : 0;
    */
    return a.name.localeCompare(b.name);
  });
  var name = sign.split(" ");
  name = (dir == "left") ? name[0] : name[name.length-1];
  if ( children == [] ) {
    memoize[sign+depth+dir] = {"name":name};
  } else {
    memoize[sign+depth+dir] = {"name":name,"children":children};
  }
    return memoize[sign+depth+dir];
  }
}

function noScroll(e) {
  var e0 = e.originalEvent;
  var delta = e0.wheelDelta || -e0.detail;
  this.scrollTop += ( delta < 0 ? 1 : -1 )*30;
  e.preventDefault();
}
function do_initial_tree_setup() {
  d3.select("#center_sign")
    .on("wheel", wheelHandler)
    .on("zoom",function(){})
  ;
  $("#center_sign").on('mousewheel DOMMouseScroll', e=>noScroll(e) )
  ;
  d3.select("#focus_img")
    .on("wheel", wheelHandler)
    .on("zoom",function(){})
  ;
  $('#focus_img').on('mousewheel DOMMouseScroll', e=>noScroll(e) )
  ;
}

function setup( dir ) {
  root[dir].x0 = height / 2;
  root[dir].y0 = width / 2;
  root[dir].data.name = document.getElementById("center_sign").value;

  root[dir].all_children = root[dir].children;
  // Collapse after the second level
  if (root[dir].children) {
    root[dir].children.forEach(collapse);
    root[dir].children.forEach(function(d){expand_selected(d, dir);});
  }

  refresh_pruned_tree(dir);
  prune_incompatible(root[dir],dir,prune[dir]);
  update(root[dir],  dir, propagate=false);
  // update changes ctx based on new selections

}


function refresh_pruned_tree( dir ) {
  // Tree data constrained by the current selection:
  var otherDir = (dir == "left") ? "right" : "left";
  var treeData_pruned = get_treedata(
    ctx[otherDir],
    ctx[otherDir].split(" ").length,
    dir
  );
  prune[dir] = d3.hierarchy(treeData_pruned, function(d){ return d.children});
}
function grey(node, dir){
  var n=d3.selectAll("#"+dir+"_"+(node.depth)+"_"+node.data.name);
  n.style("fill","#555");
  if ( node.children ) {
    node.children.forEach( function(d){grey(d,dir)} );
  }
}
function prune_incompatible(node,dir,prune) {
  // root is always in common
  // for each child, if not exist, remove click() and grey out
  if ( node.pruned ) {
    if ( node.collapsed ) {
    }else{
    node.children = node._children;
    node.pruned=false;
    }
  }
  if ( node.children ) {
    var newChildren = [];
    for ( var i = 0; i < node.children.length; i++ ) {
      //console.log("Should I prune"+node.children[i].data.name+"?");
      var found = false;
      var foundIndex = 0;
      if (prune.children){
	for ( var k = 0; k < prune.children.length; k++ ) {
	  //console.log( 
	    //"DEBUG",
	    //node.children[i].data.name,
	    //prune.children[k].data.name,
	    //node.children[i].data.name == prune.children[k].data.name 
	  //);
	  if ( node.children[i].data.name == prune.children[k].data.name ) {
	    found = true;
	    break;
	  }
        }
      }
      if (found) {
	newChildren.push( node.children[i] );
        prune_incompatible(node.children[i], dir, prune.children[k]);
      } else {
	grey( node.children[i], dir );
      }
    }
    //node._children = node.children;
    //node.children = newChildren;
    //node.pruned = true;
    console.log("new children",newChildren);
    if (!node.collapsed) {
    node._children = node.children;
    }
    node.children = newChildren;
    node.pruned = true;
  }
}
function expand_selected(d, dir) {
  //console.log(d.data.name);
  //console.log("selected["+dir+"]:");
  //console.log(selected[dir]);
  if ( (selected[dir][d.depth]) && (selected[dir][d.depth].data.name == d.data.name) ) {
    console.log("I should expand the node " + d.data.name);
    d.children = d._children;
    if (d.children) {
      d.children.forEach(collapse);
      d.children.forEach(function(dd){expand_selected(dd,dir)});
    }
    } else if (d.children) {
      d.children.forEach(collapse);
    }
}
// Collapse the node and all it's children
function collapse(d) {
  if(d.children) {
    d._children = d.children
    d._children.forEach(collapse)
    d.children = null
  }
}

function update(source, dir="right", propagate=false) {

  //console.log("Reselect?");
  //console.log("Propagate?");
  //console.log(propagate);
  // todo get list of parent nodes - these specify the search string
  // update list of tablet previews with this string

  // Assigns the x and y position for the nodes
  var treeData = treemap[dir](root[dir]);

  // Compute the new tree layout.
    var nodes = treeData.descendants().filter( function(d){return true;}),
      links = treeData.descendants().filter( function(d){return true;}).slice(1);

  // Normalize for fixed-depth.
  var LAYER_SPACE, ROOT_OFFSET;
  if ( dir == "left" ) {
    LAYER_SPACE = -65;
    ROOT_OFFSET = 0;
  } else {
    LAYER_SPACE = 65;
    ROOT_OFFSET = 0;
  }
  nodes.forEach(function(d){ d.y = (ROOT_OFFSET + width / 2) + d.depth * LAYER_SPACE; });
  if (propagate) {
    //console.log("need to update ~"+dir+"  tree with ctx " + ctx[dir]);
    var otherDir = ( dir == "left" ) ? "right" : "left";
    refresh_pruned_tree(otherDir);
    prune_incompatible(root[otherDir],otherDir,prune[otherDir]);
    update(root[otherDir],  otherDir, propagate=false);
  }
  ctx[dir] = ctx[dir].trim();
  //console.log(ctx[dir], dir);

  // ****************** Nodes section ***************************

  // Update the nodes...
  var node = svg_tree.selectAll('g.node.'+dir)
      .data(nodes, function(d) {return d.id || (d.id = ++i); });

  // Enter any new nodes at the parent's previous position.
  var nodeEnter = node.enter().append('g')
      .attr('class', 'node '+dir)
      //.attr("transform", function(d) {
      //  return "translate(" + source.y0 + "," + source.x0 + ")";
      // })
  ;

  nodeEnter
      .filter(function(d){
	return (d.children || d._children)
      })
      .on('click', function(d){click(d,dir)})
      .attr('cursor', 'pointer')
  ;

  // Add Circle for the nodes
  nodeEnter
      .filter(function(d){
        return d.parent;
      })
      .append('circle')
      .attr('id', function(d){return dir+"_"+d.depth+"_"+d.data.name})
      .attr('class', "node "+dir)
      .attr('r', imgsize/3)
      .style("fill","red")
      .attr('cy', 0)
      .attr('cx',imgsize/2 - (dir=="left"?imgsize:0))
      .attr('width', imgsize)
      .attr('height', imgsize)
      .on("wheel", wheelHandler)
      .on("zoom",function(){}) // disable scrolling when hovering on tree
  ;
  nodeEnter
      .filter(function(d){
        return d.parent;
      })
      .append('image')
      .classed("node",true)
      .attr('id', function(d){return dir+"_"+d.depth+"_"+d.data.name+"_img"})
      .attr('y', -imgsize/2)
      .attr('x',(dir=="left")?-imgsize:0)
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr("href",function(d){return "pngs/PE_mainforms/"+d.data.name+".trans.png";})
      .attr("onerror", "this.style.display='none'")
      .on("wheel", wheelHandler)
      .on("zoom",function(){}) // disable scrolling when hovering on tree
  ;

  // Add labels for the nodes
  nodeEnter.append('text')
        .attr("dy", function(d) {
          return ( d.data.name == "unk" || d.data.name == "X" 
	           || d.data.name == "BEGIN" || d.data.name == "END" )
	    ? "5"
	    : "-1em";
	})
        .attr("dx", function(d){
	  return (dir=="left")
	    ? -imgsize/2
	    :  imgsize/2
        })
        .attr("text-anchor", "middle")
        .text(function(d) {
          return (d.depth == 0)
	    ? ""
	    : (d.children || d._children
	      ? d.data.name
	           .replace("unk","[...]")
	           .replace("x","+")
	           .replace('lpar','(')
	           .replace('rpar',')')
	      : ( dir == "left" ? "<boe>": "<eoe>" ) );
        })
.on("wheel", wheelHandler)
.on("zoom",function(){}) // disable scrolling when hovering on tree
  ;

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", scrollMapTransform
    );

  // Remove any exiting nodes
  var nodeExit = node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) {
          return "translate(" + source.y + "," + source.x + ")";
      })
      .remove();

  // On exit reduce the opacity of text labels
  nodeExit.select('text')
    .style('fill-opacity', 1e-6);

  // ****************** links section ***************************

  // Update the links...
  var link = svg_tree.selectAll('path.link.'+dir)
      .data(links, function(d) { return d.id; });

  // Enter any new links at the parent's previous position.
  var linkEnter = link.enter().insert('path', "g")
      .attr("class", "link "+dir)
      .attr('d', function(d){
        var o = {x: 
	  source.x0
	  , y: source.y0}
        return diagonal(o, o)
      })
.on("wheel", wheelHandler)
.on("zoom",function(){}) // disable scrolling when hovering on tree
  ;

  // UPDATE
  var linkUpdate = linkEnter.merge(link);

  // Transition back to the parent element position
  linkUpdate//.transition()
      //.duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });

  // Remove any exiting links
  var linkExit = link.exit().transition()
      .duration(duration)
      .attr('d', function(d) {
        var o = {x: source.x, y: source.y}
        return diagonal(o, o)
      })
      .remove();

  // Store the old positions for transition.
  nodes.forEach(function(d){
    d.x0 = d.x;
    d.y0 = d.y;
  });

  d3.selectAll("circle.node."+dir).style("fill",function(d){
    if (( selected[dir][d.depth] ) && (selected[dir][d.depth].data.name == d.data.name )) {
      return "#d3f091";
    } else {
      return d.children||d._children ? "white" : "#eee";
    }
  });

  //refresh_pruned_tree(dir);
  //prune_incompatible(root[dir],dir,prune[dir]);

  console.log(propagate,ctx);
    grep_tablets( ctx );

  $('.node').on('mousewheel DOMMouseScroll', e=>noScroll(e) )
  $('.link').on('mousewheel DOMMouseScroll', e=>noScroll(e) )
}


  function click(d, dir) {
    current_page = 0;
    if ( document.getElementById('check_recenter').checked ) {
      document.getElementById('center_sign').value = d.data.name;
      change_focus(keep_old_selection = dir);
    } else {
      if (d.children) {
        //d._children = d.children;
        d.children = null;
	d.pruned=false;
      } else {
        d.children = d._children;
        if (d.children){
          d.children.forEach(collapse);
        }
        //d._children = null;
      }
      // Collapse sibling nodes to save space
      // TODO Option to disable this? Might
      // want to compare multiple subtrees.
      ///*
      if ( d.parent ) {
        /*d.parent.children.filter(
	  function(dd){
	    return d.data.name != dd.data.name
	  }).forEach(
	    collapse
	  );//*/
	// Hide siblings to save space:
	if ( document.getElementById("check_hidesibs").checked ) {
	  if (d.parent.collapsed) {
	    d.parent.children = d.parent._children;
	    d.parent.collapsed = false;
	  } else {
	    d.parent._children = d.parent.children;
	    d.parent.children = [d];
	    d.parent.collapsed = true;
	  }
	}
      }


    {
    if ( d.children ) {
      //console.log("I think you expanded " + d.data.name);
      selected[dir] = [d];
      ctx[dir] = d.data.name;
    } else {
    //  console.log("I think you collapsed " + d.data.name);
      selected[dir] = [];
      ctx[dir] = "";
    }
    if (d.depth > 0) {
      var ptr = d;
      while ( ptr.parent !== null ) {
        ptr = ptr.parent;
        selected[dir].push(ptr);
        if ( dir == "left" ) {
          ctx[dir] += " " + ptr.data.name;
        } else {
          ctx[dir] = ptr.data.name + " " + ctx[dir];
        }
      }
    }
    ctx[dir] = ctx[dir].trim();
    selected[dir].reverse();
    }



      //*/
      //console.log("updating other side:");
      //console.log("source is");
      //console.log(d);
      //console.log(dir);
      //update(d,dir=dir,propagate=true);
  // make sure no children of the clicked node are incompatible:
      refresh_pruned_tree(dir);
      prune_incompatible(root[dir],dir,prune[dir]);
      update(d,  dir=dir, propagate=true);
    }
  }
  function diagonal(s, d) {

    path = `M ${s.y} ${scrollMap(s)}
            C ${(s.y + d.y) / 2} ${scrollMap(s)},
              ${(s.y + d.y) / 2} ${scrollMap(d)},
              ${d.y} ${scrollMap(d)}`

    return path
  }

  function scaleToggle(){
  }
  function scaleByFreq(d){
    if ( d.data.name == "BEGIN" || d.data.name == "END" ) {
      return 0.5;
    }
    var freq = Math.log(ngram_counts["corrections included"]["variants separate"][d.data.name])/(Math.log(10)*2);
    //console.log(freq);
    if (freq !== undefined) {
      return freq;
      //return 1;
    }
    console.log("ERROR!",d);
  }
