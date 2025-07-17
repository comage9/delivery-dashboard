/**
 * 통합 데이터 레이어 - UnifiedDataManager
 * 모든 데이터 소스를 통합 관리하는 핵심 클래스
 */

import { LRUCache } from './utils/LRUCache.js';
import { EventEmitter } from './utils/EventEmitter.js';
import { DataConnectorFactory } from './connectors/DataConnectorFactory.js';
import { DataValidator } from './utils/DataValidator.js';
import { DataTransformer } from './utils/DataTransformer.js';

/**
 * 데이터 소스 타입 정의
 */
export const DATA_SOURCE_TYPES = {
  CSV: 'csv',
  JSON: 'json',
  API: 'api',
  DATABASE: 'database',
  WEBSOCKET: 'websocket',
  GOOGLE_SHEETS: 'google_sheets',
  EXCEL: 'excel',
  STREAM: 'stream'
};

/**
 * 데이터 스키마 인터페이스
 */
export class DataSchema {
  constructor(fields = []) {
    this.fields = fields;
    this.primaryKey = null;
    this.indexes = [];
    this.constraints = [];
  }

  addField(name, type, options = {}) {
    this.fields.push({
      name,
      type,
      nullable: options.nullable || false,
      format: options.format || null,
      defaultValue: options.defaultValue || null,
      validation: options.validation || null
    });
    return this;
  }

  setPrimaryKey(fieldName) {
    this.primaryKey = fieldName;
    return this;
  }

  addIndex(fieldNames) {
    this.indexes.push(Array.isArray(fieldNames) ? fieldNames : [fieldNames]);
    return this;
  }

  validate(data) {
    return DataValidator.validateAgainstSchema(data, this);
  }
}

/**
 * 데이터 쿼리 빌더
 */
export class DataQuery {
  constructor() {
    this.filters = [];
    this.sorts = [];
    this.groupBy = [];
    this.aggregations = [];
    this.limit = null;
    this.offset = null;
    this.fields = [];
  }

  select(fields) {
    this.fields = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  where(field, operator, value) {
    this.filters.push({ field, operator, value });
    return this;
  }

  orderBy(field, direction = 'asc') {
    this.sorts.push({ field, direction });
    return this;
  }

  group(fields) {
    this.groupBy = Array.isArray(fields) ? fields : [fields];
    return this;
  }

  aggregate(field, func, alias = null) {
    this.aggregations.push({ field, func, alias: alias || `${func}_${field}` });
    return this;
  }

  take(count) {
    this.limit = count;
    return this;
  }

  skip(count) {
    this.offset = count;
    return this;
  }

  build() {
    return {
      filters: this.filters,
      sorts: this.sorts,
      groupBy: this.groupBy,
      aggregations: this.aggregations,
      limit: this.limit,
      offset: this.offset,
      fields: this.fields
    };
  }
}

/**
 * 통합 데이터 매니저 - 메인 클래스
 */
export class UnifiedDataManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      cacheSize: options.cacheSize || 1000,
      cacheTTL: options.cacheTTL || 300000, // 5분
      enableRealtime: options.enableRealtime || true,
      enableTransformation: options.enableTransformation || true,
      enableValidation: options.enableValidation || true,
      ...options
    };

    // 데이터 소스 저장소
    this.sources = new Map();
    
    // 데이터 커넥터 저장소
    this.connectors = new Map();
    
    // 캐시 시스템
    this.cache = new LRUCache(this.options.cacheSize);
    
    // 실시간 구독 관리
    this.subscriptions = new Map();
    
    // 데이터 변환기
    this.transformer = new DataTransformer();
    
    // 데이터 유효성 검사기
    this.validator = new DataValidator();
    
    // 성능 메트릭
    this.metrics = {
      queriesExecuted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageQueryTime: 0,
      errorCount: 0
    };

    this.init();
  }

  /**
   * 초기화
   */
  init() {
    console.log('UnifiedDataManager 초기화 시작...');
    
    // 캐시 TTL 정리 작업
    this.setupCacheCleanup();
    
    // 성능 메트릭 수집
    this.setupMetricsCollection();
    
    console.log('UnifiedDataManager 초기화 완료');
  }

  /**
   * 데이터 소스 추가
   */
  async addDataSource(sourceConfig) {
    try {
      const { id, type, name, config, schema } = sourceConfig;
      
      // 필수 필드 검증
      if (!id || !type) {
        throw new Error('데이터 소스 ID와 타입은 필수입니다.');
      }

      // 데이터 소스 객체 생성
      const dataSource = {
        id,
        type,
        name: name || id,
        config: config || {},
        schema: schema || null,
        status: 'disconnected',
        createdAt: new Date(),
        lastUpdated: null,
        errorCount: 0,
        metadata: {}
      };

      // 커넥터 생성
      const connector = await DataConnectorFactory.createConnector(type, config);
      
      // 연결 테스트
      await connector.connect();
      dataSource.status = 'connected';

      // 스키마 자동 감지
      if (!dataSource.schema) {
        console.log(`${id}: 스키마 자동 감지 시작...`);
        dataSource.schema = await connector.inferSchema();
        console.log(`${id}: 스키마 자동 감지 완료`);
      }

      // 저장
      this.sources.set(id, dataSource);
      this.connectors.set(id, connector);

      // 실시간 지원 확인
      if (this.options.enableRealtime && connector.supportsRealtime()) {
        await this.setupRealtimeSubscription(id, connector);
      }

      this.emit('dataSourceAdded', { id, dataSource });
      
      console.log(`데이터 소스 추가 완료: ${id} (${type})`);
      
      return dataSource;
      
    } catch (error) {
      console.error('데이터 소스 추가 실패:', error);
      throw error;
    }
  }

  /**
   * 데이터 소스 제거
   */
  async removeDataSource(sourceId) {
    try {
      const dataSource = this.sources.get(sourceId);
      const connector = this.connectors.get(sourceId);

      if (!dataSource || !connector) {
        throw new Error(`데이터 소스를 찾을 수 없습니다: ${sourceId}`);
      }

      // 실시간 구독 해제
      if (this.subscriptions.has(sourceId)) {
        await this.unsubscribeRealtime(sourceId);
      }

      // 연결 해제
      await connector.disconnect();

      // 캐시 정리
      this.clearCacheBySource(sourceId);

      // 저장소에서 제거
      this.sources.delete(sourceId);
      this.connectors.delete(sourceId);

      this.emit('dataSourceRemoved', { id: sourceId });
      
      console.log(`데이터 소스 제거 완료: ${sourceId}`);
      
    } catch (error) {
      console.error('데이터 소스 제거 실패:', error);
      throw error;
    }
  }

  /**
   * 데이터 조회
   */
  async getData(sourceId, query = null, options = {}) {
    const startTime = performance.now();
    
    try {
      // 데이터 소스 존재 확인
      const dataSource = this.sources.get(sourceId);
      if (!dataSource) {
        throw new Error(`데이터 소스를 찾을 수 없습니다: ${sourceId}`);
      }

      // 캐시 키 생성
      const cacheKey = this.generateCacheKey(sourceId, query, options);
      
      // 캐시 확인
      if (this.cache.has(cacheKey) && !options.bypassCache) {
        this.metrics.cacheHits++;
        const cachedResult = this.cache.get(cacheKey);
        
        console.log(`캐시 히트: ${sourceId}`);
        return cachedResult;
      }

      this.metrics.cacheMisses++;
      
      // 커넥터를 통해 데이터 조회
      const connector = this.connectors.get(sourceId);
      const rawData = await connector.query(query?.build() || {});

      // 데이터 변환
      let transformedData = rawData;
      if (this.options.enableTransformation && options.transform) {
        transformedData = await this.transformer.transform(rawData, options.transform);
      }

      // 데이터 유효성 검사
      if (this.options.enableValidation && dataSource.schema) {
        const validationResult = this.validator.validate(transformedData, dataSource.schema);
        if (!validationResult.isValid) {
          console.warn(`데이터 유효성 검사 실패: ${sourceId}`, validationResult.errors);
        }
      }

      // 결과 객체 생성
      const result = {
        data: transformedData,
        metadata: {
          sourceId,
          recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
          queryTime: performance.now() - startTime,
          fromCache: false,
          timestamp: new Date().toISOString()
        }
      };

      // 캐시 저장
      if (!options.bypassCache) {
        this.cache.set(cacheKey, result, this.options.cacheTTL);
      }

      // 메트릭 업데이트
      this.updateMetrics(performance.now() - startTime);

      // 데이터 소스 상태 업데이트
      dataSource.lastUpdated = new Date();
      dataSource.errorCount = 0;

      this.emit('dataFetched', { sourceId, result });
      
      return result;
      
    } catch (error) {
      // 에러 처리
      this.metrics.errorCount++;
      
      const dataSource = this.sources.get(sourceId);
      if (dataSource) {
        dataSource.errorCount++;
        dataSource.status = 'error';
      }

      this.emit('dataFetchError', { sourceId, error });
      
      console.error(`데이터 조회 실패: ${sourceId}`, error);
      throw error;
    }
  }

  /**
   * 실시간 데이터 구독
   */
  async subscribeRealtime(sourceId, callback, options = {}) {
    try {
      const dataSource = this.sources.get(sourceId);
      const connector = this.connectors.get(sourceId);

      if (!dataSource || !connector) {
        throw new Error(`데이터 소스를 찾을 수 없습니다: ${sourceId}`);
      }

      if (!connector.supportsRealtime()) {
        throw new Error(`실시간 데이터를 지원하지 않는 소스입니다: ${sourceId}`);
      }

      const subscriptionId = this.generateSubscriptionId();
      
      // 구독 정보 저장
      const subscription = {
        id: subscriptionId,
        sourceId,
        callback,
        options,
        active: true,
        createdAt: new Date()
      };

      this.subscriptions.set(subscriptionId, subscription);

      // 커넥터에 구독 등록
      await connector.subscribe((data) => {
        if (subscription.active) {
          // 데이터 변환
          let transformedData = data;
          if (options.transform) {
            transformedData = this.transformer.transform(data, options.transform);
          }

          // 콜백 호출
          callback({
            data: transformedData,
            metadata: {
              sourceId,
              subscriptionId,
              timestamp: new Date().toISOString(),
              realtime: true
            }
          });

          // 캐시 무효화
          this.invalidateCacheBySource(sourceId);
        }
      });

      console.log(`실시간 구독 시작: ${sourceId} (${subscriptionId})`);
      
      return subscriptionId;
      
    } catch (error) {
      console.error('실시간 구독 실패:', error);
      throw error;
    }
  }

  /**
   * 실시간 구독 해제
   */
  async unsubscribeRealtime(subscriptionId) {
    try {
      const subscription = this.subscriptions.get(subscriptionId);
      
      if (!subscription) {
        throw new Error(`구독을 찾을 수 없습니다: ${subscriptionId}`);
      }

      // 구독 비활성화
      subscription.active = false;
      
      // 커넥터에서 구독 해제
      const connector = this.connectors.get(subscription.sourceId);
      if (connector) {
        await connector.unsubscribe(subscriptionId);
      }

      // 구독 정보 삭제
      this.subscriptions.delete(subscriptionId);

      console.log(`실시간 구독 해제: ${subscriptionId}`);
      
    } catch (error) {
      console.error('실시간 구독 해제 실패:', error);
      throw error;
    }
  }

  /**
   * 데이터 소스 목록 조회
   */
  getDataSources() {
    return Array.from(this.sources.values());
  }

  /**
   * 특정 데이터 소스 조회
   */
  getDataSource(sourceId) {
    return this.sources.get(sourceId);
  }

  /**
   * 쿼리 빌더 생성
   */
  createQuery() {
    return new DataQuery();
  }

  /**
   * 스키마 생성
   */
  createSchema() {
    return new DataSchema();
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 캐시 상태 조회
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.maxSize,
      hitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses),
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.cache.clear();
    console.log('캐시 정리 완료');
  }

  /**
   * 특정 소스의 캐시 정리
   */
  clearCacheBySource(sourceId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${sourceId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    console.log(`${sourceId} 캐시 정리 완료 (${keysToDelete.length}개 항목)`);
  }

  /**
   * 종료 처리
   */
  async destroy() {
    try {
      // 모든 실시간 구독 해제
      const subscriptionIds = Array.from(this.subscriptions.keys());
      for (const subscriptionId of subscriptionIds) {
        await this.unsubscribeRealtime(subscriptionId);
      }

      // 모든 커넥터 연결 해제
      for (const [sourceId, connector] of this.connectors.entries()) {
        try {
          await connector.disconnect();
        } catch (error) {
          console.error(`커넥터 연결 해제 실패: ${sourceId}`, error);
        }
      }

      // 캐시 정리
      this.clearCache();

      // 리소스 해제
      this.sources.clear();
      this.connectors.clear();
      this.subscriptions.clear();

      console.log('UnifiedDataManager 종료 완료');
      
    } catch (error) {
      console.error('UnifiedDataManager 종료 실패:', error);
      throw error;
    }
  }

  // === 내부 메소드 ===

  /**
   * 캐시 키 생성
   */
  generateCacheKey(sourceId, query, options) {
    const queryStr = query ? JSON.stringify(query.build()) : 'null';
    const optionsStr = JSON.stringify(options || {});
    return `${sourceId}:${this.hashString(queryStr + optionsStr)}`;
  }

  /**
   * 구독 ID 생성
   */
  generateSubscriptionId() {
    return 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
   * 캐시 무효화
   */
  invalidateCacheBySource(sourceId) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${sourceId}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 실시간 구독 설정
   */
  async setupRealtimeSubscription(sourceId, connector) {
    try {
      await connector.enableRealtime();
      console.log(`실시간 데이터 활성화: ${sourceId}`);
    } catch (error) {
      console.warn(`실시간 데이터 활성화 실패: ${sourceId}`, error);
    }
  }

  /**
   * 캐시 정리 작업 설정
   */
  setupCacheCleanup() {
    setInterval(() => {
      this.cache.prune();
    }, 60000); // 1분마다 정리
  }

  /**
   * 메트릭 수집 설정
   */
  setupMetricsCollection() {
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, 30000); // 30초마다 메트릭 발생
  }

  /**
   * 메트릭 업데이트
   */
  updateMetrics(queryTime) {
    this.metrics.queriesExecuted++;
    this.metrics.averageQueryTime = (
      (this.metrics.averageQueryTime * (this.metrics.queriesExecuted - 1)) + queryTime
    ) / this.metrics.queriesExecuted;
  }
}

export default UnifiedDataManager;