const express = require('express');

const router = express.Router();

// simple demo admin
const adminUser = {
  id: 1,
  name: 'Admin',
  email: 'Alicage061@gmail.com',
  password: 'Alicage123',
  role: 'admin',
};

router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (email === adminUser.email && password === adminUser.password) {
      return res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          role: adminUser.role,
        },
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
});

module.exports = router;
