-- 테마/단어쌍
CREATE TABLE theme (
    theme_id       BIGSERIAL PRIMARY KEY,
    theme_group    VARCHAR(50),           -- "음식", "여행", "IT" 등
    difficulty     SMALLINT DEFAULT 1,
    locale         VARCHAR(10) DEFAULT 'ko-KR', -- i18n
    age_group      VARCHAR(20),           -- e.g. "40-60", "all"
    word_a         VARCHAR(100) NOT NULL,
    word_b         VARCHAR(100) NOT NULL,
    hint_a         VARCHAR(120),
    hint_b         VARCHAR(120),
    active         BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_theme_group ON theme(theme_group);
CREATE INDEX idx_theme_active ON theme(active);

-- 방
CREATE TABLE game_room (
    room_id        BIGSERIAL PRIMARY KEY,
    code           VARCHAR(8) UNIQUE NOT NULL,
    max_players    SMALLINT NOT NULL CHECK (max_players BETWEEN 3 AND 12),
    round_limit    SMALLINT NOT NULL CHECK (round_limit BETWEEN 1 AND 5), -- 기본 3
    state          VARCHAR(20) NOT NULL,      -- LOBBY / ROUND / END
    current_round  SMALLINT DEFAULT 0,        -- 진행중 라운드 idx
    theme_id       BIGINT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at       TIMESTAMP,
    version        BIGINT DEFAULT 0,          -- 낙관적 락
    CONSTRAINT fk_game_room_theme FOREIGN KEY (theme_id) REFERENCES theme(theme_id)
);
CREATE INDEX idx_room_state ON game_room(state);

-- 플레이어(세션)
CREATE TABLE player (
    player_id      BIGSERIAL PRIMARY KEY,
    room_id        BIGINT NOT NULL,
    user_id        BIGINT,                    -- 익명 도메인은 null 허용
    nickname       VARCHAR(20) NOT NULL,
    is_host        BOOLEAN DEFAULT FALSE,
    role           VARCHAR(10) NOT NULL,      -- LIAR / CITIZEN
    is_alive       BOOLEAN DEFAULT TRUE,
    order_no       SMALLINT,                  -- 발언 순서
    card_word      VARCHAR(100),              -- 시민은 A/B 중 하나, LIAR 는 null 가능
    joined_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at        TIMESTAMP,
    CONSTRAINT fk_player_room FOREIGN KEY (room_id) REFERENCES game_room(room_id) ON DELETE CASCADE
);
CREATE INDEX idx_player_room ON player(room_id);

-- 라운드
CREATE TABLE round (
    round_id       BIGSERIAL PRIMARY KEY,
    room_id        BIGINT NOT NULL,
    idx            SMALLINT NOT NULL,         -- 1..round_limit
    state          VARCHAR(20) NOT NULL,      -- DESC/VOTE/FINAL_DEFENSE/JUDGE/END
    started_at     TIMESTAMP,
    ended_at       TIMESTAMP,
    accused_pid    BIGINT,                    -- 지목 대상(있다면)
    CONSTRAINT fk_round_room FOREIGN KEY (room_id) REFERENCES game_room(room_id) ON DELETE CASCADE,
    UNIQUE(room_id, idx)
);
CREATE INDEX idx_round_state ON round(state);

-- 투표
CREATE TABLE vote (
    vote_id        BIGSERIAL PRIMARY KEY,
    round_id       BIGINT NOT NULL,
    voter_pid      BIGINT NOT NULL,
    target_pid     BIGINT NOT NULL,
    is_final_vote  BOOLEAN DEFAULT FALSE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vote_round FOREIGN KEY (round_id) REFERENCES round(round_id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_voter FOREIGN KEY (voter_pid) REFERENCES player(player_id) ON DELETE CASCADE,
    CONSTRAINT fk_vote_target FOREIGN KEY (target_pid) REFERENCES player(player_id) ON DELETE CASCADE,
    UNIQUE(round_id, voter_pid, is_final_vote)   -- 중복투표 방지
);
CREATE INDEX idx_vote_round_final ON vote(round_id, is_final_vote);

-- 광고/수익
CREATE TABLE ad_event (
    ad_event_id    BIGSERIAL PRIMARY KEY,
    user_or_pid    BIGINT,
    room_id        BIGINT,
    ad_type        VARCHAR(20),               -- REWARDED / INTERSTITIAL / NATIVE
    placement      VARCHAR(40),               -- BETWEEN_ROUNDS, VOTE_PAUSE, HINT 등
    status         VARCHAR(20),               -- REQUESTED/FILLED/START/COMPLETE
    revenue_micros BIGINT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_ad_room ON ad_event(room_id);

-- 감사/행동 로그(운영 분석)
CREATE TABLE audit_log (
    log_id         BIGSERIAL PRIMARY KEY,
    room_id        BIGINT,
    player_id      BIGINT,
    action         VARCHAR(40),               -- JOIN/LEAVE/DESC_SUBMIT/VOTE/JUDGE 등
    payload        TEXT,                      -- JSON 형태로 저장
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_room_time ON audit_log(room_id, created_at);

-- 발언 로그(요약/AI 가공 대비)
CREATE TABLE message_log (
    msg_id         BIGSERIAL PRIMARY KEY,
    room_id        BIGINT NOT NULL,
    round_id       BIGINT,
    player_id      BIGINT,
    type           VARCHAR(20),               -- DESC / FINAL_DEFENSE
    text           TEXT,
    summary        VARCHAR(140),              -- 서버 요약(선택)
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_msg_room_round ON message_log(room_id, round_id);

-- 자기 투표 방지 트리거 함수 (H2 호환)
-- CREATE OR REPLACE FUNCTION prevent_self_vote()
-- RETURNS trigger AS $$
-- BEGIN
--   IF NEW.voter_pid = NEW.target_pid THEN
--     RAISE EXCEPTION 'self vote not allowed';
--   END IF;
--   RETURN NEW;
-- END; $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER trg_prevent_self_vote
-- BEFORE INSERT ON vote
-- FOR EACH ROW EXECUTE FUNCTION prevent_self_vote();