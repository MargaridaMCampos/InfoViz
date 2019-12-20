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
        $('.js-example-placeholder-multiple').select2();
        $(".js-example-placeholder-multiple").select2({
            placeholder: "All Countries"
        });
    });
    $(".js-example-theme-multiple").select2({
        theme: "classic"
    });

    $(document).ready(function () {
        listMath(graph_data.nodes)

        $('.js-example-basic-single').select2({ theme: "classic" })
        buildGraph(graph_data);
        buildOverTime(filterData(dataComplete, filters), geoJSON);
        buildHeatMap(filterData(dataComplete, filters));
        updateHeatMap(filterData(dataComplete, filters));
        buildMap(filterData(dataComplete, filters), geoJSON);
        updateMap(filterMapData(dataComplete, filters), geoJSON);
    });

    $(document).ready(function () {

       // $('#resetButton').on('click',console.log('ahah'))

    });

    var filters = baseFilters(dataComplete)
    var scales = {}


    listCountries(filters)
    buildBoxplot(filterData(dataComplete, filters),'won_award');
    updateBoxplot(filterData(dataComplete, filters),'won_award');

    function reset(){
        filters = baseFilters(dataComplete)
        listCountries(filters)
        updateMap(filterMapData(dataComplete, filters), geoJSON);
        updateHeatMap(filterData(dataComplete, filters));
        updateBoxplot(filterData(dataComplete, filters),'won_award');

    }
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
            updateBoxplot(filterData(dataComplete, filters),'won_award')
            updateMap(filterMapData(dataComplete, filters), geoJSON);
            listMath(graph_data.nodes)

        })

        .on("select2:unselect", function (e) {

            filters.countries = $("#selectCountries").select2('data').map(d => d.id)
            updateHeatMap(filterData(dataComplete, filters))
            updateBoxplot(filterData(dataComplete, filters),'won_award')
            updateMap(filterMapData(dataComplete, filters), geoJSON);
            listMath(graph_data.nodes)

        })

    $("#selectMath")
        .select2()
        .on("select2:select", function (e) {

            updateGraph(graph_data)
            updateOverTime(filterData(dataComplete, filters))
            updateHeatMap(filterData(dataComplete, filters))

        })

    $("#selectBoxplot")
    .select2()
    .on("select2:select", function (e) {

        var variable = $('#selectBoxplot').select2('data')[0].id;

        updateBoxplot(filterData(dataComplete,filters),variable)

    })

    var uniqueValues = {}

    uniqueValues.fields =  [...new Set(dataComplete.map(item => item.field))]
    uniqueValues.profs = [...new Set(dataComplete.map(item => item.profession))]

    var colors =_.zipObject(uniqueValues.fields,
        ["#2f4b7c","#665191","#a05195","#d45087","#f95d6a","#ff7c43","#ffa600"])


    function listMath(nodes) {

        var mathematicians = new Set(filterData(dataComplete,filters).map(d=>d.name))

        options = d3.select("#selectMath")

        options
            .selectAll("option")
            .data(nodes.filter(e=>mathematicians.has(e.name)))
            .exit()
            .remove()

        options
            .selectAll("option")
            .data(nodes.filter(e=>mathematicians.has(e.name)))
            .enter()
            .append('option')
        options
            .selectAll("option")
            .data(nodes.filter(e=>mathematicians.has(e.name)))
            .text(d => d.name)
            .attr('value',d=>d.id)
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

    function filterDataMain(data, filters, bycountry) {
        minDecade = filters.dates[0];
        maxDecade = filters.dates[1];
        countries = filters.countries;
        fields = filters.fields;
        professions = filters.professions;
        wonAward = filters.wonAward;

        filtered = data.filter(function (d) {

            res = (bycountry || countries.includes(d.country) || countries.length == 0) &
                +d.birth <= maxDecade & +d.birth >= minDecade &
                fields.includes(d.field) & professions.includes(d.profession)// &
            wonAward.includes(d.won_award)
            return res
        })
        return filtered
    }

    function filterMapData(data, filters) {
        return filterDataMain(data, filters, true)
    }

    function filterData(data, filters) {
        return filterDataMain(data, filters, false)
    }

    function buildMap(data, geoJSON) {
        let widthMap = 450;
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
            .call(d3.zoom().scaleExtent([0.5, 7])
            .extent([[0, 0], [widthMap, heightMap]]).on("zoom", function () {
                container.selectAll("path").attr("transform", d3.event.transform)
            }))
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
            .range(["white", "#003f5c"])

        var countries = $("#selectCountries").select2('data').map(d => d.id)
        console.log(countries)

        d3.select("#mapViz")
            .selectAll("path")
            .data(geoJSON.features, d => d.id)
            .attr("fill", function (d) {
                return colorScale(d.properties.births)
            })
            .attr('stroke', "#ccc")
            .classed('activated', d => countries.includes(d.id))

        d3.select("#mapViz")
            .selectAll("path.activated")
            .attr("stroke", "black")
            .raise()
    }

    function updateOverTime(data) {
        var birthsTime = d3.nest()
        .key(d => +d.birth)
        .rollup(function (d) {
            return d3.sum(d, function (g) { return 1 })
        }).entries(data)
        .map(function (row) {
            return { decade: row.key, n: row.value }
        })
        .sort((a, b) => d3.ascending(a.decade, b.decade));

        var guy = $("#selectMath").select2('data')[0].text;
        var year = parseInt(dataComplete.filter(e=>e.name == guy)[0].birth)
        let widthOvertime = 450;

        let xTimeScale = d3.scaleLinear()
        .domain(d3.extent(birthsTime, d => +d.decade))
        .range([0, widthOvertime-40])

        var containerOvertime = d3.select('#overtime svg')

        containerOvertime
            .select("circle")
            .transition()
            .duration(500)
            .ease(d3.easeLinear)
            .attr("cx", xTimeScale(year) + 30)
            .attr("cy", 100)
            .attr("r", 5)
            .style('fill', '#153F5A')

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
            .sort((a, b) => d3.ascending(a.decade, b.decade));

        let widthOvertime = 450;
        let heightOvertime = 140;

        var containerOvertime = d3.select('#overtime')
            .append("svg")
            .attr("width", widthOvertime)
            .attr("height", heightOvertime)
            .attr("transform", "translate(0,20)")
            .attr('id',"overtimeViz")

        var div = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

        let xTimeScale = d3.scaleLinear()
            .domain(d3.extent(birthsTime, d => +d.decade))
            .range([0, widthOvertime-40])


        let yTimeScale = d3.scaleLinear()
            .domain([0, d3.max(birthsTime, d => +d.n)])
            .range([heightOvertime-40, 0])

        scales.xTime = xTimeScale
        scales.yTime = yTimeScale

        var line = d3.line()
            .defined(d => !isNaN(d.n))
            .x(function (d) {
                return xTimeScale(+d.decade)+30
            })
            .y(function (d) {
                return yTimeScale(+d.n)+0
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
            .attr("stroke", "#003f5c")
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line)

        containerOvertime
            .append("circle")
            .attr("cx", 30)
            .attr("cy", 100)
            .attr("r", 5)

        containerOvertime
            .append("g")
            .call(d3.axisLeft(yTimeScale))
            .attr('class','axis')
            .attr('transform','translate(30,0)')
        
                    // X Title
        containerOvertime.append("text")
            .attr('class','axisTitle')
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height-10 )
            .text("Decade");

        containerOvertime
            .append("g")
            .call(d3.axisBottom(xTimeScale).tickFormat(d3.format("")))
            .attr('class','axis')
            .attr('transform','translate(30,100)')

        containerOvertime
            .append("g")
            .attr('class', 'brush')
            .call(brush)

        updateOverTime(data)
    }

    function buildHeatMap(data) {

        width = 300;
        height = 530;

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

        fields =  [...new Set(dataComplete.map(item => item.field))]
        profs = [...new Set(dataComplete.map(item => item.profession))]

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
            .range([20, width - 50])
            .domain(fields)
            .padding(0.01);

        svg.append("g")
            .attr('id', 'xAxisHeat')
            .attr("class", "axis")
            .attr("transform", "translate(35,450)")
            .call(d3.axisBottom(x))

        var myColor = d3.scaleLinear()
            .range(["#e5ebee", "#003f5c"])
            .domain([0, d3.max(dataHeat, d => +d.value)])
        // Build X scales and axis:
        var y = d3.scaleBand()
            .range([20, height - 60])
            .domain(profs)
            .padding(0.01);

        svg.append("g")
            .attr('id', 'yAxisHeat')
            .attr("class", "axis")
            .attr("transform", "translate(62,0)")
            .call(d3.axisLeft(y));

        d3.selectAll(".tick text").on("click", axisClick);

        function axisClick(){

            var x = this.getAttribute("x")

            if(x == -9){
                 filters.professions = this.textContent;
            }else {
                 filters.fields = this.textContent;
            }

        updateBoxplot(filterData(data,filters),'won_award')
        updateMap(filterData(data,filters),geoJSON)
        buildLine(filterData(data,filters),this.textContent)
        listMath(graph_data.nodes)


        }

    }

    function buildBoxplot(data,variable) {
        var width = 420
        var height = 350

        var svg = d3.select("#boxplot")
            .append("svg")
            .attr('id', 'boxplotViz')
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(0,20)")

            svg.append("g")
            .attr("id", "xAxisBox")
            .attr("class", "axis")
            .attr("transform", "translate(70,300)")
            
            // X Title
            svg.append("text")
            .attr('class','axisTitle')
            .attr("text-anchor", "end")
            .attr("x", width/2+20)
            .attr("y", height-15 )
            .text("Age");
            svg
            .append("g")
            .attr("id", "yAxisBox")
            .attr("class", "axis")
            .attr("transform", "translate(70,10)")


    }

    function buildGraph(graph_data) {
        width = 230;
        height = 140;

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        var svg = d3.select("#graph")
            .append("svg")
            .attr('id', 'graphViz')
            .attr("width", width)
            .attr("height", height)
           .attr("transform","translate(0,20)")
            .append("g")
            //.attr("transform",
              //  "translate(50,50)");

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
            .force("center", d3.forceCenter(230 / 2, 140 / 2));

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

        svg
            .selectAll("line")
            .data(links, d => d.id)
            .enter()
            .append("line")
            .style("stroke", "#aaa")

        var link = svg.selectAll("line")

        svg
            .selectAll("circle")
            .data(nodes, d => d.id)
            .enter()
            .append("circle")
            .attr("r", 20)
            .style("fill", "#ffa600")
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

        var node = svg.selectAll("circle")

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
        width = 280;
        height = 510;

        var guy = $("#selectMath").select2('data')[0].text;
        var lines = dataComplete.filter(e=>e.name == guy)
        var guy_fields = lines.reduce((acc, e) => {acc.add(e.field); return acc;}, new Set)
        var guy_professions = lines.reduce((acc, e) => {acc.add(e.profession); return acc;}, new Set)

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
        dataHeat = dataHeat.slice().sort(function(a,b){
            return d3.descending(a.value,b.value)
        })

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
            .padding(0.01)

        d3.select("#xAxisHeat")
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "translate(-10,10)rotate(-45)")
            .style("text-anchor", "end")


        var myColor = d3.scaleLinear()
        .range(["#e5ebee", "#003f5c"])
        .domain([0, d3.max(dataHeat, d => +d.value)])

        // Build X scales and axis:
        var y = d3.scaleBand()
            .range([20, height - 60])
            .domain(profs)
            .padding(0.01);

        d3.select("#yAxisHeat")
            .call(d3.axisLeft(y));

        svg.selectAll()
            .data(dataHeat, function (d) { return d.field + ':' + d.prof; })
            .enter()
            .append("rect")
            .attr("x", function (d) { return x(d.field)+45 })
            .attr("y", function (d) { return y(d.prof) })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) { return myColor(+d.value) })
            .style("stroke-width", 1)
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
            .data(dataHeat.slice().sort(function(a,b){
                return d3.descending(a.value,b.value)
            }))
            .transition()
            .duration(500)
            .attr("x", function (d) { return x(d.field)+45 })
            .attr("y", function (d) { return y(d.prof) })
            .attr("width", x.bandwidth())
            .attr("height", y.bandwidth())
            .style("fill", function (d) { return myColor(+d.value) })
            .style("stroke", d => {
                if (guy_fields.has(d.field) && guy_professions.has(d.prof)) return "black"
                return ""
            })

        svg.selectAll('rect')
            .data(dataHeat)
            .exit()
            .remove()



    }

    function updateBoxplot(data,variable) {
        var width = 420
        var height = 350


        var svg = d3.select("#boxplotViz")

        var ages = data.map(function(d){
            var obj = {};
            obj.name = d.name;
            obj.age = +d.age;
            obj.variable = d[variable];
            return obj
        })

        var div = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

        const uniqueAges = Array.from(new Set(ages.map(a => a.name)))
         .map(name => {
           return ages.find(a => a.name === name)
         })

        var uniqueVariable = [...new Set(uniqueAges.map(item => item.variable))]



        var stats = d3.nest()
            .key(function (d) { return d.variable })
            .rollup(function (d) {
                q1 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .25)
                median = d3.quantile(d.map(g => g.age).sort(d3.ascending), .5)
                q3 = d3.quantile(d.map(g => g.age).sort(d3.ascending), .75)
                interQuantileRange = q3 - q1
                min = d3.min(d,g=>g.age)
                max = d3.max(d,g=>g.age)
                return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
            })
            .entries(uniqueAges)

        var boxWidth = height/(uniqueVariable.length+1)-10;
        var heightDiff = (height-40) / (stats.length * 2) + 10

        // Show the X scale
        var x = d3.scaleLinear()
            .range([0, width - 80])
            .domain([0, 120])


        d3.select("#xAxisBox")
            .call(d3.axisBottom(x))

        var y = d3.scaleBand()
            .domain(uniqueVariable)
            .range([height-60, 0])


        d3.select("#yAxisBox")
            .call(d3.axisLeft(y))

        svg.selectAll("line.vertLine")
            .data(stats)
            .exit()
            .remove()

        svg.selectAll("rect")
            .data(stats)
            .exit()
            .remove()

        svg.selectAll("line.medianLine")
            .data(stats)
            .exit()
            .remove()

        svg.selectAll("line.vertLine")
            .data(stats)
            .enter()
            .append('line')
            .attr('class', 'vertLine')
            .attr("x1", function (d) { return (x(d.value.min))+15 })
            .attr("x2", function (d) { return (x(d.value.max))+15 })
            .attr("y1", function (d) { return (y(d.key)+heightDiff) })
            .attr("y2", function (d) { return (y(d.key)+heightDiff) })
            .attr("stroke", "black")
            .style("width", 40)



        svg.selectAll("rect")
            .data(stats)
            .enter()
            .append('rect')
            .attr("x", function (d) { return (x(d.value.q1))+15 })
            .attr("y", function (d) { return (y(d.key)+heightDiff - boxWidth / 2) })
            .attr("width", function (d) { return (x(d.value.q3) - x(d.value.q1)) })
            .attr("height", boxWidth)
            .attr("stroke", "black")
            .style("fill", "#bc5090")


            svg.selectAll("line.medianLine")
            .data(stats)
            .enter()
            .append('line')
            .attr('class', 'medianLine')
            .attr("x1", function (d) { return (x(d.value.median))+65 })
            .attr("x2", function (d) { return (x(d.value.median))+65 })
            .attr("y1", function (d) { return (y(d.key)+heightDiff - boxWidth / 2) })
            .attr("y2", function (d) { return (y(d.key)+heightDiff + boxWidth / 2) })
            .attr("stroke", "black")
            .style("width", 80)


        svg.selectAll("line.vertLine")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x1", function (d) { return (x(d.value.min))+65 })
            .attr("x2", function (d) { return (x(d.value.max))+65 })
            .attr("y1", function (d) { return (y(d.key)+heightDiff) })
            .attr("y2", function (d) { return (y(d.key)+heightDiff) })
            .attr("stroke", "black")
            .style("width", 40)


            svg.selectAll("rect")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x", function (d) { return (x(d.value.q1))+65 })
            .attr("y", function (d) { return (y(d.key)+heightDiff - boxWidth / 2) })
            .attr("width", function (d) { return (x(d.value.q3) - x(d.value.q1)) })
            .attr("height", boxWidth)
            .attr("stroke", "black")
            .style("fill", "#bc5090")

            svg.selectAll('rect')
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

        svg.selectAll("line.medianLine")
            .data(stats)
            .transition()
            .duration(500)
            .attr("x1", function (d) { return (x(d.value.median)+65) })
            .attr("x2", function (d) { return (x(d.value.median)+65) })
            .attr("y1", function (d) { return (y(d.key)+heightDiff - boxWidth / 2) })
            .attr("y2", function (d) { return (y(d.key)+heightDiff + boxWidth / 2) })
            .attr("stroke", "black")
            .style("width", 80)


    }

    function buildLine(data,filter){

        let widthOvertime = 450;
        let heightOvertime = 140;

        svg = d3.select('#overtimeViz')

        var birthsTime = d3.nest()
            .key(d => +d.birth)
            .rollup(function (d) {
                return d3.sum(d, function (g) { return 1 })
            }).entries(data)
            .map(function (row) {
                return { decade: row.key, n: row.value }
            })
            .sort((a, b) => d3.ascending(a.decade, b.decade))


        let xTimeScale = scales.xTime
        let yTimeScale = scales.yTime



        var line = d3.line()
            .defined(d => !isNaN(d.n))
            .x(function (d) {
                return xTimeScale(+d.decade)+30
            })
            .y(function (d) {
                return yTimeScale(+d.n)+0
            })

        svg
            .append("path")
            .datum(birthsTime)
            .attr("fill", "none")
            .attr("stroke", colors[filter])
            .attr("stroke-width", 1.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", line)
    }

})

