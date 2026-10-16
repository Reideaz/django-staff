import { ApiService } from './api-service.js';
import { TableController } from './table-controller.js';
import { FormController } from './form-controller.js';
import { ConfirmController } from './confirm-controller.js';
import { InfoController } from './info-controller.js';
import { createNode, alertError } from './utils.js'

/**
 * Контроллер координирующий работу элементов пользовательского интерфейса.
 */
export class AppController {

    /** 
     * Сервис осуществляющий сетевые запросы.
     * @type {ApiService}
     */
    #apiService;

    /**
     * Базовый сетевой путь запроса.
     * @type {string}
     */
    #baseUrl;

    /** 
     * Основной контейнер, который содержит контейнер таблицы, контейнер формы и другие компоненты.
     * @type {HTMLElement}
     */
    #mainContainer;
    
    /**
     * Контейнер, в который встраивается таблица.
     * @type {HTMLElement}
     */
    #tableContainer;

    
    /**
     * Контейнер, в который встраивается форма ввода данных.
     * @type {HTMLElement}
     */
    #formContainer;

    /**
     * Контроллер отвечающий за отображение данных в таблице.
     * @type {TableController} 
     */
    #tableController;

    /**
     * Контроллер управляющий формой ввода данных.
     * @type {FormController} 
     */
    #formController;

    /**
     * Контроллер подтверждения действий пользователя.
     * @type {ConfirmController} 
     */
    #confirmController;

    /**
     * Контроллер сообщений об ошибках.
     * @type {InfoController} 
     */
    #infoController;


    /**
     * Создание экземпляра класса происходит в статическом методе build().
     * @param {ApiService} apiService - Сервис осуществляющий сетевые запросы.
     * @param {string} baseUrl - Базовый сетевой путь запроса.
     * @param {HTMLElement} mainContainer - Основной контейнер.
     * @param {HTMLElement} tableContainer - Контейнер таблицы.
     * @param {HTMLElement} formContainer - Контейнер формы ввода данных.
     * @param {TableController} tableController - Контроллер таблицы.
     * @param {FormController} formController - Контроллер формы ввода данных.
     * @param {ConfirmController} confirmController - Контроллер подтверждения действий пользователя.
     * @param {InfoController} infoController - Контроллер сообщений об ошибках.
     */
    constructor(apiService, baseUrl, mainContainer, tableContainer, formContainer, 
        tableController, formController, confirmController, infoController) {
        this.#apiService = apiService;
        this.#baseUrl = baseUrl;
        this.#mainContainer = mainContainer;
        this.#tableContainer = tableContainer;
        this.#formContainer = formContainer;
        this.#tableController = tableController;
        this.#formController = formController;
        this.#confirmController = confirmController;
        this.#infoController = infoController;

        this.#setupInteractions();
    }

    /**
     * Комплексный метод построения модуля пользовательского интерфейса.
     * Создает вложенные элементы и встраивает их в пустой контейнер, 
     * инициализирует дочерние контроллеры и настраивает взаимодействие между ними.
     * @param {ApiService} apiService - Сервис осуществляющий сетевые запросы.
     * @param {string} baseUrl - Базовый сетевой путь запроса.
     * @param {HTMLElement} container - Пустой контейнер для заполнения.
     * @param {import('./api.js').TableMeta} tableMeta - Метаданные таблицы.
     * @returns {AppController}
     */
    static build(apiService, baseUrl, container, tableMeta) {

        const tableElement = createNode('div', { id: 'table_container'});
        const formElement = createNode('div', { id: 'form_container' });
        const confirmElement = createNode('div', { id: 'confirm_container' });
        const infoElement = createNode('div', { id: 'message_container' });
        const btnWrapper = createNode('div', { class: 'text-start' });
        const appAddBtn = createNode('button', { 
            type: 'button', id: 'app_add_btn', class: 'btn btn-primary my-3' 
            }, 'Добавить запись' );
        btnWrapper.appendChild(appAddBtn);

        container.replaceChildren(tableElement, btnWrapper, formElement, confirmElement);
        
        const tableController = TableController.build(tableElement, tableMeta);
        const formController = FormController.build(formElement, tableMeta);
        const confirmController = ConfirmController.build(confirmElement);
        const infoController = InfoController.build(infoElement);

        return new AppController(apiService, baseUrl, container, tableElement, formElement, 
            tableController, formController, confirmController, infoController);
    }

    /**
     * Метод настраивает взаимодействие между контроллерами.
     */
    #setupInteractions() {

        this.#tableController.setCallbacks({
            onEditRequest: (id) => this.#handleEditRequest(id),
            onDeleteRequest: (id) => this.#handleDeleteRequest(id)
        });

        this.#formController.setCallbacks({
            onSave: async (data) => await this.#handleSaveRecord(data),
            onClose: () => {},
            onForeignKeyLoadRequest: async (path, id) => await this.#handleForeignKeyLoad(path, id)
        });

        //Привязываем кнопку добавления к вызову формы создания новой записи.
        document.getByIdNotNull('app_add_btn').addEventListener('click', () => {
            this.#formController.openCreate();
        });
    }
    
    /**
     * Загрузка набора данных в формате JSON и отрисовка его в таблице.
     */
    async loadData() {
        try {
            this.#tableController.showLoading();

            const url_with_enrich = this.#baseUrl + "?enrich_keys=true"
            const response = await this.#apiService.get(url_with_enrich);

            const items = response.data;

            if (!Array.isArray(items)) {
                throw new Error(`Ожидался массив, но получен: ${typeof items}`)
            }

            if (items.length > 0 && (typeof items[0] !== 'object' || items[0] === null)) {
                throw new Error(`В массиве ожидались объекты, но первый элемент: ${typeof items[0]}`);
            }

            this.#tableController.render(items);

        } catch(error) {
            alertError("Ошибка при получении данных с сервера:", error);
        }
    }

    /**
     * Обрабатывает сохранение (создание или обновление) записи через API.
     * @param {import('./api.js').DbData} formData - Данные из полей формы.
     */
    async #handleSaveRecord(formData) {
        try {
            /** @type {import('./api.js').ApiResponse} */
            let response;

            if (formData.id) {
                // При наличии id отправляем запрос на обновление полей записи.
                const url = `${this.#baseUrl}${formData.id}/`
                response = await this.#apiService.patch(url, formData);
            } else {
                // При отсутствии - добавляем новую.
                response = await this.#apiService.post(this.#baseUrl, formData);

                // Добавляем сгенерированный id к объекту.
                if (response.status === 'success') {
                    if (!response.data)
                        throw Error('В ответе сервера отсутствует обязательное поле "data".')
                    formData.id = response.data.id;
                }
            }

            // В случае успеха обновляем данные в таблице.
            if (response.status === 'success') {
                // получаем обогащенную запись для таблицы
                const record = await this.#getRecord(formData.id, true);

                this.#tableController.addOrUpdateRow(record);
                this.#formController.hide();
            }

            this.#infoController.showApiResponse(response);
        } catch (error) {
            this.#infoController.showError(error);
        }
    }

    /**
     * Получает одну запись от сервера.
     * @param {string|number} id - Идентификатор записи.
     * @param {boolean} enrich - Флаг обогащения данных.
     * @returns {Promise<import('./api.js').DbData>} Данные записи.
     */
    async #getRecord(id, enrich) {
        
        const url = `${this.#baseUrl}${id}/${enrich ? '?enrich_keys=true' : ''}`;

        const response = await this.#apiService.get(url);
        
        if (response.status !== 'success' || !response.data) {
            throw new Error(`Не удалось получить запись ${id}`);
        }
        
        return response.data;
    }

    /**
     * Обрабатывает удаление записи.
     * @param {string | number} id - id удаляемой записи.
     */
    async #handleDeleteRequest(id) {

        const isConfirmed = await this.#confirmController.open(
            "Подтверждение удаления", "Вы действительно хотите удалить эту запись?");
        
        if (!isConfirmed) return;

        try {
            const url = `${this.#baseUrl}${id}/`;
            const response = await this.#apiService.delete(url);
            this.#formController.hide();

            if (response.status === 'success') {
                this.#tableController.deleteRow(id);
            }
            
            this.#infoController.showApiResponse(response);
        } catch (error) {
            this.#infoController.showError(error);
        }
    }

    /** 
     * Метод обрабатывает запрос на редактирование записи.
     * @param {string|number} itemId - Идентификатор записи.
     */
    async #handleEditRequest(itemId) {
        try {
            const url = `${this.#baseUrl}${itemId}/`;
            const response = await this.#apiService.get(url);
            const item = response.data;

            if (!item) 
                throw Error('В ответе сервера отсутствует обязательное поле "data".')

            this.#formController.openEdit(item);
        } catch (error) {
            alertError('Не удалось загрузить данные записи:', error);
        }
    }

    /**
     * Метод обрабатывает запрос на загрузку данных сторонней таблицы.
     * @param {string} apiPath - Путь запроса.
     * @param {string} elementId - Идентификатор элемента HTML.
     */
    async #handleForeignKeyLoad(apiPath, elementId) {
        try {
            const response = await this.#apiService.get(apiPath);
            this.#formController.renderSelectOptions(response.data, elementId)
        } catch (error) {
            alertError(`Ошибка загрузки справочника (${apiPath}):`, error);
            this.#formController.renderSelectError(elementId);
        }
    }
}

