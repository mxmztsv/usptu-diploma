const db = require('../models')
const bcrypt = require("bcrypt")
const DateService = require("../services/dateService");
const sequelize = db.sequelize
const {QueryTypes} = require("sequelize");
const Employee = db.employees

/**
 * Функция сохранения сотрудника. Все аналогично как в departmentController
 */
const save = async (req, res) => {
    // Вытаскиваем поля из тела запроса
    const data = {
        Familiya: req.body.surname,
        Imya: req.body.name,
        Otchestvo: req.body.middleName,
        Data_Rozhdeniya: req.body.birthdate,
        Dolzhnost: req.body.position,
        Uchenaya_stepen: req.body.degree,
        Zvanie: req.body.rank,
        Data_priema: req.body.hiringDate,
        Id_podrazdeleniya: req.body.department,
        Login: req.body.login,
        Is_superuser: req.body.isSuperuser,
    }

    if (req.body.password !== undefined && req.body.password !== null && req.body.password.trim() !== '') {
        // Если передан пароль, то хэшируем пароль и добавляем в data
        console.log('pass', req.body.password)
        data.Password = await bcrypt.hash(req.body.password, 3)
    }

    // Устанавливаем стаж в годах
    data.Stazh = DateService.getExperienceByHiringDate(req.body.hiringDate)

    console.log(data)

    try {
        let candidate = null
        let employee
        if (req.body.id !== null && req.body.id !== undefined) {
            candidate = await Employee.findByPk(req.body.id)
        }
        if (candidate) {
            employee = await Employee.update(data, {
                where: {
                    Id_prepodavatelya: req.body.id
                }
            })
            // Получаем обновленного сотрудника из БД
            employee = await Employee.findByPk(req.body.id)
        } else {
            try {
                employee = await Employee.create(data)
            } catch (e) {
                console.error(e.message)
                return res.status(400).json({message: "Сотрудник с таким логином уже существует"})
            }
        }
        console.log(employee)
        res.status(201).json(employee)
    } catch (e) {
        console.error(e.message)
        res.sendStatus(500)
    }

}

/**
 * Функция удаления. Все аналогично как в departmentController
 */
const remove = async (req, res) => {
    try {
        const employee = await Employee.destroy({
            where: {
                "Id_prepodavatelya": req.body.id
            }
        })
        res.sendStatus(200)
    } catch (e) {
        console.error(e.message)
        res.sendStatus(500)
    }
}

/**
 * Функция получения сотрудника по id. Все аналогично как в departmentController
 */
const getEmployeeById = async (req, res) => {
    try {
        // Получаем подразделение из БД
        const employee = await Employee.findByPk(req.params.id)
        // Возвращаем в ответ код 200 (ОК) и подразделение
        res.status(200).send(employee)
    } catch (e) {
        console.error(e.message)
        // Если ловим ошибку, возвращаем 500 (Internal server error)
        res.sendStatus(500)
    }
}

/**
 * Функция получения всех сотрудников в порядке убывания времени с даты последнего ПК.
 */
const getAll = async (req, res) => {
    try {
        const employees = await Employee.findAll({
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                    SELECT "Data_zaversheniya"
                    FROM "Povyshenie kvalifikacii"
                    WHERE
                        "Povyshenie kvalifikacii"."Id_prepodavatelya" = "Sotrudnik"."Id_prepodavatelya"
                    ORDER BY "Data_zaversheniya" DESC LIMIT 1)`),
                        "PK"
                    ]
                ]
            },
            order: [
                [sequelize.literal("\"PK\"")]
            ]
        })
        res.status(200).send(employees)
    } catch (e) {
        console.error(e.message)
        res.sendStatus(500)
    }
}

/**
 * Функция получения всех сотрудников, проходивших ПК в заданный период.
 */
const getByTrainingPeriod = async (req, res) => {
    const {startDate, endDate} = req.query
    try {

        const employees = await sequelize.query(`SELECT *
                                                 FROM (SELECT *, (
                                                     SELECT "Data_zaversheniya"
                                                     FROM "Povyshenie kvalifikacii"
                                                     WHERE
                                                             "Povyshenie kvalifikacii"."Id_prepodavatelya" = "Sotrudnik"."Id_prepodavatelya"
                                                     ORDER BY "Data_zaversheniya" DESC LIMIT 1) AS "PK" FROM "Sotrudnik" AS "Sotrudnik" ORDER BY "PK") as "result"
                                                WHERE ("PK"::date >= cast('${startDate}' as date)
                                                AND "PK"::date <= cast('${endDate}' as date))
                                                `, {type: QueryTypes.SELECT})
        res.status(200).send(employees)
    } catch (e) {
        console.error(e.message)
        res.sendStatus(500)
    }
}

/**
 * Функция получения всех сотрудников, не проходивших ПК зп последние N лет.
 */
const getByPeriodWithoutTraining = async (req, res) => {
    const {yearsWithoutTraining} = req.query

    // Считаем пограничную дату для включения в запрос (текущая дата - переданное кол-во лет)
    let now = new Date()
    const rangeDateToIncludeInMilliseconds = new Date(now.setMonth(now.getMonth() - (parseInt(yearsWithoutTraining) * 12)))
    const rangeDateToInclude = `${rangeDateToIncludeInMilliseconds.getFullYear()}-${rangeDateToIncludeInMilliseconds.getMonth()}-${rangeDateToIncludeInMilliseconds.getDate()}`
    try {
        const employees = await sequelize.query(`SELECT *
                                                 FROM (SELECT *, (
                                                     SELECT "Data_zaversheniya"
                                                     FROM "Povyshenie kvalifikacii"
                                                     WHERE
                                                             "Povyshenie kvalifikacii"."Id_prepodavatelya" = "Sotrudnik"."Id_prepodavatelya"
                                                     ORDER BY "Data_zaversheniya" DESC LIMIT 1) AS "PK" FROM "Sotrudnik" AS "Sotrudnik" ORDER BY "PK") as "result"
                                                 WHERE "PK"::date <= cast('${rangeDateToInclude}' as date)
        `, {type: QueryTypes.SELECT})
        res.status(200).send(employees)
    } catch (e) {
        console.error(e.message)
        res.sendStatus(500)
    }
}

// Экспорт функций из модуля
module.exports = {
    save,
    remove,
    getAll,
    getEmployeeById,
    getByTrainingPeriod,
    getByPeriodWithoutTraining
}
