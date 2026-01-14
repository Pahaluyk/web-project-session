// Конфигурация API
const API_BASE_URL = 'http://exam-api-courses.std-900.ist.mospolytech.ru/api';
const API_KEY = '70af9597-7164-4fd5-9cbb-486458c7f127'; 
const YANDEX_API_KEY = '87dee7f1-f97a-4f29-a6ad-7a51ac02e0a6'; 

// Утилиты для работы с уведомлениями
function showNotification(message, type = 'info') {
    const notificationsContainer = document.getElementById('notifications');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    notificationsContainer.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Утилита для выполнения запросов к API
async function apiRequest(endpoint, method = 'GET', data = null) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
    
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Ошибка при выполнении запроса');
        }
        
        return result;
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Глобальные переменные для курсов
let allCourses = [];
let filteredCourses = [];
let currentCoursePage = 1;
const coursesPerPage = 5;

// Загрузка курсов
async function loadCourses() {
    try {
        const courses = await apiRequest('/courses');
        allCourses = courses;
        filteredCourses = courses;
        displayCourses();
        setupCourseSearch();
    } catch (error) {
        showNotification('Ошибка при загрузке курсов: ' + error.message, 'danger');
    }
}

// Отображение курсов
function displayCourses() {
    const container = document.getElementById('courses-container');
    if (!container) return;
    
    const startIndex = (currentCoursePage - 1) * coursesPerPage;
    const endIndex = startIndex + coursesPerPage;
    const coursesToShow = filteredCourses.slice(startIndex, endIndex);
    
    if (coursesToShow.length === 0) {
        container.innerHTML = '<div class="col-12"><p class="text-center text-muted">Курсы не найдены</p></div>';
        updateCoursesPagination();
        return;
    }
    
    container.innerHTML = coursesToShow.map(course => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <p class="card-text">${course.description.length > 100 ? course.description.substring(0, 100) + '...' : course.description}</p>
                    <ul class="list-unstyled">
                        <li><strong>Преподаватель:</strong> ${course.teacher}</li>
                        <li><strong>Уровень:</strong> ${course.level}</li>
                        <li><strong>Длительность:</strong> ${course.total_length} недель (${course.week_length} ч/нед)</li>
                        <li><strong>Стоимость:</strong> ${course.course_fee_per_hour} руб/час</li>
                    </ul>
                </div>
                <div class="card-footer bg-transparent">
                    <button class="btn btn-primary w-100" onclick="openOrderModal(${course.id}, 'course')">
                        Подать заявку
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    updateCoursesPagination();
}

// Пагинация курсов
function updateCoursesPagination() {
    const paginationContainer = document.getElementById('courses-pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<ul class="pagination justify-content-center">';
    
    paginationHTML += `
        <li class="page-item ${currentCoursePage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeCoursePageHandler(${currentCoursePage - 1}); return false;">Предыдущая</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentCoursePage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeCoursePageHandler(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentCoursePage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeCoursePageHandler(${currentCoursePage + 1}); return false;">Следующая</a>
        </li>
    `;
    
    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;
}

// Обработчик смены страницы курсов
function changeCoursePageHandler(page) {
    const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
    if (page < 1 || page > totalPages) return;
    currentCoursePage = page;
    displayCourses();
    document.getElementById('courses').scrollIntoView({ behavior: 'smooth' });
}

// Настройка поиска курсов
function setupCourseSearch() {
    const nameInput = document.getElementById('course-name-search');
    const levelSelect = document.getElementById('course-level-search');
    
    if (!nameInput || !levelSelect) return;
    
    const filterCourses = () => {
        const nameFilter = nameInput.value.toLowerCase();
        const levelFilter = levelSelect.value;
        
        filteredCourses = allCourses.filter(course => {
            const nameMatch = course.name.toLowerCase().includes(nameFilter);
            const levelMatch = !levelFilter || course.level === levelFilter;
            return nameMatch && levelMatch;
        });
        
        currentCoursePage = 1;
        displayCourses();
    };
    
    nameInput.addEventListener('input', filterCourses);
    levelSelect.addEventListener('change', filterCourses);
}

// Глобальные переменные для формы заказа
let currentOrderData = null;
let orderModal = null;

// Открытие модального окна для оформления заявки
async function openOrderModal(id, type) {
    try {
        currentOrderData = {
            type: type,
            id: id,
            data: null,
            editMode: false
        };
        
        // Загрузка данных курса или репетитора
        if (type === 'course') {
            currentOrderData.data = await apiRequest(`/courses/${id}`);
        } else {
            currentOrderData.data = await apiRequest(`/tutors/${id}`);
        }
        
        // Инициализация модального окна (проверка существования элемента)
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            showNotification('Ошибка: модальное окно не найдено', 'danger');
            return;
        }
        
        if (!orderModal) {
            orderModal = new bootstrap.Modal(modalElement);
        }
        
        populateOrderForm();

        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.textContent = 'Отправить';
        submitBtn.onclick = submitOrder;

        orderModal.show();
        
    } catch (error) {
        showNotification('Ошибка при загрузке данных: ' + error.message, 'danger');
        console.error('Error in openOrderModal:', error);
    }
}

// Заполнение формы заявки
function populateOrderForm() {
    const { type, data, editMode } = currentOrderData;
    
    // Заголовок
    if (editMode) {
        document.getElementById('orderModalTitle').textContent = 'Редактирование заявки';
    } else {
        document.getElementById('orderModalTitle').textContent = 'Оформление заявки';
    }
    
    document.getElementById('order-type').value = type;
    document.getElementById('order-id').value = data.id;
    
    // Название и преподаватель
    if (type === 'course') {
        document.getElementById('order-name-label').textContent = 'Название курса';
        document.getElementById('order-name').value = data.name;
        document.getElementById('order-teacher').value = data.teacher;
        document.getElementById('teacher-field').classList.remove('d-none');
        document.getElementById('duration-field').classList.remove('d-none');
        document.getElementById('tutor-duration-field').classList.add('d-none');
        
        // Заполнение дат начала курса
        const dateSelect = document.getElementById('order-date');
        dateSelect.innerHTML = '<option value="">Выберите дату</option>';
        data.start_dates.forEach(dateTime => {
            const date = dateTime.split('T')[0];
            if (!Array.from(dateSelect.options).some(opt => opt.value === date)) {
                const option = document.createElement('option');
                option.value = date;
                option.textContent = formatDate(date);
                dateSelect.appendChild(option);
            }
        });
    } else {
        document.getElementById('order-name-label').textContent = 'Имя репетитора';
        document.getElementById('order-name').value = data.name;
        document.getElementById('teacher-field').classList.add('d-none');
        document.getElementById('duration-field').classList.add('d-none');
        document.getElementById('tutor-duration-field').classList.remove('d-none');
        
        // Для репетиторов - простой выбор даты
        const dateSelect = document.getElementById('order-date');
        dateSelect.innerHTML = '<option value="">Выберите дату</option>';
        const today = new Date();
        for (let i = 1; i <= 30; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);
            const dateStr = futureDate.toISOString().split('T')[0];
            const option = document.createElement('option');
            option.value = dateStr;
            option.textContent = formatDate(dateStr);
            dateSelect.appendChild(option);
        }
    }
    
    if (!editMode) {
        document.getElementById('order-time').innerHTML = '<option value="">Сначала выберите дату</option>';
        document.getElementById('order-time').disabled = true;
        document.getElementById('order-persons').value = 1;
        document.getElementById('order-tutor-duration').value = 1;
        document.querySelectorAll('.order-option').forEach(cb => cb.checked = false);
    }
    
    setupOrderFormHandlers();
}

// Настройка обработчиков формы
function setupOrderFormHandlers() {
    const dateSelect = document.getElementById('order-date');
    const timeSelect = document.getElementById('order-time');
    const personsInput = document.getElementById('order-persons');
    const tutorDurationInput = document.getElementById('order-tutor-duration');
    const optionCheckboxes = document.querySelectorAll('.order-option');
    
    // Обработчик выбора даты
    dateSelect.removeEventListener('change', handleDateChange);
    dateSelect.addEventListener('change', handleDateChange);
    
    // Обработчики для пересчета стоимости
    timeSelect.removeEventListener('change', calculateOrderPrice);
    timeSelect.addEventListener('change', calculateOrderPrice);
    
    personsInput.removeEventListener('input', calculateOrderPrice);
    personsInput.addEventListener('input', calculateOrderPrice);
    
    tutorDurationInput.removeEventListener('input', calculateOrderPrice);
    tutorDurationInput.addEventListener('input', calculateOrderPrice);
    
    optionCheckboxes.forEach(cb => {
        cb.removeEventListener('change', calculateOrderPrice);
        cb.addEventListener('change', calculateOrderPrice);
    });
    
    // Кнопка отправки
    const submitBtn = document.getElementById('submitOrderBtn');
    submitBtn.onclick = submitOrder;
}

// Обработчик выбора даты
function handleDateChange() {
    const { type, data } = currentOrderData;
    const selectedDate = document.getElementById('order-date').value;
    const timeSelect = document.getElementById('order-time');
    
    if (!selectedDate) {
        timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
        timeSelect.disabled = true;
        return;
    }
    
    timeSelect.innerHTML = '<option value="">Выберите время</option>';
    timeSelect.disabled = false;
    
    if (type === 'course') {
        // Фильтрация времени для выбранной даты
        const availableTimes = data.start_dates
            .filter(dt => dt.startsWith(selectedDate))
            .map(dt => dt.split('T')[1].substring(0, 5));
        
        availableTimes.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            const endTime = calculateEndTime(time, data.week_length);
            option.textContent = `${time} - ${endTime}`;
            timeSelect.appendChild(option);
        });
    } else {
        // Для репетиторов - стандартные временные слоты
        const times = ['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'];
        times.forEach(time => {
            const option = document.createElement('option');
            option.value = time;
            option.textContent = time;
            timeSelect.appendChild(option);
        });
    }
}

// Расчет времени окончания занятия
function calculateEndTime(startTime, duration) {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHours = hours + Math.floor(duration);
    const endMinutes = minutes + (duration % 1) * 60;
    return `${String(endHours).padStart(2, '0')}:${String(Math.floor(endMinutes)).padStart(2, '0')}`;
}

// Расчет стоимости заказа
function calculateOrderPrice() {
    const { type, data } = currentOrderData;
    const selectedDate = document.getElementById('order-date').value;
    const selectedTime = document.getElementById('order-time').value;
    const persons = parseInt(document.getElementById('order-persons').value) || 1;
    
    if (!selectedDate || !selectedTime) {
        document.getElementById('order-total-price').textContent = '0 руб';
        return;
    }
    
    let totalPrice = 0;
    let autoOptions = '';
    
    if (type === 'course') {
        const courseFeePerHour = data.course_fee_per_hour;
        const totalLength = data.total_length;
        const weekLength = data.week_length;
        const durationInHours = totalLength * weekLength;
        
        // Проверка дня недели (выходные/будни)
        const date = new Date(selectedDate);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isWeekendOrHoliday = isWeekend ? 1.5 : 1;
        
        // Надбавки за время
        const [hours] = selectedTime.split(':').map(Number);
        const morningSurcharge = (hours >= 9 && hours < 12) ? 400 : 0;
        const eveningSurcharge = (hours >= 18 && hours < 20) ? 1000 : 0;
        
        // Базовая стоимость
        totalPrice = ((courseFeePerHour * durationInHours * isWeekendOrHoliday) + morningSurcharge + eveningSurcharge) * persons;
        
        // Автоматические опции
        let discounts = [];
        let surcharges = [];
        
        // Скидка за раннюю регистрацию
        const today = new Date();
        const startDate = new Date(selectedDate);
        const daysDiff = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
        const earlyRegistration = daysDiff >= 30;
        if (earlyRegistration) {
            discounts.push('Скидка за раннюю регистрацию (-10%)');
        }
        
        // Скидка за групповую запись
        const groupEnrollment = persons >= 5;
        if (groupEnrollment) {
            discounts.push('Скидка за групповую запись (-15%)');
        }
        
        // Интенсивный курс
        const intensiveCourse = weekLength >= 5;
        if (intensiveCourse) {
            surcharges.push('Интенсивный курс (+20%)');
        }
        
        // Применение процентных модификаторов
        let percentModifier = 1;
        if (earlyRegistration) percentModifier *= 0.9;
        if (groupEnrollment) percentModifier *= 0.85;
        if (intensiveCourse) percentModifier *= 1.2;
        
        totalPrice *= percentModifier;
        
        // Пользовательские опции
        if (document.getElementById('option-supplementary').checked) {
            totalPrice += 2000 * persons;
        }
        if (document.getElementById('option-personalized').checked) {
            totalPrice += 1500 * totalLength;
        }
        if (document.getElementById('option-excursions').checked) {
            totalPrice *= 1.25;
            surcharges.push('Культурные экскурсии (+25%)');
        }
        if (document.getElementById('option-assessment').checked) {
            totalPrice += 300;
        }
        if (document.getElementById('option-interactive').checked) {
            totalPrice *= 1.5;
            surcharges.push('Интерактивная платформа (+50%)');
        }
        
        // Отображение автоматических опций
        if (discounts.length > 0 || surcharges.length > 0) {
            autoOptions = '<div class="alert alert-success mb-2">';
            if (discounts.length > 0) {
                autoOptions += '<strong>Применены скидки:</strong> ' + discounts.join(', ') + '<br>';
            }
            if (surcharges.length > 0) {
                autoOptions += '<strong>Применены надбавки:</strong> ' + surcharges.join(', ');
            }
            autoOptions += '</div>';
        }
        
        // Отображение продолжительности курса
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + totalLength * 7);
        document.getElementById('order-duration-display').value = 
            `${totalLength} недель (до ${formatDate(endDate.toISOString().split('T')[0])})`;
        
    } else {
        // Для репетитора
        const duration = parseInt(document.getElementById('order-tutor-duration').value) || 1;
        const pricePerHour = data.price_per_hour;
        totalPrice = pricePerHour * duration * persons;
    }
    
    document.getElementById('auto-options').innerHTML = autoOptions;
    document.getElementById('order-total-price').textContent = Math.round(totalPrice) + ' руб';
}

// Отправка заявки
async function submitOrder() {
    const { type, data } = currentOrderData;
    const form = document.getElementById('orderForm');
    
    // Валидация
    const selectedDate = document.getElementById('order-date').value;
    const selectedTime = document.getElementById('order-time').value;
    const persons = parseInt(document.getElementById('order-persons').value);
    
    if (!selectedDate || !selectedTime || !persons) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'warning');
        return;
    }
    
    // Сборка данных для отправки
    const orderData = {
        date_start: selectedDate,
        time_start: selectedTime,
        persons: persons,
        price: parseInt(document.getElementById('order-total-price').textContent.replace(' руб', '')),
        early_registration: false,
        group_enrollment: false,
        intensive_course: false,
        supplementary: document.getElementById('option-supplementary').checked,
        personalized: document.getElementById('option-personalized').checked,
        excursions: document.getElementById('option-excursions').checked,
        assessment: document.getElementById('option-assessment').checked,
        interactive: document.getElementById('option-interactive').checked
    };
    
    if (type === 'course') {
        orderData.course_id = data.id;
        orderData.tutor_id = 0;
        orderData.duration = data.total_length * data.week_length;
        
        // Автоматические опции
        const today = new Date();
        const startDate = new Date(selectedDate);
        const daysDiff = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
        orderData.early_registration = daysDiff >= 30;
        orderData.group_enrollment = persons >= 5;
        orderData.intensive_course = data.week_length >= 5;
    } else {
        orderData.tutor_id = data.id;
        orderData.course_id = 0;
        orderData.duration = parseInt(document.getElementById('order-tutor-duration').value);
    }
    
    try {
        await apiRequest('/orders', 'POST', orderData);
        showNotification('Заявка успешно отправлена!', 'success');
        orderModal.hide();
        form.reset();
    } catch (error) {
        showNotification('Ошибка при отправке заявки: ' + error.message, 'danger');
    }
}

// Форматирование даты
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('ru-RU', options);
}


// Глобальные переменные для репетиторов
let allTutors = [];
let filteredTutors = [];
let selectedTutorId = null;

// Загрузка репетиторов
async function loadTutors() {
    try {
        const tutors = await apiRequest('/tutors');
        allTutors = tutors;
        filteredTutors = tutors;
        populateLanguageFilter();
        displayTutors();
        setupTutorSearch();
    } catch (error) {
        showNotification('Ошибка при загрузке репетиторов: ' + error.message, 'danger');
    }
}

// Заполнение фильтра языков
function populateLanguageFilter() {
    const languageSelect = document.getElementById('tutor-language-search');
    if (!languageSelect) return;
    
    const languages = new Set();
    allTutors.forEach(tutor => {
        tutor.languages_offered.forEach(lang => languages.add(lang));
    });
    
    const sortedLanguages = Array.from(languages).sort();
    sortedLanguages.forEach(lang => {
        const option = document.createElement('option');
        option.value = lang;
        option.textContent = lang;
        languageSelect.appendChild(option);
    });
}

// Отображение репетиторов
function displayTutors() {
    const tableBody = document.getElementById('tutors-table-body');
    const noTutorsMessage = document.getElementById('no-tutors-message');
    
    if (!tableBody) return;
    
    if (filteredTutors.length === 0) {
        tableBody.innerHTML = '';
        if (noTutorsMessage) {
            noTutorsMessage.classList.remove('d-none');
        }
        return;
    }
    
    if (noTutorsMessage) {
        noTutorsMessage.classList.add('d-none');
    }
    
    tableBody.innerHTML = filteredTutors.map(tutor => `
        <tr id="tutor-row-${tutor.id}" class="${selectedTutorId === tutor.id ? 'table-row-selected' : ''}" onclick="selectTutor(${tutor.id})">
            <td>${tutor.name}</td>
            <td>${tutor.language_level}</td>
            <td>${tutor.languages_offered.join(', ')}</td>
            <td>${tutor.work_experience}</td>
            <td>${tutor.price_per_hour}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="event.stopPropagation(); openOrderModal(${tutor.id}, 'tutor')">
                    Выбрать
                </button>
            </td>
        </tr>
    `).join('');
}

// Выбор репетитора (подсветка строки)
function selectTutor(tutorId) {
    selectedTutorId = tutorId;
    displayTutors();
}

// Настройка поиска репетиторов
function setupTutorSearch() {
    const languageSelect = document.getElementById('tutor-language-search');
    const levelSelect = document.getElementById('tutor-level-search');
    
    if (!languageSelect || !levelSelect) return;
    
    const filterTutors = () => {
        const languageFilter = languageSelect.value;
        const levelFilter = levelSelect.value;
        
        filteredTutors = allTutors.filter(tutor => {
            const languageMatch = !languageFilter || tutor.languages_offered.includes(languageFilter);
            const levelMatch = !levelFilter || tutor.language_level === levelFilter;
            return languageMatch && levelMatch;
        });
        
        displayTutors();
    };
    
    languageSelect.addEventListener('change', filterTutors);
    levelSelect.addEventListener('change', filterTutors);
}

// Глобальные переменные для заявок в личном кабинете
let allOrders = [];
let currentOrderPage = 1;
const ordersPerPage = 5;
let orderDetailsModal = null;
let deleteConfirmModal = null;
let orderToDelete = null;

// Загрузка заявок пользователя
async function loadOrders() {
    try {
        const orders = await apiRequest('/orders');
        allOrders = orders;
        displayOrders();
    } catch (error) {
        showNotification('Ошибка при загрузке заявок: ' + error.message, 'danger');
    }
}

// Отображение заявок
async function displayOrders() {
    const tableContainer = document.getElementById('orders-table-container');
    const noOrdersMessage = document.getElementById('no-orders-message');
    
    if (!tableContainer) return;
    
    if (allOrders.length === 0) {
        tableContainer.innerHTML = '';
        if (noOrdersMessage) {
            noOrdersMessage.classList.remove('d-none');
        }
        document.getElementById('orders-pagination').innerHTML = '';
        return;
    }
    
    if (noOrdersMessage) {
        noOrdersMessage.classList.add('d-none');
    }
    
    const startIndex = (currentOrderPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToShow = allOrders.slice(startIndex, endIndex);
    
    // Загрузка информации о курсах и репетиторах
    const ordersWithDetails = await Promise.all(ordersToShow.map(async (order) => {
        let courseName = 'Не указано';
        try {
            if (order.course_id && order.course_id !== 0) {
                const course = await apiRequest(`/courses/${order.course_id}`);
                courseName = course.name;
            } else if (order.tutor_id && order.tutor_id !== 0) {
                const tutor = await apiRequest(`/tutors/${order.tutor_id}`);
                courseName = `Занятие с репетитором ${tutor.name}`;
            }
        } catch (error) {
            console.error('Ошибка загрузки деталей:', error);
        }
        return { ...order, courseName };
    }));
    
    tableContainer.innerHTML = `
        <div class="table-responsive">
            <table class="table table-hover table-striped">
                <thead class="table-primary">
                    <tr>
                        <th>№</th>
                        <th>Курс / Репетитор</th>
                        <th>Дата занятия</th>
                        <th>Общая стоимость</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordersWithDetails.map((order, index) => `
                        <tr>
                            <td>${startIndex + index + 1}</td>
                            <td>${order.courseName}</td>
                            <td>${formatDate(order.date_start)}</td>
                            <td>${order.price} руб</td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-info" onclick="showOrderDetails(${order.id})">Подробнее</button>
                                    <button class="btn btn-warning" onclick="editOrder(${order.id})">Изменить</button>
                                    <button class="btn btn-danger" onclick="confirmDeleteOrder(${order.id})">Удалить</button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    updateOrdersPagination();
}

// пагинация заявок
function updateOrdersPagination() {
    const paginationContainer = document.getElementById('orders-pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(allOrders.length / ordersPerPage);
    
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<ul class="pagination justify-content-center">';
    
    paginationHTML += `
        <li class="page-item ${currentOrderPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPageHandler(${currentOrderPage - 1}); return false;">Предыдущая</a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentOrderPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="changeOrderPageHandler(${i}); return false;">${i}</a>
            </li>
        `;
    }
    
    paginationHTML += `
        <li class="page-item ${currentOrderPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changeOrderPageHandler(${currentOrderPage + 1}); return false;">Следующая</a>
        </li>
    `;
    
    paginationHTML += '</ul>';
    paginationContainer.innerHTML = paginationHTML;
}

// Обработчик смены страницы заявок
function changeOrderPageHandler(page) {
    const totalPages = Math.ceil(allOrders.length / ordersPerPage);
    if (page < 1 || page > totalPages) return;
    currentOrderPage = page;
    displayOrders();
    document.getElementById('orders-section').scrollIntoView({ behavior: 'smooth' });
}

// Показать детали заявки
async function showOrderDetails(orderId) {
    try {
        const order = await apiRequest(`/orders/${orderId}`);
        
        let details = '<div class="order-details">';
        
        // Информация о курсе/репетиторе
        if (order.course_id && order.course_id !== 0) {
            const course = await apiRequest(`/courses/${order.course_id}`);
            details += `
                <h5>Информация о курсе</h5>
                <p><strong>Название:</strong> ${course.name}</p>
                <p><strong>Описание:</strong> ${course.description}</p>
                <p><strong>Преподаватель:</strong> ${course.teacher}</p>
                <p><strong>Уровень:</strong> ${course.level}</p>
            `;
        } else if (order.tutor_id && order.tutor_id !== 0) {
            const tutor = await apiRequest(`/tutors/${order.tutor_id}`);
            details += `
                <h5>Информация о репетиторе</h5>
                <p><strong>Имя:</strong> ${tutor.name}</p>
                <p><strong>Языки обучения:</strong> ${tutor.languages_offered.join(', ')}</p>
                <p><strong>Уровень:</strong> ${tutor.language_level}</p>
                <p><strong>Опыт работы:</strong> ${tutor.work_experience} лет</p>
            `;
        }
        
        details += `
            <hr>
            <h5>Детали заявки</h5>
            <p><strong>Дата начала:</strong> ${formatDate(order.date_start)}</p>
            <p><strong>Время начала:</strong> ${order.time_start}</p>
            <p><strong>Продолжительность:</strong> ${order.duration} часов</p>
            <p><strong>Количество студентов:</strong> ${order.persons}</p>
            
            <hr>
            <h5>Дополнительные опции</h5>
            <ul>
        `;
        
        if (order.early_registration) details += '<li>Скидка за раннюю регистрацию (-10%)</li>';
        if (order.group_enrollment) details += '<li>Скидка за групповую запись (-15%)</li>';
        if (order.intensive_course) details += '<li>Интенсивный курс (+20%)</li>';
        if (order.supplementary) details += '<li>Дополнительные учебные материалы</li>';
        if (order.personalized) details += '<li>Индивидуальные занятия</li>';
        if (order.excursions) details += '<li>Культурные экскурсии (+25%)</li>';
        if (order.assessment) details += '<li>Оценка уровня владения языком</li>';
        if (order.interactive) details += '<li>Доступ к интерактивной онлайн-платформе (+50%)</li>';
        
        details += `
            </ul>
            <hr>
            <h4>Общая стоимость: ${order.price} руб</h4>
        </div>
        `;
        
        document.getElementById('orderDetailsContent').innerHTML = details;
        
        const modalElement = document.getElementById('orderDetailsModal');
        if (!modalElement) {
            showNotification('Ошибка: модальное окно не найдено', 'danger');
            return;
        }
        
        if (!orderDetailsModal) {
            orderDetailsModal = new bootstrap.Modal(modalElement);
        }
        orderDetailsModal.show();
        
    } catch (error) {
        showNotification('Ошибка при загрузке деталей заявки: ' + error.message, 'danger');
        console.error('Error in showOrderDetails:', error);
    }
}

// Редактирование заявки
async function editOrder(orderId) {
    try {
        const order = await apiRequest(`/orders/${orderId}`);
        
        // Определяем тип заявки
        const type = order.course_id && order.course_id !== 0 ? 'course' : 'tutor';
        const id = type === 'course' ? order.course_id : order.tutor_id;
        
        // Загружаем данные курса/репетитора
        if (type === 'course') {
            currentOrderData = {
                type: type,
                id: id,
                data: await apiRequest(`/courses/${id}`),
                editMode: true,
                editOrderId: orderId,
                orderData: order
            };
        } else {
            currentOrderData = {
                type: type,
                id: id,
                data: await apiRequest(`/tutors/${id}`),
                editMode: true,
                editOrderId: orderId,
                orderData: order
            };
        }
        
        // Инициализация модального окна (проверка существования элемента)
        const modalElement = document.getElementById('orderModal');
        if (!modalElement) {
            showNotification('Ошибка: модальное окно не найдено', 'danger');
            return;
        }
        
        if (!orderModal) {
            orderModal = new bootstrap.Modal(modalElement);
        }
        
        // Заполнение формы
        populateOrderForm();
        
        // Заполняем существующие значения заявки
        document.getElementById('order-date').value = order.date_start;
        
        // Обработка выбора даты чтобы загрузить время
        handleDateChange();
        
        // Небольшая задержка для загрузки времени
        setTimeout(() => {
            document.getElementById('order-time').value = order.time_start;
            document.getElementById('order-persons').value = order.persons;
            
            if (type === 'tutor') {
                document.getElementById('order-tutor-duration').value = order.duration;
            }
            
            // Заполняем чекбоксы опций
            document.getElementById('option-supplementary').checked = order.supplementary || false;
            document.getElementById('option-personalized').checked = order.personalized || false;
            document.getElementById('option-excursions').checked = order.excursions || false;
            document.getElementById('option-assessment').checked = order.assessment || false;
            document.getElementById('option-interactive').checked = order.interactive || false;
            
            // Пересчитываем стоимость
            calculateOrderPrice();
        }, 200);
        
        // Меняем обработчик кнопки отправки
        const submitBtn = document.getElementById('submitOrderBtn');
        submitBtn.textContent = 'Сохранить';
        submitBtn.onclick = updateOrder;
        
        orderModal.show();
        
    } catch (error) {
        showNotification('Ошибка при загрузке заявки: ' + error.message, 'danger');
        console.error('Error in editOrder:', error);
    }
}

// Обновление заявки
async function updateOrder() {
    const { type, data, editOrderId } = currentOrderData;
    
    const selectedDate = document.getElementById('order-date').value;
    const selectedTime = document.getElementById('order-time').value;
    const persons = parseInt(document.getElementById('order-persons').value);
    
    if (!selectedDate || !selectedTime || !persons) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'warning');
        return;
    }
    
    const orderData = {
        date_start: selectedDate,
        time_start: selectedTime,
        persons: persons,
        price: parseInt(document.getElementById('order-total-price').textContent.replace(' руб', '')),
        supplementary: document.getElementById('option-supplementary').checked,
        personalized: document.getElementById('option-personalized').checked,
        excursions: document.getElementById('option-excursions').checked,
        assessment: document.getElementById('option-assessment').checked,
        interactive: document.getElementById('option-interactive').checked
    };
    
    if (type === 'course') {
        orderData.course_id = data.id;
        orderData.tutor_id = 0;
        orderData.duration = data.total_length * data.week_length;
        
        const today = new Date();
        const startDate = new Date(selectedDate);
        const daysDiff = Math.floor((startDate - today) / (1000 * 60 * 60 * 24));
        orderData.early_registration = daysDiff >= 30;
        orderData.group_enrollment = persons >= 5;
        orderData.intensive_course = data.week_length >= 5;
    } else {
        orderData.tutor_id = data.id;
        orderData.course_id = 0;
        orderData.duration = parseInt(document.getElementById('order-tutor-duration').value);
        orderData.early_registration = false;
        orderData.group_enrollment = false;
        orderData.intensive_course = false;
    }
    
    try {
        await apiRequest(`/orders/${editOrderId}`, 'PUT', orderData);
        showNotification('Заявка успешно обновлена!', 'success');
        orderModal.hide();
        
        // Сброс режима редактирования
        currentOrderData.editMode = false;
        document.getElementById('submitOrderBtn').textContent = 'Отправить';
        document.getElementById('submitOrderBtn').onclick = submitOrder;
        
        await loadOrders();
    } catch (error) {
        showNotification('Ошибка при обновлении заявки: ' + error.message, 'danger');
    }
}

// Подтверждение удаления заявки
function confirmDeleteOrder(orderId) {
    orderToDelete = orderId;
    
    const modalElement = document.getElementById('deleteConfirmModal');
    if (!modalElement) {
        showNotification('Ошибка: модальное окно не найдено', 'danger');
        return;
    }
    
    if (!deleteConfirmModal) {
        deleteConfirmModal = new bootstrap.Modal(modalElement);
    }
    
    document.getElementById('confirmDeleteBtn').onclick = deleteOrder;
    deleteConfirmModal.show();
}

// Удаление заявки
async function deleteOrder() {
    if (!orderToDelete) return;
    
    try {
        await apiRequest(`/orders/${orderToDelete}`, 'DELETE');
        showNotification('Заявка успешно удалена', 'success');
        deleteConfirmModal.hide();
        orderToDelete = null;
        await loadOrders();
    } catch (error) {
        showNotification('Ошибка при удалении заявки: ' + error.message, 'danger');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница загружена');
    
    // Проверка наличия API ключа
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showNotification('Внимание! Необходимо указать API ключ в файле script.js', 'warning');
    }
    
    // Загрузка данных на главной странице
    if (document.getElementById('courses-container')) {
        loadCourses();
        loadTutors();
    }
    
    // Загрузка заявок на странице личного кабинета
    if (document.getElementById('orders-table-container')) {
        loadOrders();
    }
    
    // Инициализация карты на главной странице
    if (document.getElementById('map')) {
        initMap();
    }
});

// === КАРТА УЧЕБНЫХ РЕСУРСОВ ===

let yandexMap = null;
let mapMarkers = [];

// Данные учебных ресурсов
const learningResources = [
    {
        name: 'Московский Политехнический Университет',
        address: 'ул. Большая Семёновская, 38',
        coords: [55.783421, 37.715351],
        type: 'educational',
        hours: '8:00 - 20:00',
        phone: '+7 (495) 223-05-23',
        description: 'Образовательное учреждение с курсами иностранных языков'
    },
    {
        name: 'Российская государственная библиотека',
        address: 'ул. Воздвиженка, 3/5',
        coords: [55.751574, 37.609218],
        type: 'library',
        hours: '9:00 - 21:00',
        phone: '+7 (495) 695-59-53',
        description: 'Крупнейшая библиотека России с обширной коллекцией иностранной литературы'
    },
    {
        name: 'Библиотека имени Ленина',
        address: 'ул. Моховая, 3',
        coords: [55.752004, 37.611862],
        type: 'library',
        hours: '10:00 - 20:00',
        phone: '+7 (495) 695-46-93',
        description: 'Публичная библиотека с ресурсами на иностранных языках'
    },
    {
        name: 'Британский Совет в Москве',
        address: 'ул. Никольская, 1',
        coords: [55.756630, 37.623130],
        type: 'cultural',
        hours: '9:00 - 18:00',
        phone: '+7 (495) 234-02-55',
        description: 'Культурный центр для изучения английского языка и британской культуры'
    },
    {
        name: 'Французский культурный центр',
        address: 'ул. Николоямская, 1',
        coords: [55.749767, 37.641891],
        type: 'cultural',
        hours: '10:00 - 19:00',
        phone: '+7 (495) 950-53-00',
        description: 'Изучение французского языка и культуры'
    },
    {
        name: 'Goethe-Institut Moskau',
        address: 'Ленинский проспект, 95А',
        coords: [55.684758, 37.560093],
        type: 'cultural',
        hours: '9:00 - 18:00',
        phone: '+7 (495) 536-24-00',
        description: 'Немецкий культурный центр с языковыми курсами'
    },
    {
        name: 'Speaking Club Moscow',
        address: 'Тверская ул., 12',
        coords: [55.762577, 37.611699],
        type: 'club',
        hours: '12:00 - 22:00',
        phone: '+7 (495) 629-45-67',
        description: 'Языковой клуб для разговорной практики'
    },
    {
        name: 'English Cafe',
        address: 'ул. Петровка, 26',
        coords: [55.762965, 37.614441],
        type: 'cafe',
        hours: '10:00 - 23:00',
        phone: '+7 (495) 987-65-43',
        description: 'Языковое кафе с разговорными клубами и занятиями'
    },
    {
        name: 'Полиглот Language Cafe',
        address: 'Кузнецкий мост, 21/5',
        coords: [55.759836, 37.623253],
        type: 'cafe',
        hours: '11:00 - 23:00',
        phone: '+7 (495) 123-45-67',
        description: 'Кафе для языкового обмена с носителями различных языков'
    },
    {
        name: 'МГУ им. М.В. Ломоносова',
        address: 'Ленинские горы, 1',
        coords: [55.703319, 37.530643],
        type: 'educational',
        hours: '8:00 - 20:00',
        phone: '+7 (495) 939-10-00',
        description: 'Ведущий университет с курсами иностранных языков'
    },
    {
        name: 'International Language Club',
        address: 'Новый Арбат, 24',
        coords: [55.752215, 37.586744],
        type: 'club',
        hours: '13:00 - 21:00',
        phone: '+7 (495) 234-56-78',
        description: 'Международный языковой клуб с носителями языка'
    },
    {
        name: 'Центральная городская библиотека',
        address: 'ул. Воронцово Поле, 6',
        coords: [55.760677, 37.649654],
        type: 'library',
        hours: '10:00 - 20:00',
        phone: '+7 (495) 917-43-21',
        description: 'Библиотека с читальным залом иностранной литературы'
    }
];

// Инициализация карты
function initMap() {
    if (typeof ymaps === 'undefined') {
        console.error('Яндекс.Карты не загружены');
        document.getElementById('map').innerHTML = '<div class="alert alert-warning">Для отображения карты необходимо указать API ключ Яндекс.Карт в index.html</div>';
        return;
    }
    
    ymaps.ready(function() {
        yandexMap = new ymaps.Map('map', {
            center: [55.751574, 37.617761], // Центр Москвы
            zoom: 11,
            controls: ['zoomControl', 'typeSelector', 'fullscreenControl']
        });
        
        // Добавление меток на карту
        addMarkersToMap();
        
        // Настройка фильтров
        setupMapFilters();
    });
}

// Добавление меток на карту
function addMarkersToMap() {
    learningResources.forEach(resource => {
        const placemark = new ymaps.Placemark(
            resource.coords,
            {
                balloonContentHeader: `<strong>${resource.name}</strong>`,
                balloonContentBody: `
                    <p><strong>Адрес:</strong> ${resource.address}</p>
                    <p><strong>Часы работы:</strong> ${resource.hours}</p>
                    <p><strong>Телефон:</strong> ${resource.phone}</p>
                    <p>${resource.description}</p>
                `,
                hintContent: resource.name
            },
            {
                preset: getPresetByType(resource.type),
                visible: true
            }
        );
        
        placemark.resourceType = resource.type;
        mapMarkers.push(placemark);
        yandexMap.geoObjects.add(placemark);
    });
}

// Получение иконки для типа ресурса
function getPresetByType(type) {
    const presets = {
        'educational': 'islands#blueEducationIcon',
        'library': 'islands#violetIcon',
        'cultural': 'islands#greenIcon',
        'cafe': 'islands#orangeIcon',
        'club': 'islands#redIcon'
    };
    return presets[type] || 'islands#blueIcon';
}

// Настройка фильтров карты
function setupMapFilters() {
    const filterCheckboxes = document.querySelectorAll('.map-filter');
    
    filterCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', filterMapMarkers);
    });
}

// Фильтрация меток на карте
function filterMapMarkers() {
    const activeFilters = Array.from(document.querySelectorAll('.map-filter:checked'))
        .map(cb => cb.value);
    
    mapMarkers.forEach(marker => {
        if (activeFilters.includes(marker.resourceType)) {
            marker.options.set('visible', true);
        } else {
            marker.options.set('visible', false);
        }
    });
}