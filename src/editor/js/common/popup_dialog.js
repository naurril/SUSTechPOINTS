
class MovableView {
  // move starts in dragableUi,
  // movable in movableUi,
  // the pos of posUi is set.
  constructor (dragableUi, posUi, funcOnMove) {
    this.mouseDown = false;
    this.mouseDownPos = null;

    const movableUi = document.getElementById('move-handle-wrapper');

    dragableUi.addEventListener('mousedown', (event) => {
      if (event.which === 1 && event.currentTarget === event.target) {
        this.mouseDown = true;
        this.mouseDownPos = { x: event.clientX, y: event.clientY };

        movableUi.style.display = 'inherit';

        if (this.onDragableUiMouseDown) {
          this.onDragableUiMouseDown();
        }
      }
    });

    movableUi.addEventListener('mouseup', (event) => {
      if (this.mouseDown) {
        dragableUi.style.cursor = '';
        event.stopPropagation();
        event.preventDefault();
        this.mouseDown = false;

        movableUi.style.display = 'none';
      }
    });

    movableUi.addEventListener('mousemove', (event) => {
      if (this.mouseDown) {
        const posDelta = {
          x: event.clientX - this.mouseDownPos.x,
          y: event.clientY - this.mouseDownPos.y
        };

        dragableUi.style.cursor = 'move';

        this.mouseDownPos = { x: event.clientX, y: event.clientY };

        const left = posUi.offsetLeft;
        const top = posUi.offsetTop;

        posUi.style.left = Math.max(0, (left + posDelta.x)) + 'px';
        posUi.style.top = Math.max(0, (top + posDelta.y)) + 'px';

        if (funcOnMove) { funcOnMove(); }
      }
    });
  }
}

class ResizableMoveableView extends MovableView {
  constructor (ui) {
    super(ui.querySelector('#header'), ui.querySelector('#view'));
    this.ui = ui;
    this.contentUi = ui.querySelector('#content');
    this.viewUi = ui.querySelector('#view');

    this.resizeObserver = new ResizeObserver(elements => {
      if (elements[0].contentRect.height === 0) { return; }
      this.adjustSize();
    });

    this.resizeObserver.observe(ui.querySelector('#view'));

    // this.adjustSize();
  }

  adjustSize () {
    this.contentUi.style.height = (this.viewUi.clientHeight - this.contentUi.offsetTop) + 'px';
    if (this.onResize) {
      this.onResize();
    }
  }
}

class PopupDialog extends MovableView {
  constructor (ui) {
    super(ui.querySelector('#header'), ui.querySelector('#view'));

    this.ui = ui; // wrapper
    this.viewUi = this.ui.querySelector('#view');
    this.headerUi = this.ui.querySelector('#header');
    this.titleUi = this.ui.querySelector('#title');

    this.ui.onclick = () => {
      this.hide();
    };

    this.ui.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.hide();

        event.preventDefault();
      }
      event.stopPropagation();
    });

    this.viewUi.onclick = function (event) {
      // event.preventDefault();
      event.stopPropagation();
    };

    this.titleUi.onclick = function (event) {
      // event.preventDefault();
      event.stopPropagation();
    };

    this.titleUi.addEventListener('mousedown', (event) => {
      // event.preventDefault();
      event.stopPropagation();
    });

    this.titleUi.addEventListener('contextmenu', (event) => {
      event.stopPropagation();
    });

    // this.viewUi.addEventListener("contextmenu", (e)=>{
    //     e.stopPropagation();
    //     e.preventDefault();
    // });

    // this.ui.querySelector("#info-view").onclick = function(event){
    //     event.preventDefault();
    //     event.stopPropagation();
    // };

    this.ui.querySelector('#btn-exit').onclick = (event) => {
      this.hide();
    };

    this.maximizeButton = this.ui.querySelector('#btn-maximize');

    if (this.maximizeButton) {
      this.maximizeButton.onclick = (event) => {
        const v = this.viewUi;
        v.style.top = '0%';
        v.style.left = '0%';
        v.style.width = '100%';
        v.style.height = '100%';
        v.style['z-index'] = 5;

        event.currentTarget.style.display = 'none';
        this.ui.querySelector('#btn-restore').style.display = 'inherit';
      };
    }

    this.restoreButton = this.ui.querySelector('#btn-restore');

    if (this.restoreButton) {
      this.restoreButton.onclick = (event) => {
        const v = this.viewUi;
        v.style.top = '20%';
        v.style.left = '20%';
        v.style.width = '60%';
        v.style.height = '60%';
        event.currentTarget.style.display = 'none';
        this.ui.querySelector('#btn-maximize').style.display = 'inherit';
      };
    }
  }

  hide (msg) {
    this.ui.style.display = 'none';

    if (this.onExit) {
      this.onExit(msg);
    }
  }

  show (onexit) {
    this.ui.style.display = 'inherit';
    this.onExit = onexit;
    // this.ui.focus();
  }

  visible () {
    return this.ui.style.display === 'inherit'
  }
}

export { PopupDialog, ResizableMoveableView, MovableView };
