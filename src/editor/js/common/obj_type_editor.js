
import { globalObjectCategory } from '../obj_cfg'

class ObjTypeEditor {
  constructor (ui) {
    const objTypeMap = globalObjectCategory.objTypeMap

    // obj type selector
    let options = ''
    for (const o in objTypeMap) {
      options += '<option value="' + o + '" class="' + o + '">' + o + '</option>'
    }

    ui.innerHTML = options

    this.ui = ui
  }

  setValue (v) {
    this.ui.value = v
  }
}

export { ObjTypeEditor }
