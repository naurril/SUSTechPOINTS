/**
 * Callback undo / redo
 *
 * @callback onActionChange
 * @param {Object} data - Action data
 * @param {string} data.type - Action type
 * @param {Object} data.payload - Action payload
 */

export class ActionHistoryManager {

    /**
     * @type {object}
     * @property {number} length - Stack length
     * @property {string} code - Undo / Redo code
     * @property {onActionChange} [onUndo] - Undo handler
     * @property {onActionChange} [onRedo] - Redo handler
     */
    #options = {
        length: 50,
        code  : 'KeyZ'
    };

    #stack = {
        redo: [],
        undo: []
    };

    constructor() {
        document.addEventListener('keydown', (e) => {
            if (e.code === this.#options.code && e.ctrlKey) {
                if (e.shiftKey) {
                    const action = this.redo();

                    action && this.#options.onRedo?.(action);
                } else {
                    const action = this.undo();

                    action && this.#options.onUndo?.(action);
                }
            }
        });
    }

    /**
     * @param {Object} [options] - Options init
     * @param {number} [options.length] - Max stack length.
     * @param {string} [options.code] - Undo / Redo code
     * @param {onActionChange} [options.onUndo] - Undo handler
     * @param {onActionChange} [options.onRedo] - Redo handler
     */
    setOptions(options) {
        this.#options = {
            ...this.#options,
            ...options
        };

        return this;
    }

    /**
     * @param {Object} action - Action
     * @param {string} action.type - Action type
     * @param {Object} [action.payload] - Action payload
     */
    save(action) {
        this.#stack.undo.push(action);

        if (this.#stack.length > this.#options.length) {
            this.#stack.undo.shift();
        }

        return this;
    }

    undo() {
        const action = this.#stack.undo.pop();

        action && this.#stack.redo.push(action);

        return action;
    }

    redo() {
        return this.#stack.redo.pop();
    }

}

export default new ActionHistoryManager();