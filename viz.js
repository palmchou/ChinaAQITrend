//Define Margin
var margin = {left: 60, right: 30, top: 20, bottom: 0},
    width = 740 - margin.left - margin.right,
    height = 540 - margin.top - margin.bottom;

//Define SVG
var svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// for line chart
var lc_margin = {left: 60, right: 20, top: 20, bottom: 20},
    lc_width = 430 - lc_margin.left - lc_margin.right,
    lc_height = 280 - lc_margin.top - lc_margin.bottom,
    lg_margin = {left: 60, right: 20, top: 20, bottom: 20},
    legend_height = 260 - lg_margin.top - lg_margin.bottom;


var linechart_svg = d3.select("#visualization")
    .append("svg")
    .attr("width", lc_width + lc_margin.left + lc_margin.right)
    .attr("height", lc_height + legend_height + lc_margin.top + lc_margin.bottom + lg_margin.top + lg_margin.bottom)
    .append("g")
    .attr("transform", "translate(" + lc_margin.left + "," + lc_margin.top + ")");

function tweenDashoffsetOn() {
    const l = this.getTotalLength(),
        i = d3.interpolateString("" + l, "0");
    return function (t) {
        return i(t);
    };
}

function tweenDashoffsetOff() {
    const l = this.getTotalLength(),
        i = d3.interpolateString("0", "" + l);
    return function (t) {
        return i(t);
    };
}

var parseTime = d3.timeParse("%Y%m");
var formatTime = d3.timeFormat("%b %Y");

var lc_xScale = d3.scaleTime().range([0, lc_width]).domain([parseTime("201402"), parseTime("201602")]),
    lc_yScale = d3.scaleLinear().rangeRound([lc_height, 0]).domain([0, 300]);

var line = d3.line()
    .curve(d3.curveBasis) // interpolate the curve
    .x(function (d) {
        return lc_xScale(d.year);
    })
    .y(function (d) {
        return lc_yScale(d.aqi);
    });


var geo_map = svg.append("g")
    .attr("class", 'geo-map');

var counties = geo_map.append("g")
    .attr("class", "counties");

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

var map_title;

var path = d3.geoPath();

var zoom = d3.zoom()
    .scaleExtent([1.0, 8])
    .on("zoom", zoomed);

function zoomed() {
    geo_map.attr("transform", d3.event.transform);
}

// prepare the aqi_data table
var aqi_data;

var ym_list = [];

function idx_to_ym(i) {
    var m = (1 + i) % 12 + 1;
    var y = 2014 + parseInt((1 + i) / 12);
    return String(y * 100 + m)
}

for (var i = 0; i < 25; i++) {
    ym_list.push(idx_to_ym(i));
}

var cur_ym = ym_list[0];

var AQI_colorScheme = ['#00E400', '#FFFF00', '#FF7E00', '#FF0000', '#8f3f97', '#7E0023'];

function AQI_colorScale(aqi) {
    var noValueColor = '#eff0f1';
    if (aqi < 0) {
        return noValueColor;
    } else if (aqi <= 50) {
        return AQI_colorScheme[0];
    } else if (aqi <= 100) {
        return AQI_colorScheme[1];
    } else if (aqi <= 150) {
        return AQI_colorScheme[2];
    } else if (aqi <= 200) {
        return AQI_colorScheme[3];
    } else if (aqi <= 300) {
        return AQI_colorScheme[4];
    } else {
        return AQI_colorScheme[5];
    }
}

function render_color() {
    var data = aqi_data[cur_ym];
    counties.selectAll("path")
        .style("fill", function (d) {
            return AQI_colorScale(data[d.properties.id][6])
        });
}

var pollutant_names = ['PM2.5', 'PM10', 'O3', 'NO2', 'SO2', 'CO'];

function getTooltipHtml(data) {
    // console.log(data);
    var out = "";
    out += data.properties.name + '<br>';
    out += 'AQI: ' + aqi_data[cur_ym][data.properties.id][6] + '<br>';
    for (var i = 0; i < 6; i++ ) {
        out += pollutant_names[i] + ': ' + aqi_data[cur_ym][data.properties.id][i] + '<br>';
    }
    return out
}

function loaded(err, cn, _aqi_data) {
    if (err) return console.error(err);

    counties.selectAll("path")
        .data(topojson.feature(cn, cn.objects.counties).features)
        .enter().append("path")
        .attr("d", path)
        .on("mouseover", function (d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(getTooltipHtml(d))
                .style("left", (d3.event.pageX + 4) + "px")
                .style("top", (d3.event.pageY + 4) + "px");
            d3.select(this).attr("class", "highlight");
        })
        .on("mouseout", function (d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
            d3.select(this).attr("class", "");
        })
        .on("click", function (d) {
            draw_line(d.properties.id);
        });

    geo_map.append("g")
        .attr("class", "provinces")
        .selectAll("path")
        .data(topojson.feature(cn, cn.objects.provinces).features)
        .enter().append("path")
        .attr("d", path);

    map_title = svg.append("text")
        .attr("class", "map-title noselect")
        .attr("x", width / 2)
        .attr("y", 10)
        .text("Air Quality Index Map, Feb. 2014");

    svg.call(zoom);
    // 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co'
    aqi_data = _aqi_data;
    render_color();


    linechart_svg.append("g")
        .attr("class", "line-chart-lines");

    // for line chart
    linechart_svg.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + lc_height + ")")
        .call(d3.axisBottom(lc_xScale));

    linechart_svg.append("g")
        .attr("class", "axis axis--y")
        .call(d3.axisLeft(lc_yScale))
        .append("text")
        .text("Air Quality Index")
        .attr("transform", "rotate(-90)")
        .attr("x", -(lc_height / 2))
        .attr("dy", "-3em")
        .attr("fill", "black")
        .style("text-anchor", "middle")
        // .attr("font-weight", "bold")
        .attr("font-size", "12px");
}


d3.queue().defer(d3.json, "counties-merge-topo.json")
    .defer(d3.json, "aqi_for_geo.json")
    .await(loaded);

function set_ym(ym) {
    cur_ym = ym;
    render_color();
    map_title.text("Air Quality Index Map, " + formatTime(parseTime(cur_ym)));
}

function reset_cur_ym(idx) {
    var new_ym = idx_to_ym(idx);
    if (new_ym !== cur_ym) {
        set_ym(new_ym);
    }
}

function draw_line(ac_id) {
    var line_data = [];
    for (var i = 0; i < 25; i++) {
        var ym = idx_to_ym(i);
        line_data.push({
            year: parseTime(ym),
            aqi: aqi_data[ym][ac_id][6]
        });
    }
    console.log(line_data);
    var lines = linechart_svg.selectAll(".line-chart-lines");
    lines.selectAll("path").remove();

    lines.append("path")
        .datum(line_data)
        .attr("class", "line")
        .attr("d", function (d) {
            return line(d);
        })
        .attr("fill", "none")
        .style("stroke", function (d) {
            return "#000";
        });

    function initDash() {
        d3.select(this)
            .attr("stroke-dasharray", this.getTotalLength() + "," + this.getTotalLength())
            .attr("stroke-dashoffset", "" + this.getTotalLength());
    }

    var paths = lines.select("path")
        .each(initDash)
        .transition()
        .duration(2000)
        .attrTween("stroke-dashoffset", tweenDashoffsetOn);
}

var idx = 0;
// setInterval(function () {
//     slider.value(idx % 25);
//     slider();
//     reset_cur_ym(slider.value());
//     idx += 1;
// }, 1000);

function reset_zoom() {
    svg.call(zoom.transform, d3.zoomIdentity);
}

var slider = sliderFactory();
d3.select('#slider_holder').call(slider
    .height(70)
    .width(760)
    .margin({
        top: 35,
        right: 40,
        bottom: 15,
        left: 40
    })
    .value(0).ticks(12).scale(true).range([0, 24]).step(1).label(true)
    .dragHandler(function (d) {
        reset_cur_ym(d.value());
    }));

