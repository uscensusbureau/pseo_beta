// D3 Vars
var chartDiv = document.getElementById("chart");
var svg = d3.select(chartDiv).append("svg");
var legendDiv = document.getElementById("legend");
var legend = d3.select(legendDiv).append("svg");
var margin = {top: 20, right: 20, bottom: 40, left: 55};
// set the height, width based on the css of the chartDiv
var width = +chartDiv.clientWidth - margin.left - margin.right;
var height = +chartDiv.clientHeight - margin.top - margin.bottom;

if(!!window.performance && window.performance.navigation.type == 2)
{
    window.location.reload();
}

// data in global scope
var pseoData = {};

// state lookup
pseoData.statefp_hash = {
    "CO": "COLORADO",
    "TX": "TEXAS"
}

function openEmail(email) {
  window.open('mailto:'+email);
}

function openDownload(url){
  // window.location.assign(url);
  var a = document.createElement('A');
  a.href = url;
  a.target = '_blank';
  a.download = url.substr(url.lastIndexOf('/') + 1);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}

function resetST(){
  $j33("#institution-dropdown").empty();
  resetUI();
}


function resetUI(){
  // reset the UI
  $j33("#checkbox-grid").empty();
  $j33("#cohort-dropdown").empty();
  $j33('#dropdownCohortButton').text("Select Cohort");
  if ($j33('#dropdownCohortButton').hasClass("active")){
    $j33('#dropdownCohortButton').removeClass("active");
  } 
  $j33('.options').hide();
  // disable the cohort button
  $j33("#dropdownCohortButton").prop('disabled', true);
  //reset the degree filter
  pseoData.degreeFilter = [];
}

//if navigating using the back or forward buttons, clear the UI
if(!!window.performance && window.performance.navigation.type == 2)
{
    resetST();
}


$j33("#clearbutton").on('click', function () {
  var button = $j33(this);
  button.addClass('disabled').css("pointer-events", "none");
    
  $j33('#checkbox-grid > label.active').trigger('click');
  svg.select(".yaxis").selectAll(".yaxislabel").remove();
  svg.select(".yaxis").selectAll(".tick").remove();
  
  setTimeout(function(){ 
    button.removeClass('disabled').css("pointer-events", "auto");
  }, 400);
  
  svg.select("g.chart")
    .select("g.contents")
    .append("g")
    .attr('class','notifications')
    .attr("transform", "translate(" + (width / 2) +"," + (height / 2) + ")")
    .append("text")
    .attr("font-family", "Helvetica, Arial, sans-serif;")
    .attr("font-weight", "bold")
    .attr("fill", "#6c757d")
    .attr("text-anchor", "middle")
    .text("Select one or more fields of study below");
  
  // disable any queued clicks
  for (i = 0; i < pseoData.degreequeue.length; i++) { 
    clearTimeout(pseoData.degreequeue[i]);
  }
  
  return false;
});


// filter data based on a json object. the filter must match all criteria
// (e.x. UT austin 2004)
function filterJSONMatchAll(json, filter){
  return json.filter(function(item) {
  for (var key in filter) {
    if (item[key] === undefined || item[key] != filter[key])
      return false;
  }
  return true;
  });
}


// filter data based on a json object the filter can contain multiple or condition criteria
// (e.x. degree in marketing, communications, or history)
function filterJSONMatchAny(json, filter_list){
  return json.filter(function(item) {
    for (var i in filter_list) {
      for (var key in filter_list[i]) {
        if (item[key] === filter_list[i][key])
          return true;
      }
    }
    return false;
  });
}


// get distinct values of a specific column (e.x. get all degree types)
function getDistinctValues(json, column, callback){
  var lookup = {};
  var result = [];
  
  for (var i in json) {
    var name;
    name = json[i][column];
    
    // if the name hasn't been seen before
    // not including the column array that's part of the json
    if (!(name in lookup) && !(json[i] instanceof Array)) {
      lookup[name] = 1;
      result.push(name);
    }
  }
  callback(result)
}


// titlecase a string
var toTitleCase = function (str) {
  // break on spaces and capitalize the first element
  str = str.toLowerCase().split(/[\s]+/);
  for (var i = 0; i < str.length; i++) {

    // if element contains one or more slashes, capitalize after slash
    if ( str[i].indexOf("/") !== -1 ) {
      var slashstr = str[i].split('/');
      for (var j = 0; j < slashstr.length; j++){
        slashstr[j] = slashstr[j].charAt(0).toUpperCase() + slashstr[j].slice(1);
      }
      str[i] = slashstr.join('/')
    // if no slashes just caps by spaces
    } else {
      //dont titlecase and
      if ((str[i].toLowerCase() !== 'and') && (str[i].toLowerCase() !== 'of') && (str[i].toLowerCase() !== 'at')) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
      }
    }
  }
  return str.join(' ');
};


// add spaces around a dash if they don't occur
var spaceTitleDash = function (str) {
  // break on spaces
  str = str.split(/[\s]+/);
  for (var i = 0; i < str.length; i++) {

    // if element contains one or more dashes space it out
    if ( str[i].indexOf("-") !== -1 ) {
      var dashstr = str[i].split('-');
      // if there are no spaces around the dash add them
      if ( str[i].indexOf(" - ") !== -1 ) {
        str[i] = dashstr.join('-')
      } else {
        str[i] = dashstr.join(' - ')
      }
    }
  }
  return str.join(' ');
};


//default label over the 3 radio button options
$j33("#radioLabel").html(function() {
  var selected = $j33('input[name=radioName]:checked', '#twotoggle').attr('id');
  pseoData.analysis_type = selected;
  return toTitleCase(selected.replace("_"," "))+" Filter";
});

// get label categories based on the 2 option toggle box
function threeRadioLabels(labelid, radioid){
  var returnVal;
  if (labelid === "earnings_percentile"){
    switch(radioid) {
        case "radioselect1":
            returnVal = 25;
            break;
        case "radioselect2":
            returnVal = 50;
            break;
        case "radioselect3":
            returnVal = 75;
    }
  } else if (labelid === "years_postgrad"){
    switch(radioid) {
        case "radioselect1":
            returnVal = 1;
            break;
        case "radioselect2":
            returnVal = 5;
            break;
        case "radioselect3":
            returnVal = 10;
    }
  }

  return returnVal;
}

//onclick label over the 3 radio button options
$j33("#twotoggle input:radio").change(function() {
  // color the svg based on bootstrap button
  $j33(this)
    .parent().children("svg")
    .removeClass("icon-toggle-inactive")
    .addClass("icon-toggle-active");
  
  // color all non checked svg
  $j33("#twotoggle input:radio:not(:checked)")
    .parent().children("svg")
    .removeClass("icon-toggle-active")
    .addClass("icon-toggle-inactive");
  
  // change the label of the 3 radio option
  var selected = $j33(this).attr('id');
  pseoData.analysis_type = selected;
  $j33("#radioLabel").html(toTitleCase(selected.replace("_"," "))+" Filter");
  labelRadios();
  
  return false; 
});


function labelRadios() {
  //labels in 3 radio buttons
  $j33("#threetoggle label").each(function(){
    var input = $j33(this).children('input');
    var radioid = input.attr('id');
    var labelid = $j33('input[name=radioName]:checked', '#twotoggle').attr('id');
    
    var labeltext = threeRadioLabels(labelid, radioid);
    $j33(this).children('span').html(labeltext);
    
    //if label is for postgrad_years and isn't available, disable
    if ( (labelid === "years_postgrad") && (!($j33.inArray(labeltext, pseoData.yearsAvailable) >= 0)) ){
      input.prop("disabled", true);
      $j33(this).addClass("disabled");
      $j33(this).css("pointer-events", "none");
    } else {
      input.prop("disabled", false);
      $j33(this).removeClass("disabled");
      $j33(this).css("pointer-events", "auto");
    }
    
    // set the title for each property
    if (labelid === "years_postgrad") {
      var plural = "";
      if (labeltext !== "1") { plural = "s" }
      $j33(this).prop('title', 'Filter by '+labeltext+' Year'+plural+' Postgrad');
    } else {
      $j33(this).prop('title', 'Filter by '+labeltext+'th Earnings Percentile');
    }
  });

  //set default as the 2nd option if not disabled, otherwise select 1st
  $j33("#threetoggle > label").children("input").each(function () {
    if ( (!$j33(this).is( ":disabled" )) && ($j33(this).attr('id') === "radioselect2") ) {
      $j33("#threetoggle > label").removeClass("active");
      $j33(this).parent().addClass("active");
      pseoData.selected_cut = $j33(this).parent().children('span').html()
    } else if ($j33(this).attr('id') === "radioselect1"){
      $j33("#threetoggle > label").removeClass("active");
      $j33(this).parent().addClass("active")
      pseoData.selected_cut = $j33(this).parent().children('span').html()
    }
  });

  //update
  updateD3()
}
labelRadios();

//onclick 3 radio button refilter and draw
$j33("#threetoggle input:radio").change(function() {
  pseoData.selected_cut = $j33(this).parent().children('span').html()
  updateD3();

  return false;
});

// wrap long text
function wrap(text, width) {
  text.each(function() {
    var text, words, word, line, lineNumber, lineHeight, y, dy, tspan;
    text = d3.select(this);
    words = text.text().split(/\s+/).reverse();
    line = [];
    lineNumber = 0;
    lineHeight = 1.1;
    y = text.attr("y");
    dy = parseFloat(text.attr("dy"));
    tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan")
                    .attr("x", 0)
                    .attr("y", y)
                    .attr("dy", function(){
                      return (++lineNumber * lineHeight + dy) +"em"
                      })
                    .text(word)
      }
    }
  })
}

function formatD3Data(){
  //inputs used to formate data
  var groups = $j33.map(pseoData.degreeFilter, function(d) { return toTitleCase(d.degree) });
  //format the data
  var data = [];
  var maxVal = 0;
  var keys = [];
  
  if (pseoData.analysis_type === "earnings_percentile") {
    var quintile = 'p'+pseoData.selected_cut;
    $j33.each(groups, function(groupIndex, groupValue) {
      var item = {};
      item.degree=groupValue;
      $j33.each(pseoData.degreeJson, function(dataIndex, dataObj) {
        //build the data in grouped format
        if (toTitleCase(dataObj.degree) === groupValue) {
          item[dataObj.year_postgrad] = dataObj[quintile];

          //keep track of the max value for the vertical scale factor
          if (dataObj[quintile] > maxVal) {
            maxVal = +dataObj[quintile];
          }

          //keep track of the unique elements for the group scale factor
          if (keys.indexOf(dataObj.year_postgrad) === -1) {
            keys.push(dataObj.year_postgrad)
          }
        }
      });
      data.push(item);
    });
    
  } else if (pseoData.analysis_type === "years_postgrad") {
    var filter = { year_postgrad: pseoData.selected_cut };
    var tempData = filterJSONMatchAll(pseoData.degreeJson, filter);
    var availablePercentiles = ["p25","p50","p75"];
    var availableLength = availablePercentiles.length;
    
    //all data is in a single object in this format
    $j33.each(tempData, function(dataIndex, dataObj) {
      var item = {};
      item.degree = dataObj.degree;

      for (var i = 0; i < availableLength; i++) {
        //rename and keep fields
        var percentile = availablePercentiles[i];
        var percentileLabel = percentile.substring(1);
             
        if (!dataObj.hasOwnProperty(percentile)) { continue; } 
        
        item[percentileLabel] = dataObj[percentile];
        
        //keep track of the max value for the vertical scale factor
        if (dataObj[percentile] > maxVal) {
          maxVal = +dataObj[percentile];
        }
        
        //keep track of the unique elements for the group scale factor
        if (keys.indexOf(percentileLabel) === -1) {
          keys.push(percentileLabel);
        }
      }
      data.push(item);
    });
  }
  
  if (!keys.some(isNaN)) {
    keys.sort(function(a,b) { return a - b; })
  } else {
    keys.sort()
  }

  return {
    groups: groups,
    data: data,
    maxVal: maxVal,
    keys: keys
  }

}

function getScales(d3DataObj){
  var scale;
  var keys;
  var scale_lookup = {};

  if (pseoData.analysis_type === "earnings_percentile") {
    scale = ["#2E78D2","#205493","#112E51"]
    keys = [1,5,10]
  } else {
    scale = ["#FF7043","#C25432","#853A22"]
    keys = ["25", "50", "75"]
  }

  //hardcoded color lookup
  for (var i = 0; i < keys.length; i++) {
    scale_lookup[keys[i]] = scale[i];
  }

  //scales
  var x0 = d3.scaleBand()
    .rangeRound([0, width])
    .paddingInner(0.1)
    .paddingOuter(0.1)
    .domain(d3DataObj.groups);

  var x1 = d3.scaleBand()
    .padding(0.05)
    .domain(d3DataObj.keys)
    .rangeRound([0, x0.bandwidth()]);

  var y = d3.scaleLinear()
    .rangeRound([height, 0])
    .domain([0, d3DataObj.maxVal])
    .nice();

  var z = d3.scaleOrdinal()
    .range(scale);

  return {
    x0: x0,
    x1: x1,
    y: y,
    z: z,
    z_lookup: scale_lookup
  }
}

function commafy( num ) {
  var str = num.toString().split('.');
  if (str[0].length >= 5) {
    str[0] = str[0].replace(/(\d)(?=(\d{3})$)/g, '$1,');
  }
  if (str[1] && str[1].length >= 5) {
    str[1] = str[1].replace(/(\d{3})/g, '$1 ');
  }
  return str.join('.');
}

function labelOpacity(){
  // turn off bar labels if >= 8 degrees selected
  var retval = 1;
  if ((pseoData.degreeFilter) && (pseoData.degreeFilter.length > 8)) {
    retval = 0;
  }
  return retval
}

pseoData._updateTimeout = null;
function updateD3(){

  //wrap the whole thing in a queued function incase of rapid call
  clearTimeout(pseoData._updateTimeout);
  pseoData._updateTimeout = setTimeout(function() {
    
    // get and format the most current data from the UI
    var d3Data = formatD3Data();
    
    // create the scales based on data and window size
    var d3Scales = getScales(d3Data);

    var transitionDuration = 300;

    var bg = svg.select("g.chart")
      .select("g.contents")
      .selectAll("g.bargroup")
      .data(d3Data.data, function(d){
        return d.degree
      });
    
    //EXIT old elements not present in new data
    var bgexit = bg.exit();
      
    bgexit.selectAll("rect")
      .transition()
      .duration(transitionDuration)
      .style("opacity", 0)
      .attr('height', 0 )
      .attr("y", function() { return d3Scales.y(height); })
      .remove();
      
    bgexit
      .transition()
      .delay(transitionDuration)
      .remove();
      
    //ENTER new elements
    var bgenter = bg.enter();
    
    bgenter.append("g")
      .attr( 'class', 'bargroup' )
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; })
      .selectAll("rect")
      .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); })
      .enter().append("rect")
        .attr("x", function(d) { return d3Scales.x1(d.key); })
        .attr("y", function() { return d3Scales.y(height); })
        .attr("width", d3Scales.x1.bandwidth())
        .attr('height', 0 )
        .transition()
        .duration(transitionDuration)
        .style("opacity", 1)
        .attr("y", function(d) { return d3Scales.y(d.value); })
        .attr("height", function(d) { return height - d3Scales.y(d.value); })
        .attr("fill", function(d) { return d3Scales.z_lookup[d.key]; });
      
    //make room in the bar but allow a delay for other transitions    
    bg.transition()
      .duration(transitionDuration)
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; });
    
    //UPDATE existing data
    var bgUpdate = bg.selectAll("rect")
      .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); });
    
    //if there are less bars than the previous
    bgUpdate.exit()
      .transition()
      .duration(transitionDuration)
      .style("opacity", 0)
      .attr('height', 0 )
      .attr("y", function() { return d3Scales.y(height); })
      .remove();
    
    // if there are more bars than previous
    bgUpdate.enter()
        .append("rect")
        .attr("x", function(d) { return d3Scales.x1(d.key); })
        .attr("y", function() { return d3Scales.y(height); })
        .attr("width", d3Scales.x1.bandwidth())
        .attr('height', 0 )
        .transition()
        .duration(transitionDuration)
        .style("opacity", 1)
        .attr("y", function(d) { return d3Scales.y(d.value); })
        .attr("height", function(d) { return height - d3Scales.y(d.value); })
        .attr("fill", function(d) { return d3Scales.z_lookup[d.key]; });
      
    // if there are the same number of bars as previous
    bgUpdate.transition()
        .style("opacity", 1)
        .attr("x", function(d) { return d3Scales.x1(d.key); })
        .attr("y", function(d) { return d3Scales.y(d.value); })
        .attr("width", d3Scales.x1.bandwidth())
        .attr("height", function(d) { return height - d3Scales.y(d.value); })
        .attr("fill", function(d) { return d3Scales.z_lookup[d.key]; });

    
    
    //labels
    var lg = svg.select("g.chart")
      .select("g.labels")
      .selectAll("g.labelgroup")
      .data(d3Data.data, function(d){
        return d.degree
      });
      
    //EXIT old elements not present in new data    
    var lgexit = lg.exit();
      
    lgexit.selectAll("text")
      .transition()
      .duration(transitionDuration)
      .attr('height', 0 )
      .attr("y", function() { return d3Scales.y(height); })
      .style("opacity", 0)
      .remove();
      
    lgexit
      .transition()
      .delay(transitionDuration)
      .remove();
    
    //ENTER new elements
    lg.enter().append("g")
      .attr('class', 'labelgroup')
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; })
      .selectAll("text")
      .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); })
        .enter().append("text")
        .text(function(d) { if (d.value !== 0) { return "$" + d3.format(",.0f")(d.value); } })
        .attr("font-family", "Helvetica, Arial, sans-serif;")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .style("opacity", 0)
        .attr("x", function(d) { return d3Scales.x1(d.key) + (d3Scales.x1.bandwidth() / 2); })
        .attr("y", function() { return d3Scales.y(height); })
        .attr("font-size", function() { return (d3Scales.x1.bandwidth() / 5).toFixed().toString() + "px" })
        .transition()
        .duration(transitionDuration)
        .style("opacity", labelOpacity())
        .attr("y", function(d) { return d3Scales.y(d.value) + (d3Scales.x1.bandwidth() / 3); });

    lg.transition()
      .duration(transitionDuration)
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; });
        
    //UPDATE existing data
    var lgUpdate = lg.selectAll("text")
      .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); });
      
    //if there are less bars than the previous
    lgUpdate.exit()
      .transition()
      .duration(transitionDuration)
      .attr('height', 0 )
      .attr("y", function() { return d3Scales.y(height); })
      .style("opacity", 0)
      .remove();
      
    // if there are more bars than previous
    lgUpdate.enter()
        .append("text")
        .text(function(d) { if (d.value !== 0) { return "$" + d3.format(",.0f")(d.value); } })
        .attr("font-family", "Helvetica, Arial, sans-serif;")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .style("opacity", 0)
        .attr("x", function(d) { return d3Scales.x1(d.key) + (d3Scales.x1.bandwidth() / 2); })
        .attr("y", function() { return d3Scales.y(height); })
        .attr("font-size", function() { return (d3Scales.x1.bandwidth() / 5).toFixed().toString() + "px" })
        .transition()
        .duration(transitionDuration)
        .style("opacity", labelOpacity())
        .attr("y", function(d) { return d3Scales.y(d.value) + (d3Scales.x1.bandwidth() / 3); });
        
    // if there are the same number of bars as previous
    lgUpdate  
        .text(function(d) { if (d.value !== 0) { return "$" + d3.format(",.0f")(d.value); } })
        .transition()
        .attr("x", function(d) { return d3Scales.x1(d.key) + (d3Scales.x1.bandwidth() / 2); })
        .attr("y", function(d) { return d3Scales.y(d.value) + (d3Scales.x1.bandwidth() / 3); })
        .attr("font-family", "Helvetica, Arial, sans-serif;")
        .attr("font-size", function() { return (d3Scales.x1.bandwidth() / 5).toFixed().toString() + "px" })
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .attr("text-anchor", "middle")
        .style("opacity", labelOpacity());
    
        
    //transition yaxis
    svg.select(".yaxis")
      .transition()
      .duration(transitionDuration)
      .call(d3.axisLeft(d3Scales.y).ticks(null, "s"));
      
      
    //transition yaxis
    svg.select(".xaxis")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(d3Scales.x0))
      .selectAll(".tick text")
        .transition()
        .duration(transitionDuration)
        .attr("font-family", "Helvetica, Arial, sans-serif;")
        .call(wrap, d3Scales.x0.bandwidth());

    // add tooltips
    var chart = d3.select('.chartcontainer')
    chart.selectAll(".tooltip").remove()
    var tooltip = chart.append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    svg.select("g.chart")
      .select("g.contents")
      .selectAll("g.bargroup")
      .selectAll('rect')
      .on('mousemove', function(d) {
        tooltip.transition().duration(200).style('opacity', 1);
        tooltip.html(function() {
          // format money, no fractions
          return "$"+commafy(d.value.toFixed(0));
          } )
          .style('left', function() { return d3.event.layerX + "px" })
          .style('top', function() { return d3.event.layerY - 28 + "px" });
        })
      .on('mouseout', function() { tooltip.transition().duration(500).style('opacity', 0); } )
      .on('mouseover', function() { tooltip.transition().duration(500).style('opacity', 0); } );

    drawLegend(d3Data, d3Scales)
    
  }, 25)
}

function drawLegend(d3Data, d3Scales){

  // legend stuff
  // set the height, width based on the css of the chartDiv
  // set the padding as assigned
  var legendMargin = {top: 10, right: 10, bottom: 10, left: 10};
  var legendWidth = +legendDiv.clientWidth - legendMargin.left - legendMargin.right;
  var legendHeight = +legendDiv.clientHeight - legendMargin.top - legendMargin.bottom;
  
  //scale the svg to the area
  legend.attr("width", legendWidth + legendMargin.left + legendMargin.right)
        .attr("height", legendHeight + legendMargin.top + legendMargin.bottom);

  //clear the slate
  legend.selectAll("*").remove();
  
  var legendgroup = legend.append("g")
      .attr("font-family", "Helvetica, Arial, sans-serif;")
      .attr("font-size", 12)
      .attr("text-anchor", "end")
    .selectAll("g")
    .data(d3Data.keys.slice())
    .enter().append("g")
      .attr("transform", function(d, i) { 
	    if (d3Data.keys.length == 1) {
		  return "translate(1," + 25 + ")";
		} else if (d3Data.keys.length == 2) {
		  return "translate(1," + ((i * 25) + 13) + ")";
		} else {
		  return "translate(1," + i * 25 + ")";
		}
	    ; 
	  });

  legendgroup.append("rect")
      .attr("x", legendWidth - 25)
      .attr("y", legendHeight / 14)
      .attr("width", 20)
      .attr("height", 20)
      .attr("fill", d3Scales.z);

  legendgroup.append("text")
      .attr("x", legendWidth - 30)
      .attr("y", (legendHeight / 14) + 10)
      .attr("dy", "0.32em")
      .text(function(d) { 
        if (pseoData.analysis_type === "earnings_percentile"){
          if (d === 1) { return d+" Year Postgrad"; }
          else { return d+" Years Postgrad"; }
        } else {
          return d+"th Percentile"
        }
      });

}

// draw d3 svg
function drawD3() {
  // get and format the most current data from the UI
  var d3Data = formatD3Data();
  // create the scales based on data and window size
  var d3Scales = getScales(d3Data);
  
  //clear existing
  svg.selectAll("*").remove();

  // update the width and height when window resized
  width = +chartDiv.clientWidth - margin.left - margin.right;
  height = +chartDiv.clientHeight - margin.top - margin.bottom;
  
  //scale the svg to the area
  svg.attr("width", width + margin.left + margin.right)
     .attr("height", height + margin.top + margin.bottom);

  // define the g holding chart elements
  var chart = svg.append("g")
    .attr( 'class', 'chart' )
    .attr("width", width + margin.right)
    .attr("height", height + margin.bottom) 
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
  // barchart and axis
  chart.append("g")
    .attr( 'class', 'contents' )
    .selectAll("g")
    .data(d3Data.data, function(d){
      return d.degree
    })
    .enter().append("g")
      .attr( 'class', 'bargroup' )
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; })
      .selectAll("rect")
      .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); })
      .enter().append("rect")
        .attr("x", function(d) { return d3Scales.x1(d.key); })
        .attr("y", function(d) { return d3Scales.y(d.value); })
        .attr("width", d3Scales.x1.bandwidth())
        .attr("height", function(d) { return height - d3Scales.y(d.value); })
        .attr("fill", function(d) { return d3Scales.z_lookup[d.key]; })
        .style("opacity", 1);
  
  chart.append("g")
    .attr("class", "xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(d3Scales.x0))
    .selectAll(".tick text")
      .attr("font-family", "Helvetica, Arial, sans-serif;")
      .call(wrap, d3Scales.x0.bandwidth());

  chart.append("g")
    .attr("class", "yaxis")
    .call(d3.axisLeft(d3Scales.y).ticks(null, "s"));
  
  //labels  
  chart.append("g")
    .attr( 'class', 'labels' )
    .selectAll("g")
    .data(d3Data.data, function(d){
      return d.degree
    })
    .enter().append("g")
      .attr("transform", function(d) { return "translate(" + d3Scales.x0(d.degree) + ",0)"; })
      .attr( 'class', 'labelgroup' )
    .selectAll("text")
    .data(function(d) { return d3Data.keys.map(function(key) { return {key: key, value: d[key] || 0 }; }); })
    .enter().append("text")
      .text(function(d) { if (d.value !== 0) { return "$" + d3.format(",.0f")(d.value); } })
      .attr("x", function(d) { return d3Scales.x1(d.key) + (d3Scales.x1.bandwidth() / 2); })
      .attr("y", function(d) { return d3Scales.y(d.value) + (d3Scales.x1.bandwidth() / 3); })
      .attr("font-family", "Helvetica, Arial, sans-serif;")
      .attr("font-size", function() { return (d3Scales.x1.bandwidth() / 5).toFixed().toString() + "px" })
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .style("opacity", labelOpacity())
      .attr("text-anchor", "middle");
      
  drawLegend(d3Data, d3Scales)
};

// Redraw based on the new size whenever the browser window is resized.
$j33(window).on('resize', function(){
    //redraw
    drawD3();
    //update (hacky fix because draw not repositioning the data)
    updateD3();
  }  
);

$j33('.btn-group').on('input', 'change', function(){
   var checkbox = $j33(this);
   var label = checkbox.parent('label');
   if ((checkbox.is(':checked')) && !(label.is('disabled')))  {
      label.addClass('active');
   }
   else {
      label.removeClass('active');
   }
});

function setupDegreeButtons(degrees) {
  // degrees are titlecased on input
  // button ids are the valid version of the title (this was a dumb idea)
  // label html is an <input ...> tag followed by the titlecased degree name

  // clear out the existing buttons
  $j33("#checkbox-grid").empty();

  // display titlecased degree text, displayed alphabetically
  $j33.each(degrees.sort(), function( index, value) {
    var checkbox='<label class="btn btn-outline-secondary custom-btn census-font" title="'+value+'"><input type="checkbox" autocomplete="off" id="'+value.replace(/^[^a-z]+|[^\w:.-]+/gi,"")+'">'+value+'</label>';
    $j33("#checkbox-grid").append(checkbox);
  });
  
  $j33('.custom-btn').on('click', function(e) {
    e.preventDefault();
    var check_box = $j33(this).find( "input" );
    var checked = $j33( check_box ).data( "checked" );
    var label = check_box.parent('label');
    
    //disable clicking and reenable after .4 seconds to prevent rapidclick
    label.addClass('disabled')
      .css("pointer-events", "none");
    
    // get the html and remove the <label>, leaving only the degree name in text
    var degreeName = $j33(this).html().replace(/<.*?>/g, "");
    
    if (checked) {
      $j33( check_box ).data( "checked", false );
      //if clicked false, remove from filter of degree data
      $j33.each(pseoData.degreeFilter, function(i){
          if(pseoData.degreeFilter[i].degree === degreeName) {
              pseoData.degreeFilter.splice(i,1);
              return false;
          }
      });
      
    } else {
      $j33( check_box ).data( "checked", true );
      //if clicked true, append to filter of degree data
      pseoData.degreeFilter.push({degree: degreeName});
    }
    
    //remove any notification text
    svg.select("g.chart")
      .select("g.contents")
      .select("g.notifications")
      .remove();
      
    //redraw axis text
    svg.select(".yaxis").selectAll(".yaxislabel").remove();
    svg.select(".yaxis")
        .append("text")
        .attr('class', 'yaxislabel')
        .attr("transform", "rotate(-90)")
        .attr("x", -55)
        .attr("y", -45)
        .attr("dy", ".71em")
        .attr("fill", "#000")
        .attr("text-anchor", "end")
        .attr("font-family", "Helvetica, Arial, sans-serif;")
        .text("Annual Earnings of Baccalaureate Degree Holders (2016 Dollars)");
    
    pseoData.degreeJson = filterJSONMatchAny(pseoData.cohortJson, pseoData.degreeFilter);
    updateD3();
    //block rapid button clicking
    setTimeout(function(){ 
      label.removeClass('disabled').css("pointer-events", "auto");
    }, 400);
    
    label.toggleClass('active');

    return false;
  });
  
  // if no filter is active, select some degrees
  if ($j33.isEmptyObject(pseoData.degreeFilter)){
    pseoData.degreequeue = []
    //select first 5 degrees
    $j33('#checkbox-grid > label > input:lt(4)').each(function(index, value) {
       //set on input lag to mimic interactivity
       var delayclick = setTimeout(function () {
        $j33(value).trigger('click')
       }, 500 * index);
     
     pseoData.degreequeue.push(delayclick)
    });

  // if a filter is already active, select available degrees from existing
  } else {
    // keep a temp degree filter and clear the global one
    var degreeFilter = pseoData.degreeFilter;
    pseoData.degreeFilter = [];

    // click available degrees thus adding them to the global filter
    $j33.each( degreeFilter, function( index, object ) {
      // if the degree exists in the selection, cllick it
      if ($j33.inArray(object.degree, degrees) !== -1) {
        $j33('#checkbox-grid > label > #'+object.degree.replace(/^[^a-z]+|[^\w:.-]+/gi,"")).trigger('click')
      }
    });

  }

}


function setupCohortDropdown(cohorts) {

  var bestCohort;
  var bestCohortLength;
  
  // display titlecased degree text, displayed alphabetically
  $j33.each(cohorts.sort(), function( index, value ) {
    var cohort='<a class="dropdown-item" href="#" id="'+value+'">'+value+'</a>';
    $j33("#cohort-dropdown").append(cohort);
    
    // get the cohort with the most recent cohort with the most available years
    var filter = {cohort: value};
    // filter the raw data with the current cohort
    pseoData.cohortJson = filterJSONMatchAll(pseoData.schoolJson, filter);
    
    getDistinctValues(pseoData.cohortJson, 'year_postgrad', function(d) {
      // the sort is descending
      
      // initialize the variables on first iteration
      if (( !bestCohort ) || ( !bestCohortLength )) {
        bestCohort = value;
        bestCohortLength = d.length;
      // if the more recent versions have more cohorts, use them
      } else if (d.length >= bestCohortLength) {
        bestCohort = value;
        bestCohortLength = d.length;
      }  
    });
  });
  
  // allow selection of cohorts
  $j33("#dropdownCohortButton").removeAttr('disabled');
  
  $j33('#cohort-dropdown a').click(function(){
    $j33('.options').show();
    
    // change the dropdown to show the cohort
    $j33('#dropdownCohortButton').text(this.innerHTML);
    if (!$j33('#dropdownCohortButton').hasClass("active")){
      $j33('#dropdownCohortButton').addClass("active");
    } 
    
    var filter = {cohort: this.id};
    // filter the raw data with the cohort selection
    pseoData.cohortJson = filterJSONMatchAll(pseoData.schoolJson, filter);
    
    //hacky fix for cohort bug where 1st element can't clear rect/text on exit()
    svg.select("g.chart").select("g.contents").selectAll("g.bargroup").remove();
    svg.select("g.chart").select("g.labels").selectAll("g.labelgroup").remove();
    
    // get the distinct degrees based on the active data
    // (callback) fill out and configure the degree selector
    getDistinctValues(pseoData.cohortJson, 'degree', setupDegreeButtons);
    
    // set global var for available years
    getDistinctValues(pseoData.cohortJson, 'year_postgrad', function(d) {
      pseoData.yearsAvailable = d;
    });
    
    labelRadios();
     
    $j33('#cohort-dropdown').removeClass('show');    

    return false;
  });
  
  // simulate click on the best cohort item
  $j33('#cohort-dropdown > #'+bestCohort).trigger('click');
}


function setupInstitutionDropdown(institutions) {

  // display titlecased degree text, displayed alphabetically
  $j33.each(institutions.sort(), function( index, value ) {
    var labelText=spaceTitleDash(value);
    
    // replace the id spaces with underscores for jquery selection
    var institution='<a class="dropdown-item" id="'+value.replace(/ /g,'_')+'">'+labelText+'</a>';
    $j33("#institution-dropdown").append(institution);
  });
  
  $j33('#institution-dropdown a').click(function(){
    // reset all of the dropdowns
    resetUI();
  
    // save the degree for filtering the data in the callback (get distinct degrees)
    var selectedSchool = this.id.replace(/_/g,' '); //swap back the spaces/underscores for data selection
    
    // change the dropdown to show the institution
    $j33('#dropdownSchoolButton').text(this.innerHTML);
    if (!$j33('#dropdownSchoolButton').hasClass("active")){
      $j33('#dropdownSchoolButton').addClass("active");
    } 
    
    // initilize the filter to the school id
    var filter = {school: selectedSchool};
    // filter the raw data with the cohort selection
    pseoData.schoolJson = filterJSONMatchAll(pseoData.stateJson, filter);
    
    // get the distinct cohorts
    // (callback) fill out and configure the dropdown
    getDistinctValues(pseoData.schoolJson, 'cohort', setupCohortDropdown);

    $j33("#institution-dropdown").removeClass('show');
    
    return false;
  });
  
  // select example institution
  if ($j33("#dropdownStateButton").text() == "TEXAS") {
    $j33('#institution-dropdown > #UNIVERSITY_OF_TEXAS-AUSTIN').trigger('click');
  } else if ($j33("#dropdownStateButton").text() == "COLORADO") {
    $j33('#institution-dropdown > #UNIVERSITY_OF_COLORADO-BOULDER').trigger('click');
  }

}

function setupStateDropdown(states) {
  // display each state 2 digit alphabetically
  $j33.each(states.sort(), function( index, value ) {
    var institution='<a class="dropdown-item" id="'+value+'">'+pseoData.statefp_hash[value]+'</a>';
    $j33("#state-dropdown").append(institution);
  });
  
  $j33('#state-dropdown a').click(function(){
    // reset the UI and institutions
    resetST();
  
    // save the degree for filtering the data in the callback (get distinct degrees)
    var selectedState = this.id; //swap back the spaces/underscores for data selection
    
    // change the dropdown to show the institution
    $j33('#dropdownStateButton').text(this.innerHTML);
    if (!$j33('#dropdownStateButton').hasClass("active")){
      $j33('#dropdownStateButton').addClass("active");
    } 
    
    // initilize the filter to the school id
    var filter = {state: selectedState};
    // filter the raw data with the cohort selection
    pseoData.stateJson = filterJSONMatchAll(pseoData.rawJson, filter);
    
    // get the distinct cohorts
    // (callback) fill out and configure the dropdown
    getDistinctValues(pseoData.stateJson, 'school', setupInstitutionDropdown);

    $j33("#state-dropdown").removeClass('show');
    
    return false;
  });
  
  // select the colorado data
  $j33('#state-dropdown > #CO').trigger('click');
 
}
    
// Get the data
d3.csv("graduate_earnings_all.csv", function(d) {

  // Discard suppressed cells and non bachelors degrees
  if ( (d.cell_suppressed !== "1") && (d.deglevl === "Baccalaureate") ){
  // convert variables to numeric
  return {
    state: d.state,
    school : d.institution_name,
    degree : toTitleCase(d.ciptitle),
    cohort : d.grad_cohort_label,
    cells : +d.cellcount,
    p25 : +d.p25_earnings,
    p50 : +d.p50_earnings,
    p75 : +d.p75_earnings,
    year_postgrad : +d.year_postgrad
    }
  }
}, function(error, json) {
  if (error) throw error;

  //global the data
  pseoData.rawJson = json;
  
  //get the distinct state values and callback to configure the state selector
  getDistinctValues(pseoData.rawJson, 'state', setupStateDropdown)
});

$j33(function() {
  drawD3();
});
