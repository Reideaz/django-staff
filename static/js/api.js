/**
 * @param {import('./api.js').TableMeta} tableMeta
 */
export function getVisibleMetaFields(tableMeta) {
    return tableMeta.fields.filter(field => !field.hidden);
}

/**
 * @param {import('./api.js').TableMeta} tableMeta
 */
export function getEditableMetaFields(tableMeta) {
    return tableMeta.fields.filter(field => field.editable);
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