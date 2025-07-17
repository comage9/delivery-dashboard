/**
 * LRU (Least Recently Used) 캐시 구현
 * 메모리 효율적인 캐시 시스템
 */

export class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
    this.expirationTimes = new Map();
  }

  /**
   * 값 설정
   */
  set(key, value, ttl = null) {
    // 기존 키가 있으면 제거
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    // 값 저장
    this.cache.set(key, value);
    this.accessOrder.push(key);

    // TTL 설정
    if (ttl) {
      this.expirationTimes.set(key, Date.now() + ttl);
    }

    return this;
  }

  /**
   * 값 조회
   */
  get(key) {
    // 만료 확인
    if (this.isExpired(key)) {
      this.delete(key);
      return undefined;
    }

    if (!this.cache.has(key)) {
      return undefined;
    }

    // 액세스 순서 업데이트
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);

    return this.cache.get(key);
  }

  /**
   * 키 존재 확인
   */
  has(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return false;
    }

    return this.cache.has(key);
  }

  /**
   * 값 삭제
   */
  delete(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    this.expirationTimes.delete(key);

    return true;
  }

  /**
   * 캐시 비우기
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.expirationTimes.clear();
  }

  /**
   * 캐시 크기
   */
  get size() {
    return this.cache.size;
  }

  /**
   * 모든 키 조회
   */
  keys() {
    return this.cache.keys();
  }

  /**
   * 모든 값 조회
   */
  values() {
    return this.cache.values();
  }

  /**
   * 모든 엔트리 조회
   */
  entries() {
    return this.cache.entries();
  }

  /**
   * 만료된 항목 정리
   */
  prune() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, expiration] of this.expirationTimes.entries()) {
      if (now > expiration) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));

    return expiredKeys.length;
  }

  /**
   * 캐시 통계
   */
  getStats() {
    return {
      size: this.size,
      maxSize: this.maxSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount),
      hitCount: this.hitCount || 0,
      missCount: this.missCount || 0
    };
  }

  // === 내부 메소드 ===

  /**
   * 만료 확인
   */
  isExpired(key) {
    const expiration = this.expirationTimes.get(key);
    if (!expiration) return false;
    
    return Date.now() > expiration;
  }

  /**
   * 액세스 순서에서 제거
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 가장 오래된 항목 제거
   */
  evict() {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder[0];
    this.delete(oldestKey);
  }
}

export default LRUCache;