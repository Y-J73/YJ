// 初始化 GUN
const gun = Gun({
    peers: ['https://gun-manhattan.herokuapp.com/gun']
});

// 遊戲狀態管理
const gameState = gun.get('cardGame');
const players = gameState.get('players');
const gameData = gameState.get('gameData');
let currentPlayer = null;

// 遊戲設置
const CARD_PAIRS = 8; // 8對牌，總共16張
const CARDS = [...Array(CARD_PAIRS).keys()].flatMap(i => [i, i]); // [0,0,1,1,2,2,...]

// DOM 元素
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const playerNameInput = document.getElementById('playerName');
const joinGameBtn = document.getElementById('joinGame');
const readyBtn = document.getElementById('ready-btn');
const leaveBtn = document.getElementById('leave-btn');
const playersList = document.getElementById('players');
const cardsContainer = document.getElementById('cards-container');
const currentTurnDiv = document.getElementById('current-turn');
const scoreBoardDiv = document.getElementById('score-board');

// 遊戲狀態
let selectedCards = [];
let canFlip = true;

// 加入遊戲
joinGameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (name) {
        currentPlayer = {
            id: Math.random().toString(36).substr(2, 9),
            name: name,
            ready: false,
            score: 0,
            joinedAt: Date.now()
        };
        
        players.get(currentPlayer.id).put(currentPlayer);
        loginSection.style.display = 'none';
        gameSection.style.display = 'block';
        
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
        cardsContainer.innerHTML = '';
    }
});

// 更新玩家列表和分數
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
        ${player.name} - ${player.score}分 
        ${player.ready ? '(已準備)' : '(未準備)'}
        ${id === currentPlayer?.id ? '(您)' : ''}
    `;
});

// 開始遊戲
function startGame() {
    const shuffledCards = CARDS.sort(() => Math.random() - 0.5);
    gameData.get('cards').put(shuffledCards);
    gameData.get('currentTurn').put(getFirstPlayer().id);
    
    renderCards(shuffledCards);
}

// 渲染卡片
function renderCards(cards) {
    cardsContainer.innerHTML = cards.map((value, index) => `
        <div class="card" data-index="${index}" data-value="${value}">
            <div class="card-front">${value}</div>
            <div class="card-back"></div>
        </div>
    `).join('');

    // 添加卡片點擊事件
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', () => handleCardClick(card));
    });
}

// 處理卡片點擊
function handleCardClick(card) {
    const gameData = gun.get('cardGame').get('gameData');
    
    gameData.get('currentTurn').once(currentTurnId => {
        if (!canFlip || 
            currentTurnId !== currentPlayer?.id || 
            card.classList.contains('flipped') || 
            card.classList.contains('matched')) {
            return;
        }

        card.classList.add('flipped');
        selectedCards.push(card);

        if (selectedCards.length === 2) {
            canFlip = false;
            checkMatch();
        }
    });
}

// 檢查配對
function checkMatch() {
    const [card1, card2] = selectedCards;
    const match = card1.dataset.value === card2.dataset.value;

    setTimeout(() => {
        if (match) {
            card1.classList.add('matched');
            card2.classList.add('matched');
            updateScore();
        } else {
            card1.classList.remove('flipped');
            card2.classList.remove('flipped');
            nextTurn();
        }
        
        selectedCards = [];
        canFlip = true;
    }, 1000);
}

// 更新分數
function updateScore() {
    if (currentPlayer) {
        currentPlayer.score += 1;
        players.get(currentPlayer.id).put(currentPlayer);
        checkGameEnd();
    }
}

// 下一個回合
function nextTurn() {
    let playersList = [];
    players.map().once((player, id) => {
        if (player) playersList.push({...player, id});
    });
    
    playersList.sort((a, b) => a.joinedAt - b.joinedAt);
    const currentIndex = playersList.findIndex(p => p.id === currentPlayer.id);
    const nextIndex = (currentIndex + 1) % playersList.length;
    
    gameData.get('currentTurn').put(playersList[nextIndex].id);
}

// 取得第一個玩家
function getFirstPlayer() {
    let firstPlayer = null;
    players.map().once((player, id) => {
        if (player && (!firstPlayer || player.joinedAt < firstPlayer.joinedAt)) {
            firstPlayer = {...player, id};
        }
    });
    return firstPlayer;
}

// 檢查遊戲結束
function checkGameEnd() {
    const matchedCards = document.querySelectorAll('.card.matched');
    if (matchedCards.length === CARDS.length) {
        let winner = null;
        players.map().once((player, id) => {
            if (!winner || player.score > winner.score) {
                winner = {...player, id};
            }
        });
        
        alert(`遊戲結束！勝利者：${winner.name}，得分：${winner.score}`);
        resetGame();
    }
}

// 重置遊戲
function resetGame() {
    players.map().once((player, id) => {
        if (player) {
            player.ready = false;
            player.score = 0;
            players.get(id).put(player);
        }
    });
    
    cardsContainer.innerHTML = '';
    selectedCards = [];
    canFlip = true;
}

// 監聽遊戲開始條件
players.map().on((player) => {
    if (!player) return;
    
    let allPlayers = [];
    players.map().once((p, id) => {
        if (p) allPlayers.push({...p, id});
    });
    
    if (allPlayers.length >= 2 && allPlayers.every(p => p.ready)) {
        startGame();
    }
});

// 監聽當前回合
gameData.get('currentTurn').on(currentTurnId => {
    if (!currentTurnId) return;
    
    players.get(currentTurnId).once(player => {
        if (player) {
            currentTurnDiv.textContent = `當前回合：${player.name}`;
        }
    });
});

// 監聽分數變化
players.map().on((player) => {
    if (!player) return;
    
    let scores = [];
    players.map().once((p, id) => {
        if (p) scores.push(`${p.name}: ${p.score}分`);
    });
    
    scoreBoardDiv.textContent = scores.join(' | ');
});