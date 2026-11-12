import { alertError, createNode } from './utils.js';
import { getVisibleMetaFields } from './api.js'

/**
 * Колбэки формы ввода данных.
 * @typedef {Object} FormActionCallbacks
 * @property {(formData: import('./api.js').DbData) => Promise<void> | void} onSave - Вызывается при сохранении формы. Передает собранные данные.
 * @property {() => Promise<void> | void} onClose - Вызывается при закрытии формы.
 * @property {(apiPath: string, elementId: string) => Promise<void> | void} onForeignKeyLoadRequest - Запрос на загрузку данных сторонней таблицы.
 */

/**
 * Контроллер формы ввода данных.
 * 
 * Для работы требуется `Bootstrap 5` в виде глобального объекта `window.bootstrap`.
 */
export class FormController {
    
    /**
     * Инстанс модального окна.
     * @type {any}
     */
    #modalInstance;

    /** 
     * Метаданные таблицы.
     * @type {import('./api.js').TableMeta} 
     */
    #tableMeta;

    /**
     * Идентификатор текущей сущности.
     * @type {string|number|null}
     */
    #currentId = null;

    /**
     * Вызывается при сохранении формы.
     * @type {FormActionCallbacks['onSave'] | null}
     */
    #onSave = null;

    /**
     * Вызывается при закрытии формы.
     * @type {FormActionCallbacks['onClose'] | null}
     */
    #onClose = null;

    /**
     * Запрос на загрузку данных сторонней таблицы.
     * @type {FormActionCallbacks['onForeignKeyLoadRequest'] | null}
     */
    #onForeignKeyLoadRequest = null;

    /**
     * Создание экземпляра класса происходит в статическом методе build().
     * @param {HTMLElement} container - Контейнер для формы.
     * @param {import('./api.js').TableMeta} tableMeta - Метаданные таблицы.
     */
    constructor(container, tableMeta) {
        this.#tableMeta = tableMeta;

        // @ts-expect-error - bootstrap подключается глобально через шаблон Django (base.html)
        if (!window.bootstrap) {
            throw new Error("Для работы требуется компонент Bootstrap 5.");
        }

        // @ts-expect-error - наличие bootstrap гарантировано проверкой выше.
        this.#modalInstance = new window.bootstrap.Modal(container, {
            backdrop: 'static',
            keyboard: true
        });

        this.#setupEvents();
    }

    /** 
     * Метод построения экземпляра FormController.
     * @param {HTMLElement} container - Контейнер для формы.
     * @param {import('./api.js').TableMeta} tableMeta - Метаданные таблицы.
     * @returns {FormController}
    */
    static build(container, tableMeta) {

        container.className = 'modal fade';
        container.setAttribute('tabindex', '-1');
        container.setAttribute('aria-hidden', 'true');

        const HTMLTemplate = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content p-2">
                <div class="modal-header border-0 pb-0 d-flex justify-content-between align-items-center">
                    <div id="form_title" class="text-primary fs-5 fw-bold">
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close">
                    </button>
                </div>
                
                <div id="form_inputs_container" class="modal-body popup-inputs-container py-3">
                </div>
                
                <div class="modal-footer border-0 pt-0 d-flex justify-content-between">
                    <button id="form_cancel_btn" type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">
                        Отменить
                    </button>
                    <button id="form_save_btn" type="button" class="btn btn-success px-4">
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
        `

        // В форму ввода выводятся только поля:
        // - визуально видимые (hidden == false)
        // - разрешено редактирование (editable == true)
        const editableFields = getVisibleMetaFields(tableMeta).filter(
            field => field.editable
        );

        const inputElements = editableFields.map( field => {
            const fieldElement = createNode('div', { class: 'mb-3 text-start' });

            const labelElement = createNode('label', { 
                for: `field-${field.name}`, 
                class: 'form-label text-secondary fs-6 mb-1'
            }, field.label)

            let inputElement;

            if (field.type === 'select' && field.options) {
                // Для типа select используем специальный bootstrap-элемент select
                inputElement = createNode('select', {
                    id: `field-${field.name}`,
                    class: 'form-select',
                    name: field.name
                });

                const optionsElements = field.options.map(o =>
                    createNode('option', { value: o.value }, o.label)
                );

                inputElement.append(...optionsElements);
            } else if (field.type === 'foreign_key') {
                const api_path = field.reference?.api_path

                if (!api_path)
                    throw new Error("В метаданных отсутствует путь к сетевому адресу 'api_path'.");

                // На данном этапе, учитывая скромный объем данных таблиц,
                // для типа foreign_key нет необходимости реализовывать
                // своё отдельное окно. Достаточно использовать select.
                inputElement = createNode('select', {
                    id: `field-${field.name}`,
                    class: 'form-select',
                    'data-api-path': api_path,
                    name: field.name
                }, createNode('option', { value: '' }, 'Загрузка...'));

            } else if (field.type === 'number') {
                const numericAttributes = {};

                if (field.min_value) numericAttributes.min = field.min_value;
                if (field.max_value) numericAttributes.max = field.max_value;
                
                // Для типа number используем  input c типом number
                inputElement = createNode('input', {
                    id: `field-${field.name}`,
                    type: "number",
                    class: 'form-control',
                    ...numericAttributes,
                    name: field.name
                });
            } else {
                // Для всех остальных типов используется стандартный input
                inputElement = createNode('input', {
                    id: `field-${field.name}`,
                    type: "text",
                    class: 'form-control',
                    name: field.name
                });
            }

            fieldElement.append(labelElement, inputElement)

            return fieldElement
        })
        

        container.innerHTML = HTMLTemplate;
        const inputsContainer = container.queryNotNull('#form_inputs_container');
        inputsContainer.replaceChildren(...inputElements)

        return new FormController(container, tableMeta);
    }

    /**
     * Метод позднего связывания событий-колбэков.
     * @param {FormActionCallbacks} callbacks - Колбэки формы.
     */
    setCallbacks(callbacks)
    {
        this.#onSave = callbacks.onSave;
        this.#onClose = callbacks.onClose;
        this.#onForeignKeyLoadRequest = callbacks.onForeignKeyLoadRequest;

        // Загружаем наборы данных для полей с типом данных "foreign_key"
        if (this.#onForeignKeyLoadRequest != null) {
            this.#tableMeta.fields.forEach(field => {
                if (field.type === 'foreign_key' && field.reference?.api_path) {
                    const elementId = `field-${field.name}`;
                    this.#onForeignKeyLoadRequest?.(field.reference?.api_path, elementId);
                }
            });
        }
    }

    /** Открыть форму в режиме добавления новой записи. */
    openCreate() {
        this.#currentId = null;
        this.#resetFields();
        document.getByIdNotNull('form_title').textContent = 'Новая запись';
        this.show();
    }

    /**
     * Метод очищает поля ввода формы.
     */
    #resetFields() {
        this.#tableMeta?.fields.forEach(field => {
            const input = /** @type {HTMLInputElement} */(document.getElementById(`field-${field.name}`));
            if (input) input.value = '';
        });
    }

    /**
     * Настраивает форму на режим редактирования записи и открывает.
     * @param {import('./api.js').DbData} data - Объект данных.
     */
    openEdit(data) {
        if (data.id)
        {
            this.#currentId = data.id;
        } else {
            throw new Error('Запись не имеет идентификатора id.');
        }

        this.#fillFields(data);

        document.getByIdNotNull('form_title').textContent = `Редактирование записи id ${data.id}`;

        this.show();
    }

    /**
     * Метод отрисовывающий опции выбора для элемента `select`.
     * @param {import('./api.js').DbData | undefined} data - Данные из бд.
     * @param {string} elementId - Идентификатор элемента HTML.
     */
    renderSelectOptions(data, elementId) {
        const selectElement = document.getByIdNotNull(elementId);
        const name = selectElement.getAttribute('name');
        
        if (!selectElement || !data || !name) {
            this.renderSelectError(elementId)
            return;
        }
        
        const reference = this.#getReferenceMeta(name);

        if (reference == null) {
            this.renderSelectError(elementId)
            return;
        }

        const options = data.map(
            /** @param {import('./api.js').DbData} item */ item => {
            const value = item[reference.value_field];
            const label = item[reference.label_field];

            if (value === undefined || label === undefined) 
                throw Error("Объект не соответствует структуре описанной в метаданных.");

            return createNode('option', { value: String(value) }, String(label));
        });

        selectElement.replaceChildren(...options);
    }

     /**
     * Находит метаданные поля по его имени.
     * @param {string} fieldName - Имя поля, которое нужно найти
     * @returns {import('./api.js').ReferenceMeta | null}
     */
    #getReferenceMeta(fieldName) {
        const field = this.#tableMeta.fields.find(f => f.name === fieldName);

        if (!field || !field.reference) {
            return null;
        }

        return field.reference;
    }

    /**
     * Метод отрисовывающий сообщение об ошибке внутрь элемента `select`.
     * @param {string} elementId - Идентификатор элемента HTML.
     */
    renderSelectError(elementId) {
        const selectElement = document.getByIdNotNull(elementId);
        selectElement.append(createNode('option', { value: '' }, 'Ошибка загрузки'));
    }

    /**
     * Метод заполняет данными поля формы.
     * @param {import('./api.js').DbData} data - Объект данных.
     */
    #fillFields(data) {
        this.#tableMeta?.fields.forEach(field => {
            const input = /** @type {HTMLInputElement} */ (document.getElementById(`field-${field.name}`));
            if (input) input.value = data[field.name] !== undefined ? data[field.name] : '';
        });
    }

    /** Метод открывает окно формы */
    show() {
        this.#modalInstance?.show();
    }

    /** Метод закрывает окно формы */
    hide() {
        this.#modalInstance?.hide();
    }

    /** Привязка обработчиков событий */
    #setupEvents() {

        // Кнопка СОХРАНИТЬ
        document.getByIdNotNull('form_save_btn').addEventListener('click', () => {
            
            /** @type {import('./api.js').DbData} */
            const data = {};
            let isValid = true;

            // Динамически собираем данные из инпутов в объект
            this.#tableMeta?.fields.forEach(field => {
                const input = /** @type {HTMLInputElement} */(document.getElementById(`field-${field.name}`));
                if (!input) return;

                let val = input.value.trim();
                
                // Валидация обязательных полей
                if (field.required && !val) {
                    alert(`Поле "${field.label}" обязательно для заполнения`);
                    isValid = false;
                    return;
                }

                // Корректно приводим числовые типы
                data[field.name] = field.type === 'number' ? Number(val) : val;
            });

            if (!isValid) return;

            if (this.#currentId) {
                data.id = this.#currentId;
            }

            if (this.#onSave) 
                this.#onSave(data);
        });
    }
}
