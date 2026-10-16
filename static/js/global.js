
// @ts-ignore
Element.prototype.queryNotNull = function(selector) {
    const element = this.querySelector(selector);
    if (!element) {
        throw new Error(
            `Обязательный элемент "${selector}" отсутствует внутри <${this.tagName.toLowerCase()}>`
        );
    }
    return element;
};


// @ts-ignore
Document.prototype.getByIdNotNull = function(id) {
    const element = this.getElementById(id);
    if (!element) {
        throw new Error(`Обязательный элемент с id="${id}" отсутствует в документе HTML.`);
    }
    return element;
};
