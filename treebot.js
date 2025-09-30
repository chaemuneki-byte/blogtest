// 트리봇 AI 챗봇 - Google Apps Script 연동
class TreeBot {
    constructor() {
        this.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbwdBVeEdnyq9mqSmvxI6pG8SDc07yPeLiXEL0rrEb9Zu51GMOMH4zaQvJbOK3ctKHnkSw/exec'; // Google Apps Script 웹앱 URL
        this.chatHistory = [];
        this.sessionId = this.generateSessionId();
        this.isOpen = false;
        this.isLoading = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        console.log('트리봇이 초기화되었습니다.');
    }

    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('treeBotToggle');
        const closeBtn = document.getElementById('treeBotClose');
        const sendBtn = document.getElementById('treeBotSend');
        const input = document.getElementById('treeBotInput');

        toggleBtn?.addEventListener('click', () => this.toggleChat());
        closeBtn?.addEventListener('click', () => this.closeChat());
        sendBtn?.addEventListener('click', () => this.sendMessage());

        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 채팅 창 외부 클릭 시 닫기
        document.addEventListener('click', (e) => {
            const chatContainer = document.getElementById('treeBot');
            if (this.isOpen && !chatContainer?.contains(e.target)) {
                this.closeChat();
            }
        });
    }

    toggleChat() {
        if (this.isOpen) {
            this.closeChat();
        } else {
            this.openChat();
        }
    }

    openChat() {
        const chatWindow = document.getElementById('treeBotChat');
        const icon = document.getElementById('treeBotIcon');

        if (chatWindow && icon) {
            chatWindow.classList.remove('hidden');
            chatWindow.classList.add('animate-fadeInUp');
            icon.className = 'fas fa-times text-xl';
            this.isOpen = true;

            // 입력창에 포커스
            setTimeout(() => {
                document.getElementById('treeBotInput')?.focus();
            }, 300);
        }
    }

    closeChat() {
        const chatWindow = document.getElementById('treeBotChat');
        const icon = document.getElementById('treeBotIcon');

        if (chatWindow && icon) {
            chatWindow.classList.add('hidden');
            chatWindow.classList.remove('animate-fadeInUp');
            icon.className = 'fas fa-robot text-xl';
            this.isOpen = false;
        }
    }

    async sendMessage() {
        const input = document.getElementById('treeBotInput');
        const message = input?.value?.trim();

        if (!message || this.isLoading) return;

        // Apps Script URL 확인
        if (!this.appsScriptUrl) {
            this.showErrorMessage('관리자가 Google Apps Script URL을 설정해야 합니다.');
            return;
        }

        // 사용자 메시지 표시
        this.addMessage('user', message);
        input.value = '';
        this.setLoading(true);

        try {
            const response = await this.callAppsScriptAPI(message);
            this.addMessage('bot', response);
            this.saveChatHistory();
        } catch (error) {
            console.error('트리봇 오류:', error);
            this.showErrorMessage('죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        } finally {
            this.setLoading(false);
        }
    }

    async callAppsScriptAPI(userMessage) {
        console.log('트리봇 API 호출 시작:', userMessage);

        // Google Apps Script는 GET 방식이 더 안정적이므로 GET으로 시작
        try {
            return await this.makeGetRequest(userMessage);
        } catch (error) {
            console.error('GET 요청 실패, POST로 재시도:', error);

            // GET 실패 시 POST로 재시도
            try {
                return await this.makePostRequest(userMessage);
            } catch (postError) {
                console.error('POST 요청도 실패:', postError);
                throw new Error('서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.');
            }
        }
    }

    // GET 방식으로 요청
    async makeGetRequest(userMessage) {
        const params = new URLSearchParams({
            action: 'chat',
            message: userMessage,
            sessionId: this.sessionId
        });

        const getUrl = `${this.appsScriptUrl}?${params.toString()}`;
        console.log('GET 요청:', getUrl);

        const response = await fetch(getUrl, {
            method: 'GET'
        });

        console.log('GET 응답 상태:', response.status);

        if (!response.ok) {
            throw new Error(`GET 요청 실패: ${response.status}`);
        }

        const data = await response.json();
        console.log('GET 응답 데이터:', data);

        // 에러 체크
        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.success) {
            throw new Error(data.error || 'API 오류가 발생했습니다.');
        }

        // 응답 구조: { success: true, response: "...", data: {...} }
        // 우선순위: data.response > data.data.response > data.data (문자열)
        if (data.response && typeof data.response === 'string') {
            console.log('응답 타입: data.response (문자열)');
            return data.response;
        } else if (data.data && data.data.response) {
            console.log('응답 타입: data.data.response');
            return data.data.response;
        } else if (data.data && typeof data.data === 'string') {
            console.log('응답 타입: data.data (문자열)');
            return data.data;
        } else {
            console.error('예상하지 못한 응답 구조:', data);
            throw new Error('AI 응답을 찾을 수 없습니다. Google Apps Script를 확인해주세요.');
        }
    }

    // POST 방식으로 요청 (폴백)
    async makePostRequest(userMessage) {
        const requestData = {
            action: 'chat',
            message: userMessage,
            sessionId: this.sessionId
        };

        console.log('POST 요청:', requestData);

        const response = await fetch(this.appsScriptUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        console.log('POST 응답 상태:', response.status);

        if (!response.ok) {
            throw new Error(`POST 요청 실패: ${response.status}`);
        }

        const data = await response.json();
        console.log('POST 응답 데이터:', data);

        if (!data.success) {
            throw new Error(data.error || 'API 오류');
        }

        // 응답 데이터 구조 확인 및 안전한 접근
        if (data.data && data.data.response) {
            return data.data.response;
        } else if (data.response) {
            return data.response;
        } else {
            console.error('예상하지 못한 응답 구조:', data);
            throw new Error('응답 데이터 구조가 올바르지 않습니다.');
        }
    }

    addMessage(type, content) {
        const messagesContainer = document.getElementById('treeBotMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');

        if (type === 'user') {
            messageDiv.className = 'flex items-start space-x-3 justify-end';
            messageDiv.innerHTML = `
                <div class="bg-accent text-white rounded-2xl rounded-tr-lg px-4 py-3 shadow-sm max-w-xs">
                    <p class="text-sm">${this.escapeHtml(content)}</p>
                </div>
                <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-white text-sm"></i>
                </div>
            `;
        } else {
            messageDiv.className = 'flex items-start space-x-3';
            messageDiv.innerHTML = `
                <div class="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
                <div class="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-lg px-4 py-3 shadow-sm max-w-xs">
                    <div class="text-sm text-gray-800 dark:text-gray-200">${this.formatMessage(content)}</div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // 채팅 히스토리에 추가
        this.chatHistory.push({
            type: type,
            content: content,
            timestamp: new Date().toISOString()
        });
    }

    formatMessage(content) {
        // HTML 이스케이프 후 마크다운 스타일 포맷팅 적용
        let formatted = this.escapeHtml(content);

        // **굵은 글씨** 처리
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 줄바꿈 처리
        formatted = formatted.replace(/\n/g, '<br>');

        // 번호 목록 처리 (1. 2. 3. ...)
        formatted = formatted.replace(/^(\d+\.)\s/gm, '<br><strong>$1</strong> ');

        // 항목 목록 처리 (• 또는 -)
        formatted = formatted.replace(/^[•-]\s/gm, '<br>• ');

        // 이모지 처리 (이미 있는 이모지는 유지)
        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showErrorMessage(message) {
        this.addMessage('bot', `❌ ${message}`);
    }

    setLoading(loading) {
        this.isLoading = loading;
        const sendBtn = document.getElementById('treeBotSend');
        const input = document.getElementById('treeBotInput');
        const loadingIndicator = document.getElementById('treeBotLoading');

        if (sendBtn && input && loadingIndicator) {
            if (loading) {
                sendBtn.disabled = true;
                input.disabled = true;
                loadingIndicator.classList.remove('hidden');
            } else {
                sendBtn.disabled = false;
                input.disabled = false;
                loadingIndicator.classList.add('hidden');
            }
        }
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('treeBotMessages');
        if (messagesContainer) {
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);
        }
    }

    saveChatHistory() {
        try {
            // 최근 20개 메시지만 저장
            const recentHistory = this.chatHistory.slice(-20);
            localStorage.setItem('treeBotHistory', JSON.stringify(recentHistory));
            localStorage.setItem('treeBotSessionId', this.sessionId);
        } catch (error) {
            console.warn('채팅 히스토리 저장 실패:', error);
        }
    }

    loadChatHistory() {
        try {
            // 세션 ID 복원
            const savedSessionId = localStorage.getItem('treeBotSessionId');
            if (savedSessionId) {
                this.sessionId = savedSessionId;
            }

            // 채팅 히스토리는 로드하지 않음 (항상 깨끗한 상태로 시작)
            // 개발/테스트 단계에서는 히스토리 비활성화
            this.chatHistory = [];
            console.log('채팅 히스토리 초기화됨');

        } catch (error) {
            console.warn('채팅 히스토리 로드 실패:', error);
            this.chatHistory = [];
        }
    }

    addMessageToDOM(type, content, saveToHistory = true) {
        const messagesContainer = document.getElementById('treeBotMessages');
        if (!messagesContainer) return;

        const messageDiv = document.createElement('div');

        if (type === 'user') {
            messageDiv.className = 'flex items-start space-x-3 justify-end';
            messageDiv.innerHTML = `
                <div class="bg-accent text-white rounded-2xl rounded-tr-lg px-4 py-3 shadow-sm max-w-xs">
                    <p class="text-sm">${this.escapeHtml(content)}</p>
                </div>
                <div class="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-user text-white text-sm"></i>
                </div>
            `;
        } else {
            messageDiv.className = 'flex items-start space-x-3';
            messageDiv.innerHTML = `
                <div class="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
                <div class="bg-white dark:bg-gray-700 rounded-2xl rounded-tl-lg px-4 py-3 shadow-sm max-w-xs">
                    <div class="text-sm text-gray-800 dark:text-gray-200">${this.formatMessage(content)}</div>
                </div>
            `;
        }

        messagesContainer.appendChild(messageDiv);

        if (saveToHistory) {
            this.chatHistory.push({
                type: type,
                content: content,
                timestamp: new Date().toISOString()
            });
        }
    }

    // Apps Script URL 설정
    setAppsScriptUrl(url) {
        this.appsScriptUrl = url;
        localStorage.setItem('treeBotAppsScriptUrl', url);
        console.log('트리봇 Apps Script URL이 설정되었습니다.');
    }

    // 저장된 URL 로드
    loadAppsScriptUrl() {
        const saved = localStorage.getItem('treeBotAppsScriptUrl');
        if (saved) {
            this.appsScriptUrl = saved;
        }
    }

    // 채팅 히스토리 초기화
    clearHistory() {
        this.chatHistory = [];
        this.sessionId = this.generateSessionId();
        localStorage.removeItem('treeBotHistory');
        localStorage.removeItem('treeBotSessionId');

        // 화면에서 환영 메시지 외 모든 메시지 제거
        const messagesContainer = document.getElementById('treeBotMessages');
        if (messagesContainer) {
            const welcomeMessage = messagesContainer.querySelector('div');
            messagesContainer.innerHTML = '';
            if (welcomeMessage) {
                messagesContainer.appendChild(welcomeMessage);
            }
        }
    }

    // 연결 테스트
    async testConnection() {
        if (!this.appsScriptUrl) {
            console.error('Apps Script URL이 설정되지 않았습니다.');
            return false;
        }

        try {
            const response = await fetch(this.appsScriptUrl + '?action=health');
            const data = await response.json();

            console.log('연결 테스트 결과:', data);
            return data.success && data.data.status === 'OK';
        } catch (error) {
            console.error('연결 테스트 실패:', error);
            return false;
        }
    }
}

// 트리봇 인스턴스 생성 및 초기화
let treeBot;

document.addEventListener('DOMContentLoaded', () => {
    treeBot = new TreeBot();
    treeBot.loadAppsScriptUrl();

    // 환영 메시지 추가 (첫 실행 시에만)
    const hasShownWelcome = localStorage.getItem('treeBotWelcomeShown');
    if (!hasShownWelcome) {
        setTimeout(() => {
            treeBot.addMessage('bot', `안녕하세요! 🌲

저는 **트리봇**입니다.

네이버 블로그 수익화와 관련된 모든 질문에 답변해드릴게요!

• 상위노출 SEO 전략
• 전환형 글쓰기 방법
• AI 자동화 활용법
• 수익화 방법론

궁금한 점이 있으시면 언제든 물어보세요! 😊`);

            localStorage.setItem('treeBotWelcomeShown', 'true');
        }, 500);
    }
});

// 전역 함수들
window.setTreeBotUrl = function(url) {
    if (treeBot) {
        treeBot.setAppsScriptUrl(url);
        console.log('트리봇 URL이 설정되었습니다!');

        // 연결 테스트
        treeBot.testConnection().then(success => {
            if (success) {
                console.log('✅ 트리봇 연결 성공!');
            } else {
                console.log('❌ 트리봇 연결 실패. URL을 확인해주세요.');
            }
        });
    } else {
        console.error('트리봇이 아직 초기화되지 않았습니다.');
    }
};

window.clearTreeBotHistory = function() {
    if (treeBot) {
        treeBot.clearHistory();
        console.log('트리봇 히스토리가 초기화되었습니다.');
    }
};

window.testTreeBotConnection = function() {
    if (treeBot) {
        return treeBot.testConnection();
    }
    return Promise.resolve(false);
};

window.resetTreeBotWelcome = function() {
    localStorage.removeItem('treeBotWelcomeShown');
    console.log('환영 메시지가 재설정되었습니다. 페이지를 새로고침하면 다시 표시됩니다.');
};

window.clearAllTreeBotData = function() {
    localStorage.removeItem('treeBotHistory');
    localStorage.removeItem('treeBotSessionId');
    localStorage.removeItem('treeBotAppsScriptUrl');
    localStorage.removeItem('treeBotWelcomeShown');
    console.log('모든 트리봇 데이터가 초기화되었습니다. 페이지를 새로고침해주세요.');

    // 현재 채팅창도 초기화
    if (treeBot) {
        const messagesContainer = document.getElementById('treeBotMessages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        treeBot.chatHistory = [];
        treeBot.sessionId = treeBot.generateSessionId();
    }
};