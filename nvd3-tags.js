/* Constants */

const NVD3_ID_ATTR_NAME = 'nvd3_id';

const CHART_TYPE = 'type';
const CHART_WIDTH = 'width';
const CHART_HEIGHT = 'height';

const CHART_X_START = 'x_start';
const CHART_X_END = 'x_end';
const CHART_X_FORMAT = 'x_format';
const CHART_X_DATE_FORMAT = 'x_date_format';

const CHART_Y_START = 'y_start';
const CHART_Y_END = 'y_end';
const CHART_Y_FORMAT = 'y_format';
const CHART_Y_DATE_FORMAT = 'y_date_format';

const CHART_TOOLTIPS = 'tooltips';
const CHART_LEGEND = 'legend';
const CHART_CLIP = 'clip';

/* Utilities */

/** Test whether an object is not undefined.
 */
function isDefined(obj) {
    return obj != undefined;
}

/** Convert 'true' to true and everything else to false.
 */
function strToBool(str) {
    return str === 'true' ? true : false
}

/* Data processing */

/** Extract data from CSV.
 */
function extractData(nodes) {
    var separated = nodes.text().split('\n');
    var cleaned = $.map(
        $.grep(separated, function(str) {
            return str.trim() != "";
        }),
        function(str) {
            return str.trim();
        }
    );
    var pairs = $.map(cleaned, function(str) {
        return [str.split(',')];
    });
    return $.grep(pairs, function(pair) {
        return isDefined(pair);
    });
}

/** Process CSV data.
 */
function processData(data) {
    return $.map(data, function(row) {
        return [$.map(row, function(item) {
            return !isNaN(item) ? parseFloat(item) : item;
        })];
    });
}

/** Process multi-series data into something NVD3 likes.
 */
function multiSeriesData(data) {
    var labels = data[0].slice(1);
    var values = data.slice(1);
    var output = $.map(labels, function(label,index) {
        return {
            'key': label,
            'values': $.map(values, function(row, pos) {
                return [[row[0],row[index+1]]];
            })
        };
    });
    return output;
}

/* Chart rendering */

/** Apply options to a chart.
 */
function customizeChart(chart, options) {
    /* Set the dimensions of the chart */
    if(isDefined(options[CHART_WIDTH])) {
        chart = chart.width(parseInt(options[CHART_WIDTH]));
    }
    if(isDefined(options[CHART_HEIGHT])) {
        chart = chart.height(parseInt(options[CHART_HEIGHT]));
    }

    /* Apply other general chart options */
    chart = chart.tooltips(strToBool(options[CHART_TOOLTIPS]));
    if(isDefined(options[CHART_LEGEND])) {
        chart = chart.showLegend(strToBool(options[CHART_LEGEND]));
    }
    if(isDefined(options[CHART_CLIP])) {
        chart = chart.clipEdge(strToBool(options[CHART_CLIP]));
    }

    /* Customize the axes */
    if(options[CHART_X_FORMAT]) {
        chart.xAxis.tickFormat(d3.format(options[CHART_X_FORMAT]));
    } else if(options[CHART_X_DATE_FORMAT]) {
        chart.xAxis.tickFormat(function(x) {
            return d3.time.format(options[CHART_X_DATE_FORMAT])(new Date(x));
        });
    }

    if(options[CHART_Y_FORMAT]) {
        chart.yAxis.tickFormat(d3.format(options[CHART_Y_FORMAT]));
    } else if(options[CHART_Y_DATE_FORMAT]) {
        chart.yAxis.tickFormat(function(y) {
            return d3.time.format(options[CHART_Y_DATE_FORMAT])(new Date(y));
        });
    }

    /* Customize axis ranges */
    const x_start = options[CHART_X_START];
    const x_end = options[CHART_X_END];
    if(isDefined(x_start) & isDefined(x_end)) {
        chart.forceX(parseFloat(x_start), parseFloat(x_end));
    }

    const y_start = options[CHART_Y_START];
    const y_end = options[CHART_Y_END];
    if(isDefined(y_start) & isDefined(y_end)) {
        chart.forceY(parseFloat(y_start), parseFloat(y_end));
    }

    /* Add the functions that extract data into the axes */
    return chart
        .x(function(item) {
            if(options[CHART_X_DATE_FORMAT]) {
                // If the values of the x axis are Unix timestamps, we have to
                // modify them slightly for them to work
                return parseInt(item[0].toString() + '000');
            } else {
                return item[0];
            }
        })
        .y(function(item) {
            return item[1];
        });
}

/** Render a chart.
 */
function renderChart(chart_node, id) {
    chart_node.attr(NVD3_ID_ATTR_NAME, id.toString());
    chart_node.append('<svg></svg>');

    /* Hide the data */
    $(chart_node).find('data').hide();

    /* Extract the data and the options */

    var data = processData(extractData(chart_node.children('data')));
    var options = {};

    options[CHART_TYPE] = chart_node.attr(CHART_TYPE);
    options[CHART_WIDTH] = chart_node.attr(CHART_WIDTH);
    options[CHART_HEIGHT] = chart_node.attr(CHART_HEIGHT);
    options[CHART_X_START] = chart_node.attr(CHART_X_START);
    options[CHART_X_END] = chart_node.attr(CHART_X_END);
    options[CHART_X_FORMAT] = chart_node.attr(CHART_X_FORMAT);
    options[CHART_X_DATE_FORMAT] = chart_node.attr(CHART_X_DATE_FORMAT);
    options[CHART_Y_START] = chart_node.attr(CHART_Y_START);
    options[CHART_Y_END] = chart_node.attr(CHART_Y_END);
    options[CHART_Y_FORMAT] = chart_node.attr(CHART_Y_FORMAT);
    options[CHART_Y_DATE_FORMAT] = chart_node.attr(CHART_Y_DATE_FORMAT);
    options[CHART_TOOLTIPS] = chart_node.attr(CHART_TOOLTIPS) || "false";
    options[CHART_LEGEND] = chart_node.attr(CHART_LEGEND);
    options[CHART_CLIP] = chart_node.attr(CHART_CLIP);

    /* Decide what kind of chart we want to render, and in some cases manipulate
     * data to fit better */

    var chart_model;

    const type = options[CHART_TYPE];
    if(type == 'line') {
        chart_model = nv.models.lineChart();
        data = multiSeriesData(data);
    } else if(type == 'pie') {
        chart_model = nv.models.pieChart();
    } else if(type == 'stacked') {
        chart_model = nv.models.stackedAreaChart();
        data = multiSeriesData(data);
    } else if(type == 'bar') {
        chart_model = nv.models.discreteBarChart();
        data = multiSeriesData(data);
    } else {
        console.log("Unknown chart type.");
    }

    /* Render the chart */

    if(chart_model) {
        nv.addGraph(function() {
            var plot = customizeChart(chart_model, options);

            selector = d3.select('chart[' + NVD3_ID_ATTR_NAME + '="'+id+'"] svg')
                .datum(data).transition().duration(500);

            if(isDefined(options[CHART_WIDTH])) {
                selector = selector.attr(CHART_WIDTH, options[CHART_WIDTH]);
            }
            if(isDefined(options[CHART_HEIGHT])) {
                selector = selector.attr(CHART_HEIGHT, options[CHART_HEIGHT]);
            }
            selector = selector.call(plot);

            nv.utils.windowResize(plot.update);

            return plot;
        });
    }
}

/** Render all charts on a page.
 */
function renderAll() {
    $("chart").each(function(index) {
        renderChart($(this), index);
    });
}
