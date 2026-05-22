const express = require('express');
const router = express.Router();
const { getCreators, getUser } = require('../controllers/userController');

router.get('/', getCreators);
router.get('/:id', getUser);

module.exports = router;
