// 오디오 시스템 관리
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.7; // 기본 볼륨 70%
        this.soundEnabled = true;
        this.audioCache = new Map();
        this.currentlyPlaying = new Set();

        // 사용자 설정 로드
        this.loadSettings();

        // 오디오 컨텍스트 초기화
        this.initAudioContext();

        // 효과음 정의
        this.sounds = {
            // 게임 진행 관련
            gameStart: { file: 'countdown.mp3', volume: 0.8 },
            countdownTick: { file: 'tick.mp3', volume: 0.6 },
            roundStart: { file: 'round-start.mp3', volume: 0.7 },

            // 액션 관련
            descriptionSubmit: { file: 'submit.mp3', volume: 0.5 },
            voteStart: { file: 'vote-start.mp3', volume: 0.8 },
            voteSubmit: { file: 'vote-submit.mp3', volume: 0.6 },

            // 결과 관련
            voteResult: { file: 'vote-result.mp3', volume: 0.7 },
            finalDefense: { file: 'final-defense.mp3', volume: 0.8 },
            elimination: { file: 'elimination.mp3', volume: 0.8 },
            survival: { file: 'survival.mp3', volume: 0.7 },

            // 게임 종료
            victory: { file: 'victory.mp3', volume: 0.9 },
            defeat: { file: 'defeat.mp3', volume: 0.8 },

            // 일반
            playerJoin: { file: 'join.mp3', volume: 0.4 },
            playerLeave: { file: 'leave.mp3', volume: 0.4 },
            notification: { file: 'notification.mp3', volume: 0.6 },
            error: { file: 'error.mp3', volume: 0.7 },
            success: { file: 'success.mp3', volume: 0.6 },

            // UI 관련
            buttonClick: { file: 'click.mp3', volume: 0.3 },
            modalOpen: { file: 'modal-open.mp3', volume: 0.4 },
            modalClose: { file: 'modal-close.mp3', volume: 0.4 }
        };

        // 효과음 미리 로드
        this.preloadSounds();
    }

    // 오디오 컨텍스트 초기화
    initAudioContext() {
        try {
            // 브라우저 호환성을 위한 AudioContext 생성
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // 사용자 상호작용 후 컨텍스트 재개
            document.addEventListener('click', () => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            }, { once: true });

            console.log('오디오 컨텍스트 초기화 완료');
        } catch (error) {
            console.warn('오디오 컨텍스트 초기화 실패:', error);
            this.audioContext = null;
        }
    }

    // 효과음 미리 로드
    async preloadSounds() {
        console.log('효과음 미리 로드 시작...');

        for (const [soundName, config] of Object.entries(this.sounds)) {
            try {
                await this.loadSound(soundName, config.file);
            } catch (error) {
                console.warn(`효과음 로드 실패: ${soundName}`, error);
                // 로드 실패 시 폴백 사운드 생성
                this.createFallbackSound(soundName);
            }
        }

        console.log('효과음 미리 로드 완료');
    }

    // 개별 효과음 로드
    async loadSound(name, filename) {
        try {
            const response = await fetch(`/sounds/${filename}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            this.audioCache.set(name, audioBuffer);
            console.log(`효과음 로드 완료: ${name}`);
        } catch (error) {
            console.warn(`효과음 로드 실패: ${name} (${filename})`, error);
            // Web Audio API를 사용한 기본 톤 생성
            this.createFallbackSound(name);
        }
    }

    // 폴백 사운드 생성 (Web Audio API 사용)
    createFallbackSound(name) {
        if (!this.audioContext) return;

        try {
            // 각 사운드별 특성화된 톤 생성
            const sampleRate = this.audioContext.sampleRate;
            const duration = this.getSoundDuration(name);
            const frameCount = sampleRate * duration;

            const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
            const channelData = audioBuffer.getChannelData(0);

            // 사운드 타입별 주파수 설정
            const frequency = this.getSoundFrequency(name);

            for (let i = 0; i < frameCount; i++) {
                const t = i / sampleRate;
                // 간단한 톤 생성 (사인파 + 페이드아웃)
                const fade = Math.max(0, 1 - (t / duration));
                channelData[i] = Math.sin(2 * Math.PI * frequency * t) * fade * 0.3;
            }

            this.audioCache.set(name, audioBuffer);
            console.log(`폴백 사운드 생성: ${name}`);
        } catch (error) {
            console.warn(`폴백 사운드 생성 실패: ${name}`, error);
        }
    }

    // 사운드별 지속시간 설정
    getSoundDuration(name) {
        const durations = {
            countdownTick: 0.1,
            buttonClick: 0.1,
            notification: 0.3,
            success: 0.4,
            error: 0.5,
            gameStart: 1.0,
            victory: 2.0,
            defeat: 2.0
        };
        return durations[name] || 0.3;
    }

    // 사운드별 주파수 설정
    getSoundFrequency(name) {
        const frequencies = {
            countdownTick: 800,
            buttonClick: 600,
            notification: 450,
            success: 520,
            error: 300,
            gameStart: 440,
            victory: 660,
            defeat: 220,
            playerJoin: 500,
            playerLeave: 400
        };
        return frequencies[name] || 440;
    }

    // 효과음 재생
    playSound(soundName, options = {}) {
        if (!this.soundEnabled || !this.audioContext) {
            return;
        }

        try {
            const audioBuffer = this.audioCache.get(soundName);
            if (!audioBuffer) {
                console.warn(`효과음을 찾을 수 없습니다: ${soundName}`);
                return;
            }

            // 동일한 사운드 중복 재생 방지 (옵션)
            if (options.preventOverlap && this.currentlyPlaying.has(soundName)) {
                return;
            }

            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();

            source.buffer = audioBuffer;

            // 볼륨 설정
            const soundConfig = this.sounds[soundName] || { volume: 0.5 };
            const volume = (options.volume !== undefined ? options.volume : soundConfig.volume) * this.masterVolume;
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);

            // 연결
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 재생 상태 추적
            this.currentlyPlaying.add(soundName);
            source.onended = () => {
                this.currentlyPlaying.delete(soundName);
            };

            // 재생
            source.start(0);

            console.log(`효과음 재생: ${soundName}`);
        } catch (error) {
            console.warn(`효과음 재생 실패: ${soundName}`, error);
        }
    }

    // 볼륨 설정
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.saveSettings();
        console.log(`마스터 볼륨 설정: ${this.masterVolume * 100}%`);
    }

    // 사운드 활성화/비활성화
    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        this.saveSettings();
        console.log(`사운드 ${enabled ? '활성화' : '비활성화'}`);
    }

    // 설정 저장
    saveSettings() {
        const settings = {
            masterVolume: this.masterVolume,
            soundEnabled: this.soundEnabled
        };
        localStorage.setItem('liarGameAudioSettings', JSON.stringify(settings));
    }

    // 설정 로드
    loadSettings() {
        try {
            const settings = localStorage.getItem('liarGameAudioSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.masterVolume = parsed.masterVolume || 0.7;
                this.soundEnabled = parsed.soundEnabled !== false; // 기본값 true
            }
        } catch (error) {
            console.warn('오디오 설정 로드 실패:', error);
        }
    }

    // 모든 사운드 정지
    stopAllSounds() {
        this.currentlyPlaying.clear();
        if (this.audioContext) {
            this.audioContext.suspend();
            setTimeout(() => {
                if (this.audioContext) {
                    this.audioContext.resume();
                }
            }, 100);
        }
    }
}

// 전역 오디오 매니저 인스턴스
let audioManager = null;

// 오디오 매니저 초기화
function initAudioManager() {
    if (!audioManager) {
        audioManager = new AudioManager();
        console.log('오디오 매니저 초기화 완료');
    }
    return audioManager;
}

// 편의 함수들
function playSound(soundName, options = {}) {
    if (audioManager) {
        audioManager.playSound(soundName, options);
    }
}

function setMasterVolume(volume) {
    if (audioManager) {
        audioManager.setMasterVolume(volume);
    }
}

function setSoundEnabled(enabled) {
    if (audioManager) {
        audioManager.setSoundEnabled(enabled);
    }
}

function getMasterVolume() {
    return audioManager ? audioManager.masterVolume : 0.7;
}

function isSoundEnabled() {
    return audioManager ? audioManager.soundEnabled : true;
}

// 페이지 로드 시 오디오 매니저 초기화
document.addEventListener('DOMContentLoaded', () => {
    initAudioManager();
});