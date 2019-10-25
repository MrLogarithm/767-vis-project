// // load data
// var embed2d_data = d3.csv("embed2d.csv", function(error, data) {
//     if (error) {
//         return console.warn(error);
//       }
//     });
// console.log("Loaded 2d embedding csv");

//set embedding plot canvas size
const marginE = {top: 20, right: 20, bottom: 30, left: 40},
    widthE = 960 - marginE.left - marginE.right,
    heightE = 500 - marginE.top - marginE.bottom;
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
    freqScale = d3.scaleLinear().range([2, 5]),
    freqMap = function(d) {return freqScale(freqValue(d))};

// setup fill color
var cValue = function(d) { return d.freq;},
    color = d3.scaleOrdinal(d3.schemeBuGn).domain([0,1]);

// add the graph canvas to the body of the webpage
var svg = d3.select('#embedding_window').append("svg")
    .attr("width", widthE + marginE.left + marginE.right)
    .attr("height", heightE + marginE.top + marginE.bottom)
  .append("g")
    .attr("transform", "translate(" + marginE.left + "," + marginE.top + ")");

// add the wordembedtip area to the webpage
var wordembedtip = d3.select("body").append("div")
    .attr("class", "wordembedtip")
    .style("opacity", 0);
d3.csv("embed2d.csv", function(error, data) {
  // don't want dots overlapping axis, so add in buffer to data domain
  xScale.domain([d3.min(data, xValue)-3, d3.max(data, xValue)+4]).nice();
  yScale.domain([d3.min(data, yValue)-4, d3.max(data, yValue)+4]).nice();
  freqScale.domain([d3.min(data, freqValue) , d3.max(data, freqValue)] ).nice();
  // x-axis
  svg.append("g")
      .attr("class", "xAxis")
      .attr("transform", "translate(0," + heightE + ")")
      .call(xAxis);
  // y-axis
  svg.append("g")
      .attr("class", "yAxis")
      .call(yAxis);

  // draw dots
  svg.selectAll(".dot")
      .data(data)
    .enter().append("circle")
      .attr("class", "dot")
      .attr("r", freqMap)
      .attr("cx", xMap)
      .attr("cy", yMap)
      .style("fill", 'green')//function(d) { return color(cValue(d));})
      .style('opacity', 0.3)
      .append('image')
      .attr('id', function(d){return dir+"_"+d.depth+"_"+d.data.name+"_img"})
      .attr('y', -imgsize/2)
      .attr('x',(dir=="left")?-imgsize:0)
      .attr('width', imgsize)
      .attr('height', imgsize)
      .attr("href",function(d){return "pngs/PE_mainforms/"+d.data.name+".trans.png";})
      .on("mouseover", function(d) {
          wordembedtip.transition()
               .duration(200)
               .style("opacity", .9);
          wordembedtip.html(d.word + "<br/> (" + xValue(d)
          + ", " + yValue(d) + ")")
               .style("left", (d3.event.pageX + 5) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          wordembedtip.transition()
               .duration(500)
               .style("opacity", 0);
      })
      .on('click', function(d){
        document.getElementById("center_sign").value = d.word;
        console.log(document.getElementById("center_sign").value);
      });

});


// x = d3.scaleLinear()
//     .domain(d3.extent(embed2d_data, d => d.embed_pca_x)).nice()
//     .range([margin.left, width - margin.right]);
//
// y = d3.scaleLinear()
//     .domain(d3.extent(embed2d_data, d => d.embed_pca_y)).nice()
//     .range([height - margin.bottom, margin.top]);
//
// xAxis = g => g
//     .attr("transform", `translate(0,${height - margin.bottom})`)
//     .call(d3.axisBottom(x))
//     .call(g => g.select(".domain").remove())
//     .call(g => g.append("text")
//         .attr("x", width - margin.right)
//         .attr("y", -4)
//         .attr("fill", "#000")
//         .attr("font-weight", "bold")
//         .attr("text-anchor", "end")
//         .text(embed2d_data.embed_pca_x));
//
// yAxis = g => g
//     .attr("transform", `translate(${margin.left},0)`)
//     .call(d3.axisLeft(y))
//     .call(g => g.select(".domain").remove())
//     .call(g => g.select(".tick:last-of-type text").clone()
//         .attr("x", 4)
//         .attr("text-anchor", "start")
//         .attr("font-weight", "bold")
//               .text(embed2d_data.embed_pca_y));

// // chart = {
// var svg = d3.select('#embedding_window');
// svg.create("svg").attr("viewBox", [0, 0, width, height]);
//
// svg.append("g")
//     .call(xAxis);
//
// svg.append("g")
//     .call(yAxis);
//
// svg.append("g")
//     .attr("stroke-width", 1.5)
//     .attr("font-family", "sans-serif")
//     .attr("font-size", 10)
//   .selectAll("g")
//   .data(embed2d_data)
//   .join("g")
//     .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`)
//     .call(g => g.append("circle")
//         .attr("stroke", "steelblue")
//         .attr("fill", "none")
//         .attr("r", 3))
//     .call(g => g.append("text")
//         .attr("dy", "0.35em")
//         .attr("x", 7)
//         .text(d => d.name));

  // return svg.node();
// };


//
// // set embedding plot frame
// var svg = d3.select("#embedding_window")
//     .append('svg')
//     // .append("g")
//     .attr("width", width + margin.right + margin.left)
//     .attr("height", height + margin.top + margin.bottom)

    // .attr("transform",
    //   "translate("+ margin.left + "," + margin.top + ")"
    // );
//
// svg.append("rect")
//             .attr("x", 0)
//             .attr("y", 0)
//             .attr("width", 200)
//             .attr("height", 100).attr('color','red');

// xAxis = {
//   const axis = d3.axisBottom()
//       .ticks(6)
//       .tickSize(size * columns.length);
//   return g => g.selectAll("g").data(x).join("g")
//       .attr("transform", (d, i) => `translate(${i * size},0)`)
//       .each(function(d) { return d3.select(this).call(axis.scale(d)); })
//       .call(g => g.select(".domain").remove())
//       .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));
// }


// yAxis = {
//   const axis = d3.axisLeft()
//       .ticks(6)
//       .tickSize(-size * columns.length);
//   return g => g.selectAll("g").data(y).join("g")
//       .attr("transform", (d, i) => `translate(0,${i * size})`)
//       .each(function(d) { return d3.select(this).call(axis.scale(d)); })
//       .call(g => g.select(".domain").remove())
//       .call(g => g.selectAll(".tick line").attr("stroke", "#ddd"));
// }
//
// svg.append("g")
//     .call(xAxis);
//
// svg.append("g")
//     .call(yAxis);

// svg.append("g")
//     .attr("stroke-width", 1.5)
//     .attr("font-family", "sans-serif")
//     .attr("font-size", 10)
//   .selectAll("g")
//   .data(data)
//   .join("g")
//     .attr("transform", d => `translate(${x(d.x)},${y(d.y)})`)
//     .call(g => g.append("circle")
//         .attr("stroke", "steelblue")
//         .attr("fill", "none")
//         .attr("r", 3))
//     .call(g => g.append("text")
//         .attr("dy", "0.35em")
//         .attr("x", 7)
//         .text(d => d.name));
