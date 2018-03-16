//Define Margin
var margin = {left: 85, right: 85, top: 0, bottom: 0},
    width = 1170 - margin.left - margin.right,
    height = 520 - margin.top - margin.bottom;

//Define SVG
var svg = d3.select("#visualization")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

var geo_map = svg.append("g")
    .attr("class", 'geo-map');

var counties = geo_map.append("g")
    .attr("class", "counties");

var path = d3.geoPath();

var zoom = d3.zoom()
    .scaleExtent([1.0, 8])
    .on("zoom", zoomed);

function zoomed() {
    geo_map.attr("transform", d3.event.transform);
}

var parseTime = d3.timeParse("%Y%m");

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

var cur_ym = ym_list[0];

function render_color() {
    var data = aqi_data[cur_ym];
    counties.selectAll("path")
        .style("fill", function (d) {
            return AQI_colorScale(data[d.properties.id][6])
        });
}

function loaded(err, cn, _aqi_data) {
    if (err) return console.error(err);

    counties.selectAll("path")
        .data(topojson.feature(cn, cn.objects.counties).features)
        .enter().append("path")
        .attr("d", path);

    geo_map.append("g")
        .attr("class", "provinces")
        .selectAll("path")
        .data(topojson.feature(cn, cn.objects.provinces).features)
        .enter().append("path")
        .attr("d", path);

    svg.call(zoom);
    // 'pm25', 'pm10', 'o3', 'no2', 'so2', 'co'
    aqi_data = _aqi_data;
    render_color();
}


d3.queue().defer(d3.json, "counties-merge-topo.json")
    .defer(d3.json, "aqi_for_geo.json")
    .await(loaded);

function reset_cur_ym(idx) {
    var new_ym = idx_to_ym(idx);
    if (new_ym !== cur_ym) {
        cur_ym = new_ym;
        render_color();
    }
}

var idx = 0;
// setInterval(function () {
//     slider.value(idx % 25);
//     slider();
//     reset_cur_ym(slider.value());
//     idx += 1;
// }, 1000);

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

