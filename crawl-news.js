/**
 * 네이버 뉴스 크롤러
 * Playwright를 사용하여 네이버 기사 6개를 크롤링합니다.
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// 크롤링 설정
const CONFIG = {
  newsUrl: 'https://news.naver.com/',
  maxArticles: 50, // 최소 50개 수집
  displayArticles: 9, // 메인에 9개 노출
  outputFile: path.join(__dirname, 'news-data.json'),
  categories: ['정치', '경제', '사회', '생활/문화', 'IT/과학', '세계', '연예', '스포츠']
};

/**
 * 네이버 뉴스 크롤링 메인 함수
 */
async function crawlNaverNews() {
  console.log('=== 네이버 뉴스 크롤링 시작 ===');
  console.log('시간:', new Date().toLocaleString('ko-KR'));

  const browser = await chromium.launch({
    headless: true // 백그라운드 실행
  });

  const page = await browser.newPage();
  const articles = [];

  try {
    // 네이버 뉴스 메인 페이지 접속
    console.log('네이버 뉴스 페이지 로딩...');
    await page.goto(CONFIG.newsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // 페이지 로딩 대기

    // 다양한 섹션에서 기사 수집
    const articleLinks = await page.evaluate((maxArticles) => {
      const links = [];

      // 2025년 현재 네이버 뉴스 구조에 맞는 셀렉터
      const articleElements = document.querySelectorAll('a.cjs_nf_a[href*="article"]');

      articleElements.forEach(el => {
        if (links.length < maxArticles && el.href && el.textContent) {
          const href = el.href;
          const title = el.textContent.trim().split('\n')[0].trim(); // 첫 줄만 (제목)

          // 중복 제거
          if (!links.find(link => link.url === href) && title.length > 10) {
            links.push({
              title: title,
              url: href
            });
          }
        }
      });

      return links.slice(0, maxArticles);
    }, CONFIG.maxArticles);

    console.log(`발견된 기사: ${articleLinks.length}개`);

    // 각 기사 상세 정보 수집
    for (let i = 0; i < Math.min(articleLinks.length, CONFIG.maxArticles); i++) {
      const link = articleLinks[i];
      console.log(`[${i + 1}/${CONFIG.maxArticles}] 기사 크롤링: ${link.title}`);

      try {
        // 기사 페이지 방문
        await page.goto(link.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(1000);

        // 기사 내용 추출
        const articleData = await page.evaluate(() => {
          // 제목
          const titleEl = document.querySelector('#title_area, .media_end_head_headline, h2, h3');
          const title = titleEl ? titleEl.textContent.trim() : '';

          // 본문 (첫 2-3 문단만)
          const contentEl = document.querySelector('#dic_area, #articeBody, .article_view');
          let content = '';
          if (contentEl) {
            const paragraphs = Array.from(contentEl.querySelectorAll('p, div'))
              .map(p => p.textContent.trim())
              .filter(text => text.length > 20);
            content = paragraphs.slice(0, 3).join(' ').substring(0, 300) + '...';
          }

          // 이미지
          const imgEl = document.querySelector('#img1, .end_photo_org img, article img');
          const imageUrl = imgEl ? imgEl.src : '';

          // 언론사
          const publisherEl = document.querySelector('.media_end_head_top_logo img, .press_logo img');
          const publisher = publisherEl ? publisherEl.alt : '네이버 뉴스';

          // 날짜
          const dateEl = document.querySelector('.media_end_head_info_datestamp_time, .article_info time');
          const publishedAt = dateEl ? dateEl.textContent.trim() : new Date().toLocaleString('ko-KR');

          return {
            title,
            content,
            imageUrl,
            publisher,
            publishedAt
          };
        });

        // 기사 데이터 저장
        if (articleData.title) {
          articles.push({
            id: `news_${Date.now()}_${i}`,
            ...articleData,
            url: link.url,
            crawledAt: new Date().toISOString(),
            category: CONFIG.categories[i % CONFIG.categories.length]
          });
        }

      } catch (error) {
        console.error(`기사 크롤링 실패 [${i + 1}]:`, error.message);
        // 크롤링 실패 시 기본 정보만 저장
        articles.push({
          id: `news_${Date.now()}_${i}`,
          title: link.title,
          content: '기사 내용을 불러올 수 없습니다.',
          imageUrl: '',
          publisher: '네이버 뉴스',
          publishedAt: new Date().toLocaleString('ko-KR'),
          url: link.url,
          crawledAt: new Date().toISOString(),
          category: CONFIG.categories[i % CONFIG.categories.length]
        });
      }
    }

  } catch (error) {
    console.error('크롤링 중 오류 발생:', error);
  } finally {
    await browser.close();
  }

  // 결과 저장
  if (articles.length > 0) {
    const result = {
      lastUpdated: new Date().toISOString(),
      lastUpdatedKr: new Date().toLocaleString('ko-KR'),
      totalArticles: articles.length,
      displayArticles: CONFIG.displayArticles,
      articles: articles,
      // 메인에 표시할 9개 기사 (최신순)
      displayList: articles.slice(0, CONFIG.displayArticles)
    };

    await fs.writeFile(
      CONFIG.outputFile,
      JSON.stringify(result, null, 2),
      'utf-8'
    );

    console.log(`\n✅ 크롤링 완료: ${articles.length}개 기사 저장됨`);
    console.log(`저장 위치: ${CONFIG.outputFile}`);
  } else {
    console.log('❌ 크롤링된 기사가 없습니다.');
  }

  return articles;
}

// 스크립트 직접 실행 시
if (require.main === module) {
  crawlNaverNews()
    .then(() => {
      console.log('\n크롤링 작업 완료');
      process.exit(0);
    })
    .catch(error => {
      console.error('크롤링 실패:', error);
      process.exit(1);
    });
}

module.exports = { crawlNaverNews };