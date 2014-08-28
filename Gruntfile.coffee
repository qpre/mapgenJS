module.exports = (grunt) ->
  
  # Project configuration.
  BANNER =  "/* MapGenJS : " + (Date.now()).toString() + " */"
  GROUPS = {
    "src":"MG"
  }
  BIN='mapgen'
  PROJECT_NAME='MapGen'
  BUILDPATH='build/'
  DISTPATH='dist/'
  grunt.initConfig
    pkg: grunt.file.readJSON("package.json")
    
    toaster:
      debug:
        minify: false
        packaging: true
        # bare: true
        folders: GROUPS
        release: "#{DISTPATH}/#{BIN}.js"
      minified:
        minify: true
        packaging: true
        # bare: true
        folders: GROUPS
        release: "#{DISTPATH}/#{BIN}.min.js"

    shell:  
      createDist:
        command: "mkdir dist"
        options:
          stdout: true,
          failOnError: true
       
      createBuild:
        command: "mkdir build"
        options:
          stdout: true,
          failOnError: true
    clean:
        app:
          src: ["build", "dist"]

  # Load plugins
  grunt.loadNpmTasks "grunt-contrib-clean"
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks "grunt-coffee-toaster"

  # Tasks
  grunt.registerTask "build", [
    "clean"
    "shell:createBuild"
    "shell:createDist"
    "toaster"
  ]

  grunt.registerTask "default", ["build"]
  return