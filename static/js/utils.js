/**
 * Функция подбирает соответствующий типу ошибки способ вывода сообщения.
 * @param {string} messageBegin 
 * @param {unknown} error 
 */
export function alertError(messageBegin, error) {
    if (error instanceof Error) {
        alert(`${messageBegin} ${error.message}`);
    } else {
        alert(error);
    }
}

/**
 * Функция для массового создания и конфигурирования DOM-элементов.
 * 
 * Обеспечивает лаконичный синтаксис для построения вложенных структур,
 * заменяя многословный исходный синтаксис DOM в условиях запрета на 
 * использование сторонних компонентов (React).
 * 
 * @param {string} tagName - HTML-тег создаваемого элемента (например `div`).
 * @param {Object.<string, string|number|boolean|Object>|null|undefined} [attributes={}] 
 * - Объект атрибутов (`className`, `dataset` и др.).
 * @param {string|number|HTMLElement|Array.<HTMLElement|null|undefined>|null|undefined} [children] 
 * - Дочернее содержимое элемента.
 * Поддерживаемые типы:
 * - `string` / `number`: вставляет текстовый блок через `textContent`.
 * - `HTMLElement`: вкладывается как одиночный дочерний узел через `appendChild`.
 * - `Array`: массив дочерних элементов (null/undefined значения игнорируются).
 * @returns {HTMLElement} готовый HTML-элемент.
 */
export function createNode(tagName, attributes, children) {
    const element = document.createElement(tagName);

    if (attributes !== undefined && attributes !== null)
    {
        for (const [key, value] of Object.entries(attributes)) {
            if (value === undefined || value === null) continue;
    
            if (key === 'className' || key === 'class') {
                element.className = String(value);
            } else if (key === 'dataset' && typeof value === 'object') {
                Object.assign(element.dataset, value);
            } else {
                element.setAttribute(key, String(value));
            }
        }
    }

    if (children !== undefined && children !== null) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (child instanceof HTMLElement) 
                    element.appendChild(child);
            });
        } else if (children instanceof HTMLElement) {
            element.appendChild(children);
        } else {
            element.textContent = String(children);
        }
    }

    return element;
}
