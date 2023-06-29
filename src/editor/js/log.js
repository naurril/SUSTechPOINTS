import { PopupDialog } from './common/popup_dialog.js';

class LogWindow extends PopupDialog {
  constructor (ui, btn) {
    super(ui);

    this.btn = btn;
    this.svg = btn.querySelector('#log-svg');
    this.contentUi = this.ui.querySelector('#content');
    this.viewUi = this.ui.querySelector('#view');
    this.logsContentUi = this.ui.querySelector('#content-logs');
    this.errorsContentUi = this.ui.querySelector('#content-errors');
    this.objectsContentUi = this.ui.querySelector('#content-objects');
    this.clearBtn = this.ui.querySelector('#btn-clear');

    this.clearBtn.onclick = () => { this.logsContentUi.innerHTML = ''; };
    this.log('Welcome!');

    this.logBtn = this.ui.querySelector('#tab-log');
    this.errorBtn = this.ui.querySelector('#tab-error');
    this.objectBtn = this.ui.querySelector('#tab-object');

    this.logBtn.onclick = () => {
      this.logBtn.className = 'tab-button tab-selected';
      this.errorBtn.className = 'tab-button';
      this.objectBtn.className =  'tab-button';

      this.logsContentUi.style.display = 'inherit';
      this.errorsContentUi.style.display = 'none';
      this.objectsContentUi.style.display = 'none';
    };

    this.errorBtn.onclick = () => {
      this.errorBtn.className = 'tab-button tab-selected';
      this.logBtn.className = 'tab-button';
      this.objectBtn.className =  'tab-button';

      this.logsContentUi.style.display = 'none';
      this.errorsContentUi.style.display = 'inherit';
      this.objectsContentUi.style.display = 'none';
    };

    this.objectBtn.onclick = () => {
      this.errorBtn.className = 'tab-button';
      this.logBtn.className = 'tab-button';
      this.objectBtn.className =  'tab-button tab-selected';

      this.logsContentUi.style.display = 'none';
      this.errorsContentUi.style.display = 'none';
      this.objectsContentUi.style.display = 'inherit';

      this.setObjectsContent();
    };


    this.resizeObserver = new ResizeObserver(elements => {
      if (elements[0].contentRect.height === 0) { return; }
      this.adjustSize();
    });

    this.resizeObserver.observe(ui.querySelector('#view'));

    this.adjustSize();

    this.mouseDown = false;
    this.mouseDwwnPos = {};

    this.autoScroll = true;

    this.logid = 0;
    this.maxLogLength = 10000; // stringLength;
    this.errors = []
  }

  setErrorsContent (errors, objid) {

    if (objid) {
      this.errors = this.errors.filter(x=>x.obj_id!=objid).concat(errors);
      errors = this.errors;
    } else {
      this.errors = errors;
    }

    this.erros = this.errors.sort((a,b)=>(a.obj_id > b.obj_id)?1:-1);
    const summary = `${errors.length} warnings.<br>`;
    const text = errors.map(r => `<a class='log-object-frame-id'>${r.frame_id},${r.obj_id}</a>,${r.camera_type?r.camera_type:''}, ${r.camera?r.camera:''}, ${r.desc}<br>`).reduce((a, b) => a + b, summary);
    this.errorsContentUi.innerHTML = text;

    this.errorsContentUi.querySelectorAll('.log-object-frame-id').forEach(ele => {
      ele.onclick = (event) => {
        const obj = event.currentTarget.innerHTML.split(',');
        console.log('click', obj);
        window.editor.currentMainEditor.gotoObjectFrame(...obj); // frameid, objid
      };
    });
  }

  setObjectsContent() {    
    const boxes = window.editor.data.world.annotation.boxes.concat();

    const objects = boxes.sort((a,b)=>(a.obj_id > b.obj_id)?1:-1);
    const text = objects.map(r => `<a class='log-object-frame-id'>${r.obj_id},${r.obj_type}</a><br>`).reduce((a, b) => a + b, '');
    this.objectsContentUi.innerHTML = text;

    this.objectsContentUi.querySelectorAll('.log-object-frame-id').forEach(ele => {
      ele.onclick = (event) => {
        const obj = event.currentTarget.innerHTML.split(',');
        console.log('click', obj);
        window.editor.currentMainEditor.gotoObjectFrame(window.editor.data.world.frameInfo.frame, obj[0]); // frameid, objid
      };
    });
  }

  setUi (ui) {

  }

  show () {
    super.show();
    this.adjustSize();
  }

  adjustSize () {
    this.contentUi.style.height = (this.viewUi.clientHeight - this.contentUi.offsetTop) + 'px';
  }

  gettime () {
    const d = new Date();
    return '' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() + '.' + d.getMilliseconds();
  }

  updateAutoScrollFlag () {
    const div = this.logsContentUi;
    this.autoScroll = (div.scrollHeight - 10 < div.scrollTop + div.clientHeight);
  }

  autoScrollOutput () {
    const div = this.logsContentUi;
    if (this.autoScroll) { div.scrollTop = div.scrollHeight; }
  }

  isInt (n) {
    return n % 1 === 0;
  }

  buildLogStr (args) {
    let thisstr = '';
    for (const i in args) {
      if (typeof args[i] === 'number') {
        thisstr += " <span class='number'>" + (this.isInt(args[i]) ? args[i] : args[i].toFixed(6)) + '</span>';
      } else if (['.', ',', ':', ';'].find((c) => c === args[i])) {
        thisstr += args[i];
      } else {
        thisstr += ' ' + args[i];
      }
    }

    return thisstr;
  }

  logcolor (color) {
    this.updateAutoScrollFlag();
    const args = [...arguments];
    console.log(...args.slice(1));
    const oldContent = this.logsContentUi.innerHTML;

    let thisstr = this.gettime() + ' ';
    thisstr += this.buildLogStr(args.slice(1));

    this.logid++;

    this.logsContentUi.innerHTML = oldContent + "<div id='log-" + this.logid + "'  class='" + color + "'>" + thisstr + '</div>';

    this.autoScrollOutput();
  }

  log () {
    this.svg.style.fill = this.logid % 2 ? 'red' : 'green';

    this.updateAutoScrollFlag();

    console.log(...arguments);
    let oldContent = this.logsContentUi.innerHTML;

    let thisstr = this.gettime() + ' ';
    // let thisstr = "";
    thisstr += this.buildLogStr(arguments);

    this.logid++;

    if (oldContent.length > this.maxLogLength) {
      oldContent = oldContent.slice(oldContent.length - this.maxLogLength);
      const firstLogPos = oldContent.search('<div id=');
      oldContent = oldContent.slice(firstLogPos);
    }

    this.logsContentUi.innerHTML = oldContent + "<div id='log-" + this.logid + "'>" + thisstr + '</div>';
    this.autoScrollOutput();
  }

  logappend () {
    // console.log(...arguments);
    this.updateAutoScrollFlag();
    const thisstr = this.buildLogStr(arguments);
    this.logsContentUi.querySelector('#log-' + this.logid).innerHTML += thisstr;
    this.autoScrollOutput();
  }

  logappendcolor (color) {
    this.updateAutoScrollFlag();
    const args = [...arguments];
    const thisstr = this.buildLogStr(args.slice(1));
    const div = this.logsContentUi.querySelector('#log-' + this.logid);
    div.className = color;
    div.innerHTML += thisstr;
    this.autoScrollOutput();
  }

  logonce () {
    this.updateAutoScrollFlag();
    const oldContent = this.logsContentUi.innerHTML;

    let thisstr = this.gettime() + ' ';

    thisstr += this.buildLogStr(arguments);

    const laststr = this.logsContentUi.querySelector('#log-' + this.logid);
    if (laststr && laststr.innerHTML && thisstr === laststr.innerHTML) { return; }

    this.logid++;
    this.logsContentUi.innerHTML = oldContent + "<div id='log-" + this.logid + "'>" + thisstr + '</div>';
    this.autoScrollOutput();
  }
}

let logger = null;

function createLogger (ui, btn) {
  logger = new LogWindow(ui, btn);
}

export { logger, createLogger };
