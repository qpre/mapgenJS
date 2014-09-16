###
	Set up env
###
backBuffer = document.createDocumentFragment()
frontBuffer = document.getElementById 'drawingZone'

canvas = document.createElement 'canvas'
canvas.width  = 800
canvas.height = 600

ctx = canvas.getContext("2d");
ctx.fillStyle = "#000000";
ctx.fillRect(0,0,800,600);

backBuffer.appendChild canvas
frontBuffer.appendChild backBuffer

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