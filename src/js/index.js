(function(w, d) {


    if(!(w && d)) {
        return false;
    }

    const aClass = function(Ele, ClassName) {
        if (Ele.classList && typeof ClassName === "string") {
            Ele.classList.add(ClassName);
        } else if (typeof Ele.className !== "undefined" && typeof ClassName === "string") {
            Ele.className += " " + ClassName;
        } else {
            throw new Error("addClass의 인자는 (Element객체,'넣을클래스명') 으로 정의해야합니다.");
        }
    };


    const rClass = function(Ele, ClassName) {
        if (Ele.classList && typeof ClassName === "string") {
            Ele.classList.remove(ClassName);
        } else if (typeof Ele.className !== "undefined" && typeof ClassName === "string") {
            Ele.className = Ele.className.replace(new RegExp("(^|\\b)(" + ClassName.split(' ').join("|") + ")(\\b|$)", "gi"), " ");
        } else {
            throw new Error("removeClass의 인자는 (Element객체,'넣을클래스명 [구분자 공백]') 으로 정의해야합니다.");
        }
    };


    const hClass = function(Ele, ClassName) {
        if (Ele.classList && typeof ClassName === "string") {
            return Ele.classList.contains(ClassName);
        } else if (typeof Ele.className !== "undefined" && typeof ClassName === "string") {
            return new RegExp("(^|)" + ClassName + "(|$)", "gi").test(Ele.className);
        } else {
            throw new Error("hasClass의 인자는 (Element객체,'넣을클래스명') 으로 정의해야합니다.");
        }
    };
    const raf = requestAnimationFrame;
    const t = TweenLite;
    const _staticModals = {};
    const optionModel = {
        duration: 0.50,
        ease: Power3.easeOut
    };

    class Modal {
        static getDirAttributeName() {
            return 'data-modal-trigger';
        }

        static triggerModal(e) {
            const targetEl = Modal.getModalTrigger(e.target || e.srcElement);
            if(targetEl) {
                const modalTarget = targetEl.getAttribute(Modal.getDirAttributeName());
                const buttonType = targetEl.getAttribute('data-type');
                const modalInstance = _staticModals[modalTarget];
                if(!modalInstance) {
                    return false;
                }
                const promises = modalInstance.getTypeCallStack(buttonType).map(callback => typeof callback === 'function' && new Promise((res, rej) => callback.apply(this, [e, res, rej])) ).filter(_ => _);
                Promise.all(promises)
                    .then(_ => Modal.lazyFrame(3))
                    .then(_ => {
                        const targetPostion = targetEl.getBoundingClientRect();
                        const position = modalInstance.getPosition(targetPostion);
                        typeof modalInstance[buttonType] === 'function' && modalInstance[buttonType](position);
                    })
                    .catch(err => {
                        modalInstance._el.innerHTML = `<h1 class="err-message">요청 처리도중 오류가 발생했습니다. 잠시후에 다시시도해주세요. (${err.message})</h1>`;
                        Modal.lazyFrame(3).then(_ => {
                            const targetPostion = targetEl.getBoundingClientRect();
                            const position = modalInstance.getPosition(targetPostion);
                            typeof modalInstance[buttonType] === 'function' && modalInstance[buttonType](position);
                        });
                    });
            }
        }

        static getModalTrigger(el) {
            while(el) {
                if(el.hasAttribute(Modal.getDirAttributeName())) {
                    break;
                }
                el = el.parentElement;
            }
            return el;
        }

        static getNumberToArray(number) {
            const arr = [];
            for(let i = 0; i < number; i++) {
                arr.push(i);
            }
            return arr;
        }

        static lazyFrame(frame = 0) {
            let p = Promise.resolve();
            const frameArr = this.getNumberToArray(frame);
            frameArr.map(number => _ => new Promise( (res, rej) => raf(_ => res(number)) ))
                .forEach(promiseFn => p = p.then(promiseFn));
            return p;
        }


        constructor(elem, options) {
            this._el = elem && typeof elem === 'string' ? document.querySelector(elem) : elem;
            if(!this._el) {
                throw new Error('invalid Selector OR HTMLElement !');
            }

            this.id = this._el.getAttribute('id');

            if(!this.id) {
                throw new Error('id Attribute Required!');
            }

            this.option = Object.assign({}, optionModel, options);
            this._dim = document.createElement('div');
            this._dim.setAttribute('data-modal-trigger', this.id);
            this._dim.setAttribute('data-type', 'close');
            this.openCallStack = [];
            this.closeCallStack = [];
            aClass(this._dim, 'modal-background');
            _staticModals[this.id] = this;
        }

        open(position) {
            raf(_ => {
                document.body.appendChild(this._dim);
                document.body.style.overflow = 'hidden';
                this._el.setAttribute('data-x', position.x);
                this._el.setAttribute('data-y', position.y);
                t.to(this._el, 0, { x: position.x, y: position.y, onComplete: _ => {
                    const center = { x: (w.innerWidth / 2) - (this._el.offsetWidth / 2), y: (w.innerHeight / 2) - (this._el.offsetHeight / 2)};
                    t.to(this._el, this.option.duration, { visibility: 'visible', opacity: 1, scale: 1, x: center.x, y: center.y, ease: this.option.ease });
                    t.to(this._dim, this.option.duration, { display: 'inline-block', opacity: 1, ease: this.option.ease });
                } });
            });
        }

        close() {
            t.to(this._el, this.option.duration, { opacity: 0, scale: 0.7, x: this._el.getAttribute('data-x'),y: this._el.getAttribute('data-y'), ease: this.option.ease });
            t.to(this._dim, this.option.duration, { display: 'none', opacity: 0, ease: this.option.ease, onComplete: _ => {
                document.body.style.overflow = '';
                this._el.style.transform = '';
                this._el.visibility = 'hidden';
                this._el.removeAttribute('data-x');
                this._el.removeAttribute('data-y');
                this._dim.parentElement && this._dim.parentElement.removeChild(this._dim);
            }
            });
        }


        getId() {
            return this.getId;
        }

        getPosition(targetPosition) {
            const styleObj = w.getComputedStyle(this._el);
            const width = this.getWidthToPixel(styleObj.width);
            const scale = this.getScale(styleObj.transform);

            return { x: (targetPosition.left + targetPosition.width / 2) - (width / 2), y: targetPosition.top - (scale ? this._el.offsetHeight / 2 * (1 - scale.y) : 0) };
        }

        getWidthToPixel(styleString) {
            const widthValue = parseInt(/(\-?)(\.?\d+)/g.exec(styleString)[0]);
            const unit = styleString.replace(/(\-?)(\.?\d+)/g, '').replace(/\s+/g, '');
            switch (unit) {
                case '%':
                    return (w.innerWidth || 0) * (widthValue / 100);
                    break;
                case 'px':
                    return widthValue;
                    break;
            }
        }
     /*   getTranslatePosition(transform, position) {
            let type = '';

            switch(true) {
                case transform.indexOf('matrix') >= 0:
                    type = 'matrix';
                    const matrixRegexp = /(?!([matrix\(]|[matrix3d\(])).*(?=\))/g;
                    const values = matrixRegexp.exec(transform)[0].replace(/\s/g, '').split(',');

                    if(values.length === 6) {
                        values[4] = position.x;
                        values[5] = position.y;
                    }

                    if(values.length === 8) {
                        values[6] = position.x;
                        values[7] = position.y;
                    }
                    matrixRegexp.lastIndex = 0;
                    return  transform.indexOf('matrix3d') >= 0 ? `translate(${values[6]},${values[7]}) transmatrix3d(${values.join(',')})` : `matrix(${values.join(',')})`;
                    break;
                case transform.indexOf('translate') >= 0:

            }
        }
*/
        getScale(transform) {
            let type = '';
            switch(true) {
                case transform.indexOf('matrix') >= 0:
                    type = 'matrix';
                    const matrixRegexp = /(?!([matrix\(]|[matrix3d\(])).*(?=\))/g;
                    const values = matrixRegexp.exec(transform)[0].replace(/\s/g, '').split(',');
                    return values.length === 6 ? { x: parseFloat(values[0]), y: parseFloat(values[3]) } : { x: parseFloat(values[0]), y: parseFloat(values[4]) };
                    break;
                case transform.indexOf('translate') >= 0:

            }
        }


        addEventListener(type = 'open', callback) {
            this.getTypeCallStack(type).push(callback);
        }
        getTypeCallStack(type) {
            return type === 'open' ? this.openCallStack : this.closeCallStack;
        }
        removeEventListener(type = 'open', refFn) {
           const callStack = this.getTypeCallStack(type).filter(functions => functions !== refFn);
           type === 'open' ? this.openCallStack = callStack : this.closeCallStack = callStack;
        }
    }

    w.addEventListener('click', Modal.triggerModal);
    w.lalaheydey = w.lalaheydey || {};
    w.lalaheydey.Modal = Modal;
})(window, document);
