import { TableController } from '../table-controller.js';

const config = {
    title: "Список должностей",
    columns: [
        { 
            name: "id", 
            label: "id", 
            type: "number", 
            editable: 'False',
            hidden: 'True'
        },
        { 
            name: "title", 
            label: "Название", 
            type: "string", 
            required: 'True', 
            max_length: 150,
            unique: 'True'
        },
        { 
            name: "category", 
            label: "Категория", 
            type: "select", 
            required: 'True',
            options: [
                {"value": "руководитель", "label": "Руководитель"},
                {"value": "специалист", "label": "Специалист"},
                {"value": "служащий", "label": "Служащий"},
                {"value": "рабочий", "label": "Рабочий"}
            ]
        }
    ]
};

const items = 
[
    { id: 1, title: "Начальник отдела", category: "Руководитель" },
    { id: 2, title: "Разработчик", category: "Специалист" },
    { id: 3, title: "Охранник", category: "Рабочий" }
];

const tableContainer = document.getElementById('table-container');

const tableController = TableController.build(tableContainer, config);

tableController.render(items);

