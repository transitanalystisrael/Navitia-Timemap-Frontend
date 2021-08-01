import * as L from "leaflet";
import * as d3fetch from "d3-fetch";
import * as tinycolor from "tinycolor2";
import * as sprintf from "sprintf";
import 'jquery';
import 'jquery-ui/ui/widgets/slider';
import 'jquery-ui/ui/widgets/tooltip';
import 'jquery-datetimepicker';
import 'jquery-toggles';
import 'leaflet-providers';
import 'moment';
import moment from "moment";
import * as LGU from "leaflet-geometryutil"


/** Map generation section**/
var map;
var heatMapLayerId;
var starting_point_marker;
var default_starting_location = [32.073600, 34.790000];
var starting_location;
var default_starting_zoom = 13;
var goToHeatLayerButtonDiv;

// Load from transitanalystisrael_config the data version: current or past and the server url
var navitia_server_url=  ""

if (cfg_ttm_server_on == "local_pc") {
    navitia_server_url = cfg_time_map_server_local_url
} else if (cfg_ttm_server_on == "aws_ec2") {
    navitia_server_url = cfg_time_map_server_aws_url
}
if (cfg_get_service_date == "on_demand") {
    navitia_server_url = navitia_server_url + cfg_on_demand_coverage_prefix + cfg_gtfsdate
} else {
    //For automatic update deployment, we're always working with the secondary-cov for both current and past
    //with different default date and without blocking user selection on the calendar
    navitia_server_url = navitia_server_url + cfg_secondary_custom_coverage_name
}

var navitia_server_url_heat_maps = navitia_server_url +  "/heat_maps"
var resolution = "750";
var number_of_cells = resolution*resolution
var date_time_picker;

//About - getting from the outer JS.
//Overriding service date Period
var navitia_service_start_date
var navitia_service_end_date
d3fetch.json(navitia_server_url).then(function (data) {
    var navitia_service_start_date = data.regions[0].start_production_date;
    var start_date_formatted =  moment(navitia_service_start_date, "YYYYMMDD").format("ddd MMM DD YYYY")
    var navitia_service_end_date = data.regions[0].end_production_date;
    var end_date_formatted =  moment(navitia_service_end_date, "YYYYMMDD").format("ddd MMM DD YYYY")
    var servicePeriodE = '<br><br>Service Week Analyzed : '+ start_date_formatted +' to '+ end_date_formatted ;
    var servicePeriodH = '<br><br>תקופת השירות שנותחה'+' : '+  start_date_formatted +' - '+end_date_formatted;
    document.getElementById("aboutE").innerHTML = descEtool10 + servicePeriodE + logos;
    document.getElementById("aboutH").innerHTML = descHtool10 + servicePeriodH + logos;
});

//Creating the grey icon
var geryIcon = new L.Icon({
    iconUrl: 'assets/images/marker-icon-grey.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


function createMap() {
    map = L.map('map', {renderer: new L.canvas()})
        .setView([32.07050190954199,34.8427963256836], default_starting_zoom)

    map.createPane('labels');
    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none';


    var tileLayers = makeTileLayers();
    tileLayers[getDefaultLayerName()].addTo(map);
    L.control.layers(tileLayers).addTo(map);


    //Add scale
    L.control.scale().addTo(map);

    //Fixing the grey tiles partial issue
    $(window).on("resize", function () { $("#map").height($(window).height()); map.invalidateSize(); }).trigger("resize");

    // setting for default path of images used by leaflet - otherwise marker only appear after first click
    delete L.Icon.Default.prototype._getIconUrl;

    L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });

    //Creating the default marker with location
    starting_point_marker = createNewMarker(starting_point_marker, default_starting_location, false);
    return map;
}


function getDefaultLayerName() {
    return '(Stamen Toner Lite) רקע שחור-לבן';
};

function makeTileLayers() {
    return {
        '(Stamen Toner Lite) רקע שחור-לבן':
            L.layerGroup([
                L.tileLayer.provider('Stamen.TonerLite', {
                attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>,' +
                    ' <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy;' +
                    ' <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
                    '<br>' +
                    'Transit data provided by <a href="http://miu.org.il/">Merhav</a>' +
                    ' and processed by <a href="https://github.com/CanalTP/navitia">Navitia</a> '
                }),
                L.tileLayer.provider('Stamen.TonerLabels', {
                    attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>,' +
                        ' <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy;' +
                        ' <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
                        '<br>' +
                        'Transit data provided by <a href="http://miu.org.il/">Merhav</a>' +
                        ' and processed by <a href="https://github.com/CanalTP/navitia">Navitia</a> ',
                    pane: 'labels'
                })
        ]),
        '(OSM) רקע שחור-לבן':
            L.tileLayer.provider('OpenStreetMap.BlackAndWhite', {
                attribution: 'Map tiles & data  &copy;' +
                    ' <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
                    '<br>' +
                    'Transit data provided by <a href="http://miu.org.il/">Merhav</a>' +
                    ' and processed by <a href="https://github.com/CanalTP/navitia">Navitia</a> '
            }),
        '(OSM) רקע צבעוני':
            L.tileLayer.provider('OpenStreetMap.Mapnik', {
                attribution: 'Map tiles & data  &copy;' +
                    ' <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>' +
                    '<br>' +
                    'Transit data provided by <a href="http://miu.org.il/">Merhav</a>' +
                    ' and processed by <a href="https://github.com/CanalTP/navitia">Navitia</a> '
            }),
    };

};


function createNewMarker(marker, latLng, isDragged) {
    //Remove old marker from the map
    if (starting_point_marker) {
        starting_point_marker.removeFrom(map);
    }
    if (isDragged) {
        marker = new L.marker(latLng, {
            draggable: true,
            icon: geryIcon
        });
    } else {
        marker = new L.marker(latLng, {
            draggable: true,
        });
    }
    marker.on('dragend', function(event){
        handleMarkerDrag(event.target.getLatLng());
    });
    starting_location= marker._latlng;
    marker.addTo(map);
    return marker;
}
function handleMarkerDrag(latLng) {
    starting_location = latLng;
    //remove former starting marker point
    if (starting_point_marker !== undefined) {
        map.removeLayer(starting_point_marker);
    }
    starting_point_marker = createNewMarker(starting_point_marker, starting_location, true);
    invalidateRunButton();
}

function invalidateRunButton() {
    $('#runButton').addClass("invalidated");
    runButton.text("חשב");
}


/**
 * Recenter button when results are loaded
 */
var goToHeatLayerButton = L.control({position: 'bottomright'});
goToHeatLayerButton.onAdd = function (map) {
    goToHeatLayerButtonDiv = L.DomUtil.create('input', 'go-to-button');
    goToHeatLayerButtonDiv.type="button";
    goToHeatLayerButtonDiv.value="חזרו תוצאות חדשות לחצו כאן"
    goToHeatLayerButtonDiv.onclick = function(e){
        map.eachLayer(function(layer){
            if (layer._leaflet_id === heatMapLayerId) {
                map.panTo(starting_location);
            }
        });
        map.removeControl(goToHeatLayerButtonDiv);
        L.DomEvent.stopPropagation(e);
    }
    return goToHeatLayerButtonDiv;
};


function addHeatMapLayer(features) {
    var heatMapLayer = new L.featureGroup(features);
    heatMapLayerId = heatMapLayer.getLayerId(heatMapLayer);
    heatMapLayer.addTo(map);
    //Add goToHeatLayerButton if the viewport is outside of the heat layer
    if (!heatMapLayer.getBounds().contains(map.getCenter())) {
        goToHeatLayerButton.addTo(map);
    }
}

function addHeatMap(url) {
    //With the AWS API, the response is automatically gzipped. If a different deployment is used, make sure this
    //still works
    d3fetch.json(url).then(function (data) {
        var heatMatrix= data.heat_maps[0].heat_matrix;
        loadHeatMap(heatMatrix);
    }).catch(function(error) {
        //Remove spinner
        $('#spinner').hide();
        invalidateRunButton();
        //If user selects a location that isn't applicable as origin or destination
        if (error.message.includes("404")) {
            alert("The selected location isn't a valid origin or destination.");
        }
        if (error.message === "Failed to fetch") {
            alert("Server seems to be busy, please try again in several moments.\n" +
                "If this persists, kindly see homepage for support details.");
        }
    });
}

function getColorFromDuration (duration) {
    return toCssColor(computeColorFromDuration(duration));
};

//time map boundries
var boundry1 = 900;  //15min
var boundry2 = 1800; //30min
var boundry3 = 2700; //45min
var boundry4=3600; //60min
var boundry5=4500; //75min
var boundry6=5400; //90min
var boundry7=7200; //120min

var boundry1count = 0; //15min
var boundry2count = 0; //30min
var boundry3count = 0; //45min
var boundry4count = 0; //60min
var boundry5count = 0; //75min
var boundry6count = 0; //90min
var boundry7count = 0; //120min

var areaArray = [0.0,0.0,0.0,0.0];

//colors for the heat map
var colorMap = new Map ([
    [900 ,'rgb(199,199,199)'],
    [1800, 'rgb(160,206,160)'],
    [2700, 'rgb(163,163,207)'],
    [3600, 'rgb(207,207,163)'],
    [4500, 'rgb(206,160,160)'],
    [5400, 'rgb(207,168,207)'],
    [7200,'rgb(132, 132,132)']
]);

function computeColorFromDuration (duration) {
    var r, g, b, ratioForLuminace, hslColor, selectedRange;
    //select correct range
    if (duration < boundry1) {
        selectedRange = boundry1;
        boundry1count +=1;
    } else if (duration >= boundry1 && duration < boundry2) {
        selectedRange = boundry2;
        boundry2count +=1;
    } else if (duration >= boundry2 && duration < boundry3) {
        selectedRange = boundry3;
        boundry3count +=1;
    } else if (duration >= boundry3 && duration < boundry4) {
        selectedRange = boundry4;
        boundry4count +=1;
    } else if (duration >= boundry4 && duration < boundry5) {
        selectedRange = boundry5;
        boundry5count +=1;
    } else if (duration >= boundry5 && duration < boundry6) {
        selectedRange = boundry6;
        boundry6count +=1;
    } else {
        selectedRange = boundry7;
        boundry7count +=1;
    }

    //compute color
    hslColor = new tinycolor(colorMap.get(selectedRange));
    ratioForLuminace = 60 - Math.round((duration / selectedRange) * 60);
    hslColor.brighten(ratioForLuminace);
    hslColor.toRgb();
    r = Math.round(hslColor._r);
    g = Math.round(hslColor._g);
    b = Math.round(hslColor._b);
    return {red: r, green: g, blue: b};
};

function toCssColor (c, alpha) {
    if (alpha) {
        return sprintf('rgba(%s, %s, %s, %s)', c.red, c.green, c.blue, alpha);
    } else {
        return sprintf('#%02x%02x%02x', c.red, c.green, c.blue);
    }
};

function loadHeatMap(heatMatrix) {

    //remove current heat map - Couldn't find how to get the layerId as a map method
    // as long as we don't have many layers, this is ok
    map.eachLayer(function(layer){
        if (layer._leaflet_id === heatMapLayerId) {
            map.removeLayer(layer);
        }
    });
    //resetting the marker to blue (only on successful response)
    if (starting_point_marker) {
        starting_point_marker = createNewMarker(starting_point_marker, starting_location, false);
    }

    var startingProcessingJsonDate = new Date();
    var data= [];
    var scale = 0;
    heatMatrix.lines.forEach(function(lines) {
        lines.duration.forEach(function(duration) {
            if (duration !== null) {
                scale = Math.max(duration, scale);
            }
        });
    });
    
    var matrixLat1 = heatMatrix.line_headers[0].cell_lat.min_lat;
    var matrixLon1 = heatMatrix.lines[0].cell_lon.min_lon;
    var matrixLat2 = heatMatrix.line_headers[resolution-1].cell_lat.max_lat; var matrixLon2 = heatMatrix.lines[0].cell_lon.min_lon;
    var matrixLat3 = heatMatrix.line_headers[resolution-1].cell_lat.max_lat; var matrixLon3 = heatMatrix.lines[resolution-1].cell_lon.max_lon;
    var matrixLat4 = heatMatrix.line_headers[0].cell_lat.min_lat; var matrixLon4 = heatMatrix.lines[resolution-1].cell_lon.max_lon;
    //console.log(matrixLat1, matrixLon1);
    //console.log(matrixLat2, matrixLon2);
    //console.log(matrixLat3, matrixLon3);
    //console.log(matrixLat4, matrixLon4);
    var matrixPolygon = L.polygon([
        [matrixLat1, matrixLon1],
        [matrixLat2, matrixLon2],
        [matrixLat3, matrixLon3],
        [matrixLat4, matrixLon4]
    ]);
    var matrixLatLngs = matrixPolygon.getLatLngs()[0]
    //console.log(matrixLatLngs);
    //console.log(L);
    //console.log(LGU);
    //console.log(L.GeometryUtil.geodesicArea(matrixPolygon.getLatLngs()[0]) );
    var len_a = LGU.length([matrixLatLngs[0],matrixLatLngs[1]]); // in m
    var len_b = LGU.length([matrixLatLngs[1],matrixLatLngs[2]]);
    var len_c = LGU.length([matrixLatLngs[2],matrixLatLngs[3]]);
    var len_d = LGU.length([matrixLatLngs[3],matrixLatLngs[0]]);
    var len_h = Math.sqrt(Math.pow(len_a,2)-Math.pow((len_d-len_b)/2,2));
    var matrixArea = (len_h * (len_b+len_d)/2 )/1000000 ;// in SqKm
    //console.log(len_h, matrixArea);
    
    boundry1count = 0; //15min
    boundry2count = 0; //30min
    boundry3count = 0; //45min
    boundry4count = 0; //60min
    boundry5count = 0; //75min
    boundry6count = 0; //90min
    boundry7count = 0; //120min

    var heatMapPixels = [];
    heatMatrix.lines.forEach(function(lines/*, i*/) {
        lines.duration.forEach(function(duration, j) {
            var color;
            if (duration !== null) {
                color = getColorFromDuration(duration);
            } else {
                color = '#000000';
                // for the moment, we don't want to print the null duration squares because
                // it impacts the performances of the navigator.
                return;
            }
            var rectangle = [
                [heatMatrix.line_headers[j].cell_lat.max_lat, lines.cell_lon.max_lon],
                [heatMatrix.line_headers[j].cell_lat.min_lat, lines.cell_lon.min_lon]
            ];
            heatMapPixels.push(makePixel(rectangle, color, duration));
        });
    });
    addHeatMapLayer(heatMapPixels);
    //Remove spinner
    $('#spinner').hide();
    invalidateRunButton();
    
    var area1 = matrixArea*boundry1count/number_of_cells;
    var area2 = matrixArea*(boundry1count+boundry2count)/number_of_cells;
    var area3 = matrixArea*(boundry1count+boundry2count+boundry3count)/number_of_cells;
    var area4 = matrixArea*(boundry1count+boundry2count+boundry3count+boundry4count)/number_of_cells;
    var area5 = matrixArea*(boundry1count+boundry2count+boundry3count+boundry4count+boundry5count)/number_of_cells;
    //console.log(area1.toFixed(2),area2.toFixed(2),area3.toFixed(2),area4.toFixed(2));
    areaArray = [area1.toFixed(1),area2.toFixed(1),area3.toFixed(1),area4.toFixed(1)];
    console.log(areaArray.toString());
    info.update(areaArray);
}


function makePixel (PolygonCoords, color, duration) {
    var summary = 'not accessible';
    if (duration !== null) {
        summary = sprintf('זמן הגעה: %s <br/> <p class="popup-link"> לחצו בכדי לקבוע את נקודת המוצא ' +
            '</p>', durationToString(duration));
    }
    return L.rectangle(PolygonCoords, {
        smoothFactor: 0,
        color:  '#555555',
        opacity: 0,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.7
    }).bindPopup(summary);
}

function durationToString (duration) {
    var res = '';
    var seconds = duration % 60;
    var minutes = Math.floor(duration / 60) % 60;
    var hours = Math.floor(duration / (60 * 60)) % 24;
    var days = Math.floor(duration / (24 * 60 * 60));

    if (days !== 0) { res += sprintf('%s ימים, ', days); }
    if (hours !== 0) { res += sprintf('%s שעות,  ', hours); }
    if (minutes !== 0) { res += sprintf('%s דקות ', minutes); }
    //if (seconds !== 0) { res += sprintf('ו-%s שניות', seconds); }

    if (! res) {
        return '0s';
    } else {
        return res;
    }
};

/**Switch Button**/
//Setting the switch button and attaching it's style to a var
$('#switchButton').toggles({
    click: true, // allow clicking on the toggle
    text: {
        on: 'מוצא', // text for the ON position
        off: 'יעד' // and off
    },
    on:true,
    type: 'select',
    height: '20',
    width: '60'
});
var switchButton = $('#switchButton').data('toggles');
$('#switchButton').on("toggle", invalidateRunButton);

/**Transit Mode button and speed for overriding bike as walking with double speed**/
function setTransitModeAsDefault() {
    $('input:radio[name=transitMode]')[0].checked = true;
}
setTransitModeAsDefault();
//Invalidating the run button in case of change
$('input:radio').on("click",invalidateRunButton);
//Add tooltip to the mode buttons
$(".mode-button-container").tooltip();

function getTransitMode(mode) {
    return $('input:radio[name=transitMode]:checked').val();
}
function getTransitModeUrl() {
    var mode = getTransitMode($('input:radio[name=transitMode]:checked').val());
    //At alpha version we consider bike to be walking in 4.1 ms speed,
    //so we set the frist and last walking modes to walking and we disallow use of transit (navitia hack).
    if (mode ==="walking" || mode === "bike") {
        return "&first_section_mode%5B%5D=walking&last_section_mode%5B%5D=walking" +
            "&allowed_id[]=physical_mode:Bus&forbidden_uris[]=physical_mode:Bus"
    }  else {
        return "";
    }
}

function getSpeed(mode) {
    if (mode=="bike") {
        return "&walking_speed=4.1";
    } else if (mode==="walking") {
        return "&walking_speed=1.2";
    } else  {
        return "";
    }
}
/**
 * RUN Button
 * **/
var runButton = $('#runButton').on("click", generateHeatMap);

/**
 * Time slider
 */

var handle = $( "#custom-handle" );
var selectedTimeRange;
var timeSlider = $('#timeSlider').slider({
    step: 15,
    min: 15,
    max: 120,
    value: 60,
    create: function() {
        var value = $( this ).slider( "value" );
        handle.text(value);
        selectedTimeRange = parseInt(value);
    },
    slide: function( event, ui ) {
        var value = ui.value;
        handle.text( value);
        selectedTimeRange = parseInt(value);
        invalidateRunButton();
    }
});





function generateHeatMap() {
    //Mark button as running
    runButton.removeClass("invalidated");
    runButton.text("מחשב...");
    //Show spinner
    $('#spinner').show();
    //Remove the "Take me to the heat map" button
    if (goToHeatLayerButtonDiv) {
        map.removeControl(goToHeatLayerButtonDiv);
    }
    if (starting_point_marker === undefined) {
        alert("Please select a starting point on the map");
        return;
    }

    //Getting the time from the Date & time picker
    var dt = new Date(date_time_picker.val());
    var dateTimeString = sprintf('%s%s%sT%s%s00', dt.getFullYear(),
        ("0" + (dt.getMonth() + 1)).slice(-2),
        ("0" + (dt.getDate())).slice(-2),
        ("0" + (dt.getHours())).slice(-2),
        ("0" + (dt.getMinutes())).slice(-2));

    //Select from or to according to user's selection
    var from_to = switchButton.active ? "&from=" : "&to=";

    //Get mode, transit by default
    var mode = getTransitMode()

    //get Speed for simulating bike as walking in 4.1 mps
    var speed = getSpeed(mode);

    //calcualte max duration in seconds
    var max_duration = selectedTimeRange*60;

    var heatMapJsonUrl = navitia_server_url_heat_maps  +
        "?max_duration=" + max_duration +
        from_to + starting_location.lng +
        "%3B" + starting_location.lat +
        "&datetime=" + dateTimeString +
        getTransitModeUrl() +
        speed +
        "&resolution=" + resolution;
    //add new heat map
    addHeatMap(heatMapJsonUrl)

}

createMap();
map.on('click', function (e) {
    handleMarkerDrag(e.latlng);
});

//Adding the option to set the marker using the popup
map.on('popupopen', function(e) {
    $('.popup-link').click(function (e) {
        var latLng;
        map.eachLayer(function(layer){
            if (layer._leaflet_id === heatMapLayerId) {
                latLng = layer._map._popup._latlng
            }
        });
        map.closePopup();
        handleMarkerDrag(latLng);
    });
});



var showAbout = true;
$('#aboutBtn').on("click", function(){
    if (showAbout) {
        $('.about-container').show();
        showAbout = false;
    } else {
        $('.about-container').hide();
        showAbout = true;
    };
});

$('#homeBtn').on("click", function(){
    window.location.href="../index.html";
});

$('#selfBtn').on("click", function(){
    window.location.href="index.html";
});

//Legend
var legend = L.control({position: 'bottomleft'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'legend'),
        time_intervals  = [0, 15, 30, 45, 60, 75, 90, 120],
        labels = [];
    div.innerHTML = "<h3>זמן הגעה בדקות</h3>"
    // loop through our time intervals and generate a label with a colored square for each interval
    for (var i = 0; i < time_intervals.length-1; i++) {
        div.innerHTML +=
            '<i style="background:' + colorMap.get(time_intervals[i+1]*60) + '"></i> ' +
            time_intervals[i] + (time_intervals[i + 2] ? '&ndash;' + time_intervals[i + 1] + '<br>' : '+');
    }

    return div;
};

legend.addTo(map);


var info = L.control({position: 'topleft'});

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update(areaArray);
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (a) {
    this._div.innerHTML = '<h4>SqKm Area for up to<br>15, 30, 45, 60 min</h4>' + 
    a[0].toString()+',&nbsp&nbsp'+ a[1].toString()+',&nbsp&nbsp'+ a[2].toString()+',&nbsp&nbsp'+ a[3].toString();
};

info.addTo(map);


//Creating the default map after getting the date
function getdate_and_generateHeatMap(){
    d3fetch.json(navitia_server_url).then(function (data) {
        var navitia_service_start_date = data.regions[0].start_production_date;
        // Get the start date from the descriptions to be like other tools start date
        var selected_date = startD
        var navitia_service_end_date = data.regions[0].end_production_date;
        // end date is at the end of production service
        var end_date  = moment(navitia_service_end_date, "YYYYMMDD")
        //console.log(selected_date, end_date)
        date_time_picker = $('#datetimepicker').datetimepicker({
            formatDate: 'd.m.Y',
            formatTime: 'H:i',
            // default_Date: moment(navitia_service_start_date).format('DD.MM.YYYY'),
            minDate: moment(navitia_service_start_date).format('DD.MM.YYYY'),
            maxDate: moment(end_date).format('DD.MM.YYYY'),
            showSecond: false,
            step: 30,
        });
        
        var navitiaendD = new Date(navitia_service_end_date.slice(0,4), navitia_service_end_date.slice(4,6)-1, navitia_service_end_date.slice(6)); // js months are 0-11
        //Default time - added min for the case that the navitia service period too short to get to current GTFS start date
        date_time_picker.val(moment(Math.min(selected_date, navitiaendD)).format('YYYY/MM/DD') + (' 08:00'));
        generateHeatMap()
    })
}

//main function
getdate_and_generateHeatMap();




