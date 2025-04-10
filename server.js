require('dotenv').config();
const express = require('express');
const exphbs  = require('express-handlebars');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const clientRoutes = require('./routes/client');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

const hbs = exphbs.create({
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views', 'layouts'),
    partialsDir: path.join(__dirname, 'views', 'partials'),
    helpers: {
        ifCond: function (v1, v2, options) {
          return v1 == v2 ? options.fn(this) : options.inverse(this);
        },
        includes: function (str, substr) {
          return typeof str === 'string' && str.includes(substr);
        },
        eq: function (a, b) {
          return a === b;
        }
      }
      
  });
  

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'some-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// ✅ ВАЖНО: используем `hbs.engine`, а не `exphbs.engine`
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
  });
  

app.use('/', clientRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
