/**
 * Контроллер для динамического создания и отображения информационного окна сообщения.
 * 
 * Для работы требуется `Bootstrap 5` в виде глобального объекта `window.bootstrap`.
 */
export class InfoController {
    #container;
    #modalInstance;

    /**
     * @param {HTMLElement} container - Элемент, куда смонтировано окно сообщений
     */
    constructor(container) {
        this.#container = container;

        // @ts-expect-error - bootstrap подключается глобально через шаблон Django (base.html)
        if (!window.bootstrap) {
            throw new Error("Для работы требуется компонент Bootstrap 5.");
        }

        // @ts-expect-error - наличие bootstrap гарантировано проверкой выше.
        this.#modalInstance = new window.bootstrap.Modal(container);
    }

    /**
     * Метод сборки контроллера.
     * @param {HTMLElement} container - Пустой контейнер для всплывающего окна сообщений.
     * @returns {InfoController}
     */
    static build(container) {
        
        container.className = 'modal fade';
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-hidden', 'true');
        container.style.zIndex = '1060'

        const HTMLTemplate = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header text-white" id="msgModalHeader">
                    <h5 class="modal-title" id="msgModalTitle">
                        Уведомление
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Закрыть">
                    </button>
                </div>
                <div class="modal-body">
                    <p id="msgModalMainText" class="fw-bold mb-2">
                    </p>
                    <div id="msgModalDetailsWrapper" class="d-none">
                        <p class="mb-1 text-muted small">
                            Детали:
                        </p>
                        <div id="msgModalDetails" class="p-2 bg-light border rounded text-dark font-monospace small text-start" 
                        style="max-height: 200px; overflow-y: auto; white-space: pre-wrap;">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                        OK
                    </button>
                </div>
            </div>
        </div>
        `;

        container.innerHTML = HTMLTemplate;
        
        return new InfoController(container);
    }

    /**
     * Показывает окно с кастомным сообщением.
     * @param {Object} options - Конфигурация отображения.
     * @param {String} options.title - Заголовок окна.
     * @param {String} options.message - Главный текст сообщения.
     * @param {String} [options.details] - Дополнительные детали (например, стек ошибки).
     * @param {'danger'|'success'|'warning'|'info'} [options.type='danger'] - Стиль оформления Bootstrap.
     */
    show({ title, message, details = '', type = 'danger' }) {
        const header = this.#container.queryNotNull('#msgModalHeader');
        const titleEl = this.#container.queryNotNull('#msgModalTitle');
        const mainTextEl = this.#container.queryNotNull('#msgModalMainText');
        const detailsWrapper = this.#container.queryNotNull('#msgModalDetailsWrapper');
        const detailsEl = this.#container.queryNotNull('#msgModalDetails');

        // Сбрасывает классы заголовка, чтобы установить тип сообщения
        header.className = `modal-header text-white bg-${type}`;
        
        titleEl.innerText = title;
        mainTextEl.innerText = message;

        if (details) {
            detailsEl.innerText = details;
            detailsWrapper.classList.remove('d-none');
        } else {
            detailsWrapper.classList.add('d-none');
            detailsEl.innerText = '';
        }

        this.#modalInstance.show();
    }

    /**
     * Показывает окно с информацией ответа сервера.
     * @param {import('./api.js').ApiResponse} response - Ответ сервера.
     */
    showApiResponse(response) {

        if (response.status === 'success') {
            this.show({
                title: 'Успешно', 
                message: response.message,
                details: JSON.stringify(response.data, null, 2),
                type: 'success'
            })
        } else if (response.status === 'error') {
            this.show({
                title: 'Ошибка', 
                message: response.message,
                details: response.error_details,
                type: 'danger'
            })
        } else {
            throw new Error('Ответ сервера не соответствует стандарту.')
        }
    }

    /**
     * Показывает окно с информацией об ошибке.
     * @param {any} error - Текст или объект ошибки.
     */
    showError(error) {
        let title = 'Произошла ошибка';
        let message = 'Что-то пошло не так при выполнении операции.';
        let details = '';

        if (error instanceof Error) {
            message = error.message;
            if (error.stack) {
                details = error.stack;
            }
        } else if (typeof error === 'string') {
            message = error;
        }

        this.show({
            title: title,
            message: message,
            details: details,
            type: 'danger'
        });
    }
}
