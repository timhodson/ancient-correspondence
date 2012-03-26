//
//  main.js
//
//  A project template for using arbor.js
//

(function($){
  
  var animationRunning = true;

  var Renderer = function(canvas){
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var particleSystem

    var that = {
      init:function(system){
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        // save a reference to the particle system for use in the .redraw() loop
        particleSystem = system

        // inform the system of the screen dimensions so it can map coords for us.
        // if the canvas is ever resized, screenSize should be called again with
        // the new dimensions
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(80) // leave an extra 80px of whitespace per side
        
        // set up some event handlers to allow for node-dragging
        that.initMouseHandling()

      },
      
      redraw:function(){
        // 
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        // 
        ctx.fillStyle = "white"
        ctx.fillRect(0,0, canvas.width, canvas.height)
        
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords

          // draw a line from pt1 to pt2
          ctx.strokeStyle = "rgba(0,0,0, .333)"
          ctx.lineWidth = 1
          ctx.beginPath()
          that.canvas_arrow(ctx,pt1.x, pt1.y, pt2.x, pt2.y );
          ctx.stroke()
        })
        
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords

          // draw a rectangle centered at pt
          var w = 4
//          ctx.fillStyle = (node.data.alone) ? "orange" : "black"
          ctx.fillStyle = node.data.color 
          ctx.fillRect(pt.x-w/2, pt.y-w/2, w,w)

          // determine the box size and round off the coords if we'll be 
          // drawing a text label (awful alignment jitter otherwise...)
//          console.log(node.data.label)
          var w = ctx.measureText(node.data.label||"").width + 6
          var label = node.data.label

          // draw the text
          if (label && 0){
            ctx.font = "bold 10px Arial"
            ctx.textAlign = "center"
            ctx.fillStyle = node.data.color
            ctx.fillText(label||"", pt.x, pt.y+4)
          }

        })    			
      },

      canvas_arrow:function(context, fromx, fromy, tox, toy){
          var headlen = 7;   // length of head in pixels
          var angle = Math.atan2(toy-fromy,tox-fromx);
          context.moveTo(fromx, fromy);
          context.lineTo(tox, toy);
          context.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
          context.moveTo(tox, toy);
          context.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
      },

      update_page_header:function(mo){
            $("#who").html("<p><b>From</b> <i>"+mo.node.data.from+"</i> <br><b>To</b> <i>"+mo.node.data.to+"</i></p>")
              var reference = encodeURIComponent(mo.node.data.reference)
              var url="http://www.nationalarchives.gov.uk/search/search_results.aspx?Page=1&ExactPhrase="+reference+"&SelectedDatabases=A2A%7cARCHON%7cBOOKSHOP%7cCABPAPERS%7cDOCUMENTSONLINE%7cEROL%7cMOVINGHERE%7cNRA%7cNRALISTS%7cPREM19%7cRESEARCHGUIDES%7cE179%7cCATALOGUE%7cWEBSITE%7cTRAFALGAR&SearchType=Advanced";
              $("#what").html($("<p>"+mo.node.data.about+"</p><a href='"+url+"' >Find in the National Register of Archives</a></p>"))


      },

      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        var dragged = null;

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          mousemove:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            mo = particleSystem.nearest(_mouseP);

            if (mo && mo.node !== null){
              that.update_page_header(mo);
            }
            
            return false
          },
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            dragged = particleSystem.nearest(_mouseP);

            if (dragged && dragged.node !== null){
              // while we're dragging, don't let physics move the node
              dragged.node.fixed = true ;
              that.update_page_header(dragged);
            }

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)
            
            return false
          },
          dragged:function(e){
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)

            if (dragged && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = false
            dragged.node.tempMass = 1000
            dragged = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        
        // start listening
        $(canvas).mousedown(handler.clicked);
        $(canvas).mousemove(handler.mousemove);

      },
      
    }
    return that
  }    

  $(document).ready(function(){
    var sys = arbor.ParticleSystem(50, 500, 0.5) // create the system with sensible repulsion/stiffness/friction
    sys.parameters({gravity:false}) // use center-gravity to make the graph settle nicely (ymmv)
    sys.renderer = Renderer("#viewport") // our newly created renderer will have its .init() method called shortly by sys...

    // some vars to hold property names
    var writtenFrom = "http://data.kasabi.com/dataset/nra/schema/writtenFrom",
        writtenTo = "http://data.kasabi.com/dataset/nra/schema/writtenTo",
        rdfsLabel = "http://www.w3.org/2000/01/rdf-schema#label",
        rdfType = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
        dctDescription = "http://purl.org/dc/terms/description",
        dctIdentifier = "http://purl.org/dc/terms/identifier" ;


    $('#toggle').click(function(){
      if(!$(this).hasClass("disabled")){
        if(animationRunning == true){
          animationRunning = false ;
          $("#toggle").text("Unfreeze");
          sys.stop();
        }
        else if(animationRunning == false){
          animationRunning = true;
          $("#toggle").text("Freeze");
          sys.start();
          // trigger the redrawing to begin again
          var canvas = $("#viewport").get(0)
          $(canvas).mousedown();
        }
      }
    });    
    setTimeout("$('#toggle').toggleClass('disabled'); $('#toggle').click(); ",20000);


    // add some nodes to the graph and watch it go...
    $.getJSON('ancient-correspondence.rdf.json', function(data){
      $.each(data, function(i){
        // look for things which are letters
        if(data[i][rdfType][1]){
          if(data[i][rdfType][1].value == "http://data.kasabi.com/dataset/nra/schema/Letter" ){
          
            // default values for nodes
            var p1 = "unknown" , p2 = "unknown" ;
            var l1 = "unknown writer", l2 = "unknown reciever" ;
            var a = "Unknown topic of correspondence" ;

            // setup our vars with data if they are present.
            // this will mean that only letters with both a writtenFrom and writtenTo value will be output.
            if(data[i][writtenFrom]){
              p1 = data[i][writtenFrom][0].value;
                            
            }
            if(p1 != "unknown"){
              if(data[p1][rdfsLabel]){
                l1 = data[p1][rdfsLabel][0].value ;
              }
            }
            if(data[i][writtenTo]){
              p2 = data[i][writtenTo][0].value;
            }
            if(p2 != "unknown"){
              if(data[p2][rdfsLabel]){
                l2 = data[p2][rdfsLabel][0].value
              }
            }

            // letter properties
            if(data[i][dctDescription]){
              ld = data[i][dctDescription][0].value;             
            }
             if(data[i][dctIdentifier]){
              li = data[i][dctIdentifier][0].value;             
            }



            // build our nodes and edges for this letter
            if( typeof(p1) != undefined && typeof(p2) != undefined ){
              sys.addNode(p1,{ label: l1, color: 'black' , about: ld, from: l1, to: l2, reference: li });
              sys.addNode(p2,{ label: l2, color: 'red' , about: ld, from: l1, to: l2, reference: li  });
              sys.addEdge(p1,p2);
            }
          }
      }
      
      });


    });
    
  })

})(this.jQuery)
