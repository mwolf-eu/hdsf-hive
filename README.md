# hdsf-hive
Harvest Interactive Visualization Engine (Hive) is a thin visualization layer sitting on top of D3 which can optionally render to SVG, canvas, or WebGL.  Like d3, its focus is to provide a grammar of graphics by (mostly) drawing shapes rather than specific chart/graph types.  This is currently a frontend (browserified) only tool due to node ES6 dynamic module importing / building inconsistencies.

[API Reference](https://mwolf-eu.github.io/hdsf-hive/Hivev0.0.xAPIReference.html)

[Examples](https://github.com/mwolf-eu/hdsf-hive-examples)

# Features
- Supports a wide variety of chart / graph types
- HTML flex-like templating worker for unlimited layout options
- Full text handling
- Responsive
- Color schemes
- SVG exporting
- Mixed chart types
- GGPlot2 style facets
- Hybrid svg / canvas charts
- Several graph force algorithms
- Data loading, wrangling, naming
- Extensible draw object plugin system 
- Rendering using svg, paperjs, threejs
- Popups (Including cross graph popups)
- Mouseover change: color, opacity, scale 
- Includes: basic templates, basic wranglers
- Supports: scales-accessors, gradients, rotation, all d3 axes, guides/legends

# Build Requirements
- Browserify (npm install browserify -g)
- Terser (npm install terser -g)
- Esmify (npm install esmify)

# Commands (MacOS/Linux)
- `npm start` - Populates dist

# Libraries
- D3
- D3-sankey (optional)
- D3-hexbin (optional)
- Tippy (optional for popups)
- Popper (optional for popups)
- svg-text (optional for guides)
- Paperjs (optional for canvas rendering)
- Threejs (optional for webgl rendering)
- Opentype (optional for webgl rendering)
