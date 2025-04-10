const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

// Настройка загрузки изображений
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/images"));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  },
});
const upload = multer({ storage });

// Middleware авторизации
function checkAuth(req, res, next) {
  if (req.session.isLoggedIn) {
    next();
  } else {
    res.redirect("/admin/login");
  }
}

// Авторизация
router.get("/login", (req, res) => {
  if (req.session.isLoggedIn) {
    return res.redirect("/admin/dashboard");
  }
  res.render("admin/login", { title: "Авторизация менеджера" });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query("SELECT * FROM managers WHERE username = ?", [username]);
    if (rows.length === 0) {
      return res.render("admin/login", { error: "Неверный логин или пароль" });
    }

    const manager = rows[0];
    const match = await bcrypt.compare(password, manager.password_hash);
    if (!match) {
      return res.render("admin/login", { error: "Неверный логин или пароль" });
    }

    req.session.isLoggedIn = true;
    req.session.userId = manager.id;
    return res.redirect("/admin/dashboard");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Ошибка сервера");
  }
});

// Выход
router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

// Дашборд — активные заказы
router.get("/dashboard", checkAuth, async (req, res) => {
    try {
      const [orders] = await pool.query("SELECT * FROM orders WHERE status != 'done'");
  
      // Получаем все товары для всех заказов сразу
      const [items] = await pool.query(`
        SELECT oi.*, mi.name, mi.weight 
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
      `);
  
      // Группируем по заказу
      const grouped = {};
      for (const item of items) {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      }
  
      // Добавляем товары к каждому заказу
      const enrichedOrders = orders.map(order => {
        return {
          ...order,
          items: grouped[order.id] || []
        };
      });
  
      const ORDER_STATUSES = [
        { value: "new", label: "Создан" },
        { value: "processing", label: "В обработке" },
        { value: "in_kitchen", label: "Готовится" },
        { value: "on_the_way", label: "В пути" },
        { value: "done", label: "Выполнен" },
        { value: "canceled", label: "Отменён" }
      ];
  
      res.render("admin/dashboard", {
        title: "Дашборд (активные заказы)",
        orders: enrichedOrders,
        statuses: ORDER_STATUSES
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Ошибка сервера");
    }
  });
  


// История заказов
router.get("/history", checkAuth, async (req, res) => {
  try {
    const [orders] = await pool.query("SELECT * FROM orders WHERE status = 'done'");
    res.render("admin/history", {
      title: "История заказов",
      orders,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

// Смена статуса заказа
router.post("/change-status", checkAuth, async (req, res) => {
  const { orderId, status } = req.body;
  try {
    await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, orderId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// Управление меню
router.get("/menu", checkAuth, async (req, res) => {
  try {
    const [categories] = await pool.query("SELECT * FROM categories");
    const [items] = await pool.query("SELECT * FROM menu_items ORDER BY id DESC");

    res.render("admin/menu", {
      title: "Управление меню",
      items,
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка сервера");
  }
});

// Создание новой позиции
router.post("/menu/create", checkAuth, upload.single("image"), async (req, res) => {
  const { name, price, weight, composition, category_id } = req.body;
  const isActive = req.body.is_active ? 1 : 0;
  const imageUrl = req.file ? "/images/" + req.file.filename : null;

  try {
    await pool.query(
      "INSERT INTO menu_items (name, price, weight, composition, image_url, is_active, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, price, weight, composition, imageUrl, isActive, category_id || null]
    );
    res.redirect("/admin/menu");
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при добавлении блюда");
  }
});

// Редактирование позиции
router.get("/menu/edit/:id", checkAuth, async (req, res) => {
  const id = req.params.id;
  try {
    const [rows] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).send("Позиция не найдена");

    const [categories] = await pool.query("SELECT * FROM categories");
    const item = rows[0];

    res.render("admin/edit_menu_item", {
      title: "Редактировать блюдо",
      item,
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при загрузке позиции");
  }
});

router.post("/menu/edit/:id", checkAuth, upload.single("image"), async (req, res) => {
  const id = req.params.id;
  const { name, price, weight, composition, category_id } = req.body;
  const isActive = req.body.is_active ? 1 : 0;

  try {
    const [rows] = await pool.query("SELECT * FROM menu_items WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).send("Блюдо не найдено");

    let imageUrl = rows[0].image_url;
    if (req.file) {
      imageUrl = "/images/" + req.file.filename;
    }

    await pool.query(
      "UPDATE menu_items SET name = ?, price = ?, weight = ?, composition = ?, image_url = ?, is_active = ?, category_id = ? WHERE id = ?",
      [name, price, weight, composition, imageUrl, isActive, category_id || null, id]
    );

    res.redirect("/admin/menu");
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при обновлении блюда");
  }
});

// Активация / Деактивация
router.post("/menu/toggle-active", checkAuth, async (req, res) => {
  const { itemId, newStatus } = req.body;
  try {
    await pool.query("UPDATE menu_items SET is_active = ? WHERE id = ?", [newStatus, itemId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: err.message });
  }
});

// Категории
router.get("/categories", checkAuth, async (req, res) => {
  try {
    const [categories] = await pool.query("SELECT * FROM categories ORDER BY id DESC");
    res.render("admin/categories", { title: "Категории", categories });
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при загрузке категорий");
  }
});

router.post("/categories/create", checkAuth, async (req, res) => {
  const { name } = req.body;
  try {
    await pool.query("INSERT INTO categories (name) VALUES (?)", [name]);
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при создании категории");
  }
});

router.post("/categories/delete", checkAuth, async (req, res) => {
  const { id } = req.body;
  try {
    await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    res.redirect("/admin/categories");
  } catch (err) {
    console.error(err);
    res.status(500).send("Ошибка при удалении категории");
  }
});

module.exports = router;
