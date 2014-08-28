#<< MG/lib/point

class MG.lib.graph.Center

    constructor = () ->
        @index = null

        @point = null
        @water = null
        @ocean = null
        @coast = null
        @biome = null
        @elevation = null
        @moisture = null

        @neighbours = []
        @borders = []
        @corners = []
