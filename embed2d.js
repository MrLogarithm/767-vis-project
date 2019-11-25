// Set embedding plot canvas size:
const marginE = {top: 0, right: 0, bottom: 0, left: 0},
    widthE = 800 - marginE.left - marginE.right,
    heightE = 200 - marginE.top - marginE.bottom;

// Setup axes:
var xValue = function(d) { return d.x;}, // data -> value
    xScale = d3.scaleLinear().range([0, widthE]), // value -> display
    xAxis = d3.axisBottom().scale(xScale);
var yValue = function(d) { return d.y;}, // data -> value
    yScale = d3.scaleLinear().range([ heightE, 0]), // value -> display
    yAxis = d3.axisLeft().scale(yScale);

// Frequency controls the word size:
var freqValue = function(d) {return d.freq;},
    freqScale = d3.scaleLinear().range([16, 25]),
    freqMap = function(d) {return freqScale(freqValue(d))/Math.sqrt(scale)};

// Record the zoom level:
var scale = 1;

// Add the graph canvas to the body of the webpage:
var svg = d3.select('#embedding_svg')
    .attr("width", widthE + marginE.left + marginE.right)
    .attr("height", heightE + marginE.top + marginE.bottom)
    .attr("viewBox", [0, 0, widthE + marginE.left + marginE.right, heightE + marginE.top + marginE.bottom])
    .append("g")
    .attr("transform", "translate(" + marginE.left + "," + marginE.top + ")");

// Add the wordembedtip area to the webpage
// wordembedtip is a tooltip to show information
// about a sign when hovered over that sign
var wordembedtip = d3.select("body").append("div")
    .attr("class", "wordembedtip")
    .style("opacity", 0);

d3.csv("image_embed_subset_pca.csv", function(error, data) {
  // don't want dots overlapping the axis lines, so add in buffer to data domain
  xScale.domain([d3.min(data, xValue)-2.5, d3.max(data, xValue)+1]).nice();
  yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+3]).nice();
  freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();

  // Draw dots
  var dot = svg.selectAll(".dot")
      .data(data);

  // Add sign images overtop the dots:
  var image = dot.enter()
      .append('image')
      .classed("embed_img",true)
      .classed("scalable",true)
      .attr('x', function(d) { return xScale(d.x);})
      .attr('y', function(d) { return yScale(d.y);})
      .attr('width',  freqMap)
      .attr('height', freqMap)
      .attr("href",function(d){return "pngs/PE_mainforms/"+d.word+".trans.png";});

  // Set image hover event:
  var imageEvent = image
      .on("mouseover", function(d) {
	// Reveal tooltip:
        wordembedtip.transition()
             .duration(200)
             .style("opacity", .9);
        // Add information about hovered element:
        wordembedtip.html(d.word + "<br/> Occurrence:" + d.freq
        +"<br/><img src='pngs/PE_mainforms/"+d.word+".png' />")
             .style("left", (d3.event.pageX + 20) + "px")
             .style("top", (d3.event.pageY + 0) + "px")
             .style("z-index", "5");
       // This caused the image to move when you hovered while zoomed in...
       // Haven't figured out how to fix.
       //d3.select( this ).raise()
         //.transition()
         //.attr("href", function(d){return "pngs/PE_mainforms/"+d.word+".png";})
         //.attr("height", function(d){return 100/scale})
         //.attr("width", function(d){return 100/scale});
         //.attr("transform","scale("+scale+")")
      })
      // Hide tooltip on mouseout
      .on("mouseout", function(d) {
        wordembedtip.transition()
             .duration(500)
             .style("opacity", 0);
        ;
      })
      // On mouse click, set the selected sign as focus of the tree:
      .on('click', function(d){
        document.getElementById("center_sign").value = d.word;
        console.log(document.getElementById("center_sign").value);
        change_focus();
      });

  // Make whole background zoomable/draggable:
  var zoom_handler = d3.zoom()
    	.extent([[0, 0], [widthE, heightE]])
    	.scaleExtent([0.5, 32])
      .on("zoom", zoomed);
  var drag = d3.drag()
      .subject(function (d) { return d; })
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  var zoomable = svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", widthE)
      .attr("height", heightE)
      .style("fill", "white")
      .lower()
      .call(zoom_handler)
      .call(drag);

  // Adjust zoom when user slides slider:
  var slider = d3.select("#zoombutton").append("p").append("input")
      .datum({})
      .attr("type", "range")
      .attr("value", zoom_handler.scaleExtent()[0])
      .attr("min", zoom_handler.scaleExtent()[0])
      .attr("max", zoom_handler.scaleExtent()[1])
      .attr("step", (zoom_handler.scaleExtent()[1] - zoom_handler.scaleExtent()[0]) / 100)
      .on("input", slided);

  function zoomed() {
    scale = d3.event.transform.k;
    // rescale images on zoom to make the dense clusters navigable when zoomed in
    // not quite semantic zoom but also not straight geometric zoom
    d3.selectAll(".scalable").attr("transform", d3.event.transform);
    d3.selectAll(".embed_img").attr("width", function(d){return freqMap(d);});
    slider.property("value", scale);
    };

  function dragstarted(d) {
      d3.event.sourceEvent.stopPropagation();
      d3.select(this).classed("dragging", true);
  }

  function dragged(d) {
      d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  }

  function dragended(d) {
      d3.select(this).classed("dragging", false);
  }

  function slided(d) {
      zoom_handler.scaleTo(zoomable.transition().duration(100), d3.select(this).property("value"));
  };

});

////drop down button to select the embedding method
var embed_methods = ["PCA", "tSNE"]

// Initialize the drop down button
var dropdownButton = d3.select("#selectButton");

// add the options to the button
dropdownButton // Add a button
  .selectAll('myOptions') // Next 4 lines add options
 	.data(embed_methods)
  .enter()
	.append('option')
  .text(function (d) { return d; }) // text showed in the menu
  .attr("value", function (d) { return d; }) // corresponding value returned by the button

// A function that update the embedding method to the plot
function updateChart(myEmbed) {
  var csv_file;
  if (myEmbed =="PCA") {
    csv_file = "image_embed_subset_pca.csv";
  }
  else if (myEmbed =="tSNE") {
    csv_file = "image_embed_subset_tsne.csv";
  }
  // Get the data again
  d3.csv(csv_file, function(error, data) {
    // // draw dots
    var dot = svg.selectAll(".dot")
        .data(data);
    xScale.domain([d3.min(data, xValue)-2.5, d3.max(data, xValue)+1]).nice();
    yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+3]).nice();
    freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();

    image = svg.selectAll('.embed_img')
        .transition()
        .duration(1000)
        .attr('x', function(d) { return xScale(d.x);})
        .attr('y', function(d) { return yScale(d.y);})
        .attr('width',  freqMap)
        .attr('height', freqMap)
        .attr("href",function(d){return "pngs/PE_mainforms/"+d.word+".trans.png";});

  });
}

dropdownButton.on("change", function(d) {
    // recover the option that has been chosen
    var selectedOption = d3.select(this).property("value")
    // run the updateChart function with this selected option
    updateChart(selectedOption)
});
////drop down button end
