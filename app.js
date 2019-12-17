Promise.all([

    d3.json("countries.geo.json"),
    d3.csv("births.csv"),
    d3.csv("math_data.csv"),
    d3.json("graph_nodes.json"),
    d3.json("graph_links.json")

]).then(datasets => {


    var geoJSON = datasets[0];
    var countryMap = geoJSON.features.reduce((dic, elem) => { dic[elem.id] = elem.properties.name; return dic; }, {})
    var births = datasets[1];
    var dataComplete = datasets[2];
    var graph_data = {
        nodes: datasets[3],
        links: datasets[4]
    }


    $(document).ready(function () {
        $('.js-example-basic-multiple').select2();
    });
    $(".js-example-theme-multiple").select2({
        theme: "classic"
    });

    $(document).ready(function () {
        listMath(graph_data.nodes)

        $('.js-example-basic-single').select2({ theme: "classic" })
        buildGraph(graph_data);

    });


    var filters = baseFilters(dataComplete)
    listCountries(filters)
    buildMap(filterData(dataComplete, filters), geoJSON);
    updateMap(filterData(dataComplete, filters), geoJSON);
    buildOverTime(filterData(dataComplete, filters), geoJSON);
    buildHeatMap(filterData(dataComplete, filters));
    updateHeatMap(filterData(dataComplete, filters));
    buildBoxplot(filterData(dataComplete, filters));


    function listCountries(filters) {

        var list = [...new Set(filters.countries)].sort()

        options = d3.select("#selectCountries")
            .selectAll("option")
            .data(list)
            .enter()
            .append('option')
            .text(d => countryMap[d])
            .attr('value', d => d)
    }

    $("#selectCountries")
        .select2()
        .on("select2:select", function (e) {

            filters.countries = $("#selectCountries").select2('data').map(d => d.id)
            updateHeatMap(filterData(dataComplete, filters))
            updateBoxplot(filterData(dataComplete, filters))

        })

        .on("select2:unselect", function (e) {

            filters.countries = $("#selectCountries").select2('data').map(d => d.id)
            updateHeatMap(filterData(dataComplete, filters))
            updateBoxplot(filterData(dataComplete, filters))

        })

    $("#selectMath")
        .select2()
        .on("select2:select", function (e) {

            updateGraph(graph_data)

        })

    function listMath(nodes) {


        options = d3.select("#selectMath")
            .selectAll("option")
            .data(nodes)
            .enter()
            .append('option')
            .text(d => d.name)
            .attr('value', d => d.id)
            .property("selected", d => d.name == 'Blaise Pascal')

    }

    function baseFilters(data) {
        var filters = {}
        filters.names = data.map(d => d.name)
        filters.dates = [d3.min(data, d => +d.birth), d3.max(data, d => +d.birth)];
        filters.countries = data.map(d => d.country)
        filters.fields = data.map(d => d.field)
        filters.professions = data.map(d => d.profession)
        filters.wonAward = [0, 1]
        return filters
    }

    function filterData(data, filters) {
        minDecade = filters.dates[0];
        maxDecade = filters.dates[1];
        countries = filters.countries;
        fields = filters.fields;
        professions = filters.professions;
        wonAward = filters.wonAward;

        filtered = data.filter(function (d) {

            res = (countries.includes(d.country) || countries.length == 0) &
                +d.birth <= maxDecade & +d.birth >= minDecade &
                fields.includes(d.field) & professions.includes(d.profession)// &
            wonAward.includes(d.won_award)
            return res
        })
        return filtered
    }

    function buildMap(data, geoJSON) {
        let widthMap = 500;
        let heightMap = 220;

        let container = d3.select("#map")
            .append("svg")
            .attr("id", "mapViz")
            .attr("width", widthMap)
            .attr("height", heightMap)
            .attr("transform", "translate(0,20)")

        // Define the div for the tooltip
        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var projection = d3.geoMercator()
        projection
            .scale(97)
            .translate([widthMap / 2, heightMap / 2 + 20])

        let path = d3.geoPath()
            .projection(projection)

        container
            .selectAll("path")
            .data(geoJSON.features, d => d.id)
            .enter()
            .append("path")
            .attr("d", path)
            .attr("stroke", "#ccc")
            .attr("fill", "#fff")
            .on('click', clickMap)
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(d.properties.name + "<br/>" + d.properties.births)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            })


        function clickMap(d) {
            countryName = d.properties.name;
            number = d.properties.births
            filters.countries = d.id;


            $('#selectCountries').val(d.id); // Select the option with a value of '1'
            $('#selectCountries').trigger('change')
            $('#selectCountries').trigger('select2:select');
        }
    }

    function updateMap(data, geoJSON) {
        var birthsCountry = d3.nest()
            .key(d => d.country)
            .rollup(function (d) {
                return d3.sum(d, function (g) { return 1 })
            }).entries(data)
            .map(function (row) {
                return { country: row.key, n: row.value }
            })

        function getBirths(country_id, data) {

            var filtered = data.filter(
                function (el) {
                    return el.country == country_id
                })
            var res;
            if (filtered.length == 0) { res = 0 } else { res = filtered[0].n }
            return res
        }

        geoJSON.features.map(function (f) {
            f.properties.births = getBirths(f.id, birthsCountry)
        })

        var colorScale = d3.scaleLinear()
            .domain([0, d3.max(birthsCountry, d => +d.n)])
            .range(["white", "red"])

        d3.select("#mapViz")
            .selectAll("path")
            .data(geoJSON.features, d => d.id)
            .attr("fill", function (d) {
                return colorScale(d.properties.births)
            })
    }

    function buildOverTime(data, geoJSON) {


        var birthsTime = d3.nest()
            .key(d => +d.birth)
            .rollup(function (d) {
                return d3.sum(d, function (g) { return 1 })
            }).entries(data)
            .map(function (row) {
                return { decade: row.key, n: row.value }
            })
            .sort((a, b) => d3.ascending(a.decade, b.decade))
        let widthOvertime = 500;
        let heightOvertime = 130;

        var containerOvertime = d3.select('#overtime')
            .append("svg")
            .attr("width", widthOvertime)
            .attr("height", heightOvertime)
            .attr("transform", "translate(0,20)")

        let xTimeScale = d3.scaleLinear()
            .domain(d3.extent(birthsTime, d => +d.decade))
            .range([0, widthOvertime])


        let yTimeScale = d3.scaleLinear()
            .domain([0, d3.max(birthsTime, d => +d.n)])
            .range([heightOvertime, 0])



        var line = d3.line()
            .defined(d => !isNaN(d.n))
            .x(function (d) {
                return xTimeScale(+d.decade)
            })
            .y(function (d) {
                return yTimeScale(+d.n)
            })

        var filterTime = {}
        var brush = d3.brushX()
            .on("brush", function () {

                var coords = d3.event.selection;

                filterTime.min = xTimeScale.invert(coords[0])
                filterTime.max = xTimeScale.invert(coords[1])
                if (-filterTime.min + filterTime.max < 10) {
                    return;
                }

                var filteredData = data.filter(
                    function (d) {
                        return +d.birth > filterTime.min & +d.birth <= filterTime.max
                    }
                )


                updateMap(filteredData, geoJSON)
            })


        containerOvertime
            .append("path")
            .datum(birthsTime)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line)

        containerOvertime
            .append("g")
            .call(d3.axisLeft(yTimeScale))
            .attr("stroke", "black")

        containerOvertime
            .append("g")
            .attr('class', 'brush')
            .call(brush)

        containerOvertime.node()


    }

    function buildHeatMap(data) {

        width = 500;
        height = 300;

        var dic = data.reduce((acc, guy) => {
            let key = guy.field + ':' + guy.profession;
            if (key in acc) { acc[key] = acc[key] + 1 } else {
                acc[key] = 1
            } return acc;
        }, {})

        var dataHeat = Object.keys(dic).map(x => {
            return {
                field: x.split(':')[0],
                prof: x.split(':')[1],
                value: dic[x]
            }
        })


        dataHeat = dataHeat.filter(d => d.value > 20)

        fields = [...new Set(dataHeat.map(item => item.field))]
        profs = [...new Set(dataHeat.map(item => item.prof))]

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#heatmap")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(0,20)")
            .attr("id", "heatMapViz")

        // Build X scales and axis:
        var x = d3.scaleBand()
            .range([20, width - 20])
            .domain(fields)
            .padding(0.01);

        svg.append("g")
            .attr('id', 'xAxisHeat')
            .attr("transform", "translate(0," + (height - 20) + ")")
            .call(d3.axisBottom(x))

        var myColor = d3.scaleLinear()
            .range(["white", "#69b3a2"])
            .domain([0, d3.max(dataHeat, d => +d.value)])
        // Build X scales and axis:
        var y = d3.scaleBand()
            .range([20, height - 20])
            .domain(profs)
            .padding(0.01);

        svg.append("g")
            .attr('id', 'yAxisHeat')
            .attr("transform", "translate(20,0)")
            .call(d3.axisLeft(y));




    }

    function buildBoxplot(data) {

        var width = 500
        var height = 180

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#boxplot")
            .append("svg")
            .attr('id', 'boxplotViz')
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(0,20)")

        var stats = d3.nest()
            .key(function (d) { return d.won_award })
            .rollup(function (d) {
                q1 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .25)
                median = d3.quantile(d.map(g => g.age).sort(d3.ascending), .5)
                q3 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .75)
                interQuantileRange = q3 - q1
                min = q1 - 1.5 * interQuantileRange
                max = q3 + 1.5 * interQuantileRange
                return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
            })
            .entries(data)


        // Show the X scale
        var x = d3.scaleLinear()
            .range([0, width - 20])
            .domain([30, 120])


        svg.append("g")
            .attr("id", "xAxisBox")
            .attr("transform", "translate(10,160)")
            .call(d3.axisBottom(x))

        var y = d3.scaleBand()
            .domain([0, 1])
            .range([height, 0])
        //.paddingInner(0.6)
        //.paddingOuter(.6)

        svg
            .append("g")
            .attr("id", "yAxisBox")
            .call(d3.axisLeft(y))
            .attr("transform", "translate(15,-20)")


        svg
            .selectAll("vertLines")
            .data(stats)
            .enter()
            .append("line")
            .attr('id', 'lineBox')
            .attr("x1", function (d) { return (x(d.value.min)) })
            .attr("x2", function (d) { return (x(d.value.max)) })
            .attr("y1", function (d) { return (y(d.key) + 0.125 * height) })
            .attr("y2", function (d) { return (y(d.key) + 0.125 * height) })
            .attr("stroke", "black")
            .style("width", 40)

        var boxWidth = 50
        svg
            .selectAll("boxes")
            .data(stats)
            .enter()
            .append("rect")
            .attr('id', 'boxBox')
            .attr("x", function (d) { return (x(d.value.q1)) })
            .attr("y", function (d) { return (y(d.key) - boxWidth / 2) })
            .attr("width", function (d) { return (x(d.value.q3) - x(d.value.q1)) })
            .attr("height", boxWidth)
            .attr("stroke", "black")
            .style("fill", "#69b3a2")
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html('<b>Min: </b>' + d.value.min + '<br>' +
                    '<b>Q1: </b>' + d.value.q1 + '<br>' +
                    '<b>Median: </b>' + d.value.median + "<br/>" +
                    '<b>Q3: </b>' + d.value.q3 + '<br>' +
                    '<b>Max: </b>' + d.value.max
                )
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        svg
            .selectAll("medianLines")
            .data(stats)
            .enter()
            .append("line")
            .attr('id', 'medianBox')
            .attr("x1", function (d) { return (x(d.value.median)) })
            .attr("x2", function (d) { return (x(d.value.median)) })
            .attr("y1", function (d) { return (y(d.key) - boxWidth / 2) })
            .attr("y2", function (d) { return (y(d.key) + boxWidth / 2) })
            .attr("stroke", "black")
            .style("width", 80)

    }

    function buildGraph(graph_data) {
        var width = 500;
        var height = 130;

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#graph")
            .append("svg")
            .attr('id', 'graphViz')
            .attr("width", width)
            .attr("height", height)
            .attr("transform",
                "translate(0,20)")
            .append("g")
            .attr("transform",
                "translate(100,100)");

        updateGraph(graph_data)
    }


    function updateGraph(graph_data) {
        var guy = parseInt($("#selectMath").select2('data')[0].id);
        var links = graph_data.links.filter(d => d.source == guy | d.target == guy)
        var linked_nodes = links.reduce((acc, elem) => { acc.add(elem.source); acc.add(elem.target); return acc }, new Set())
        var nodes = graph_data.nodes.filter(d => linked_nodes.has(d.id))

        links = links.map((d, i) => { obj = Object.create(d); obj.id = i; return obj; });
        nodes = nodes.map(d => Object.create(d));

        var simulation = d3.forceSimulation(nodes)
            .force("link", d3.forceLink(links).id(d => d.id))
            .force("charge", d3.forceManyBody().strength(-300))
            .force("center", d3.forceCenter(500 / 2, 130 / 2));

        var svg = d3.select("#graphViz")
        var div = d3.select("div.tooltip")

        svg
            .selectAll("circle")
            .data(nodes, d => d.id)
            .exit()
            .remove()

        svg
            .selectAll("line")
            .data(links, d => d.id)
            .exit()
            .remove()

        var link = svg
            .selectAll("line")
            .data(links)
            .enter()
            .append("line")
            .style("stroke", "#aaa")

        var node = svg
            .selectAll("circle")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("r", 20)
            .style("fill", "#69b3a2")
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html(d.name)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0);
            });

        simulation.on("tick", () => {
            link
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            node
                .attr("cx", function (d) { return d.x; })
                .attr("cy", function (d) { return d.y; });
        })
    }


    function updateHeatMap(data) {
        width = 500;
        height = 300;



        var dic = data.reduce((acc, guy) => {
            let key = guy.field + ':' + guy.profession;
            if (key in acc) { acc[key] = acc[key] + 1 } else {
                acc[key] = 1
            } return acc;
        }, {})

        var dataHeat = Object.keys(dic).map(x => {
            return {
                field: x.split(':')[0],
                prof: x.split(':')[1],
                value: dic[x]
            }
        })
        dataHeat = dataHeat.filter(d => d.value > 0)
        fields = [...new Set(dataHeat.map(item => item.field))]
        profs = [...new Set(dataHeat.map(item => item.prof))]

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#heatMapViz");
        // Build X scales and axis:

        var x = d3.scaleBand()
            .domain(fields)
            .range([20, width - 20])
            .domain(fields)
            .padding(0.01)

        d3.select("#xAxisHeat")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(-60)")
            .style("text-anchor", "start");

        var myColor = d3.scaleLinear()
            .range(["white", "#69b3a2"])
            .domain([0, d3.max(dataHeat, d => +d.value)])

        // Build X scales and axis:
        var y = d3.scaleBand()
            .range([20, height - 20])
            .domain(profs)
            .padding(0.01);

        d3.select("#yAxisHeat")
            .call(d3.axisLeft(y));

        svg.selectAll()
            .data(dataHeat, function (d) { return d.field + ':' + d.prof; })
            .enter()
            .append("rect")
            .attr("x", function (d) { return x(d.field) })
            .attr("y", function (d) { return y(d.prof) })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) { return myColor(+d.value) })
            .on("mouseover", function (d) {
                div.transition()
                    .duration(200)
                    .style("opacity", .9);
                div.html('<b>Field: </b>' + d.field + "<br/>" + '<b>Profession: </b>' + d.prof
                    + '<br>' + d.value)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            })
            .on("mouseout", function (d) {
                div.transition()
                    .duration(500)
                    .style("opacity", 0)
            })




        svg.selectAll('rect')
            .data(dataHeat)
            .transition()
            .duration(500)
            .attr("x", function (d) { return x(d.field) })
            .attr("y", function (d) { return y(d.prof) })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) { return myColor(+d.value) })


        svg.selectAll('rect')
            .data(dataHeat)
            .exit()
            .remove()



    }

    function updateBoxplot(data) {

        var width = 500
        var height = 180


        var svg = d3.select("#boxplotViz")

        var stats = d3.nest()
            .key(function (d) { return d.won_award })
            .rollup(function (d) {
                q1 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .25)
                median = d3.quantile(d.map(g => g.age).sort(d3.ascending), .5)
                q3 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .75)
                interQuantileRange = q3 - q1
                min = q1 - 1.5 * interQuantileRange
                max = q3 + 1.5 * interQuantileRange
                return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
            })
            .entries(data)


        // Show the X scale
        var x = d3.scaleLinear()
            .range([0, width - 20])
            .domain([30, 120])


        d3.select("#xAxisBox")
            .call(d3.axisBottom(x))

        var y = d3.scaleBand()
            .domain([0, 1])
            .range([height, 0])
            .paddingInner(0.6)
            .paddingOuter(.6)

        d3.select("#yAxisBox")
            .call(d3.axisLeft(y))


        d3.selectAll("#lineBox")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x1", function (d) { return (x(d.value.min)) })
            .attr("x2", function (d) { return (x(d.value.max)) })
            .attr("y1", function (d) { return (y(d.key)) })
            .attr("y2", function (d) { return (y(d.key)) })
            .attr("stroke", "black")
            .style("width", 40)

        var boxWidth = 50
        d3.selectAll("#boxBox")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x", function (d) { return (x(d.value.q1)) })
            .attr("y", function (d) { return (y(d.key) - boxWidth / 2) })
            .attr("width", function (d) { return (x(d.value.q3) - x(d.value.q1)) })
            .attr("height", boxWidth)
            .attr("stroke", "black")
            .style("fill", "#69b3a2")

        d3.selectAll("#medianBox")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x1", function (d) { return (x(d.value.median)) })
            .attr("x2", function (d) { return (x(d.value.median)) })
            .attr("y1", function (d) { return (y(d.key) - boxWidth / 2) })
            .attr("y2", function (d) { return (y(d.key) + boxWidth / 2) })
            .attr("stroke", "black")
            .style("width", 80)

    }

})

