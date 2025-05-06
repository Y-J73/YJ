const express = require('express');
const Gun = require('gun');
const app = express();
const port = 3000;

app.use(Gun.serve);
app.use(express.static('./'));

const server = app.listen(port, () => {
    console.log(`伺服器執行在 http://localhost:${port}`);
});

// 初始化 Gun
const gun = Gun({
    web: server,
    peers: ['http://localhost:3000/gun'] // 本地伺服器設定
});