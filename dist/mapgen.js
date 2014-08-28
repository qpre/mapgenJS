var MG = {'lib':{'graph':{},'math':{}}};


/*
 Copyright (c) 2009 Michael Baczynski, http://www.polygonal.de

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:
 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


/*
Implementation of the Park Miller (1988) "minimal standard" linear 
 congruential pseudo-random number generator.
 
 For a full explanation visit: http://www.firstpr.com.au/dsp/rand31/
 
 The generator uses a modulus constant (m) of 2^31 - 1 which is a
 Mersenne Prime number and a full-period-multiplier of 16807.
 Output is a 31 bit unsigned integer. The range of values output is
 1 to 2,147,483,646 (2^31-1) and the seed must be in this range too.
 
 David G. Carta's optimisation which needs only 32 bit integer math,
 and no division is actually *slower* in flash (both AS2 & AS3) so
 it's better to use the double-precision floating point version.
 
 @author Michael Baczynski, www.polygonal.de
*/


/*
	port made from ActionScript to CoffeeScript by Quentin Pré
*/


(function() {

  MG.lib.math.PMPRNG = (function() {
    /*
        set seed with a 31 bit unsigned integer
        between 1 and 0X7FFFFFFE inclusive. don't use 0!
    */

    function PMPRNG() {
      var seed;
      seed = 1;
    }

    /*
        provides the next pseudorandom number
        as an unsigned integer (31 bits)
    */


    PMPRNG.prototype.nextInt = function() {};

    return PMPRNG;

  })();

  this.gen()({
    /* 
    provides the next pseudorandom number
    as a float between nearly 0 and nearly 1.0.
    */

    nextDouble: function() {
      return this.gen() / 2147483647;
    },
    /*
        provides the next pseudorandom number
        as an unsigned integer (31 bits) betweeen
        a given range.
    */

    nextIntRange: function(min, max) {
      min -= 0.4999;
      max += 0.4999;
      return Math.round(min + ((max - min) * nextDouble()));
    },
    /*
        provides the next pseudorandom number
        as a float between a given range.
    */

    nextDoubleRange: function(min, max) {
      return min + ((max - min) * nextDouble());
    },
    /*
        generator:
        new-value = (old-value * 16807) mod (2^31 - 1)
    */

    gen: function() {
      var seed;
      return seed = (seed * 16807) % 2147483647;
    }
  });

  MG.lib.Point = (function() {

    function Point(_x, _y, _z) {
      this._x = _x;
      this._y = _y;
      this._z = _z;
    }

    return Point;

  })();

  MG.lib.graph.Center = (function() {
    var constructor;

    function Center() {}

    constructor = function() {
      this.index = null;
      this.point = null;
      this.water = null;
      this.ocean = null;
      this.coast = null;
      this.biome = null;
      this.elevation = null;
      this.moisture = null;
      this.neighbours = [];
      this.borders = [];
      return this.corners = [];
    };

    return Center;

  })();

  MG.lib.graph.Corner = (function() {
    var constructor;

    function Corner() {}

    constructor = function() {
      this.index = null;
      this.point = null;
      this.water = null;
      this.ocean = null;
      this.coast = null;
      this.biome = null;
      this.elevation = null;
      this.moisture = null;
      this.touches = [];
      this.protrudes = [];
      this.adjacent = [];
      this.river = null;
      this.downslope = null;
      this.watershed = null;
      return this.watershed_size = null;
    };

    return Corner;

  })();

  MG.lib.graph.Edge = (function() {
    var constructor;

    function Edge() {}

    constructor = function() {
      this.index = null;
      this.d0 = null;
      this.d1 = null;
      this.v1 = null;
      this.v2 = null;
      this.midpoint = null;
      return this.river = null;
    };

    return Edge;

  })();

  MG.lib.Map = (function() {
    var centers, corners, edges, islandShape, mapRandom, needsMoreRandomness, numPoints, pointSelector, points;

    Map.LAKE_THRESHOLD = 0.3;

    islandShape = null;

    mapRandom = new PMPRNG();

    needsMoreRandomness = null;

    pointSelector = null;

    numPoints = null;

    points = [];

    centers = [];

    corners = [];

    edges = [];

    function Map(_size) {
      this._size = _size;
      this.numPoints = 1;
      this.reset();
    }

    Map.prototype.newIsland = function(islandType, numPoints, seed, variant) {
      this.islandShape = IslandShape['make' + islandType](seed);
      this.pointSelector = PointSelector['generate' + pointType](SIZE, seed);
      this.needsMoreRandomness = PointSelector.needsMoreRandomness(pointType);
      this.numPoints = numPoints;
      return this.mapRandom.seed = variant;
    };

    Map.prototype.reset = function() {
      var center, corner, edge, _i, _j, _k, _len, _len1, _len2, _ref, _ref1;
      if (this.points) {
        this.points.splice(0, this.points.length);
      }
      if (this.edges) {
        for (_i = 0, _len = edges.length; _i < _len; _i++) {
          edge = edges[_i];
          edge.d0 = edge.d1 = null;
          edge.v0 = edge.v1 = null;
        }
        this.edges.splice(0, this.edges.length);
      }
      if (this.centers) {
        _ref = this.centers;
        for (_j = 0, _len1 = _ref.length; _j < _len1; _j++) {
          center = _ref[_j];
          center.neighbors.splice(0, center.neighbors.length);
          center.corners.splice(0, center.corners.length);
          center.borders.splice(0, center.borders.length);
        }
        this.centers.splice(0, this.centers.length);
      }
      if (this.corners) {
        _ref1 = this.corners;
        for (_k = 0, _len2 = _ref1.length; _k < _len2; _k++) {
          corner = _ref1[_k];
          corner.adjacent.splice(0, q.adjacent.length);
          corner.touches.splice(0, q.touches.length);
          corner.protrudes.splice(0, q.protrudes.length);
          corner.downslope = null;
          corner.watershed = null;
        }
        this.corners.splice(0, corners.length);
      }
      if (!this.points) {
        this.points = [];
      }
      if (!this.edges) {
        this.edges = [];
      }
      if (!this.centers) {
        this.centers = [];
      }
      if (!this.corners) {
        return this.corners = [];
      }
    };

    Map.prototype.go = function(first, last) {
      var stages, timeIt,
        _this = this;
      stages = [];
      timeIt = function(name, fn) {
        var t;
        t = getTimer();
        return fn();
      };
      stages.push([
        "Placing points...", function() {
          _this.reset();
          return _this.points = _this.pointSelector(_this.numPoints);
        }
      ]);
      /*
      		Create a graph structure from the Voronoi edge list. The
      		methods in the Voronoi object are somewhat inconvenient for
      		my needs, so I transform that data into the data I actually
      		need: edges connected to the Delaunay triangles and the
      		Voronoi polygons, a reverse map from those four points back
      		to the edge, a map from these four points to the points
      		they connect to (both along the edge and crosswise).
      */

      return stages.push([
        "Build graph...", function() {
          var voronoi;
          voronoi = new Voronoi(_this.points, null, new Rectangle(0, 0, _this._size, _this._size));
          _this.buildGraph(_this.points, voronoi);
          _this.improveCorners();
          _this.voronoi.dispose();
          _this.voronoi = null;
          return _this.points = null;
        }
      ]);
    };

    return Map;

  })();

}).call(this);
