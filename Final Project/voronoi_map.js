// creates the selector function 

showHide = function(selector) {
  d3.select(selector).select('.show').on('click', function(){
    d3.select(selector)
      .classed('visible', true);
  });
}

// main function
voronoiMap = function(map, url, DefaultView) {
  var pointTypes = d3.map(),
      points = [],
      lastSelectedPoint;

//draw the voronoi graph
  var voronoi = d3.geom.voronoi()
      .x(function(d) { return d.x; })
      .y(function(d) { return d.y; });

//selects points on the map
  var selectPoint = function() {
    d3.selectAll('.selected').classed('selected', false);

//creates voronoi cells around the point
    var cell = d3.select(this),
        point = cell.datum();

//creates 
    lastSelectedPoint = point;
    cell.classed('selected', true);

    d3.select('#selected h1')
      .html('')
      .append('a')
        .text(point.name)
        .attr('href', point.url)
        .attr('target', '_blank')
  }

//updates selected points on the map
  var drawPointTypeSelection = function() {
    showHide('#selections')
    labels = d3.select('#toggles').selectAll('input')
      .data(pointTypes.values())
      .enter().append("label");

//adds checkbox for different categories of stores
    labels.append("input")
      .attr('type', 'checkbox')
      .property('checked', function(d) {
        return DefaultView === undefined || DefaultView.has(d.type)
      })
      .attr("value", function(d) { return d.type; })
      .on("change", drawWithLoading);

//adds background color
    labels.append("span")
      .attr('class', 'key')
      .style('background-color', function(d) { return '#' + d.color; });

    labels.append("span")
      .text(function(d) { return d.type; });
  }

//updates selections and adds to map
  var selectedTypes = function() {
    return d3.selectAll('#toggles input[type=checkbox]')[0].filter(function(elem) {
      return elem.checked;
    }).map(function(elem) {
      return elem.value;
    })
  }

//
  var pointsFilteredToSelectedTypes = function() {
    var currentSelectedTypes = d3.set(selectedTypes());
    return points.filter(function(item){
      return currentSelectedTypes.has(item.type);
    });
  }

//
  var drawWithLoading = function(e){
    d3.select('#loading').classed('visible', true);
    if (e && e.type == 'viewreset') {
      d3.select('#overlay').remove();
    }
    setTimeout(function(){
      draw();
      d3.select('#loading').classed('visible', false);
    }, 0);
  }


//draws cells
  var draw = function() {
    d3.select('#overlay').remove();

    var bounds = map.getBounds(),
        topLeft = map.latLngToLayerPoint(bounds.getNorthWest()),
        bottomRight = map.latLngToLayerPoint(bounds.getSouthEast()),
        existing = d3.set(),
        drawLimit = bounds.pad(0.4);

    filteredPoints = pointsFilteredToSelectedTypes().filter(function(d) {
      var latlng = new L.LatLng(d.Latitude, d.Longitude);

      if (!drawLimit.contains(latlng)) { return false };

      var point = map.latLngToLayerPoint(latlng);

      key = point.toString();
      if (existing.has(key)) { return false };
      existing.add(key);

      d.x = point.x;
      d.y = point.y;
      return true;
    });

    voronoi(filteredPoints).forEach(function(d) { d.point.cell = d; });

//overlays voronoi map on the mapbox street map
    var svg = d3.select(map.getPanes().overlayPane).append("svg")
      .attr('id', 'overlay')
      .attr("class", "leaflet-zoom-hide")
      .style("width", map.getSize().x + 'px')
      .style("height", map.getSize().y + 'px')
      .style("margin-left", topLeft.x + "px")
      .style("margin-top", topLeft.y + "px");

    var g = svg.append("g")
      .attr("transform", "translate(" + (-topLeft.x) + "," + (-topLeft.y) + ")");

    var svgPoints = g.attr("class", "points")
      .selectAll("g")
        .data(filteredPoints)
      .enter().append("g")
        .attr("class", "point");

    var buildPathFromPoint = function(point) {
      return "M" + point.cell.join("L") + "Z";
    }

    svgPoints.append("path")
      .attr("class", "point-cell")
      .attr("d", buildPathFromPoint)
      .on('click', selectPoint)
      .classed("selected", function(d) { return lastSelectedPoint == d} );

    svgPoints.append("circle")
      .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
      .style('fill', function(d) { return '#' + d.color } )
      .attr("r", 4);
  }

//draws map and layers
  var mapLayer = {
    onAdd: function(map) {
      map.on('viewreset moveend', drawWithLoading);
      drawWithLoading();
    }
  };


//reads in csv and transform data types for mapping. lat and long selected, plus color. 
  map.on('ready', function() {
    d3.csv(url, function(csv) {
      points = csv;
      points.forEach(function(point) {
        pointTypes.set(point.type, {type: point.type, color: point.color});
      })
      drawPointTypeSelection();
      map.addLayer(mapLayer);
    })
  });
};
