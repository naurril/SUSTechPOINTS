class PlayControl {
  constructor (data) {
    this.data = data;
    this.stop_play_flag = true;
    this.pausePlayFlag = false;
    this.onLoadWorldFinished = null;
  }

  pauseResumePlay () {
    this.pausePlayFlag = !this.pausePlayFlag;

    if (!this.pausePlayFlag && !this.stop_play_flag) {
      this.play(this.onLoadWorldFinished);
    }
  }

  stopPlay () {
    this.stop_play_flag = true;
    this.pausePlayFlag = false;
  }

  play (onLoadWorldFinished, fps = 2) {
    this.onLoadWorldFinished = onLoadWorldFinished;

    if (!this.data.meta) {
      console.log('no meta data! cannot play');
      return;
    }

    this.stop_play_flag = false;
    this.pausePlayFlag = false;

    const sceneMeta = this.data.world.sceneMeta;

    let startFrame = this.data.world.frameInfo.frame;

    const currentFrameIndex = sceneMeta.frames.findIndex((x) => x === this.data.world.frameInfo.frame);
    if (currentFrameIndex === sceneMeta.frames.length - 1) {
      // this is the last frmae
      // we go to first frame.
      startFrame = sceneMeta.frames[0];
    }

    const playFrame = async (sceneMeta, frame, onLoadWorldFinished) => {
      if (!this.stop_play_flag && !this.pausePlayFlag) {
        const world = await this.data.getWorld(sceneMeta.scene, frame);

        if (world.preloaded()) {
          // found, data ready
          this.data.activateWorld(
            world,
            function () { // on load finished
              // views[0].detach_control();
              onLoadWorldFinished(world);

              // play next frame
              const frameIndex = world.frameInfo.frameIndex;
              if (frameIndex + 1 < sceneMeta.frames.length) {
                const nextFrame = sceneMeta.frames[frameIndex + 1];
                setTimeout(
                  function () {
                    playFrame(sceneMeta, nextFrame, onLoadWorldFinished);
                  },
                  1000 / fps);
              } else {
                this.stopPlay();
              }
            }, true);
        } else {
          // not ready.
          console.log('wait buffer!', frame);

          setTimeout(
            function () {
              playFrame(sceneMeta, frame, onLoadWorldFinished);
            },
            10);
        }
      }
    };

    playFrame(sceneMeta, startFrame, onLoadWorldFinished);
  }
}

export { PlayControl };
