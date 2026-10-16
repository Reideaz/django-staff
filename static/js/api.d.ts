/**
 * Файл декларации типов TypeScript. 
 */

/** ИНТЕРФЕЙС МЕТАДАННЫХ ТАБЛИЦЫ */

/**
 * Варианты выбора в поле `select`.
 */
export interface SelectOption {
    value: string;
    label: string;
}

/**
 * Метаданные для поля типа 'foreign_key'
 */
export interface ReferenceMeta {
    api_path: string;
    value_field: string;
    label_field: string;
}

/**
 * Метаданные отдельного поля таблицы.
 */
export interface FieldMeta {
    name: string;
    label: string;
    type: 'string' | 'number' | 'select' | 'boolean' | 'foreign_key';
    required?: boolean;
    editable?: boolean;
    hidden?: boolean;
    min_value?: number;
    max_value?: number;
    max_length?: number;
    unique: boolean;
    options?: SelectOption[];
    reference?: ReferenceMeta;
}

/**
 * Метаданные таблицы базы данных.
 */
export interface TableMeta {
    title: string;
    fields: FieldMeta[];
}

/**
 * Функция возвращает метаданные только видимых полей для интерфейса пользователя.
 */
export function getVisibleMetaFields(tableMeta: TableMeta): FieldMeta[];



/** ИНТЕРФЕЙС СУЩНОСТЕЙ БАЗЫ ДАННЫХ */

/**
 * Базовая сущность. Обязательное поле id.
 */
export interface BaseEntity {
    id: string | number;
}

/**
 * Сущность из базы данных имеет обязательное поле базовой сущности (id)
 * и любой набор дополнительных полей.
 */
export type DbData = BaseEntity & Record<string, any>;



/** ИНТЕРФЕЙС ВЗАИМОДЕЙСТВИЯ С БЭКЕНДОМ DJANGO */

/** Объект-ответ возвращаемый бэкендом Django */
interface ApiResponse {
  status: 'success' | 'error';
  message: string;
  data?: DbData;
  error_details?: string;
}

/**
 * Функция для проверки структуры ответа бэкенда.
 * @param {any} object - Проверяемый объект
 * @returns {boolean} True, если объект соответствует структуре ApiResponse
 */
export function isApiResponse(object: any): boolean;