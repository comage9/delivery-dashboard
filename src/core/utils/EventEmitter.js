/**
 * 이벤트 에미터 - 옵저버 패턴 구현
 * 비동기 이벤트 처리를 위한 기본 클래스
 */

export class EventEmitter {
  constructor() {
    this.events = new Map();
    this.maxListeners = 100;
  }

  /**
   * 이벤트 리스너 등록
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('리스너는 함수여야 합니다');
    }

    if (!this.events.has(event)) {
      this.events.set(event, []);
    }

    const listeners = this.events.get(event);
    
    // 최대 리스너 수 확인
    if (listeners.length >= this.maxListeners) {
      console.warn(`이벤트 '${event}'의 리스너 수가 최대값(${this.maxListeners})에 도달했습니다`);
    }

    listeners.push(listener);
    
    return this;
  }

  /**
   * 일회성 이벤트 리스너 등록
   */
  once(event, listener) {
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      listener.apply(this, args);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * 이벤트 리스너 제거
   */
  off(event, listener) {
    if (!this.events.has(event)) {
      return this;
    }

    const listeners = this.events.get(event);
    const index = listeners.indexOf(listener);

    if (index > -1) {
      listeners.splice(index, 1);
    }

    // 리스너가 없으면 이벤트 제거
    if (listeners.length === 0) {
      this.events.delete(event);
    }

    return this;
  }

  /**
   * 모든 리스너 제거
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }

    return this;
  }

  /**
   * 이벤트 발생
   */
  emit(event, ...args) {
    if (!this.events.has(event)) {
      return false;
    }

    const listeners = this.events.get(event).slice(); // 복사본 생성

    for (const listener of listeners) {
      try {
        listener.apply(this, args);
      } catch (error) {
        console.error(`이벤트 '${event}' 리스너 실행 중 오류:`, error);
        
        // 에러 이벤트 발생
        if (event !== 'error') {
          this.emit('error', error);
        }
      }
    }

    return true;
  }

  /**
   * 이벤트 리스너 수 조회
   */
  listenerCount(event) {
    if (!this.events.has(event)) {
      return 0;
    }

    return this.events.get(event).length;
  }

  /**
   * 이벤트 리스너 목록 조회
   */
  listeners(event) {
    if (!this.events.has(event)) {
      return [];
    }

    return this.events.get(event).slice();
  }

  /**
   * 등록된 모든 이벤트 이름 조회
   */
  eventNames() {
    return Array.from(this.events.keys());
  }

  /**
   * 최대 리스너 수 설정
   */
  setMaxListeners(n) {
    if (typeof n !== 'number' || n < 0) {
      throw new TypeError('최대 리스너 수는 0 이상의 숫자여야 합니다');
    }

    this.maxListeners = n;
    return this;
  }

  /**
   * 최대 리스너 수 조회
   */
  getMaxListeners() {
    return this.maxListeners;
  }

  /**
   * 프로미스 기반 이벤트 대기
   */
  waitFor(event, timeout = 0) {
    return new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = () => {
        this.off(event, onEvent);
        this.off('error', onError);
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };

      const onEvent = (...args) => {
        cleanup();
        resolve(args);
      };

      const onError = (error) => {
        cleanup();
        reject(error);
      };

      this.once(event, onEvent);
      this.once('error', onError);

      if (timeout > 0) {
        timeoutId = setTimeout(() => {
          cleanup();
          reject(new Error(`이벤트 '${event}' 대기 시간 초과 (${timeout}ms)`));
        }, timeout);
      }
    });
  }

  /**
   * 디버깅 정보 출력
   */
  debug() {
    const info = {
      eventCount: this.events.size,
      totalListeners: 0,
      events: {}
    };

    for (const [event, listeners] of this.events.entries()) {
      info.events[event] = listeners.length;
      info.totalListeners += listeners.length;
    }

    return info;
  }
}

export default EventEmitter;