// WebSocket 연결 및 게임 상태 관리

// WebSocket 연결
async function connectWebSocket() {
    return new Promise((resolve, reject) => {
        try {
            console.log('WebSocket 연결 시도...');
            
            // 기존 연결이 있다면 정리
            if (AppState.stompClient && AppState.isConnected) {
                console.log('기존 WebSocket 연결 정리...');
                AppState.stompClient.disconnect();
                AppState.isConnected = false;
            }
            
            const socket = new SockJS('/ws');
            AppState.stompClient = Stomp.over(socket);
            
            // 디버그 로그 활성화 (문제 해결을 위해)
            AppState.stompClient.debug = function(str) {
                console.log('STOMP: ' + str);
            };
            
            // 연결 타임아웃 설정
            const connectionTimeout = setTimeout(() => {
                console.error('WebSocket 연결 타임아웃');
                AppState.isConnected = false;
                reject(new Error('WebSocket 연결 시간이 초과되었습니다.'));
            }, 10000); // 10초 타임아웃
            
            AppState.stompClient.connect({}, 
                function(frame) {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket 연결 성공: ' + frame);
                    AppState.isConnected = true;
                    
                    // 방 토픽 구독
                    subscribeToRoom();
                    
                    resolve();
                },
                function(error) {
                    clearTimeout(connectionTimeout);
                    console.error('WebSocket 연결 실패:', error);
                    AppState.isConnected = false;
                    
                    // 상세한 오류 메시지 제공
                    let errorMessage = 'WebSocket 연결에 실패했습니다.';
                    if (error && error.toString) {
                        const errorStr = error.toString();
                        if (errorStr.includes('404')) {
                            errorMessage = '서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
                        } else if (errorStr.includes('timeout')) {
                            errorMessage = '연결 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
                        }
                    }
                    
                    reject(new Error(errorMessage));
                }
            );
        } catch (error) {
            console.error('WebSocket 초기화 오류:', error);
            reject(new Error('WebSocket 초기화 중 오류가 발생했습니다: ' + error.message));
        }
    });
}

// 방 토픽 구독
function subscribeToRoom() {
    if (AppState.stompClient && AppState.isConnected && AppState.roomInfo.code) {
        // 방별 토픽 구독
        AppState.stompClient.subscribe(`/topic/rooms/${AppState.roomInfo.code}`, function(message) {
            const data = JSON.parse(message.body);
            handleWebSocketMessage(data);
        });
        
        console.log(`방 토픽 구독: /topic/rooms/${AppState.roomInfo.code}`);
    }
}

// WebSocket 메시지 처리
function handleWebSocketMessage(data) {
    console.log('WebSocket 메시지 수신:', data);
    
    switch (data.type) {
        case 'PLAYER_JOINED':
            handlePlayerJoined(data);
            break;
        case 'PLAYER_LEFT':
            handlePlayerLeft(data);
            break;
        case 'ROOM_STATE_UPDATE':
            handleRoomStateUpdate(data);
            break;
        case 'GAME_STARTED':
            handleGameStarted(data);
            break;
        case 'ROUND_STATE':
            handleRoundStateUpdate(data);
            break;
        case 'ALL_DESCRIPTIONS_COMPLETE':
            handleAllDescriptionsComplete(data);
            break;
        case 'VOTE_RESULT':
            handleVoteResult(data);
            break;
        case 'FINAL_DEFENSE_COMPLETE':
            handleFinalDefenseComplete(data);
            break;
        case 'FINAL_VOTING':
            handleFinalVotingStart(data);
            break;
        case 'GAME_END':
            handleGameEnd(data);
            break;
        default:
            console.warn('알 수 없는 메시지 타입:', data.type);
    }
}

// 플레이어 참가 처리
function handlePlayerJoined(data) {
    console.log('플레이어 참가:', data);
    
    const player = data.data?.player;
    if (!player) {
        console.error('플레이어 데이터가 없습니다:', data);
        return;
    }
    
    // 플레이어 목록 업데이트
    const existingIndex = AppState.players.findIndex(p => p.playerId === player.playerId);
    if (existingIndex >= 0) {
        AppState.players[existingIndex] = player;
    } else {
        AppState.players.push(player);
    }
    
    updatePlayersList();
    showNotification(`${player.nickname}님이 참가했습니다.`);
}

// 플레이어 퇴장 처리
function handlePlayerLeft(data) {
    console.log('플레이어 퇴장:', data);
    
    const player = data.data?.player;
    if (!player) {
        console.error('플레이어 데이터가 없습니다:', data);
        return;
    }
    
    AppState.players = AppState.players.filter(p => p.playerId !== player.playerId);
    updatePlayersList();
    showNotification(`${player.nickname}님이 나갔습니다.`);
}

// 방 상태 업데이트 처리
function handleRoomStateUpdate(data) {
    console.log('방 상태 업데이트 수신:', data);
    
    if (data.data) {
        updateRoomState(data.data);
    }
}

// 게임 시작 처리
function handleGameStarted(data) {
    console.log('게임 시작:', data);
    
    AppState.gameState = data.gameState;
    AppState.roomInfo.state = 'ROUND';
    AppState.roomInfo.currentRound = 1;
    
    // 5초 카운트다운 시작
    showStartGameCountdown();
    
    // 내 정보 업데이트
    const myPlayer = data.players.find(p => p.playerId === AppState.playerInfo.id);
    if (myPlayer) {
        AppState.playerInfo.role = myPlayer.role;
        AppState.playerInfo.cardWord = myPlayer.cardWord;
    }
    
    // 플레이어 목록 업데이트
    AppState.players = data.players;
    
    showGameScreen();
    showNotification('게임이 시작되었습니다!');
}

// 라운드 상태 업데이트
function handleRoundStateUpdate(data) {
    console.log('라운드 상태 업데이트:', data);
    
    AppState.gamePhase = data.state;
    
    if (data.currentRound) {
        AppState.roomInfo.currentRound = data.currentRound;
    }
    
    updateGamePhaseDisplay(data);
}

// 모든 설명 완료 처리
function handleAllDescriptionsComplete(data) {
    console.log('모든 설명 완료:', data);
    
    // 설명 목록 표시
    displayAllDescriptions(data.descriptions);
    
    // 호스트에게만 투표 시작 버튼 표시
    showDescriptionCompletePhase();
}

// 투표 결과 처리
function handleVoteResult(data) {
    console.log('투표 결과:', data);
    
    displayVoteResult(data);
}

// 최후진술 완료 처리
function handleFinalDefenseComplete(data) {
    console.log('최후진술 완료:', data);
    
    showFinalDefenseCompletePhase(data);
}

// 생존/사망 재투표 시작
function handleFinalVotingStart(data) {
    console.log('재투표 시작:', data);
    
    showFinalVotingPhase(data.accusedPlayer);
}

// 게임 종료 처리
function handleGameEnd(data) {
    console.log('게임 종료:', data);
    
    // 게임 종료 화면을 먼저 보여줌
    showGameEndPhase(data);
    
    // 5초 후 자동으로 대기실로 이동
    setTimeout(() => {
        if (confirm('게임이 종료되었습니다. 대기실로 돌아가시겠습니까?')) {
            returnToWaitingRoom();
        }
    }, 3000);
}

// 방 상태 업데이트
function updateRoomState(roomState) {
    console.log('방 상태 업데이트:', roomState);
    
    if (roomState) {
        AppState.roomInfo = { ...AppState.roomInfo, ...roomState };
        AppState.players = roomState.players || [];
        
        console.log('업데이트된 플레이어 목록:', AppState.players);
        
        // 내 정보 업데이트
        const myPlayer = AppState.players.find(p => p.playerId === AppState.playerInfo.id);
        if (myPlayer) {
            const previousHost = AppState.playerInfo.isHost;
            AppState.playerInfo.isHost = myPlayer.isHost;
            console.log('호스트 상태 업데이트:', previousHost, '->', AppState.playerInfo.isHost);
        } else {
            console.warn('내 플레이어 정보를 찾을 수 없습니다. playerId:', AppState.playerInfo.id);
        }
        
        updatePlayersList();
        
        // 강제 버튼 업데이트
        setTimeout(() => {
            forceUpdateStartGameButton();
        }, 50);
        
        // 게임이 진행 중이면 게임 화면으로 이동
        if (roomState.state === 'ROUND') {
            showGameScreen();
            updateGameState(roomState);
        }
    }
}

// 게임 상태 업데이트
function updateGameState(gameState) {
    if (gameState.currentRound) {
        AppState.roomInfo.currentRound = gameState.currentRound;
    }
    
    if (gameState.gamePhase) {
        AppState.gamePhase = gameState.gamePhase;
        updateGamePhaseDisplay(gameState);
    }
    
    // 내 정보 업데이트
    if (gameState.players) {
        const myPlayer = gameState.players.find(p => p.playerId === AppState.playerInfo.id);
        if (myPlayer) {
            AppState.playerInfo.role = myPlayer.role;
            AppState.playerInfo.cardWord = myPlayer.cardWord;
        }
        AppState.players = gameState.players;
    }
    
    updateMyInfoDisplay();
    updateGamePlayersList();
}

// 설명 제출
async function handleSubmitDescription() {
    const descriptionText = document.getElementById('description-input').value.trim();
    
    if (!descriptionText) {
        showNotification('설명을 입력해주세요.');
        return;
    }
    
    // 중복 제출 방지
    const submitBtn = document.getElementById('submit-description-btn');
    if (submitBtn.disabled) {
        showNotification('이미 설명이 제출되었습니다.');
        return;
    }
    
    try {
        console.log('설명 제출 중:', { playerId: AppState.playerInfo.id, roomCode: AppState.roomInfo.code });
        
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/desc`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: AppState.playerInfo.id,
                description: descriptionText
            })
        });
        
        console.log('설명 제출 응답:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage = '설명 제출에 실패했습니다.';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                if (response.status === 400) {
                    errorMessage = '잘못된 설명 형식입니다.';
                } else if (response.status === 404) {
                    errorMessage = '방을 찾을 수 없습니다.';
                } else if (response.status === 409) {
                    errorMessage = '이미 설명을 제출했습니다.';
                }
            }
            
            throw new Error(errorMessage);
        }
        
        // UI 비활성화
        document.getElementById('description-input').disabled = true;
        submitBtn.disabled = true;
        
        showNotification('설명이 제출되었습니다. 다른 플레이어들을 기다리는 중...');
        
    } catch (error) {
        console.error('설명 제출 오류:', error);
        
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            showNotification('네트워크 연결을 확인해주세요.');
        } else {
            showNotification(error.message || '설명 제출 중 오류가 발생했습니다.');
        }
    }
}

// 투표 시작 (호스트)
async function handleStartVoting() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 투표를 시작할 수 있습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/start-voting?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('투표 시작에 실패했습니다.');
        }
        
        showNotification('투표를 진행하겠습니다.');
        
    } catch (error) {
        console.error('투표 시작 오류:', error);
        showNotification(error.message);
    }
}

// 투표 제출
async function handleVoteSubmit(targetPlayerId) {
    if (targetPlayerId === AppState.playerInfo.id) {
        showNotification('자기 자신에게 투표할 수 없습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: AppState.playerInfo.id,
                targetPlayerId: targetPlayerId,
                roundIdx: AppState.roomInfo.currentRound
            })
        });
        
        if (!response.ok) {
            throw new Error('투표 제출에 실패했습니다.');
        }
        
        // 투표 UI 비활성화
        document.querySelectorAll('.vote-player-card').forEach(card => {
            card.classList.add('disabled');
            card.style.pointerEvents = 'none';
        });
        
        showNotification('투표가 완료되었습니다.');
        
    } catch (error) {
        console.error('투표 제출 오류:', error);
        showNotification(error.message);
    }
}

// 최후진술 제출
async function handleSubmitFinalDefense() {
    const finalDefenseText = document.getElementById('final-defense-input').value.trim();
    
    if (!finalDefenseText) {
        showNotification('최후진술을 입력해주세요.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/final-defense`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: AppState.playerInfo.id,
                finalDefense: finalDefenseText
            })
        });
        
        if (!response.ok) {
            throw new Error('최후진술 제출에 실패했습니다.');
        }
        
        // UI 비활성화
        document.getElementById('final-defense-input').disabled = true;
        document.getElementById('submit-final-defense-btn').disabled = true;
        
        showNotification('최후진술이 제출되었습니다.');
        
    } catch (error) {
        console.error('최후진술 제출 오류:', error);
        showNotification(error.message);
    }
}

// 생존/사망 투표 시작 (호스트)
async function handleStartFinalVoting() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 재투표를 시작할 수 있습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/start-final-voting?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('재투표 시작에 실패했습니다.');
        }
        
        showNotification('생존/사망 투표를 시작합니다.');
        
    } catch (error) {
        console.error('재투표 시작 오류:', error);
        showNotification(error.message);
    }
}

// 생존/사망 투표 제출
async function handleFinalVote(decision) {
    // 중복 투표 방지
    const surviveBtn = document.getElementById('survive-vote-btn');
    const eliminateBtn = document.getElementById('eliminate-vote-btn');
    
    if (surviveBtn.disabled && eliminateBtn.disabled) {
        showNotification('이미 투표를 완료했습니다.');
        return;
    }
    
    try {
        console.log('최후진술 투표 제출:', { decision, playerId: AppState.playerInfo.id, roomCode: AppState.roomInfo.code });
        
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/final-vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                playerId: AppState.playerInfo.id,
                decision: decision
            })
        });
        
        console.log('최후진술 투표 응답:', response.status, response.statusText);
        
        if (!response.ok) {
            let errorMessage = '투표 제출에 실패했습니다.';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (parseError) {
                console.warn('응답 파싱 실패, 기본 에러 메시지 사용');
                if (response.status === 400) {
                    errorMessage = '잘못된 투표 요청입니다.';
                } else if (response.status === 404) {
                    errorMessage = '방을 찾을 수 없습니다.';
                } else if (response.status === 500) {
                    errorMessage = '서버 오류가 발생했습니다.';
                }
            }
            
            throw new Error(errorMessage);
        }
        
        // 성공한 경우 투표 버튼 비활성화
        surviveBtn.disabled = true;
        eliminateBtn.disabled = true;
        
        const decisionText = decision === 'SURVIVE' ? '생존' : '사망';
        showNotification(`${decisionText} 투표가 완료되었습니다.`);
        
    } catch (error) {
        console.error('생존/사망 투표 오류:', error);
        
        // 네트워크 오류와 서버 오류를 구분하여 처리
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            showNotification('네트워크 연결을 확인해주세요.');
        } else {
            showNotification(error.message || '투표 처리 중 오류가 발생했습니다.');
        }
    }
}

// 대기실로 돌아가기
function returnToWaitingRoom() {
    console.log('대기실로 돌아가는 중...');
    
    // 게임 상태 초기화
    AppState.gameState = null;
    AppState.gamePhase = null;
    AppState.roomInfo.state = 'LOBBY';
    AppState.roomInfo.currentRound = 1;
    
    // 플레이어 역할 초기화
    AppState.playerInfo.role = null;
    AppState.playerInfo.cardWord = null;
    
    // 플레이어들의 역할과 생존 상태 초기화
    AppState.players = AppState.players.map(player => ({
        ...player,
        role: 'CITIZEN',
        isAlive: true,
        cardWord: null
    }));
    
    // 대기실 화면으로 전환
    showWaitingRoom();
}

// 새 게임 시작
async function handleNewGame() {
    returnToWaitingRoom();
}

// 게임 종료 후 나가기
async function handleExitGame() {
    await handleLeaveRoom();
}

// 설명 계속하기 (호스트)
async function handleContinueDescription() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 설명 단계를 계속할 수 있습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/continue-description?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '설명 계속하기에 실패했습니다.');
        }
        
        showNotification('설명 단계가 계속됩니다.');
        
    } catch (error) {
        console.error('설명 계속하기 오류:', error);
        showNotification(error.message || '설명 계속하기 중 오류가 발생했습니다.');
    }
}

// 다음 라운드 진행 (호스트)
async function handleProceedNextRound() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 다음 라운드를 진행할 수 있습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/proceed-next-round?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '다음 라운드 진행에 실패했습니다.');
        }
        
        showNotification('다음 라운드가 시작됩니다.');
        
    } catch (error) {
        console.error('다음 라운드 진행 오류:', error);
        showNotification(error.message || '다음 라운드 진행 중 오류가 발생했습니다.');
    }
}

// WebSocket 연결 해제
function disconnectWebSocket() {
    if (AppState.stompClient && AppState.isConnected) {
        AppState.stompClient.disconnect();
        AppState.isConnected = false;
        console.log('WebSocket 연결 해제');
    }
}