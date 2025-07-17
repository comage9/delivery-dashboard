/**
 * 데이터 스트림 매니저
 * 다중 스트림 관리 및 통합 인터페이스 제공
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';
import { RealTimeDataStreamer } from './RealTimeDataStreamer.js';

export class DataStreamManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxStreams: config.maxStreams || 10,
      defaultStreamConfig: {
        reconnectInterval: 3000,
        maxReconnectAttempts: 5,
        heartbeatInterval: 30000,
        bufferSize: 1000
      },
      ...config
    };

    this.streams = new Map();
    this.streamSubscriptions = new Map();
    this.dataHandlers = new Map();
    this.aggregators = new Map();
    
    // 통합 메트릭
    this.globalMetrics = {
      totalStreams: 0,
      activeStreams: 0,
      totalMessages: 0,
      totalBytes: 0,
      averageLatency: 0,
      errorRate: 0,
      uptime: Date.now()
    };

    this.init();
  }

  /**
   * 초기화
   */
  async init() {
    try {
      console.log('DataStreamManager 초기화 중...');
      
      // 메트릭 업데이트 타이머 설정
      this.setupMetricsTimer();
      
      console.log('DataStreamManager 초기화 완료');
      
    } catch (error) {
      console.error('DataStreamManager 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 스트림 생성
   */
  async createStream(streamId, config = {}) {
    if (this.streams.has(streamId)) {
      throw new Error(`스트림이 이미 존재합니다: ${streamId}`);
    }

    if (this.streams.size >= this.config.maxStreams) {
      throw new Error(`최대 스트림 수 초과: ${this.config.maxStreams}`);
    }

    const streamConfig = {
      ...this.config.defaultStreamConfig,
      ...config
    };

    const stream = new RealTimeDataStreamer(streamConfig);
    
    // 스트림 이벤트 리스너 설정
    this.setupStreamEventListeners(streamId, stream);
    
    this.streams.set(streamId, stream);
    this.streamSubscriptions.set(streamId, new Map());
    
    this.globalMetrics.totalStreams++;
    
    console.log(`스트림 생성: ${streamId}`);
    this.emit('streamCreated', { streamId, stream });
    
    return stream;
  }

  /**
   * 스트림 제거
   */
  async removeStream(streamId) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      return false;
    }

    // 스트림 정리
    await stream.destroy();
    
    // 데이터 정리
    this.streams.delete(streamId);
    this.streamSubscriptions.delete(streamId);
    this.dataHandlers.delete(streamId);
    
    console.log(`스트림 제거: ${streamId}`);
    this.emit('streamRemoved', { streamId });
    
    return true;
  }

  /**
   * 스트림 조회
   */
  getStream(streamId) {
    return this.streams.get(streamId);
  }

  /**
   * 모든 스트림 조회
   */
  getAllStreams() {
    return Array.from(this.streams.entries()).map(([id, stream]) => ({
      id,
      stream,
      connectionState: stream.getConnectionState(),
      subscriptions: stream.getSubscriptions(),
      metrics: stream.getMetrics()
    }));
  }

  /**
   * 채널 구독 (특정 스트림)
   */
  async subscribe(streamId, channel, callback, options = {}) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      throw new Error(`스트림을 찾을 수 없습니다: ${streamId}`);
    }

    // 구독 정보 저장
    const subscriptions = this.streamSubscriptions.get(streamId);
    subscriptions.set(channel, { callback, options, subscribedAt: Date.now() });

    // 스트림에 구독 요청
    await stream.subscribe(channel, callback, options);
    
    console.log(`채널 구독: ${streamId}:${channel}`);
    this.emit('subscribed', { streamId, channel });
    
    return true;
  }

  /**
   * 채널 구독 해제 (특정 스트림)
   */
  async unsubscribe(streamId, channel) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      return false;
    }

    const subscriptions = this.streamSubscriptions.get(streamId);
    subscriptions.delete(channel);

    await stream.unsubscribe(channel);
    
    console.log(`채널 구독 해제: ${streamId}:${channel}`);
    this.emit('unsubscribed', { streamId, channel });
    
    return true;
  }

  /**
   * 다중 스트림 구독
   */
  async subscribeMultiple(subscriptionMap) {
    const results = [];
    
    for (const [streamId, channels] of Object.entries(subscriptionMap)) {
      for (const [channel, config] of Object.entries(channels)) {
        try {
          await this.subscribe(streamId, channel, config.callback, config.options);
          results.push({ streamId, channel, success: true });
        } catch (error) {
          results.push({ streamId, channel, success: false, error: error.message });
        }
      }
    }
    
    return results;
  }

  /**
   * 브로드캐스트 구독 (모든 스트림)
   */
  async subscribeAll(channel, callback, options = {}) {
    const results = [];
    
    for (const [streamId, stream] of this.streams.entries()) {
      try {
        await this.subscribe(streamId, channel, callback, options);
        results.push({ streamId, success: true });
      } catch (error) {
        results.push({ streamId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * 데이터 게시 (특정 스트림)
   */
  async publish(streamId, channel, data, options = {}) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      throw new Error(`스트림을 찾을 수 없습니다: ${streamId}`);
    }

    await stream.publish(channel, data, options);
    
    this.emit('published', { streamId, channel, data });
    return true;
  }

  /**
   * 브로드캐스트 게시 (모든 스트림)
   */
  async publishAll(channel, data, options = {}) {
    const results = [];
    
    for (const [streamId, stream] of this.streams.entries()) {
      try {
        await stream.publish(channel, data, options);
        results.push({ streamId, success: true });
      } catch (error) {
        results.push({ streamId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * 데이터 핸들러 등록
   */
  registerDataHandler(streamId, handlerName, handler) {
    if (!this.dataHandlers.has(streamId)) {
      this.dataHandlers.set(streamId, new Map());
    }
    
    this.dataHandlers.get(streamId).set(handlerName, handler);
    
    console.log(`데이터 핸들러 등록: ${streamId}:${handlerName}`);
    return true;
  }

  /**
   * 데이터 핸들러 제거
   */
  removeDataHandler(streamId, handlerName) {
    const handlers = this.dataHandlers.get(streamId);
    
    if (handlers) {
      handlers.delete(handlerName);
      console.log(`데이터 핸들러 제거: ${streamId}:${handlerName}`);
      return true;
    }
    
    return false;
  }

  /**
   * 데이터 집계기 등록
   */
  registerAggregator(name, aggregator) {
    this.aggregators.set(name, aggregator);
    
    console.log(`데이터 집계기 등록: ${name}`);
    return true;
  }

  /**
   * 데이터 집계 실행
   */
  async aggregate(aggregatorName, streamIds, options = {}) {
    const aggregator = this.aggregators.get(aggregatorName);
    
    if (!aggregator) {
      throw new Error(`집계기를 찾을 수 없습니다: ${aggregatorName}`);
    }

    const data = [];
    
    for (const streamId of streamIds) {
      const stream = this.streams.get(streamId);
      
      if (stream) {
        const streamData = this.getStreamData(streamId, options);
        data.push({ streamId, data: streamData });
      }
    }

    return await aggregator(data, options);
  }

  /**
   * 스트림 데이터 조회
   */
  getStreamData(streamId, options = {}) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      return null;
    }

    const channels = stream.getSubscriptions();
    const data = {};
    
    for (const channel of channels) {
      data[channel] = stream.getChannelData(channel, options.limit);
    }
    
    return data;
  }

  /**
   * 스트림 상태 조회
   */
  getStreamStatus(streamId) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      return null;
    }

    return {
      id: streamId,
      connectionState: stream.getConnectionState(),
      subscriptions: stream.getSubscriptions(),
      metrics: stream.getMetrics()
    };
  }

  /**
   * 모든 스트림 상태 조회
   */
  getAllStreamStatus() {
    return Array.from(this.streams.entries()).map(([id, stream]) => ({
      id,
      connectionState: stream.getConnectionState(),
      subscriptions: stream.getSubscriptions(),
      metrics: stream.getMetrics()
    }));
  }

  /**
   * 스트림 이벤트 리스너 설정
   */
  setupStreamEventListeners(streamId, stream) {
    // 연결 이벤트
    stream.on('connected', () => {
      this.globalMetrics.activeStreams++;
      this.emit('streamConnected', { streamId });
    });

    stream.on('disconnected', () => {
      this.globalMetrics.activeStreams--;
      this.emit('streamDisconnected', { streamId });
    });

    // 데이터 이벤트
    stream.on('data', (data) => {
      this.globalMetrics.totalMessages++;
      this.processStreamData(streamId, data);
      this.emit('streamData', { streamId, ...data });
    });

    // 오류 이벤트
    stream.on('error', (error) => {
      this.globalMetrics.errorRate++;
      this.emit('streamError', { streamId, error });
    });

    // 구독 이벤트
    stream.on('subscribed', ({ channel }) => {
      this.emit('streamSubscribed', { streamId, channel });
    });

    stream.on('unsubscribed', ({ channel }) => {
      this.emit('streamUnsubscribed', { streamId, channel });
    });
  }

  /**
   * 스트림 데이터 처리
   */
  async processStreamData(streamId, data) {
    const handlers = this.dataHandlers.get(streamId);
    
    if (!handlers) {
      return;
    }

    for (const [handlerName, handler] of handlers.entries()) {
      try {
        await handler(data);
      } catch (error) {
        console.error(`데이터 핸들러 오류 (${streamId}:${handlerName}):`, error);
        this.emit('handlerError', { streamId, handlerName, error });
      }
    }
  }

  /**
   * 스트림 헬스 체크
   */
  async healthCheck(streamId = null) {
    if (streamId) {
      const stream = this.streams.get(streamId);
      
      if (!stream) {
        return { streamId, healthy: false, error: 'Stream not found' };
      }

      const health = await stream.healthCheck();
      return { streamId, ...health };
    }

    // 모든 스트림 헬스 체크
    const results = [];
    
    for (const [id, stream] of this.streams.entries()) {
      const health = await stream.healthCheck();
      results.push({ streamId: id, ...health });
    }
    
    return results;
  }

  /**
   * 스트림 재시작
   */
  async restartStream(streamId) {
    const stream = this.streams.get(streamId);
    
    if (!stream) {
      throw new Error(`스트림을 찾을 수 없습니다: ${streamId}`);
    }

    // 기존 구독 정보 저장
    const subscriptions = this.streamSubscriptions.get(streamId);
    const subscriptionBackup = new Map(subscriptions);

    // 스트림 재시작
    stream.disconnect();
    await stream.connect();

    // 구독 복원
    for (const [channel, config] of subscriptionBackup.entries()) {
      await stream.subscribe(channel, config.callback, config.options);
    }

    console.log(`스트림 재시작: ${streamId}`);
    this.emit('streamRestarted', { streamId });
    
    return true;
  }

  /**
   * 메트릭 타이머 설정
   */
  setupMetricsTimer() {
    setInterval(() => {
      this.updateGlobalMetrics();
    }, 5000);
  }

  /**
   * 글로벌 메트릭 업데이트
   */
  updateGlobalMetrics() {
    let totalMessages = 0;
    let totalBytes = 0;
    let totalLatency = 0;
    let totalErrors = 0;
    let activeStreams = 0;

    for (const stream of this.streams.values()) {
      const metrics = stream.getMetrics();
      
      totalMessages += metrics.totalMessages;
      totalBytes += metrics.totalBytes;
      totalLatency += metrics.averageLatency;
      totalErrors += metrics.errors;
      
      if (stream.getConnectionState() === 'connected') {
        activeStreams++;
      }
    }

    this.globalMetrics.totalMessages = totalMessages;
    this.globalMetrics.totalBytes = totalBytes;
    this.globalMetrics.averageLatency = this.streams.size > 0 ? totalLatency / this.streams.size : 0;
    this.globalMetrics.errorRate = totalErrors;
    this.globalMetrics.activeStreams = activeStreams;
  }

  /**
   * 글로벌 메트릭 조회
   */
  getGlobalMetrics() {
    return {
      ...this.globalMetrics,
      totalStreams: this.streams.size,
      uptime: Date.now() - this.globalMetrics.uptime
    };
  }

  /**
   * 스트림 통계 조회
   */
  getStats() {
    return {
      totalStreams: this.streams.size,
      activeStreams: this.globalMetrics.activeStreams,
      subscriptions: Array.from(this.streamSubscriptions.values())
        .reduce((total, subs) => total + subs.size, 0),
      handlers: Array.from(this.dataHandlers.values())
        .reduce((total, handlers) => total + handlers.size, 0),
      aggregators: this.aggregators.size,
      globalMetrics: this.getGlobalMetrics()
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('DataStreamManager 설정 업데이트');
    return true;
  }

  /**
   * 모든 스트림 정리
   */
  async destroyAllStreams() {
    const streamIds = Array.from(this.streams.keys());
    
    for (const streamId of streamIds) {
      await this.removeStream(streamId);
    }
    
    return streamIds.length;
  }

  /**
   * 리소스 정리
   */
  async destroy() {
    try {
      // 모든 스트림 정리
      await this.destroyAllStreams();
      
      // 데이터 정리
      this.dataHandlers.clear();
      this.aggregators.clear();
      
      // 이벤트 리스너 제거
      this.removeAllListeners();
      
      console.log('DataStreamManager 리소스 정리 완료');
      
    } catch (error) {
      console.error('DataStreamManager 리소스 정리 실패:', error);
    }
  }
}

/**
 * 기본 데이터 집계기들
 */
export class DefaultAggregators {
  
  /**
   * 평균 집계기
   */
  static average(data, options = {}) {
    const values = data.flatMap(item => 
      Object.values(item.data).flatMap(channelData => 
        channelData.map(d => d.data)
      )
    ).filter(val => typeof val === 'number');

    if (values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 합계 집계기
   */
  static sum(data, options = {}) {
    const values = data.flatMap(item => 
      Object.values(item.data).flatMap(channelData => 
        channelData.map(d => d.data)
      )
    ).filter(val => typeof val === 'number');

    return values.reduce((sum, val) => sum + val, 0);
  }

  /**
   * 최대값 집계기
   */
  static max(data, options = {}) {
    const values = data.flatMap(item => 
      Object.values(item.data).flatMap(channelData => 
        channelData.map(d => d.data)
      )
    ).filter(val => typeof val === 'number');

    return values.length > 0 ? Math.max(...values) : null;
  }

  /**
   * 최소값 집계기
   */
  static min(data, options = {}) {
    const values = data.flatMap(item => 
      Object.values(item.data).flatMap(channelData => 
        channelData.map(d => d.data)
      )
    ).filter(val => typeof val === 'number');

    return values.length > 0 ? Math.min(...values) : null;
  }

  /**
   * 카운트 집계기
   */
  static count(data, options = {}) {
    return data.reduce((total, item) => {
      return total + Object.values(item.data).reduce((sum, channelData) => {
        return sum + channelData.length;
      }, 0);
    }, 0);
  }
}

export default DataStreamManager;