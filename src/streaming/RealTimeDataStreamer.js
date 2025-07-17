/**
 * 실시간 데이터 스트리머
 * WebSocket 기반 실시간 데이터 스트리밍 시스템
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

export class RealTimeDataStreamer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      websocketUrl: config.websocketUrl || 'ws://localhost:8080',
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 5,
      heartbeatInterval: config.heartbeatInterval || 30000,
      bufferSize: config.bufferSize || 1000,
      compressionEnabled: config.compressionEnabled || false,
      ...config
    };

    this.websocket = null;
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.subscriptions = new Map();
    this.dataBuffer = new Map();
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    
    // 성능 메트릭
    this.metrics = {
      totalMessages: 0,
      totalBytes: 0,
      messageRate: 0,
      averageLatency: 0,
      connectionUptime: 0,
      lastMessageTime: null,
      errors: 0
    };
    
    // 메시지 처리 큐
    this.messageQueue = [];
    this.isProcessing = false;
    
    this.init();
  }

  /**
   * 초기화
   */
  async init() {
    try {
      console.log('RealTimeDataStreamer 초기화 중...');
      
      // WebSocket 연결 설정
      await this.connect();
      
      // 메트릭 업데이트 주기 설정
      this.setupMetricsUpdateTimer();
      
      console.log('RealTimeDataStreamer 초기화 완료');
      
    } catch (error) {
      console.error('RealTimeDataStreamer 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * WebSocket 연결
   */
  async connect() {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }

    this.connectionState = 'connecting';
    this.emit('connecting');

    try {
      this.websocket = new WebSocket(this.config.websocketUrl);
      
      // 연결 이벤트 핸들러
      this.websocket.onopen = this.handleOpen.bind(this);
      this.websocket.onmessage = this.handleMessage.bind(this);
      this.websocket.onerror = this.handleError.bind(this);
      this.websocket.onclose = this.handleClose.bind(this);
      
      // 연결 타임아웃 설정
      const connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.websocket.close();
          throw new Error('웹소켓 연결 타임아웃');
        }
      }, 10000);

      // 연결 완료 대기
      await new Promise((resolve, reject) => {
        const originalOnOpen = this.websocket.onopen;
        const originalOnError = this.websocket.onerror;
        
        this.websocket.onopen = (event) => {
          clearTimeout(connectionTimeout);
          originalOnOpen(event);
          resolve();
        };
        
        this.websocket.onerror = (event) => {
          clearTimeout(connectionTimeout);
          originalOnError(event);
          reject(new Error('웹소켓 연결 실패'));
        };
      });

    } catch (error) {
      this.connectionState = 'disconnected';
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 연결 열림 처리
   */
  handleOpen(event) {
    console.log('WebSocket 연결 성공');
    
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.metrics.connectionUptime = Date.now();
    
    // 하트비트 시작
    this.startHeartbeat();
    
    // 기존 구독 복원
    this.restoreSubscriptions();
    
    this.emit('connected', event);
  }

  /**
   * 메시지 수신 처리
   */
  handleMessage(event) {
    try {
      const startTime = performance.now();
      
      // 메시지 파싱
      let message;
      if (typeof event.data === 'string') {
        message = JSON.parse(event.data);
      } else {
        // 바이너리 데이터 처리
        message = this.parseBinaryMessage(event.data);
      }
      
      // 메트릭 업데이트
      this.updateMessageMetrics(event.data, performance.now() - startTime);
      
      // 메시지 큐에 추가
      this.messageQueue.push(message);
      
      // 비동기 처리
      this.processMessageQueue();
      
    } catch (error) {
      console.error('메시지 처리 오류:', error);
      this.metrics.errors++;
      this.emit('error', error);
    }
  }

  /**
   * 메시지 큐 처리
   */
  async processMessageQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        await this.processMessage(message);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 개별 메시지 처리
   */
  async processMessage(message) {
    try {
      // 메시지 타입별 처리
      switch (message.type) {
        case 'data':
          await this.handleDataMessage(message);
          break;
        case 'heartbeat':
          await this.handleHeartbeatMessage(message);
          break;
        case 'subscription':
          await this.handleSubscriptionMessage(message);
          break;
        case 'error':
          await this.handleErrorMessage(message);
          break;
        default:
          console.warn('알 수 없는 메시지 타입:', message.type);
      }
    } catch (error) {
      console.error('메시지 처리 오류:', error);
      this.emit('error', error);
    }
  }

  /**
   * 데이터 메시지 처리
   */
  async handleDataMessage(message) {
    const { channel, data, timestamp } = message;
    
    // 구독 확인
    if (!this.subscriptions.has(channel)) {
      return;
    }

    // 데이터 버퍼에 추가
    this.addToBuffer(channel, data, timestamp);
    
    // 구독자들에게 전송
    const subscription = this.subscriptions.get(channel);
    
    if (subscription.callback) {
      try {
        await subscription.callback(data, timestamp);
      } catch (error) {
        console.error(`채널 ${channel} 콜백 처리 오류:`, error);
      }
    }
    
    // 이벤트 발생
    this.emit('data', { channel, data, timestamp });
  }

  /**
   * 하트비트 메시지 처리
   */
  async handleHeartbeatMessage(message) {
    // 서버 하트비트 응답
    if (message.ping) {
      this.sendMessage({
        type: 'heartbeat',
        pong: true,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 구독 메시지 처리
   */
  async handleSubscriptionMessage(message) {
    const { channel, status, error } = message;
    
    if (status === 'subscribed') {
      console.log(`채널 구독 성공: ${channel}`);
      this.emit('subscribed', { channel });
    } else if (status === 'unsubscribed') {
      console.log(`채널 구독 해제: ${channel}`);
      this.emit('unsubscribed', { channel });
    } else if (error) {
      console.error(`채널 구독 오류: ${channel}`, error);
      this.emit('subscriptionError', { channel, error });
    }
  }

  /**
   * 오류 메시지 처리
   */
  async handleErrorMessage(message) {
    const { code, message: errorMessage, details } = message;
    
    console.error('서버 오류:', errorMessage, details);
    
    const error = new Error(errorMessage);
    error.code = code;
    error.details = details;
    
    this.emit('serverError', error);
  }

  /**
   * 연결 오류 처리
   */
  handleError(event) {
    console.error('WebSocket 오류:', event);
    this.metrics.errors++;
    this.emit('error', event);
  }

  /**
   * 연결 종료 처리
   */
  handleClose(event) {
    console.log('WebSocket 연결 종료:', event.code, event.reason);
    
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    
    this.emit('disconnected', event);
    
    // 자동 재연결 시도
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.scheduleReconnect();
    } else {
      console.error('최대 재연결 시도 횟수 초과');
      this.emit('maxReconnectAttemptsExceeded');
    }
  }

  /**
   * 채널 구독
   */
  async subscribe(channel, callback, options = {}) {
    if (!channel) {
      throw new Error('채널 이름이 필요합니다');
    }

    // 구독 정보 저장
    this.subscriptions.set(channel, {
      callback,
      options,
      subscribedAt: Date.now()
    });

    // 데이터 버퍼 초기화
    this.dataBuffer.set(channel, []);

    // 서버에 구독 요청
    if (this.connectionState === 'connected') {
      await this.sendSubscriptionRequest(channel, options);
    }

    console.log(`채널 구독: ${channel}`);
    return true;
  }

  /**
   * 채널 구독 해제
   */
  async unsubscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      return false;
    }

    // 구독 정보 제거
    this.subscriptions.delete(channel);
    this.dataBuffer.delete(channel);

    // 서버에 구독 해제 요청
    if (this.connectionState === 'connected') {
      await this.sendUnsubscriptionRequest(channel);
    }

    console.log(`채널 구독 해제: ${channel}`);
    return true;
  }

  /**
   * 모든 구독 해제
   */
  async unsubscribeAll() {
    const channels = Array.from(this.subscriptions.keys());
    
    for (const channel of channels) {
      await this.unsubscribe(channel);
    }
    
    return channels.length;
  }

  /**
   * 실시간 데이터 전송
   */
  async publish(channel, data, options = {}) {
    if (this.connectionState !== 'connected') {
      throw new Error('WebSocket이 연결되지 않았습니다');
    }

    const message = {
      type: 'publish',
      channel,
      data,
      timestamp: Date.now(),
      ...options
    };

    await this.sendMessage(message);
    return true;
  }

  /**
   * 메시지 전송
   */
  async sendMessage(message) {
    if (this.connectionState !== 'connected') {
      throw new Error('WebSocket이 연결되지 않았습니다');
    }

    try {
      const messageStr = JSON.stringify(message);
      this.websocket.send(messageStr);
      
      // 메트릭 업데이트
      this.metrics.totalMessages++;
      this.metrics.totalBytes += messageStr.length;
      
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * 구독 요청 전송
   */
  async sendSubscriptionRequest(channel, options) {
    const message = {
      type: 'subscribe',
      channel,
      options,
      timestamp: Date.now()
    };

    await this.sendMessage(message);
  }

  /**
   * 구독 해제 요청 전송
   */
  async sendUnsubscriptionRequest(channel) {
    const message = {
      type: 'unsubscribe',
      channel,
      timestamp: Date.now()
    };

    await this.sendMessage(message);
  }

  /**
   * 하트비트 시작
   */
  startHeartbeat() {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.sendMessage({
          type: 'heartbeat',
          ping: true,
          timestamp: Date.now()
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * 하트비트 중지
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 재연결 예약
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`${delay}ms 후 재연결 시도... (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('재연결 실패:', error);
      });
    }, delay);
  }

  /**
   * 구독 복원
   */
  async restoreSubscriptions() {
    const channels = Array.from(this.subscriptions.keys());
    
    for (const channel of channels) {
      const subscription = this.subscriptions.get(channel);
      
      try {
        await this.sendSubscriptionRequest(channel, subscription.options);
      } catch (error) {
        console.error(`채널 ${channel} 구독 복원 실패:`, error);
      }
    }
  }

  /**
   * 데이터 버퍼에 추가
   */
  addToBuffer(channel, data, timestamp) {
    let buffer = this.dataBuffer.get(channel);
    
    if (!buffer) {
      buffer = [];
      this.dataBuffer.set(channel, buffer);
    }

    buffer.push({ data, timestamp });

    // 버퍼 크기 제한
    if (buffer.length > this.config.bufferSize) {
      buffer.shift();
    }
  }

  /**
   * 채널 데이터 조회
   */
  getChannelData(channel, limit = null) {
    const buffer = this.dataBuffer.get(channel);
    
    if (!buffer) {
      return [];
    }

    if (limit) {
      return buffer.slice(-limit);
    }

    return [...buffer];
  }

  /**
   * 바이너리 메시지 파싱
   */
  parseBinaryMessage(data) {
    // 간단한 바이너리 메시지 파싱 예제
    const view = new DataView(data);
    const type = view.getUint8(0);
    const timestamp = view.getBigUint64(1);
    
    // 실제 구현에서는 더 복잡한 프로토콜 파싱 필요
    return {
      type: 'data',
      timestamp: Number(timestamp),
      data: data.slice(9)
    };
  }

  /**
   * 메시지 메트릭 업데이트
   */
  updateMessageMetrics(messageData, processingTime) {
    this.metrics.totalMessages++;
    
    if (typeof messageData === 'string') {
      this.metrics.totalBytes += messageData.length;
    } else {
      this.metrics.totalBytes += messageData.byteLength;
    }

    this.metrics.lastMessageTime = Date.now();
    
    // 평균 지연시간 계산
    const currentLatency = this.metrics.averageLatency;
    this.metrics.averageLatency = (currentLatency + processingTime) / 2;
  }

  /**
   * 메트릭 업데이트 타이머 설정
   */
  setupMetricsUpdateTimer() {
    setInterval(() => {
      this.updateMessageRate();
      this.updateConnectionUptime();
    }, 1000);
  }

  /**
   * 메시지 전송률 업데이트
   */
  updateMessageRate() {
    // 간단한 메시지 전송률 계산 (초당 메시지 수)
    const now = Date.now();
    const timeDiff = now - (this.metrics.lastRateUpdate || now);
    
    if (timeDiff > 0) {
      this.metrics.messageRate = (this.metrics.totalMessages - (this.metrics.lastMessageCount || 0)) / (timeDiff / 1000);
      this.metrics.lastMessageCount = this.metrics.totalMessages;
      this.metrics.lastRateUpdate = now;
    }
  }

  /**
   * 연결 가동시간 업데이트
   */
  updateConnectionUptime() {
    if (this.connectionState === 'connected' && this.metrics.connectionUptime) {
      this.metrics.connectionUptime = Date.now() - this.metrics.connectionUptime;
    }
  }

  /**
   * 연결 상태 조회
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * 구독 목록 조회
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    return {
      ...this.metrics,
      connectionState: this.connectionState,
      subscriptionCount: this.subscriptions.size,
      bufferSize: Array.from(this.dataBuffer.values()).reduce((total, buffer) => total + buffer.length, 0)
    };
  }

  /**
   * 연결 강제 종료
   */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
    }
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.connectionState = 'disconnected';
  }

  /**
   * 리소스 정리
   */
  async destroy() {
    try {
      // 모든 구독 해제
      await this.unsubscribeAll();
      
      // 연결 종료
      this.disconnect();
      
      // 이벤트 리스너 제거
      this.removeAllListeners();
      
      // 데이터 정리
      this.subscriptions.clear();
      this.dataBuffer.clear();
      this.messageQueue.length = 0;
      
      console.log('RealTimeDataStreamer 리소스 정리 완료');
      
    } catch (error) {
      console.error('RealTimeDataStreamer 리소스 정리 실패:', error);
    }
  }
}

export default RealTimeDataStreamer;