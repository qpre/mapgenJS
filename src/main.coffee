window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || swindow.webkitRequestAnimationFrame || window.msRequestAnimationFrame


###
	Set up env
###
backBuffer = document.createDocumentFragment()
frontBuffer = document.getElementById 'drawingZone'

canvas = document.createElement 'canvas'
canvas.width  = 800
canvas.height = 600

ctx = canvas.getContext "2d"
ctx.fillStyle = "#000000"
ctx.fillRect 0, 0, 800, 600

backBuffer.appendChild canvas
frontBuffer.appendChild backBuffer

SIZE = 600
###
	Display Colors
###

displayColors = {
	OCEAN: "#44447a",
	COAST: "#33335a",
	LAKESHORE: "#225588",
	LAKE: "#336699",
	RIVER: "#225588",
	MARSH: "#2f6666",
	ICE: "#99ffff",
	BEACH: "#a09077",
	ROAD1: "#442211",
	ROAD2: "#553322",
	ROAD3: "#664433",
	BRIDGE: "#686860",
	LAVA: "#cc3333",
	SNOW: "#ffffff",
	TUNDRA: "#bbbbaa",
	BARE: "#888888",
	SCORCHED: "#555555",
	TAIGA: "#99aa77",
	SHRUBLAND: "#889977",
	TEMPERATE_DESERT: "#c9d29b",
	TEMPERATE_RAIN_FOREST: "#448855",
	TEMPERATE_DECIDUOUS_FOREST: "#679459",
	GRASSLAND: "#88aa55",
	SUBTROPICAL_DESERT: "#d2b98b",
	TROPICAL_RAIN_FOREST: "#337755",
	TROPICAL_SEASONAL_FOREST: "#559944"
}

elevationGradientColors = {
	OCEAN: "#008800",
	GRADIENT_LOW: "#008800",
	GRADIENT_HIGH: "#ffff00"
}

moistureGradientColors = {
	OCEAN: "#4466ff",
	GRADIENT_LOW: "#bbaa33",
	GRADIENT_HIGH: "#4466ff"
}

# Island shape is controlled by the islandRandom seed and the
# type of island. The islandShape function uses both of them to
# determine whether any point should be water or land.
islandType = 'Perlin'
islandSeedInitial = "85882-8"

# Point distribution
pointType = 'Relaxed'
numPoints = 2000

# This is the current map style. UI buttons change this, and it
# persists when you make a new map. The timer is used only when
# the map mode is '3d'.
mapMode = 'smooth'

# These store 3d rendering data
rotationAnimation = 0.0
triangles3d = []

map = null

mapgen2 = () ->
	map = new Map(SIZE)
	go islandType, pointType, numPoints
	requestAnimationFrame drawMap(mapMode)

newIsland = (newIslandType, newPointType, newNumPoints) ->
	seed = 0
	variant = 0
	map.newIsland newIslandType, newPointType, newNumPoints, seed, variant

graphicsReset = () ->
	ctx.clearRect 0, 0, 800, 600
	ctx.fillStyle = "#bbbbaa"
	ctx.fillRect 0, 0, 2000, 2000
	ctx.fillStyle = displayColors.OCEAN
	ctx.fillRect 0, 0, SIZE, SIZE

go = (newIslandType, newPointType, newNumPoints) ->
	#cancelCommands()
	roads = new Roads()
	lava = new Lava()
	watersheds = new Watersheds()
	noisyEdges = new NoisyEdges()

	console.log "Shaping map..."
	newIsland newIslandType, newPointType, newNumPoints
      
    console.log "Placing points..."
    map.go 0, 1
    drawMap 'polygons'

    console.log "Building graph..."
    map.go 1, 2
    map.assignBiomes()
    drawMap 'polygons'
      
    console.log "Features..."
    map.go 2, 5
    map.assignBiomes()
    drawMap 'polygons'

    console.log "Edges..."
    roads.createRoads map
    lava.createLava map, map.mapRandom.nextDouble
    watersheds.createWatersheds map
    noisyEdges.buildNoisyEdges map, lava, map.mapRandom
    drawMap mapMode


