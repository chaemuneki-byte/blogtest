/**
 * 뉴스 자동 크롤링 스케줄러
 * 1시간마다 네이버 뉴스를 크롤링하여 news-data.json 파일 업데이트
 */

const { crawlNaverNews } = require('./crawl-news');

// 스케줄러 설정
const SCHEDULE_CONFIG = {
  intervalHours: 1, // 1시간마다 실행
  intervalMs: 60 * 60 * 1000, // 1시간 (밀리초)
  runOnStart: true // 시작 시 즉시 한 번 실행
};

let isRunning = false;
let scheduleTimer = null;
let nextRunTime = null;

/**
 * 크롤링 실행 (중복 실행 방지)
 */
async function runCrawling() {
  if (isRunning) {
    console.log('⏳ 이미 크롤링이 실행 중입니다. 건너뜁니다.');
    return;
  }

  isRunning = true;

  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 자동 크롤링 시작');
    console.log('시간:', new Date().toLocaleString('ko-KR'));
    console.log('='.repeat(60));

    await crawlNaverNews();

    console.log('='.repeat(60));
    console.log('✅ 크롤링 완료');

    // 다음 실행 시간 계산
    nextRunTime = new Date(Date.now() + SCHEDULE_CONFIG.intervalMs);
    console.log('다음 실행 예정:', nextRunTime.toLocaleString('ko-KR'));
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ 크롤링 실패:', error);
  } finally {
    isRunning = false;
  }
}

/**
 * 스케줄러 시작
 */
function startScheduler() {
  console.log('\n' + '='.repeat(60));
  console.log('📅 뉴스 크롤링 스케줄러 시작');
  console.log(`⏰ 실행 주기: ${SCHEDULE_CONFIG.intervalHours}시간마다`);
  console.log('='.repeat(60) + '\n');

  // 시작 시 즉시 실행
  if (SCHEDULE_CONFIG.runOnStart) {
    runCrawling();
  }

  // 주기적 실행 스케줄 등록
  scheduleTimer = setInterval(() => {
    runCrawling();
  }, SCHEDULE_CONFIG.intervalMs);

  console.log('✅ 스케줄러가 실행 중입니다...');
  console.log('종료하려면 Ctrl+C를 누르세요.\n');
}

/**
 * 스케줄러 중지
 */
function stopScheduler() {
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
    console.log('\n⏹️  스케줄러가 중지되었습니다.');
  }
}

/**
 * 프로세스 종료 시 정리
 */
process.on('SIGINT', () => {
  console.log('\n\n🛑 종료 신호 수신...');
  stopScheduler();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 종료 신호 수신...');
  stopScheduler();
  process.exit(0);
});

// 예외 처리
process.on('unhandledRejection', (error) => {
  console.error('⚠️  처리되지 않은 Promise 오류:', error);
});

process.on('uncaughtException', (error) => {
  console.error('⚠️  처리되지 않은 예외:', error);
  stopScheduler();
  process.exit(1);
});

// 스케줄러 시작
if (require.main === module) {
  startScheduler();
}

module.exports = {
  startScheduler,
  stopScheduler,
  runCrawling
};