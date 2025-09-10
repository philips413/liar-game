// 애플리케이션 전역 상태
const AppState = {
    currentScreen: 'main-screen',
    gameState: null,
    playerInfo: {
        id: null,
        nickname: null,
        isHost: false,
        role: null,
        cardWord: null
    },
    roomInfo: {
        code: null,
        maxPlayers: 6,
        roundLimit: 3,
        currentRound: 1,
        state: null
    },
    players: [],
    gamePhase: null,
    stompClient: null,
    isConnected: false,
    countdownTimer: null,
    currentModal: null
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    bindEventListeners();
});

// 앱 초기화
function initializeApp() {
    console.log('라이어 게임 앱 초기화 시작');
    showScreen('main-screen');
}

// 이벤트 리스너 바인딩
function bindEventListeners() {
    // 메인 화면
    document.getElementById('create-room-btn').addEventListener('click', () => {
        showScreen('create-room-screen');
    });
    
    document.getElementById('join-room-btn').addEventListener('click', () => {
        showScreen('join-room-screen');
    });

    // 방 생성
    document.getElementById('create-room-form').addEventListener('submit', handleCreateRoom);
    document.getElementById('create-back-btn').addEventListener('click', () => {
        showScreen('main-screen');
    });

    // 방 참가
    document.getElementById('join-room-form').addEventListener('submit', handleJoinRoom);
    document.getElementById('join-back-btn').addEventListener('click', () => {
        showScreen('main-screen');
    });

    // 대기실
    document.getElementById('start-game-btn').addEventListener('click', handleStartGame);
    document.getElementById('leave-room-btn').addEventListener('click', handleLeaveRoom);

    // 게임 화면 이벤트들
    bindGameEventListeners();

    // 모달 이벤트들
    bindModalEventListeners();
}

// 게임 관련 이벤트 리스너
function bindGameEventListeners() {
    // 설명 제출 - 이벤트 리스너는 ui.js의 showDescriptionPhase에서 관리
    const submitDescBtn = document.getElementById('submit-description-btn');
    submitDescBtn.addEventListener('click', handleSubmitDescription);

    // 투표 시작 (호스트)
    document.getElementById('start-voting-btn').addEventListener('click', handleStartVoting);
    
    // 설명 계속하기 (호스트)
    document.getElementById('continue-description-btn').addEventListener('click', handleContinueDescription);

    // 최후진술 제출 - 이벤트 리스너는 ui.js의 showFinalDefensePhase에서 관리
    const submitFinalDefenseBtn = document.getElementById('submit-final-defense-btn');
    submitFinalDefenseBtn.addEventListener('click', handleSubmitFinalDefense);

    // 생존/사망 투표 시작 (호스트)
    document.getElementById('start-final-voting-btn').addEventListener('click', handleStartFinalVoting);

    // 생존/사망 투표
    document.getElementById('survive-vote-btn').addEventListener('click', () => handleFinalVote('SURVIVE'));
    document.getElementById('eliminate-vote-btn').addEventListener('click', () => handleFinalVote('ELIMINATE'));

    // 다음 라운드 진행 (호스트)
    document.getElementById('proceed-next-round-btn').addEventListener('click', handleProceedNextRound);

    // 게임 종료 후
    document.getElementById('new-game-btn').addEventListener('click', handleNewGame);
    document.getElementById('exit-game-btn').addEventListener('click', handleExitGame);
}

// 모달 이벤트 리스너
function bindModalEventListeners() {
    // 설명 작성 모달
    document.getElementById('modal-submit-description-btn').addEventListener('click', handleModalSubmitDescription);
    document.getElementById('modal-cancel-description-btn').addEventListener('click', () => {
        hideModal('description-modal');
    });

    // 모든 설명 보기 모달
    document.getElementById('modal-close-descriptions-btn').addEventListener('click', () => {
        hideModal('all-descriptions-modal');
    });

    // 알림 모달 (있는 경우)
    const notificationCloseBtn = document.getElementById('notification-close-btn');
    if (notificationCloseBtn) {
        notificationCloseBtn.addEventListener('click', () => {
            hideModal('notification-modal');
        });
    }

    // 투표 결과 모달 (있는 경우)
    const voteResultCloseBtn = document.getElementById('vote-result-close-btn');
    if (voteResultCloseBtn) {
        voteResultCloseBtn.addEventListener('click', () => {
            hideModal('vote-result-modal');
        });
    }

    // 텍스트 입력 문자수 카운팅
    const modalDescInput = document.getElementById('modal-description-input');
    const modalDescCharCount = document.getElementById('modal-desc-char-count');
    modalDescInput.addEventListener('input', () => {
        modalDescCharCount.textContent = modalDescInput.value.length;
    });
}

// 모달 표시
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        AppState.currentModal = modalId;
        console.log(`모달 표시: ${modalId}`);
    }
}

// 모달 숨기기
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        if (AppState.currentModal === modalId) {
            AppState.currentModal = null;
        }
        console.log(`모달 숨김: ${modalId}`);
    }
}

// 게임 시작 카운트다운 표시
function showStartGameCountdown() {
    showModal('countdown-modal');
    
    let countdown = 5;
    const countdownElement = document.getElementById('countdown-number');
    
    // 카운트다운 업데이트
    const updateCountdown = () => {
        countdownElement.textContent = countdown;
        
        if (countdown > 0) {
            countdown--;
            AppState.countdownTimer = setTimeout(updateCountdown, 1000);
        } else {
            // 카운트다운 완료 후 게임 화면으로 전환
            hideModal('countdown-modal');
            showGameScreen();
        }
    };
    
    updateCountdown();
}

// 설명 작성 모달 표시
function showDescriptionModal() {
    const modalWordElement = document.getElementById('modal-my-word');
    const modalInput = document.getElementById('modal-description-input');
    const charCount = document.getElementById('modal-desc-char-count');
    
    // 내 단어 표시 (라이어의 경우 "???" 표시)
    if (AppState.playerInfo.role === 'LIAR') {
        modalWordElement.textContent = '???';
    } else {
        modalWordElement.textContent = AppState.playerInfo.cardWord || '???';
    }
    
    // 입력창 초기화
    modalInput.value = '';
    charCount.textContent = '0';
    
    showModal('description-modal');
}

// 설명 작성 모달 숨기기
function hideDescriptionModal() {
    hideModal('description-modal');
}

// 모든 설명 보기 모달 표시
function showAllDescriptionsModal(descriptions) {
    const container = document.getElementById('modal-all-descriptions');
    
    if (!descriptions || descriptions.length === 0) {
        container.innerHTML = '<div class="waiting-message">아직 작성된 설명이 없습니다.</div>';
    } else {
        container.innerHTML = descriptions.map(desc => `
            <div class="description-item">
                <div class="description-player">${desc.nickname}</div>
                <div class="description-text">${desc.text || desc.summary || '내용 없음'}</div>
            </div>
        `).join('');
    }
    
    showModal('all-descriptions-modal');
}

// 모달에서 설명 제출
function handleModalSubmitDescription() {
    const input = document.getElementById('modal-description-input');
    const text = input.value.trim();
    
    if (!text) {
        showNotification('설명을 입력해주세요.');
        return;
    }
    
    if (text.length > 200) {
        showNotification('설명은 200자 이하로 작성해주세요.');
        return;
    }
    
    // 메인 설명 입력 필드에 텍스트 설정
    const mainInput = document.getElementById('description-input');
    if (mainInput) {
        mainInput.value = text;
    }
    
    hideModal('description-modal');
    
    // 메인 화면의 제출 버튼을 프로그래밍 방식으로 클릭
    const mainSubmitBtn = document.getElementById('submit-description-btn');
    if (mainSubmitBtn && !mainSubmitBtn.disabled) {
        mainSubmitBtn.click();
    } else {
        showNotification('설명 제출 버튼을 찾을 수 없거나 이미 제출되었습니다.');
    }
}

// 화면 전환
function showScreen(screenId) {
    // 모든 화면 숨기기
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    // 지정된 화면 보이기
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
        AppState.currentScreen = screenId;
        console.log(`화면 전환: ${screenId}`);
    }
}

// 방 생성 처리
async function handleCreateRoom(event) {
    event.preventDefault();
    
    const nickname = document.getElementById('host-nickname').value.trim();
    const maxPlayers = parseInt(document.getElementById('max-players').value);
    const roundLimit = parseInt(document.getElementById('round-limit').value);

    if (!nickname) {
        showNotification('닉네임을 입력해주세요.');
        return;
    }

    showLoading(true);

    try {
        // 방 생성 API 호출
        const roomResponse = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                maxPlayers: maxPlayers,
                roundLimit: roundLimit
            })
        });

        if (!roomResponse.ok) {
            throw new Error('방 생성에 실패했습니다.');
        }

        const roomData = await roomResponse.json();
        const roomCode = roomData.roomCode;

        // 방 참가 API 호출
        const joinResponse = await fetch(`/api/rooms/${roomCode}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: nickname
            })
        });

        if (!joinResponse.ok) {
            throw new Error('방 참가에 실패했습니다.');
        }

        const joinData = await joinResponse.json();
        
        // 상태 업데이트
        AppState.playerInfo.id = joinData.playerId;
        AppState.playerInfo.nickname = nickname;
        AppState.playerInfo.isHost = true;  // 방 생성자는 항상 호스트
        AppState.roomInfo.code = roomCode;
        AppState.roomInfo.maxPlayers = maxPlayers;
        AppState.roomInfo.roundLimit = roundLimit;
        
        console.log('방 생성 완료 - 호스트 상태 설정:', AppState.playerInfo.isHost);
        console.log('플레이어 정보:', AppState.playerInfo);

        // WebSocket 연결
        await connectWebSocket();

        // 대기실로 이동
        showWaitingRoom();
        
    } catch (error) {
        console.error('방 생성 오류:', error);
        showNotification(error.message);
    } finally {
        showLoading(false);
    }
}

// 방 참가 처리
async function handleJoinRoom(event) {
    event.preventDefault();
    
    const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
    const nickname = document.getElementById('player-nickname').value.trim();

    if (!roomCode) {
        showNotification('방 코드를 입력해주세요.');
        return;
    }

    if (!nickname) {
        showNotification('닉네임을 입력해주세요.');
        return;
    }

    showLoading(true);

    try {
        // 방 참가 API 호출
        const joinResponse = await fetch(`/api/rooms/${roomCode}/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                nickname: nickname
            })
        });

        if (!joinResponse.ok) {
            let errorMessage = '방 참가에 실패했습니다.';
            
            try {
                const errorData = await joinResponse.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (parseError) {
                // JSON 파싱 실패시 상태 코드별 기본 메시지
                if (joinResponse.status === 404) {
                    errorMessage = '존재하지 않는 방 코드입니다.';
                } else if (joinResponse.status === 400) {
                    errorMessage = '방 참가 조건을 확인해주세요.';
                }
            }
            
            throw new Error(errorMessage);
        }

        const joinData = await joinResponse.json();
        
        // 상태 업데이트
        AppState.playerInfo.id = joinData.playerId;
        AppState.playerInfo.nickname = nickname;
        AppState.playerInfo.isHost = joinData.isHost || false;  // 서버에서 받은 호스트 정보 사용
        AppState.roomInfo.code = roomCode;
        
        console.log('방 참가 완료 - 호스트 상태:', AppState.playerInfo.isHost);
        console.log('플레이어 정보:', AppState.playerInfo);

        // WebSocket 연결
        await connectWebSocket();

        // 대기실로 이동
        showWaitingRoom();
        
    } catch (error) {
        console.error('방 참가 오류:', error);
        showNotification(error.message);
    } finally {
        showLoading(false);
    }
}

// 대기실 표시
function showWaitingRoom() {
    console.log('showWaitingRoom 호출 - 호스트 상태:', AppState.playerInfo.isHost);
    
    document.getElementById('waiting-room-code').textContent = AppState.roomInfo.code;
    document.getElementById('my-nickname').textContent = AppState.playerInfo.nickname;
    
    // 게임 시작 버튼 기본 숨김 처리
    const startGameBtn = document.getElementById('start-game-btn');
    if (startGameBtn) {
        startGameBtn.classList.add('hidden');
        console.log('게임 시작 버튼 기본 숨김 처리');
    }

    showScreen('waiting-room-screen');
    
    // 게임 시작 버튼 상태 즉시 업데이트
    console.log('updatePlayersList 호출 전 상태 확인');
    updatePlayersList();
    
    // 강제 업데이트도 함께 실행
    setTimeout(() => {
        forceUpdateStartGameButton();
    }, 100);
    
    // 방 상태 조회
    setTimeout(() => {
        console.log('loadRoomState 호출');
        loadRoomState();
    }, 500); // WebSocket 연결 안정화를 위한 지연
}

// 방 상태 조회
async function loadRoomState() {
    if (!AppState.roomInfo.code) {
        console.warn('방 코드가 없습니다.');
        return;
    }
    
    try {
        console.log('방 상태 조회 중...', AppState.roomInfo.code);
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/state`);
        
        if (response.ok) {
            const roomState = await response.json();
            console.log('방 상태 조회 성공:', roomState);
            updateRoomState(roomState);
        } else {
            console.error('방 상태 조회 실패:', response.status, response.statusText);
            if (response.status === 404) {
                showNotification('방을 찾을 수 없습니다.');
                showScreen('main-screen');
            }
        }
    } catch (error) {
        console.error('방 상태 조회 오류:', error);
        showNotification('방 상태를 불러오는데 실패했습니다.');
    }
}

// 게임 시작 처리
async function handleStartGame() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 게임을 시작할 수 있습니다.');
        return;
    }

    if (AppState.players.length < 3) {
        showNotification('게임을 시작하려면 최소 3명이 필요합니다.');
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/start?hostPlayerId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('게임 시작에 실패했습니다.');
        }

        console.log('게임 시작 성공');

    } catch (error) {
        console.error('게임 시작 오류:', error);
        showNotification(error.message);
    } finally {
        showLoading(false);
    }
}

// 방 나가기 처리
async function handleLeaveRoom() {
    if (confirm('정말로 방을 나가시겠습니까?')) {
        showLoading(true);

        try {
            await fetch(`/api/rooms/${AppState.roomInfo.code}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playerId: AppState.playerInfo.id
                })
            });

            // WebSocket 연결 해제
            if (AppState.stompClient && AppState.isConnected) {
                AppState.stompClient.disconnect();
                AppState.isConnected = false;
            }

            // 상태 초기화
            resetAppState();
            showScreen('main-screen');
            
        } catch (error) {
            console.error('방 나가기 오류:', error);
            showNotification('방 나가기에 실패했습니다.');
        } finally {
            showLoading(false);
        }
    }
}

// 앱 상태 초기화
function resetAppState() {
    AppState.gameState = null;
    AppState.playerInfo = {
        id: null,
        nickname: null,
        isHost: false,
        role: null,
        cardWord: null
    };
    AppState.roomInfo = {
        code: null,
        maxPlayers: 6,
        roundLimit: 3,
        currentRound: 1,
        state: null
    };
    AppState.players = [];
    AppState.gamePhase = null;
}

// 로딩 표시/숨김
function showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

// 알림 표시
function showNotification(message) {
    document.getElementById('notification-message').textContent = message;
    showModal('notification-modal');
}

// 모달 표시/숨김
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 유틸리티 함수들
function formatPlayerList(players) {
    if (!players || !Array.isArray(players)) {
        console.warn('플레이어 데이터가 유효하지 않습니다:', players);
        return [];
    }
    
    return players.map(player => {
        let badges = [];
        if (player.isHost) badges.push('호스트');
        if (player.playerId === AppState.playerInfo.id) badges.push('나');
        
        return {
            ...player,
            badgeText: badges.join(', ')
        };
    });
}

// 에러 핸들링
window.addEventListener('error', function(event) {
    console.error('전역 JavaScript 오류:', event.error);
    
    // 중요하지 않은 오류는 무시
    if (event.error && event.error.message && 
        (event.error.message.includes('ResizeObserver') || 
         event.error.message.includes('Non-Error promise rejection'))) {
        return;
    }
    
    showNotification('예기치 않은 오류가 발생했습니다. 페이지를 새로고침해보세요.');
});

// 처리되지 않은 Promise 거부 처리
window.addEventListener('unhandledrejection', function(event) {
    console.error('처리되지 않은 Promise 거부:', event.reason);
    
    // WebSocket 관련 오류는 별도 처리
    if (event.reason && event.reason.message && event.reason.message.includes('WebSocket')) {
        showNotification('서버 연결이 불안정합니다. 잠시 후 다시 시도해주세요.');
    } else {
        showNotification('네트워크 오류가 발생했습니다. 연결 상태를 확인해주세요.');
    }
    
    event.preventDefault();
});

// 네트워크 상태 모니터링
window.addEventListener('online', function() {
    console.log('네트워크 연결 복구됨');
    if (AppState.roomInfo.code && !AppState.isConnected) {
        showNotification('네트워크가 복구되었습니다. WebSocket을 재연결합니다.');
        // 재연결 시도
        setTimeout(() => {
            if (!AppState.isConnected) {
                connectWebSocket().catch(error => {
                    console.error('재연결 실패:', error);
                });
            }
        }, 1000);
    }
});

window.addEventListener('offline', function() {
    console.log('네트워크 연결 끊어짐');
    showNotification('네트워크 연결이 끊어졌습니다.');
});

// 페이지 새로고침 경고
window.addEventListener('beforeunload', function(event) {
    if (AppState.roomInfo.code && AppState.isConnected) {
        event.preventDefault();
        event.returnValue = '게임을 진행 중입니다. 페이지를 나가시겠습니까?';
        return event.returnValue;
    }
});