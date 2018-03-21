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
var lc_margin = {left: 60, right: 20, top: 50, bottom: 20},
    lc_width = 430 - lc_margin.left - lc_margin.right,
    lc_height = 280 - lc_margin.top - lc_margin.bottom,
    lg_margin = {left: 10, right: 20, top: 20, bottom: 20},
    legend_height = 260 - lg_margin.top - lg_margin.bottom;

var linechart_svg = d3.select("#visualization")
    .append("svg")
    .attr("id", "right-seg")
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
    lc_yScale = d3.scaleLinear().rangeRound([lc_height, 0]).domain([0, 500]);

var line = d3.line()
    .curve(d3.curveCatmullRom) // interpolate the curve
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

var map_title, linechart_title, foreign_box;

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
    for (var i = 0; i < 6; i++) {
        out += pollutant_names[i] + ': ' + aqi_data[cur_ym][data.properties.id][i] + '<br>';
    }
    return out
}

function loaded(err, cn, _aqi_data, aqi_desc) {
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
        .attr("class", "viz-title map-title noselect")
        .attr("x", width / 2)
        .attr("y", 10)
        .text("Air Quality Index Map, Feb. 2014");

    svg.call(zoom);
    // 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co'
    aqi_data = _aqi_data;
    render_color();


    linechart_svg.append("g")
        .attr("class", "line-chart-lines");

    var lines = linechart_svg.selectAll(".line-chart-lines");
    lines.append("linearGradient")
        .attr("id", "aqi-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", lc_yScale(0))
        .attr("x2", 0).attr("y2", lc_yScale(500))
        .selectAll("stop")
        //   0 -  50, 10%
        //  50 - 100, 10% - 20%
        // 100 - 150, 20% - 30%
        // 150 - 200, 30% - 40%
        // 200 - 300, 40% - 60%
        // 300 - 500, 60% - 100%
        .data([
            {offset: "0%", color: AQI_colorScheme[0]},
            {offset: "5%", color: AQI_colorScheme[0]},
            {offset: "15%", color: AQI_colorScheme[1]},
            {offset: "25%", color: AQI_colorScheme[2]},
            {offset: "35%", color: AQI_colorScheme[3]},
            {offset: "50%", color: AQI_colorScheme[4]},
            {offset: "80%", color: AQI_colorScheme[5]}
        ])
        .enter().append("stop")
        .attr("offset", function (d) {
            return d.offset;
        })
        .attr("stop-color", function (d) {
            return d.color;
        });

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
        .attr("font-size", "12px");

    linechart_svg.append("text")
        .attr("class", "viz-title linechart-title noselect")
        .attr("x", lc_width / 2)
        .attr("y", -22)
        .text("Air Quality Trend");

    linechart_title = linechart_svg.append("text")
        .attr("class", "viz-title linechart-title noselect")
        .attr("x", lc_width / 2)
        .attr("y", -6)
        .text("City name");

    // ==== legend ====
    var legendRectSize = 34;
    var legendSpacing = 6;

    function set_legend_desc(idx) {
        foreign_box.select('#legend-desc-header')
            .text(aqi_desc[idx].level)
            .style('color', function () {
                if (idx < 6) {
                    return AQI_colorScale(aqi_desc[idx].range[1]);
                } else {
                    return 'black';
                }
            });
        foreign_box.select('#legend-desc-content')
            .text(aqi_desc[idx].meaning);
    }

    var legend = linechart_svg.selectAll('.legend')
        .data(aqi_desc.slice(0, 6))
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', function (d, i) {
            var height = legendRectSize + legendSpacing;
            var x = -lc_margin.left + lg_margin.left;
            var y = i * height + lc_height + lc_margin.bottom + lg_margin.top;
            return 'translate(' + x + ',' + y + ')';
        })
        .on('mouseover', function (d, i) {
            set_legend_desc(i);
        })
        .on('mouseout', function () {
            set_legend_desc(6);
        });

    var outline_desc = aqi_desc[6];

    legend.append('rect')
        .attr('width', legendRectSize)
        .attr('height', legendRectSize)
        .style('fill', function (d) {
            return AQI_colorScale(d.range[1])
        });


    legend.append('text')
        .text(function (d) {
            return "" + d.range[0] + " - " + d.range[1]
        })
        .attr('x', legendRectSize + legendSpacing)
        .attr('y', (legendRectSize) / 2 + 6);

    foreign_box = linechart_svg.append('foreignObject')
        .attr('class', 'foreign-box')
        .attr('x', lg_margin.left + 60).attr('y', lc_height + lg_margin.top + 20)
        .attr('width', 280).attr('height', 220);
    foreign_box.append('xhtml:h4')
        .attr('id', 'legend-desc-header')
        .text(outline_desc.level);
    foreign_box.append('xhtml:p')
        .attr('id', 'legend-desc-content')
        .text(outline_desc.meaning)
}


d3.queue().defer(d3.json, "counties-merge-topo.json")
    .defer(d3.json, "aqi_for_geo.json")
    .defer(d3.json, "aqi_desc.json")
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

    function initDash() {
        d3.select(this)
            .attr("stroke-dasharray", this.getTotalLength() + "," + this.getTotalLength())
            .attr("stroke-dashoffset", "" + this.getTotalLength());
    }

    var line_data = [];
    for (var i = 0; i < 25; i++) {
        var ym = idx_to_ym(i);
        line_data.push({
            year: parseTime(ym),
            aqi: aqi_data[ym][ac_id][6]
        });
    }

    var lines = linechart_svg.selectAll(".line-chart-lines");

    lines.selectAll("path")
        .transition()
        .duration(1000)
        .attrTween("stroke-dashoffset", tweenDashoffsetOff)
        .remove();

    lines.append("path")
        .datum(line_data)
        .attr("class", "line")
        .attr("d", function (d) {
            return line(d);
        })
        .each(initDash)
        .transition()
        .duration(2000)
        .attrTween("stroke-dashoffset", tweenDashoffsetOn);
}

var cur_ap_id = null;

function auto_play_on() {
    var idx = 0;

    function apply_next_ym() {
        slider.value(idx % 25);
        slider();
        reset_cur_ym(slider.value());
        idx += 1;
    }

    apply_next_ym();
    cur_ap_id = setInterval(apply_next_ym, 800);
}

function auto_play_off() {
    if (cur_ap_id) {
        clearInterval(cur_ap_id);
        cur_ap_id = null;
    }
}

function reset_zoom() {
    svg.call(zoom.transform, d3.zoomIdentity);
}

var slider = sliderFactory();
d3.select('#slider_holder').call(slider
    .height(70)
    .width(728)
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

$(function () {
    $('#toggle-autoplay').bootstrapToggle({
        width: 128
    })
        .change(function () {
            if ($(this).prop('checked')) {
                auto_play_on();
            } else {
                auto_play_off();
            }
        });
});