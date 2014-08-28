#<< MG/lib/math/PM_PNRG
class MG.lib.Map
	@LAKE_THRESHOLD		= 0.3

	islandShape 		= null
	mapRandom 			= new PMPRNG()
	needsMoreRandomness = null
	pointSelector 		= null
	numPoints			= null

	points 				= []
	centers 			= []
	corners 			= []
	edges 				= []

	constructor: (@_size) ->
		@numPoints = 1
		@reset()

	newIsland: (islandType, numPoints, seed, variant) ->
		@islandShape 			= IslandShape['make'+islandType] seed
		@pointSelector 			= PointSelector['generate'+pointType] SIZE, seed
		@needsMoreRandomness 	= PointSelector.needsMoreRandomness pointType
		@numPoints 				= numPoints
		@mapRandom.seed			= variant

	reset: () ->
		if @points
			@points.splice 0, @points.length

		if @edges
			for edge in edges
				edge.d0 = edge.d1 = null
				edge.v0 = edge.v1 = null
			@edges.splice 0, @edges.length

		if @centers
			for center in @centers
				center.neighbors.splice 0, center.neighbors.length
				center.corners.splice 0, center.corners.length
				center.borders.splice 0, center.borders.length
			@centers.splice 0, @centers.length

		if @corners
			for corner in @corners
				corner.adjacent.splice 0, q.adjacent.length
				corner.touches.splice 0, q.touches.length
				corner.protrudes.splice 0, q.protrudes.length
				corner.downslope = null
				corner.watershed = null
			@corners.splice 0, corners.length

	    # Clear the previous graph data.
		if !@points then @points = []
		if !@edges then @edges = []
		if !@centers then @centers = []
		if !@corners then @corners = []

	go: (first, last) ->
		stages = []

		timeIt = (name, fn) ->
			t = getTimer()
			fn()

		# Generate the initial random set of points
		stages.push [
			"Placing points..."
			() =>
				@reset()
				@points = @pointSelector @numPoints
		]

		###
		Create a graph structure from the Voronoi edge list. The
		methods in the Voronoi object are somewhat inconvenient for
		my needs, so I transform that data into the data I actually
		need: edges connected to the Delaunay triangles and the
		Voronoi polygons, a reverse map from those four points back
		to the edge, a map from these four points to the points
		they connect to (both along the edge and crosswise).
		###
		stages.push [
	    	"Build graph..."
	    	() =>
	    		voronoi = new Voronoi @points, null, new Rectangle(0, 0, @_size, @_size)
	    		@buildGraph @points, voronoi
	    		@improveCorners()
	    		@voronoi.dispose()
	    		@voronoi = null
	    		@points = null
	    ]
