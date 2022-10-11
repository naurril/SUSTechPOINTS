import { globalObjectCategory } from './obj_cfg.js'

function autoAnnotate (world, done, alg) {
  const xhr = new XMLHttpRequest()
  // we defined the xhr
  xhr.onreadystatechange = () => {
    if (this.readyState != 4) { return }

    if (this.status == 200) {
      const anns = JSON.parse(this.responseText)

      anns.map(a => a.obj_type = globalObjectCategory.guess_obj_type_by_dimension(a.psr.scale))

      // load annotations
      world.annotation.reapplyAnnotation(anns)

      if (done) { done() }
    }
  }

  xhr.open('GET', '/auto_annotate?' + 'scene=' + world.frameInfo.scene + '&frame=' + world.frameInfo.frame, true)

  xhr.send()
}

export { autoAnnotate }
