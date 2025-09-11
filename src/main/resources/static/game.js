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
        case 'DESCRIPTION_PHASE_STARTED':
            handleDescriptionPhaseStarted(data);
            break;
        case 'GAME_END':
            handleGameEnd(data);
            break;
        case 'GAME_INTERRUPTED':
            handleGameInterrupted(data);
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
    
    // 새로운 메시지 구조에서 데이터 추출
    const gameData = data.data || data;
    const gameState = gameData.gameState;
    const players = gameData.players || gameState?.players || AppState.players;

    console.log('게임 데이터:', gameData);
    console.log('게임 상태:', gameState);
    console.log('플레이어 목록:', players);

    // 게임 상태 업데이트
    AppState.gameState = gameState;
    AppState.roomInfo.state = gameData.roomState || 'ROUND';
    AppState.roomInfo.currentRound = gameData.currentRound || 1;

    // 5초 카운트다운 시작
    showStartGameCountdown();

    // 플레이어 목록 업데이트
    if (players && Array.isArray(players)) {
        AppState.players = players;

        // 내 정보 업데이트
        const myPlayer = players.find(p => p.playerId === AppState.playerInfo.id);
        if (myPlayer) {
            AppState.playerInfo.role = myPlayer.role;
            AppState.playerInfo.cardWord = myPlayer.cardWord;
            console.log('내 역할 업데이트:', AppState.playerInfo.role, '카드 단어:', AppState.playerInfo.cardWord);
        } else {
            console.warn('내 플레이어 정보를 찾을 수 없습니다. playerId:', AppState.playerInfo.id);
        }
    } else {
        console.warn('플레이어 목록이 없습니다. 기존 상태 유지');
    }
    
    showGameScreen();
    showNotification('게임이 시작되었습니다!');
}

// 설명 단계 시작 처리
function handleDescriptionPhaseStarted(data) {
    console.log('설명 단계 시작:', data);
    
    // 호스트 시작 컨트롤 숨김
    const hostStartControls = document.getElementById('host-start-controls');
    if (hostStartControls) {
        hostStartControls.remove();
    }
    
    // 모든 플레이어에게 설명 단계 표시
    showDescriptionPhase();
    // 모든 플레이어에게 설명 팝업 바로 표시
    showDescriptionModal();
    showNotification('설명 단계가 시작되었습니다!');
}

// 라운드 상태 업데이트
function handleRoundStateUpdate(data) {
    const gameData = data.data || data;
    console.log('라운드 상태 업데이트:', gameData);
    
    AppState.gamePhase = gameData.state;
    
    if (gameData.currentRound) {
        AppState.roomInfo.currentRound = gameData.currentRound;
    }
    
    updateGamePhaseDisplay(gameData);
}

// 모든 설명 완료 처리
function handleAllDescriptionsComplete(data) {
    const gameData = data.data || data;
    console.log('모든 설명 완료:', gameData);
    console.log('descriptions 데이터:', gameData.descriptions);
    
    // 설명 목록 표시
    showAllDescriptionsModal(gameData.descriptions);
    
    // 호스트에게만 투표 시작 버튼 표시
    showDescriptionCompletePhase();
}

// 투표 결과 처리
function handleVoteResult(data) {
    const gameData = data.data || data;
    console.log('=== 투표 결과 처리 시작 ===');
    console.log('원본 데이터:', data);
    console.log('처리할 데이터:', gameData);
    console.log('현재 플레이어 정보:', AppState.playerInfo);
    
    // 먼저 투표 결과를 표시
    displayVoteResult(gameData);
    
    // 지목자가 있으면 최후진술 팝업 자동 표시
    if (gameData.accusedName && gameData.accusedId) {
        const accusedPlayer = {
            playerId: gameData.accusedId,
            nickname: gameData.accusedName
        };
        
        console.log('지목자 정보:', accusedPlayer);
        console.log('현재 플레이어 ID:', AppState.playerInfo.id);
        
        // 3초 후에 최후진술 팝업 표시 (투표 결과를 보여준 후)
        setTimeout(() => {
            if (gameData.accusedId === AppState.playerInfo.id) {
                // 지목된 플레이어가 본인인 경우 최후진술 모달 표시
                console.log('지목된 플레이어가 본인임 - 최후진술 모달 표시');
                showFinalDefenseModal();
            }
            // 최후진술 단계 화면으로 전환
            showFinalDefensePhase(accusedPlayer);
        }, 3000);
    } else {
        console.log('지목자 없음 또는 데이터 누락:', {
            accusedName: gameData.accusedName,
            accusedId: gameData.accusedId
        });
    }
}

// 최후진술 완료 처리
function handleFinalDefenseComplete(data) {
    const gameData = data.data || data;
    console.log('최후진술 완료:', gameData);
    
    // 모든 플레이어에게 최후진술 내용을 모달로 표시
    if (gameData.finalDefenseText && gameData.accusedPlayer) {
        showFinalDefenseResultModal(gameData.accusedPlayer, gameData.finalDefenseText);
    }
    
    showFinalDefenseCompletePhase(gameData);
}

// 생존/사망 재투표 시작
function handleFinalVotingStart(data) {
    const gameData = data.data || data;
    console.log('재투표 시작:', gameData);
    
    showFinalVotingPhase(gameData.accusedPlayer);
}

// 게임 종료 처리
function handleGameEnd(data) {
    const gameData = data.data || data;
    console.log('게임 종료:', gameData);
    
    // 게임 종료 화면을 먼저 보여줌
    showGameEndPhase(gameData);
    
    // 5초 후 자동으로 대기실로 이동
    setTimeout(() => {
        if (confirm('게임이 종료되었습니다. 대기실로 돌아가시겠습니까?')) {
            returnToWaitingRoom();
        }
    }, 3000);
}

// 게임 중단 처리
function handleGameInterrupted(data) {
    console.log('게임 중단:', data);
    
    const leftPlayer = data.data?.leftPlayer;
    const playerName = leftPlayer ? leftPlayer.nickname : '한 플레이어';
    const message = data.data?.message || `${playerName}가 나가서 게임을 진행할 수 없습니다. 대기실로 이동합니다.`;
    
    // 모달 창으로 게임 중단 메시지 표시
    showGameInterruptedModal(message, playerName);
    
    // 게임 상태 초기화하고 대기실로 이동
    setTimeout(() => {
        returnToWaitingRoom();
    }, 3000);
}

// 게임 중단 모달 표시
function showGameInterruptedModal(message, playerName) {
    // 기존 모달들 모두 닫기
    hideAllModals();
    
    const modalHTML = `
        <div id="game-interrupted-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content" style="text-align: center; padding: 30px; max-width: 400px;">
                <div style="font-size: 24px; margin-bottom: 20px;">⚠️</div>
                <h3 style="color: #e74c3c; margin-bottom: 20px;">게임 중단</h3>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    ${message}
                </p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 14px; color: #6c757d; margin: 0;">
                        잠시 후 자동으로 대기실로 이동합니다...
                    </p>
                </div>
                <button onclick="hideGameInterruptedModal(); returnToWaitingRoom();" 
                        class="modal-btn primary-btn" 
                        style="width: 100%; padding: 12px;">
                    대기실로 이동
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
async function handleSubmitDescription(customText = null) {
    let descriptionText = customText;
    
    // customText가 없으면 모달에서 가져오기
    if (!descriptionText) {
        const modalInput = document.getElementById('modal-description-input');
        descriptionText = modalInput ? modalInput.value.trim() : '';
    }
    
    if (!descriptionText) {
        showNotification('설명을 입력해주세요.');
        return;
    }
    
    // 중복 제출 방지 (모달 버튼 체크)
    const modalSubmitBtn = document.getElementById('modal-submit-description-btn');
    if (modalSubmitBtn && modalSubmitBtn.disabled) {
        showNotification('이미 설명이 제출되었습니다.');
        return;
    }
    
    try {
        let _modalInput = document.getElementById('modal-description-input').value;

        console.log('설명 제출 중:', { playerId: AppState.playerInfo.id, roomCode: AppState.roomInfo.code });
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/desc?playerId=${AppState.playerInfo.id}&text=${encodeURIComponent(_modalInput)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
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
        
        // 모달 UI 비활성화
        const modalInput = document.getElementById('modal-description-input');
        if (modalInput) {
            modalInput.disabled = true;
        }
        if (modalSubmitBtn) {
            modalSubmitBtn.disabled = true;
        }
        
        // 모달 닫기
        hideDescriptionModal();
        
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
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/vote?voterId=${AppState.playerInfo.id}&targetId=${targetPlayerId}&roundIdx=${AppState.roomInfo.currentRound}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
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

// 최후진술 모달 표시
function showFinalDefenseModal() {
    console.log('최후진술 모달 표시');
    
    // 모달 입력 필드 초기화
    const modalInput = document.getElementById('modal-final-defense-input');
    const charCount = document.getElementById('modal-final-char-count');
    const submitBtn = document.getElementById('modal-submit-final-defense-btn');
    
    if (modalInput) {
        modalInput.value = '';
        modalInput.disabled = false;
    }
    if (charCount) {
        charCount.textContent = '0';
    }
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    
    // 이벤트 리스너 바인딩
    if (modalInput && !modalInput.hasAttribute('data-final-modal-bound')) {
        modalInput.addEventListener('input', handleModalFinalDefenseInput);
        modalInput.setAttribute('data-final-modal-bound', 'true');
    }
    
    if (submitBtn && !submitBtn.hasAttribute('data-final-modal-bound')) {
        submitBtn.addEventListener('click', handleModalFinalDefenseSubmit);
        submitBtn.setAttribute('data-final-modal-bound', 'true');
    }
    
    // 모달 표시
    showModal('final-defense-modal');
}

// 최후진술 모달 입력 처리
function handleModalFinalDefenseInput(e) {
    const count = e.target.value.length;
    
    const charCount = document.getElementById('modal-final-char-count');
    const submitBtn = document.getElementById('modal-submit-final-defense-btn');
    
    if (charCount) {
        charCount.textContent = count;
    }
    
    if (submitBtn) {
        submitBtn.disabled = count === 0;
    }
}

// 최후진술 모달 제출 처리
async function handleModalFinalDefenseSubmit() {
    const modalInput = document.getElementById('modal-final-defense-input');
    const finalDefenseText = modalInput.value.trim();
    
    if (!finalDefenseText) {
        showNotification('최후진술을 입력해주세요.');
        return;
    }
    
    console.log('최후진술 제출:', finalDefenseText);
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/final-defense?playerId=${AppState.playerInfo.id}&text=${encodeURIComponent(finalDefenseText)}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('최후진술 제출에 실패했습니다.');
        }
        
        // 모달 닫기
        hideModal('final-defense-modal');
        showNotification('최후진술이 제출되었습니다!');
        
    } catch (error) {
        console.error('최후진술 제출 오류:', error);
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
        
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/final-vote?playerId=${AppState.playerInfo.id}&decision=${decision}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
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

// 게임 중단 모달 닫기
function hideGameInterruptedModal() {
    const modal = document.getElementById('game-interrupted-modal');
    if (modal) {
        modal.remove();
    }
}

// 모든 모달 닫기
function hideAllModals() {
    // 기존 모달들 제거
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
}