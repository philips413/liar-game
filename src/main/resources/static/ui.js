// UI 업데이트 및 표시 로직

// 플레이어 목록 업데이트 (대기실)
function updatePlayersList() {
    const playersListElement = document.getElementById('players-list');
    const playerCountElement = document.getElementById('player-count');
    
    if (!playersListElement || !playerCountElement) {
        console.warn('플레이어 목록 요소를 찾을 수 없습니다');
        return;
    }
    
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

    if (startGameBtn) {
        if (AppState.playerInfo.isHost === true) {
            startGameBtn.disabled = AppState.players.length < 3;
            
            if (AppState.players.length >= 3) {
                startGameBtn.classList.remove('hidden');
            } else {
                startGameBtn.classList.add('hidden');
            }
        } else {
            startGameBtn.classList.add('hidden');
        }
    } else {
    }
}

// 게임 시작 버튼 상태를 강제로 업데이트
function forceUpdateStartGameButton() {
    const startGameBtn = document.getElementById('start-game-btn');
    
    if (!startGameBtn) {
        return;
    }

    // 강제로 호스트 체크와 버튼 표시/숨김
    if (AppState.playerInfo.isHost === true) {
        if (AppState.players.length >= 3) {
            startGameBtn.classList.remove('hidden');
            startGameBtn.disabled = false;
        } else {
            startGameBtn.classList.add('hidden');
        }
    } else {
        startGameBtn.classList.add('hidden');
    }
}

// 호스트 전용 게임 시작 컨트롤 표시
function showHostGameStartControls() {
    hideAllGamePhases();
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
                let accusedPlayer = data.accusedPlayer || (data.data && data.data.accusedPlayer);
                showFinalVotingPhase(accusedPlayer);
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
        case 'FINAL_DEFENSE_COMPLETE':
            showFinalDefenseCompletePhase(data);
            phaseInfo.textContent = '최후진술 완료';
            break;
        case 'FINAL_VOTING':
            let accusedPlayerHost = data.accusedPlayer || (data.data && data.data.accusedPlayer);
            showFinalVotingPhase(accusedPlayerHost);
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

}

// 투표 팝업 모달 표시
function showVotingModal(players) {
    const votingModal = document.getElementById('voting-modal');
    const votingPlayersElement = document.getElementById('voting-modal-players');

    // 모든 게임 단계 숨기기 (채팅창만 표시)
    hideAllGamePhases();

    // 생존한 플레이어들로 투표 카드 생성 (자신 제외)
    const alivePlayers = (players || AppState.players).filter(p =>
        p.isAlive && p.playerId !== AppState.playerInfo.id
    );

    votingPlayersElement.innerHTML = alivePlayers.map(player => `
        <div class="vote-player-card" data-player-id="${player.playerId}" onclick="handleVoteModalClick(${player.playerId})">
            <div class="vote-player-name">${player.nickname}</div>
        </div>
    `).join('');

    // 투표 상태 초기화
    const voteStatus = document.querySelector('.vote-status');
    if (voteStatus) {
        voteStatus.textContent = '투표할 플레이어를 선택해주세요';
    }

    votingModal.classList.remove('hidden');
}

// 투표 단계 표시 (기존 함수 - 호환성 유지)
function showVotingPhase(players) {
    // 기존 투표 화면 숨기기
    const votingPhase = document.getElementById('voting-phase');
    if (votingPhase) {
        votingPhase.classList.add('hidden');
    }

    // 팝업 모달로 투표 표시
    showVotingModal(players);
}

// 투표 모달 클릭 처리
function handleVoteModalClick(targetPlayerId) {
    // 이미 투표한 경우 무시
    if (document.querySelector('#voting-modal .vote-player-card.selected')) {
        return;
    }

    // 선택 표시
    const selectedCard = document.querySelector(`#voting-modal [data-player-id="${targetPlayerId}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');

        // 투표 대상 플레이어 찾기
        const targetPlayer = AppState.players.find(p => p.playerId === targetPlayerId);

        if (targetPlayer) {
            // 상태 업데이트
            const voteStatus = document.querySelector('.vote-status');
            if (voteStatus) {
                voteStatus.textContent = `${targetPlayer.nickname}님에게 투표하시겠습니까?`;
            }

            // 확인 후 투표 제출
            if (confirm(`${targetPlayer.nickname}님에게 투표하시겠습니까?`)) {
                handleVoteSubmit(targetPlayerId);
                // 투표 완료 후 모달 닫기
                closeVotingModal();
            } else {
                // 취소한 경우 선택 해제
                selectedCard.classList.remove('selected');
                if (voteStatus) {
                    voteStatus.textContent = '투표할 플레이어를 선택해주세요';
                }
            }
        }
    }
}

// 투표 클릭 처리 (기존 함수 - 호환성 유지)
function handleVoteClick(targetPlayerId) {
    // 모달 방식으로 리다이렉트
    handleVoteModalClick(targetPlayerId);
}

// 투표 모달 닫기
function closeVotingModal() {
    const votingModal = document.getElementById('voting-modal');
    votingModal.classList.add('hidden');
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



// 최후진술 완료 단계 표시
function showFinalDefenseCompletePhase(data) {
    // 모든 게임 단계 숨기기 (채팅창만 표시)
    hideAllGamePhases();

    // 최후진술 내용은 이미 채팅창에 표시되었으므로 추가 UI 처리 불필요
    // 호스트는 이미 handleFinalDefenseComplete()에서 버튼을 받았음
}

// 생존/사망 투표 단계 표시 (모달 방식)
function showFinalVotingPhase(accusedPlayer) {
    console.log('=== showFinalVotingPhase 호출 ===');
    console.log('accusedPlayer:', accusedPlayer);
    console.log('현재 플레이어 정보:', AppState.playerInfo);

    if (accusedPlayer) {
        console.log('accusedPlayer.playerId:', accusedPlayer.playerId, '(타입:', typeof accusedPlayer.playerId, ')');
    }
    console.log('AppState.playerInfo.id:', AppState.playerInfo.id, '(타입:', typeof AppState.playerInfo.id, ')');

    // 지목된 플레이어는 투표에 참여하지 않음 - 결과 대기 모달 표시
    if (accusedPlayer && (accusedPlayer.playerId == AppState.playerInfo.id || String(accusedPlayer.playerId) === String(AppState.playerInfo.id))) {
        console.log('지목된 플레이어 확인됨 - 결과 대기 모달 표시');
        // 지목된 플레이어에게는 결과 대기 모달 표시
        showWaitingResultModal();
        return;
    }

    console.log('일반 플레이어 - 투표 모달 표시');
    // 모든 게임 단계 숨기기 (채팅창만 표시)
    hideAllGamePhases();

    // 모달 방식으로 투표 표시
    showFinalVotingModal(accusedPlayer);
}

// 생존/사망 투표 모달 표시
function showFinalVotingModal(accusedPlayer) {
    const finalVotingModal = document.getElementById('final-voting-modal');
    const modalAccusedName = document.getElementById('modal-accused-player-name');

    if (accusedPlayer) {
        modalAccusedName.textContent = accusedPlayer.nickname;
    }

    // 투표 버튼 활성화
    const surviveBtn = document.getElementById('modal-survive-vote-btn');
    const eliminateBtn = document.getElementById('modal-eliminate-vote-btn');

    surviveBtn.disabled = false;
    eliminateBtn.disabled = false;

    // 투표 상태 초기화
    const voteStatus = document.querySelector('#final-voting-modal .vote-status');
    if (voteStatus) {
        voteStatus.textContent = '선택해주세요';
    }

    finalVotingModal.classList.remove('hidden');
}

// 생존/사망 투표 모달 닫기
function closeFinalVotingModal() {
    const finalVotingModal = document.getElementById('final-voting-modal');
    if (finalVotingModal) {
        finalVotingModal.classList.add('hidden');
    }
}

// 지목된 플레이어용 결과 대기 모달 표시
function showWaitingResultModal() {
    console.log('=== showWaitingResultModal 시작 ===');

    // 모든 게임 단계 숨기기 (채팅창만 표시)
    hideAllGamePhases();

    // 기존 모달들 닫기 - 하지만 remove는 하지 않고 hidden만 처리
    const allModals = document.querySelectorAll('.modal-overlay');
    allModals.forEach(modal => {
        if (modal.id !== 'waiting-result-modal') {
            modal.classList.add('hidden');
        }
    });

    const waitingModal = document.getElementById('waiting-result-modal');
    console.log('waiting-result-modal 요소:', waitingModal);

    if (waitingModal) {
        waitingModal.classList.remove('hidden');
        console.log('결과 대기 모달 표시 완료');
    } else {
        console.error('waiting-result-modal 요소를 찾을 수 없습니다!');
    }
}

// 결과 대기 모달 닫기
function closeWaitingResultModal() {
    console.log('=== closeWaitingResultModal 호출 ===');
    const waitingModal = document.getElementById('waiting-result-modal');
    if (waitingModal) {
        waitingModal.classList.add('hidden');
        console.log('결과 대기 모달 닫기 완료');
    } else {
        console.warn('waiting-result-modal 요소를 찾을 수 없습니다');
    }
}

// 게임 종료 단계 표시
// 라운드 종료 단계 표시
function showRoundEndPhase(data) {
    // 라운드 종료 시 모든 플레이어의 대기 모달 닫기 (지목된 플레이어의 "결과 대기중" 모달 포함)
    console.log('라운드 종료 - 결과 대기 모달 닫기');
    closeWaitingResultModal();

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

// 게임 승리자 팝업 표시
function showWinnerModal(data) {
    console.log('=== showWinnerModal 함수 시작 ===');
    console.log('받은 데이터:', data);
    console.log('document.readyState:', document.readyState);

    // DOM이 완전히 로드될 때까지 대기
    if (document.readyState === 'loading') {
        console.log('DOM 로딩 중 - DOMContentLoaded 이벤트 대기');
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOMContentLoaded 이벤트 발생 - showWinnerModal 재시도');
            showWinnerModal(data);
        });
        return;
    }

    console.log('DOM 로딩 완료 - 모달 표시 진행');

    // 모든 기존 모달 닫기 (숨김 처리)
    console.log('기존 모달 숨김 처리...');
    hideAllModals();

    // 짧은 지연 후 모달 표시 시도
    console.log('100ms 후 tryShowWinnerModal 호출 예약');
    setTimeout(() => {
        console.log('tryShowWinnerModal 호출 시작');
        tryShowWinnerModal(data);
    }, 100);

    console.log('=== showWinnerModal 함수 종료 ===');
}

// 승리자 모달 표시 시도 함수
function tryShowWinnerModal(data) {
    console.log('=== tryShowWinnerModal 시작 ===', data);
    console.log('승리자 모달 DOM 요소 검색...');

    // 모든 모달 요소 검색 시도
    const allModals = document.querySelectorAll('[id*="modal"]');
    console.log('페이지에서 찾은 모달 요소들:', Array.from(allModals).map(m => m.id));

    const modal = document.querySelector("#game-winner-modal");
    console.log('game-winner-modal 요소:', modal);

    if (!modal) {
        console.error('game-winner-modal 요소를 찾을 수 없습니다!');
        console.log('document.body:', document.body);
        console.log('document.getElementById("game-winner-modal"):', document.getElementById("game-winner-modal"));

        // 대체 승리자 팝업을 동적으로 생성
        showAlternativeWinnerPopup(data);
        return;
    }

    console.log('game-winner-modal 요소 찾음:', modal);

    const modalContent = modal.querySelector('.modal-content.winner-modal');
    if (!modalContent) {
        console.error('winner-modal 요소를 찾을 수 없습니다!');
        alert('게임이 종료되었습니다!\n' + (data.message || '승부 결과를 확인할 수 없습니다.'));
        setTimeout(() => returnToWaitingRoom(), 1000);
        return;
    }

    const title = document.getElementById('winner-title');
    const icon = document.getElementById('winner-icon');
    const message = document.getElementById('winner-message');
    const details = document.getElementById('winner-details');
    const rolesList = document.getElementById('roles-list');

    // 필수 요소들이 없으면 오류 로그 출력 후 대체 알림
    if (!title || !icon || !message || !details || !rolesList) {
        console.error('승리자 모달의 필수 요소들을 찾을 수 없습니다:', {
            title: !!title,
            icon: !!icon,
            message: !!message,
            details: !!details,
            rolesList: !!rolesList
        });
        alert('게임이 종료되었습니다!\n' + (data.message || '승부 결과를 확인할 수 없습니다.'));
        setTimeout(() => returnToWaitingRoom(), 1000);
        return;
    }

    // 승리자에 따른 테마 설정
    if (data.winner === 'LIAR' || data.reason === 'mission_success') {
        modalContent.classList.remove('citizen-victory');
        modalContent.classList.add('liar-victory');
        title.textContent = '🎭 라이어 승리!';
        icon.textContent = '🎭';
        message.textContent = '라이어가 승리했습니다!';
        details.textContent = data.message || '라이어가 마지막까지 정체를 숨기는데 성공했습니다!';
    } else if (data.winner === 'CITIZENS' || data.reason === 'citizens_victory') {
        modalContent.classList.remove('liar-victory');
        modalContent.classList.add('citizen-victory');
        title.textContent = '🎉 시민 승리!';
        icon.textContent = '🎉';
        message.textContent = '시민팀이 승리했습니다!';
        details.textContent = data.message || '시민들이 라이어를 성공적으로 찾아냈습니다!';
    } else {
        // 기본값
        modalContent.classList.remove('liar-victory', 'citizen-victory');
        title.textContent = '🏁 게임 종료';
        icon.textContent = '🏁';
        message.textContent = '게임이 종료되었습니다!';
        details.textContent = data.message || '모든 라운드가 완료되었습니다.';
    }

    // 플레이어 역할 공개
    if (data.players && Array.isArray(data.players)) {
        rolesList.innerHTML = data.players.map(player => `
            <div class="role-reveal-item">
                <span class="role-reveal-name">${player.nickname}</span>
                <span class="role-reveal-badge ${player.role.toLowerCase()}">
                    ${player.role === 'LIAR' ? '라이어' : '시민'}
                </span>
            </div>
        `).join('');
    } else {
        rolesList.innerHTML = '<p>역할 정보를 불러올 수 없습니다.</p>';
    }

    // 모달 표시
    modal.classList.remove('hidden');
    console.log('승리자 모달 표시 완료');

    // 10초 카운트다운 시작
    startWinnerModalCountdown();
}

// 승리자 모달 카운트다운 변수
let winnerCountdownTimer = null;
let countdownSeconds = 10;

// 승리자 모달 10초 카운트다운 시작
function startWinnerModalCountdown() {
    const countdownElement = document.getElementById('countdown-timer');
    if (!countdownElement) return;

    countdownSeconds = 10;
    countdownElement.textContent = countdownSeconds;

    // 기존 타이머가 있으면 정리
    if (winnerCountdownTimer) {
        clearInterval(winnerCountdownTimer);
    }

    winnerCountdownTimer = setInterval(() => {
        countdownSeconds--;
        countdownElement.textContent = countdownSeconds;

        if (countdownSeconds <= 0) {
            clearInterval(winnerCountdownTimer);
            winnerCountdownTimer = null;
            // 자동으로 대기실로 이동
            closeWinnerModalAndRedirect();
        }
    }, 1000);
}

// 승리자 팝업 닫기 및 새로운 방으로 이동
function closeWinnerModalAndRedirect() {
    console.log('=== 승리자 팝업 닫기 및 새로운 방으로 이동 ===');
    const modal = document.getElementById('game-winner-modal');
    if (modal) {
        modal.classList.add('hidden');
        console.log('승리자 팝업 닫기 완료');
    }

    // 타이머 정리
    if (winnerCountdownTimer) {
        clearInterval(winnerCountdownTimer);
        winnerCountdownTimer = null;
    }

    // 메인화면으로 이동
    setTimeout(() => {
        goToMainScreen();
    }, 300);
}

// [DEPRECATED] 새로운 방으로 이동하거나 대기실로 이동 - 더 이상 사용하지 않음
// 게임 종료 시 메인화면으로 이동하도록 변경됨 (goToMainScreen 사용)
function moveToNewRoomOrWaitingRoom() {
    console.log('[DEPRECATED] moveToNewRoomOrWaitingRoom 호출됨 - goToMainScreen으로 변경 필요');
    // 메인화면으로 이동
    goToMainScreen();
}

// 게임 승리자 팝업 닫기 (확인 버튼 클릭 시)
function closeWinnerModal() {
    console.log('=== 사용자가 확인 버튼 클릭 ===');
    closeWinnerModalAndRedirect();
}

// 메인화면으로 이동
function goToMainScreen() {
    console.log('메인화면으로 이동');

    // WebSocket 연결 해제
    if (AppState.stompClient && AppState.isConnected) {
        AppState.stompClient.disconnect();
        AppState.isConnected = false;
    }

    // 게임 상태 초기화
    AppState.gameState = null;
    AppState.gamePhase = null;
    AppState.roomInfo = {
        code: null,
        maxPlayers: 6,
        roundLimit: 3,
        currentRound: 1,
        state: null
    };
    AppState.playerInfo = {
        id: null,
        nickname: null,
        isHost: false,
        role: null,
        cardWord: null
    };
    AppState.newRoomCode = null;
    AppState.playerIdMapping = null;
    AppState.players = [];
    AppState.currentModal = null;
    AppState.finalDefenseCompleted = false;

    // 호스트 액션 버튼 모두 제거
    if (typeof clearHostActionButtons === 'function') {
        clearHostActionButtons();
    }

    // 모든 모달 닫기
    hideAllModals();

    // 입력 필드들 초기화
    const hostNicknameInput = document.getElementById('host-nickname');
    const playerNicknameInput = document.getElementById('player-nickname');
    const roomCodeInput = document.getElementById('room-code');

    if (hostNicknameInput) hostNicknameInput.value = '';
    if (playerNicknameInput) playerNicknameInput.value = '';
    if (roomCodeInput) roomCodeInput.value = '';

    // 메인 화면 표시
    if (typeof showScreen === 'function') {
        showScreen('main-screen');
    } else {
        // 페이지 새로고침으로 메인 화면으로 이동
        window.location.reload();
    }

    console.log('메인화면 이동 완료 - 새로운 게임을 만들 수 있습니다');
}

// 테스트용 승리자 팝업 함수 (전역 접근 가능)
function testWinnerModal() {
    const testData = {
        winner: "CITIZENS",
        message: "🎉 시민팀이 승리했습니다!",
        liarName: "테스트 라이어",
        players: [
            { playerId: 1, nickname: "플레이어1", role: "CITIZEN" },
            { playerId: 2, nickname: "테스트 라이어", role: "LIAR" }
        ]
    };
    console.log('테스트 승리자 팝업 호출...');
    showWinnerModal(testData);
}

// 전역 접근을 위해 window 객체에 등록
window.testWinnerModal = testWinnerModal;

// 대체 팝업 테스트 함수
function testAlternativePopup() {
    const testData = {
        winner: "LIAR",
        message: "🎭 라이어가 승리했습니다!",
        liarName: "테스트 라이어",
        players: [
            { playerId: 1, nickname: "플레이어1", role: "CITIZEN" },
            { playerId: 2, nickname: "테스트 라이어", role: "LIAR" }
        ]
    };
    console.log('대체 승리자 팝업 직접 호출...');
    showAlternativeWinnerPopup(testData);
}

// 전역 접근을 위해 window 객체에 등록
window.testAlternativePopup = testAlternativePopup;

// 대체 승리자 팝업 (HTML이 없을 때 사용)
function showAlternativeWinnerPopup(data) {
    console.log('대체 승리자 팝업 생성 중...', data);

    // 기존 대체 팝업이 있으면 제거
    const existingPopup = document.getElementById('alternative-winner-popup');
    if (existingPopup) {
        existingPopup.remove();
    }

    // 동적으로 팝업 생성
    const popup = document.createElement('div');
    popup.id = 'alternative-winner-popup';
    popup.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    // 승리자 정보 구성
    const winnerIcon = data.winner === 'LIAR' ? '🎭' : '🎉';
    const message = data.message || '게임이 종료되었습니다!';

    content.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">${winnerIcon}</div>
        <h2 style="margin: 0 0 20px 0; color: #333;">게임 종료</h2>
        <p style="font-size: 18px; margin: 0 0 20px 0; line-height: 1.4;">${message}</p>
        <div style="margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0;">🎭 역할 공개</h4>
            <div id="players-roles-list" style="text-align: left; max-height: 200px; overflow-y: auto;"></div>
        </div>
        <button id="close-alternative-popup" style="
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        ">확인 (메인화면으로)</button>
    `;

    // 플레이어 역할 목록 추가
    const rolesList = content.querySelector('#players-roles-list');
    if (data.players && rolesList) {
        data.players.forEach(player => {
            const roleItem = document.createElement('div');
            roleItem.style.cssText = 'padding: 5px 0; border-bottom: 1px solid #eee;';
            const roleIcon = player.role === 'LIAR' ? '🎭' : '👤';
            const roleName = player.role === 'LIAR' ? '라이어' : '시민';
            roleItem.innerHTML = `${roleIcon} ${player.nickname} - ${roleName}`;
            rolesList.appendChild(roleItem);
        });
    }

    popup.appendChild(content);
    document.body.appendChild(popup);

    // 확인 버튼 이벤트
    const closeBtn = content.querySelector('#close-alternative-popup');
    closeBtn.addEventListener('click', () => {
        console.log('대체 팝업 닫기 - 메인화면으로 이동');
        popup.remove();

        // UI 추가 초기화 (혹시 빠진 것들)
        if (typeof resetGameUI === 'function') {
            resetGameUI();
        }

        setTimeout(() => {
            goToMainScreen();
        }, 300);
    });

    // ESC 키로 닫기
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', handleEscape);

            // UI 추가 초기화 (혹시 빠진 것들)
            if (typeof resetGameUI === 'function') {
                resetGameUI();
            }

            setTimeout(() => {
                goToMainScreen();
            }, 300);
        }
    };
    document.addEventListener('keydown', handleEscape);

    console.log('대체 승리자 팝업 생성 완료');
}

// 최종 투표 결과 팝업 표시
function showFinalResultModal(data) {
    console.log('=== 최종 투표 결과 팝업 표시 ===', data);

    // DOM이 완전히 로드될 때까지 대기
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => showFinalResultModal(data));
        return;
    }

    // 모든 기존 모달 닫기
    hideAllModals();

}

// 최종 투표 결과 팝업 닫기
function closeFinalResultModal() {
    console.log('=== 최종 투표 결과 팝업 닫기 ===');
    const modal = document.querySelector("#final-result-modal");
    if (modal) {
        modal.classList.add('hidden');
        console.log('최종 투표 결과 팝업 닫기 완료');
    }
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

// 채팅 메시지 추가 함수
function addChatMessage(senderName, message, messageType = false) {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');

    // 메시지 타입에 따른 클래스 설정
    if (messageType === 'final-defense') {
        messageDiv.className = 'chat-message final-defense-message';
    } else if (messageType === true || (typeof messageType === 'boolean' && messageType)) {
        messageDiv.className = 'chat-message my-message';
    } else {
        messageDiv.className = 'chat-message other-message';
    }

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

// 채팅방 초기화 함수
function clearChatMessages() {
    console.log('채팅방 초기화 중...');
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
        chatMessages.innerHTML = '';
        console.log('채팅방 초기화 완료');
    } else {
        console.warn('chat-messages 요소를 찾을 수 없습니다');
    }
}

// 게임 종료 시 모든 UI 초기화
function resetGameUI() {
    console.log('게임 UI 완전 초기화 시작...');

    // 1. 호스트 컨트롤 영역 초기화
    clearHostActionButtons();
    const hostPanel = document.getElementById('host-control-panel');
    if (hostPanel) {
        hostPanel.classList.add('hidden');
    }

    // 2. 채팅창 초기화
    clearChatMessages();

    // 3. 단어 설명 입력란 초기화 및 활성화
    const descriptionInput = document.getElementById('description-input');
    if (descriptionInput) {
        descriptionInput.value = '';
        descriptionInput.disabled = false;
        descriptionInput.placeholder = '받은 단어에 대해 설명해주세요...';
    }

    // 4. 단어 설명 제출 버튼 활성화
    const submitBtn = document.getElementById('submit-description-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '단어 설명';
    }

    // 5. 게임 상태 정보 초기화
    const phaseInfo = document.getElementById('phase-info');
    if (phaseInfo) {
        phaseInfo.textContent = '게임 준비 중...';
    }

    // 6. 내 역할 및 단어 정보 초기화
    const myRole = document.getElementById('my-role');
    if (myRole) {
        myRole.textContent = '';
    }

    const myWord = document.getElementById('my-word');
    if (myWord) {
        myWord.textContent = '';
    }

    // 7. 라운드 정보 초기화
    const currentRound = document.getElementById('current-round');
    if (currentRound) {
        currentRound.textContent = '1';
    }

    // 8. 모든 게임 페이즈 숨김
    const gamePhases = document.querySelectorAll('.game-phase');
    gamePhases.forEach(phase => {
        phase.classList.add('hidden');
    });

    // 9. 채팅 입력 영역을 기본 상태로 복원
    const chatContainer = document.getElementById('game-chat-container');
    const descriptionSection = document.getElementById('permanent-description-input');
    if (chatContainer && descriptionSection) {
        chatContainer.style.display = 'block';
        descriptionSection.style.display = 'block';
    }

    console.log('게임 UI 완전 초기화 완료');
}

// ===== 사망한 플레이어 검은 스크린 관리 =====

// 사망한 플레이어용 검은 스크린 표시
function showDeadPlayerOverlay() {
    console.log('=== 사망한 플레이어 검은 스크린 표시 ===');

    const overlay = document.getElementById('dead-player-overlay');
    if (!overlay) {
        console.error('dead-player-overlay 요소를 찾을 수 없습니다');
        return;
    }

    // 모든 기존 모달과 UI 요소 숨김
    hideAllModals();
    hideAllGamePhases();

    // 검은 스크린 표시
    overlay.classList.remove('hidden');

    // 모든 인터랙션 비활성화
    disableAllInteractions();

    console.log('사망한 플레이어 검은 스크린 표시 완료');
}

// 사망한 플레이어용 검은 스크린 숨김
function hideDeadPlayerOverlay() {
    console.log('=== 사망한 플레이어 검은 스크린 숨김 ===');

    const overlay = document.getElementById('dead-player-overlay');
    if (!overlay) {
        console.error('dead-player-overlay 요소를 찾을 수 없습니다');
        return;
    }

    overlay.classList.add('hidden');

    // 인터랙션 재활성화
    enableAllInteractions();

    console.log('사망한 플레이어 검은 스크린 숨김 완료');
}

// 사망한 플레이어인지 확인
function isDeadPlayer() {
    // AppState에서 현재 플레이어의 생존 상태 확인
    if (!AppState.playerInfo || !AppState.playerInfo.id) {
        console.log('플레이어 정보가 없음');
        return false;
    }

    // 플레이어 목록에서 현재 플레이어 찾기
    const currentPlayer = AppState.players.find(p => p.playerId === AppState.playerInfo.id);
    if (!currentPlayer) {
        console.log('현재 플레이어를 목록에서 찾을 수 없음:', AppState.playerInfo.id);
        return false;
    }

    console.log('현재 플레이어 상태:', currentPlayer);
    console.log('isAlive 값:', currentPlayer.isAlive);
    console.log('alive 값:', currentPlayer.alive);

    // 사망 상태 확인 (isAlive 필드가 false이면 사망)
    // 백엔드 필드명과 일치하도록 isAlive 우선 확인, alive는 백업용
    const isDead = (currentPlayer.isAlive === false) || (currentPlayer.alive === false);
    console.log('사망 여부:', isDead);

    return isDead;
}

// 모든 인터랙션 비활성화 (사망한 플레이어용)
function disableAllInteractions() {
    console.log('모든 인터랙션 비활성화 중...');

    // 1. 모든 버튼 비활성화
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('dead-player-disabled');
    });

    // 2. 모든 입력 필드 비활성화
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.disabled = true;
        input.classList.add('dead-player-disabled');
    });

    // 3. 투표 카드 비활성화
    const voteCards = document.querySelectorAll('.vote-player-card');
    voteCards.forEach(card => {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.5';
        card.classList.add('dead-player-disabled');
    });

    // 4. 설명 입력 비활성화
    const descriptionInput = document.getElementById('description-input');
    if (descriptionInput) {
        descriptionInput.disabled = true;
        descriptionInput.placeholder = '사망한 플레이어는 설명을 작성할 수 없습니다';
    }

    // 5. 설명 제출 버튼 비활성화
    const submitBtn = document.getElementById('submit-description-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '참여 불가';
    }

    console.log('모든 인터랙션 비활성화 완료');
}

// 모든 인터랙션 재활성화 (생존한 플레이어용)
function enableAllInteractions() {
    console.log('모든 인터랙션 재활성화 중...');

    // 1. 비활성화된 버튼들 재활성화
    const buttons = document.querySelectorAll('button.dead-player-disabled');
    buttons.forEach(btn => {
        btn.disabled = false;
        btn.classList.remove('dead-player-disabled');
    });

    // 2. 비활성화된 입력 필드들 재활성화
    const inputs = document.querySelectorAll('input.dead-player-disabled, textarea.dead-player-disabled, select.dead-player-disabled');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('dead-player-disabled');
    });

    // 3. 투표 카드 재활성화
    const voteCards = document.querySelectorAll('.vote-player-card.dead-player-disabled');
    voteCards.forEach(card => {
        card.style.pointerEvents = '';
        card.style.opacity = '';
        card.classList.remove('dead-player-disabled');
    });

    // 4. 설명 입력 재활성화
    const descriptionInput = document.getElementById('description-input');
    if (descriptionInput) {
        descriptionInput.disabled = false;
        descriptionInput.placeholder = '받은 단어에 대해 설명해주세요...';
    }

    // 5. 설명 제출 버튼 재활성화
    const submitBtn = document.getElementById('submit-description-btn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '단어 설명';
    }

    console.log('모든 인터랙션 재활성화 완료');
}

// 플레이어 생존 상태 업데이트 시 검은 스크린 처리
function handlePlayerDeathStateChange() {
    console.log('플레이어 생존 상태 변경 처리 중...');

    if (isDeadPlayer()) {
        console.log('현재 플레이어가 사망 상태 - 검은 스크린 표시');
        showDeadPlayerOverlay();
    } else {
        console.log('현재 플레이어가 생존 상태 - 검은 스크린 숨김');
        hideDeadPlayerOverlay();
    }
}

// 플레이어 상태 변경 감지를 위한 헬퍼 함수
function checkAndUpdateDeadPlayerStatus() {
    // 게임이 진행 중일 때만 확인
    if (AppState.gameState && AppState.gameState.state === 'ROUND') {
        handlePlayerDeathStateChange();
    }
}