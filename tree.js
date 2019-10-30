var ngram_counts;
var embeddings;

// Set the dimensions and margins of the diagram
var margin = {top: 20, right: 20, bottom: 20, left: 20},
    width =  795 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;
var imgsize = 35;

var tree_zoom_handler = d3.zoom()
.on("zoom", function() {
  // Disable move on scroll
  //console.log(d3.event.transform);
});

function scrollMapTransform( d ) {
  var offset = scrollMap(d);
  return "translate("+d.y+","+offset+")";
}
function scrollMap( d ) {
    //console.log(d.x + " " + d.data.name);
    var half_ht = height/2;
    var offset;
  var dispersion = (20-parseInt(document.getElementById("slider_dispersion").value))/20;
  // TODO customize focus bubble size or adjust to tree density
    if ( d.x <= focus_height ) {
      offset = half_ht * (1 - Math.abs((d.x-focus_height)/focus_height)**dispersion);
    } else {
      offset = half_ht * (1 + ((d.x-focus_height)/(height - focus_height))**dispersion);
    }
    return offset;
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
.call(tree_zoom_handler)

function wheelHandler(){
  if (d3.event){
  focus_height += d3.event.deltaY;
  focus_height = (focus_height < 0) ?
    0 :
    (focus_height > height) ?
      height :
      focus_height;
  }

  $("#center_sign").css('top', scrollMap(root.left)+40);
  d3.selectAll("g.node").attr("transform", scrollMapTransform)

  d3.selectAll('path.link')//.transition()
      //.duration(duration)
      .attr('d', function(d){ return diagonal(d, d.parent) });
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


function change_focus() {
  var new_focus = document.getElementById("center_sign").value;
  ctx.left  = new_focus;
  ctx.right = new_focus;
  // change left and right contexts
  // collapse and redraw trees
  // find similar signs in embedding space
  // redraw vertical suggestion bar with similar signs
  root = {"left":null, "right":null};
  prune = {"left":null, "right":null};
  selected = {"left":[], "right":[]};
  setup("left");
  setup("right");
  //console.log("hello " + new_focus);
}

// Memoization speeds this up by a factor of ~10!
var memoize = new Object();
function get_treedata( sign, depth, dir ) {

  // TODO if string does not exist in corpus does this add it permanently to memoize?
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


function setup( dir, reselect=false ) {
  // Full tree rooted in focussed sign:
  var treeData = get_treedata(
    document.getElementById("center_sign").value,
    document.getElementById("center_sign").value.split(" ").length,
    dir
  );

  root[dir]  = d3.hierarchy(
    treeData,
    function(d) { return d.children; }
  );
  root[dir].x0 = height / 2;
  root[dir].y0 = width / 2;
  root[dir].data.name = document.getElementById("center_sign").value;

  root[dir].all_children = root[dir].children;
  // Collapse after the second level
  if (root[dir].children) {
    root[dir].children.forEach(collapse);
    root[dir].children.forEach(function(d){expand_selected(d, dir);});
  }
  update(root[dir],  dir, propagate=false, reselect=reselect);
  refresh_pruned_tree(dir);
  recolor(root[dir],dir,prune[dir]);
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
function recolor(node,dir,prune) {
  // root is always in common
  // for each child, if not exist, remove click() and grey out
  if ( node.children ) {
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
	//console.log("No!");
        //d3.selectAll("#"+dir+"_"+(node.depth+1)+"_"+node.children[i].data.name+"_img").style("filter","invert(0)");
        recolor(node.children[i], dir, prune.children[k]);
      } else {
	//console.log("Yes!");
        //d3.selectAll("#"+dir+"_"+(node.depth+1)+"_"+node.children[i].data.name).style("fill","#555");
        //grey( d3.selectAll("#"+dir+"_"+(node.depth+1)+"_"+node.children[i].data.name) );
        grey( node.children[i], dir );

        //d3.selectAll("#"+dir+"_"+(node.depth+1)+"_"+node.children[i].data.name+"_img").style("filter","invert(1)");
      }
    }
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

function update(source, dir="right", propagate=false, reselect=false) {

  //console.log("Reselect?");
  //console.log(reselect);
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
  if ( reselect ) {
    //console.log("Not changing the selection, because I'm just pruning the tree");
  } else {
    if ( source.children ) {
      //console.log("I think you expanded " + source.data.name);
      selected[dir] = [source];
      ctx[dir] = source.data.name;
    } else {
      //console.log("I think you collapsed " + source.data.name);
      selected[dir] = [];
      ctx[dir] = "";
    }
    if (source.depth > 0) {
      var ptr = source;
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
  if (propagate) {
    //console.log("need to update ~"+dir+"  tree with ctx " + ctx[dir]);
    var otherDir = ( dir == "left" ) ? "right" : "left";
    update(root[otherDir],  otherDir, propagate=false, reselect=true);
    refresh_pruned_tree(otherDir);
    recolor(root[otherDir],otherDir,prune[otherDir]);
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
      .attr("transform", function(d) {
        return "translate(" + source.y0 + "," + source.x0 + ")";
       });

  nodeEnter
      .filter(function(d){
	return (d.children || d._children)
      })
      .on('click', function(d){click(d,dir)})
      .attr('cursor', 'pointer')
  .on('scroll', function() {
    console.log("hi");
  });

  ;

  // Add Circle for the nodes
  nodeEnter
      .filter(function(d){
        return d.parent;
      })
      .append('circle')
      .attr('id', function(d){return dir+"_"+d.depth+"_"+d.data.name})
      .attr('class', "node "+dir)
      .attr('r', imgsize/2.5)
      .style("fill","red")
      .attr('cy', 0)
      .attr('cx',imgsize/2 - (dir=="left"?imgsize:0))
      .attr('width', imgsize)
      .attr('height', imgsize)
  ;
  nodeEnter
      .filter(function(d){
        return d.parent;
      })
      .append('image')
      .attr('id', function(d){return dir+"_"+d.depth+"_"+d.data.name+"_img"})
      .attr('y', -imgsize/2)
      .attr('x',(dir=="left")?-imgsize:0)
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr("href",function(d){return "pngs/PE_mainforms/"+d.data.name+".trans.png";})
  ;

  // Add labels for the nodes
  nodeEnter.append('text')
        .attr("dy", function(d) {
          return ( d.data.name == "unk" || d.data.name == "X" )
	    ? "5"
	    : "-1.15em";
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
	      ? d.data.name.replace("unk","[...]").replace("x","+")
	      : "" );
        });

  // UPDATE
  var nodeUpdate = nodeEnter.merge(node);

  // Transition to the proper position for the node
  nodeUpdate.transition()
    .duration(duration)
    .attr("transform", scrollMapTransform
      //function(d) {
        //return "translate(" + d.y + "," + d.x + ")";
     //}
    );

  /*
  // Update the node attributes and style
  nodeUpdate.select('circle.node.'+dir)
    //.attr('r', 10)
    //.style("fill", function(d) {
        //return d._children ? "lightsteelblue" : "#fff";
    //})
  ;*/


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
      });

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

  // Creates a curved (diagonal) path from parent to the child nodes

  d3.selectAll("circle.node."+dir).style("fill",function(d){
    if (( selected[dir][d.depth] ) && (selected[dir][d.depth].data.name == d.data.name )) {
      return "#afa";
    } else {
      return d.children||d._children ? "lightsteelblue" : "#000";
    }
  });

  refresh_pruned_tree(dir);
  recolor(root[dir],dir,prune[dir]);

  grep_tablets( ctx );
}


  function click(d, dir) {
    if (d.children) {
      d._children = d.children;
      d.children = null;
    } else {
      d.children = d._children;
      if (d.children){
        d.children.forEach(collapse);
      }
      d._children = null;
    }
    // Collapse sibling nodes to save space
    // TODO Option to disable this? Might
    // want to compare multiple subtrees.
    /*
    if ( d.parent ) {
      d.parent.children.filter(
	function(dd){
	  return d.data.name != dd.data.name
	}).forEach(collapse);
    }
    //*/
    //console.log("updating other side:");
    //console.log("source is");
    //console.log(d);
    //console.log(dir);
    update(d,dir=dir,propagate=true,reselect=false);
  }
  function diagonal(s, d) {

    path = `M ${s.y} ${scrollMap(s)}
            C ${(s.y + d.y) / 2} ${scrollMap(s)},
              ${(s.y + d.y) / 2} ${scrollMap(d)},
              ${d.y} ${scrollMap(d)}`

    return path
  }

