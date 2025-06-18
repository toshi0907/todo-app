require('dotenv').config();

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json()); // JSON形式のリクエストボディをパースするために追加
app.use(express.static('public'));

// ルーティング分離
const todosRouter = require('./routes/todos');
const categoriesRouter = require('./routes/categories');

app.use('/', todosRouter);
app.use('/categories', categoriesRouter);

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
