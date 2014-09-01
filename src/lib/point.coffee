class MG.lib.Point
	constructor: (@x, @y) ->

	# based on Flash's flash.geom.Point implementation
	@interpolate: (p1, p2, f) ->
		d = pt1.x - pt2.x
		x = pt2.x + f * d

		y = pt2.y + (x - pt2.x) * ((pt1.y - pt2.y) / d)

		new Point(x, y)

	length: () ->
		Math.sqrt((0 - @x) * (0 - @x) + (0 - @y) * (0 - @y))