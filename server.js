const express = require('express');
const app = express();
const port = 3000;

app.use(express.static('./'));

app.listen(port, () => {
    console.log(`伺服器執行在 http://localhost:${port}`);
});