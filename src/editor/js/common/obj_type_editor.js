
import { globalObjectCategory } from '../obj_cfg'

class ObjTypeEditor {
  constructor (ui) {
    const obj_type_map = globalObjectCategory.obj_type_map

    // obj type selector
    let options = ''
    for (const o in obj_type_map) {
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
