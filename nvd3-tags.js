/** Test whether an object is not undefined.
 */
function isDefined(obj) {
    return obj != undefined;
}

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

/** Convert 'true' to true and everything else to false.
 */
function strToBool(str) {
    return str === 'true' ? true : false
}

function processData(data) {
    return $.map(data, function(row) {
        return [$.map(row, function(item) {
            return !isNaN(item) ? parseFloat(item) : item;
        })];
    });
}

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
            return item[1]
        });
}

/* Render a chart.
 */
function renderChart(chart, data, id, options) {
  nv.addGraph(function() {
      chart = customizeChart(chart, options);

      selector = d3.select('chart[nvd3_id="'+id+'"] svg')
          .datum(data).transition().duration(500);

      if(isDefined(options.width)) {
          selector = selector.attr('width', options.width);
      }
      if(isDefined(options.height)) {
          selector = selector.attr('height', options.height);
      }
      selector = selector.call(chart);

      nv.utils.windowResize(chart.update);

      return chart;
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

/** Render all charts on a page.
 */
function renderAll() {
    $("chart").each(function(index) {
        $(this).attr('nvd3_id', index.toString());
        $(this).append('<svg></svg>');
        var data = processData(extractData($(this).children("data")));
        var options = {
            'type': $(this).attr('type'),
            'title': $(this).attr('title') || "Untitled",
            'width': $(this).attr('width'),
            'height': $(this).attr('height'),
            'x_start': $(this).attr('x-start'),
            'x_end': $(this).attr('x-end'),
            'x_format': $(this).attr('x-format'),
            'x_date_format': $(this).attr('x-date-format'),
            'y_start': $(this).attr('y-start'),
            'y_end': $(this).attr('y-end'),
            'y_format': $(this).attr('y-format'),
            'y_date_format': $(this).attr('y-date-format'),
            'tooltips': $(this).attr('tooltips'),
            'legend': $(this).attr('legend'),
            'clip': $(this).attr('clip')
        }
        if (options.type == 'line') {
            renderChart(nv.models.lineChart(),
                        multiSeriesData(data),
                        index,
                        options);
        } else if (options.type == 'pie') {
            renderChart(nv.models.pieChart(),
                        data,
                        index,
                        options);
        } else if (options.type == 'stacked') {
            renderChart(nv.models.stackedAreaChart(),
                        multiSeriesData(data),
                        index,
                        options);
        }
    });
}
