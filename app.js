// 初始化 GUN
const gun = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun'] // 使用公共 relay peer
});

// 遊戲狀態管理
const gameState = gun.get('boardGame');
const players = gameState.get('players');
let currentPlayer = null;

// DOM 元素
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const playerNameInput = document.getElementById('playerName');
const joinGameBtn = document.getElementById('joinGame');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');
const playersList = document.getElementById('players');

// 加入遊戲
joinGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            ready: false,
            joinedAt: Date.now()
        };
        
        players.get(currentPlayer.id).put(currentPlayer);
        loginSection.style.display = 'none';
        gameSection.style.display = 'block';
        
        // 設置離線時自動移除玩家
        window.addEventListener('beforeunload', () => {
            if (currentPlayer) {
                players.get(currentPlayer.id).put(null);
            }
        });
    }
});

// 準備開始
readyBtn.addEventListener('click', () => {
    if (currentPlayer) {
        currentPlayer.ready = !currentPlayer.ready;
        players.get(currentPlayer.id).put(currentPlayer);
        readyBtn.textContent = currentPlayer.ready ? '取消準備' : '準備開始';
    }
});

// 離開遊戲
leaveBtn.addEventListener('click', () => {
    if (currentPlayer) {
        players.get(currentPlayer.id).put(null);
        currentPlayer = null;
        loginSection.style.display = 'block';
        gameSection.style.display = 'none';
        playerNameInput.value = '';
    }
});

// 更新玩家列表
players.map().on((player, id) => {
    if (player === null) {
        const playerElement = document.getElementById(`player-${id}`);
        if (playerElement) {
            playerElement.remove();
        }
        return;
    }

    let playerElement = document.getElementById(`player-${id}`);
    if (!playerElement) {
        playerElement = document.createElement('li');
        playerElement.id = `player-${id}`;
        playersList.appendChild(playerElement);
    }

    playerElement.innerHTML = `
        ${player.name} ${player.ready ? '(已準備)' : '(未準備)'}
        ${id === currentPlayer?.id ? '(您)' : ''}
    `;
});

// 檢查遊戲是否可以開始
players.map().on((player) => {
    if (!player) return;
    
    let allPlayers = [];
    players.map().once((p, id) => {
        if (p) allPlayers.push({...p, id});
    });
    
    // 當所有玩家都準備好時，可以開始遊戲
    if (allPlayers.length >= 2 && allPlayers.every(p => p.ready)) {
        console.log('遊戲可以開始了！');
        // TODO: 實現遊戲開始邏輯
    }
});