//set embedding plot canvas size
const marginE = {top: 20, right: 20, bottom: 30, left: 40},
    widthE = 800 - marginE.left - marginE.right,
    heightE = 150 - marginE.top - marginE.bottom;
/*
 * value accessor - returns the value to encode for a given data object.
 * scale - maps value to a visual display encoding, such as a pixel position.
 * map function - maps from data value to display value
 * axis - sets up axis
 */

// setup x
var xValue = function(d) { return d.embed_pca_x;}, // data -> value
    xScale = d3.scaleLinear().range([0, widthE]), // value -> display
    xMap = function(d) { return xScale(xValue(d));}, // data -> display
    xAxis = d3.axisBottom().scale(xScale);

// setup y
var yValue = function(d) { return d.embed_pca_y;}, // data -> value
    yScale = d3.scaleLinear().range([ heightE, 0]), // value -> display
    yMap = function(d) { return yScale(yValue(d));}, // data -> display
    yAxis = d3.axisLeft().scale(yScale);

// freq controls the word size
var freqValue = function(d) {return d.freq;},
    freqScale = d3.scaleLinear().range([16, 25]),
    freqMap = function(d) {return freqScale(freqValue(d))/Math.sqrt(scale)};

// Record the zoom level:
var scale = 1;

// setup fill color
// var cValue = function(d) { return d.freq;},
//     color = d3.scaleOrdinal(d3.schemeBuGn).domain([0,1]);

// add the graph canvas to the body of the webpage
var svg = d3.select('#embedding_svg')
    .attr("width", widthE + marginE.left + marginE.right)
    .attr("height", heightE + marginE.top + marginE.bottom)
    .attr("viewBox", [0, 0, widthE + marginE.left + marginE.right, heightE + marginE.top + marginE.bottom])
  .append("g")
    .attr("transform", "translate(" + marginE.left + "," + marginE.top + ")");

// add the wordembedtip area to the webpage
var wordembedtip = d3.select("body").append("div")
    .attr("class", "wordembedtip")
    .style("opacity", 0);

d3.csv("image_embed_subset.csv", function(error, data) {
  // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain([d3.min(data, xValue)-2.5, d3.max(data, xValue)+1]).nice();
  yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+3]).nice();
  freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();

  //get rid of x,y axis
  //svg.append("g")
  //    .attr("class", "xAxis")
  //    .classed("scalable",true)
  //    .attr("transform", "translate(0," + heightE + ")")
  //    .call(xAxis);
  // y-axis
  //svg.append("g")
  //    .attr("class", "yAxis")
  //    .classed("scalable",true)
  //    .call(yAxis);

  // draw dots
  var dot = svg.selectAll(".dot")
      .data(data);
  // dot.enter()
  //   .append("circle")
  //     .attr("class", "dot")
  //     .attr("r", freqMap)
  //     .attr("cx", xMap)
  //     .attr("cy", yMap)
  //     .style("fill", 'green')//function(d) { return color(cValue(d));})
  //     .style('opacity', 0.3);
  var image = dot.enter()
      .append('image')
      .classed("embed_img",true)
      .classed("scalable",true)
      //.attr('id', "embed_img")
      .attr('x', xMap)
      .attr('y', yMap)
      .attr('width',  freqMap)
      .attr('height', freqMap)
      .attr("href",function(d){return "pngs/PE_mainforms/"+d.word+".trans.png";});

  //set image event
  var imageEvent = image
  .on("mouseover", function(d) {
      // select element in current context
      wordembedtip.transition()
           .duration(200)
           .style("opacity", .9);
      wordembedtip.html(d.word + "<br/> Occurrence:" + d.freq
      +"<br/><img src='pngs/PE_mainforms/"+d.word+".png' />")
           .style("left", (d3.event.pageX + 20) + "px")
           .style("top", (d3.event.pageY + 0) + "px");
     //d3.select( this ).raise()
       //.transition()
       //.attr("href", function(d){return "pngs/PE_mainforms/"+d.word+".png";})
       // This caused the image to move when you hovered while zoomed in...
       // Haven't figured out how to fix.
       //.attr("height", function(d){return 100/scale})
       //.attr("width", function(d){return 100/scale});
       //.attr("transform","scale("+scale+")")
     })
    .on("mouseout", function(d) {
        wordembedtip.transition()
             .duration(500)
             .style("opacity", 0);
       //d3.select( this )
         //.transition()
         //.attr("href",function(d){return "pngs/PE_mainforms/"+d.word+".trans.png";})
         //.attr("height",freqMap)
         //.attr("width", freqMap)
      ;
     })
    .on('click', function(d){
      document.getElementById("center_sign").value = d.word;
      console.log(document.getElementById("center_sign").value);
      change_focus();
    });


  // make whole background zoomable/draggable
  var zoom_handler = d3.zoom()
	.extent([[0, 0], [widthE, heightE]])
	.scaleExtent([1, 32])
        .on("zoom", zoomed);
  svg.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", widthE)
      .attr("height", heightE)
      .style("fill", "white")
      .lower()
      .call(zoom_handler)
  ;
  function zoomed() {
    scale = d3.event.transform.k;
    // rescale images on zoom to make the dense clusters navigable when zoomed in
    d3.selectAll(".scalable").attr("transform", d3.event.transform);
    d3.selectAll(".embed_img").attr("width", function(d){return freqMap(d);});

    //d3.selectAll(".embed_img").attr("transform", "scale(" + (1/d3.event.transform.k) +")");
    //console.log(d3.event.transform.k);
    };
});

