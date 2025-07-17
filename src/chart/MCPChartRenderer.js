/**
 * Chart MCP 래퍼 시스템 - MCPChartRenderer
 * Chart MCP 서버와의 통신을 담당하는 핵심 클래스
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { ChartFactory } from './ChartFactory.js';
import { ChartConfigValidator } from './ChartConfigValidator.js';
import { ChartTypeRegistry } from './ChartTypeRegistry.js';

/**
 * Chart MCP 결과 인터페이스
 */
export class ChartResult {
  constructor(data) {
    this.success = data.success || false;
    this.imageUrl = data.imageUrl || null;
    this.metadata = data.metadata || {};
    this.renderTime = data.renderTime || 0;
    this.chartType = data.chartType || 'unknown';
    this.dataPoints = data.dataPoints || 0;
    this.error = data.error || null;
    this.timestamp = new Date().toISOString();
  }

  isSuccess() {
    return this.success;
  }

  hasError() {
    return this.error !== null;
  }

  getImageUrl() {
    return this.imageUrl;
  }

  getMetadata() {
    return this.metadata;
  }
}

/**
 * MCP 클라이언트 래퍼
 */
export class MCPClient {
  constructor(config = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3000';
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 3;
    this.headers = config.headers || {};
    this.connected = false;
    this.lastPing = null;
  }

  /**
   * MCP 서버 연결 테스트
   */
  async connect() {
    try {
      const response = await this.call('ping', {});
      this.connected = true;
      this.lastPing = Date.now();
      return response;
    } catch (error) {
      this.connected = false;
      throw new Error(`MCP 서버 연결 실패: ${error.message}`);
    }
  }

  /**
   * MCP 서버 호출
   */
  async call(method, params, options = {}) {
    const startTime = performance.now();
    
    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const response = await this.makeRequest(method, params, options);
        
        // 응답 시간 기록
        const responseTime = performance.now() - startTime;
        
        return {
          ...response,
          _meta: {
            responseTime,
            attempt: attempt + 1,
            timestamp: new Date().toISOString()
          }
        };
        
      } catch (error) {
        console.warn(`MCP 호출 실패 (시도 ${attempt + 1}/${this.retries}):`, error.message);
        
        if (attempt === this.retries - 1) {
          throw error;
        }
        
        // 재시도 전 지연
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * 실제 HTTP 요청 처리
   */
  async makeRequest(method, params, options = {}) {
    const requestBody = {
      jsonrpc: '2.0',
      id: this.generateRequestId(),
      method: method,
      params: params
    };

    const response = await fetch(this.serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.headers,
        ...options.headers
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(options.timeout || this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`MCP 에러: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * 요청 ID 생성
   */
  generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 지연 함수
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.connected;
  }

  /**
   * 헬스 체크
   */
  async healthCheck() {
    try {
      await this.call('ping', {});
      return { healthy: true, lastPing: this.lastPing };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

/**
 * Chart MCP 렌더러 - 메인 클래스
 */
export class MCPChartRenderer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      mcpServerUrl: config.mcpServerUrl || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      cache: config.cache !== false,
      cacheTTL: config.cacheTTL || 300000, // 5분
      enableFallback: config.enableFallback !== false,
      enableValidation: config.enableValidation !== false,
      ...config
    };

    // MCP 클라이언트 초기화
    this.mcpClient = new MCPClient({
      serverUrl: this.config.mcpServerUrl,
      timeout: this.config.timeout,
      retries: this.config.retries
    });

    // 차트 팩토리
    this.chartFactory = new ChartFactory();
    
    // 차트 설정 검증기
    this.configValidator = new ChartConfigValidator();
    
    // 차트 타입 레지스트리
    this.typeRegistry = new ChartTypeRegistry();
    
    // 결과 캐시
    this.cache = new Map();
    
    // 성능 메트릭
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageRenderTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      fallbackUsed: 0
    };

    // 폴백 렌더러 (Chart.js 등)
    this.fallbackRenderer = null;
    
    this.init();
  }

  /**
   * 초기화
   */
  async init() {
    try {
      console.log('MCPChartRenderer 초기화 시작...');
      
      // 기본 차트 타입 등록
      await this.registerDefaultChartTypes();
      
      // MCP 서버 연결 테스트
      await this.mcpClient.connect();
      
      // 캐시 정리 작업 설정
      this.setupCacheCleanup();
      
      console.log('MCPChartRenderer 초기화 완료');
      
    } catch (error) {
      console.error('MCPChartRenderer 초기화 실패:', error);
      
      if (this.config.enableFallback) {
        console.log('폴백 모드로 전환...');
        await this.initializeFallback();
      } else {
        throw error;
      }
    }
  }

  /**
   * 차트 렌더링 - 메인 메소드
   */
  async renderChart(config) {
    const startTime = performance.now();
    
    try {
      // 요청 수 증가
      this.metrics.totalRequests++;
      
      // 설정 검증
      if (this.config.enableValidation) {
        const validationResult = await this.configValidator.validate(config);
        if (!validationResult.isValid) {
          throw new Error(`차트 설정 검증 실패: ${validationResult.errors.join(', ')}`);
        }
      }

      // 캐시 확인
      const cacheKey = this.generateCacheKey(config);
      if (this.config.cache && this.cache.has(cacheKey)) {
        this.metrics.cacheHits++;
        const cachedResult = this.cache.get(cacheKey);
        
        console.log('캐시된 차트 결과 반환');
        return cachedResult;
      }

      this.metrics.cacheMisses++;

      // 차트 팩토리를 통한 설정 처리
      const processedConfig = await this.chartFactory.processConfig(config);
      
      // MCP 서버 호출
      const mcpResult = await this.mcpClient.call('create_chart', processedConfig);
      
      // 결과 객체 생성
      const result = new ChartResult({
        success: true,
        imageUrl: mcpResult.imageUrl,
        metadata: mcpResult.metadata || {},
        renderTime: performance.now() - startTime,
        chartType: config.type,
        dataPoints: this.calculateDataPoints(config.data),
        error: null
      });

      // 캐시 저장
      if (this.config.cache) {
        this.cache.set(cacheKey, result);
        
        // TTL 설정
        setTimeout(() => {
          this.cache.delete(cacheKey);
        }, this.config.cacheTTL);
      }

      // 성공 메트릭 업데이트
      this.metrics.successfulRequests++;
      this.updateAverageRenderTime(result.renderTime);
      
      // 이벤트 발생
      this.emit('chartRendered', { config, result });
      
      return result;
      
    } catch (error) {
      console.error('차트 렌더링 실패:', error);
      
      // 실패 메트릭 업데이트
      this.metrics.failedRequests++;
      
      // 폴백 시도
      if (this.config.enableFallback && this.fallbackRenderer) {
        console.log('폴백 렌더러 사용...');
        
        try {
          const fallbackResult = await this.fallbackRenderer.render(config);
          this.metrics.fallbackUsed++;
          
          // 이벤트 발생
          this.emit('fallbackUsed', { config, result: fallbackResult });
          
          return fallbackResult;
          
        } catch (fallbackError) {
          console.error('폴백 렌더러도 실패:', fallbackError);
        }
      }

      // 에러 결과 반환
      const errorResult = new ChartResult({
        success: false,
        error: error.message,
        renderTime: performance.now() - startTime,
        chartType: config.type || 'unknown'
      });

      // 이벤트 발생
      this.emit('chartRenderError', { config, error, result: errorResult });
      
      return errorResult;
    }
  }

  /**
   * 사용 가능한 차트 타입 조회
   */
  async getAvailableChartTypes() {
    try {
      const mcpTypes = await this.mcpClient.call('get_chart_types', {});
      const registryTypes = this.typeRegistry.getAllTypes();
      
      // MCP 서버 타입과 레지스트리 타입 합치기
      const allTypes = [...mcpTypes, ...registryTypes];
      
      // 중복 제거
      const uniqueTypes = allTypes.filter((type, index, self) => 
        index === self.findIndex(t => t.name === type.name)
      );
      
      return uniqueTypes;
      
    } catch (error) {
      console.error('차트 타입 조회 실패:', error);
      
      // 레지스트리 타입만 반환
      return this.typeRegistry.getAllTypes();
    }
  }

  /**
   * 차트 타입 추천
   */
  async suggestChartType(data, context = {}) {
    try {
      const analysisResult = await this.mcpClient.call('analyze_data', {
        data,
        context
      });
      
      const suggestions = analysisResult.suggestions || [];
      
      // 레지스트리에서 추가 추천
      const registrySuggestions = await this.typeRegistry.suggestTypes(data, context);
      
      // 합치고 정렬
      const allSuggestions = [...suggestions, ...registrySuggestions]
        .sort((a, b) => (b.score || 0) - (a.score || 0));
      
      return allSuggestions;
      
    } catch (error) {
      console.error('차트 타입 추천 실패:', error);
      
      // 레지스트리 추천만 반환
      return this.typeRegistry.suggestTypes(data, context);
    }
  }

  /**
   * 차트 템플릿 생성
   */
  async createTemplate(config, templateName) {
    try {
      const template = await this.mcpClient.call('create_template', {
        config,
        name: templateName
      });
      
      // 로컬 레지스트리에도 저장
      this.typeRegistry.addTemplate(templateName, template);
      
      return template;
      
    } catch (error) {
      console.error('차트 템플릿 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 차트 템플릿 목록 조회
   */
  async getTemplates() {
    try {
      const mcpTemplates = await this.mcpClient.call('get_templates', {});
      const registryTemplates = this.typeRegistry.getAllTemplates();
      
      return {
        server: mcpTemplates,
        local: registryTemplates
      };
      
    } catch (error) {
      console.error('차트 템플릿 조회 실패:', error);
      
      return {
        server: [],
        local: this.typeRegistry.getAllTemplates()
      };
    }
  }

  /**
   * 폴백 렌더러 설정
   */
  setFallbackRenderer(renderer) {
    this.fallbackRenderer = renderer;
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0,
      mcpServerConnected: this.mcpClient.isConnected()
    };
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.cache.clear();
    console.log('차트 캐시 정리 완료');
  }

  /**
   * 리소스 정리
   */
  async destroy() {
    try {
      // 캐시 정리
      this.clearCache();
      
      // 모든 리스너 제거
      this.removeAllListeners();
      
      console.log('MCPChartRenderer 리소스 정리 완료');
      
    } catch (error) {
      console.error('MCPChartRenderer 리소스 정리 실패:', error);
    }
  }

  // === 내부 메소드 ===

  /**
   * 기본 차트 타입 등록
   */
  async registerDefaultChartTypes() {
    // 기본 차트 타입들 등록
    const defaultTypes = [
      {
        name: 'line',
        category: 'basic',
        description: '라인 차트',
        requiredFields: ['x', 'y'],
        optionalFields: ['series', 'color']
      },
      {
        name: 'bar',
        category: 'basic',
        description: '바 차트',
        requiredFields: ['x', 'y'],
        optionalFields: ['series', 'color']
      },
      {
        name: 'pie',
        category: 'basic',
        description: '파이 차트',
        requiredFields: ['label', 'value'],
        optionalFields: ['color']
      },
      {
        name: 'scatter',
        category: 'basic',
        description: '산점도',
        requiredFields: ['x', 'y'],
        optionalFields: ['size', 'color']
      },
      {
        name: 'area',
        category: 'basic',
        description: '영역 차트',
        requiredFields: ['x', 'y'],
        optionalFields: ['series', 'color']
      }
    ];

    defaultTypes.forEach(type => {
      this.typeRegistry.registerType(type.name, type);
    });
  }

  /**
   * 폴백 초기화
   */
  async initializeFallback() {
    try {
      // Chart.js 폴백 렌더러 초기화
      const { ChartJSFallbackRenderer } = await import('./fallback/ChartJSFallbackRenderer.js');
      this.fallbackRenderer = new ChartJSFallbackRenderer();
      
      console.log('폴백 렌더러 초기화 완료');
      
    } catch (error) {
      console.error('폴백 렌더러 초기화 실패:', error);
    }
  }

  /**
   * 캐시 키 생성
   */
  generateCacheKey(config) {
    const configStr = JSON.stringify(config, Object.keys(config).sort());
    return this.hashString(configStr);
  }

  /**
   * 문자열 해시
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    return hash.toString(36);
  }

  /**
   * 데이터 포인트 수 계산
   */
  calculateDataPoints(data) {
    if (!data) return 0;
    
    if (Array.isArray(data)) {
      return data.length;
    }
    
    if (data.datasets && Array.isArray(data.datasets)) {
      return data.datasets.reduce((total, dataset) => {
        return total + (Array.isArray(dataset.data) ? dataset.data.length : 0);
      }, 0);
    }
    
    return 0;
  }

  /**
   * 평균 렌더링 시간 업데이트
   */
  updateAverageRenderTime(renderTime) {
    const total = this.metrics.averageRenderTime * (this.metrics.successfulRequests - 1);
    this.metrics.averageRenderTime = (total + renderTime) / this.metrics.successfulRequests;
  }

  /**
   * 캐시 정리 작업 설정
   */
  setupCacheCleanup() {
    setInterval(() => {
      // 만료된 캐시 항목 정리
      const now = Date.now();
      
      for (const [key, value] of this.cache.entries()) {
        if (value.timestamp && (now - new Date(value.timestamp).getTime()) > this.config.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, 60000); // 1분마다 정리
  }
}

export default MCPChartRenderer;