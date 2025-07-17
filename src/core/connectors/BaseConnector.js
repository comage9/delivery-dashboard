/**
 * 기본 데이터 커넥터 클래스
 * 모든 데이터 커넥터의 기본 인터페이스를 정의
 */

export class BaseConnector {
  constructor(config = {}) {
    this.config = config;
    this.status = 'disconnected';
    this.metadata = {};
    this.lastError = null;
    this.connectionTime = null;
    this.queryCount = 0;
    this.errorCount = 0;
  }

  /**
   * 연결 - 구현 필요
   */
  async connect() {
    throw new Error('connect() 메소드를 구현해야 합니다');
  }

  /**
   * 연결 해제 - 구현 필요
   */
  async disconnect() {
    throw new Error('disconnect() 메소드를 구현해야 합니다');
  }

  /**
   * 데이터 조회 - 구현 필요
   */
  async query(queryParams = {}) {
    throw new Error('query() 메소드를 구현해야 합니다');
  }

  /**
   * 스키마 추론 - 구현 필요
   */
  async inferSchema() {
    throw new Error('inferSchema() 메소드를 구현해야 합니다');
  }

  /**
   * 실시간 지원 여부 - 구현 필요
   */
  supportsRealtime() {
    return false;
  }

  /**
   * 실시간 데이터 활성화 (선택적)
   */
  async enableRealtime() {
    if (!this.supportsRealtime()) {
      throw new Error('이 커넥터는 실시간 데이터를 지원하지 않습니다');
    }
  }

  /**
   * 실시간 데이터 구독 (선택적)
   */
  async subscribe(callback) {
    if (!this.supportsRealtime()) {
      throw new Error('이 커넥터는 실시간 데이터를 지원하지 않습니다');
    }
    
    throw new Error('subscribe() 메소드를 구현해야 합니다');
  }

  /**
   * 실시간 데이터 구독 해제 (선택적)
   */
  async unsubscribe(subscriptionId) {
    if (!this.supportsRealtime()) {
      throw new Error('이 커넥터는 실시간 데이터를 지원하지 않습니다');
    }
    
    throw new Error('unsubscribe() 메소드를 구현해야 합니다');
  }

  /**
   * 연결 상태 확인
   */
  isConnected() {
    return this.status === 'connected';
  }

  /**
   * 연결 상태 조회
   */
  getStatus() {
    return {
      status: this.status,
      connectionTime: this.connectionTime,
      queryCount: this.queryCount,
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: this.metadata
    };
  }

  /**
   * 메타데이터 설정
   */
  setMetadata(key, value) {
    this.metadata[key] = value;
  }

  /**
   * 메타데이터 조회
   */
  getMetadata(key) {
    return key ? this.metadata[key] : this.metadata;
  }

  /**
   * 에러 기록
   */
  recordError(error) {
    this.lastError = {
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };
    
    this.errorCount++;
    console.error(`커넥터 에러:`, error);
  }

  /**
   * 쿼리 카운트 증가
   */
  incrementQueryCount() {
    this.queryCount++;
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 설정 조회
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 연결 시간 기록
   */
  recordConnectionTime() {
    this.connectionTime = new Date().toISOString();
  }

  /**
   * 상태 변경
   */
  setStatus(status) {
    this.status = status;
    
    if (status === 'connected') {
      this.recordConnectionTime();
    }
  }

  /**
   * 헬스 체크
   */
  async healthCheck() {
    try {
      // 기본적으로 간단한 쿼리 시도
      await this.query({ limit: 1 });
      return { healthy: true, message: 'OK' };
    } catch (error) {
      return { 
        healthy: false, 
        message: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 리소스 정리
   */
  async cleanup() {
    try {
      if (this.isConnected()) {
        await this.disconnect();
      }
      
      // 메타데이터 정리
      this.metadata = {};
      this.lastError = null;
      
      console.log('커넥터 리소스 정리 완료');
      
    } catch (error) {
      console.error('커넥터 리소스 정리 실패:', error);
      throw error;
    }
  }
}

export default BaseConnector;