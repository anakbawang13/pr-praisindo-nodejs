var express = require('express');
var router = express.Router();
const validator = require('fastest-validator');
const v = new validator();
const { Users } = require("../models");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verify = require("../middleware/verify");

/* GET users listing. */
router.get('/', function (req, res, next) {
  res.send('respond with a resource');
});

router.post('/register', async (req, res) => {
  const schema = {
    name: "string",
    email: "string",
    password: "string",
    confPassword: "string",
  };
  const validate = v.validate(req.body, schema);
  if (validate.length) {
    return res.status(400).json(validate);
  }
  const { name, email, password, confPassword } = req.body;
  if (password != confPassword) {
    return res.status(400).json({ status: 400, message: "Password dan Confirm Password tidak cocok" });
  }
  const salt = await bcrypt.genSalt();
  const hashPassword = await bcrypt.hash(password, salt);

  try {
    const userCreate = await Users.create({
      name: name,
      email: email,
      password: hashPassword
    });
    if (userCreate) {
      return res.json({ status: 201, message: "Registrasi Berhasil" });
    } else {
      return res.status(401).json({ status: 401, message: "Gagal Register" });
    }
  } catch (error) {
    return res.status(401).json({ status: 401, message: error });
  }

});

router.post('/login', async (req, res) => {
  const schema = {
    email: "string",
    password: "string"
  };
  const validate = v.validate(req.body, schema);
  if (validate.length) {
    return res.status(400).json(validate);
  }
  try {
    const data = await Users.findOne({
      where: {
        email: req.body.email
      },
    });

    if (!data) return res.status(401).json({ status: 401, message: "Email Tidak Ditemukan" });

    const match = await bcrypt.compare(req.body.password, data.password);
    if (!match) {
      return res.status(401).json({ status: 401, message: "Password Salah" });
    }
    const id = data.id;
    const name = data.name;
    const email = data.email;

    const accessToken = jwt.sign({ id, name, email }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: '1d'
    });
    return res.json({
      status: 200,
      message: "Login Berhasil",
      data: data,
      token: accessToken
    });
  } catch (error) {
    return res.status(404).json({
      status: 404,
      message: `Terjadi Error : ${error}`,
    });
  }
});

router.put('/edit/:id', verify, async (req, res) => {
  const id = req.params.id;
  let users = await Users.findByPk(id);
  if (!users) {
    return res.status(404).json({
      status: 404,
      message: "Users Not Found"
    })
  }

  const schema = {
    name: "string",
    email: "string"
  }
  const validate = v.validate(req.body, schema);
  if (validate.length) {
    return res.status(422).json(validate);
  }

  users = await users.update(req.body);

  return res.json({
    status: 200,
    message: "Success Update User",
    data: users
  })
});

module.exports = router;
