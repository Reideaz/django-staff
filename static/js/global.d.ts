// Файл глобального определения типов в проекте.

/**
 * Расширение прототипа Element.
 */
interface Element {
  /**
   * Поиск элемента через querySelector, но никогда не возвращает null.
   * @param {string} selector - CSS селектор для поиска элемента.
   * @throws {Error} Выбрасывает ошибку если элемент не найден.
   */
  queryNotNull<T extends HTMLElement = HTMLElement>(selector: string): T;
}

/**
 * Расширение прототипа Document
 */
interface Document {
  /**
   * Строгий поиск элемента по id, который никогда не возвращает null.
   * @param id - Строковое значение id элемента.
   * @throws {Error} Выбрасывает ошибку если элемент не найден.
   */
  getByIdNotNull<T extends HTMLElement = HTMLElement>(id: string): T;
}

interface Window {
  getByIdNotNull: typeof document.getByIdNotNull;
}
