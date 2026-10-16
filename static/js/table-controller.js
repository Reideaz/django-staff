import { createNode } from './utils.js'
import { getVisibleMetaFields } from './api.js'

/**
 * Колбэки контроллера таблицы.
 * @typedef {Object} TableActionCallbacks
 * @property {(id: string|number) => Promise<void>|void} onEditRequest - Вызывается при нажатии кнопки редактирования.
 * @property {(id: string|number) => Promise<void>|void} onDeleteRequest - Вызывается при нажатии кнопки удаления.
 */

/**
 * Контроллер отвечающий за отображение данных в виде таблицы.
 */
export class TableController {

    /** 
     * Таблица, находящаяся внутри контейнера.
     * @type {HTMLElement} 
     */
    #table;

    /** 
     * Тело таблицы.
     * @type {HTMLElement} 
     */
    #tableBody;

    /**
     * Метаданные только тех полей, которые видит пользователь.
     * @type {Array<import('./api.js').FieldMeta>}
     */
    #visibleMetaFields;

    /**
     * Вызов происходящий при нажатии кнопки редактирования.
     * @type {TableActionCallbacks['onEditRequest'] | null}
     */
    #onEditRequest = null;

    /**
     * Вызов происходящий при нажатии кнопки удаления.
     * @type {TableActionCallbacks['onDeleteRequest'] | null}
     */
    #onDeleteRequest = null;

    /**
     * Создание экземпляра класса происходит в статическом методе build().
     * @param {HTMLElement} table - Таблица расположенная в контейнере
     * @param {HTMLElement} tableBody - Тело таблицы
     * @param {import('./api.js').TableMeta} tableMeta - Метаданные таблицы
     */
    constructor(table, tableBody, tableMeta) {
        this.#table = table;
        this.#tableBody = tableBody;
        this.#visibleMetaFields = getVisibleMetaFields(tableMeta);

        this.#initEvents();
    }

    /**
     * Метод построения экземпляра TableController.
     * @param {HTMLElement} container - Пустой контейнер
     * @param {import('./api.js').TableMeta} tableMeta - Метаданные таблицы
     * @returns {TableController}
     */
    static build(container, tableMeta) {
        
        const visibleMetaFields = getVisibleMetaFields(tableMeta);
        const headerCells = visibleMetaFields.map(field => 
            createNode('th', { 
                scope: 'col', 
                style: 'max-width: 300px;',
                'data-field': field.name
                }, field.label
            )
        );
        const tableBody = createNode('tbody');
        
        const table = createNode('table', {
             id: 'dynamic_table', 
             class: 'table table-bordered text-start align-middle color_table caption-top',
             style: 'width: max-content;'
            }, [createNode('caption', { class: 'fs-4 fw-bold text-dark' }, tableMeta.title),
                createNode('thead', {}, 
                    createNode('tr', {}, [
                        ...headerCells, 
                        createNode('th', { scope: 'col', style: 'width: 160px;'}, 'Действия')])),
                tableBody
            ]);

        container.replaceChildren(table);
        
        return new TableController(table, tableBody, tableMeta);
    }

    /**
     * Метод позднего связывания (после создания экземпляра класса) событий-колбэков.
     * @param {TableActionCallbacks} callbacks - Колбэки редактирования и удаления записи.
     */
    setCallbacks(callbacks)
    {
        this.#onEditRequest = callbacks.onEditRequest;
        this.#onDeleteRequest = callbacks.onDeleteRequest;
    }

    /**
     * Инициализирует обработку событий взаимодействия с таблицей.
     * 
     * Метод перехватывает события клика, избавляя от необходимости выделения индивидуальных 
     * обработчиков событий клика мыши под каждую строку. Это предотвращает утечки памяти и 
     * исключает необходимость переподписки на события после вызова метода `render()`.
     * 
     * Алгоритм обработки:
     * 1. Метод `.closest('button[data-action]')` изолирует целевой элемент управления, проходя вверх
     *    по дереву от точки клика (решает проблему клика по вложенным текстовым узлам).
     * 2. Метод `.closest('tr')` извлекает контекст строки для считывания первичного ключа (`data-id`).
     * 3. На основе считанного `data-action` управление делегируется соответствующему колбэку внешнего уровня.
     */
    #initEvents() {
        this.#table.addEventListener('click', (event) => {
            
            if (!(event.target instanceof HTMLElement)) return;

            const button = event.target?.closest('button[data-action]');
            
            if (!button) return;
            if (!(button instanceof HTMLElement)) return;

            const action = button.dataset.action;

            const row = button.closest('tr');

            if (row === null) return;
            const entityId = row.dataset.id;

            if(entityId){
                if (action === 'edit' && this.#onEditRequest) {
                    this.#onEditRequest(entityId);
                } else if (action === 'delete' && this.#onDeleteRequest) {
                    this.#onDeleteRequest(entityId);
                }
            } else {
                alert('Запись не имеет идентификатора "id"');
            }
        });
    }

    /**
     * Отрисовывает массив данных в таблице.
     * @param {Array<import('./api.js').DbData>} items - Массив объектов с данными из БД.
     */
    render(items) {
        this.#tableBody.innerHTML = '';

        if (!items || items.length === 0) {
            this.#renderEmptyMessage();
            return;
        }

        // Основной цикл отрисовки таблицы
        items.forEach(item => {
            const row = this.#createRow(item);
            this.#tableBody.appendChild(row);
        });
    }

    /**
     * Добавляет или обновляет элемент видимой таблицы.
     * @param {import('./api.js').DbData} item - Объект данных из БД.
     * @returns 
     */
    addOrUpdateRow(item) {

        const existingRow = this.#tableBody.querySelector(`tr[data-id="${item.id}"]`);
        const newRow = this.#createRow(item);

        if (existingRow) {
            existingRow.replaceWith(newRow);
        } else {

            // Проверяем заглушку "Данные отсутствуют" и удаляем её.
            if (this.#tableBody.querySelector('#empty_message')) {
                this.#tableBody.innerHTML = '';
            }

            this.#tableBody.appendChild(newRow);
        }
    }

    /**
     * Удаляет строку из таблицы по id записи.
     * @param {string|number} id - Идентификатор удаляемой записи.
     */
    deleteRow(id) {
        const row = this.#tableBody.querySelector(`tr[data-id="${id}"]`);
        
        if (!row) return;

        row.remove();

        // Если строк с данными больше нет - показываем пустую заглушку
        if (!this.#tableBody.querySelector('tr[data-id]')) {
            this.#renderEmptyMessage();
        }
    }

    /**
     * Создает полноценную HTML-строку (tr) для таблицы.
     * @param {import('./api.js').DbData} item - объект для отрисовки.
     * @returns 
     */
    #createRow(item) {
        const dataCells = this.#createDataCells(item);
        const actionsCell = this.#createActionsCell();

        return createNode('tr', { 'data-id': item.id }, [...dataCells, actionsCell]);
    }

    /**
     * Создает массив ячеек с данными (td) на основе метаданных полей.
     * @param {import('./api.js').DbData} item - объект для отрисовки.
     * @returns 
     */
    #createDataCells(item) {
        return this.#visibleMetaFields.map(field => {
            const rawValue = item[field.name];
            const formattedContent = this.#formatCellValue(rawValue, field);
            
            return createNode('td', { style: 'max-width: 300px;' }, formattedContent);
        });
    }

    /**
     * Создает ячейку действий (td) с кнопками 'Изменить' и 'Удалить'.
     */
    #createActionsCell() {
        return createNode('td', {}, 
            createNode('div', { className: 'btn-group btn-group-sm', role: 'group' }, [
                createNode('button', { type: 'button', className: 'btn btn-outline-primary', dataset: { action: 'edit' } }, 'Изменить'),
                createNode('button', { type: 'button', className: 'btn btn-outline-danger', dataset: { action: 'delete' } }, 'Удалить')
            ])
        );
    }

    /**
     * Отрисовывает заглушку "Данные отсутствуют" в теле таблицы.
     */
    #renderEmptyMessage() {
        const emptyRow = createNode('tr', {}, 
            createNode('td', { 
                id: 'empty_message',
                className: 'text-center text-muted py-3', 
                colSpan: this.#visibleMetaFields.length + 1 
            }, 'Данные отсутствуют')
        );
        
        this.#tableBody.appendChild(emptyRow);
    }

    /**
     * Форматирует значение ячейки на основе её типа конфигурации.
     * Возвращает строку текста или HTMLElement для сложных типов.
     * 
     * @param {any} value - Значение поля.
     * @param {import('./api.js').FieldMeta} field - Метаданные поля.
     * @returns {string | HTMLElement}
     */
    #formatCellValue(value, field) {
        if (value === null || value === undefined) return '';

        switch (field.type) {
            case 'foreign_key':
                // Возможен приход обогащенного объекта: { value: ' ', label: ' ' }
                if (value && typeof value === 'object' && 'label' in value) {
                    return String(value.label); 
                }
                return String(value);

            case 'select':
                if (!field.options) return String(value);
                const option = field.options.find(opt => opt.value === String(value));
                return option ? option.label : String(value);

            case 'boolean':
                return createNode('span', { 
                    className: value ? 'badge bg-success' : 'badge bg-danger' 
                }, value ? 'Да' : 'Нет');
                
            case 'string':
            case 'number':
            default:
                return String(value);
        }
    }

    /**
     * Анимация процесса загрузки.
     */
    showLoading() {

        const fieldsCount = this.#visibleMetaFields.length + 1;

        const spinner = createNode('div', { class: 'spinner-border text-primary', role: 'status' }, [
            createNode('span', { class: 'visually-hidden' }, 'Загрузка...')
        ]);

        // Собираем структуру: tr -> td (на всю ширину) -> spinner + текст
        const loadingRow = createNode('tr', undefined, [
            createNode('td', { 
                colspan: fieldsCount, 
                class: 'text-center py-5 bg-light text-muted' 
            }, [
                spinner,
                createNode('div', { class: 'mt-2 fw-semibold' }, 'Загрузка данных...')
            ])
        ]);

        this.#tableBody.replaceChildren(loadingRow);
    }
}

