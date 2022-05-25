const express = require('express')
const DepartmentController = require("../controllers/departmentController")
const auth = require('../middlewares/authMiddleware')
const router = express.Router()

router.post('/save', auth, DepartmentController.save)
router.post('/remove', auth, DepartmentController.remove)
router.get('/get-all', auth, DepartmentController.getAll)

module.exports = router
