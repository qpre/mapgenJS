var MG = {'extern':{},'lib':{'geometry':{},'graph':{},'math':{}}};


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
  var backBuffer, canvas, centers, corners, ctx, edges, frontBuffer, needsMoreRandomness, numPoints, pointSelector, points;

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
        generator:
        new-value = (old-value * 16807) mod (2^31 - 1)
    */


    PMPRNG.prototype.gen = function() {
      var seed;
      return seed = (seed * 16807) % 2147483647;
    };

    /*
        provides the next pseudorandom number
        as an unsigned integer (31 bits)
    */


    PMPRNG.prototype.nextInt = function() {
      return this.gen();
    };

    /* 
    provides the next pseudorandom number
    as a float between nearly 0 and nearly 1.0.
    */


    PMPRNG.prototype.nextDouble = function() {
      return this.gen() / 2147483647;
    };

    /*
        provides the next pseudorandom number
        as an unsigned integer (31 bits) betweeen
        a given range.
    */


    PMPRNG.prototype.nextIntRange = function(min, max) {
      min -= 0.4999;
      max += 0.4999;
      return Math.round(min + ((max - min) * nextDouble()));
    };

    /*
        provides the next pseudorandom number
        as a float between a given range.
    */


    PMPRNG.prototype.nextDoubleRange = function(min, max) {
      return min + ((max - min) * nextDouble());
    };

    return PMPRNG;

  })();

  MG.lib.Point = (function() {

    function Point(x, y) {
      this.x = x;
      this.y = y;
    }

    Point.interpolate = function(p1, p2, f) {
      var d, x, y;
      d = pt1.x - pt2.x;
      x = pt2.x + f * d;
      y = pt2.y + (x - pt2.x) * ((pt1.y - pt2.y) / d);
      return new Point(x, y);
    };

    Point.prototype.length = function() {
      return Math.sqrt((0 - this.x) * (0 - this.x) + (0 - this.y) * (0 - this.y));
    };

    return Point;

  })();

  MG.lib.IslandShape = (function() {

    function IslandShape() {}

    IslandShape.ISLAND_FACTOR = 1.07;

    IslandShape.prototype.makeRadial = function(seed) {
      var bumps, dipAngle, dipWidth, inside, islandRandom, startAngle;
      islandRandom = new PMPRNG();
      islandRandom.seed = seed;
      bumps = islandRandom.nextDoubleInRange(1, 6);
      startAngle = islandRandom.nextDoubleInRange(0, 2 * Math.PI);
      dipAngle = islandRandom.nextDoubleInRange(0, 2 * Math.PI);
      dipWidth = islandRandom.nextDoubleInRange(0.2, 0.7);
      inside = function(q) {
        var angle, length, r1, r2;
        angle = Math.atan2(qy, q.x);
        length = 0.5 * (Math.max(Math.abs(q.x), Math.abs(q.y)) + q.length);
        r1 = r2 = 0.2;
        if (!(Math.abs(angle - dipAngle) < dipWidth || Math.abs(angle - dipAngle + 2 * Math.PI) < dipWidth || Math.abs(angle - dipAngle - 2 * Math.PI) < dipWidth)) {
          r1 = 0.5 + 0.40 * Math.sin(startAngle + bumps * angle + Math.cos((bumps + 3) * angle));
          r2 = 0.7 - 0.20 * Math.sin(startAngle + bumps * angle - Math.sin((bumps + 3) * angle));
        }
        return length < r1 || (length > r1 * ISLAND_FACTOR && length < r2);
      };
      return inside;
    };

    IslandShape.prototype.makePerlin = function(seed) {
      return console.error("Perlin based Islands not yet supported");
    };

    IslandShape.prototype.makeSquare = function(seed) {
      return function(q) {
        return true;
      };
    };

    IslandShape.prototype.makeBlob = function(seed) {
      return function(q) {
        var body, eye1, eye2;
        eye1 = new Point(q.x - 0.2, q.y / 2 + 0.2).length() < 0.05;
        eye2 = new Point(q.x + 0.2, q.y / 2 + 0.2).length() < 0.05;
        body = q.length() < 0.8 - 0.18 * Math.sin(5 * Math.atan2(q.x, q.y));
        return body && !eye1 && !eye2;
      };
    };

    return IslandShape;

  })();

  MG.lib.PointSelector = (function() {
    var NUM_LLOYD_RELAXATIONS;

    function PointSelector() {}

    NUM_LLOYD_RELAXATIONS = 2;

    PointSelector.needsMoreRandomness = function(type) {
      return type === 'Square' || (type = 'Hexagon');
    };

    PointSelector.generateRandom = function(size, seed) {
      return function(numPoints) {
        var i, mapRandom, p, points, _i;
        mapRandom = new PMPNRG();
        mapRandom.seed = seed;
        points = [];
        for (i = _i = 0; 0 <= numPoints ? _i <= numPoints : _i >= numPoints; i = 0 <= numPoints ? ++_i : --_i) {
          p = new Point(mapRandom.nextDoubleRange(10, size - 10), mapRandom.nextDoubleRange(10, size - 10));
          points.push(p);
        }
        return points;
      };
    };

    return PointSelector;

  })();

  MG.lib.geometry.Circle = (function() {

    function Circle() {}

    return Circle;

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

  Function.prototype.define = function(prop, desc) {
    return Object.defineProperty(this.prototype, prop, desc);
  };

  MG.lib.Map = (function() {
    var islandShape, mapRandom;

    function Map() {}

    Map.LAKE_THRESHOLD = 0.3;

    islandShape = null;

    mapRandom = new MG.lib.math.PMPRNG();

    return Map;

  })();

  needsMoreRandomness = null;

  pointSelector = null;

  numPoints = null;

  points = [];

  centers = [];

  corners = [];

  edges = [];

  ({
    constructor: function(_size) {
      this._size = _size;
      this.numPoints = 1;
      return this.reset();
    },
    newIsland: function(islandType, numPoints, seed, variant) {
      this.islandShape = IslandShape['make' + islandType](seed);
      this.pointSelector = PointSelector['generate' + pointType](SIZE, seed);
      this.needsMoreRandomness = PointSelector.needsMoreRandomness(pointType);
      this.numPoints = numPoints;
      return this.mapRandom.seed = variant;
    },
    reset: function() {
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
    },
    go: function(first, last) {
      var stage, stages, timeIt, _i, _len, _results,
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

      stages.push([
        "Building graph...", function() {
          var result, voronoi;
          voronoi = new Voronoi();
          result = voronoi.compute(_this.points, {
            xl: 0,
            xr: _this._size,
            yt: 0,
            yb: _this._size
          });
          _this.buildGraph(_this.points, result);
          _this.improveCorners();
          return _this.points = null;
        }
      ]);
      stages.push([
        "Assigning elevations...", function() {
          var corner, _i, _len;
          _this.assignCornerElevations();
          _this.assignOceanCoastAndLand();
          redistributeElevations(_this.corners);
          for (_i = 0, _len = corners.length; _i < _len; _i++) {
            corner = corners[_i];
            if (corner.ocean || corner.coast) {
              corner.elevation = 0.0;
            }
          }
          return assignPolygonElevation();
        }
      ]);
      stages.push([
        "Assigning moisture...", function() {
          _this.calculateDownslopes();
          _this.calculateWatersheds();
          _this.createRivers();
          _this.assignCornerMoisture();
          _this.redistributeMoisture(_this.landCorners(_this.corners));
          return _this.assignPolygonMoisture();
        }
      ]);
      stages.push([
        "Decorating map...", function() {
          return _this.assignBiomes();
        }
      ]);
      _results = [];
      for (_i = 0, _len = stages.length; _i < _len; _i++) {
        stage = stages[_i];
        _results.push(this.timeIt(stage[0], stage[1]));
      }
      return _results;
    },
    improveCorners: function() {
      var corner, edge, i, newCorners, point, touch, _i, _j, _k, _l, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
      newCorners = [];
      _ref = this.corners;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        corner = _ref[_i];
        if (corner.border) {
          newCorners[corner.index] = corner.point;
        } else {
          point = new Point(0.0, 0.0);
          _ref1 = corner.touches;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            touch = _ref1[_j];
            point.x += touch.point.x;
            point.y += touch.point.y;
          }
          point.x /= corner.touches.length;
          point.y /= corner.touches.length;
          newCorners[corner.index] = point;
        }
      }
      for (i = _k = 0, _ref2 = this.corners.length; 0 <= _ref2 ? _k <= _ref2 : _k >= _ref2; i = 0 <= _ref2 ? ++_k : --_k) {
        this.corners[i].point = newCorners[i];
      }
      _results = [];
      for (_l = 0, _len2 = edges.length; _l < _len2; _l++) {
        edge = edges[_l];
        if (edge.v0 && edge.v1) {
          _results.push(edge.midpoint = Point.interpolate(edge.v0.point, edge.v1.point, 0.5));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    landCorners: function(corners) {
      var corner, locations, _i, _len;
      locations = [];
      for (_i = 0, _len = corners.length; _i < _len; _i++) {
        corner = corners[_i];
        if (!corner.ocean && !corner.coast) {
          locations.push(corner);
        }
      }
      return locations;
    },
    buildGraph: function(points, voronoi) {
      var addToCenterList, addToCornerList, centerLookup, dedge, edge, ledge, libedges, makeCorner, p, point, vedge, _i, _j, _len, _len1, _results;
      libedges = voronoi.edges;
      centerLookup = {};
      for (_i = 0, _len = points.length; _i < _len; _i++) {
        point = points[_i];
        p = new Center();
        p.index = this.centers.length;
        p.point = point;
        p.neighbors = [];
        p.borders = [];
        p.corners = [];
        this.centers.push(p);
        centerLookup[point] = p;
      }
      this._cornerMap = [];
      makeCorner = function(point) {
        var bucket, corner, dx, dy, q, _j, _k, _len1, _ref, _ref1, _ref2;
        if (point === null) {
          null;
        }
        for (bucket = _j = _ref = point.x - 1, _ref1 = point.x + 1; _ref <= _ref1 ? _j <= _ref1 : _j >= _ref1; bucket = _ref <= _ref1 ? ++_j : --_j) {
          _ref2 = this._cornerMap[bucket];
          for (_k = 0, _len1 = _ref2.length; _k < _len1; _k++) {
            corner = _ref2[_k];
            dx = point.x - corner.point.x;
            dy = point.y - corner.point.y;
            if (dx * dx + dy * dy < Math.exp(6)) {
              return corner;
            }
          }
        }
        bucket = point.x;
        if (!this._cornerMap[bucket]) {
          this._cornerMap[bucket] = [];
        }
        q = new Corner();
        q.index = this.corners.length;
        q.point = point;
        q.border = point.x === 0 || point.x === SIZE || point.y === 0 || point.y === SIZE;
        q.touches = [];
        q.protrudes = [];
        q.adjacent = [];
        this._cornerMap[bucket].push(q);
        this.corners.push(q);
        return q;
      };
      addToCornerList = function(v, x) {
        if (x !== null && v.indexOf(x) < 0) {
          return v.push(x);
        }
      };
      addToCenterList = addToCornerList;
      _results = [];
      for (_j = 0, _len1 = libedges.length; _j < _len1; _j++) {
        ledge = libedges[_j];
        dedge = new LineSegment(ledge.lSite, ledge.rSite);
        vedge = new LineSegment(ledge.va, ledge.vb);
        edge = new Edge();
        edge.index = this.edges.length;
        edge.river = 0;
        edge.midpoint = vedge.p0 && vedge.p1 && Point.interpolate(vedge.p0, vedge.p1, 0.5);
        this.edges.push(edge);
        edge.v0 = makeCorner(vedge.p0);
        edge.v1 = makeCorner(vedge.p1);
        edge.d0 = centerLookup[dedge.p0];
        edge.d1 = centerLookup[dedge.p1];
        if (edge.d0 !== null) {
          edge.d0.borders.push(edge);
        }
        if (edge.d1 !== null) {
          edge.d1.borders.push(edge);
        }
        if (edge.v0 !== null) {
          edge.v0.protrudes.push(edge);
        }
        if (edge.v1 !== null) {
          edge.v1.protrudes.push(edge);
        }
        if (edge.d0 !== null && edge.d1 !== null) {
          addToCenterList(edge.d0.neighbors, edge.d1);
          addToCenterList(edge.d1.neighbors, edge.d0);
        }
        if (edge.v0 !== null && edge.v1 !== null) {
          addToCornerList(edge.v0.adjacent, edge.v1);
          addToCornerList(edge.v1.adjacent, edge.v0);
        }
        if (edge.d0 !== null) {
          addToCornerList(edge.d0.corners, edge.v0);
          addToCornerList(edge.d0.corners, edge.v1);
        }
        if (edge.d1 !== null) {
          addToCornerList(edge.d1.corners, edge.v0);
          addToCornerList(edge.d1.corners, edge.v1);
        }
        if (edge.v0 !== null) {
          addToCenterList(edge.v0.touches, edge.d0);
          addToCenterList(edge.v0.touches, edge.d1);
        }
        if (edge.v1 !== null) {
          addToCenterList(edge.v1.touches, edge.d0);
          _results.push(addToCenterList(edge.v1.touches, edge.d1));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    assignCornerElevations: function() {
      var c, newElevation, q, queue, s, _i, _j, _len, _len1, _ref, _ref1, _results;
      queue = [];
      _ref = this.corners;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        c = _ref[_i];
        c.water = !inside(c.point);
      }
      _ref1 = this.corners;
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        c = _ref1[_j];
        if (c.border) {
          c.elevation = 0.0;
          queue.push(c);
        } else {
          c.elevation = null;
        }
      }
      _results = [];
      while (queue.length > 0) {
        q = queue.shift();
        _results.push((function() {
          var _k, _len2, _ref2, _results1;
          _ref2 = q.adjacent;
          _results1 = [];
          for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
            s = _ref2[_k];
            newElevation = 0.01 + q.elevation;
            if (!q.water && !s.water) {
              newElevation += 1;
            }
            if (newElevation < s.elevation) {
              s.elevation = newElevation;
              _results1.push(queue.push(s));
            } else {
              _results1.push(void 0);
            }
          }
          return _results1;
        })());
      }
      return _results;
    },
    redistributeElevations: function(locations) {
      var SCALE_FACTOR, i, x, y, _i, _ref, _results;
      SCALE_FACTOR = 1.1;
      locations.sort(function(a, b) {
        if (a.elevation < b.elevation) {
          -1;
        }
        if (a.elevation > b.elevation) {
          1;

        }
        return 0;
      });
      _results = [];
      for (i = _i = 0, _ref = locations.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        y = i / (locations.length - 1);
        x = Math.sqrt(SCALE_FACTOR) - Math.sqrt(SCALE_FACTOR * (1 - y));
        if (x > 1.0) {
          x = 1.0;
        }
        _results.push(locations[i].elevation = x);
      }
      return _results;
    },
    redistributeMoisture: function(locations) {
      var i, _i, _ref, _results;
      locations.sort(function(a, b) {
        if (a.moisture < b.moisture) {
          -1;
        }
        if (a.moisture > b.moisture) {
          1;

        }
        return 0;
      });
      _results = [];
      for (i = _i = 0, _ref = locations.length; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push(locations[i].moisture = i / (locations.length - 1));
      }
      return _results;
    },
    assignOceanCoastAndLand: function() {
      var numLand, numOcean, numWater, p, q, queue, r, _i, _j, _k, _l, _len, _len1, _len2, _len3, _len4, _len5, _len6, _m, _n, _o, _ref, _ref1, _ref10, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8, _ref9, _results;
      queue = [];
      _ref = this.centers;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        numWater = 0;
        _ref1 = this.corners;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          q = _ref1[_j];
          if (q.border) {
            p.border = true;
            p.ocean = true;
            q.water = true;
            queue.push(p);
          }
          if (q.water) {
            numWater += 1;
          }
        }
        p.water = p.ocean || numWater >= p.corners.length * LAKE_THRESHOLD;
      }
      while (queue.length > 0) {
        p = queue.shift();
        _ref2 = p.neighbors;
        for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
          r = _ref2[_k];
          if (r.water && !r.ocean) {
            r.ocean = true;
            queue.push(r);
          }
        }
      }
      _ref3 = this.centers;
      for (_l = 0, _len3 = _ref3.length; _l < _len3; _l++) {
        p = _ref3[_l];
        numOcean = 0;
        numLand = 0;
        _ref4 = p.neighbors;
        for (_m = 0, _len4 = _ref4.length; _m < _len4; _m++) {
          r = _ref4[_m];
          numOcean += (_ref5 = r.ocean) != null ? _ref5 : {
            1: 0
          };
          numLand += (_ref6 = !r.water) != null ? _ref6 : {
            1: 0
          };
        }
        p.coast = (numOcean > 0) && (numLand > 0);
      }
      _ref7 = this.corners;
      _results = [];
      for (_n = 0, _len5 = _ref7.length; _n < _len5; _n++) {
        q = _ref7[_n];
        numOcean = 0;
        numLand = 0;
        _ref8 = q.touches;
        for (_o = 0, _len6 = _ref8.length; _o < _len6; _o++) {
          p = _ref8[_o];
          numOcean += (_ref9 = p.ocean) != null ? _ref9 : {
            1: 0
          };
          numLand += (_ref10 = !p.water) != null ? _ref10 : {
            1: 0
          };
        }
        q.ocean = numOcean === q.touches.length;
        q.coast = (numOcean > 0) && (numLand > 0);
        _results.push(q.water = q.border || ((numLane !== q.touches.length) && !q.coast));
      }
      return _results;
    },
    assignPolygonElevation: function() {
      var p, q, sumElevation, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = this.centers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        sumElevation = 0.0;
        _ref1 = p.corners;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          q = _ref1[_j];
          sumElevation += q.elevation;
        }
        _results.push(p.elevation = sumElevation / p.corners.length);
      }
      return _results;
    },
    calculateDownslopes: function() {
      var q, r, s, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = this.corners;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        r = q;
        _ref1 = q.adjacent;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          s = _ref1[_j];
          if (s.elevation <= r.elevation) {
            r = s;
          }
        }
        _results.push(q.downslope = r);
      }
      return _results;
    },
    calculateWatersheds: function() {
      var changed, i, q, r, _i, _j, _len, _ref, _results;
      _ref = this.corners;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        q.watershed = q;
        if (!q.ocean && !q.coast) {
          q.watershed = q.downslope;
        }
      }
      _results = [];
      for (i = _j = 0; _j <= 100; i = ++_j) {
        changed = false;
        _results.push((function() {
          var _k, _len1, _ref1, _results1;
          _ref1 = this.corners;
          _results1 = [];
          for (_k = 0, _len1 = _ref1.length; _k < _len1; _k++) {
            q = _ref1[_k];
            if (!q.ocean && !q.coast && !q.watershed.coast) {
              r = q.downslope.watershed;
              _results1.push(r.watershed_size = 1 + (r.watershed_size || 0));
            } else {
              _results1.push(void 0);
            }
          }
          return _results1;
        }).call(this));
      }
      return _results;
    },
    createRivers: function() {
      var edge, i, q, _i, _ref, _results;
      _results = [];
      for (i = _i = 0, _ref = SIZE / 2; 0 <= _ref ? _i <= _ref : _i >= _ref; i = 0 <= _ref ? ++_i : --_i) {
        q = this.corners[mapRandom.nextInRange(0, !corners.length - 1)];
        if (q.ocean || q.elevation < 0.3 || q.elevation > 0.9) {
          continue;
        }
        _results.push((function() {
          var _results1;
          _results1 = [];
          while (!q.coast) {
            if (q === q.downslope) {
              break;
            }
            edge = lookupEdgeFromCorner(q, q.downslope);
            edge.river += 1;
            q.river = (q.river || 0) + 1;
            q.downslope.river = (q.downslope.river || 0) + 1;
            _results1.push(q.downslope);
          }
          return _results1;
        })());
      }
      return _results;
    },
    assignCornerMoisture: function() {
      var newMoisture, q, queue, r, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _ref3, _results;
      queue = [];
      _ref = this.corners;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        q = _ref[_i];
        if ((q.water || q.river > 0) && !q.ocean) {
          q.moisture = (_ref1 = q.river > 0) != null ? _ref1 : Math.min(3.0, 0.2 * q.river);
          queue.push(q);
        } else {
          q.moisture = 0.0;
        }
      }
      while (queue.length > 0) {
        q = queue.shift();
        _ref2 = q.adjacent;
        for (_j = 0, _len1 = _ref2.length; _j < _len1; _j++) {
          r = _ref2[_j];
          newMoisture = q.moisture * 0.9;
          if (newMoisture > r.moisture) {
            r.moisture = newMoisture;
            queue.push(r);
          }
        }
      }
      _ref3 = this.corners;
      _results = [];
      for (_k = 0, _len2 = _ref3.length; _k < _len2; _k++) {
        q = _ref3[_k];
        if (q.ocean || q.coast) {
          _results.push(q.moisture = 1.0);
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    },
    assignPolygonMoisture: function() {
      var p, q, sumMoisture, _i, _j, _len, _len1, _ref, _ref1, _results;
      _ref = this.centers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        sumMoisture = 0.0;
        _ref1 = p.corners;
        for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
          q = _ref1[_j];
          if (q.moisture > 1.0) {
            q.moisture = 1.0;
          }
          sumMoisture += q.moisture;
        }
        _results.push(p.moisture = sumMoisture / p.corners.length);
      }
      return _results;
    },
    getBiome: function(p) {
      if (p.ocean) {
        return 'OCEAN';
      } else if (p.water) {
        if (p.elevation < 0.1) {
          'MARSH';

        }
        if (p.elevation > 0.8) {
          'ICE';

        }
        return 'LAKE';
      } else if (p.coast) {
        return 'BEACH';
      } else if (p.elevation > 0.8) {
        if (p.moisture > 0.5) {
          return 'SNOW';
        } else if (p.moisture > 0.33) {
          return 'TUNDRA';
        } else if (p.moisture > 0.16) {
          return 'BARE';
        } else {
          return 'SCORCHED';
        }
      } else if (p.elevation > 0.6) {
        if (p.moisture > 0.83) {
          return 'TEMPERATE_RAUN_FOREST';
        } else if (p.moisture > 0.5) {
          return 'TEMPERATE_DECIDUOUS_FOREST';
        } else if (p.moisture > 0.16) {
          return 'GRASSLAND';
        } else {
          return 'SUBTROPICAL_DESERT';
        }
      }
    },
    assignBiomes: function() {
      var p, _i, _len, _ref, _results;
      _ref = this.centers;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(p.biome = getBiome(p));
      }
      return _results;
    },
    lookupEdgeFromCenter: function(p, r) {
      var edge, _i, _len, _ref;
      _ref = p.borders;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        if (edge.d0 === r || edge.d1 === r) {
          edge;

        }
      }
      return null;
    },
    lookupEdgeFromCorner: function(q, s) {
      var edge, _i, _len, _ref, _ref1;
      _ref = q.protrudes;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        edge = _ref[_i];
        if ((edge.v0 === (_ref1 = s in wdge.v1) && _ref1 === s)) {
          edge;

        }
      }
      return null;
    },
    inside: function(p) {
      return this.islandShape(new Point(2 * (p.x / SIZE - 0.5), 2 * (p.y / SIZE(-0.5))));
    }
  });

  backBuffer = document.createDocumentFragment();

  frontBuffer = document.getElementById('drawingZone');

  canvas = document.createElement('canvas');

  canvas.width = 800;

  canvas.height = 600;

  ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000000";

  ctx.fillRect(0, 0, 800, 600);

  backBuffer.appendChild(canvas);

  frontBuffer.appendChild(backBuffer);

}).call(this);
