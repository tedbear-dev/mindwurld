var WurldSound = function(){

    this.path = 'sfx/';

    this.bgMusic = new Howl({urls:[this.path+'almost-a-love-story.ogg',this.path+'almost-a-love-story.mp3'],loop:true});

    this.startSfx = new Howl({urls:[this.path+'drawer-opening-sfx.wav']});
    this.okSfx = new Howl({urls:[this.path+'ok-sfx.wav']});
    this.errorSfx = new Howl({urls:[this.path+'error-sfx.wav']});
    this.openChestSfx = new Howl({urls:[this.path+'open_chest.wav']});
    this.closeChestSfx = new Howl({urls:[this.path+'close_chest.wav']});
    this.waterSplashSfx = new Howl({urls:[this.path+'water_splash.wav']});
    this.pigSnortsSfx = new Howl({urls:[this.path+'pig-multiple-snorts.wav']});
    this.pigSquealSfx = new Howl({urls:[this.path+'pig-grunt-and-squeal.wav']});
    this.fanfareSfx = new Howl({urls:[this.path+'fanfare-short-edit.wav']});
    this.pokeballSfx = {
      fail: new Howl({urls:[this.path+'fail_pokeball.wav']}),
      launch: new Howl({urls:[this.path+'launch_pokeball.wav']}),
      caught: new Howl({urls:[this.path+'catch_pokemon.wav']})
    }

    this.footstepsSfx = new Howl({
        urls:[this.path+'footsteps.wav'],
        loop:true,
        volume:0.4
    });
    this.footsteps_is_playing = false;
};

WurldSound.prototype.startMusic = function(){
    this.bgMusic.play();
    $('#w-music-btn').attr('src',$('#w-music-btn').attr('src').replace(/_off/,'_on'));
};
WurldSound.prototype.stopMusic = function(){
    this.bgMusic.pause();
    $('#w-music-btn').attr('src',$('#w-music-btn').attr('src').replace(/_on/,'_off'));
};
WurldSound.prototype.setMusic = function(mode){
    if(mode.toUpperCase() == 'ON') this.startMusic();
    else this.stopMusic();
};
WurldSound.prototype.toggleMusic = function(){
    if($('#w-music-btn').attr('src').indexOf('_on') > 0) this.stopMusic();
    else this.startMusic();
};

WurldSound.prototype.start = function(){this.startSfx.play();};
WurldSound.prototype.ok = function(){this.okSfx.play();};
WurldSound.prototype.error = function(){this.errorSfx.play();};
WurldSound.prototype.openChest = function(){this.openChestSfx.play();};
WurldSound.prototype.closeChest = function(){this.closeChestSfx.play();};
WurldSound.prototype.splash = function(){this.waterSplashSfx.play();};
WurldSound.prototype.snort = function(){this.pigSnortsSfx.play();};
WurldSound.prototype.squeal = function(){this.pigSquealSfx.play();};
WurldSound.prototype.fanfare = function(){this.fanfareSfx.play();};

WurldSound.prototype.pokeball = function(mode){
  this.pokeballSfx[mode].play();
};

WurldSound.prototype.startFootsteps = function(){
    if(!this.footsteps_is_playing){
        this.footstepsSfx.play();
        this.footsteps_is_playing = true;
    }
};
WurldSound.prototype.stopFootsteps = function(){
    if(this.footsteps_is_playing){
        this.footstepsSfx.pause();
        this.footsteps_is_playing = false;
    }
};
