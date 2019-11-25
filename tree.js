///////////////////////////////////////////////
// Collapsible tree to display left and right
// neighbors of a sign. Original d3 implementation 
// of a collapsible tree found at
// https://bl.ocks.org/d3noob/43a860bc0024792f8803bba8ca0d5ecd
//
// The code in this file is a complete reimplementation
// of the above, extended to add a variety of features
// including...
// - scrolling
// - node spacing and scaling for readability
// - options to scale nodes by frequency
// - bidirectional structure, where interactions
//   with one side of the tree affect the other side and 
//   vice versa.
// This code is my own work, with the exception of a few minor
// details such as the code to set up the figure margins, which
// is left over from the implementation on bl.ocks.org.
// - Logan Born

// Variables to store 
var ngram_counts;
var embeddings; /* not currently used */

// Margins and figure dimensions:
var margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
    },
    width = 795 - margin.left - margin.right,
    height = 700 - margin.top - margin.bottom;
// Size of sign images in the tree nodes:
var imgsize = 35;
// How much to space out the nodes in the tree:
var dispersion = 1;

// Pointers to the root nodes:
var root = {
    "left": null,
    "right": null
};
// Pruned versions of the tree (nodes that
// are incompatible with the user selection
// are removed from this version of the tree):
var prune = {
    "left": null,
    "right": null
};
// Record selected nodes:
var selected = {
    "left": [],
    "right": []
};
// Similar to selected[], but stored
// as a string instead of a list.
var ctx = {
    "left": "M217",
    "right": "M217"
};
// Use d3's tree layout so we don't have to manually
// define parent/child pointers:
var treemap = {
    "left": d3.tree().size([height, width / 2]),
    "right": d3.tree().size([height, width / 2])
};
// Need to specify which version of the ngram counts
// to use for computing sign frequency. By default we
// count <corrected signs!> and keep variant~s separate.
var corr = "corrections included";
var vars = "variants separate";
// Focal line starts in middle of tree.
var focus_height = height / 2;
// Counter to assign ids to nodes.
var nodeId = 0;

// Empty function used to disable
// page movement when the user scrolls
// (we want to scroll the tree instead
// of the page):
var tree_zoom_handler = d3.zoom()
    .on("zoom", function() {
    });
// Sometimes tree_zoom_handler doesn't work?
// Not sure why we need this function too but
// for some reason we do or else the page scrolls.
function disable_mousewheel_scroll( e ) {
    var event_ = e.originalEvent;
    // Get scroll amount:
    var delta = event_.wheelDelta || -event_.detail;
    // Undo scroll movement:
    this.scrollTop += (delta < 0 ? 1 : -1) * 30;
    // Stop other handlers from doing things with this event:
    e.preventDefault();
}


// Compute node size based on position relative
// to the focal line. d is the item being scaled
// and offset is the item position.
function scaleByPosition(d, offset) {
    // This is the derivative of the sigmoidDispersion function
    // but scaled so that it has a maximum value of 1
    // (removed the `dispersion' from the numerator and added
    // a factor of 4 to scale to the right height).
    var dx = d.x - focus_height;
    dx /= 100; // Falloff is way too fast without this
    return 4 * (Math.exp(-1 * dispersion * dx)) / (1 + Math.exp(-1 * dispersion * dx)) ** 2;
}

// Transformation to adjust item positions when the
// user scrolls through the tree. 
function scrollMapTransform(d) {
    // offset is the item position after applying
    // the sigmoid position adjustment.
    var offset = scrollMap(d);
    // Get item scale based on proximity to the focal point:
    var size = scaleByPosition(d, offset);
    // If user wants to scale items by frequency...
    if ( document.getElementById("check_scale").checked ) {
        // Get the amount to scale by:
        var scale = scaleByFreq(d);
        // TODO should there be a minimum scale
        // or can we let rare items become invisibly tiny?
        // Since hapaxes are relevant to PE research
        // we probably don't want things too small.
        var minScale = 0.75;
        scale = scale < minScale ? minScale : scale;
        size *= scale;
    }
    // Return new position and scale:
    return "translate(" + d.y + "," + offset + ") scale(" + size + ")";
}

// Function to add space between nodes and adjust their position
// relative to a focal line. Uses a sigmoid function to give
// smooth dropoff between focused and unfocused areas.
// dx is distance of object to the focal line, and usable_space
// is the distance from the line to the nearest edge of the figure
function sigmoidDispersion(dx, usable_space) {
    dx /= 100;
    return height / (1 + Math.exp(-1 * dispersion * dx));
}

// Function to add space between nodes and adjust their position
// relative to a focal line. Uses a polynomial which doesn't 
// give very nice dropoff between focused and unfocused areas,
// but does let you cluster things near the center to make the
// peripheral nodes readable, which is kind of neat.
// dx is distance of object to the focal line, and usable_space
// is the distance from the line to the nearest edge of the figure
function polynomialDispersion(dx, space) {
    var half_ht = height / 2;
    if (dx < 0) {
        return half_ht * (1 - Math.abs(dx / space) ** dispersion);
    } else {
        return half_ht * (1 + (dx / space) ** dispersion);
    }
}

// We want to use the sigmoid function because it looks better:
var dispersionMetric = sigmoidDispersion;
//var dispersionMetric = polynomialDispersion;

// Given an item d, compute d's new position after applying the
// chosen dispersion function:
function scrollMap(d) {

    if (d === null) {
        return;
    }
  
    // Force root to the middle of the tree.
    if (d == root.left || d == root.right) {
        d.x = height / 2;
    }

    var dx = d.x - focus_height;
    var space = dx < 0 ? focus_height : height - focus_height;
    return dispersionMetric(dx, space);
}

// Set up svg for holding the trees:
var svg_tree = d3.select("#svg_trees")
    // Set figure dimensions:
    .attr("width", width + margin.right + margin.left)
    .attr("height", height + margin.top + margin.bottom)
    // Add container for figure elements:
    .append("g")
    // Add figure margins:
    .attr("transform",
        "translate(" + margin.left + "," + margin.top + ")"
    )
;

// Add a white background to capture mouse events
// so that the user doesn't have to hover over a 
// node in order to scroll:
svg_tree
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height)
    .style("fill", "white")
    .lower()
    .on("wheel", wheelHandler) // Make the tree scroll when the mouse wheel moves
    .call(tree_zoom_handler) // But disable the rest of the page from scrolling
;

// Detects mousewheel events and scrolls the tree contents:
function wheelHandler() {
    // Compute dispersion based on the value of the slider:
    // Adding 20 keeps the minimum value for the slider from
    // looking too cramped. Dividing by 50 makes sure each step
    // of the slider is only a minor adjustment to node spacing.
    dispersion = (20 - parseInt(
      document.getElementById("slider_dispersion").value
    )) / 50;
    if ( d3.event ) {
        // Get scroll distance:
        focus_height += d3.event.deltaY;
        // Prevent focal line from moving out of bounds:
        focus_height = (focus_height < 0) ?
            0 :
            (focus_height > height) ?
            height :
            focus_height;
    }

    // Redraw the textbox and accompanying labels overtop the new
    // position of the root nodes. Add 240 (280) because these
    // positions are computed relative to the document origin, not
    // the svg origin:
    $("#center_sign").css('top', scrollMap(root.left) + 280);
    $("#focus_img").css('top', scrollMap(root.left) + 240);
    // Update all node positions:
    d3.selectAll("g.node").attr("transform", scrollMapTransform);
    // Update all edge positions:
    d3.selectAll('path.link') 
        .attr('d', function(d) {
            return diagonal(d, d.parent)
        });
}

// Redraw the tree with a new sign at the root.
function change_focus() {

    // Try to do things asynchronously, even though this
    // is hard in javascript. async lets us show the loading
    // spinner while we work so the user doesn't get frustrated 
    // with an unresponsive viz.
    var Process = function(start) {
        this.start = start
    }

        // TODO idea from discussion with Kate + Anoop:
        // change left and right contexts
        // collapse and redraw trees
        // *find similar signs in embedding space*
        // *redraw vertical suggestion bar with similar signs*

    Process.prototype.run = function() {

        // Read new focused sign from the central textbox:
        var new_focus = document.getElementById("center_sign").value;
        // Our internal representations use different names than
        // the user is likely to use. Adjust the user's input so 
        // that it matches the way things are represented in this
        // code:
        while (/\+|\(|\)|unk|\|/.test(new_focus)) {
            new_focus = new_focus
	      .replace("+", "x")
	      .replace("(", "lpar")
	      .replace(")", "rpar")
	      .replace("unk", "[...]")
	      .replace("|", "")
	    ;
        }
        document.getElementById("center_sign").value = new_focus;

        // If the user entered a single sign, try
        // to draw a picture of it in the middle of the tree:
        if (new_focus.split(" ").length == 1) {
            $("#focus_img").attr("src", "pngs/PE_mainforms/" + new_focus + ".trans.png");
        } else {
            $("#focus_img").attr("src", "");
        }
        // Update left and right contexts:
        ctx.left = new_focus;
        ctx.right = new_focus;
      
        // Reset root, selection, and pruned trees:
        root = {
            "left": null,
            "right": null
        };
        prune = {
            "left": null,
            "right": null
        };
        selected = {
            "left": [],
            "right": []
        };
        // Recompute left and right trees:
        for (var i = 0; i < 2; i++) {
            var dir = ["left", "right"][i];
            // Get full tree rooted in focused sign:
            var treeData = get_treedata(
                document.getElementById("center_sign").value,
                document.getElementById("center_sign").value.split(" ").length,
                dir
            );

	    // Update root:
            root[dir] = d3.hierarchy(
                treeData,
                function(d) {
                    return d.children;
                }
            );
        }

        // Automatically compute dispersion based on tree size.
        // This works reasonably well to keep the tree from looking
        // too cluttered, without the user having to make any 
        // manual adjustments.
        try {
            var new_disp = -2 * (Math.max(root.left.children.length, root.right.children.length));
            new_disp = new_disp < -250 ? -250 :
                new_disp > -10 ? 0 : new_disp;
            $("#slider_dispersion").val(new_disp);
            dispersion = (20 - new_disp) / 50;
        } catch (err) {
            // In case the root node doesn't exist yet, just fail quietly.
        }

        // Redraw both sides of the tree:
        setup("left");
        setup("right");
    }

    // Show the spinner:
    $("#loading").show();
    // Try to asynchronously update the figure:
    $.ajax().done(function() {
        var p = new Process();
        p.run();
        // Unhide the spinner:
        $("#loading").hide();
    });
    // Redraw central text box+sign image in the right location:
    $("#center_sign").css('top', scrollMap(root.left) + 280);
    $("#focus_img").css('top', scrollMap(root.left) + 240);
}

// Memoization speeds this up by a factor of ~10!
var memoize = new Object();
// Given a sign to serve as root, the depth of the root (how many
// signs it contains, in case user types something like "M127 M288"
// into the search box), and a direction, computes the contents of
// the tree based on our list of ngrams:
function get_treedata(sign, depth, dir) {

    if (memoize[sign + depth + dir]) {
        return memoize[sign + depth + dir];
    } else {

        var children = [];
        // Trim extra spaces, but ensure one is left on the appropriate side
        // to prevent unwanted string matches with sign variants and compounds:
        var trimmed = (dir == "left") ? " " + sign.trim() : sign.trim() + " ";
        for (var ngram in ngram_counts["corrections included"]["variants separate"]) {
            if (
                ( // Does the ngram contain the focused sign in the right location?
                    ((dir == "left") && ngram.endsWith(trimmed))
                 || ((dir == "right") && ngram.startsWith(trimmed))
                ) && // Does the ngram have the right length to belong to this layer of the tree?
                (ngram.split(" ").length - 1 == depth)
                // Optionally, can filter to exclude rare sign strings:
	        // &&(ngram_counts["corrections included"]["variants separate"][k] >= 1 )
            ) {
	        // If the ngram belongs in the tree, add it to list of children.
                children.push(get_treedata(ngram, depth + 1, dir));
            }
        }
        // It's easier to find a specific node if they're sorted in
        // some way:
        children.sort(
            function(a, b) {
                /*
		// Can sort by frequency... not sure if useful?
		var a_count = ngram_counts["corrections included"]["variants separate"][a.name];
                var b_count = ngram_counts["corrections included"]["variants separate"][b.name];
                return a_count > b_count ? 1 : a_count < b_count ? -1 : 0;
                */
	        // Lexicographic order makes it easy to find things:
                return a.name.localeCompare(b.name);
            });

        // Get the name of the sign at the root of this subtree:
        var name = sign.split(" ");
        name = (dir == "left") ? name[0] : name[name.length - 1];
        // Create json object with tree structure:
        if (children == []) {
            memoize[sign + depth + dir] = {
                "name": name
            };
        } else {
            memoize[sign + depth + dir] = {
                "name": name,
                "children": children
            };
        }
        // Return json object with tree structure:
        return memoize[sign + depth + dir];
    }
}

// Housekeeping to set up event listeners:
function do_initial_tree_setup() {
    // Enable scrolling the tree, disable scrolling the page:
    d3.select("#center_sign")
        .on("wheel", wheelHandler)
        .on("zoom", function() {});
    $("#center_sign").on('mousewheel DOMMouseScroll', disable_mousewheel_scroll);
    d3.select("#focus_img")
        .on("wheel", wheelHandler)
        .on("zoom", function() {});
    $('#focus_img').on('mousewheel DOMMouseScroll', disable_mousewheel_scroll);
}

// Set-up and draw one side of the tree:
function setup(dir) {
    // Set name of the data to whatever is in the central textbox.
    // Need to do this because sometimes the user enters a whole
    // string of symbols and by default root.data.name would only
    // contain one of them.
    root[dir].data.name = document.getElementById("center_sign").value;

    // Backup for debugging in case 
    // kidnappers/sloppy programming
    // cause us to lose a child somewhere: 
    root[dir].all_children = root[dir].children;

    // Collapse everything, then show the children of the root:
    if (root[dir].children) {
        root[dir].children.forEach(collapse);
        root[dir].children.forEach(function(d) {
            expand_selected(d, dir);
        });
    }

    // Refresh the pruned version of the tree to account for the
    // user's new selections:
    refresh_pruned_tree(dir);
    // Delete children that are incompatible with user selections:
    prune_incompatible(root[dir], dir, prune[dir]);
    // Do the actual drawing:
    update(root[dir], dir, propagate = false);
}

// Removes nodes from prune.dir if they are incompatible
// with the user's selections (ie they never cooccur together)
function refresh_pruned_tree(dir) {
    // Get tree data constrained by the currently selected
    // nodes on the other side of the tree: (contrast other
    // calls to get_treedata where we just constrain by the
    // contents of the root node)
    var otherDir = (dir == "left") ? "right" : "left";
    var treeData_pruned = get_treedata(
        ctx[otherDir],
        ctx[otherDir].split(" ").length,
        dir
    );
    // Update contents of prune[] object:
    prune[dir] = d3.hierarchy(treeData_pruned, function(d) {
        return d.children
    });
}

// Once the contents of prune[] have been updated,
// this actually deletes the incompatible child
// nodes:
function prune_incompatible(node, dir, prune) {
    // Note root is always same for both directions

    // If this node has already been pruned, restore its children
    // in case the user has unselected something:
    if (node.pruned) {
        // If the node is collapsed (hidden because one
        // of its siblings is selected) then just ignore it:
        if (node.collapsed) {} else {
            node.children = node._children;
            node.pruned = false;
        }
    }
    if (node.children) {
        var newChildren = [];
        // Iterate children of the tree being displayed:
        for (var i = 0; i < node.children.length; i++) {
            var found = false;
            var foundIndex = 0;
	    // Iterate children of the tree we are pruning to:
            if (prune.children) {
                for (var k = 0; k < prune.children.length; k++) {
		    // Record that this node exists in the pruned version if the tree:
                    if (node.children[i].data.name == prune.children[k].data.name) {
                        found = true;
                        break;
                    }
                }
            }
	    // If we found this node in the pruned tree, it gets to survive!
	    // Copy it to newChildren and recursively prune its children:
            if (found) {
                newChildren.push(node.children[i]);
                prune_incompatible(node.children[i], dir, prune.children[k]);
            } else {
	        // For debugging. The pruned nodes are greyed out, but later on
	        // they will also be removed from the display, so you won;t see
	        // them at all. If a dark grey node is ever visible, then 
	        // something has gone wrong...
                grey(node.children[i], dir);
            }
        }
        // Update list of children:
        if (!node.collapsed) {
            node._children = node.children;
        }
        node.children = newChildren;
        // Mark node as pruned:
        node.pruned = true;
    }
}

// Not used anymore, but maintained for debugging. If we
// see a grey node we know something has gone wrong!
// Redraws a node with greyed out background:
function grey( node, dir ) {
    // Select the node by its id:
    var n = d3.selectAll("#" + dir + "_" + (node.depth) + "_" + node.data.name);
    // Grey out:
    n.style("fill", "#555");
    // Grey out the children too:
    if (node.children) {
        node.children.forEach(function(d) {
            grey(d, dir)
        });
    }
}

// Expands the nodes that the user has selected. Used
// to maintain state of the tree after tree is redrawn:
function expand_selected(d, dir) {
    // If the given node is selected...
    if (
         (selected[dir][d.depth]) 
      && (selected[dir][d.depth].data.name == d.data.name)
    ) {
        // Show all children:
        d.children = d._children;
        // Don't show the children's children
        // unless they are also selected:
        if (d.children) {
            d.children.forEach(collapse);
            d.children.forEach(function(dd) {
                expand_selected(dd, dir)
            });
        }
    } else if (d.children) {
        // If not selected just collapse the node
        d.children.forEach(collapse);
    }
}

// Collapse a node and all of its children:
function collapse(d) {
    if (d.children) {
        // Backup children for later recovery:
        d._children = d.children;
        // Recursively collapse:
        d._children.forEach(collapse);
        // Delete children:
        d.children = null;
    }
}

// Draws the tree to the svg, once all of the other 
// functions have computed what should be displayed:
// If propagate==true, then after redrawing this side
// if the tree the other side will also be updated.
// Else only the one side of the tree will be redrawn.
function update(source, dir = "right", propagate = false) {

    // Use the d3 tree() datastructure to get an
    // initial position for the nodes and edges:
    var treeData = treemap[dir](root[dir]);
    var nodes = treeData.descendants(),
        links = treeData.descendants().slice(1)
    ;

    // Make all layes have same depth.
    // ROOT_OFFSET specifies how far off-center
    // the root should be drawn; seems to work
    // best with both roots overlapping.
    var LAYER_SPACE, ROOT_OFFSET;
    if (dir == "left") {
        LAYER_SPACE = -65;
        ROOT_OFFSET = 0;
    } else {
        LAYER_SPACE = 65;
        ROOT_OFFSET = 0;
    }
    // Adjust node positions according to depth and
    // the side of the tree they are on:
    nodes.forEach(function(d) {
        d.y = (ROOT_OFFSET + width / 2) + d.depth * LAYER_SPACE;
    });
    // Do we need to update the other side of the tree too?
    if (propagate) {
        var otherDir = (dir == "left") ? "right" : "left";
        refresh_pruned_tree(otherDir);
        prune_incompatible(root[otherDir], otherDir, prune[otherDir]);
        update(root[otherDir], otherDir, propagate = false);
    }
    // Not sure if needed any more? Sometimes ctx has
    // extra whitespace, so we trim it off.
    ctx[dir] = ctx[dir].trim();

    // Get nodes from the tree:
    var node = svg_tree.selectAll('g.node.' + dir)
        .data(nodes, function(d) {
            return d.id || (d.id = ++nodeId);
        });

    // For each node append a group element to the svg:
    var node_foreach = node.enter().append('g')
        // Classname records which side of the tree the
        // node is on to make updating the tree easier:
        .attr('class', 'node ' + dir)
    ;

    node_foreach
        // For each node with children...
        .filter(function(d) {
            return (d.children || d._children)
        })
        // add an interaction when the user clicks the node
        .on('click', function(d) {
            click(d, dir)
        })
        // and make the cursor look like a pointing finger 
        // as an affordance to suggest interaction is possible
        .attr('cursor', 'pointer');

    // DRAW CIRCLE TO REPRESENT NODE
    node_foreach
        // For every node with a parent
        // (everything but the root)...
        .filter(function(d) {
            return d.parent;
        })
        // append a circle
        .append('circle')
        // Set the id based on the node name and depth,
        // so we can easily edit the circle later
        .attr('id', function(d) {
            return dir + "_" + d.depth + "_" + d.data.name
        })
        .attr('class', "node " + dir)
        // Set size of the circle proportional to size of the sign
        // image we'll be drawing later on
        .attr('r', imgsize / 3)
        // Bright fill color: if this is still visible in the final
        // viz then something has gone wrong
        .style("fill", "red")
        // Position the circle close to where the sign image is
        // going to be drawn
        .attr('cy', 0)
        .attr('cx', imgsize / 2 - (dir == "left" ? imgsize : 0))
        .attr('width', imgsize)
        .attr('height', imgsize)
        // Make sure the user can still scroll if they're hovering over the circle
        .on("wheel", wheelHandler)
        // But disable scrolling the rest of the page
        .on("zoom", function() {}) 
    ;

    // Color circles based on state of the node they represent
    // (selected, end-of-sentence, etc)
    d3.selectAll("circle.node." + dir).style("fill", function(d) {
        if ((selected[dir][d.depth]) && (selected[dir][d.depth].data.name == d.data.name)) {
	    // Green for selected nodes:
            return "#d3f091";
        } else {
	    // boe/eoe tokens get light grey, everything else is invisible white:
            return d.children || d._children ? "white" : "#eee";
        }
    });

    // DRAW SIGN IMAGE ON TOP OF NODE
    node_foreach
        // For every node except the root...
        .filter(function(d) {
            return d.parent;
        })
        // Draw an image!
        .append('image')
        // The image has class node also, because we want to 
        // be able to select the node+circle+image all at once
        // and treat them as a unit
        .classed("node", true)
        // Unique id so we can edit this image later if we need to
        .attr('id', function(d) {
            return dir + "_" + d.depth + "_" + d.data.name + "_img"
        })
        // Position the image over top of the circle that we drew
        .attr('y', -imgsize / 2)
        .attr('x', (dir == "left") ? -imgsize : 0)
        .attr('width', imgsize)
        .attr('height', imgsize)
        // Get the path to the relevant sign image
        .attr("href", function(d) {
            return "pngs/PE_mainforms/" + d.data.name + ".trans.png";
        })
        // Some signs are missing images... hide the image if this happens:
        .attr("onerror", "this.style.display='none'")
        // Allow scrolling tree, disable scrolling page:
        .on("wheel", wheelHandler)
        .on("zoom", function() {})
    ;

    // DRAW NODE LABELS
    node_foreach
        // Add text label to each node...
        .append('text')
        // Position it above the node, unless there is no
        // sign image in which case the label can go right
        // in the middle of the node
        .attr("dy", function(d) {
            return (d.data.name == "unk" || d.data.name == "X" ||
                    d.data.name == "BEGIN" || d.data.name == "END") ?
                "5" :
                "-1em";
        })
        // Horizontal offset to center over the image
        .attr("dx", function(d) {
            return (dir == "left") ?
                -imgsize / 2 :
                imgsize / 2
        })
        // Center-align the text
        .attr("text-anchor", "middle")
        // Set text based on the name of the sign.
        // Replace some of our HTML-safe shorthands
        // with the actual token names users will
        //  expect to see
        .text(function(d) {
            return (d.depth == 0) ?
                "" :
                (d.children || d._children ?
                    d.data.name
                    .replace("unk", "[...]")
                    .replace("x", "+")
                    .replace('lpar', '(')
                    .replace('rpar', ')') :
                    (dir == "left" ? "<boe>" : "<eoe>"));
        })
        // Tree is scrollable, page is not:
        .on("wheel", wheelHandler)
        .on("zoom", function() {})
    ;

    // Grab the nodes that already existed at the start of drawing:
    node_foreach = node_foreach.merge(node);
    // Update all node positions based on user-specified
    // dispersion and focus location.
    node_foreach//.transition()
        .attr("transform", scrollMapTransform);

    // Remove nodes that are being collapsed:
    node.exit()
        .remove();





    // Get reference to links in the tree:
    var link = svg_tree.selectAll('path.link.' + dir)
        .data(links, function(d) {
            return d.id;
        });

    // Create new links to new nodes:
    var link_foreach = link.enter()
        .insert('path', "g")
        .attr("class", "link " + dir)
        // Handle scrolling, again:
        .on("wheel", wheelHandler)
        .on("zoom", function() {})
    ;

    // Grab links that already existed at start of the function:
    link_foreach = link_foreach.merge(link);
    // Update position of edge based on position of nodes:
    link_foreach
        .attr('d', function(d) {
            return diagonal(d, d.parent)
        });

    // Remove links to nodes that are being deleted:
    link.exit()
        .remove();





    // Update the tablet previews based on the new selections:
    grep_tablets(ctx);

    // Disable scrolling (again!) At this point I no longer know which of
    // these are even necessary but it seems to work without scrolling the 
    // page so I am at peace. :)
    $('.node').on('mousewheel DOMMouseScroll', disable_mousewheel_scroll)
    $('.link').on('mousewheel DOMMouseScroll', disable_mousewheel_scroll)
}

// Function to handle user interaction with the tree.
// When the user clicks on a node, add it to the current
// selection and update both sides of the tree (one side
// to highlight and expand, the other side to prune)
function click(d, dir) {

    // If user wants to change focus on click, then we
    // just redraw everything from scratch with the new focus:
    if (document.getElementById('check_recenter').checked) {

        document.getElementById('center_sign').value = d.data.name;
        change_focus();
    
    } else {

        // If node is expanded, collapse it:
        if (d.children) {
            d.children = null;
            d.pruned = false;
        } else {
	    // If node is collapsed, expand it:
            d.children = d._children;
            if (d.children) {
	        // If the children were expanded
	        // previously, hide them again:
                d.children.forEach(collapse);
            }
        }
        // Collapse sibling nodes to save space, if user
        // specifies they want this behaviour:
        if (d.parent) {
            if (document.getElementById("check_hidesibs").checked) {
                if (d.parent.collapsed) {
		    // If parent is already collapsed (ie siblings already hidden)
		    // then they must be expanding this node, so we unhide the siblings.
                    d.parent.children = d.parent._children;
                    d.parent.collapsed = false;
                } else {
		    // If they are collapsing this node, we hide the siblings:
                    d.parent._children = d.parent.children;
                    d.parent.children = [d];
                    d.parent.collapsed = true;
                }
            }
        }


        if (d.children) {
	    // Node was expanded. Add to selection:
            selected[dir] = [d];
            ctx[dir] = d.data.name;
        } else {
            // Node was collapsed. Remove from selection.
            selected[dir] = [];
            ctx[dir] = "";
        }
        // Update selection: need to do this from scratch, since
        // user could have selected a node that wasn't child of
        // one of the nodes that are already selected.
        if (d.depth > 0) {
            var ptr = d;
	    // Walk up to root recording the spine of the tree.
	    // Spine == list of selected nodes on this side of the tree.
            while (ptr.parent !== null) {
                ptr = ptr.parent;
                selected[dir].push(ptr);
                if (dir == "left") {
                    ctx[dir] += " " + ptr.data.name;
                } else {
                    ctx[dir] = ptr.data.name + " " + ctx[dir];
                }
            }
        }
        // Remove whitespace
        ctx[dir] = ctx[dir].trim();
        // We recorded nodes from leaf to root; want them in order from root to leaf:
        selected[dir].reverse();

        // Redraw the tree based on new selections:
        refresh_pruned_tree(dir);
        prune_incompatible(root[dir], dir, prune[dir]);
        update(d, dir = dir, propagate = true);
    }
}

// Compute endpoints of the line between two nodes.
// Adapted from the version on bl.ocks.org: my version
// takes into account the fact that scrolling might
// move nodes around on the page.
function diagonal(s, d) {

    path = `M ${s.y} ${scrollMap(s)}
            C ${(s.y + d.y) / 2} ${scrollMap(s)},
              ${(s.y + d.y) / 2} ${scrollMap(d)},
              ${d.y} ${scrollMap(d)}`

    return path;
}

// Determines the frequency of a sign from our list of ngram
// counts, and returns a value used to scale the size of the
// node based on this frequency.
function scaleByFreq(d) {
    // boe/eoe tokens should be non-prominant:
    if (d.data.name == "BEGIN" || d.data.name == "END") {
        return 0.5;
    }

    // Log scale produces sizes that are within a nice range.
    var freq = Math.log(ngram_counts["corrections included"]["variants separate"][d.data.name]) / (Math.log(10) * 2);

    if (freq !== undefined) {
        return freq;
    }
}
