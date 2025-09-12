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
    
    // 호스트 컨트롤 패널에 게임 시작 버튼 설정
    // addHostStatusMessage('게임이 시작되었습니다. 설명 단계를 시작해주세요.', 'info');
    // setHostActionButton('📝 설명 단계 시작', handleHostStartDescription);
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

// 게임 화면 표시
function showGameScreen() {
    showScreen('game-screen');
    updateMyInfoDisplay();
    updateGamePlayersList();
    updateRoundDisplay();
    
    // 대기실 역할 정보도 업데이트 (게임 시작 시 바로 표시하기 위해)
    updateWaitingRoomRoleDisplay();
    
    console.log('게임 화면 표시 완료 - 현재 역할:', AppState.playerInfo.role);

    // 호스트 여부에 따라 다른 화면 표시
    if (AppState.playerInfo.isHost) {
        showHostControlPanel();
        showHostGameStartControls();
    } else {
        hideHostControlPanel();
        showWaitingForHostPhase();
    }
}

// 내 정보 표시 업데이트 (게임 화면)
function updateMyInfoDisplay() {
    document.getElementById('game-my-nickname').textContent = AppState.playerInfo.nickname;
    
    const myRoleElement = document.getElementById('my-role');
    const myWordElement = document.getElementById('my-word');
    
    if (AppState.playerInfo.role) {
        if (AppState.playerInfo.role === 'LIAR') {
            myRoleElement.textContent = '🎭 라이어';
            myRoleElement.className = 'my-role liar';
            myWordElement.textContent = '❓❓❓';
            myWordElement.className = 'my-word liar-word';
            
            // 라이어 역할 강조 효과
            setTimeout(() => {
                myRoleElement.style.animation = 'none';
                myRoleElement.offsetHeight; // 리플로우 강제 실행
                myRoleElement.style.animation = 'roleReveal 0.8s ease-out';
            }, 100);
            
        } else {
            myRoleElement.textContent = '👥 시민';
            myRoleElement.className = 'my-role citizen';
            myWordElement.textContent = AppState.playerInfo.cardWord || '';
            myWordElement.className = 'my-word';
            
            // 시민 역할 강조 효과
            setTimeout(() => {
                myRoleElement.style.animation = 'none';
                myRoleElement.offsetHeight; // 리플로우 강제 실행  
                myRoleElement.style.animation = 'roleReveal 0.8s ease-out';
            }, 100);
        }
    }
    
    // 대기실 역할 정보도 함께 업데이트
    updateWaitingRoomRoleDisplay();
}

// 대기실 역할 정보 표시 업데이트
function updateWaitingRoomRoleDisplay() {
    const nicknameElement = document.getElementById('waiting-game-my-nickname');
    const roleElement = document.getElementById('waiting-my-role');
    const wordElement = document.getElementById('waiting-my-word');
    
    if (!nicknameElement || !roleElement || !wordElement) {
        console.warn('대기실 역할 표시 요소를 찾을 수 없습니다');
        return;
    }
    
    // 닉네임 업데이트
    nicknameElement.textContent = AppState.playerInfo.nickname || '';
    
    if (AppState.playerInfo.role) {
        console.log('대기실에 역할 정보 표시:', AppState.playerInfo.role);
        
        if (AppState.playerInfo.role === 'LIAR') {
            roleElement.textContent = '🎭 라이어';
            roleElement.className = 'my-role liar';
            wordElement.textContent = '❓❓❓';
            wordElement.className = 'my-word liar-word';
        } else {
            roleElement.textContent = '👥 시민';
            roleElement.className = 'my-role citizen';
            wordElement.textContent = AppState.playerInfo.cardWord || '단어를 기다리는 중...';
            wordElement.className = 'my-word';
        }
    } else {
        console.log('대기실에 기본 메시지 표시');
        roleElement.textContent = '역할이 아직 배정되지 않았습니다';
        roleElement.className = 'my-role';
        wordElement.textContent = '게임이 시작되면 단어가 표시됩니다';
        wordElement.className = 'my-word';
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
    const phaseInfo = document.getElementById('phase-info');
    
    // 호스트가 아닌 플레이어도 특정 단계에서는 UI 변경 필요
    if (!AppState.playerInfo.isHost) {
        // 모든 게임 단계 숨기기
        document.querySelectorAll('.game-phase').forEach(phase => {
            phase.classList.add('hidden');
        });

        switch (data.state || AppState.gamePhase) {
            case 'DESC':
                phaseInfo.textContent = '설명 작성 단계';
                break;
            case 'DESC_COMPLETE':
                phaseInfo.textContent = '설명 완료';
                break;
            case 'VOTE':
                phaseInfo.textContent = '투표 진행 중';
                showVotingPhase(data.players || AppState.players);
                break;
            case 'FINAL_DEFENSE':
                phaseInfo.textContent = '최후진술 단계';
                break;
            case 'FINAL_DEFENSE_COMPLETE':
                phaseInfo.textContent = '최후진술 완료';
                break;
            case 'FINAL_VOTING':
                phaseInfo.textContent = '생존/사망 투표';
                // 호스트가 아닌 플레이어도 재투표 화면 표시
                showFinalVotingPhase(data.accusedPlayer);
                break;
            case 'ROUND_END':
                phaseInfo.textContent = '라운드 종료';
                break;
            case 'END':
                phaseInfo.textContent = '게임 종료';
                break;
            default:
                phaseInfo.textContent = '게임 진행 중...';
        }
        return; // 호스트가 아니면 여기서 종료
    }
    
    // 호스트인 경우에만 게임 단계 화면 변경
    // 모든 게임 단계 숨기기
    document.querySelectorAll('.game-phase').forEach(phase => {
        phase.classList.add('hidden');
    });
    
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
    // 호스트가 아닌 플레이어는 화면 변경 없음
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
    const descCompletePhase = document.getElementById('description-complete-phase');
    
    if (descCompletePhase) {
        descCompletePhase.classList.remove('hidden');
    }
    
    if (AppState.playerInfo.isHost) {
        // 호스트 컨트롤 패널에 완료 메시지와 투표 시작 버튼 표시 (중복 제거)
        // addHostStatusMessage('모든 플레이어의 설명이 완료되었습니다.', 'success');
        // setHostActionButton('🗳️ 투표 시작', handleStartVoting);
    }
}

// 투표 단계 표시
function showVotingPhase(players) {
    const votingPhase = document.getElementById('voting-phase');
    votingPhase.classList.remove('hidden');

    const votingPlayersElement = document.getElementById('voting-players');
    
    // 생존한 플레이어들로 투표 카드 생성 (자신 제외)
    const alivePlayers = (players || AppState.players).filter(p => 
        p.isAlive && p.playerId !== AppState.playerInfo.id
    );
    
    votingPlayersElement.innerHTML = alivePlayers.map(player => `
        <div class="vote-player-card" data-player-id="${player.playerId}" onclick="handleVoteClick(${player.playerId})">
            <div class="vote-player-name">${player.nickname}</div>
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

    if (data.results && data.results.length > 0) {
        modalContent.innerHTML = data.results.map(result => `
            <div class="vote-result-item">
                <div class="vote-result-name">${result.playerName}</div>
                <div class="vote-result-count">${result.voteCount}표</div>
            </div>
        `).join('');
    } else {
        modalContent.innerHTML = '<p>투표 결과가 없습니다.</p>';
    }
    
    // 결과에 따른 메시지 추가
    if (data.accusedName) {
        const accusedMessage = document.createElement('div');
        accusedMessage.className = 'vote-result-summary';
        accusedMessage.innerHTML = `<p><strong>${data.accusedName}님이 지목되었습니다!</strong></p>`;
        modalContent.appendChild(accusedMessage);
        
        console.log('투표 결과 - 지목자:', data.accusedName, '지목자 ID:', data.accusedId);
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
    // 호스트가 아니고 지목된 플레이어도 아닌 경우 화면 변경 없음
    if (!AppState.playerInfo.isHost && accusedPlayer && accusedPlayer.playerId !== AppState.playerInfo.id) {
        return;
    }
    
    const finalDefensePhase = document.getElementById('final-defense-phase');
    finalDefensePhase.classList.remove('hidden');
    
    const accusedPlayerName = document.getElementById('accused-player-name');
    const finalDefenseForm = document.getElementById('final-defense-form');
    const finalDefenseWaiting = document.getElementById('final-defense-waiting');
    
    if (accusedPlayer) {
        accusedPlayerName.textContent = accusedPlayer.nickname;
        
        // 지목된 플레이어가 본인인지 확인
        if (accusedPlayer.playerId === AppState.playerInfo.id) {

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

// 최후진술 결과 모달 표시 (모든 플레이어에게)
function showFinalDefenseResultModal(accusedPlayer, finalDefenseText) {
    console.log('최후진술 결과 모달 표시:', accusedPlayer.nickname, finalDefenseText);
    
    // 기존 모달들 모두 닫기
    hideAllModals();
    
    const modalHTML = `
        <div id="final-defense-result-modal" class="modal-overlay" style="display: flex;">
            <div class="modal-content" style="text-align: center; padding: 30px; max-width: 500px;">
                <div style="font-size: 24px; margin-bottom: 20px;">⚖️</div>
                <h3 style="color: #e74c3c; margin-bottom: 20px;">최후진술</h3>
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 15px; color: #495057;">
                        🎯 ${accusedPlayer.nickname}님의 최후진술
                    </h4>
                    <div style="background-color: white; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c;">
                        <p style="font-size: 16px; line-height: 1.5; margin: 0; text-align: left;">
                            "${finalDefenseText}"
                        </p>
                    </div>
                </div>
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="font-size: 14px; color: #1976d2; margin: 0;">
                        호스트가 생존/사망 투표를 시작할 때까지 기다려주세요
                    </p>
                </div>
                <button onclick="hideFinalDefenseResultModal()" 
                        class="modal-btn primary-btn" 
                        style="width: 100%; padding: 12px;">
                    확인
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 3초 후 자동 닫기 (사용자가 직접 닫지 않은 경우)
    setTimeout(() => {
        const modal = document.getElementById('final-defense-result-modal');
        if (modal) {
            hideFinalDefenseResultModal();
        }
    }, 5000);
}

// 최후진술 결과 모달 닫기
function hideFinalDefenseResultModal() {
    const modal = document.getElementById('final-defense-result-modal');
    if (modal) {
        modal.remove();
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
    // 지목된 플레이어는 투표에 참여하지 않음
    if (accusedPlayer && accusedPlayer.playerId === AppState.playerInfo.id) {
        return;
    }
    
    const finalVotingPhase = document.getElementById('final-voting-phase');
    finalVotingPhase.classList.remove('hidden');
    
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
    // 호스트가 아닌 플레이어는 화면 변경 없음
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
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
    
    // 역할별 맞춤 메시지 표시
    console.log('게임 종료 데이터:', data);
    
    // 제목과 메시지는 서버에서 전송된 개인화된 메시지 사용
    if (data.reason) {
        switch (data.reason) {
            case 'mission_success':
                resultTitle.textContent = '🎭 미션 성공!';
                winnerInfo.className = 'result-info liar-win';
                break;
            case 'mission_failed':
                resultTitle.textContent = '💀 미션 실패';
                winnerInfo.className = 'result-info liar-lose';
                break;
            case 'citizens_victory':
                resultTitle.textContent = '🎉 시민 승리!';
                winnerInfo.className = 'result-info citizens-win';
                break;
            case 'citizens_defeat':
                resultTitle.textContent = '😞 시민 패배';
                winnerInfo.className = 'result-info citizens-lose';
                break;
            default:
                // 기존 로직 유지 (호환성)
                if (data.winner === 'CITIZENS') {
                    resultTitle.textContent = '🎉 시민팀 승리!';
                    winnerInfo.className = 'result-info citizens-win';
                } else if (data.winner === 'LIAR') {
                    resultTitle.textContent = '🎭 라이어 승리!';
                    winnerInfo.className = 'result-info liar-win';
                }
        }
    }
    
    // 개인화된 메시지 표시
    winnerInfo.textContent = data.message || '게임이 종료되었습니다.';
    
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
        let submitBtn = null;
        
        // description-input의 경우 직접 ID로 찾기
        if (this.id === 'description-input') {
            submitBtn = document.getElementById('submit-description-btn');
        } else {
            // 다른 입력 필드의 경우 기존 방식 사용
            const gamePhase = this.closest('.game-phase');
            if (gamePhase) {
                submitBtn = gamePhase.querySelector('.btn-primary');
            }
        }
        
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

// 게임 중단 모달 표시
function showGameInterruptedModal(message, playerName) {
    console.log('게임 중단 모달 표시:', message, playerName);
    
    // 기존 모달들 숨기기
    hideAllModals();
    
    // 게임 중단 모달 내용 설정
    const modal = document.getElementById('notification-modal');
    const messageElement = document.getElementById('notification-message');
    
    if (modal && messageElement) {
        messageElement.textContent = message;
        modal.classList.remove('success', 'error', 'warning');
        modal.classList.add('warning');
        showModal('notification-modal');
        
        // 3초 후 자동으로 모달 닫기
        setTimeout(() => {
            hideModal('notification-modal');
        }, 3000);
    } else {
        // 모달이 없으면 alert 사용
        alert(message);
    }
}

// 채팅 메시지 추가 함수
function addChatMessage(senderName, message, isMyMessage = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isMyMessage ? 'my-message' : 'other-message'}`;
    
    const senderDiv = document.createElement('div');
    senderDiv.className = 'sender-name';
    senderDiv.textContent = senderName;
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = message;
    
    messageDiv.appendChild(senderDiv);
    messageDiv.appendChild(textDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 최하단으로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 시스템 메시지 추가 함수
function addSystemMessage(message, messageType = 'info') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message system-message ${messageType}`;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'system-icon';
    
    // 메시지 타입에 따른 아이콘 설정
    switch(messageType) {
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
    textDiv.textContent = message;
    
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(textDiv);
    
    chatMessages.appendChild(messageDiv);
    
    // 스크롤을 최하단으로 이동
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 채팅창 초기화
function clearChatMessages() {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
}

// 설명 입력 필드 문자 수 제한 및 버튼 상태 관리
function updateDescriptionInput() {
    const input = document.getElementById('description-input');
    const charCount = document.getElementById('desc-char-count');
    const submitBtn = document.getElementById('submit-description-btn');
    
    if (!input || !charCount || !submitBtn) return;
    
    const count = input.value.length;
    charCount.textContent = count;
    
    // 입력이 있고 버튼이 아직 비활성화되지 않았을 때만 활성화
    submitBtn.disabled = count === 0 || submitBtn.dataset.submitted === 'true';
}

// 초기화 시 텍스트 입력 제한 설정
document.addEventListener('DOMContentLoaded', function() {
    // 글자 수 제한 설정
    limitTextInput('description-input', 200, 'desc-char-count');
    limitTextInput('final-defense-input', 300, 'final-char-count');
    
    // 새로운 설명 입력 필드 이벤트 리스너
    const descInput = document.getElementById('description-input');
    if (descInput) {
        descInput.addEventListener('input', updateDescriptionInput);
        descInput.addEventListener('keyup', updateDescriptionInput);
    }
    
    // 모바일 최적화 초기화
    initializeMobileOptimizations();
});

// ===== 모바일 최적화 기능 =====

// 모바일 최적화 초기화
function initializeMobileOptimizations() {
    // 터치 이벤트 최적화
    setupTouchEvents();
    
    // 키보드 이벤트 처리
    setupKeyboardHandling();
    
    // 화면 방향 변경 처리
    setupOrientationHandling();
    
    // iOS Safari 뷰포트 높이 이슈 수정
    fixIOSViewportHeight();
    
    // 더블 탭 줌 방지
    preventDoubleTapZoom();
}

// 터치 이벤트 최적화
function setupTouchEvents() {
    // 버튼들에 터치 피드백 추가
    document.addEventListener('touchstart', function(e) {
        if (e.target.matches('.btn, .vote-player-card, .player-item')) {
            e.target.classList.add('touching');
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
        if (e.target.matches('.btn, .vote-player-card, .player-item')) {
            e.target.classList.remove('touching');
        }
    }, { passive: true });
    
    // 스크롤 성능 최적화
    let scrollTimer = null;
    document.addEventListener('scroll', function(e) {
        if (scrollTimer !== null) {
            clearTimeout(scrollTimer);
        }
        scrollTimer = setTimeout(function() {
            // 스크롤 완료 후 처리
            document.body.classList.remove('is-scrolling');
        }, 150);
        document.body.classList.add('is-scrolling');
    }, { passive: true });
}

// 키보드 이벤트 처리 (모바일 가상 키보드)
function setupKeyboardHandling() {
    // 입력 필드 포커스 시 화면 조정
    const inputs = document.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            // 키보드가 올라올 때를 대비해 약간의 지연 후 스크롤
            setTimeout(() => {
                this.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });
            }, 300);
        });
        
        // 모바일에서 엔터 키 처리
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                // 텍스트에어리어가 아닌 경우에만 기본 제출 동작
                if (this.tagName.toLowerCase() !== 'textarea') {
                    e.preventDefault();
                    // 연관된 제출 버튼 찾아서 클릭
                    const form = this.closest('form');
                    if (form) {
                        const submitBtn = form.querySelector('.btn-primary, [type="submit"]');
                        if (submitBtn && !submitBtn.disabled) {
                            submitBtn.click();
                        }
                    }
                }
            }
        });
    });
}

// 화면 방향 변경 처리
function setupOrientationHandling() {
    function handleOrientationChange() {
        // 방향 변경 후 뷰포트 높이 재계산
        setTimeout(() => {
            fixIOSViewportHeight();
        }, 500);
    }
    
    // 방향 변경 이벤트 리스너
    if ('orientation' in screen) {
        screen.orientation.addEventListener('change', handleOrientationChange);
    } else {
        window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    // 리사이즈 이벤트도 처리
    let resizeTimer = null;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(handleOrientationChange, 200);
    });
}

// iOS Safari 뷰포트 높이 이슈 수정
function fixIOSViewportHeight() {
    // iOS Safari에서 주소창 때문에 100vh가 정확하지 않은 문제 해결
    const viewportHeight = window.innerHeight;
    document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
    
    // CSS에서 height: 100vh 대신 height: calc(var(--vh, 1vh) * 100) 사용
}

// 더블 탭 줌 방지
function preventDoubleTapZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

// 모바일 전용 유틸리티 함수들
const MobileUtils = {
    // 디바이스 감지
    isMobile: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // iOS 감지
    isIOS: function() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    },
    
    // 안드로이드 감지
    isAndroid: function() {
        return /Android/i.test(navigator.userAgent);
    },
    
    // 키보드 표시 상태 감지
    isKeyboardVisible: function() {
        return window.innerHeight < window.screen.height * 0.75;
    },
    
    // 진동 피드백 (지원하는 기기만)
    vibrate: function(pattern = [100]) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    },
    
    // 터치 좌표 정규화
    getTouchCoordinates: function(e) {
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX,
            y: touch.clientY
        };
    }
};

// 투표 카드 터치 개선
function enhanceVoteCardInteraction() {
    const voteCards = document.querySelectorAll('.vote-player-card');
    
    voteCards.forEach(card => {
        // 터치 시작
        card.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.95)';
            MobileUtils.vibrate([50]); // 짧은 진동 피드백
        }, { passive: true });
        
        // 터치 종료
        card.addEventListener('touchend', function(e) {
            this.style.transform = '';
        }, { passive: true });
        
        // 터치 취소
        card.addEventListener('touchcancel', function(e) {
            this.style.transform = '';
        }, { passive: true });
    });
}

// 게임 단계별 모바일 최적화
function optimizeForGamePhase(phase) {
    switch(phase) {
        case 'voting':
            enhanceVoteCardInteraction();
            break;
        case 'description':
            // 텍스트 입력 시 화면 최적화
            optimizeTextInput();
            break;
        case 'final-defense':
            // 최후진술 입력 최적화
            optimizeFinalDefenseInput();
            break;
    }
}

// 텍스트 입력 최적화
function optimizeTextInput() {
    const textArea = document.querySelector('#description-input, textarea[name="description"]');
    if (textArea) {
        // 입력 시 자동 높이 조정
        textArea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 150) + 'px';
        });
    }
}

// 최후진술 입력 최적화
function optimizeFinalDefenseInput() {
    const finalDefenseInput = document.getElementById('final-defense-input');
    if (finalDefenseInput) {
        finalDefenseInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 200) + 'px';
        });
    }
}

// ===== 호스트 컨트롤 패널 관리 =====

// 호스트 컨트롤 패널 표시
function showHostControlPanel() {
    const hostPanel = document.getElementById('host-control-panel');
    if (hostPanel) {
        hostPanel.classList.remove('hidden');
    }
}

// 호스트 컨트롤 패널 숨김
function hideHostControlPanel() {
    const hostPanel = document.getElementById('host-control-panel');
    if (hostPanel) {
        hostPanel.classList.add('hidden');
    }
}

// 호스트 상태 메시지 추가
function addHostStatusMessage(message, type = 'info') {
    if (!AppState.playerInfo.isHost) {
        return; // 호스트가 아니면 무시
    }
    
    const statusArea = document.getElementById('host-status-area');
    if (!statusArea) return;

    clearHostStatusMessages();

    const messageDiv = document.createElement('div');
    messageDiv.className = `host-status-message ${type}`;
    messageDiv.textContent = message;

    statusArea.appendChild(messageDiv);
    
    // 스크롤을 최하단으로 이동
    statusArea.scrollTop = statusArea.scrollHeight;
    
    // 메시지가 너무 많으면 오래된 것 제거 (최대 10개 유지)
    const messages = statusArea.querySelectorAll('.host-status-message');
    if (messages.length > 10) {
        messages[0].remove();
    }
}

// 호스트 상태 영역 초기화
function clearHostStatusMessages() {
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
    const statusArea = document.getElementById('host-status-area');
    if (statusArea) {
        statusArea.innerHTML = '';
    }
}

// 호스트 액션 버튼 설정
function setHostActionButton(buttonText, buttonAction, buttonType = 'primary') {
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
    const actionsArea = document.getElementById('host-actions-area');
    if (!actionsArea) return;
    
    // 기존 버튼들 제거
    actionsArea.innerHTML = '';
    
    const button = document.createElement('button');
    button.className = `btn btn-${buttonType}`;
    button.textContent = buttonText;
    button.onclick = buttonAction;
    
    actionsArea.appendChild(button);
}

// 호스트 액션 버튼 여러 개 설정
function setHostActionButtons(buttons) {
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
    const actionsArea = document.getElementById('host-actions-area');
    if (!actionsArea) return;
    
    // 기존 버튼들 제거
    actionsArea.innerHTML = '';
    
    buttons.forEach(buttonConfig => {
        const button = document.createElement('button');
        button.className = `btn btn-${buttonConfig.type || 'primary'}`;
        button.textContent = buttonConfig.text;
        button.onclick = buttonConfig.action;
        
        if (buttonConfig.disabled) {
            button.disabled = true;
        }
        
        actionsArea.appendChild(button);
    });
}

// 호스트 액션 버튼 모두 제거
function clearHostActionButtons() {
    if (!AppState.playerInfo.isHost) {
        return;
    }
    
    const actionsArea = document.getElementById('host-actions-area');
    if (actionsArea) {
        actionsArea.innerHTML = '';
    }
}