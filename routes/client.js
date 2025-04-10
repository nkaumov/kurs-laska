const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Главная страница — вывод списка блюд
// router.get('/', async (req, res) => {
//   try {
//     // Выводим только активные блюда
//     const [menuItems] = await pool.query('SELECT * FROM menu_items WHERE is_active = 1');
//     res.render('index', {
//       title: 'Меню ресторана',
//       menuItems
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Ошибка сервера');
//   }
// });

// Пример: страница корзины (пока пусто)
router.get('/cart', (req, res) => {
    res.render('cart', { title: 'Корзина' });
  });
  
  router.post('/order', async (req, res) => {
    const { full_name, phone, address, delivery_method, comment, cart } = req.body;
  
    if (!cart) return res.status(400).send('Корзина пуста');
  
    const items = JSON.parse(cart);
    if (!items.length) return res.status(400).send('Нет товаров');
  
    // Генератор номера заказа
    const generateOrderNumber = () => {
      const now = new Date();
      return 'ORD-' + now.getFullYear().toString().slice(-2) +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '-' +
        Math.floor(1000 + Math.random() * 9000);
    };
  
    const orderNumber = generateOrderNumber();
  
    try {
      const [result] = await pool.query(
        'INSERT INTO orders (order_number, full_name, phone, address, delivery_method, comment, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [orderNumber, full_name, phone, address, delivery_method, comment, 'new']
      );
  
      const orderId = result.insertId;
  
      for (let item of items) {
        await pool.query(
          'INSERT INTO order_items (order_id, menu_item_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.id, item.quantity, item.price, item.price * item.quantity]
        );
      }
  
      // Перенаправляем на страницу заказа
      res.redirect(`/order/${orderNumber}`);
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка при оформлении заказа');
    }
  });
  
  router.get('/order/:orderNumber', async (req, res) => {
    const { orderNumber } = req.params;
  
    try {
      const [[order]] = await pool.query(
        'SELECT * FROM orders WHERE order_number = ?', [orderNumber]
      );
  
      if (!order) {
        return res.status(404).send('Заказ не найден');
      }
  
      const [items] = await pool.query(`
        SELECT oi.*, mi.name 
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = ?
      `, [order.id]);
  
      res.render('order_status', {
        title: 'Ваш заказ',
        order,
        items
      });
  
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка сервера');
    }
  });
  

  router.get('/', async (req, res) => {
    try {
      const [categories] = await pool.query('SELECT * FROM categories');
      const [menuItems] = await pool.query('SELECT * FROM menu_items WHERE is_active = 1');
  
      res.render('index', {
        title: 'Меню ресторана',
        categories,
        menuItems
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Ошибка сервера');
    }
  });
  
  



module.exports = router;
