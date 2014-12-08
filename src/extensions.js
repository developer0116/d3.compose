(function(d3, _, helpers) {
  var property = helpers.property;
  var valueOrDefault = helpers.valueOrDefault;
  var di = helpers.di;

  /**
    Extensions for handling series data
  */
  var Series = {
    isSeries: true,

    seriesKey: di(function(chart, d, i) {
      return d.key;
    }),
    seriesValues: di(function(chart, d, i) {
      // Store seriesIndex on series
      d.seriesIndex = i;
      return d.values;
    }),
    seriesClass: di(function(chart, d, i) {
      return 'chart-series chart-index-' + i + (d['class'] ? ' ' + d['class'] : '');
    }),
    seriesIndex: di(function(chart, d, i) {
      var series = chart.seriesData.call(this, d, i);
      return series && series.seriesIndex || 0;
    }),
    seriesCount: di(function(chart, d, i) {
      return chart.data() ? chart.data().length : 1;
    }),
    seriesData: di(function(chart, d, i) {
      return helpers.getParentData(this);
    }),
    itemStyle: di(function(chart, d, i) {
      // Get style for data item in the following progression
      // data.style -> series.style -> chart.style
      var series = chart.seriesData.call(this, d, i) || {};
      var styles = _.defaults({}, d.style, series.style, chart.options().style);
      
      return helpers.style(styles) || null;
    }),

    /**
      seriesLayer

      extension of layer()
      - updates dataBind method to access underlying series values
      - handles appending series groups to chart
      -> should be used just like layer() would be used without series
      
      @param {String} name
      @param {Selection} selection
      @param {Object} options (`dataBind` and `insert` required)
    */
    seriesLayer: function(name, selection, options) {
      if (options && options.dataBind) {
        var dataBind = options.dataBind;

        options.dataBind = function(data) {
          var chart = this.chart();
          var series = this.selectAll('g')
            .data(data, chart.seriesKey);

          series.enter()
            .append('g')
            .attr('class', chart.seriesClass);
          series.chart = function() { return chart; };

          return dataBind.call(series, chart.seriesValues);
        };
      }
      
      return d3.chart().prototype.layer.call(this, name, selection, options);
    }
  };

  /**
    Extensions for handling XY data

    Properties:
    - xKey {String}
    - yKey {String}
    - xScale {Object|d3.scale}
    - yScale {Object|d3.scale}
    - xMin {Number}
    - xMax {Number}
    - yMin {Number}
    - yMax {Number}
  */
  var XY = {
    isXY: true,

    xKey: property('xKey', {defaultValue: 'x'}),
    yKey: property('yKey', {defaultValue: 'y'}),

    xScale: property('xScale', {
      type: 'Function',
      set: function(value) {
        var scale = helpers.createScaleFromOptions(value);
        this.setXScaleRange(scale);

        return {
          override: scale
        };
      }
    }),
    yScale: property('yScale', {
      type: 'Function',
      set: function(value) {
        var scale = helpers.createScaleFromOptions(value);
        this.setYScaleRange(scale);

        return {
          override: scale
        };
      }
    }),

    xMin: property('xMin', {
      get: function(value) {
        var min = helpers.min(this.data(), this.xValue);

        // Default behavior: if min is less than zero, use min, otherwise use 0
        return +valueOrDefault(value, (min < 0 ? min : 0));
      }
    }),
    xMax: property('xMax', {
      get: function(value) {
        var max = helpers.max(this.data(), this.xValue);
        return +valueOrDefault(value, max);
      }
    }),
    yMin: property('yMin', {
      get: function(value) {
        var min = helpers.min(this.data(), this.yValue);

        // Default behavior: if min is less than zero, use min, otherwise use 0
        return +valueOrDefault(value, (min < 0 ? min : 0));
      }
    }),
    yMax: property('yMax', {
      get: function(value) {
        var max = helpers.max(this.data(), this.yValue);
        return +valueOrDefault(value, max);
      }
    }),

    initialize: function() {
      // Set scale range once chart has been rendered
      // TODO Better event than change:data
      this.on('change:data', function() {
        this.setXScaleRange(this.xScale());
        this.setYScaleRange(this.yScale());
      }.bind(this));
    },

    x: di(function(chart, d, i) {
      return +chart.xScale()(chart.xValue.call(this, d, i));
    }),
    y: di(function(chart, d, i) {
      return +chart.yScale()(chart.yValue.call(this, d, i));
    }),
    x0: di(function(chart, d, i) {
      return +chart.xScale()(0);
    }),
    y0: di(function(chart, d, i) {
      return +chart.yScale()(0);
    }),

    xValue: di(function(chart, d, i) {
      return d[chart.xKey()];
    }),
    yValue: di(function(chart, d, i) {
      return d[chart.yKey()];
    }),
    keyValue: di(function(chart, d, i) {
      return !_.isUndefined(d.key) ? d.key : chart.xValue.call(this, d, i);
    }),

    setXScaleRange: function(xScale) {
      xScale.range([0, this.width()]);
    },
    setYScaleRange: function(yScale) {
      yScale.range([this.height(), 0]);
    }
  };

  /**
    TODO Remove
  */
  var XYSeries = {};

  /**
    Extensions for charts of centered key,value data (x: index, y: value, key)
  
    Properties:
    - [itemPadding = 0.1] {Number} % padding between each item (for ValuesSeries, padding is just around group, not individual series items)
    Dependencies: XY
  */
  var Values = {
    isValues: true,

    // Define % padding between each item
    // (If series is displayed adjacent, padding is just around group, not individual series)
    itemPadding: property('itemPadding', {defaultValue: 0.1}),

    setXScaleRange: function(xScale) {
      if (_.isFunction(xScale.rangeBands)) {
        xScale.rangeBands(
          [0, this.width()], 
          this.itemPadding(), 
          this.itemPadding() / 2
        );
      }
      else {
        XY.setXScaleRange.call(this, xScale);
      }
    }
  };

  /**
    Extensions for charts of centered key,value series data (x: index, y: value, key)

    Properties:
    - [displayAdjacent = false] {Boolean} Display series next to each other (default is stacked)
    Dependencies: Series, XY, XYSeries, Values
  */
  var ValuesSeries = {
    displayAdjacent: property('displayAdjacent', {defaultValue: false}),

    transform: function(data) {
      // Transform series data from values to x,y
      _.each(data, function(series) {
        series.values = _.map(series.values, function(item, index) {
          item = _.isObject(item) ? item : {y: item};
          item.x = valueOrDefault(item.x, item.key);

          return item;
        }, this);
      }, this);

      return data;
    },

    // determine centered-x based on series display type (adjacent or layered)
    x: di(function(chart, d, i) {
      return chart.displayAdjacent() ? chart.adjacentX.call(this, d, i) : chart.layeredX.call(this, d, i);
    }),

    // AdjacentX/Width is used in cases where series are presented next to each other at each value
    adjacentX: di(function(chart, d, i) {
      var adjacentWidth = chart.adjacentWidth.call(this, d, i);
      var left = chart.layeredX.call(this, d, i) - chart.layeredWidth.call(this, d, i) / 2 + adjacentWidth / 2;
      
      return left + adjacentWidth * chart.seriesIndex.call(this, d, i) || 0;
    }),
    adjacentWidth: di(function(chart, d, i) {
      var seriesCount = chart.seriesCount.call(this);

      if (seriesCount > 0)
        return chart.layeredWidth.call(this, d, i) / seriesCount;
      else
        return 0;
    }),

    // LayeredX/Width is used in cases where sereis are presented on top of each other at each value
    layeredX: di(function(chart, d, i) {
      return chart.xScale()(chart.xValue.call(this, d, i)) + 0.5 * chart.layeredWidth.call(this) || 0;
    }),
    layeredWidth: di(function(chart, d, i) {
      var rangeBand = chart.xScale().rangeBand();
      return isFinite(rangeBand) ? rangeBand : 0;
    }),

    // determine item width based on series display type (adjacent or layered)
    itemWidth: di(function(chart, d, i) {
      return chart.displayAdjacent() ? chart.adjacentWidth.call(this, d, i) : chart.layeredWidth.call(this, d, i);
    })
  };

  /**
    Extensions for handling labels in charts

    Properties:
    - [labels] {Object}
    - [labelFormat] {String|Function}
    - [labelPosition = 'top'] {String} Label position (top, right, bottom, left)
    - [labelOffset = 0] {Number|Object} Label offset (distance or {x, y})
  */
  var Labels = {
    labels: property('labels', {
      defaultValue: {},
      set: function(options) {
        if (_.isBoolean(options))
          options = {display: options};
        else if (_.isString(options))
          options = {display: options == 'display' || options == 'show'}; 
        else if (options && _.isUndefined(options.display))
          options.display = true;

        _.each(options, function(value, key) {
          // Capitalize and append "label" and then set option
          var labelOption = 'label' + helpers.capitalize(key);

          if (this[labelOption] && this[labelOption].isProperty && this[labelOption].setFromOptions)
            this[labelOption](value, {silent: true});
        }, this);
      }
    }),

    labelDisplay: property('labelDisplay', {defaultValue: false}),
    labelFormat: property('labelFormat', {
      type: 'Function',
      set: function(value) {
        if (_.isString(value)) {
          return {
            override: d3.format(value)
          };
        }
      }
    }),
    labelPosition: property('labelPosition', {
      validate: function(value) {
        return _.contains(['top', 'right', 'bottom', 'left'], value);
      }
    }),
    labelOffset: property('labelOffset', {
      get: function(offset) {
        if (_.isNumber(offset)) {
          offset = {
            top: {x: 0, y: -offset},
            right: {x: offset, y: 0},
            bottom: {x: 0, y: offset},
            left: {x: -offset, y: 0}
          }[this.labelPosition()];

          if (!offset) {
            offset = {x: 0, y: 0};
          }
        }

        return offset;
      }
    }),
    labelPadding: property('labelPadding'),
    labelAnchor: property('labelAnchor', {
      defaultValue: function() {
        var position = this.labelPosition();
        if (!_.isUndefined(position)) {
          if (position == 'right')
            return 'start';
          else if (position == 'left')
            return 'end';
          else
            return 'middle';
        }
      },
      validate: function(value) {
        return _.contains(['start', 'middle', 'end'], value);
      }
    }),
    labelAlignment: property('labelAlignment', {
      defaultValue: function() {
        var position = this.labelPosition();
        if (!_.isUndefined(position)) {
          var alignmentByPosition = {
            'top': 'bottom',
            'right': 'middle',
            'bottom': 'top',
            'left': 'middle'
          };

          return alignmentByPosition[position];
        }        
      },
      validate: function(value) {
        return _.contains(['top', 'middle', 'bottom'], value);
      }
    }),
    labelStyle: property('labelStyle', {defaultValue: {}}),

    labelText: di(function(chart, d, i) {
      var value = chart.yValue.call(this, d, i);
      return chart.labelFormat() ? chart.labelFormat()(value) : value;
    }),

    _getLabels: function() {
      var labels = [];

      if (this.labelDisplay()) {
        labels.push({
          // Leave series information blank (labels only)
          labels: _.map(this.data(), function(point, index) {
            return {
              key: this.keyValue(point, index),
              coordinates: {
                x: this.x(point, index),
                y: this.y(point, index)
              },
              text: this.labelText(point, index),
              offset: this.labelOffset(),
              padding: this.labelPadding(),
              anchor: this.labelAnchor(),
              alignment: this.labelAlignment(),
              'class': point['class'],
              style: _.extend({}, this.labelStyle(), point['labelStyle']),
              values: point,
              index: index,
            };
          }, this)
        });
      }      

      return labels;
    },

    _convertPointToLabel: function(point) {
      return {
        key: this.keyValue(point.values, point.index),
        coordinates: point.coordinates,
        text: this.labelText(point.values, point.index),
        offset: this.labelOffset(),
        padding: this.labelPadding(),
        anchor: this.labelAnchor(),
        alignment: this.labelAlignment(),
        'class': point.values['class'],
        style: _.extend({}, this.labelStyle(), point['labelStyle']),
        values: point.values,
        index: point.index
      };
    }
  };

  /**
    Extensions for handling labels in series charts

    Dependencies: Labels
  */
  var LabelsSeries = {
    _getLabels: function() {
      var seriesLabels = [];

      if (this.labelDisplay()) {
        seriesLabels = _.compact(_.map(this.data(), function(series, seriesIndex) {
          if (series.excludeFromLabels) return;

          return {
            key: series.key,
            name: series.name,
            'class': series['class'],
            index: seriesIndex,
            labels: _.map(series.values, function(point, pointIndex) {
              return {
                key: this.keyValue.call({_parentData: series}, point, pointIndex),
                coordinates: {
                  x: this.x.call({_parentData: series}, point, pointIndex),
                  y: this.y.call({_parentData: series}, point, pointIndex)
                },
                text: this.labelText.call({_parentData: series}, point, pointIndex),
                offset: this.labelOffset(),
                padding: this.labelPadding(),
                anchor: this.labelAnchor(),
                alignment: this.labelAlignment(),
                'class': point['class'],
                style: _.extend({}, this.labelStyle(), point['labelStyle']),
                values: point,
                index: pointIndex,
              };
            }, this)
          };
        }, this));
      }
      
      return seriesLabels;
    }
  };

  // Expose extensions
  d3.chart.extensions = _.extend(d3.chart.extensions || {}, {
    Series: Series,
    XY: XY,
    XYSeries: _.extend({}, Series, XY, XYSeries),
    Values: _.extend({}, XY, Values),
    ValuesSeries: _.extend({}, Series, XY, XYSeries, Values, ValuesSeries),
    Labels: Labels,
    LabelsSeries: _.extend({}, Labels, LabelsSeries)
  });

})(d3, _, d3.chart.helpers);
