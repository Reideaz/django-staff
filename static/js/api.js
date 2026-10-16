/**
 * @param {import('./api.js').TableMeta} tableMeta
 */
export function getVisibleMetaFields(tableMeta) {
    if (!tableMeta || !Array.isArray(tableMeta.fields)) {
        return [];
    }
    return tableMeta.fields.filter(field => !field.hidden);
}

/**
 * Функция для проверки структуры ответа бэкенда.
 * @param {any} object - Проверяемый объект
 * @returns {boolean} True, если объект соответствует структуре ApiResponse
 */
export function isApiResponse(object) {
    return (
        object !== null &&
        typeof object === 'object' &&
        (object.status === 'success' || object.status === 'error') &&
        typeof object.message === 'string'
    );
}