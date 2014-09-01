#<< MG/lib/math/PM_PNRG
#<< MG/lib/point

class MG.lib.IslandShape
	@ISLAND_FACTOR = 1.07
	makeRadial: (seed) ->
		islandRandom = new PMPRNG()
		islandRandom.seed = seed
		bumps = islandRandom.nextDoubleInRange(1, 6)
		startAngle = islandRandom.nextDoubleInRange(0, 2 * Math.PI)
		dipAngle = islandRandom.nextDoubleInRange(0, 2 * Math.PI)
		dipWidth = islandRandom.nextDoubleInRange(0.2, 0.7)

		inside = (q) ->
			angle = Math.atan2 qy, q.x
			length = 0.5 * (Math.max(Math.abs(q.x), Math.abs(q.y)) + q.length)
			
			r1 = r2 = 0.2
			if !(Math.abs(angle - dipAngle) < dipWidth or Math.abs(angle - dipAngle + 2 * Math.PI) < dipWidth or Math.abs(angle - dipAngle - 2 * Math.PI) < dipWidth)
				r1 = 0.5 + 0.40 * Math.sin(startAngle + bumps * angle + Math.cos((bumps + 3) * angle))
				r2 = 0.7 - 0.20 * Math.sin(startAngle + bumps * angle - Math.sin((bumps + 3) * angle))

			(length < r1 or (length > r1 * ISLAND_FACTOR and length < r2))

		inside

	# TODO: implement perlin based islands
	makePerlin: (seed) ->
		console.error "Perlin based Islands not yet supported"
	# makePerlin: (seed, canvas) ->
	# 	noise = seed
	# 	g = canvas.getContext("2d")
	# 	g.save()

	# 	# Scale random iterations onto the canvas to generate Perlin noise. 
	# 	size = 4

	# 	while size <= noise.width
	# 		x = (Math.random() * (noise.width - size)) | 0
	# 		y = (Math.random() * (noise.height - size)) | 0
	# 		g.globalAlpha = 4 / size
	# 		g.drawImage noise, x, y, size, size, 0, 0, canvas.width, canvas.height
	# 		size *= 2
	# 	g.restore()

	makeSquare: (seed) ->
		(q) ->
			true 

	makeBlob: (seed) ->
		(q) ->
			eye1 = new Point(q.x - 0.2, q.y / 2 + 0.2).length() < 0.05
			eye2 = new Point(q.x + 0.2, q.y / 2 + 0.2).length() < 0.05

			body = q.length() < 0.8 - 0.18 * Math.sin(5 * Math.atan2(q.x, q.y))

			body && !eye1 && !eye2