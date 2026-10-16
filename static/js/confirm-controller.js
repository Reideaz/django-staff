/**
 * Контроллер всплывающего диалогового окна для подтверждения действий пользователя.
 * 
 * Для работы требуется `Bootstrap 5` в виде глобального объекта `window.bootstrap`.
 */
export class ConfirmController {
    
    /**
     * Элемент, куда смонтировано окно
     */
    #container;

    /**
     * Экземпляр модального окна Bootstrap.
     * @type {any}
     */
    #modalInstance;

    /**
     * Ссылка на метод внутри промиса ожидающий разрешения.
     * @type {((value: boolean) => void) | null}
     */
    #resolveCallback = null;

    /**
     * Выбор сохраняется до момента закрытия окна.
     */
    #isConfirmed = false; 

    /**
     * @param {HTMLElement} container - Элемент, куда смонтировано окно
     */
    constructor(container) {
        this.#container = container;
        
        // @ts-expect-error - bootstrap подключается глобально через шаблон Django (base.html)
        if (!window.bootstrap) {
            throw new Error("Для работы требуется компонент Bootstrap 5.");
        }

        // @ts-expect-error - наличие bootstrap гарантировано проверкой выше.
        this.#modalInstance = new window.bootstrap.Modal(container, {
            backdrop: 'static',
            keyboard: false
        });

        this.#setupEvents();
    }

    /**
     * Фабричный метод для сборки и инициализации контроллера.
     * @param {HTMLElement} container - Пустой контейнер для всплывающего диалогового окна.
     * @returns {ConfirmController}
     */
    static build(container) {
        container.className = 'modal fade';
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-hidden', 'true');

        const HTMLTemplate = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header border-0 pb-0">
                    <h5 id="confirm_title" class="modal-title text-danger fw-bold">
                        Подтверждение
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                    </button>
                </div>
                <div id="confirm_message" class="modal-body text-start py-3 fs-6">
                </div>
                <div class="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
                    <button id="confirm_cancel_btn" type="button" class="btn btn-secondary px-3">
                        Отмена
                    </button>
                    <button id="confirm_ok_btn" type="button" class="btn btn-danger px-3">
                        Подтвердить
                    </button>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = HTMLTemplate;

        return new ConfirmController(container);
    }

    /**
     * Открывает окно и возвращает Promise, который разрешится в true или false.
     * @param {string} title - Заголовок окна.
     * @param {string} message - Текст вопроса пользователю.
     * @returns {Promise<boolean>}
     */
    open(title, message) {
        // Предотвращаем повторное открытие окна
        if (this.#resolveCallback) {
            return Promise.reject(new Error('Модальное окно уже открыто.'));
        }

        const titleEl = this.#container.queryNotNull('#confirm_title');
        const msgEl = this.#container.queryNotNull('#confirm_message');
        
        titleEl.textContent = title;
        msgEl.textContent = message;

        this.#modalInstance.show();

        return new Promise((resolve) => {
            this.#resolveCallback = resolve;
        });
    }

    #setupEvents() {
        const btnCancel = this.#container.queryNotNull('#confirm_cancel_btn');
        const btnOk = this.#container.queryNotNull('#confirm_ok_btn');

        // Пользователь нажимает кнопку "Отмена"
        btnCancel.addEventListener('click', () => {
            this.#isConfirmed = false;
            this.#modalInstance.hide();
        });

        // Пользователь нажимает кнопку "Подтвердить"
        btnOk.addEventListener('click', () => {
            this.#isConfirmed = true;
            this.#modalInstance.hide();
        });

        // Пользователь закрывает окно крестиком, Esc или кликом мимо окна
        this.#container.addEventListener('hide.bs.modal', () => {
            if (this.#resolveCallback) {
                this.#resolveCallback(this.#isConfirmed);
                // Очищаем ссылку - предотвращаем утечку памяти.
                this.#resolveCallback = null;
            }
        });
    }
}
