#<< MG/lib/math/PM_PNRG
#<< MG/lib/IslandShape

class MG.lib.Map
    @LAKE_THRESHOLD			= 0.3
            
    islandShape             = null
    mapRandom             	= new MG.lib.math.PMPRNG()
	needsMoreRandomness     = null
	pointSelector 			= null
	numPoints				= null

	points 					= []
	centers 				= []
	corners          		= []
	edges 	       			= []

	constructor: (@_size) ->
		@numPoints = 1
		@reset()

	newIsland: (islandType, numPoints, seed, variant) ->
		@islandShape 			= IslandShape['make'+islandType] seed
		@pointSelector 			= PointSelector['generate'+pointType] SIZE, seed
		@needsMoreRandomness 	= PointSelector.needsMoreRandomness pointType
		@numPoints 	       		= numPoints
		@mapRandom.seed	      	= variant

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
	    	"Building graph..."
	    	() =>
	    		voronoi = new Voronoi()
	    		result = voronoi.compute @points, {xl:0, xr:@_size, yt:0, yb:@_size} # todo: get rid of this loosy way of describing a rectangle
	    		@buildGraph @points, result
	    		@improveCorners()
	    		@points = null
	    ]

	    stages.push [
	    	"Assigning elevations..."
	    	() =>
	    		@assignCornerElevations()
	    		@assignOceanCoastAndLand()

	    		redistributeElevations(@corners)

	    		for corner in corners
	    			if corner.ocean or corner.coast
	    				corner.elevation = 0.0

	    		assignPolygonElevation()
	    ]

	    stages.push [
	    	"Assigning moisture..."
	    	() =>
	    		@calculateDownslopes()
	    		@calculateWatersheds()
	    		@createRivers()

	    		@assignCornerMoisture()
	    		@redistributeMoisture(@landCorners(@corners))
	    		@assignPolygonMoisture()
	    ]

	    stages.push [
	    	"Decorating map..."
	    	() =>
	    		@assignBiomes()
	    ]

	    for stage in stages
	    	@timeIt stage[0], stage[1]

	improveCorners: () ->
		newCorners = []
		for corner in @corners
			if corner.border
				newCorners[corner.index] = corner.point
			else
				point = new Point(0.0, 0.0)
				for touch in corner.touches
					point.x += touch.point.x
					point.y += touch.point.y
				point.x /= corner.touches.length
				point.y /= corner.touches.length
				newCorners[corner.index] = point

		for i in [0..@corners.length]
			@corners[i].point = newCorners[i]

		for edge in edges
			if edge.v0 and edge.v1
				edge.midpoint = Point.interpolate edge.v0.point, edge.v1.point, 0.5

	landCorners: (corners) ->
		locations = []
		for corner in corners
			if !corner.ocean and !corner.coast
				locations.push corner
		locations

	buildGraph: (points, voronoi) ->
		libedges = voronoi.edges
		centerLookup = {}

		for point in points
			p = new Center()
			p.index = @centers.length
			p.point = point
			p.neighbors = []
			p.borders = []
			p.corners = []
			@centers.push p
			centerLookup[point] = p

		@_cornerMap = []
		makeCorner = (point) ->
			if point == null then null
			for bucket in [point.x-1..point.x+1]
				for corner in @_cornerMap[bucket]
					dx = point.x - corner.point.x
					dy = point.y - corner.point.y
					if dx*dx + dy*dy < Math.exp(6)
						return corner

			bucket = point.x
			if (!@_cornerMap[bucket]) then @_cornerMap[bucket] = []
			q = new Corner()
			q.index = @corners.length
			q.point = point
			q.border = (point.x == 0 or point.x == SIZE or point.y == 0 or point.y == SIZE)
			q.touches = []
			q.protrudes = []
			q.adjacent = []
			@_cornerMap[bucket].push q
			@corners.push q
			q

		addToCornerList = (v, x) ->
			if x != null and v.indexOf(x) < 0 then v.push x

		addToCenterList = addToCornerList

		for ledge in libedges
			dedge = new LineSegment ledge.lSite, ledge.rSite
			vedge = new LineSegment ledge.va, ledge.vb

			edge = new Edge()
			edge.index = @edges.length
			edge.river = 0
			edge.midpoint = vedge.p0 and vedge.p1 and Point.interpolate vedge.p0, vedge.p1, 0.5
			@edges.push edge

			edge.v0 = makeCorner(vedge.p0)
			edge.v1 = makeCorner(vedge.p1)
			edge.d0 = centerLookup[dedge.p0]
			edge.d1 = centerLookup[dedge.p1]

			if (edge.d0 != null) then edge.d0.borders.push(edge)
			if (edge.d1 != null) then edge.d1.borders.push(edge)
			if (edge.v0 != null) then edge.v0.protrudes.push(edge)
			if (edge.v1 != null) then edge.v1.protrudes.push(edge)

			if edge.d0 != null and edge.d1 != null
				addToCenterList edge.d0.neighbors, edge.d1
				addToCenterList edge.d1.neighbors, edge.d0
			if edge.v0 != null and edge.v1 != null
				addToCornerList edge.v0.adjacent, edge.v1
				addToCornerList edge.v1.adjacent, edge.v0

			if edge.d0 != null
            	addToCornerList edge.d0.corners, edge.v0
            	addToCornerList edge.d0.corners, edge.v1
            if edge.d1 != null
            	addToCornerList edge.d1.corners, edge.v0
            	addToCornerList edge.d1.corners, edge.v1

			if edge.v0 != null
				addToCenterList edge.v0.touches, edge.d0
				addToCenterList edge.v0.touches, edge.d1
			if edge.v1 != null
				addToCenterList edge.v1.touches, edge.d0
				addToCenterList edge.v1.touches, edge.d1

	assignCornerElevations: () ->
		queue = []

		for c in @corners
			c.water = !inside(c.point)

		for c in @corners
			if c.border 
				c.elevation = 0.0
				queue.push c
			else
				c.elevation = null # lets use null as a replacement for Infinity

		while queue.length > 0
			q = queue.shift()
			for s in q.adjacent
				newElevation = 0.01 + q.elevation
				if !q.water and !s.water
					newElevation += 1
					#TODO: add more randomness

				if newElevation < s.elevation
					s.elevation = newElevation
					queue.push s

	redistributeElevations: (locations) ->
		SCALE_FACTOR = 1.1
		locations.sort (a, b) ->
			if a.elevation < b.elevation then -1
			if a.elevation > b.elevation then 1
			0

		for i in [0..locations.length]
			y = i / (locations.length - 1)
			x = Math.sqrt(SCALE_FACTOR) - Math.sqrt(SCALE_FACTOR * (1 - y))
			if x > 1.0 then x = 1.0
			locations[i].elevation = x

	redistributeMoisture: (locations) ->
		locations.sort (a, b) ->
			if a.moisture < b.moisture then -1
			if a.moisture > b.moisture then 1
			0

		for i in [0..locations.length]
			locations[i].moisture = i / (locations.length-1) 

	assignOceanCoastAndLand: () ->
		queue = []
		for p in @centers
			numWater = 0
			for q in @corners
				if q.border
					p.border = true
					p.ocean = true
					q.water = true
					queue.push p
				if q.water
					numWater += 1
			p.water = p.ocean or numWater >= p.corners.length * LAKE_THRESHOLD

		while queue.length > 0
			p = queue.shift()
			for r in p.neighbors
				if r.water and !r.ocean
					r.ocean = true
					queue.push r


		for p in @centers
			numOcean = 0
			numLand = 0

			for r in p.neighbors
				numOcean += r.ocean ? 1 : 0
				numLand += !r.water ? 1 : 0

			p.coast = (numOcean > 0) and (numLand > 0)

		for q in @corners
			numOcean = 0
			numLand = 0

			for p in q.touches
				numOcean += p.ocean ? 1 : 0
				numLand += !p.water ? 1 : 0
			q.ocean = numOcean == q.touches.length
			q.coast = (numOcean > 0) and (numLand > 0)
			q.water = q.border or ((numLane != q.touches.length) and !q.coast)

	assignPolygonElevation: () ->
		for p in @centers
			sumElevation = 0.0
			for q in p.corners
				sumElevation += q.elevation
			p.elevation = sumElevation / p.corners.length

	calculateDownslopes: () ->
		for q in @corners
			r = q
			for s in q.adjacent
				if s.elevation <= r.elevation
					r = s
			q.downslope = r


	calculateWatersheds: ()->
		for q in @corners
			q.watershed = q
			if (!q.ocean and !q.coast)
				q.watershed = q.downslope

		for i in [0..100]
			changed = false
			for q in @corners
				if !q.ocean and !q.coast and !q.watershed.coast
					r = q.downslope.watershed
					r.watershed_size = 1 + (r.watershed_size || 0)

	createRivers: () ->
		for i in [0..SIZE/2]
			q = @corners[mapRandom.nextInRange(0, !corners.length-1)]
			if (q.ocean or q.elevation < 0.3 or q.elevation > 0.9) then continue
			while !q.coast
				if q == q.downslope
					break
				edge = lookupEdgeFromCorner(q, q.downslope)
				edge.river += 1
				q.river = (q.river || 0) + 1
				q.downslope.river = (q.downslope.river or 0) + 1
				q.downslope

	assignCornerMoisture: () ->
		queue = []
		for q in @corners
			if ((q.water or q.river > 0) and !q.ocean)
				q.moisture = q.river > 0 ? Math.min 3.0, (0.2 * q.river)
				queue.push q
			else
				q.moisture = 0.0

		while queue.length > 0
			q = queue.shift()

			for r in q.adjacent
				newMoisture = q.moisture * 0.9
				if (newMoisture > r.moisture)
					r.moisture = newMoisture
					queue.push r


		for q in @corners
			if q.ocean or q.coast then q.moisture = 1.0


	assignPolygonMoisture: () ->
		for p in @centers
			sumMoisture = 0.0
			for q in p.corners
				if (q.moisture > 1.0) then q.moisture = 1.0
				sumMoisture += q.moisture

			p.moisture = sumMoisture / p.corners.length

	getBiome: (p) ->
		if p.ocean
			'OCEAN'
		else if p.water
			if p.elevation < 0.1 then 'MARSH'
			if p.elevation > 0.8 then 'ICE'
			'LAKE'
		else if p.coast
			'BEACH'
		else if p.elevation > 0.8
			if p.moisture > 0.5 then 'SNOW'
			else if p.moisture > 0.33 then 'TUNDRA'
			else if p.moisture > 0.16 then 'BARE'
			else 'SCORCHED'
		else if p.elevation > 0.6
			if (p.moisture > 0.83) then 'TEMPERATE_RAUN_FOREST'
			else if (p.moisture > 0.5) then 'TEMPERATE_DECIDUOUS_FOREST'
			else if (p.moisture > 0.16) then 'GRASSLAND'
			else 'SUBTROPICAL_DESERT'


	assignBiomes: () ->
		for p in @centers
			p.biome = getBiome(p)


	lookupEdgeFromCenter: (p, r) ->
		for edge in p.borders
			if edge.d0 == r or edge.d1 == r then edge
		null

	lookupEdgeFromCorner: (q, s) ->
		for edge in q.protrudes
			if edge.v0 == s of wdge.v1 == s then edge
		null

	inside: (p) ->
		@islandShape(new Point(2*(p.x / SIZE - 0.5), 2*(p.y/SIZE -0.5)))


