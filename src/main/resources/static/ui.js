// UI 업데이트 및 표시 로직

// 플레이어 목록 업데이트 (대기실)
function updatePlayersList() {
    const playersListElement = document.getElementById('players-list');
    const playerCountElement = document.getElementById('player-count');
    
    if (!playersListElement || !playerCountElement) {
        console.warn('플레이어 목록 요소를 찾을 수 없습니다');
        return;
    }
    
    console.log('플레이어 목록 업데이트:', AppState.players);
    
    // 플레이어 수 업데이트
    playerCountElement.textContent = AppState.players.length;
    
    // 플레이어 목록 HTML 생성
    if (AppState.players.length === 0) {
        playersListElement.innerHTML = '<div class="waiting-message">플레이어를 기다리는 중...</div>';
    } else {
        playersListElement.innerHTML = AppState.players.map(player => `
            <div class="player-item ${player.isHost ? 'host' : ''} ${player.playerId === AppState.playerInfo.id ? 'me' : ''}">
                <div class="player-name">${player.nickname || '알 수 없음'}</div>
                <div class="player-badges">
                    ${player.isHost ? '<span class="player-badge host">호스트</span>' : ''}
                    ${player.playerId === AppState.playerInfo.id ? '<span class="player-badge me">나</span>' : ''}
                </div>
            </div>
        `).join('');
    }
    
    // 게임 시작 버튼 활성화 조건 확인
    const startGameBtn = document.getElementById('start-game-btn');
    console.log('updatePlayersList - 호스트 상태:', AppState.playerInfo.isHost, '플레이어 수:', AppState.players.length);
    
    if (startGameBtn) {
        if (AppState.playerInfo.isHost === true) {
            // 호스트인 경우: 플레이어 수에 따라 버튼 활성화/비활성화
            console.log('호스트 확인됨 - 플레이어 수 체크:', AppState.players.length);
            startGameBtn.disabled = AppState.players.length < 3;
            
            if (AppState.players.length >= 3) {
                console.log('3명 이상 - 게임 시작 버튼 표시');
                startGameBtn.classList.remove('hidden');
            } else {
                console.log('3명 미만 - 게임 시작 버튼 숨김');
                startGameBtn.classList.add('hidden');
            }
        } else {
            // 호스트가 아닌 경우: 버튼 숨김
            console.log('호스트 아님 - 게임 시작 버튼 숨김');
            startGameBtn.classList.add('hidden');
        }
    } else {
        console.error('게임 시작 버튼을 찾을 수 없습니다');
    }
}

// 게임 시작 버튼 상태를 강제로 업데이트
function forceUpdateStartGameButton() {
    console.log('강제 게임 시작 버튼 업데이트 시작');
    const startGameBtn = document.getElementById('start-game-btn');
    
    if (!startGameBtn) {
        console.error('게임 시작 버튼이 없습니다');
        return;
    }
    
    console.log('현재 AppState:', {
        isHost: AppState.playerInfo.isHost,
        playerCount: AppState.players.length,
        players: AppState.players
    });
    
    // 강제로 호스트 체크와 버튼 표시/숨김
    if (AppState.playerInfo.isHost === true) {
        console.log('호스트 확인됨 - 버튼 표시 조건 확인');
        if (AppState.players.length >= 3) {
            startGameBtn.classList.remove('hidden');
            startGameBtn.disabled = false;
            console.log('게임 시작 버튼 표시됨');
        } else {
            startGameBtn.classList.add('hidden');
            console.log('플레이어 부족으로 버튼 숨김');
        }
    } else {
        startGameBtn.classList.add('hidden');
        console.log('호스트가 아니므로 버튼 숨김');
    }
}

// 호스트 전용 게임 시작 컨트롤 표시
function showHostGameStartControls() {
    console.log('호스트 게임 시작 컨트롤 표시');
    
    // 모든 게임 단계 숨김
    hideAllGamePhases();
    
    // 호스트 게임 시작 단계 표시
    showHostStartPhase();
}

// 호스트가 아닌 플레이어 대기 화면
function showWaitingForHostPhase() {
    console.log('호스트 대기 화면 표시');
    
    // 모든 게임 단계 숨김
    hideAllGamePhases();
    
    // 대기 메시지 표시
    const phaseInfo = document.getElementById('phase-info');
    phaseInfo.textContent = '호스트가 게임을 시작하길 기다리는 중...';
}

// 모든 게임 단계 숨김
function hideAllGamePhases() {
    const phases = [
        'description-phase',
        'description-complete-phase', 
        'voting-phase',
        'final-defense-phase',
        'final-defense-complete-phase',
        'final-voting-phase',
        'round-end-phase',
        'game-end-phase'
    ];
    
    phases.forEach(phaseId => {
        const phase = document.getElementById(phaseId);
        if (phase) {
            phase.classList.add('hidden');
        }
    });
}

// 호스트 게임 시작 단계 표시
function showHostStartPhase() {
    const phaseInfo = document.getElementById('phase-info');
    phaseInfo.textContent = '호스트 - 게임 진행 단계를 선택하세요';
    
    // 호스트 전용 컨트롤 생성 및 표시
    const hostStartControls = createHostStartControls();
    const gameContainer = document.querySelector('#game-screen .container');
    
    // 기존 호스트 시작 컨트롤 제거
    const existing = document.getElementById('host-start-controls');
    if (existing) {
        existing.remove();
    }
    
    gameContainer.appendChild(hostStartControls);
}

// 호스트 시작 컨트롤 생성
function createHostStartControls() {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'host-start-controls';
    controlsDiv.className = 'game-phase host-controls';
    
    controlsDiv.innerHTML = `
        <h3>🎮 게임 진행 관리</h3>
        <div class="host-control-buttons">
            <button id="host-start-description-btn" class="btn btn-primary large-btn">
                📝 설명 단계 시작
            </button>
            <div class="control-description">
                모든 플레이어가 받은 단어에 대해 설명을 작성합니다
            </div>
        </div>
    `;
    
    // 이벤트 리스너 추가
    setTimeout(() => {
        const startDescBtn = document.getElementById('host-start-description-btn');
        if (startDescBtn) {
            startDescBtn.addEventListener('click', handleHostStartDescription);
        }
    }, 100);
    
    return controlsDiv;
}

// 호스트가 설명 단계 시작
async function handleHostStartDescription() {
    console.log('호스트가 설명 단계 시작');
    
    // 호스트 시작 컨트롤 숨김
    const hostStartControls = document.getElementById('host-start-controls');
    if (hostStartControls) {
        hostStartControls.classList.add('hidden');
    }
    
    // 모든 플레이어에게 설명 단계 시작 알림
    try {
        const response = await fetch(`/api/rooms/${AppState.roomInfo.code}/actions/start-description?hostId=${AppState.playerInfo.id}`, {
            method: 'POST'
        });
        
        if (!response.ok) {
            throw new Error('설명 단계 시작에 실패했습니다.');
        }
        
        // 호스트도 설명 단계 시작
        showDescriptionPhase();
        // 호스트에게도 설명 팝업 바로 표시
        showDescriptionModal();
        showNotification('설명 단계가 시작되었습니다!');
        
    } catch (error) {
        console.error('설명 단계 시작 오류:', error);
        showNotification(error.message);
        
        // 호스트 컨트롤 다시 표시
        if (hostStartControls) {
            hostStartControls.classList.remove('hidden');
        }
    }
}

// 게임 화면 표시
function showGameScreen() {
    showScreen('game-screen');
    updateMyInfoDisplay();
    updateGamePlayersList();
    updateRoundDisplay();

    // 호스트 여부에 따라 다른 화면 표시
    if (AppState.playerInfo.isHost) {
        showHostGameStartControls();
    } else {
        showWaitingForHostPhase();
    }
}

// 내 정보 표시 업데이트
function updateMyInfoDisplay() {
    document.getElementById('game-my-nickname').textContent = AppState.playerInfo.nickname;
    
    const myRoleElement = document.getElementById('my-role');
    const myWordElement = document.getElementById('my-word');
    
    if (AppState.playerInfo.role) {
        if (AppState.playerInfo.role === 'LIAR') {
            myRoleElement.textContent = '🎭 라이어';
            myRoleElement.className = 'my-role liar';
            myWordElement.textContent = '단어를 추측하세요!';
            myWordElement.style.color = '#e53e3e';
        } else {
            myRoleElement.textContent = '👥 시민';
            myRoleElement.className = 'my-role citizen';
            myWordElement.textContent = AppState.playerInfo.cardWord || '';
            myWordElement.style.color = '#5a67d8';
        }
    }
}

// 게임 플레이어 목록 업데이트
function updateGamePlayersList() {
    const gamePlayersElement = document.getElementById('game-players-list');
    if (!gamePlayersElement) return;
    
    gamePlayersElement.innerHTML = AppState.players.map(player => `
        <div class="game-player-item ${player.isAlive ? 'alive' : 'dead'} ${player.playerId === AppState.playerInfo.id ? 'me' : ''}">
            ${player.nickname}
        </div>
    `).join('');
}

// 라운드 정보 업데이트
function updateRoundDisplay() {
    document.getElementById('current-round').textContent = AppState.roomInfo.currentRound;
    document.getElementById('total-rounds').textContent = AppState.roomInfo.roundLimit;
}

// 게임 단계 표시 업데이트
function updateGamePhaseDisplay(data) {
    // 모든 게임 단계 숨기기
    document.querySelectorAll('.game-phase').forEach(phase => {
        phase.classList.add('hidden');
    });
    
    const phaseInfo = document.getElementById('phase-info');
    
    switch (data.state || AppState.gamePhase) {
        case 'DESC':
            // 설명 단계 UI는 표시하지만 팝업은 호스트가 명시적으로 시작했을 때만
            showDescriptionPhaseWithoutModal();
            phaseInfo.textContent = '설명 작성';
            break;
        case 'DESC_COMPLETE':
            showDescriptionCompletePhase();
            phaseInfo.textContent = '설명 완료';
            break;
        case 'VOTE':
            showVotingPhase(data.players);
            phaseInfo.textContent = '투표 진행';
            break;
        case 'FINAL_DEFENSE':
            showFinalDefensePhase(data.accusedPlayer);
            phaseInfo.textContent = '최후진술';
            break;
        case 'FINAL_DEFENSE_COMPLETE':
            showFinalDefenseCompletePhase(data);
            phaseInfo.textContent = '최후진술 완료';
            break;
        case 'FINAL_VOTING':
            showFinalVotingPhase(data.accusedPlayer);
            phaseInfo.textContent = '생존/사망 투표';
            break;
        case 'ROUND_END':
            showRoundEndPhase(data);
            phaseInfo.textContent = '라운드 종료';
            break;
        case 'END':
            showGameEndPhase(data);
            phaseInfo.textContent = '게임 종료';
            break;
        default:
            phaseInfo.textContent = '대기 중...';
    }
}

// 설명 작성 단계 표시 (팝업 없음)
function showDescriptionPhaseWithoutModal() {
    const descriptionPhase = document.getElementById('description-phase');
    descriptionPhase.classList.remove('hidden');
    
    // "내 차례" 표시는 하지 않음 - 호스트가 명시적으로 시작했을 때만
    // showMyTurnBadge("단어를 설명할 차례입니다!");
    
    // 모달 내 입력 필드 초기화
    const modalDescInput = document.getElementById('modal-description-input');
    if (modalDescInput) {
        modalDescInput.value = '';
        modalDescInput.disabled = false;
    }
    
    // 모달 글자 수 카운터 초기화
    const modalCharCount = document.getElementById('modal-desc-char-count');
    if (modalCharCount) {
        modalCharCount.textContent = '0';
    }
    
    // 모달 이벤트 리스너 바인딩 확인
    if (modalDescInput && !modalDescInput.hasAttribute('data-listener-bound')) {
        modalDescInput.addEventListener('input', handleDescriptionInput);
        modalDescInput.setAttribute('data-listener-bound', 'true');
    }
}

// 설명 작성 단계 표시 (팝업 포함)
function showDescriptionPhase() {
    const descriptionPhase = document.getElementById('description-phase');
    descriptionPhase.classList.remove('hidden');
    
    // "내 차례" 표시 추가 (시니어 친화적)
    showMyTurnBadge("단어를 설명할 차례입니다!");
    
    // 모달 내 입력 필드 초기화
    const modalDescInput = document.getElementById('modal-description-input');
    if (modalDescInput) {
        modalDescInput.value = '';
        modalDescInput.disabled = false;
    }
    
    // 모달 글자 수 카운터 초기화
    const modalCharCount = document.getElementById('modal-desc-char-count');
    if (modalCharCount) {
        modalCharCount.textContent = '0';
    }
    
    // 모달 이벤트 리스너 바인딩 확인
    if (modalDescInput && !modalDescInput.hasAttribute('data-listener-bound')) {
        modalDescInput.addEventListener('input', handleDescriptionInput);
        modalDescInput.setAttribute('data-listener-bound', 'true');
    }
}

// 내 차례 표시 배지
function showMyTurnBadge(message) {
    // 기존 배지가 있으면 제거
    const existingBadge = document.querySelector('.my-turn-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
    
    // 새 배지 생성
    const badge = document.createElement('div');
    badge.className = 'my-turn-badge';
    badge.textContent = `🔔 ${message}`;
    
    // 게임 상태 표시 다음에 삽입
    const gameStatus = document.querySelector('.game-status');
    if (gameStatus && gameStatus.parentNode) {
        gameStatus.parentNode.insertBefore(badge, gameStatus.nextSibling);
    }
}

// 내 차례 배지 숨기기
function hideMyTurnBadge() {
    const badge = document.querySelector('.my-turn-badge');
    if (badge) {
        badge.remove();
    }
}

// 설명 입력 처리
function handleDescriptionInput(e) {
    const count = e.target.value.length;
    
    // 모달 내 글자수 카운터 업데이트
    const charCount = document.getElementById('modal-desc-char-count');
    if (charCount) {
        charCount.textContent = count;
    }
    
    // 모달 내 제출 버튼 활성화/비활성화
    const submitBtn = document.getElementById('modal-submit-description-btn');
    if (submitBtn) {
        submitBtn.disabled = count === 0;
    }
}

// 최후진술 입력 처리
function handleFinalDefenseInput(e) {
    const count = e.target.value.length;
    document.getElementById('final-char-count').textContent = count;
    document.getElementById('submit-final-defense-btn').disabled = count === 0;
}

// 설명 완료 단계 표시
function showDescriptionCompletePhase() {
    const descCompletePhase = document.getElementById('description-complete-phase');
    descCompletePhase.classList.remove('hidden');
    
    // 호스트 전용 컨트롤 표시
    const hostControls = document.getElementById('host-controls');
    const waitingMessage = document.getElementById('waiting-host-decision');
    
    if (AppState.playerInfo.isHost) {
        hostControls.classList.remove('hidden');
        waitingMessage.classList.add('hidden');
        
        // 호스트에게 명확한 안내 메시지 표시
        showNotification('호스트님, 다음 단계를 선택해주세요: 투표 시작 또는 추가 설명');
        
        // 호스트 컨트롤 버튼에 설명 추가
        enhanceHostControls();
    } else {
        hostControls.classList.add('hidden');
        waitingMessage.classList.remove('hidden');
        
        // 일반 플레이어에게 대기 메시지
        const phaseInfo = document.getElementById('phase-info');
        phaseInfo.textContent = '호스트가 다음 단계를 결정하는 중...';
    }
    
    // 모든 설명 보기 팝업 표시 (CLAUDE.md의 플로우대로)
    if (AppState.gameState && AppState.gameState.messages) {
        showAllDescriptionsModal(AppState.gameState.messages);
    }
}

// 호스트 컨트롤 버튼 강화
function enhanceHostControls() {
    const startVotingBtn = document.getElementById('start-voting-btn');
    const continueDescBtn = document.getElementById('continue-description-btn');
    
    if (startVotingBtn) {
        startVotingBtn.innerHTML = '🗳️ 투표 시작';
        startVotingBtn.title = '라이어를 찾기 위한 투표를 시작합니다';
    }
    
    if (continueDescBtn) {
        continueDescBtn.innerHTML = '📝 추가 설명 받기';
        continueDescBtn.title = '플레이어들이 단어에 대해 추가로 설명하게 합니다';
    }
}

// 모든 설명 표시
function displayAllDescriptions(descriptions) {
    const descriptionsContainer = document.getElementById('all-descriptions');
    if (!descriptionsContainer) return;
    
    descriptionsContainer.innerHTML = descriptions.map(desc => `
        <div class="description-item">
            <div class="description-author">${desc.playerNickname}</div>
            <div class="description-text">${desc.text}</div>
        </div>
    `).join('');
}

// 투표 단계 표시
function showVotingPhase(players) {
    const votingPhase = document.getElementById('voting-phase');
    votingPhase.classList.remove('hidden');
    
    // "내 차례" 표시 추가 (시니어 친화적)
    showMyTurnBadge("라이어를 찾아 투표하세요!");
    
    const votingPlayersElement = document.getElementById('voting-players');
    
    // 생존한 플레이어들로 투표 카드 생성 (자신 제외)
    const alivePlayers = (players || AppState.players).filter(p => 
        p.isAlive && p.playerId !== AppState.playerInfo.id
    );
    
    votingPlayersElement.innerHTML = alivePlayers.map(player => `
        <div class="vote-player-card" data-player-id="${player.playerId}" onclick="handleVoteClick(${player.playerId})">
            <div class="vote-player-name">${player.nickname}</div>
            <div class="vote-count" id="vote-count-${player.playerId}">0표</div>
        </div>
    `).join('');
}

// 투표 클릭 처리
function handleVoteClick(targetPlayerId) {
    // 이미 투표한 경우 무시
    if (document.querySelector('.vote-player-card.selected')) {
        return;
    }
    
    // 선택 표시
    const selectedCard = document.querySelector(`[data-player-id="${targetPlayerId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        
        // 확인 다이얼로그
        const targetPlayer = AppState.players.find(p => p.playerId === targetPlayerId);
        if (targetPlayer && confirm(`${targetPlayer.nickname}님에게 투표하시겠습니까?`)) {
            handleVoteSubmit(targetPlayerId);
        } else {
            selectedCard.classList.remove('selected');
        }
    }
}

// 투표 결과 표시
function displayVoteResult(data) {
    const modalContent = document.getElementById('vote-result-content');
    
    if (data.voteResults && data.voteResults.length > 0) {
        modalContent.innerHTML = data.voteResults.map(result => `
            <div class="vote-result-item">
                <div class="vote-result-name">${result.playerNickname}</div>
                <div class="vote-result-count">${result.voteCount}표</div>
            </div>
        `).join('');
    } else {
        modalContent.innerHTML = '<p>투표 결과가 없습니다.</p>';
    }
    
    // 결과에 따른 메시지 추가
    if (data.accusedPlayer) {
        const accusedMessage = document.createElement('div');
        accusedMessage.className = 'vote-result-summary';
        accusedMessage.innerHTML = `<p><strong>${data.accusedPlayer.nickname}님이 지목되었습니다!</strong></p>`;
        modalContent.appendChild(accusedMessage);
    } else {
        const noAccusedMessage = document.createElement('div');
        noAccusedMessage.className = 'vote-result-summary';
        noAccusedMessage.innerHTML = '<p>과반수 득표자가 없어 다음 라운드로 진행합니다.</p>';
        modalContent.appendChild(noAccusedMessage);
    }
    
    showModal('vote-result-modal');
}

// 최후진술 단계 표시
function showFinalDefensePhase(accusedPlayer) {
    const finalDefensePhase = document.getElementById('final-defense-phase');
    finalDefensePhase.classList.remove('hidden');
    
    const accusedPlayerName = document.getElementById('accused-player-name');
    const finalDefenseForm = document.getElementById('final-defense-form');
    const finalDefenseWaiting = document.getElementById('final-defense-waiting');
    
    if (accusedPlayer) {
        accusedPlayerName.textContent = accusedPlayer.nickname;
        
        // 지목된 플레이어가 본인인지 확인
        if (accusedPlayer.playerId === AppState.playerInfo.id) {
            // "내 차례" 표시 추가 (시니어 친화적)
            showMyTurnBadge("최후진술을 작성하세요!");
            
            finalDefenseForm.classList.remove('hidden');
            finalDefenseWaiting.classList.add('hidden');
            
            // 입력 필드 완전 초기화
            const finalInput = document.getElementById('final-defense-input');
            const submitBtn = document.getElementById('submit-final-defense-btn');
            
            console.log('최후진술 입력 초기화 - 이전 상태:', {
                inputValue: finalInput.value,
                inputDisabled: finalInput.disabled,
                buttonDisabled: submitBtn.disabled
            });
            
            finalInput.value = '';
            finalInput.disabled = false;
            submitBtn.disabled = true;
            
            document.getElementById('final-char-count').textContent = '0';
            
            // 이벤트 리스너 바인딩 확인
            if (!finalInput.hasAttribute('data-final-listener-bound')) {
                finalInput.addEventListener('input', handleFinalDefenseInput);
                finalInput.setAttribute('data-final-listener-bound', 'true');
            }
            
            console.log('최후진술 입력 초기화 완료 - 현재 상태:', {
                inputValue: finalInput.value,
                inputDisabled: finalInput.disabled,
                buttonDisabled: submitBtn.disabled
            });
        } else {
            finalDefenseForm.classList.add('hidden');
            finalDefenseWaiting.classList.remove('hidden');
        }
    }
}

// 최후진술 완료 단계 표시
function showFinalDefenseCompletePhase(data) {
    const finalDefenseCompletePhase = document.getElementById('final-defense-complete-phase');
    finalDefenseCompletePhase.classList.remove('hidden');
    
    if (data.accusedPlayer && data.finalDefenseText) {
        document.getElementById('final-accused-name').textContent = data.accusedPlayer.nickname;
        document.getElementById('final-defense-text').textContent = data.finalDefenseText;
    }
    
    // 호스트에게만 재투표 시작 버튼 표시
    const startFinalVotingBtn = document.getElementById('start-final-voting-btn');
    const waitingMessage = finalDefenseCompletePhase.querySelector('.waiting-message');
    
    if (AppState.playerInfo.isHost) {
        startFinalVotingBtn.classList.remove('hidden');
        waitingMessage.style.display = 'none';
    } else {
        startFinalVotingBtn.classList.add('hidden');
        waitingMessage.style.display = 'block';
    }
}

// 생존/사망 투표 단계 표시
function showFinalVotingPhase(accusedPlayer) {
    const finalVotingPhase = document.getElementById('final-voting-phase');
    finalVotingPhase.classList.remove('hidden');
    
    // "내 차례" 표시 추가 (시니어 친화적) - 지목당한 플레이어가 아닌 경우에만
    if (accusedPlayer && accusedPlayer.playerId !== AppState.playerInfo.id) {
        showMyTurnBadge("생존/사망을 결정하세요!");
    } else {
        hideMyTurnBadge();
    }
    
    if (accusedPlayer) {
        document.getElementById('final-voting-player-name').textContent = accusedPlayer.nickname;
    }
    
    // 투표 버튼 활성화
    document.getElementById('survive-vote-btn').disabled = false;
    document.getElementById('eliminate-vote-btn').disabled = false;
}

// 게임 종료 단계 표시
// 라운드 종료 단계 표시
function showRoundEndPhase(data) {
    const roundEndPhase = document.getElementById('round-end-phase');
    roundEndPhase.classList.remove('hidden');
    
    const roundResult = document.getElementById('round-result');
    const hostRoundControls = document.getElementById('host-round-controls');
    const waitingNextRound = document.getElementById('waiting-next-round');
    
    // 라운드 결과 표시
    let resultMessage = '';
    if (data.eliminated) {
        if (data.eliminated.role === 'LIAR') {
            resultMessage = `🎉 라이어 ${data.eliminated.name}님이 처형되었습니다! 시민팀 승리!`;
        } else {
            resultMessage = `😢 시민 ${data.eliminated.name}님이 처형되었습니다.`;
        }
    } else if (data.survived) {
        resultMessage = `🛡️ ${data.survived.name}님이 생존했습니다.`;
    } else {
        resultMessage = '이번 라운드는 아무도 처형되지 않았습니다.';
    }
    
    roundResult.innerHTML = `
        <div class="round-result-message">${resultMessage}</div>
        <div class="round-info">
            <span>현재 ${AppState.roomInfo.currentRound} / ${AppState.roomInfo.roundLimit} 라운드</span>
        </div>
    `;
    
    // 호스트 전용 컨트롤 표시 (게임이 계속되는 경우에만)
    if (AppState.playerInfo.isHost && !data.gameEnded) {
        hostRoundControls.classList.remove('hidden');
        waitingNextRound.classList.add('hidden');
    } else if (!data.gameEnded) {
        hostRoundControls.classList.add('hidden');
        waitingNextRound.classList.remove('hidden');
    } else {
        // 게임이 끝난 경우 대기 메시지도 숨김
        hostRoundControls.classList.add('hidden');
        waitingNextRound.classList.add('hidden');
    }
}

function showGameEndPhase(data) {
    const gameEndPhase = document.getElementById('game-end-phase');
    gameEndPhase.classList.remove('hidden');
    
    const resultTitle = document.getElementById('game-result-title');
    const winnerInfo = document.getElementById('winner-info');
    const playersRoles = document.getElementById('players-roles');
    
    // 승리 정보 표시
    if (data.winner) {
        if (data.winner === 'CITIZENS') {
            resultTitle.textContent = '🎉 시민팀 승리!';
            winnerInfo.textContent = data.message || '라이어를 성공적으로 찾아냈습니다!';
            winnerInfo.className = 'result-info citizens-win';
        } else if (data.winner === 'LIAR') {
            resultTitle.textContent = '🎭 라이어 승리!';
            winnerInfo.textContent = data.message || '라이어가 끝까지 살아남았습니다!';
            winnerInfo.className = 'result-info liar-win';
        }
    }
    
    // 플레이어 역할 공개
    if (data.players) {
        playersRoles.innerHTML = `
            <h4>플레이어 역할 공개</h4>
            ${data.players.map(player => `
                <div class="role-item">
                    <div class="role-name">${player.nickname}</div>
                    <div class="role-badge ${player.role.toLowerCase()}">${player.role === 'LIAR' ? '라이어' : '시민'}</div>
                </div>
            `).join('')}
        `;
    }
}

// 게임 단계 숨기기
function hideAllGamePhases() {
    document.querySelectorAll('.game-phase').forEach(phase => {
        phase.classList.add('hidden');
    });
}

// 폼 유효성 검사
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    for (let input of inputs) {
        if (!input.value.trim()) {
            input.focus();
            return false;
        }
    }
    return true;
}

// 입력 필드 초기화
function resetForm(formId) {
    const form = document.getElementById(formId);
    form.reset();
    
    // 에러 스타일 제거
    form.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
    });
}

// 텍스트 입력 제한
function limitTextInput(inputId, maxLength, counterId) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    
    // 요소가 존재하지 않으면 함수 종료
    if (!input || !counter) {
        return;
    }
    
    input.addEventListener('input', function() {
        const currentLength = this.value.length;
        counter.textContent = currentLength;
        
        if (currentLength >= maxLength) {
            this.value = this.value.substring(0, maxLength);
            counter.textContent = maxLength;
        }
        
        // 제출 버튼 활성화/비활성화
        const submitBtn = this.closest('.game-phase').querySelector('.btn-primary');
        if (submitBtn) {
            submitBtn.disabled = currentLength === 0;
        }
    });
}

// 애니메이션 효과
function animateElement(elementId, animationClass, duration = 1000) {
    const element = document.getElementById(elementId);
    if (element) {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
        }, duration);
    }
}

// 성공/오류 메시지 스타일링
function showNotificationWithStyle(message, type = 'info') {
    const messageElement = document.getElementById('notification-message');
    messageElement.textContent = message;
    
    const modal = document.getElementById('notification-modal');
    modal.classList.remove('success', 'error', 'warning');
    modal.classList.add(type);
    
    showModal('notification-modal');
}

// 로딩 상태 표시
function setLoadingState(buttonId, loading = true) {
    const button = document.getElementById(buttonId);
    if (button) {
        if (loading) {
            button.disabled = true;
            button.textContent = '처리 중...';
        } else {
            button.disabled = false;
            button.textContent = button.getAttribute('data-original-text') || '확인';
        }
    }
}

// 초기화 시 텍스트 입력 제한 설정
document.addEventListener('DOMContentLoaded', function() {
    // 글자 수 제한 설정
    limitTextInput('description-input', 200, 'desc-char-count');
    limitTextInput('final-defense-input', 300, 'final-char-count');
});