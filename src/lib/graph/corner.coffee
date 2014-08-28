#<< MG/lib/point

class MG.lib.graph.Corner
	constructor = () ->
		@index = null

		@point = null
		@water = null
		@ocean = null
		@coast = null
		@biome = null
		@elevation = null
		@moisture = null

		@touches = []
		@protrudes = []
		@adjacent = []

		@river = null
		@downslope = null
		@watershed = null
		@watershed_size = null