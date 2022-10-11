
function PlayControl (data) {
  this.data = data
  this.stop_play_flag = true
  this.pausePlayFlag = false

  this.pause_resume_play = function () {
    this.pausePlayFlag = !this.pausePlayFlag

    if (!this.pausePlayFlag && !this.stop_play_flag) {
      this.play(this.onLoadWorldFinished)
    }
  }

  this.stopPlay = function () {
    this.stop_play_flag = true
    this.pausePlayFlag = false
  }

  this.onLoadWorldFinished = null
  this.play = function (onLoadWorldFinished, fps = 2) {
    this.onLoadWorldFinished = onLoadWorldFinished

    if (!this.data.meta) {
      console.log('no meta data! cannot play')
      return
    }

    // if (this.stop_play_flag == false && !resume){
    //     return;
    // }

    this.stop_play_flag = false
    this.pausePlayFlag = false

    const sceneMeta = data.world.sceneMeta

    const scope = this

    let startFrame = data.world.frameInfo.frame

    const currentFrameIndex = sceneMeta.frames.findIndex(function (x) { return x === data.world.frameInfo.frame })
    if (currentFrameIndex === sceneMeta.frames.length - 1) {
      // this is the last frmae
      // we go to first frame.
      startFrame = sceneMeta.frames[0]
    }

    playFrame(sceneMeta, startFrame, onLoadWorldFinished)

    async function playFrame (sceneMeta, frame, onLoadWorldFinished) {
      if (!scope.stop_play_flag && !scope.pausePlayFlag) {
        const world = await scope.data.getWorld(sceneMeta.scene, frame)

        if (world.preloaded()) // found, data ready
        {
          scope.data.activateWorld(
            world,
            function () { // on load finished
              // views[0].detach_control();
              onLoadWorldFinished(world)

              // play next frame
              const frameIndex = world.frameInfo.frameIndex
              if (frameIndex + 1 < sceneMeta.frames.length) {
                const next_frame = sceneMeta.frames[frameIndex + 1]
                setTimeout(
                  function () {
                    playFrame(sceneMeta, next_frame, onLoadWorldFinished)
                  },
                  1000 / fps)
              } else {
                scope.stopPlay()
              }
            }, true)
        } else {
          // not ready.
          console.log('wait buffer!', frame)

          setTimeout(
            function () {
              playFrame(sceneMeta, frame, onLoadWorldFinished)
            },
            10)
        }
      }
    };
  }

  // function play_current_scene_without_buffer(){

  //     if (!data.meta){
  //         console.log("no meta data! cannot play");
  //         return;
  //     }

  //     if (stop_play_flag== false){
  //         return;
  //     }

  //     stop_play_flag = false;

  //     var sceneMeta = data.get_current_world_scene_meta();
  //     var sceneName= sceneMeta.scene;

  //     playFrame(sceneMeta, data.world.frameInfo.frame);

  //     function playFrame(sceneMeta, frame){
  //         load_world(sceneName, frame);

  //         if (!stop_play_flag)
  //         {
  //             var frameIndex = sceneMeta.frames.findIndex(function(x){return x == frame;});
  //             if (frameIndex+1 < sceneMeta.frames.length)
  //             {
  //                 next_frame = sceneMeta.frames[frameIndex+1];
  //                 setTimeout(
  //                     function(){
  //                         playFrame(sceneMeta, next_frame);
  //                     },
  //                     100);
  //             }
  //             else{
  //                 stop_play_flag = true;
  //             }

  //         }
  //     };
  // }
}

export { PlayControl }
