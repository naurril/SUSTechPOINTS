import { PopupDialog } from './common/popup_dialog.js';

class MultiClassChooserBox extends PopupDialog {
  constructor (ui) {
    super(ui);

    this.mouseDown = false;
    this.mouseDwwnPos = {};
    this.contentUi = this.ui.querySelector('#content');

    this.buttons = {
      yes: this.ui.querySelector('#btn-yes'),
      no: this.ui.querySelector('#btn-no'),
      exit: this.ui.querySelector('#btn-exit')
    };

    for (const btn in this.buttons) {
      this.buttons[btn].onclick = () => {
        this.hide(btn);
      };
    }

    this.ui.addEventListener('keydown', (ev) => {
      // anykey
      if (ev.shiftKey || ev.ctrlKey || ev.altKey) {
        //
      } else {
        this.hide();
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
  }

  showButtons (btns) {
    for (const btn in this.buttons) {
      this.buttons[btn].style.display = 'none';
    }

    for (const btn in btns) {
      this.buttons[btns[btn]].style.display = '';
    }
  }

  setClasses (classes) {
    let str  = classes.map(c=>`<input id="class-${c}" type=checkbox>${c}</input> `).reduce((a,b)=>a+b);

    this.contentUi.innerHTML = str;

    this.classes = classes;

  }

  getSelectedClasses () {
    return this.classes.filter(c=>{
      return this.contentUi.querySelector("#class-"+c).checked
    })
  }

  makeVisible (pointerPosition) {
    if (!pointerPosition) {
      // default pos
      const parentRect = this.ui.getBoundingClientRect();
      const viewRect = this.viewUi.getBoundingClientRect();

      this.viewUi.style.top = (parentRect.top + parentRect.height / 3) + 'px';
      this.viewUi.style.left = (parentRect.left + parentRect.width / 2 - viewRect.width / 2) + 'px';
    } else {
      const parentRect = this.ui.getBoundingClientRect();
      const viewRect = this.viewUi.getBoundingClientRect();

      let left = pointerPosition.x - viewRect.width / 2;
      if (left < parentRect.left) left = parentRect.left;
      if (left + viewRect.width > parentRect.right) { left -= left + viewRect.width - parentRect.right; }

      let top = pointerPosition.y - viewRect.height / 2;
      if (top < parentRect.top) { top = parentRect.top; }

      if (top + viewRect.height > parentRect.bottom) { top -= top + viewRect.height - parentRect.bottom; }

      this.viewUi.style.top = top + 'px';
      this.viewUi.style.left = left + 'px';
    }
  }

  show (title, btnList, onexit, pointerPosition) {
    this.showButtons(btnList);

    this.titleUi.innerText = title;
    

    super.show(onexit);

    this.makeVisible(pointerPosition);

    this.ui.focus();
  }
}

export { MultiClassChooserBox };
