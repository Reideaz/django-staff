import { isApiResponse } from './api.js'

/**
 * Сервис обеспечивает сетевой обмен c сервером в формате JSON.
 */
export class ApiService {
    #csrfToken;

    /**
     * @param {string} csrfToken - CSRF токен для небезопасных запросов.
     */
    constructor(csrfToken) {
        this.#csrfToken = csrfToken;
    }

    /**
     * Универсальный метод для выполнения HTTP-запросов.
     * @param {String} endpoint - Конечная точка запроса.
     * @param {Object<string, any>} init  - Конфигурация запроса (метод, заголовок, тело).
     * @returns {Promise<import('./api.js').ApiResponse>} 
     * Возвращает стандартизированный ответ в формате JSON.
     */
    async #request(endpoint, init) {
        try {
            // ожидаем получения заголовка ответа
            const response = await fetch(endpoint, init);
            
            // контент может отсутствовать
            if (response.headers.get('content-length') === '0') {
                throw new Error(`Ошибка: ответ сервера не содержит контента.`)
            }

            // пытаемся определить тип контента и вернуть JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const apiResponse = await response.json();

                if (!isApiResponse(apiResponse)) {
                    throw new Error(`Ожидался стандартный ответ, но получен: ${typeof response}`)
                }
                return apiResponse;
            }

            // прилетело что-то иное: текст или html
            const text = await response.text();
            throw new Error(`Сервер вернул неверный формат данных: ${text}`);

        } catch (error) {
            // отлавливаем отсутствие сети и прочие ошибки
            if (error instanceof Error) {
                console.error(`Сбой при выполнении запроса к ${endpoint}`, error.message);
            } else {
                console.error(`Сбой при выполнении запроса к ${endpoint}`, error);
            }
            throw error;
        }
    }

    /**
     * Асинхронный GET-запрос для получения данных.
     * @param {string} endpoint - Конечная точка запроса.
     * @returns {Promise<import('./api.js').ApiResponse>} 
     * Возвращает стандартизированный ответ в формате JSON.
     */
    async get(endpoint) {
        return this.#request(endpoint, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });
    }

    /**
     * Асинхронный POST-запрос для создания данных.
     * @param {string} endpoint - Конечная точка запроса.
     * @param {object} data - Данные для отправки на сервер.
     * @returns {Promise<import('./api.js').ApiResponse>} 
     * Возвращает стандартизированный ответ в формате JSON.
     */
    async post(endpoint, data) {
        return this.#request(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': this.#csrfToken,
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * Асинхронный PATCH-запрос для обновления существующих данных.
     * @param {string} endpoint - Конечная точка запроса.
     * @param {object} data - Данные для отправки на сервер.
     * @returns {Promise<import('./api.js').ApiResponse>} 
     * Возвращает стандартизированный ответ в формате JSON.
     */
    async patch(endpoint, data) {
        return this.#request(endpoint, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRFToken': this.#csrfToken,
            },
            body: JSON.stringify(data)
        });
    }

    /**
     * Асинхронный DELETE-запрос для удаления данных.
     * @param {string} endpoint - Конечная точка запроса.
     * @returns {Promise<import('./api.js').ApiResponse>} 
     * Возвращает стандартизированный ответ в формате JSON.
     */
    async delete(endpoint) {
        return this.#request(endpoint, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'X-CSRFToken': this.#csrfToken,
            }
        });
    }

}
