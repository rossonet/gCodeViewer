/**
 * User: hudbrog (hudbrog@gmail.com)
 * Date: 10/21/12
 * Time: 7:45 AM
 */
var GCODE = {};

GCODE.miscObject = (function(){
    var reader;

    var tabSelector = ["2d","3d"];

    return {
        worker: undefined,
        handleFileSelect: function(evt) {
            console.log("handleFileSelect");
            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.dataTransfer?evt.dataTransfer.files:evt.target.files; // FileList object.

            // files is a FileList of File objects. List some properties.
            var output = [];
            for (var i = 0, f; f = files[i]; i++) {
                output.push('<li>', escape(f.name), ' - ',
                    f.size, ' bytes, last modified: ',
                    f.lastModifiedDate ? f.lastModifiedDate.toLocaleDateString() : 'n/a',
                    '</li>');
                if(f.name.toLowerCase().match(/^.*\.(?:gcode|g|txt)$/)){
                    output.push('<li>File extensions suggests GCODE</li>');
                    output.push('<li>You should press "Render GCode" button now.</li>');

                }else{
                    output.push('<li><strong>You should only upload *.gcode files! I will not work with this one!</strong></li>');
//                    $( "submit_button" ).button("disable");
                    document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
                    return;
                }

                reader = new FileReader();
                reader.onload = function(theFile){
                    $("#progressName").html("Loading model:");
                    $("#list").html("");
                    $("#loadProgressbar").show();
                    $("#loadProgressbar").progressbar({value:0});
                    GCODE.gCodeReader.loadFile(theFile);
                };
                $( "#accordion_top" ).accordion( "activate" , 1 );
                reader.readAsText(f);
            }

//            document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
//            document.getElementById('submit_button').disabled=false;

//            $( "#submit_button" ).button("enable");

        },

        handleDragOver: function(evt) {
            evt.stopPropagation();
            evt.preventDefault();
            evt.target.dropEffect = 'copy'; // Explicitly show this is a copy.
        },

        initHandlers: function(){
            var warnings = [];
            var fatal = [];

            Modernizr.addTest('filereader', function () {
                return !!(window.File && window.FileList && window.FileReader);
            });

            if(!Modernizr.canvas)fatal.push("<li>Your browser doesn't seem to support HTML5 Canvas, this application won't work without it.</li>");
            if(!Modernizr.filereader)fatal.push("<li>Your browser doesn't seem to support HTML5 File API, this application won't work without it.</li>");
            if(!Modernizr.webworkers)fatal.push("<li>Your browser doesn't seem to support HTML5 Web Workers, this application won't work without it.</li>");
            if(!Modernizr.svg)fatal.push("<li>Your browser doesn't seem to support HTML5 SVG, this application won't work without it.</li>");

            if(fatal.length>0){
                document.getElementById('list').innerHTML = '<ul>' + fatal.join('') + '</ul>';
                console.log("Initialization failed: unsupported browser.")
                return;
            }

            if(!Modernizr.webgl){
                warnings.push("<li>Your browser doesn't seem to support HTML5 Web GL, 3d mode is not recommended, going to be SLOW!</li>");
                GCODE.renderer3d.setOption({rendererType: "canvas"});
            }
            if(!Modernizr.draganddrop)warnings.push("<li>Your browser doesn't seem to support HTML5 Drag'n'Drop, Drop area will not work.</li>");
            if(warnings.length>0){
                document.getElementById('list').innerHTML = '<ul>' + wanings.join('') + '</ul>';
                console.log("Initialization succeeded with warnings.")
                return;
            }

            console.log("Application initialized");
            var dropZone = document.getElementById('drop_zone');
            dropZone.addEventListener('dragover', GCODE.miscObject.handleDragOver, false);
            dropZone.addEventListener('drop', GCODE.miscObject.handleFileSelect, false);

            document.getElementById('file').addEventListener('change', GCODE.miscObject.handleFileSelect, false);

//            $(function() {
//                $( "#submit_button" )
//                    .button()
//                    .click(function( event ) {
//                        _gaq.push(['_trackEvent', 'renderButton', 'clicked']);
//                        $("#tabs-min").tabs("select", "#tabs-1");
//                        var result = GCODE.gCodeReader.parseGCode();
//                        if(result){
//                            var resultSet = [];
//                            resultSet.push("<li>Model size is: " + result.modelSize.x.toFixed(2) + 'x' + result.modelSize.y.toFixed(2) + 'x' + result.modelSize.z.toFixed(2)+'mm</li><br>');
//                            resultSet.push("<li>Total filament used: " + result.totalFilament.toFixed(2) + "mm</li><br>");
//                            document.getElementById('list').innerHTML =  '<ul>' + resultSet.join('') + '</ul>';
//                        }
//                        event.preventDefault();
//                    });
//            });



            $('#tabs-min').bind('tabsselect', function(event, ui) {
                console.log("got tab select");
                if(tabSelector[ui.index]&&tabSelector[ui.index]=="3d"&&!GCODE.renderer3d.isModelReady()){
                    console.log("we are going to 3d mode");
//                    $(function() {
//                        $( "#dialog-modal" ).dialog({
//                            height: 140,
//                            modal: true
//                        });
//                    });
//                    $(function() {
//                        $( "#progressbar" ).progressbar({
//                            value: 0
//                        });
//                    });
                    GCODE.renderer3d.doRender();
                };

            });

//
//            $(function() {
//                $( "#accordion" ).accordion();
//            });

            $(function() {
                $( "#accordion_top" ).accordion();
            });

            worker = new Worker('js/Worker.js');

            worker.addEventListener('message', function(e) {
                var data = e.data;
                switch (data.cmd) {
                    case 'returnModel':
                        $("#progressName").html("");
                        $("#loadProgressbar").hide();
                        GCODE.gCodeReader.passDataToRenderer();
                        break;
                    case 'analyzeDone':
                        $("#progressName").html("");
                        $("#loadProgressbar").hide();
                        GCODE.gCodeReader.processAnalyzeModelDone(data.msg);
                        var resultSet = [];
                        resultSet.push("<li>Model size is: " + data.msg.modelSize.x.toFixed(2) + 'x' + data.msg.modelSize.y.toFixed(2) + 'x' + data.msg.modelSize.z.toFixed(2)+'mm</li><br>');
                        resultSet.push("<li>Total filament used: " + data.msg.totalFilament.toFixed(2) + "mm</li><br>");
                        resultSet.push("<li>Estimated print time: " + parseFloat(parseFloat(data.msg.printTime)/60).toFixed(2) + "min</li><br>");
                        resultSet.push("<li>Estimated layer height: " + data.msg.layerHeight.toFixed(2) + "mm</li><br>");
                        resultSet.push("<li>Layer count: " + data.msg.layerCnt.toFixed(0) + "printed, " + data.msg.layerTotal.toFixed(0) + 'visited</li><br>');
                        document.getElementById('list').innerHTML =  '<ul>' + resultSet.join('') + '</ul>';
                        $( "#accordion_top" ).accordion( "activate" , 2 );

                        break;
                    case 'returnLayer':
                        GCODE.gCodeReader.processLayerFromWorker(data.msg);
                        $(function() {
                            $( "#loadProgressbar" ).progressbar({
                                value: data.msg.progress
                            });
                        });

                        break;
                    case "analyzeProgress":
                        if(!$("#loadProgressbar").visible){
                            $("#progressName").html("Analyzing model:");
                            $("#loadProgressbar").show();
                        }
                        $("#loadProgressbar").progressbar({value:data.msg.progress});
                        break;
                    default:
                        console.log("default msg received" + data);
                }
            }, false);

            GCODE.miscObject.processOptions();

            worker.postMessage({"cmd":"lala", "msg":"blah"});

        },

        processOptions: function(){
            if(document.getElementById('sortLayersCheckbox').checked)GCODE.gCodeReader.setOption({sortLayers: true});
            else GCODE.gCodeReader.setOption({sortLayers: false});

            if(document.getElementById('purgeEmptyLayersCheckbox').checked)GCODE.gCodeReader.setOption({purgeEmptyLayers: true});
            else GCODE.gCodeReader.setOption({purgeEmptyLayers: false});

            if(document.getElementById('analyzeModelCheckbox').checked)GCODE.gCodeReader.setOption({analyzeModel: true});
            else GCODE.gCodeReader.setOption({analyzeModel: false});


            if(document.getElementById('sortLayersCheckbox').checked) worker.postMessage({"cmd":"setOption", "msg":{sortLayers: true}});
            else  worker.postMessage({"cmd":"setOption", "msg":{sortLayers: false}});

            if(document.getElementById('purgeEmptyLayersCheckbox').checked)worker.postMessage({"cmd":"setOption", "msg":{purgeEmptyLayers: true}});
            else worker.postMessage({"cmd":"setOption", "msg":{purgeEmptyLayers: false}});

            if(document.getElementById('analyzeModelCheckbox').checked)worker.postMessage({"cmd":"setOption", "msg":{analyzeModel: true}});
            else worker.postMessage({"cmd":"setOption", "msg":{analyzeModel: false}});


            if(document.getElementById('moveModelCheckbox').checked)GCODE.renderer.setOption({moveModel: true});
            else GCODE.renderer.setOption({moveModel: false});

            if(document.getElementById('showMovesCheckbox').checked)GCODE.renderer.setOption({showMoves: true});
            else GCODE.renderer.setOption({showMoves: false});

            if(document.getElementById('showRetractsCheckbox').checked)GCODE.renderer.setOption({showRetracts: true});
            else GCODE.renderer.setOption({showRetracts: false});
        }
    }
}());