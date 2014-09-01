#<< MG/lib/math/PM_PNRG

class PointSelector
  NUM_LLOYD_RELAXATIONS = 2

  @needsMoreRandomness = (type) ->
    type == 'Square' or type = 'Hexagon'

  @generateRandom: (size, seed) ->
    (numPoints) ->
      mapRandom = new PMPNRG()
      mapRandom.seed = seed
      points = []

      for i in [0..numPoints]
        p = new Point(mapRandom.nextDoubleRange(10, size-10), mapRandom.nextDoubleRange(10, size-10))
        points.push p

      points
  
#   // Generate points at random locations
#   static public function generateRandom(size:int, seed:int):Function {
#     return function(numPoints:int):Vector.<Point> {
#       var mapRandom:PM_PRNG = new PM_PRNG();
#       mapRandom.seed = seed;
#       var p:Point, i:int, points:Vector.<Point> = new Vector.<Point>();
#       for (i = 0; i < numPoints; i++) {
#         p = new Point(mapRandom.nextDoubleRange(10, size-10),
#                       mapRandom.nextDoubleRange(10, size-10));
#         points.push(p);
#       }
#       return points;
#     }
#   }


#   // Improve the random set of points with Lloyd Relaxation
#   static public function generateRelaxed(size:int, seed:int):Function {
#     return function(numPoints:int):Vector.<Point> {
#       // We'd really like to generate "blue noise". Algorithms:
#       // 1. Poisson dart throwing: check each new point against all
#       //     existing points, and reject it if it's too close.
#       // 2. Start with a hexagonal grid and randomly perturb points.
#       // 3. Lloyd Relaxation: move each point to the centroid of the
#       //     generated Voronoi polygon, then generate Voronoi again.
#       // 4. Use force-based layout algorithms to push points away.
#       // 5. More at http://www.cs.virginia.edu/~gfx/pubs/antimony/
#       // Option 3 is implemented here. If it's run for too many iterations,
#       // it will turn into a grid, but convergence is very slow, and we only
#       // run it a few times.
#       var i:int, p:Point, q:Point, voronoi:Voronoi, region:Vector.<Point>;
#       var points:Vector.<Point> = generateRandom(size, seed)(numPoints);
#       for (i = 0; i < NUM_LLOYD_RELAXATIONS; i++) {
#         voronoi = new Voronoi(points, null, new Rectangle(0, 0, size, size));
#         for each (p in points) {
#             region = voronoi.region(p);
#             p.x = 0.0;
#             p.y = 0.0;
#             for each (q in region) {
#                 p.x += q.x;
#                 p.y += q.y;
#               }
#             p.x /= region.length;
#             p.y /= region.length;
#             region.splice(0, region.length);
#           }
#         voronoi.dispose();
#       }
#       return points;
#     }
#   }
    
  
#   // Generate points on a square grid
#   static public function generateSquare(size:int, seed:int):Function {
#     return function(numPoints:int):Vector.<Point> {
#       var points:Vector.<Point> = new Vector.<Point>();
#       var N:int = Math.sqrt(numPoints);
#       for (var x:int = 0; x < N; x++) {
#         for (var y:int = 0; y < N; y++) {
#           points.push(new Point((0.5 + x)/N * size, (0.5 + y)/N * size));
#         }
#       }
#       return points;
#     }
#   }

  
#   // Generate points on a square grid
#   static public function generateHexagon(size:int, seed:int):Function {
#     return function(numPoints:int):Vector.<Point> {
#       var points:Vector.<Point> = new Vector.<Point>();
#       var N:int = Math.sqrt(numPoints);
#       for (var x:int = 0; x < N; x++) {
#         for (var y:int = 0; y < N; y++) {
#           points.push(new Point((0.5 + x)/N * size, (0.25 + 0.5*x%2 + y)/N * size));
#         }
#       }
#       return points;
#     }
#   }