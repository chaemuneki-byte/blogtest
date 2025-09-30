/**
 * Google Apps Script용 AI 챗봇 백엔드
 * Google Sheets를 데이터베이스로 사용하는 챗봇 시스템
 */

// 설정 상수 (Google 공식 방법 적용)
const GEMINI_API_KEY = 'AIzaSyAh8G98cvfsS9aqNTj3_11MEd4eT9bE8ps';
const SPREADSHEET_ID = '1VZa08OYif2EujM0By68f8NBMyUbRT7_SkBVWh46GLiE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// 웹 검색 API 설정 (무료 API 사용)
const SEARCH_API_URL = 'https://api.duckduckgo.com';

/**
 * 웹앱의 메인 진입점 - POST 요청 처리
 */
function doPost(e) {
  try {
    console.log('=== doPost 시작 ===');

    // 매개변수 존재 확인 (e가 undefined일 수 있음)
    if (!e || typeof e !== 'object') {
      console.error('이벤트 객체가 없거나 잘못되었습니다');
      const output = ContentService.createTextOutput(
        JSON.stringify({
          error: '이벤트 객체가 없습니다. 웹앱이 올바르게 배포되었는지 확인해주세요.',
          timestamp: new Date().toISOString()
        })
      );
      output.setMimeType(ContentService.MimeType.JSON);
      return output;
    }

    console.log('이벤트 객체 키:', Object.keys(e));

    // postData 존재 확인
    if (!e.postData) {
      console.error('postData가 없습니다. GET 요청이거나 잘못된 요청입니다.');
      console.log('사용 가능한 속성들:', Object.keys(e));

      // GET 파라미터가 있는지 확인
      if (e.parameter) {
        console.log('GET 파라미터 발견, doGet으로 처리:', e.parameter);
        return doGet(e);
      }

      return createErrorResponse('POST 데이터가 없습니다. 올바른 POST 요청을 보내주세요.');
    }

    console.log('postData 타입:', typeof e.postData);
    console.log('postData 내용:', e.postData);

    let data;
    try {
      // postData.contents 확인
      if (!e.postData.contents) {
        console.error('postData.contents가 없습니다');
        return createErrorResponse('요청 본문이 비어있습니다.');
      }

      console.log('JSON 파싱 시도:', e.postData.contents);
      data = JSON.parse(e.postData.contents);
      console.log('파싱 성공:', data);

    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError.message);
      console.error('원본 데이터:', e.postData.contents);
      return createErrorResponse('JSON 형식이 올바르지 않습니다: ' + parseError.message);
    }

    // 액션별 처리
    let response;
    console.log('액션 처리:', data.action);

    switch (data.action) {
      case 'chat':
        if (!data.message || !data.sessionId) {
          return createErrorResponse('message와 sessionId가 필요합니다.');
        }
        response = handleChatRequest(data.message, data.sessionId);
        break;

      case 'settings':
        response = getChatbotSettings();
        break;

      case 'stats':
        response = getStats();
        break;

      default:
        return createErrorResponse('유효하지 않은 액션입니다: ' + data.action);
    }

    console.log('응답 생성 완료:', response);
    return createSuccessResponse(response);

  } catch (error) {
    console.error('=== doPost 오류 ===');
    console.error('오류 메시지:', error.message);
    console.error('스택 추적:', error.stack);
    return createErrorResponse('서버 오류: ' + error.message);
  }
}

/**
 * CORS preflight 요청 처리
 */
function doOptions(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({ status: 'OK' }));
  return output;
}

/**
 * 성공 응답 생성 - treebot.js와 호환되는 구조
 */
function createSuccessResponse(data) {
  // treebot.js가 기대하는 구조: { success: true, data: {...} } 또는 직접 response 필드
  const responseData = {
    success: true,
    response: data.response || null,
    error: data.error || null,
    data: data
  };

  const output = ContentService.createTextOutput(JSON.stringify(responseData));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * 오류 응답 생성 (CORS 헤더는 Google Apps Script에서 자동 처리됨)
 */
function createErrorResponse(errorMessage) {
  const output = ContentService.createTextOutput(
    JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() })
  );
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * GET 요청 처리 (챗봇 포함)
 */
function doGet(e) {
  // 매개변수 확인
  if (!e || !e.parameter) {
    return createSuccessResponse({ error: '요청 파라미터가 없습니다.' });
  }

  const action = e.parameter.action;
  let response = {};

  try {
    switch (action) {
      case 'chat':
        // GET 방식으로 채팅 처리
        const message = e.parameter.message;
        const sessionId = e.parameter.sessionId;

        if (!message || !sessionId) {
          response = { error: 'message와 sessionId 파라미터가 필요합니다.' };
        } else {
          response = handleChatRequest(message, sessionId);
        }
        break;

      case 'settings':
        response = getChatbotSettings();
        break;

      case 'stats':
        response = getStats();
        break;

      case 'health':
        response = { status: 'OK', timestamp: new Date().toISOString() };
        break;

      case 'options':
      case 'preflight':
        // CORS preflight 요청 처리
        response = { message: 'CORS preflight OK' };
        break;

      default:
        response = {
          error: '유효하지 않은 요청입니다.',
          availableActions: ['chat', 'settings', 'stats', 'health'],
          example: '?action=chat&message=안녕하세요&sessionId=test123'
        };
    }
  } catch (error) {
    console.error('doGet 오류:', error);
    response = { error: '서버 오류: ' + error.message };
  }

  return createSuccessResponse(response);
}

/**
 * 챗봇 대화 처리
 */
function handleChatRequest(message, sessionId) {
  try {
    // 입력 검증
    if (!message || !sessionId) {
      return { error: '메시지와 세션ID가 필요합니다.' };
    }

    if (message.length > 500) {
      return { error: '메시지가 너무 깁니다. (최대 500자)' };
    }

    console.log(`챗봇 요청 - 세션: ${sessionId}, 메시지: ${message}`);

    // 사용자 정보 저장
    saveUserInfo(sessionId);

    // 이전 대화 기록 가져오기
    const chatHistory = getChatHistory(sessionId, 5);

    // AI 응답 생성
    const startTime = new Date().getTime();
    const aiResponse = generateAIResponse(message, chatHistory);
    const responseTime = new Date().getTime() - startTime;

    // 대화 로그 저장
    saveChatLog(sessionId, message, aiResponse, responseTime);

    return {
      response: aiResponse,
      timestamp: new Date().toISOString(),
      responseTime: responseTime
    };

  } catch (error) {
    console.error('챗봇 처리 오류:', error);
    return { error: '처리 중 오류가 발생했습니다: ' + error.message };
  }
}

/**
 * Gemini AI 응답 생성 (URL 파라미터 방식 사용)
 */
function generateAIResponse(userMessage, chatHistory) {
  try {
    console.log('=== Gemini API 호출 시작 ===');
    console.log('사용자 메시지:', userMessage);
    console.log('대화 기록 수:', chatHistory.length);

    // 최신 정보가 필요한지 판단
    const needsWebSearch = shouldSearchWeb(userMessage);
    console.log('웹 검색 필요:', needsWebSearch);

    // 컨텍스트 구성
    let context = "당신은 친근하고 도움이 되는 AI 어시스턴트입니다. 한국어로 자연스럽게 대화하세요.\n\n";

    // 웹 검색 결과 추가 (필요한 경우)
    if (needsWebSearch) {
      const searchResults = performWebSearch(userMessage);
      if (searchResults && searchResults.length > 0) {
        context += "🔍 최신 웹 검색 정보:\n";
        searchResults.forEach((result, index) => {
          context += `${index + 1}. ${result.title}\n${result.snippet}\n출처: ${result.link}\n\n`;
        });
        context += "위 검색 결과를 참고하여 최신 정보로 정확히 답변해주세요.\n\n";
      }
    }

    // 이전 대화 기록 추가 (최대 3개)
    if (chatHistory.length > 0) {
      context += "이전 대화 내용:\n";
      chatHistory.slice(-3).forEach(chat => {
        context += `사용자: ${chat.userMessage}\n어시스턴트: ${chat.aiResponse}\n\n`;
      });
    }

    context += `현재 사용자 메시지: ${userMessage}\n\n`;
    context += "위의 맥락을 고려하여 자연스럽고 도움이 되는 응답을 해주세요.";

    console.log('생성된 컨텍스트:', context.substring(0, 200) + '...');

    // URL 파라미터 방식으로 API 키 전달 (Google 공식 방법)
    const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

    // Gemini API 호출을 위한 페이로드 (간소화)
    const payload = {
      contents: [{
        parts: [{
          text: context
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    };

    console.log('API 호출 URL:', apiUrl.substring(0, apiUrl.indexOf('?')));
    console.log('API 키 존재:', !!GEMINI_API_KEY);
    console.log('페이로드 크기:', JSON.stringify(payload).length);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(apiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('응답 코드:', responseCode);
    console.log('응답 길이:', responseText.length);
    console.log('응답 미리보기:', responseText.substring(0, 300));

    if (responseCode !== 200) {
      console.error('API 호출 실패. 응답 코드:', responseCode);
      console.error('오류 내용:', responseText);
      return `죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다. (상태: ${responseCode})`;
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('JSON 파싱 성공');
    } catch (parseError) {
      console.error('응답 JSON 파싱 실패:', parseError.message);
      console.error('응답 시작 부분:', responseText.substring(0, 500));
      return "죄송합니다. AI 응답을 처리하는데 문제가 발생했습니다.";
    }

    // 응답 구조 상세 로깅
    console.log('=== 응답 구조 분석 ===');
    console.log('전체 응답 구조:', JSON.stringify(responseData, null, 2));
    console.log('- candidates 존재:', !!responseData.candidates);
    console.log('- candidates 길이:', responseData.candidates ? responseData.candidates.length : 0);

    if (responseData.candidates && responseData.candidates.length > 0) {
      const candidate = responseData.candidates[0];
      console.log('첫 번째 candidate 상세:');
      console.log('- finishReason:', candidate.finishReason);
      console.log('- content 존재:', !!candidate.content);
      console.log('- safetyRatings:', candidate.safetyRatings);

      if (candidate.content) {
        console.log('- content.parts 존재:', !!candidate.content.parts);
        console.log('- content.parts 길이:', candidate.content.parts ? candidate.content.parts.length : 0);
      }
    }

    // 응답 데이터 검증
    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error('응답에 candidates가 없습니다');

      // 에러 메시지 확인
      if (responseData.error) {
        console.error('API 에러:', responseData.error);
        return `죄송합니다. AI 서비스 오류가 발생했습니다: ${responseData.error.message || '알 수 없는 오류'}`;
      }

      return "죄송합니다. AI 응답을 생성할 수 없었습니다.";
    }

    const candidate = responseData.candidates[0];

    // blocked 상태 상세 확인
    if (candidate.finishReason === 'SAFETY') {
      console.error('=== 안전 필터 차단 ===');
      console.error('safetyRatings:', candidate.safetyRatings);
      return "죄송합니다. 안전 정책으로 인해 해당 질문에 대한 응답을 제공할 수 없습니다.";
    }

    // 기타 완료 이유 확인
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('=== 비정상 완료 ===');
      console.error('finishReason:', candidate.finishReason);
      console.error('safetyRatings:', candidate.safetyRatings);

      if (candidate.finishReason === 'MAX_TOKENS') {
        return "응답이 너무 길어서 잘렸습니다. 더 간단한 질문을 해주세요.";
      } else if (candidate.finishReason === 'RECITATION') {
        return "저작권 관련 문제로 응답할 수 없습니다.";
      } else {
        return `응답 생성이 중단되었습니다. (이유: ${candidate.finishReason})`;
      }
    }

    // content 구조 확인
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('=== Content 구조 문제 ===');
      console.error('content:', candidate.content);
      console.error('finishReason:', candidate.finishReason);
      return "죄송합니다. AI 응답을 처리하는데 문제가 발생했습니다.";
    }

    const generatedText = candidate.content.parts[0].text;
    console.log('AI 응답 추출 성공, 길이:', generatedText ? generatedText.length : 0);

    if (!generatedText || generatedText.trim() === '') {
      return "죄송합니다. 빈 응답을 받았습니다.";
    }

    return generatedText.trim();

  } catch (error) {
    console.error('=== Gemini API 오류 ===');
    console.error('오류 유형:', error.name);
    console.error('오류 메시지:', error.message);

    // 폴백 응답
    const fallbackResponses = {
      "안녕": "안녕하세요! 도움이 필요하시면 말씀해 주세요.",
      "감사": "천만에요! 다른 질문이 있으시면 언제든지 물어보세요.",
      "도움": "무엇을 도와드릴까요? 궁금한 것이 있으시면 자세히 알려주세요.",
      "default": "죄송합니다. AI 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
    };

    // 사용자 메시지 기반 폴백
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('안녕') || lowerMessage.includes('hello')) {
      return fallbackResponses["안녕"];
    } else if (lowerMessage.includes('감사') || lowerMessage.includes('thank')) {
      return fallbackResponses["감사"];
    } else if (lowerMessage.includes('도움') || lowerMessage.includes('help')) {
      return fallbackResponses["도움"];
    }

    return fallbackResponses["default"];
  }
}

/**
 * 대화 로그 저장
 */
function saveChatLog(sessionId, userMessage, aiResponse, responseTime) {
  try {
    const sheet = getOrCreateSheet('ChatLogs', [
      'Timestamp', 'SessionID', 'UserID', 'UserMessage', 'AIResponse', 'MessageLength', 'ResponseTime'
    ]);

    sheet.appendRow([
      new Date(),
      sessionId,
      'anonymous',
      userMessage,
      aiResponse,
      userMessage.length,
      responseTime
    ]);

    console.log('대화 로그 저장 완료');
  } catch (error) {
    console.error('대화 로그 저장 오류:', error);
  }
}

/**
 * 사용자 정보 저장
 */
function saveUserInfo(sessionId) {
  try {
    const sheet = getOrCreateSheet('UserInfo', [
      'SessionID', 'FirstAccess', 'LastAccess', 'MessageCount'
    ]);

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    // 기존 사용자 찾기
    const existingRowIndex = rows.findIndex(row => row[0] === sessionId);

    if (existingRowIndex !== -1) {
      // 기존 사용자 업데이트
      const rowNumber = existingRowIndex + 2; // 헤더 행 + 1-based 인덱스
      sheet.getRange(rowNumber, 3).setValue(new Date()); // LastAccess
      const currentCount = sheet.getRange(rowNumber, 4).getValue() || 0;
      sheet.getRange(rowNumber, 4).setValue(currentCount + 1); // MessageCount
    } else {
      // 새 사용자 추가
      sheet.appendRow([
        sessionId,
        new Date(),
        new Date(),
        1
      ]);
    }

  } catch (error) {
    console.error('사용자 정보 저장 오류:', error);
  }
}

/**
 * 이전 대화 기록 가져오기
 */
function getChatHistory(sessionId, limit = 5) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('ChatLogs');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0];
    const rows = data.slice(1);

    // 세션별 메시지 필터링
    const sessionMessages = rows
      .filter(row => row[1] === sessionId) // SessionID 컬럼
      .slice(-limit)
      .map(row => ({
        timestamp: row[0],
        userMessage: row[3],
        aiResponse: row[4]
      }));

    return sessionMessages;
  } catch (error) {
    console.error('대화 기록 조회 오류:', error);
    return [];
  }
}

/**
 * 챗봇 설정 가져오기
 */
function getChatbotSettings() {
  try {
    const sheet = getOrCreateSheet('Settings', [
      'Key', 'Value', 'Description', 'LastUpdated'
    ]);

    // 기본 설정이 없으면 추가
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      const defaultSettings = [
        ['chatbot_name', 'AI 어시스턴트', '챗봇 이름', new Date()],
        ['welcome_message', '안녕하세요! 궁금한 것이 있으시면 언제든지 물어보세요.', '환영 메시지', new Date()],
        ['max_message_length', '500', '최대 메시지 길이', new Date()],
        ['response_delay', '1000', '응답 지연 시간(ms)', new Date()]
      ];

      defaultSettings.forEach(setting => {
        sheet.appendRow(setting);
      });
    }

    // 설정 반환
    const rows = sheet.getDataRange().getValues().slice(1);
    const settings = {};
    rows.forEach(row => {
      settings[row[0]] = row[1];
    });

    return settings;
  } catch (error) {
    console.error('설정 조회 오류:', error);
    return {
      chatbot_name: 'AI 어시스턴트',
      welcome_message: '안녕하세요! 궁금한 것이 있으시면 언제든지 물어보세요.',
      max_message_length: '500',
      response_delay: '1000'
    };
  }
}

/**
 * 통계 정보 가져오기
 */
function getStats() {
  try {
    const chatSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('ChatLogs');
    const userSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('UserInfo');

    const stats = {
      totalMessages: 0,
      totalUsers: 0,
      totalSessions: 0,
      averageMessageLength: 0,
      todayMessages: 0
    };

    if (chatSheet) {
      const chatData = chatSheet.getDataRange().getValues().slice(1);
      stats.totalMessages = chatData.length;

      const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      stats.todayMessages = chatData.filter(row => {
        const date = Utilities.formatDate(row[0], Session.getScriptTimeZone(), 'yyyy-MM-dd');
        return date === today;
      }).length;

      if (stats.totalMessages > 0) {
        const totalLength = chatData.reduce((sum, row) => sum + (row[5] || 0), 0);
        stats.averageMessageLength = Math.round(totalLength / stats.totalMessages);
      }
    }

    if (userSheet) {
      const userData = userSheet.getDataRange().getValues().slice(1);
      stats.totalUsers = userData.length;
      stats.totalSessions = userData.length;
    }

    return stats;
  } catch (error) {
    console.error('통계 조회 오류:', error);
    return {
      totalMessages: 0,
      totalUsers: 0,
      totalSessions: 0,
      averageMessageLength: 0,
      todayMessages: 0
    };
  }
}

/**
 * 시트 가져오기 또는 생성
 */
function getOrCreateSheet(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    }
  }

  return sheet;
}

/**
 * 초기 설정 함수 (수동 실행용)
 */
function setupInitialSheets() {
  try {
    console.log('초기 시트 설정 시작...');

    // ChatLogs 시트
    getOrCreateSheet('ChatLogs', [
      'Timestamp', 'SessionID', 'UserID', 'UserMessage', 'AIResponse', 'MessageLength', 'ResponseTime'
    ]);

    // UserInfo 시트
    getOrCreateSheet('UserInfo', [
      'SessionID', 'FirstAccess', 'LastAccess', 'MessageCount'
    ]);

    // Settings 시트
    const settingsSheet = getOrCreateSheet('Settings', [
      'Key', 'Value', 'Description', 'LastUpdated'
    ]);

    // 기본 설정 추가
    const defaultSettings = [
      ['chatbot_name', 'AI 어시스턴트', '챗봇 이름', new Date()],
      ['welcome_message', '안녕하세요! 궁금한 것이 있으시면 언제든지 물어보세요.', '환영 메시지', new Date()],
      ['max_message_length', '500', '최대 메시지 길이', new Date()],
      ['response_delay', '1000', '응답 지연 시간(ms)', new Date()]
    ];

    // 기존 데이터 확인
    const existingData = settingsSheet.getDataRange().getValues();
    if (existingData.length <= 1) {
      defaultSettings.forEach(setting => {
        settingsSheet.appendRow(setting);
      });
    }

    console.log('초기 시트 설정 완료!');
    return '초기 설정이 성공적으로 완료되었습니다.';
  } catch (error) {
    console.error('초기 설정 오류:', error);
    return '초기 설정 중 오류 발생: ' + error.message;
  }
}

/**
 * 테스트 함수 - 채팅 기능 테스트
 */
function testChatFunction() {
  try {
    console.log('=== 채팅 기능 테스트 시작 ===');

    const testMessage = '안녕하세요! 테스트 메시지입니다.';
    const testSessionId = 'test_session_' + Date.now();

    console.log('테스트 메시지:', testMessage);
    console.log('테스트 세션 ID:', testSessionId);

    const response = handleChatRequest(testMessage, testSessionId);

    console.log('테스트 응답:', response);
    return response;

  } catch (error) {
    console.error('테스트 함수 오류:', error);
    return { error: '테스트 실패: ' + error.message };
  }
}

/**
 * Gemini API 연결 테스트
 */
function testGeminiAPI() {
  try {
    console.log('=== Gemini API 테스트 시작 ===');

    const testResponse = generateAIResponse('안녕하세요!', []);

    console.log('Gemini API 응답:', testResponse);
    return testResponse;

  } catch (error) {
    console.error('Gemini API 테스트 오류:', error);
    return 'Gemini API 테스트 실패: ' + error.message;
  }
}

/**
 * 간단한 Gemini API 테스트 (최소한의 요청)
 */
function simpleGeminiTest() {
  try {
    console.log('=== 간단한 Gemini API 테스트 ===');
    console.log('API 키:', GEMINI_API_KEY);
    console.log('API URL:', GEMINI_API_URL);

    const payload = {
      contents: [{
        parts: [{
          text: "안녕하세요! 간단한 인사말로 답변해주세요."
        }]
      }]
    };

    const options = {
      method: 'POST',
      contentType: 'application/json',
      headers: {
        'x-goog-api-key': GEMINI_API_KEY
      },
      payload: JSON.stringify(payload)
    };

    console.log('요청 페이로드:', JSON.stringify(payload, null, 2));

    const response = UrlFetchApp.fetch(GEMINI_API_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('응답 코드:', responseCode);
    console.log('응답 텍스트:', responseText);

    if (responseCode === 200) {
      const data = JSON.parse(responseText);
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      }
    }

    return '응답 처리 오류: ' + responseText;

  } catch (error) {
    console.error('간단한 테스트 오류:', error);
    return '테스트 실패: ' + error.message + ' | 스택: ' + error.stack;
  }
}

/**
 * API 키 유효성 테스트 (URL 파라미터 방식)
 */
function testAPIKey() {
  try {
    console.log('=== API 키 유효성 테스트 ===');

    const testUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

    const payload = {
      contents: [{
        parts: [{ text: "안녕하세요!" }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 100
      }
    };

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload)
    };

    console.log('테스트 URL:', testUrl.substring(0, testUrl.indexOf('?')));
    console.log('페이로드:', JSON.stringify(payload, null, 2));

    const response = UrlFetchApp.fetch(testUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    console.log('API 키 테스트 응답 코드:', responseCode);
    console.log('API 키 테스트 응답 길이:', responseText.length);
    console.log('API 키 테스트 응답 미리보기:', responseText.substring(0, 300));

    if (responseCode === 200) {
      try {
        const data = JSON.parse(responseText);
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
          const generatedText = data.candidates[0].content.parts[0].text;
          console.log('생성된 텍스트:', generatedText);
          return {
            code: responseCode,
            response: generatedText,
            success: true,
            fullResponse: responseText
          };
        }
      } catch (parseError) {
        console.error('응답 파싱 오류:', parseError);
      }
    }

    return {
      code: responseCode,
      response: responseText,
      success: responseCode === 200
    };

  } catch (error) {
    console.error('API 키 테스트 오류:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

/**
 * 웹 검색이 필요한지 판단하는 함수
 */
function shouldSearchWeb(message) {
  const searchKeywords = [
    '최신', '현재', '지금', '오늘', '2025', '2024', '최근',
    '대통령', '대선', '선거', '정치', '뉴스', '날씨', '주가',
    '코로나', '코비드', '경제', '환율', '금리', '부동산',
    'who is', 'what is', 'current', 'latest', 'today', 'now'
  ];

  const lowerMessage = message.toLowerCase();
  return searchKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * 웹 검색 수행 (간단한 방식 - Wikipedia API 사용)
 */
function performWebSearch(query, maxResults = 3) {
  try {
    console.log('=== 웹 검색 시작 ===');
    console.log('검색 쿼리:', query);

    // 검색 쿼리 최적화
    let searchQuery = query;
    if (query.includes('대통령')) {
      searchQuery = '대한민국 대통령';
    } else if (query.includes('현재') || query.includes('최신')) {
      searchQuery = query.replace(/현재|최신|지금/g, '').trim();
    }

    // Wikipedia API 사용 (한국어)
    const wikiUrl = `https://ko.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;

    console.log('Wikipedia 검색 시도...');

    try {
      const response = UrlFetchApp.fetch(wikiUrl);
      const responseCode = response.getResponseCode();

      if (responseCode === 200) {
        const data = JSON.parse(response.getContentText());

        if (data.extract && data.extract.length > 0) {
          console.log('Wikipedia 검색 성공');
          return [{
            title: data.title,
            snippet: data.extract,
            link: data.content_urls ? data.content_urls.desktop.page : 'https://ko.wikipedia.org'
          }];
        }
      }
    } catch (wikiError) {
      console.log('Wikipedia 검색 실패, 폴백 모드로 전환');
    }

    // 폴백: 간단한 정보 제공
    const fallbackInfo = getFallbackInfo(query);
    if (fallbackInfo) {
      console.log('폴백 정보 제공');
      return [fallbackInfo];
    }

    console.log('웹 검색 결과 없음');
    return [];

  } catch (error) {
    console.error('웹 검색 오류:', error);
    return [];
  }
}

/**
 * 폴백 정보 제공
 */
function getFallbackInfo(query) {
  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('대통령')) {
    return {
      title: '대한민국 대통령 정보',
      snippet: '2025년 현재 대한민국의 대통령은 윤석열입니다. 임기는 2022년 5월 10일부터 2027년 5월 9일까지입니다.',
      link: 'https://www.president.go.kr'
    };
  }

  if (lowerQuery.includes('날씨')) {
    return {
      title: '날씨 정보',
      snippet: '실시간 날씨 정보는 기상청 웹사이트나 날씨 앱을 확인해주세요.',
      link: 'https://www.weather.go.kr'
    };
  }

  return null;
}

/**
 * 모든 기능 종합 테스트
 */
function runAllTests() {
  console.log('=== 전체 시스템 테스트 시작 ===');

  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // 1. 초기 설정 테스트
    console.log('1. 초기 설정 테스트...');
    results.tests.setup = setupInitialSheets();

    // 2. Gemini API 테스트
    console.log('2. Gemini API 테스트...');
    results.tests.gemini = testGeminiAPI();

    // 3. 채팅 기능 테스트
    console.log('3. 채팅 기능 테스트...');
    results.tests.chat = testChatFunction();

    // 4. 설정 조회 테스트
    console.log('4. 설정 조회 테스트...');
    results.tests.settings = getChatbotSettings();

    // 5. 통계 조회 테스트
    console.log('5. 통계 조회 테스트...');
    results.tests.stats = getStats();

    // 6. 웹 검색 테스트
    console.log('6. 웹 검색 테스트...');
    results.tests.webSearch = testWebSearch();

    console.log('=== 전체 테스트 완료 ===');
    console.log('테스트 결과:', results);

    return results;

  } catch (error) {
    console.error('전체 테스트 오류:', error);
    results.error = error.message;
    return results;
  }
}

/**
 * 웹 검색 기능 테스트
 */
function testWebSearch() {
  try {
    console.log('=== 웹 검색 테스트 시작 ===');

    const testQuery = '대한민국 대통령 2025';
    const results = performWebSearch(testQuery);

    console.log('테스트 결과:', results);
    return {
      success: results.length > 0,
      resultCount: results.length,
      results: results
    };

  } catch (error) {
    console.error('웹 검색 테스트 오류:', error);
    return {
      success: false,
      error: error.message
    };
  }
}