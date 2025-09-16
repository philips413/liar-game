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
        case 'FINAL_VOTE_RESULT':
            handleFinalVoteResult(data);
            break;
        case 'FINAL_DEFENSE_COMPLETE':
            handleFinalDefenseComplete(data);
            break;
        case 'FINAL_VOTING':
            handleFinalVotingStart(data);
            break;
        case 'VOTING_STARTED':
            handleVotingStarted(data);
            break;
        case 'NEXT_ROUND_START':
            handleNextRoundStart(data);
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
        case 'ROOM_DELETED':
            handleRoomDeleted(data);
            break;
        case 'DESC_UPDATE':
            handleDescriptionUpdate(data);
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
    addSystemMessage(`${player.nickname}님이 방을 나갔습니다.`, 'info');
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

    // 게임 종료 후 새로운 방이 생성되므로 여기서는 채팅 초기화 불필요

    // 새 게임/라운드 시작 시 최후진술 완료 플래그 초기화
    AppState.finalDefenseCompleted = false;
    console.log('게임 시작 - 최후진술 완료 플래그 초기화');

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

            // 대기실 역할 정보 즉시 업데이트 (게임 시작 전에)
            if (typeof updateWaitingRoomRoleDisplay === 'function') {
                updateWaitingRoomRoleDisplay();
            }
        } else {
            console.warn('내 플레이어 정보를 찾을 수 없습니다. playerId:', AppState.playerInfo.id);
        }
    } else {
        console.warn('플레이어 목록이 없습니다. 기존 상태 유지');
    }

    showGameScreen();
}

// 설명 단계 시작 처리
function handleDescriptionPhaseStarted(data) {
    const gameData = data.data || data;
    console.log('설명 단계 시작:', gameData);
    
    // 호스트 시작 컨트롤 숨김
    const hostStartControls = document.getElementById('host-start-controls');
    if (hostStartControls) {
        hostStartControls.remove();
    }
    
    // 채팅창 초기화 및 입력 필드 활성화
    const descInput = document.getElementById('description-input');
    const submitBtn = document.getElementById('submit-description-btn');
    if (descInput) {
        descInput.disabled = true;
        descInput.value = '';
    }

    if (submitBtn) {
        submitBtn.disabled = true; // 초기에는 비활성화
        submitBtn.dataset.submitted = 'false';
        submitBtn.textContent = '단어 설명';
    }
    
    // 모든 플레이어에게 설명 단계 표시
    showDescriptionPhase();
}

// 라운드 상태 업데이트
function handleRoundStateUpdate(data) {
    const gameData = data.data || data;
    console.log('라운드 상태 업데이트:', gameData);
    
    AppState.gamePhase = gameData.state;
    
    if (gameData.currentRound) {
        AppState.roomInfo.currentRound = gameData.currentRound;
    }

    // 설명 단계인 경우 모든 플레이어의 입력 필드 활성화
    if (gameData.state === 'DESC') {
        const descInput = document.getElementById('description-input');
        const submitBtn = document.getElementById('submit-description-btn');

        if (descInput) {
            descInput.disabled = false;
        }

        if (submitBtn) {
            // 추가 설명 허용 시 제출 상태 초기화
            submitBtn.dataset.submitted = 'false';
            submitBtn.disabled = false;
            submitBtn.textContent = '단어 설명';
        }

        // 메시지가 있으면 채팅창에 표시
        if (gameData.data.message) {
            addChatMessage('시스템', gameData.data.message);
        }
    }

    updateGamePhaseDisplay(gameData);
}

// 모든 설명 완료 처리
function handleAllDescriptionsComplete(data) {
    const gameData = data.data || data;
    console.log('모든 설명 완료:', gameData);
    console.log('descriptions 데이터:', gameData.descriptions);
    
    // 모든 플레이어의 설명이 완료되었음을 호스트에게 알림
    if (AppState.playerInfo.isHost) {
        addHostStatusMessage('모든 플레이어의 설명이 완료되었습니다.\n한번 더 작성하시겠습니까?', 'info');
        
        // 호스트 컨트롤 영역에 버튼 표시
        setHostActionButtons([
            { text: '허용하기', action: handleAllowMoreDescriptions, type: 'success' },
            { text: '투표하기', action: handleStartVoting, type: 'primary' }
        ]);
    }
    
    // UI 업데이트
    showDescriptionCompletePhase();
}

// 투표 결과 처리
function handleVoteResult(data) {
    const gameData = data.data || data;
    console.log('=== 투표 결과 처리 시작 ===');
    console.log('원본 데이터:', data);
    console.log('처리할 데이터:', gameData);
    console.log('현재 플레이어 정보:', AppState.playerInfo);

    displayVoteResultInChat(gameData);

    // 최후진술 투표 결과가 아닌 경우에만 지목자가 있으면 최후진술 팝업 자동 표시
    const isFinalVote = gameData.isFinalVote || gameData.eliminatedId || gameData.outcome === 'eliminated' || gameData.outcome === 'survived';

    // 추가 안전 장치: 최후진술이 이미 완료된 경우에도 팝업 차단
    if (!isFinalVote && !AppState.finalDefenseCompleted && gameData.accusedName && gameData.accusedId) {
        const accusedPlayer = {
            playerId: gameData.accusedId,
            nickname: gameData.accusedName
        };

        console.log('일반 투표 결과 - 지목자 정보:', accusedPlayer);
        console.log('현재 플레이어 ID:', AppState.playerInfo.id);

        // 3초 후에 최후진술 팝업 표시 (투표 결과를 보여준 후)
        setTimeout(() => {
            if (gameData.accusedId === AppState.playerInfo.id) {
                // 지목된 플레이어가 본인인 경우 최후진술 모달 표시
                console.log('지목된 플레이어가 본인임 - 최후진술 모달 표시');
                showFinalDefenseModal();
            }
        }, 1000);
    } else if (isFinalVote) {
        console.log('생존/사망 투표 결과 - 최후진술 팝업 실행 안함');
    } else if (AppState.finalDefenseCompleted) {
        console.log('최후진술 이미 완료됨 - 최후진술 팝업 실행 안함');
    } else {
        console.log('지목자 없음 또는 데이터 누락:', {
            accusedName: gameData.accusedName,
            accusedId: gameData.accusedId
        });
    }
}

function handleFinalVoteResult(data) {
    const gameData = data.data || data;
    console.log('=== 투표 결과 처리 시작 ===');
    console.log('원본 데이터:', data);
    console.log('처리할 데이터:', gameData);
    console.log('현재 플레이어 정보:', AppState.playerInfo);

    // 최후진술 투표 결과인 경우 모든 팝업 닫기 및 라운드 정리
    if (gameData.isFinalVote || gameData.eliminatedId || gameData.outcome === 'eliminated' || gameData.outcome === 'survived') {
        console.log('최후진술 투표 결과 - 모든 팝업 닫기 및 라운드 정리');

        // 모든 관련 모달/팝업 닫기 (지목된 플레이어의 결과 대기 팝업 포함)
        closeWaitingResultModal();
        closeFinalVotingModal();
        hideModal('final-defense-modal');
        hideAllModals();

        const finalVotingPhase = document.getElementById('final-voting-phase');
        if (finalVotingPhase) {
            finalVotingPhase.classList.add('hidden');
        }

        // 지목된 플레이어의 결과 대기 팝업을 확실히 제거하기 위한 추가 호출
        if (typeof closeWaitingResultModal === 'function') {
            setTimeout(() => {
                closeWaitingResultModal();
                console.log('지목된 플레이어의 결과 대기 팝업 강제 제거 완료');
            }, 100);
        }

        // 모든 플레이어에게 최종 투표 결과 팝업 표시
        setTimeout(() => {
            showFinalResultModal(gameData);
        }, 300);

        // 모든 플레이어에게 라운드 완료 메시지 표시
        const phaseInfo = document.getElementById('phase-info');
        if (phaseInfo) {
            phaseInfo.textContent = '라운드 완료 - 호스트가 다음 라운드를 진행할 때까지 기다려주세요.';
        }

        console.log('라운드 완료 - 모든 팝업 및 관련 UI 제거됨');
    }

    // 호스트 패널에 투표 결과 표시
    displayVoteResultInHostPanel(gameData);
}

// 최후진술 완료 처리
function handleFinalDefenseComplete(data) {
    const gameData = data.data || data;
    console.log('최후진술 완료:', gameData);

    // 최후진술이 완료되었음을 표시 (생존/사망 투표 후 중복 팝업 방지용)
    AppState.finalDefenseCompleted = true;
    console.log('최후진술 완료 플래그 설정:', AppState.finalDefenseCompleted);

    // 호스트에게 최후진술 완료 알림
    if (AppState.playerInfo.isHost && gameData.accusedPlayer) {
        addHostStatusMessage(`${gameData.accusedPlayer.nickname}님의 최후진술이 완료되었습니다.`, 'info');
        addHostStatusMessage(`"${gameData.finalDefenseText}"`, 'info');
        setHostActionButton('⚖️ 생존/사망 투표 시작', handleStartFinalVoting);
    }
    
    // 모든 플레이어에게 최후진술 내용을 채팅창에 표시
    if (gameData.finalDefenseText && gameData.accusedPlayer) {
        addChatMessage('시스템', `🎯 ${gameData.accusedPlayer.nickname}님의 최후진술이 완료되었습니다.`);
        addChatMessage(gameData.accusedPlayer.nickname, `${gameData.finalDefenseText}`, 'final-defense');
        addChatMessage('시스템', '호스트가 생존/사망 투표를 시작할 때까지 기다려주세요.');
    }
    
    showFinalDefenseCompletePhase(gameData);
}

// 생존/사망 재투표 시작
function handleFinalVotingStart(data) {
    const gameData = data.data || data;
    console.log('재투표 시작:', gameData);
    
    // 호스트에게 생존/사망 투표 시작 알림
    if (AppState.playerInfo.isHost && gameData.accusedPlayer) {
        addHostStatusMessage(`${gameData.accusedPlayer.nickname}님에 대한 생존/사망 투표가 시작되었습니다.`, 'warning');
        clearHostActionButtons(); // 투표 진행 중이므로 버튼 제거
    }
    
    addSystemMessage('생존/사망 재투표를 시작합니다. 지목된 플레이어의 운명을 결정해주세요.', 'final-defense');
    showFinalVotingPhase(gameData.accusedPlayer);
}

// 게임 종료 처리
function handleGameEnd(data) {
    const gameData = data.data || data;
    console.log('=== 게임 종료 핸들러 시작 ===', gameData);
    console.log('게임 데이터 전체:', JSON.stringify(gameData, null, 2));

    // 모든 대기 모달 닫기
    closeWaitingResultModal();

    // 게임 UI 완전 초기화
    console.log('게임 UI 초기화 실행...');
    if (typeof resetGameUI === 'function') {
        resetGameUI();
        console.log('게임 UI 초기화 완료');
    } else {
        console.warn('resetGameUI 함수를 찾을 수 없습니다');
    }

    // 항상 대체 팝업을 사용하여 확실히 표시
    console.log('대체 승리자 팝업 직접 호출...');
    if (typeof showAlternativeWinnerPopup === 'function') {
        showAlternativeWinnerPopup(gameData);
        console.log('대체 승리자 팝업 호출 완료');
    } else {
        console.error('showAlternativeWinnerPopup 함수를 찾을 수 없습니다!');
        // 최후의 수단 - 단순 알림
        alert('게임이 종료되었습니다!\n' + (gameData.message || '결과를 확인할 수 없습니다.'));

        // 메인화면으로 이동
        setTimeout(() => {
            if (typeof goToMainScreen === 'function') {
                goToMainScreen();
            } else {
                window.location.reload();
            }
        }, 2000);
    }

    console.log('=== 게임 종료 핸들러 완료 ===');
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

    updateGamePlayersList();
}

// 설명 제출
async function handleSubmitDescription() {
    // 새로운 채팅 형태의 입력 필드에서 텍스트 가져오기
    const descInput = document.getElementById('description-input');
    const submitBtn = document.getElementById('submit-description-btn');
    
    if (!descInput || !submitBtn) {
        showNotification('입력 필드를 찾을 수 없습니다.');
        return;
    }
    
    const descriptionText = descInput.value.trim();
    
    if (!descriptionText) {
        showNotification('설명을 입력해주세요.');
        return;
    }
    
    try {
        console.log('설명 제출 중:', { playerId: AppState.playerInfo.id, roomCode: AppState.roomInfo.code });
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/desc?playerId=${AppState.playerInfo.id}&text=${encodeURIComponent(descriptionText)}`, {
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
        
        // 채팅창에 내 메시지 추가
        addChatMessage(AppState.playerInfo.nickname, descriptionText, true);
        
        // 입력 필드 및 버튼 비활성화
        descInput.disabled = true;
        submitBtn.disabled = true;
        submitBtn.dataset.submitted = 'true';
        submitBtn.textContent = '제출 완료';
        
        // 입력 필드 초기화
        descInput.value = '';
        
    } catch (error) {
        console.error('설명 제출 오류:', error);
        
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            showNotification('네트워크 연결을 확인해주세요.');
        } else {
            showNotification(error.message || '설명 제출 중 오류가 발생했습니다.');
        }
    }
}

// 추가 설명 허용 (호스트)
async function handleAllowMoreDescriptions() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 추가 설명을 허용할 수 있습니다.');
        return;
    }
    
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/allow-more-descriptions?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('추가 설명 허용에 실패했습니다.');
        }
        
        // 호스트 액션 버튼 제거
        clearHostActionButtons();
        
        
    } catch (error) {
        console.error('추가 설명 허용 오류:', error);
        showNotification(error.message);
    }
}

// 투표 시작 (호스트)
async function handleStartVoting() {
    if (!AppState.playerInfo.isHost) {
        showNotification('호스트만 투표를 시작할 수 있습니다.');
        return;
    }

    try {
        // 호스트 컨트롤 영역 초기화
        clearHostActionButtons();
        clearHostStatusMessages();

        // 단어 설명 입력창과 버튼 비활성화
        disableDescriptionInput();

        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/start-voting?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });

        if (!response.ok) {
            throw new Error('투표 시작에 실패했습니다.');
        }

        // 시스템 메시지는 WebSocket 응답에서 처리됨

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

        // 투표 모달 닫기 (UI 함수가 있는 경우)
        if (typeof closeVotingModal === 'function') {
            closeVotingModal();
        }
        
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
        // showNotification('최후진술이 제출되었습니다!');
        
    } catch (error) {
        console.error('최후진술 제출 오류:', error);
        showNotification(error.message);
    }
}

// 투표 결과를 채팅창에 표시 (모든 플레이어)
function displayVoteResultInChat(gameData) {
    console.log('투표 결과를 채팅창에 표시:', gameData);

    let combinedMessage = '🗳️ 투표 결과\n';

    // 투표 결과 상세 정보
    if (gameData.voteResults && gameData.voteResults.length > 0) {
        // 투표 결과를 득표수 순으로 정렬
        const sortedResults = gameData.voteResults.sort((a, b) => b.voteCount - a.voteCount);

        sortedResults.forEach((result, index) => {
            const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📊';
            combinedMessage += `${emoji} ${result.targetName}: ${result.voteCount}표\n`;
        });
    }

    // 지목 결과 메시지
    if (gameData.accusedName && gameData.accusedId) {
        combinedMessage += `\n👉 ${gameData.accusedName}님이 최다 득표로 지목되었습니다!\n곧 최후진술이 시작됩니다.`;

        // 통합된 메시지를 한 번에 표시
        addCombinedSystemMessage(combinedMessage, 'vote-result');
    } else {
        combinedMessage += '\n과반수 득표자가 없어 다음 라운드로 진행합니다.';

        // 통합된 메시지를 한 번에 표시
        addCombinedSystemMessage(combinedMessage, 'vote-result');
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
        
        // 시스템 메시지는 WebSocket 응답에서 처리됨
        
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

// 모달에서 생존/사망 투표 제출
async function handleModalFinalVote(decision) {
    // 중복 투표 방지
    const modalSurviveBtn = document.getElementById('modal-survive-vote-btn');
    const modalEliminateBtn = document.getElementById('modal-eliminate-vote-btn');

    if (modalSurviveBtn.disabled && modalEliminateBtn.disabled) {
        showNotification('이미 투표를 완료했습니다.');
        return;
    }

    // 투표 확인
    const decisionText = decision === 'SURVIVE' ? '생존' : '사망';
    const voteStatus = document.querySelector('#final-voting-modal .vote-status');

    if (voteStatus) {
        voteStatus.textContent = `${decisionText} 투표를 제출하시겠습니까?`;
    }

    if (!confirm(`${decisionText} 투표를 제출하시겠습니까?`)) {
        if (voteStatus) {
            voteStatus.textContent = '선택해주세요';
        }
        return;
    }

    try {
        console.log('모달 최후진술 투표 제출:', { decision, playerId: AppState.playerInfo.id, roomCode: AppState.roomInfo.code });

        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/final-vote?playerId=${AppState.playerInfo.id}&decision=${decision}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('모달 최후진술 투표 응답:', response.status, response.statusText);

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

        // 모달 닫기
        setTimeout(() => {
            closeFinalVotingModal();
        }, 500);

    } catch (error) {
        console.error('모달 생존/사망 투표 오류:', error);

        if (voteStatus) {
            voteStatus.textContent = '선택해주세요';
        }

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

    // 새로운 방 생성 시스템으로 변경되어 여기서는 채팅 초기화 불필요

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
        
        // 시스템 메시지는 WebSocket 응답에서 처리됨
        
    } catch (error) {
        console.error('다음 라운드 진행 오류:', error);
        showNotification(error.message || '다음 라운드 진행 중 오류가 발생했습니다.');
    }
}

// 투표 시작 WebSocket 핸들러
function handleVotingStarted(data) {
    const gameData = data.data || data;
    console.log('투표 시작 웹소켓 메시지:', gameData);
    
    // 호스트 액션 버튼 제거
    if (AppState.playerInfo.isHost) {
        clearHostActionButtons();
    }
    
    addSystemMessage('투표를 시작합니다! 라이어를 찾아 투표해주세요.', 'voting');
    
    // 모든 플레이어에게 투표 화면 표시
    if (gameData.players || AppState.players) {
        const players = gameData.players || AppState.players;
        showVotingPhase(players);
    }
}


// 투표 결과를 호스트 패널에 표시
function displayVoteResultInHostPanel(gameData) {
    if (!AppState.playerInfo.isHost) {
        return; // 호스트가 아니면 무시
    }

    console.log('투표 결과를 호스트 패널에 표시:', gameData);

    // 최후진술 투표 결과인지 확인
    const isFinalVote = gameData.isFinalVote || gameData.eliminatedId || gameData.outcome === 'eliminated' || gameData.outcome === 'survived';

    if (isFinalVote) {
        console.log('최후진술 투표 결과 처리');

        // 최후진술 투표 결과 통합 메시지
        let combinedFinalVoteMessage = '⚖️ 생존/사망 투표 결과\n\n';

        if (gameData.outcome === 'eliminated') {
            combinedFinalVoteMessage += `💀 ${gameData.eliminatedName || '플레이어'}가 사망했습니다.\n라운드가 완료되었습니다.`;
            addHostStatusMessage(`${gameData.eliminatedName || '플레이어'}가 사망했습니다.`, 'eliminated');
        } else if (gameData.outcome === 'survived') {
            combinedFinalVoteMessage += `🛡️ ${gameData.survivorName || '플레이어'}가 생존했습니다.\n라운드가 완료되었습니다.`;
            addHostStatusMessage(`${gameData.survivorName || '플레이어'}가 생존했습니다.`, 'survived');
        } else {
            combinedFinalVoteMessage += '결과를 확인 중입니다.\n라운드가 완료되었습니다.';
            addHostStatusMessage('결과를 확인 중입니다.', 'info');
        }

        // 최후진술 투표 완료 후 처리
        addHostStatusMessage('라운드가 완료되었습니다.', 'success');

        // 게임이 종료되지 않는 경우에만 다음 라운드 진행 버튼 표시
        console.log('최후진술 투표 완료 - willGameEnd:', gameData.willGameEnd);
        if (!gameData.willGameEnd) {
            console.log('게임이 계속 진행됨 - 다음 라운드 진행 버튼 표시');
            setHostActionButton('➡️ 다음 라운드 진행', handleProceedNextRound);
        } else {
            // 게임이 종료되는 경우 버튼 표시하지 않음
            console.log('게임이 종료됨 - 다음 라운드 진행 버튼 숨김');
            clearHostActionButtons();
            addHostStatusMessage('게임이 곧 종료됩니다.', 'info');
        }

        // 통합된 메시지를 채팅창에 표시
        addCombinedSystemMessage(combinedFinalVoteMessage, 'vote-result');

        return; // 최후진술 투표 결과는 여기서 끝
    }

    // 일반 투표 결과 처리
    let resultMessage = '🗳️ 투표 결과: ';

    if (gameData.voteResults && gameData.voteResults.length > 0) {
        // 투표 결과를 득표수 순으로 정렬
        const sortedResults = gameData.voteResults.sort((a, b) => b.voteCount - a.voteCount);

        const resultDetails = sortedResults.map(result =>
            `${result.targetName}: ${result.voteCount}표`
        ).join(', ');

        resultMessage += resultDetails;

        // 호스트 패널에 투표 결과 추가
        addHostStatusMessage(resultMessage, 'vote-result');

        if (gameData.accusedName && gameData.accusedId) {
            addHostStatusMessage(`👉 ${gameData.accusedName}님이 최다 득표로 지목되었습니다.`, 'warning');
            addHostStatusMessage('최후진술을 기다리고 있습니다.', 'info');
            clearHostActionButtons(); // 최후진술 대기 중이므로 버튼 제거
        } else {
            addHostStatusMessage('과반수 득표자가 없어 다음 라운드로 진행합니다.', 'info');

            // 게임이 종료되지 않는 경우에만 다음 라운드 진행 버튼 표시
            console.log('일반 투표 완료 - willGameEnd:', gameData.willGameEnd);
            if (!gameData.willGameEnd) {
                console.log('게임이 계속 진행됨 - 다음 라운드 진행 버튼 표시');
                setHostActionButton('➡️ 다음 라운드 진행', handleProceedNextRound);
            } else {
                // 게임이 종료되는 경우 버튼 표시하지 않음
                console.log('게임이 종료됨 - 다음 라운드 진행 버튼 숨김');
                clearHostActionButtons();
                addHostStatusMessage('게임이 곧 종료됩니다.', 'info');
            }
        }
    }

    // 채팅창에 시스템 메시지로 추가
    addSystemMessage(resultMessage, 'vote-result');
}

// 다음 라운드 시작 WebSocket 핸들러
function handleNextRoundStart(data) {
    const gameData = data.data || data;
    console.log('다음 라운드 시작 웹소켓 메시지:', gameData);

    // 새 라운드 시작 시 최후진술 완료 플래그 초기화
    AppState.finalDefenseCompleted = false;
    console.log('다음 라운드 시작 - 최후진술 완료 플래그 초기화');

    // 라운드 시작 시 대기 모달 닫기 (지목된 플레이어의 "결과 대기중" 모달)
    console.log('다음 라운드 시작 - 결과 대기 모달 닫기');
    closeWaitingResultModal();

    // 단어 설명 입력창과 버튼 다시 활성화
    enableDescriptionInput();

    const nextRound = gameData.currentRound || AppState.roomInfo.currentRound;
    addSystemMessage(`다음 라운드(${nextRound}라운드)가 시작됩니다!`, 'round-end');
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
    // 승리자 모달 카운트다운 타이머 정리
    if (typeof winnerCountdownTimer !== 'undefined' && winnerCountdownTimer) {
        clearInterval(winnerCountdownTimer);
        winnerCountdownTimer = null;
    }

    // 기존 모달들 숨김 (remove 대신 hidden 클래스 추가)
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        modal.classList.add('hidden');
    });
}

// 방 삭제 처리 (호스트가 나간 경우)
function handleRoomDeleted(data) {
    console.log('방 삭제:', data);
    
    const gameData = data.data || data;
    const hostPlayer = gameData.hostPlayer;
    const message = gameData.message || `호스트 ${hostPlayer ? hostPlayer.nickname : ''}님이 나가서 방이 삭제되었습니다. 메인화면으로 이동합니다.`;
    
    // 모든 모달 닫기
    hideAllModals();
    
    // 방 삭제 알림 모달 표시
    showRoomDeletedModal(message, hostPlayer);
    
    // WebSocket 연결 해제
    disconnectWebSocket();
    
    // 앱 상태 초기화
    AppState.roomInfo = { code: null, state: null };
    AppState.playerInfo = { id: null, nickname: null, isHost: false };
    AppState.players = [];
    AppState.gameState = null;
    AppState.gamePhase = null;
    
    // 3초 후 자동으로 메인화면으로 이동
    setTimeout(() => {
        hideRoomDeletedModal();
        showScreen('home-screen');
    }, 3000);
}

// 방 삭제 알림 모달 표시
function showRoomDeletedModal(message, hostPlayer) {
    const modalHTML = `
        <div id="room-deleted-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content" style="text-align: center; padding: 30px; max-width: 400px;">
                <div style="font-size: 24px; margin-bottom: 20px;">🚪</div>
                <h3 style="color: #e74c3c; margin-bottom: 20px;">방 삭제됨</h3>
                <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                    ${message}
                </p>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 14px; color: #6c757d; margin: 0;">
                        잠시 후 자동으로 메인화면으로 이동합니다...
                    </p>
                </div>
                <button onclick="hideRoomDeletedModal(); showScreen('home-screen');" 
                        class="modal-btn primary-btn" 
                        style="width: 100%; padding: 12px;">
                    메인화면으로 이동
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// 방 삭제 모달 닫기
function hideRoomDeletedModal() {
    const modal = document.getElementById('room-deleted-modal');
    if (modal) {
        modal.remove();
    }
}

// 설명 업데이트 처리 (다른 플레이어의 설명이 제출됨)
function handleDescriptionUpdate(data) {
    console.log('설명 업데이트:', data);

    const messageData = data.data || data;
    const playerId = messageData.playerId;
    const nickname = messageData.nickname;
    const description = messageData.description;

    // 시스템 메시지인 경우 (nickname이 "시스템"인 경우)
    if (nickname === "시스템" && description) {
        addSystemMessage(description, 'info');
        return;
    }

    // 내가 제출한 설명이 아닌 경우에만 채팅창에 추가
    if (playerId && playerId !== AppState.playerInfo.id && nickname && description) {
        addChatMessage(nickname, description, false);
    }
}

// 단어 설명 입력창과 버튼 비활성화
function disableDescriptionInput() {
    const descriptionInput = document.getElementById('description-input');
    const submitDescBtn = document.getElementById('submit-description-btn');

    if (descriptionInput) {
        descriptionInput.disabled = true;
        descriptionInput.placeholder = '투표가 시작되어 더 이상 설명을 작성할 수 없습니다.';
    }

    if (submitDescBtn) {
        submitDescBtn.disabled = true;
        submitDescBtn.textContent = '투표 진행 중';
    }
}

// 단어 설명 입력창과 버튼 활성화 (다음 라운드 시 필요)
function enableDescriptionInput() {
    const descriptionInput = document.getElementById('description-input');
    const submitDescBtn = document.getElementById('submit-description-btn');

    if (descriptionInput) {
        descriptionInput.disabled = false;
        descriptionInput.placeholder = '받은 단어에 대해 설명해주세요...';
        descriptionInput.value = ''; // 입력 내용 초기화
    }

    if (submitDescBtn) {
        submitDescBtn.disabled = false;
        submitDescBtn.textContent = '단어 설명';
    }
}

// 통합된 시스템 메시지 추가 (여러 줄 지원)
function addCombinedSystemMessage(message, messageType = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message system-message ${messageType}`;

    const iconDiv = document.createElement('div');
    iconDiv.className = 'system-icon';

    // 메시지 타입에 따른 아이콘 설정
    switch(messageType) {
        case 'vote-result':
            iconDiv.textContent = '📊';
            break;
        case 'game-start':
            iconDiv.textContent = '🎮';
            break;
        case 'voting':
            iconDiv.textContent = '🗳️';
            break;
        case 'description':
            iconDiv.textContent = '📝';
            break;
        case 'final-defense':
            iconDiv.textContent = '⚖️';
            break;
        case 'round-end':
            iconDiv.textContent = '🏁';
            break;
        case 'warning':
            iconDiv.textContent = '⚠️';
            break;
        default:
            iconDiv.textContent = '💬';
    }

    const textDiv = document.createElement('div');
    textDiv.className = 'system-text';
    // 줄바꿈 문자를 <br> 태그로 변환
    textDiv.innerHTML = message.replace(/\n/g, '<br>');

    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(textDiv);

    chatMessages.appendChild(messageDiv);

    // 스크롤을 최하단으로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


