/* Constants */

NVD3_ID_ATTR_NAME = 'nvd3_id';

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
    if(isDefined(options.width)) {
        chart = chart.width(parseInt(options.width));
    }
    if(isDefined(options.height)) {
        chart = chart.height(parseInt(options.height));
    }
    if(isDefined(options.tooltips)) {
        chart = chart.tooltips(strToBool(options.tooltips));
    }
    if(isDefined(options.legend)) {
        chart = chart.showLegend(strToBool(options.legend));
    }

    if(options.x_format) {
        chart.xAxis.tickFormat(d3.format(options.x_format));
    } else if(options.x_date_format) {
        chart.xAxis
            .tickFormat(function(x) {
                return d3.time.format(options.x_date_format)(new Date(x))
            });
    }

    if(options.y_format) {
        chart.yAxis.tickFormat(d3.format(options.y_format));
    } else if(options.y_date_format) {
        chart.yAxis
            .tickFormat(function(y) {
                return d3.time.format(options.y_date_format)(new Date(y))
            });
    }

    if(isDefined(options.clip)) {
        chart = chart.clipEdge(true);
    }

    return chart
        .x(function(item) {
            if(options.x_date_format) {
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

/* Render a chart.
 */
function renderChart(chart_node, id) {
    chart_node.attr(NVD3_ID_ATTR_NAME, id.toString());
    chart_node.append('<svg></svg>');

    /* Hide the data */
    $(chart_node).find('data').hide();

    /* Extract the data and the options */

    var data = processData(extractData(chart_node.children("data")));
    var options = {
        'type': chart_node.attr('type'),
        'title': chart_node.attr('title') || "Untitled",
        'width': chart_node.attr('width'),
        'height': chart_node.attr('height'),
        'x_start': chart_node.attr('x-start'),
        'x_end': chart_node.attr('x-end'),
        'x_format': chart_node.attr('x-format'),
        'x_date_format': chart_node.attr('x-date-format'),
        'y_start': chart_node.attr('y-start'),
        'y_end': chart_node.attr('y-end'),
        'y_format': chart_node.attr('y-format'),
        'y_date_format': chart_node.attr('y-date-format'),
        'tooltips': chart_node.attr('tooltips'),
        'legend': chart_node.attr('legend'),
        'clip': chart_node.attr('clip')
    }

    /* Decide what kind of chart we want to render, and in some cases manipulate
     * data to fit better */

    var chart_model;

    if (options.type == 'line') {
        chart_model = nv.models.lineChart();
        data = multiSeriesData(data);
    } else if (options.type == 'pie') {
        chart_model = nv.models.pieChart();
    } else if (options.type == 'stacked') {
        chart_model = nv.models.stackedAreaChart();
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

            if(isDefined(options.width)) {
                selector = selector.attr('width', options.width);
            }
            if(isDefined(options.height)) {
                selector = selector.attr('height', options.height);
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
