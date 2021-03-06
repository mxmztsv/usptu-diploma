const {Sequelize, DataTypes} = require('sequelize') // Подключаем пакет ORM Sequelize
const {DB_NAME, DB_USER, DB_PASSWORD, DB_PORT, DB_HOST} = require("../config") // Подключаем параметры из конфига

// Инициализация БД с параметрами из конфига
const sequelize = new Sequelize(
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    {
        host: DB_HOST,
        dialect: 'postgres',
        port: DB_PORT
    }
)

// Проверка подключения к БД
sequelize.authenticate().then(() => {
    console.log("Connected to DB")
}).catch(err => {
    console.error('DB connection error: ' + err)
})

// Создаем объект db и кладем туда модуль Sequelize и модели
const db = {}

db.Sequelize = Sequelize
db.sequelize = sequelize

db.departments = require('./departmentModel.js')(sequelize, DataTypes)
db.employees = require('./employeeModel')(sequelize, DataTypes)
db.trainings = require('./trainingModel')(sequelize, DataTypes)
db.trainingForms = require('./trainingFormModel')(sequelize, DataTypes)
db.internshipForms = require('./internshipFormModel')(sequelize, DataTypes)

// Синхронизация с БД
db.sequelize.sync()
    .then(() => {
        console.log('The database is synchronized')
    })

// Relations
db.employees.belongsTo(db.departments, {
    foreignKey: 'Id_podrazdeleniya'
})

db.trainings.belongsTo(db.employees, {
    foreignKey: 'Id_prepodavatelya'
})

db.trainingForms.belongsTo(db.trainings, {
    foreignKey: 'Id_povysheniya_kvalifikacii'
})

db.internshipForms.belongsTo(db.trainings, {
    foreignKey: 'Id_povysheniya_kvalifikacii'
})

// Экспорт объекта db
module.exports = db
