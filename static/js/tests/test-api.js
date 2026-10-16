/**
 * Функция для быстрого получения куки по имени
 * @param {string} name - Имя куки
 * @returns {string} Значение куки
 */
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
};

fetch('http://127.0.0.1:8000/staff/api/position/', {
    method: 'PUT',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({
        id: 28,
        title: "Инженер-программист",
        category: "специалист"
    })
})
.then(response => response.json().then(data => ({ status: response.status, body: data })))
.then(res => console.log(`Статус ответа: ${res.status}`, res.body))
.catch(err => console.error('Ошибка сети:', err));