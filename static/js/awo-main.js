
W_log('Loading Mind Wurld Open main JavaScript routines...');

var WURLD = {

    water: {
      parameters: {
        size: 4000
      },
      normals: null,
      obj: null,
      mirror: null
    },

    // Allow us to actually finish the game
    start_time: null,
    got_all_treasure: false,
    freed_all_pigs: false,
    remaining_time: 0,
    pigs_freed: 0,
    pigs_rescued: 0,
    treasure_found: 0,
    countdown_timer: null,

    scene: null,
    camera: null,
    renderer: null,
    light: null,
    sun: null,
    ambient: null,
    clock: null,
    entity_factory: null,
    sound: null,

    light_position: new THREE.Vector3(-30,10,100),
    camera_position: new THREE.Vector3(20,-40,30),
    camera_offset: new THREE.Vector3(0,20,16),

    look_at: new THREE.Vector3(0,0,0),
    player_height: new THREE.Vector3(0,0,7),
    animator: null,

    stats: null,

    current_map: null,
    center_pos: null,
    chunk_cache: {},
    cache_size: 3,

    models: {},
    player_avatar: null,
    camera_speed: 15,
    who_am_i: '',
    min_chest_dist: WURLD_SETTINGS.min_chest_dist,
    chests: {},
    pigs: [],

    pokeball: {
      model: null,
      mini_model: null,
      fire_timer: null
    },

    init: function(){

        // Send in the logos!
        $('.w-logo-banner').animate({bottom: "50%"}, 1000,"easeOutBounce");
        $('.w-start-container').animate({top: "55%"}, 1000,"easeOutBounce",function(){
            WURLD.startUp();
        });
    },

    startUp: function(){

        WURLD.eventEmitter = new EventEmitter();
    
        // Handle keyboard and gamepad input
        WURLD.input = new WurldInput();

        // Very very very basic animation
        WURLD.animator = new WurldAnimate();

		    // We're going to use 2D physics in the ground-plane for collision detection and response
        WURLD.physics = new WurldPhysics(WURLD_SETTINGS.start_location.x,WURLD_SETTINGS.start_location.y,WURLD_SETTINGS.start_rotation);

        // Set up the Three.js scene
        WURLD.scene = new THREE.Scene();
        WURLD.scene.fog = new THREE.Fog(WurldColors.GhostWhite,30,600);

        // Set up the renderer
        WURLD.renderer = new THREE.WebGLRenderer({antialias:WurldSettings.antialias()});
        WURLD.renderer.setSize( $(window).width(), $(window).height() );

        WURLD.renderer.setClearColor(WurldColors.SkyBlue);
        $('.w-main-content').append( WURLD.renderer.domElement );

        // Adjust the Three.js stuff when the window resizes
        $(window).resize(function(){

            var w = $(window).width();
            var h = $(window).height();

            WURLD.renderer.setSize( w, h );

        	WURLD.camera.aspect	= w / h;
        	WURLD.camera.updateProjectionMatrix();
        });

        // The camera
        WURLD.camera = new THREE.PerspectiveCamera( 45, $(window).width() / $(window).height(), 1, 3000 );
        WURLD.camera.position.copy(WURLD.camera_position);
        WURLD.camera.up.set( 0, 0, 1 );
        WURLD.camera.lookAt(WURLD.look_at);

        // Lighting
        WURLD.ambient = new THREE.AmbientLight( WurldColors.SoftWhiteLight );
        WURLD.scene.add(WURLD.ambient);

        WURLD.sun = new THREE.DirectionalLight( WurldColors.White, 1.0 );
        // WURLD.sun.position.copy(WURLD.light_position);
        WURLD.sun.position.addVectors(WURLD_SETTINGS.start_location,WURLD.light_position);
        WURLD.sun.target.position.copy(WURLD_SETTINGS.start_location);

        if(WURLD_SETTINGS.dynamic_shadows && WURLD_SETTINGS.dynamic_shadows.enabled){

          WURLD.renderer.shadowMap.enabled = true;
          WURLD.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

          WURLD.sun.castShadow = true;
          WURLD.sun.shadow.mapSize.width = WURLD_SETTINGS.dynamic_shadows.map_size;
          WURLD.sun.shadow.mapSize.height = WURLD_SETTINGS.dynamic_shadows.map_size;
          WURLD.sun.shadow.camera.far = 200;
          WURLD.sun.shadow.camera.near = 5;
          WURLD.sun.shadow.camera.left = -200;
          WURLD.sun.shadow.camera.right = 200;
          WURLD.sun.shadow.camera.top = 200;
          WURLD.sun.shadow.camera.bottom = -200;
        }

        WURLD.scene.add(WURLD.sun);
        if(WURLD_SETTINGS.debug_lights){
            WURLD.scene.add(new THREE.DirectionalLightHelper(WURLD.sun));
            WURLD.scene.add(new THREE.CameraHelper(WURLD.sun.shadow.camera));
        }

        // Other objects we need
        WURLD.entity_factory = new WurldEntityFactory();
        WURLD.sound = new WurldSound();
        WURLD.texture_loader = new THREE.TextureLoader();

        // Reflective water
        if(WURLD_SETTINGS.pretty_water){
          WURLD.water.normals = WURLD.texture_loader.load( 'img/waternormals.jpg' );
				  WURLD.water.normals.wrapS = WURLD.water.normals.wrapT = THREE.RepeatWrapping;

				  WURLD.water.obj = new THREE.Water( WURLD.renderer, WURLD.camera, WURLD.scene, {
					  textureWidth: 1024,
					  textureHeight: 1024,
					  waterNormals: WURLD.water.normals,
					  alpha: 	0.9,
					  sunDirection: WURLD.sun.position.clone().normalize(),
					  sunColor: WurldColors.White,
					  waterColor: WurldColors.LightBlue,
            distortionScale: 3.0,
            noiseScale:0.25,
            fog:true
				  });

				  WURLD.water.mirror = new THREE.Mesh(
					  new THREE.PlaneBufferGeometry( WURLD.water.parameters.size, WURLD.water.parameters.size),
					  WURLD.water.obj.material
				  );

          WURLD.water.mirror.renderOrder = -1; // Force the water to render after the particles
				  WURLD.water.mirror.add( WURLD.water.obj );
          // WURLD.water.mirror.rotation.x = - Math.PI * 0.5;
				  WURLD.scene.add( WURLD.water.mirror );
        }
        else{
          WURLD.sea_material = new THREE.MeshPhongMaterial( {
              color: WurldColors.Blue,
              shading: THREE.FlatShading,
              opacity: 0.75,
              transparent: true,
              specular:WurldColors.LightBlue,
              shininess:10
          });
        }

        // Particle systems, for treasure, and pig capture
        WURLD.treasure_particles = new WurldParticles('treasure');
        WURLD.capture_particles = new WurldParticles('capture');

        if(WURLD_SETTINGS.show_stats){
            WURLD.init_stats();
        }

        if(WurldSettings.music()) WURLD.sound.startMusic();

        // Do an initial render, but don't enter the refresh loop, to complete the WebGL setup
        requestAnimationFrame(function(){
            WURLD.renderer.render(WURLD.scene,WURLD.camera);
            WURLD.prepare_to_start();
        });
    },

    prepare_to_start: function(){

        // When the chest, player, and pig models have loaded, load the world, then we can start
        $.when(
            WURLD.load_player(),
            WURLD.load_chest(),
            WURLD.load_pig()
        ).done(function(){
            for(var a = 0;a < arguments.length;a++) W_log(arguments[a]);

            $.when(
                WURLD.load_wurld()
            ).done(function(){
                for(var a = 0;a < arguments.length;a++) W_log(arguments[a]);

                WURLD.allow_start();
            })
        });
    },

    allow_start: function(){

        $('.w-start-message').html('p r e s s &nbsp;&nbsp; s o m e t h i n g');

        // Bind stuff to allow us to start
        if(!WURLD.is_started){
            $('.w-start-mask,.w-start-container,.w-logo-banner').bind('click',WURLD.do_start);
            $(document).bind('keyup', WURLD.do_start);

            WURLD.input.start_on_gamepad();
        }
    },

    do_start: function(){

        // Unbind the handlers
        $('.w-start-mask,.w-start-container,.w-logo-banner').unbind('click',WURLD.do_start);
        $(document).unbind('keyup', WURLD.do_start);

        if(!WURLD.is_started){

            // OK, let's really start
            WURLD.is_started = true;
            WURLD.sound.start();

            // Get rid of the logos, start rendering, and fade out the mask overlay
            $('.w-logo-banner').animate({bottom: "100%"}, 1000,"easeInBounce");
            $('.w-start-container').animate({top: "100%"}, 1000,"easeInBounce",function(){

                // A clock for timing deltas for animation
                WURLD.clock = new THREE.Clock;

                // Track game completion, and a timer to update the countdown
                WURLD.start_time = (new Date()).getTime();
                WURLD.countdown_timer = setInterval(function(){WURLD.update_countdown();},250);

                // Finally, really start!
                requestAnimationFrame( WURLD.render );

                $('.w-start-mask').fadeOut(2000);
            });

            // Start listening for input
            WURLD.input.start();

            // Start listening for server initiated actions
            WURLD.socket = new WurldSocket();
            WURLD.socket.listen();

            // Allow the user to turn music on / off
            $('#w-music-btn').click(function(evt){
                var src = $(evt.target).attr('src');

                if(src.indexOf('_on') > 0) WURLD.sound.setMusic('off');
                else WURLD.sound.setMusic('on');
            });
        };
    },

    update_countdown: function(){

        var now = (new Date()).getTime();
        var rem = Math.max(0,WURLD_SETTINGS.max_game_time - (now - WURLD.start_time));
        var min = Math.floor(rem/60000);
        var sec = Math.round((rem%60000)/1000);

        $('#w-countdown').html(((min<10)?'0':'')+min+':'+((sec<10)?'0':'')+sec);

        if(rem <= 0){
          WURLD.check_game_over(true);
        }
    },

    process_oxygen: function(prev_pos,curr_z,delta){

      // If they were above the water, and now they're not, remember the last "shore" position
      // And initialise the oxygen bar
      if(prev_pos.z > 0 && curr_z <= 0){
        WURLD.last_shore_pos = prev_pos.clone();
        WURLD.remaining_oxygen = WURLD_SETTINGS.max_oxygen;
        $('#w-oxygen-bar').show();
        $('#w-oxygen-bar').width(WURLD.remaining_oxygen);
      }

      // If they're in deep water reduce the oxygen bar, otherwise re-breathe
      if(curr_z <= WURLD_SETTINGS.drown_depth){
        WURLD.remaining_oxygen -= WURLD_SETTINGS.oxygen_drain * delta;

        // If they're out of oxygen, warp them back to the shore
        if(WURLD.remaining_oxygen < 0){
          WURLD.player_avatar.position.copy(WURLD.last_shore_pos);
          WURLD.warp_camera_to_player();
          WURLD.physics.setPlayerPosition(WURLD.last_shore_pos.x,WURLD.last_shore_pos.y);

          WURLD.showMessage('YOU_DROWNED',true);
        }
        else{
          $('#w-oxygen-bar').width(WURLD.remaining_oxygen);
        }
      }
      else{
        WURLD.remaining_oxygen = WURLD_SETTINGS.max_oxygen;
        $('#w-oxygen-bar').width(WURLD.remaining_oxygen);
      }

      // If they were in the water and now they're not, hide the oxygen bar
      if(prev_pos.z <= 0 && curr_z > 0){
        $('#w-oxygen-bar').hide();
      }
    },

    render: function() {
        requestAnimationFrame( WURLD.render );

        var delta = WURLD.clock.getDelta();

        if(WURLD.stats) WURLD.stats.begin();

        // Poll for inputs (e.g. from gamepads)
        WURLD.input.poll(delta);

        // Step the physical world
        WURLD.physics.step(delta);

        if(WURLD.player_avatar){

            // Update the position and rotation according to the physics engine
            WURLD.player_avatar.rotation.y = WURLD.physics.getPlayerRotation()

            WURLD.player_avatar.position.setX(WURLD.physics.getPlayerPositionX());
            WURLD.player_avatar.position.setY(WURLD.physics.getPlayerPositionY());
            WURLD.load_necessary_chunks();

            // Make sure the player is on the ground
            var prev_pos = WURLD.player_avatar.position.clone();
            WURLD.put_player_on_ground(delta);

            // Animate their arms and legs
            if(WURLD.is_walking){
                WURLD.animator.updatePerson(WURLD.player_avatar,delta);
            }

            // Move the camera toward the back of the player
            var cam_pos = WURLD.calc_camera_pos();

            var diff = (new THREE.Vector3()).subVectors(cam_pos,WURLD.camera.position);
            if(diff.length() < (WURLD.camera_speed * delta)){
                WURLD.camera.position.copy(cam_pos);
            }
            else{
                diff.normalize();
                WURLD.camera.position.add(diff.multiplyScalar(WURLD.camera_speed * delta));
            }

            var new_look = WURLD.calc_camera_look();
            var look_diff = (new THREE.Vector3()).subVectors(new_look,WURLD.look_at);

            if(look_diff.length() < (WURLD.camera_speed * delta)){
               WURLD.look_at.copy(new_look);
            }
            else{
                look_diff.normalize();
                WURLD.look_at.add(look_diff.multiplyScalar(WURLD.camera_speed * delta));
            }

            WURLD.camera.lookAt(WURLD.look_at);

            // Update the sun so that the shadows (if they're enabled) follow the player around
            WURLD.sun.position.addVectors(WURLD.player_avatar.position,WURLD.light_position);
            WURLD.sun.target.position.copy(WURLD.player_avatar.position);
            WURLD.sun.target.updateMatrixWorld();

            // Align the compass with the player
            $('#w-compass-icon').css('transform','rotate('+(WURLD.player_avatar.rotation.y * (180/Math.PI))+'deg)');
        }

        // Move the pokeball
        if(WURLD.pokeball.model && WURLD.pokeball.model.visible){
          WURLD.put_object_on_ground(WURLD.pokeball.model);
          WURLD.pokeball.model.position.z += WURLD_SETTINGS.ball_size;

          var prev_x = WURLD.pokeball.model.position.x;
          var prev_y = WURLD.pokeball.model.position.y;

          // Move the ball according to the physics engine
          if(WURLD.pokeball.body){
            WURLD.pokeball.model.position.setX(WURLD.pokeball.body.position.x);
            WURLD.pokeball.model.position.setY(-WURLD.pokeball.body.position.y);
          }

          var dist_x = WURLD.pokeball.model.position.x - prev_x;
          var dist_y = WURLD.pokeball.model.position.y - prev_y;

          // Make the ball look as if it's rolling
          var ang = Math.sqrt((dist_x * dist_x) + (dist_y * dist_y)) / WURLD_SETTINGS.ball_size;
          if(ang > 0){
            var vec = new THREE.Vector3(dist_x,dist_y,0);
            vec.normalize();
            vec.cross(new THREE.Vector3(0,0,-1));

            var rotWorldMatrix = new THREE.Matrix4();
            rotWorldMatrix.makeRotationAxis(vec,ang);
            rotWorldMatrix.multiply(WURLD.pokeball.model.matrix);
            WURLD.pokeball.model.matrix = rotWorldMatrix;
            WURLD.pokeball.model.rotation.setFromRotationMatrix(WURLD.pokeball.model.matrix);
          }
        }

        // Animate the pigs
        var to_destroy = [];
        var pokeball_pos = null;
        if(WURLD.pokeball.model && WURLD.pokeball.model.visible){
          pokeball_pos = WURLD.pokeball.model.position;
        }
        for(p in WURLD.pigs){
          var pig = WURLD.pigs[p];
          WURLD.animator.updatePig(pig,delta);
          WURLD.physics.transferPositionTo(pig);
          WURLD.physics.moveInDirection(pig.body,pig.rotation.y,WURLD_SETTINGS.pig_speed,delta);
          if(!WURLD.put_object_on_ground(pig)) to_destroy.push(p);
          else if(pig.position.z < -5) to_destroy.push(p);

          // Check if we're within a certain distance of a pokeball
          // And we're not in a pen
          if(!pig.pen_locator && pokeball_pos){
              var dist = pig.position.distanceTo(pokeball_pos);
              if(dist <= WURLD_SETTINGS.capture_distance){
                WURLD.sound.pokeball('caught');
                WURLD.hide_pokeball();
                to_destroy.push(p);
                WURLD.pigs_rescued++

                // Particle effect for pig capture
                WURLD.capture_particles.show(pig);
                setTimeout(function(){WURLD.capture_particles.hide();},WURLD_SETTINGS.banner_timeout);
                WURLD.showMessage('CAPTURED_A_PIG',false,true);

                // Don't capture any other pigs
                pokeball_pos = null;
              }
          }
        }
        var i;
        while(i = to_destroy.pop()) WURLD.destroy_pig(i);

	      // Keep the camera above the ground and the water
        WURLD.keep_camera_above_ground();

        // Update everything else that the animator is tracking
        WURLD.animator.update(delta);

        // Render the world
        if(WURLD_SETTINGS.pretty_water){

          WURLD.water.mirror.position.setX(WURLD.player_avatar.position.x);
          WURLD.water.mirror.position.setY(WURLD.player_avatar.position.y);

          WURLD.water.obj.material.uniforms.time.value += delta * 0.25;
          WURLD.water.obj.matrixNeedsUpdate = true;
          WURLD.water.obj.updateTextureMatrix();
          WURLD.water.obj.render();
        }
        WURLD.treasure_particles.render(delta);
        WURLD.capture_particles.render(delta);
        WURLD.renderer.render(WURLD.scene,WURLD.camera);

        if(WURLD.stats) WURLD.stats.end();
    },

    init_stats: function(){

        WURLD.stats = new Stats();
        WURLD.stats.setMode(0); // 0: fps, 1: ms

        $('body').append( WURLD.stats.domElement );
    },

    calc_camera_pos: function(){

        var cam_pos = (new THREE.Vector3()).copy(WURLD.camera_offset);
        cam_pos.applyAxisAngle(new THREE.Vector3(0,0,1),WURLD.player_avatar.rotation.y);
        cam_pos.add(WURLD.player_avatar.position);

        return cam_pos;
    },

    calc_camera_look: function(){
        return (new THREE.Vector3()).addVectors(WURLD.player_height,WURLD.player_avatar.position);
    },

    create_person: function(obj){

        var new_player = WURLD.models['person_model'].clone();
        var new_material = WURLD.models['person_model'].children[0].material.clone();

        if(obj.skin_name){
            new_material.map = WURLD.texture_loader.load('img/'+obj.skin_name+'_skin.png',function(){
                new_material.needsUpdate = true;
            });
        }

        for(var i = 0;i < new_player.children.length;i++){
	        new_player.children[i].material = new_material;
        }

        new_player.rotation.x = Math.PI/2;

        if(obj.skin_name){
            WURLD.set_gamer_tag(new_player,'',obj.skin_name);
        }
        new_player.position.set(0,0,-1000);
        WURLD.scene.add( new_player );

        return new_player;
    },

    set_gamer_tag: function(person,old_name,new_name){

        if(old_name != new_name){

            W_log('Setting gamer tag for change from "'+old_name+'" to "' + new_name+'".');

            // First, remove any children of type Sprite, that'll be the existing gamertag
            for(var i = 0;i < person.children.length;i++){
                if(person.children[i].type == 'Sprite'){
	                W_log('Removing child: ',person.children[i]);
	                person.remove(person.children[i]); // TODO: Not leak memory here!
	                break;
                }
            }

            if(new_name){
                var name = new_name.toLowerCase().replace(/_/,' ');

                var spritey = WURLD.make_text_sprite(name);
    	        spritey.position.set(0,9,0);
    	        person.add( spritey );
            }
        }
    },

    to_id: function(name){
        var new_name = name.toLowerCase().replace(/@oracle.com/,'');
        return new_name.replace(/\./,'-');
    },

    set_skin: function(person,skin_name){

        var src = skin_name;
        if(src && src.indexOf('img/') < 0) src = 'img/'+src;
        if(src && src.indexOf('_skin.png') < 0) src = src+'_skin.png';

        var img = (
            person &&
            person.children[0] &&
            person.children[0].material &&
            person.children[0].material.map &&
            person.children[0].material.map.image
        )?person.children[0].material.map.image:null;
        var curr_src = (img && img.src)?img.src:(img && img.currentSrc)?img.currentSrc:null;

        if(curr_src && curr_src.indexOf(src) < 0){
            W_log('Updating skin to',src);
            var old_name = WURLD_SETTINGS.skin_name;
            WURLD_SETTINGS.skin_name = skin_name;
            var new_name = skin_name.replace(/_/,' ');
            person.children[0].material.map = WURLD.texture_loader.load(src, function(){
	            person.children[0].material.needsUpdate = true;
              WURLD.set_gamer_tag(WURLD.player_avatar,old_name,new_name);
            });
        }

        return curr_src;
    },

    curr_skin_id: function(){

      for(var i = 0;i < WURLD_SKINS.length;i++){
        if(WURLD_SKINS[i] == WURLD_SETTINGS.skin_name) return i;
      }
      return -1;
    },

    next_skin: function(){
      var curr = WURLD.curr_skin_id();
      if(curr >= 0){
        curr++;
        if(curr >= WURLD_SKINS.length) curr = 0;
        WURLD.set_skin(WURLD.player_avatar,WURLD_SKINS[curr]);
      }
    },

    prev_skin: function(){
      var curr = WURLD.curr_skin_id();
      if(curr >= 0){
        curr--;
        if(curr < 0) curr = WURLD_SKINS.length - 1;
        WURLD.set_skin(WURLD.player_avatar,WURLD_SKINS[curr]);
      }
    },

    post_back: function(obj,func){

    	$.ajax({
			url: '/POST',
			method:'POST',
			data: JSON.stringify(obj),
			success:function(data){
           		// TODO: Something with the return values?
               	if(func){
               		func(data);
               	}
           	},
			dataType:'json',
			contentType: 'application/json',
           	processData:false
        });
    },

    load_chunk: function(map_id,i,j,func) {

        if(typeof WURLD.chunk_cache[i] == 'undefined'){
            WURLD.chunk_cache[i] = {};
        }

        if(
            typeof WURLD.chunk_cache[i][j] == 'undefined'||
            (WURLD.chunk_cache[i][j].mesh == null && !WURLD.chunk_cache[i][j].to_load)
        ){
            W_log('Loading chunk '+i+','+j);

            WURLD.chunk_cache[i][j] = {
                to_load:true
            };

            WURLD.post_back({op:'get_chunk',map_id:1,i:i,j:j},function(data){

                var geometry = new THREE.PlaneGeometry(
                    data.chunk_size,
                    data.chunk_size,
                    data.chunk_segments,
                    data.chunk_segments
                );

                // Look for low lying terrain
                var need_water = false;
                for(var v = 0; v < data.vertex_count; v++) {
                    geometry.vertices[v].z = data.vertices[v];
                    if(data.vertices[v] < 0) need_water = true;
                }

                Math.seedrandom(data.chunk_id);
                W_log('Seeding random with '+data.chunk_id);
                for(var f = 0;f < geometry.faces.length;f++){
                    geometry.faces[f].color.setHex(WurldColors.computeColor(geometry,f));
                }

                geometry.computeFaceNormals();
                geometry.computeVertexNormals();

                var material = new THREE.MeshPhongMaterial( {
                    color: 0xffffff ,
                    shading: THREE.FlatShading ,
                    vertexColors: THREE.FaceColors
                    ,side: THREE.DoubleSide
                });

                var terrainMesh = new THREE.Mesh( geometry, material );
                terrainMesh.position.x = data.x;
                terrainMesh.position.y = data.y;
                terrainMesh.receiveShadow = true;
                WURLD.scene.add( terrainMesh );

                WURLD.chunk_cache[i][j].mesh = terrainMesh;
                WURLD.chunk_cache[i][j].to_load = false;
                if(data.entities) {
                  WURLD.chunk_cache[i][j].entities = WURLD.entity_factory.createEntities(terrainMesh,data.entities);
                }

                // Create some water is any of the terrain is below sea level
                if(!WURLD_SETTINGS.pretty_water && need_water){

                    var sea_geo = new THREE.PlaneBufferGeometry(
                        data.chunk_size,
                        data.chunk_size
                    );

                    var sea_mesh = new THREE.Mesh( sea_geo, WURLD.sea_material);
                    sea_mesh.renderOrder = -1;
                    terrainMesh.add( sea_mesh );
                }

                // Maybe we need to create a pen for pigs on this chunk?
                for(var p in WURLD.current_map.pig_pens){
                  var pen = WURLD.current_map.pig_pens[p];
                  var x = terrainMesh.position.x;
                  var y = terrainMesh.position.y;
                  var sz = data.chunk_size * 0.5;
                  if(
                    pen.world_position.x > x - sz &&
                    pen.world_position.x < x + sz &&
                    pen.world_position.y > y - sz &&
                    pen.world_position.y < y + sz
                  ){
                    WURLD.current_map.pig_pens[p].obj = WURLD.entity_factory.createPigPen(terrainMesh,pen);
                  }
                }

                if(func) func();
            });
        }
        else{
            if(func) func();
        }
    },

    deferred_chunk_load: function(ni,nj){

      setTimeout(function(){
        var li = ni,lj = nj;
        WURLD.load_chunk(WURLD.current_map.id,li,lj);
      },100);
    },

    load_necessary_chunks: function(){

        if(WURLD.current_map){

            // Work out where the player or the camera is
            var pos = (WURLD.player_avatar)?WURLD.player_avatar.position:WURLD.camera.position;
            var i = Math.round(pos.x / WURLD.current_map.chunk_size);
            var j = Math.round(pos.y / WURLD.current_map.chunk_size);

            if(WURLD.center_pos == null || i != WURLD.center_pos.i || j != WURLD.center_pos.j){

                WURLD.center_pos = {i:i,j:j};

                for(var ni = WURLD.center_pos.i - WURLD.cache_size;ni <= WURLD.center_pos.i + WURLD.cache_size;ni++){
                    for(var nj = WURLD.center_pos.j - WURLD.cache_size;nj <= WURLD.center_pos.j + WURLD.cache_size;nj++){

                      // Have we already got this chunk?
                      // Then show it, otherwise, load it
                      if(
                        typeof WURLD.chunk_cache[ni] != 'undefined' &&
                        typeof WURLD.chunk_cache[ni][nj] != 'undefined' &&
                        WURLD.chunk_cache[ni][nj].mesh != null
                      ){
                        W_log('Showing chunk '+ni+','+nj);
                        WURLD.chunk_cache[ni][nj].mesh.visible = true;
                      }
                      else{
                        WURLD.deferred_chunk_load(ni,nj);
                      }
                    }
                }

                // Remove chunks we no longer care about
                for(var di in WURLD.chunk_cache){
                    for(var dj in WURLD.chunk_cache[di]){
                        if(
                            parseInt(di) < WURLD.center_pos.i - WURLD.cache_size ||
                            parseInt(di) > WURLD.center_pos.i + WURLD.cache_size ||
                            parseInt(dj) < WURLD.center_pos.j - WURLD.cache_size ||
                            parseInt(dj) > WURLD.center_pos.j + WURLD.cache_size
                        ){
                            // New version just hides landscape chunks, rather than destroying them
                            W_log('Hiding chunk '+di+','+dj);
                            WURLD.chunk_cache[di][dj].mesh.visible = false;

                            /*
                            var mesh = WURLD.chunk_cache[di][dj].mesh;

                            WURLD.entity_factory.destroyEntities(mesh,WURLD.chunk_cache[di][dj].entities);
                            WURLD.chunk_cache[di][dj].entities = null;

                            if(mesh){
                                W_log('Removing mesh '+di+','+dj);
                                WURLD.scene.remove(mesh);
                                mesh.geometry.dispose();
                                mesh = null;
                                WURLD.chunk_cache[di][dj].mesh = null;
                                WURLD.chunk_cache[di][dj].to_load = false;
                            }
                            */
                        }
                    }
                }
            }
        }
    },

    put_player_on_ground: function(dt){

        var prev_pos = WURLD.player_avatar.position.clone();
        var prev_z = prev_pos.z;
        WURLD.put_object_on_ground(WURLD.player_avatar);

        // Are we jumping?
        if(WURLD.jump_speed != 0){

          var ground_z = WURLD.player_avatar.position.z;
          var new_z = prev_z - WURLD.jump_offset;
          WURLD.jump_offset += WURLD.jump_speed * dt;
          new_z += WURLD.jump_offset;

          WURLD.player_avatar.position.setZ(Math.max(new_z,ground_z));

          WURLD.jump_speed -= WURLD_SETTINGS.gravity * dt;

          if(new_z < ground_z){
            WURLD.jump_speed = 0;
            WURLD.jump_offset = 0;
          }
        }

        // Make a splash if they enter/leave the water
        var curr_z = WURLD.player_avatar.position.z;
        if((prev_z > 0 && curr_z <= 0)||(prev_z <= 0 && curr_z > 0)){
            WURLD.sound.splash();
        }

        // Make them drown, or not
        WURLD.process_oxygen(prev_pos,curr_z,dt);

        /*
        // TODO: Fix this glitchiness, that I think is cause by the rays missing the edge of a landscape chunk
        var diff = prev_z - WURLD.player_avatar.position.z;
        if(Math.abs(diff) > 5){
          console.warn('Large change in player height detected',diff);
          // WURLD.player_avatar.position.setZ(prev_z);
        }
        */
    },

    put_object_on_ground: function(p){

        var intersected = false;
        if(p){
            var top = 1000;
            var start = (new THREE.Vector3()).copy(p.position);
            start.setZ(top);

            var ray = new THREE.Raycaster(start,new THREE.Vector3( 0, 0, -1 ));
            var intersects = ray.intersectObjects( WURLD.scene.children );
            for(var i = 0;i<intersects.length;i++) {
                if(intersects[i].object.geometry.type == 'PlaneGeometry'){
                    p.position.setZ(top - intersects[ i ].distance);
                    intersected = true;
                    break;
                }
            }
        }

        return intersected;
    },

    keep_camera_above_ground: function(){

        var top = 1000;
        var start = (new THREE.Vector3()).copy(WURLD.camera.position);
        start.setZ(top);

        var ray = new THREE.Raycaster(start,new THREE.Vector3( 0, 0, -1 ));
        var intersects = ray.intersectObjects( WURLD.scene.children );
        for(var i = 0;i<intersects.length;i++) {
            if(intersects[i].object.geometry.type == 'PlaneGeometry'){
                var z = Math.max((top - intersects[ i ].distance),0) + 3; // Can't go below sea level
                if(z > WURLD.camera.position.z){
                    WURLD.camera.position.setZ(z);
                }
                break;
            }
        }
    },

    warp_camera_to_player: function(){

      // Warp the camera to near the player's position
      WURLD.camera.position.copy(WURLD.calc_camera_pos());
      WURLD.look_at.copy(WURLD.calc_camera_look());
      WURLD.camera.lookAt(WURLD.look_at);
    },

    load_chest: function(){

        var deferred = $.Deferred();

        // Load the chest mesh, from the static files directory
        var loader = new THREE.ObjectLoader();
        loader.setTexturePath('tex/');
        loader.load(
            '3ds/chest_model.json',
            function ( obj ) {

                for(var i = 0;i < obj.children.length;i++){
                    obj.children[i].castShadow = true;
                    // obj.children[i].receiveShadow = true;
                    obj.children[i].material.side = THREE.FrontSide;
                }

                WURLD.models['chest_model'] = obj;

                deferred.resolve('Loaded chest');
            }
        );

        return deferred.promise();
    },

    destroy_pig: function(idx){

      var pig = WURLD.pigs[idx];

      // Don't cull pigs associated with a pen
      // When they're freed, we remove their pen_locator
      if(pig.pen_locator) return;

      WURLD.sound.squeal();
      WURLD.scene.remove(pig);

      // TODO: Fix the memory leaks that happen because of (the lack of) this
      /*
      // Not sure about this method of removing an Object3D!
      WURLD.entity_factory.destroyChildren(pig);
      if(pig.material) pig.material.dispose();
      if(pig.geometry) pig.geometry.dispose();
      */

      WURLD.physics.destroyBody(pig.body);

      WURLD.pigs[idx] = null;
      WURLD.pigs.splice(idx,1);
      pig = null;
    },

    spawn_pig_at: function(pos,rot,loc){

      W_log('Creating a pig');

      var new_pig = WURLD.models['pig_model'].clone();
      var new_material = WURLD.models['pig_model'].children[0].material.clone();

      for(var i = 0;i < new_pig.children.length;i++){
        new_pig.children[i].material = new_material;
      }

      new_pig.scale.set(0.25,0.25,0.25);

      new_pig.pen_locator = loc||false;
      new_pig.position.copy(pos);

      new_pig.rotation.x = Math.PI/2;
      new_pig.rotation.y = rot;

      // Create something to approximate physical collisions
      new_pig.body = WURLD.physics.createMobBody(new_pig.position.x, new_pig.position.y, 3,new_pig.rotation.y,'Pig_'+(WURLD.pigs.length+1));
      WURLD.scene.add( new_pig );
      if(!new_pig.pen_locator) WURLD.sound.snort();

      WURLD.pigs.push(new_pig);
    },

    create_pig: function(){

      var pos = WURLD.player_avatar.position.clone();
      var rot = WURLD.player_avatar.rotation.y - Math.PI * 0.5;

      var offs = new THREE.Vector3(10,-5,0);
      offs.applyAxisAngle(new THREE.Vector3(0,0,1),rot);
      pos.add(offs);

        // RXIE: notify pigs spawned
        WURLD.socket.emit('pig_spawned');


      WURLD.spawn_pig_at(pos,rot);
    },

    load_pig: function(){

        var deferred = $.Deferred();

        // Load the pig mesh, from the static files directory
        var loader = new THREE.ObjectLoader();
        loader.setTexturePath('tex/');
        loader.load(
            '3ds/pig_model.json',
            function ( obj ) {

                for(var i = 0;i < obj.children.length;i++){
                    obj.children[i].castShadow = true;
                    // obj.children[i].receiveShadow = true;
                    obj.children[i].material.side = THREE.FrontSide;
                }

                WURLD.models['pig_model'] = obj;

                deferred.resolve('Loaded a pig');
            }
        );

        return deferred.promise();
    },

    jump_offset: 0,
    jump_speed: 0,

    do_jump: function(){

      // Can only jump if underwater, or on ground
      if(WURLD.player_avatar.position.z < WURLD_SETTINGS.drown_depth || WURLD.jump_offset == 0){
        WURLD.jump_speed = WURLD_SETTINGS.jump_speed;

        // RXIE: notify jump_up
        WURLD.socket.emit('jump_up');

      }
    },

    load_player: function(){

        var deferred = $.Deferred();

        // Load the player mesh, from the static files directory
        var loader = new THREE.ObjectLoader();
        loader.setTexturePath('tex/');
        loader.load(
            '3ds/player_model.json',
            function ( obj ) {

                for(var i = 0;i < obj.children.length;i++){
                    obj.children[i].castShadow = true;
                    obj.children[i].receiveShadow = true;
                    obj.children[i].material.side = THREE.FrontSide;
                }

                WURLD.models['person_model'] = obj;

	            WURLD.player_avatar = WURLD.create_person({
	            	skin_name:WurldSettings.skin_name()
	            });

	            // Put the player at their starting position
	            WURLD.player_avatar.position.copy(WurldSettings.start_location());
	            WURLD.player_avatar.rotation.y = WurldSettings.start_rotation();

	            WURLD.warp_camera_to_player();

              WURLD.scene.add( WURLD.player_avatar );

              // Create the full sized, freely moving, pokeball
              var geometry = new THREE.SphereBufferGeometry( WURLD_SETTINGS.ball_size, 8,8);
              var material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                shading: THREE.FlatShading,
                side: THREE.DoubleSide,
                specular: 0x333333,
                shininess:50
              });
              material.map = WURLD.texture_loader.load('img/pokeball_texture.png', function(){
                material.needsUpdate = true;
              });

              WURLD.pokeball.model = new THREE.Mesh(geometry,material);
              WURLD.pokeball.model.castShadow = true;

              WURLD.pokeball.model.position.copy(WURLD.player_avatar.position);
              WURLD.scene.add(WURLD.pokeball.model);

              // Create the small version of the pokeball that the player holds in their hand
              var mini_geometry = new THREE.SphereBufferGeometry( 0.5);
              WURLD.pokeball.mini_model = new THREE.Mesh(mini_geometry,material);
              WURLD.pokeball.mini_model.castShadow = true;
              WURLD.pokeball.mini_model.position.set(0,-2,0);
              WURLD.pokeball.mini_model.rotation.y = Math.PI;
              WURLD.player_avatar.children[2].add(WURLD.pokeball.mini_model); // Child 2 is the player's right arm, see awo-animate.js

              // Hide the big ball, show the mini-version, initially
              WURLD.pokeball.model.visible = false;
              WURLD.pokeball.mini_model.visible = true;

              // Continue on with loading
              deferred.resolve('Loaded player');
            }
        );

        return deferred.promise();
    },

    load_wurld: function(){

        var deferred = $.Deferred();

        WURLD.post_back({op:'get_map',map_id:1},function(data){

            W_log('Got map meta data');
            WURLD.current_map = data;

            var load_delay = setInterval(function(){
                var found = false;
                var tot = 0;
                var todo = 0;
                for(var i in WURLD.chunk_cache){
                    if(WURLD.chunk_cache[i] !== undefined){
                        for(var j in WURLD.chunk_cache[i]){
                            if(WURLD.chunk_cache[i][j] !== undefined){
                                W_log('chunk_cache['+i+']['+j+']='+WURLD.chunk_cache[i][j].to_load);
                                tot++;
                                if(WURLD.chunk_cache[i][j].to_load) {
                                  todo++;
                                  found = true;
                                }
                            }
                        }
                    }
                }
                if(!found) {
                    clearInterval(load_delay);
                    deferred.resolve('Loaded wurld');
                    $('#w-load-progress').hide();
                }
                else if(tot){
                  var pct = 100 * ((tot - todo) / tot);
                  $('#w-load-progress').css({
                    width:pct+'%',
                    left:((100 - pct)/2)+'%'
                  });
                }
            },100);

            WURLD.load_necessary_chunks();
        });

        return deferred.promise();
    },

    hide_pokeball: function(){
      if(WURLD.pokeball.fire_timer){
        clearTimeout(WURLD.pokeball.fire_timer);
        WURLD.pokeball.fire_timer = null;
      }

      // Show the small ball, hide the big one
      WURLD.pokeball.model.visible = false;
      WURLD.pokeball.mini_model.visible = true;

      // Destroy the physical body, so we dont' try to move it around
      WURLD.physics.destroyBody(WURLD.pokeball.body);
      WURLD.pokeball.body = null;
    },

    fire_pokeball: function(){

      if(WURLD.pokeball.fire_timer == null){

        // Hide the small ball, show the big one
        WURLD.pokeball.model.visible = true;
        WURLD.pokeball.mini_model.visible = false;

        // Position the big ball just in front of the player
        var pos = WURLD.player_avatar.position.clone();
        var rot = WURLD.player_avatar.rotation.y;

        var offs = new THREE.Vector3(-1,-(WURLD_SETTINGS.ball_size + 1),0);
        offs.applyAxisAngle(new THREE.Vector3(0,0,1),rot);
        pos.add(offs);

        WURLD.pokeball.model.position.copy(pos);

        // Create a physical body for the big one, making sure we destroy any existing one first
        WURLD.physics.destroyBody(WURLD.pokeball.body);

        WURLD.pokeball.body = WURLD.physics.createMoveableCircleBody(
          WURLD.pokeball.model.position.x,
          -WURLD.pokeball.model.position.y,
          WURLD_SETTINGS.ball_size
        );

        // Fire the ball forwards
        Matter.Body.setVelocity(WURLD.pokeball.body,{x:offs.x * WURLD_SETTINGS.ball_speed,y:-offs.y * WURLD_SETTINGS.ball_speed});
        WURLD.sound.pokeball('launch');

        // Tell robot Pokeball is fired
        WURLD.socket.emit('ball_thrown');

        // Set a timer so we can only fire the ball every so often
        WURLD.pokeball.fire_timer = setTimeout(function(){
          WURLD.sound.pokeball('fail');
          WURLD.hide_pokeball();
        },WURLD_SETTINGS.ball_duration);
      }
    },

    try_open_chest: function(){

      // Can't do this if time's run out
      if(WURLD.countdown_timer == null) return;

      var pos = WURLD.player_avatar.position.clone();

      // See if there's a chest nearby
      for(var ch in WURLD.chests){
        var chest = WURLD.chests[ch];
        if(chest){
          var diff = (new THREE.Vector3()).subVectors(pos,chest.getWorldPosition());
          if(diff.length() < WURLD.min_chest_dist){
            WURLD.hit_chest(chest.osn_conversation);
            return;
          }
        }
      }
    },

    try_free_pigs: function(){

      // Can't do this if time's run out
      if(WURLD.countdown_timer == null) return;

      var pos = WURLD.player_avatar.position.clone();

      // See if we're near a pig pen
      for(var p in WURLD.current_map.pig_pens){
          var pen = WURLD.current_map.pig_pens[p];
          if(
            typeof pen.is_hit == 'undefined' &&
            typeof pen.obj != 'undefined' &&
            pen.obj &&
            pos.x > pen.world_position.x - ((pen.size.x * 0.5) + WURLD.min_chest_dist) &&
            pos.x < pen.world_position.x + ((pen.size.x * 0.5) + WURLD.min_chest_dist) &&
            pos.y > pen.world_position.y - ((pen.size.y * 0.5) + WURLD.min_chest_dist) &&
            pos.y < pen.world_position.y + ((pen.size.y * 0.5) + WURLD.min_chest_dist)
          ){
            WURLD.hit_pen(p);
            return;
          }
      }
    },

    hit_pen: function(p){
      var pen = WURLD.current_map.pig_pens[p];
      pen.is_hit = true;

      WURLD.animator.slideZ(
        pen.obj, // The object to animate
        -7, // Distance to move in Z
        1,  // Time to take
        function(){ // Function to execute when done
          // Remove the physical bodies
          for(var b in pen.obj.physics_bodies){
            WURLD.physics.destroyBody(pen.obj.physics_bodies[b]);
          }

          // Remove the pen_locator from the pigs
          var delay = 0;
          for(var g in WURLD.pigs){
            if(WURLD.pigs[g].pen_locator == pen.obj.pen_locator){
              WURLD.pigs[g].pen_locator = false;
              setTimeout(function(){WURLD.sound.snort();},delay);
              delay += 1000;
            }
          }

          // RXIE: notify pigs freed
          WURLD.socket.emit('pigs_freed');

          // Hide the fence
          pen.obj.visible = false;
          pen.obj = null;

          // Calculate the amount of pigs in total, and those freed
          var capt = 0,free = 0;
          for(var p = 0;p < WURLD.current_map.pig_pens.length;p++){
            var chk = WURLD.current_map.pig_pens[p];
            if(typeof chk.obj == 'undefined' || chk.obj !== null) capt += chk.pig_count;
            else free += chk.pig_count;
          }
          WURLD.pigs_freed = free;
          if(capt > 0){
            var pct = Math.round((free * 100) / (free + capt));
            WURLD.showMessage(WurldSettings.message('PCT_PIGS_FREE',pct));
          }
          else {
            WURLD.showMessage('ALL_PIGS_FREE');
            WURLD.freed_all_pigs = true;
            setTimeout(function(){WURLD.check_game_over();},WURLD_SETTINGS.banner_timeout);
          }
        }
      );
    },

    hit_chest: function(chest_id){

      W_log('Hit a chest '+chest_id);
      var chest = WURLD.chests[chest_id];

		  if(chest.isOpen){
        if(WURLD.animator.animateChest(
          chest, // Object
          Math.PI / -4, // End angle
          0, // Start angle
          0.25, // Time
          function(){chest.isOpen = false;} // On completion
        )) WURLD.sound.closeChest();
		  }
		  else{
        	if(WURLD.animator.animateChest( // See above
            chest,
            0,
            Math.PI / -4,
            0.25,
            function(){
			        chest.isOpen = true;

              if(typeof chest.treasureGone == 'undefined'){
                WURLD.sound.fanfare();

                // Fire off some particles for a bit
                WURLD.treasure_particles.show(chest);
                setTimeout(function(){WURLD.treasure_particles.hide();},WURLD_SETTINGS.banner_timeout);

                // RXIE: emit event in browser for client side robot control
                WURLD.eventEmitter.emitEvent("chest_opened");
                // RXIE: emit event via socket for server side robot control
                WURLD.socket.emit('chest_opened');
                console.log("emit: chest_opened");

                chest.treasureGone = true;
                var got = 0;
                for(c in WURLD.chests){
                  if(WURLD.chests[c].treasureGone) got++;
                }
                WURLD.treasure_found = got;
                if(got >= WURLD_SETTINGS.total_chests) {
                  WURLD.showMessage('GOT_ALL_TREASURE',false,true);
                  WURLD.got_all_treasure = true;
                  setTimeout(function(){WURLD.check_game_over();},WURLD_SETTINGS.banner_timeout);
                }
                else WURLD.showMessage(WurldSettings.message('FOUND_TREASURE',got),false,true);
              }
            }
         )) WURLD.sound.openChest();
		  }
	  },

    make_text_sprite: function( message, parameters ){

    	var canvas = document.createElement('canvas');
	    $(canvas).attr('id','2d-canvas');
	    $(canvas).attr('width','512');
	    $(canvas).attr('height','32');
	    $(canvas).css({zIndex:-1000,position:'fixed',top:0,left:0,width:'256px',height:'32px'});
	    $('body').append(canvas);
	    var ctx = canvas.getContext('2d');

	    ctx.fillStyle = 'rgba(0,0,0,0)';
    	ctx.fillRect(0,0,512,32);

	    ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
    	ctx.textAlign = "center";
    	ctx.textBaseline = "bottom";
	    ctx.font = "28px Courier"
	    ctx.fillText( message, 256,32);

	    var texture = new THREE.Texture(canvas);
	    texture.needsUpdate = true;
	    var spriteMaterial = new THREE.SpriteMaterial({ map: texture});
	    var sprite = new THREE.Sprite( spriteMaterial );
    	sprite.scale.set(16,1,1);

    	$(canvas).remove();

	    return sprite;
    },

    message_timeout: null,

    showMessage: function(key,err,mute){
      if(WURLD.message_timeout) clearTimeout(WURLD.message_timeout);

      var msg = WurldSettings.message(key);
      $('#w-message-banner').text(msg);

      if(!mute){
        if(err) WURLD.sound.error();
        else WURLD.sound.ok();
      }

      $('#w-message-banner').fadeIn();
      WURLD.message_timeout = setTimeout(function(){
        $('#w-message-banner').fadeOut();
      },WURLD_SETTINGS.banner_timeout);
    },

    check_game_over: function(out_of_time){

      if(out_of_time){

        // Stop counting down
        clearInterval(WURLD.countdown_timer);
        WURLD.countdown_timer = null;

        // We know we have no time left
        WURLD.remaining_time = 0;

        // Display the message, and save the score
        var obj = WurldScores.calculate();
        WURLD.showMessage(WurldSettings.message('OUT_OF_TIME',obj.total_score),true);
        setTimeout(function(){
          WurldScores.save(obj);
        },WURLD_SETTINGS.banner_timeout);
      }
      else if(WURLD.got_all_treasure && WURLD.freed_all_pigs){

        // Stop counting down
        clearInterval(WURLD.countdown_timer);
        WURLD.countdown_timer = null;

        // Work out the remaining time, in seconds
        var now = (new Date()).getTime();
        WURLD.remaining_time = Math.round(Math.max(0,WURLD_SETTINGS.max_game_time - (now - WURLD.start_time)) / 1000);

        // Show the succes message and save the score
        var obj = WurldScores.calculate();
        WURLD.showMessage(WurldSettings.message('BEAT_GAME',obj.total_score));
        setTimeout(function(){
          WurldScores.save(obj);
        },WURLD_SETTINGS.banner_timeout);
      }
    }
};

// WURLD.prototype = Object.clone(EventEmitter.prototype);
// extend(WURLD, EventEmitter);


