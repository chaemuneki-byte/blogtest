/**
 * 뉴스 로더 - news-data.json 파일을 읽어서 화면에 표시
 * 1시간마다 자동 새로고침
 */

class NewsLoader {
    constructor() {
        this.newsDataUrl = './news-data.json';
        this.updateInterval = 60 * 60 * 1000; // 1시간 (밀리초)
        this.retryDelay = 5000; // 5초
        this.init();
    }

    async init() {
        console.log('뉴스 로더 초기화');
        await this.loadNews();

        // 1시간마다 자동 새로고침
        setInterval(() => {
            console.log('뉴스 자동 새로고침...');
            this.loadNews();
        }, this.updateInterval);
    }

    async loadNews() {
        try {
            console.log('뉴스 로딩 시작:', this.newsDataUrl);
            const response = await fetch(this.newsDataUrl + '?t=' + Date.now());
            console.log('응답 상태:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('받은 데이터:', data);

            // displayList 우선 확인, 없으면 articles 확인
            if (data && data.displayList && data.displayList.length > 0) {
                console.log('✅ displayList 사용:', data.displayList.length, '개');
                this.displayNews(data);
            } else if (data && data.articles && data.articles.length > 0) {
                console.log('✅ articles 사용:', data.articles.length, '개');
                this.displayNews(data);
            } else {
                console.warn('⚠️ 뉴스 데이터 없음. data:', data);
                this.showError('뉴스 데이터가 없습니다.');
            }

        } catch (error) {
            console.error('❌ 뉴스 로딩 실패:', error);
            this.showError('뉴스를 불러올 수 없습니다. 잠시 후 다시 시도됩니다.');

            // 5초 후 재시도
            setTimeout(() => this.loadNews(), this.retryDelay);
        }
    }

    displayNews(data) {
        const newsGrid = document.getElementById('newsGrid');
        const lastUpdateEl = document.getElementById('newsLastUpdate');

        if (!newsGrid) {
            console.error('newsGrid 엘리먼트를 찾을 수 없습니다.');
            return;
        }

        // 마지막 업데이트 시간 표시
        if (lastUpdateEl) {
            lastUpdateEl.textContent = data.lastUpdatedKr || '알 수 없음';
        }

        // 뉴스 카드 생성 (메인에는 9개만 표시)
        newsGrid.innerHTML = '';

        const displayList = data.displayList || data.articles.slice(0, 9);

        displayList.forEach((article, index) => {
            const card = this.createNewsCard(article, index);
            newsGrid.appendChild(card);
        });

        console.log(`✅ ${displayList.length}개 뉴스 표시 (전체: ${data.totalArticles}개)`);
    }

    createNewsCard(article, index) {
        const card = document.createElement('a');
        card.href = article.url;
        card.target = '_blank';
        card.rel = 'noopener noreferrer';
        card.className = 'block bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 cursor-pointer';

        // 카테고리별 색상 매핑
        const categoryColors = {
            '정치': '#3498DB',
            '경제': '#E74C3C',
            '사회': '#2ECC71',
            '생활/문화': '#9B59B6',
            'IT/과학': '#4ECDC4',
            '세계': '#F39C12',
            '연예': '#E91E63',
            '스포츠': '#FF6B6B'
        };

        const categoryColor = categoryColors[article.category] || '#4ECDC4';
        const imageUrl = article.imageUrl;

        card.innerHTML = `
            <!-- 이미지 -->
            <div class="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                ${imageUrl ? `
                    <img src="${this.escapeHtml(imageUrl)}"
                         alt="${this.escapeHtml(article.title)}"
                         class="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         loading="lazy">
                    <div class="absolute inset-0 bg-gradient-to-br from-[${categoryColor}]/20 to-[${categoryColor}]/40 items-center justify-center hidden" style="display: none;">
                        <div class="text-center text-white">
                            <i class="fas fa-newspaper text-5xl mb-2 opacity-50"></i>
                            <p class="text-lg font-bold">${this.escapeHtml(article.category || '뉴스')}</p>
                        </div>
                    </div>
                ` : `
                    <div class="absolute inset-0 bg-gradient-to-br from-[${categoryColor}]/20 to-[${categoryColor}]/40 flex items-center justify-center">
                        <div class="text-center text-gray-600 dark:text-gray-300">
                            <i class="fas fa-newspaper text-5xl mb-2 opacity-50"></i>
                            <p class="text-lg font-bold">${this.escapeHtml(article.category || '뉴스')}</p>
                        </div>
                    </div>
                `}
                <div class="absolute top-3 left-3">
                    <span class="bg-accent text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        ${this.escapeHtml(article.category || '뉴스')}
                    </span>
                </div>
                <!-- 클릭 표시 오버레이 -->
                <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                    <i class="fas fa-external-link-alt text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
                </div>
            </div>

            <!-- 내용 -->
            <div class="p-6">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <i class="fas fa-newspaper mr-1"></i>
                        ${this.escapeHtml(article.publisher || '네이버 뉴스')}
                    </span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center">
                        <i class="far fa-clock mr-1"></i>
                        ${this.escapeHtml(article.publishedAt || '')}
                    </span>
                </div>

                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 hover:text-primary transition-colors">
                    ${this.escapeHtml(article.title)}
                </h3>

                <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                    ${this.escapeHtml(article.content || '내용을 불러올 수 없습니다.')}
                </p>

                <div class="inline-flex items-center text-primary hover:text-primary/80 font-semibold transition-colors">
                    자세히 보기
                    <i class="fas fa-arrow-right ml-2"></i>
                </div>
            </div>
        `;

        return card;
    }

    showError(message) {
        const newsGrid = document.getElementById('newsGrid');

        if (newsGrid) {
            newsGrid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                    <p class="text-gray-600 dark:text-gray-300">${this.escapeHtml(message)}</p>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// DOM 로드 후 뉴스 로더 초기화
document.addEventListener('DOMContentLoaded', () => {
    new NewsLoader();
});