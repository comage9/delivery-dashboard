/**
 * 차세대 대시보드 플랫폼 - 메인 애플리케이션
 * 모든 서브시스템을 통합하는 핵심 애플리케이션
 */

import { EventEmitter } from './core/utils/EventEmitter.js';
import { UnifiedDataManager } from './core/UnifiedDataManager.js';
import { MCPChartRenderer } from './chart/MCPChartRenderer.js';
import { ChartTypeManager } from './chart/ChartTypeManager.js';
import { DataStreamManager } from './streaming/DataStreamManager.js';
import { StreamingChartUpdater } from './streaming/StreamingChartUpdater.js';
import { UserCustomizationManager } from './customization/UserCustomizationManager.js';
import { ThemeManager } from './chart/ThemeManager.js';

export class DashboardApp extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      version: '1.0.0',
      appName: 'Chart MCP Dashboard',
      environment: config.environment || 'production',
      debug: config.debug || false,
      autoInit: config.autoInit !== false,
      modules: {
        dataManager: config.modules?.dataManager !== false,
        chartRenderer: config.modules?.chartRenderer !== false,
        streaming: config.modules?.streaming !== false,
        customization: config.modules?.customization !== false,
        themes: config.modules?.themes !== false
      },
      ...config
    };

    // 모듈 인스턴스
    this.modules = {
      dataManager: null,
      chartRenderer: null,
      chartTypeManager: null,
      streamManager: null,
      streamingUpdater: null,
      customizationManager: null,
      themeManager: null
    };

    // 애플리케이션 상태
    this.state = {
      initialized: false,
      ready: false,
      currentUser: null,
      activeLayout: null,
      loadedCharts: new Map(),
      activeStreams: new Map(),
      systemStatus: 'starting'
    };

    // 성능 메트릭
    this.metrics = {
      startTime: Date.now(),
      initTime: 0,
      totalCharts: 0,
      activeCharts: 0,
      dataUpdates: 0,
      errors: 0,
      memoryUsage: 0
    };

    // 이벤트 핸들러
    this.eventHandlers = new Map();

    if (this.config.autoInit) {
      this.init();
    }
  }

  /**
   * 애플리케이션 초기화
   */
  async init() {
    const initStartTime = performance.now();
    
    try {
      console.log(`${this.config.appName} v${this.config.version} 초기화 시작...`);
      
      this.state.systemStatus = 'initializing';
      this.emit('initStart');
      
      // 1. 핵심 모듈 초기화
      await this.initCoreModules();
      
      // 2. 모듈 간 연결 설정
      await this.setupModuleConnections();
      
      // 3. 이벤트 리스너 설정
      this.setupEventListeners();
      
      // 4. 시스템 상태 확인
      await this.performSystemCheck();
      
      // 5. 초기화 완료
      this.state.initialized = true;
      this.state.ready = true;
      this.state.systemStatus = 'ready';
      this.metrics.initTime = performance.now() - initStartTime;
      
      console.log(`${this.config.appName} 초기화 완료 (${this.metrics.initTime.toFixed(2)}ms)`);
      this.emit('initComplete', { initTime: this.metrics.initTime });
      
      return true;
      
    } catch (error) {
      console.error('애플리케이션 초기화 실패:', error);
      this.state.systemStatus = 'error';
      this.metrics.errors++;
      this.emit('initError', { error });
      throw error;
    }
  }

  /**
   * 핵심 모듈 초기화
   */
  async initCoreModules() {
    console.log('핵심 모듈 초기화 중...');
    
    // 1. 데이터 매니저 초기화
    if (this.config.modules.dataManager) {
      console.log('UnifiedDataManager 초기화...');
      this.modules.dataManager = new UnifiedDataManager(this.config.dataManager);
      await this.modules.dataManager.init();
    }

    // 2. 차트 렌더러 초기화
    if (this.config.modules.chartRenderer) {
      console.log('MCPChartRenderer 초기화...');
      this.modules.chartRenderer = new MCPChartRenderer(this.config.chartRenderer);
      await this.modules.chartRenderer.init();
      
      console.log('ChartTypeManager 초기화...');
      this.modules.chartTypeManager = new ChartTypeManager();
    }

    // 3. 스트리밍 시스템 초기화
    if (this.config.modules.streaming) {
      console.log('DataStreamManager 초기화...');
      this.modules.streamManager = new DataStreamManager(this.config.streaming);
      await this.modules.streamManager.init();
      
      console.log('StreamingChartUpdater 초기화...');
      this.modules.streamingUpdater = new StreamingChartUpdater(this.config.streamingUpdater);
      await this.modules.streamingUpdater.init();
    }

    // 4. 사용자 커스터마이징 초기화
    if (this.config.modules.customization) {
      console.log('UserCustomizationManager 초기화...');
      this.modules.customizationManager = new UserCustomizationManager(this.config.customization);
      await this.modules.customizationManager.init();
    }

    // 5. 테마 매니저 초기화
    if (this.config.modules.themes) {
      console.log('ThemeManager 초기화...');
      this.modules.themeManager = new ThemeManager(this.config.themes);
    }

    console.log('핵심 모듈 초기화 완료');
  }

  /**
   * 모듈 간 연결 설정
   */
  async setupModuleConnections() {
    console.log('모듈 간 연결 설정 중...');
    
    // 데이터 매니저 - 차트 렌더러 연결
    if (this.modules.dataManager && this.modules.chartRenderer) {
      this.modules.dataManager.on('dataLoaded', async (data) => {
        this.emit('dataAvailable', data);
      });
    }

    // 스트리밍 - 차트 업데이터 연결
    if (this.modules.streamManager && this.modules.streamingUpdater) {
      this.modules.streamManager.on('streamData', (data) => {
        this.modules.streamingUpdater.onStreamData(data.chartId, data.data, data.timestamp);
      });
    }

    // 사용자 커스터마이징 - 테마 매니저 연결
    if (this.modules.customizationManager && this.modules.themeManager) {
      this.modules.customizationManager.on('themeUpdated', (data) => {
        this.modules.themeManager.setActiveTheme(data.themeId);
      });
    }

    console.log('모듈 간 연결 설정 완료');
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    console.log('이벤트 리스너 설정 중...');
    
    // 각 모듈의 이벤트를 중앙에서 관리
    Object.entries(this.modules).forEach(([moduleName, module]) => {
      if (module && module.on) {
        module.on('error', (error) => {
          console.error(`모듈 오류 [${moduleName}]:`, error);
          this.metrics.errors++;
          this.emit('moduleError', { module: moduleName, error });
        });
      }
    });

    console.log('이벤트 리스너 설정 완료');
  }

  /**
   * 시스템 상태 확인
   */
  async performSystemCheck() {
    console.log('시스템 상태 확인 중...');
    
    const healthCheck = {
      dataManager: this.modules.dataManager ? await this.checkModuleHealth('dataManager') : null,
      chartRenderer: this.modules.chartRenderer ? await this.checkModuleHealth('chartRenderer') : null,
      streamManager: this.modules.streamManager ? await this.checkModuleHealth('streamManager') : null,
      customizationManager: this.modules.customizationManager ? await this.checkModuleHealth('customizationManager') : null,
      themeManager: this.modules.themeManager ? await this.checkModuleHealth('themeManager') : null
    };

    const allHealthy = Object.values(healthCheck).every(health => 
      health === null || health.status === 'healthy'
    );

    if (!allHealthy) {
      console.warn('일부 모듈이 정상적으로 동작하지 않습니다:', healthCheck);
    }

    console.log('시스템 상태 확인 완료');
    this.emit('systemHealthCheck', { healthCheck, allHealthy });
    
    return allHealthy;
  }

  /**
   * 모듈 헬스 체크
   */
  async checkModuleHealth(moduleName) {
    try {
      const module = this.modules[moduleName];
      
      if (!module) {
        return { status: 'unavailable', message: '모듈이 로드되지 않았습니다' };
      }

      // 모듈별 헬스 체크
      switch (moduleName) {
        case 'dataManager':
          const dataStats = module.getStats();
          return { 
            status: 'healthy', 
            stats: dataStats,
            message: `데이터 소스 ${dataStats.dataSources} 활성`
          };
          
        case 'chartRenderer':
          const chartMetrics = module.getMetrics();
          return { 
            status: chartMetrics.mcpServerConnected ? 'healthy' : 'warning', 
            stats: chartMetrics,
            message: `차트 렌더링 성공률 ${chartMetrics.successRate.toFixed(1)}%`
          };
          
        case 'streamManager':
          const streamStats = module.getStats();
          return { 
            status: 'healthy', 
            stats: streamStats,
            message: `활성 스트림 ${streamStats.activeStreams}`
          };
          
        case 'customizationManager':
          const customStats = module.getStats();
          return { 
            status: 'healthy', 
            stats: customStats,
            message: `사용자 ${customStats.totalUsers} 활성`
          };
          
        case 'themeManager':
          const themeStats = module.getStats();
          return { 
            status: 'healthy', 
            stats: themeStats,
            message: `테마 ${themeStats.totalThemes} 사용 가능`
          };
          
        default:
          return { status: 'unknown', message: '알 수 없는 모듈' };
      }
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * 사용자 로그인
   */
  async loginUser(userId, userProfile = {}) {
    try {
      if (!this.state.ready) {
        throw new Error('애플리케이션이 준비되지 않았습니다');
      }

      // 사용자 커스터마이징 매니저를 통한 로그인
      if (this.modules.customizationManager) {
        const user = await this.modules.customizationManager.loginUser(userId, userProfile);
        this.state.currentUser = userId;
        
        // 사용자 환경설정 적용
        await this.applyUserSettings(userId);
        
        console.log(`사용자 로그인 성공: ${userId}`);
        this.emit('userLogin', { userId, user });
        
        return user;
      }
      
      throw new Error('사용자 커스터마이징 매니저가 초기화되지 않았습니다');
      
    } catch (error) {
      console.error('사용자 로그인 실패:', error);
      this.metrics.errors++;
      this.emit('userLoginError', { userId, error });
      throw error;
    }
  }

  /**
   * 사용자 로그아웃
   */
  async logoutUser(userId = null) {
    try {
      const targetUserId = userId || this.state.currentUser;
      
      if (!targetUserId) {
        return false;
      }

      // 사용자 커스터마이징 매니저를 통한 로그아웃
      if (this.modules.customizationManager) {
        await this.modules.customizationManager.logoutUser(targetUserId);
      }

      // 사용자 관련 상태 초기화
      if (this.state.currentUser === targetUserId) {
        this.state.currentUser = null;
        this.state.activeLayout = null;
      }

      console.log(`사용자 로그아웃 성공: ${targetUserId}`);
      this.emit('userLogout', { userId: targetUserId });
      
      return true;
      
    } catch (error) {
      console.error('사용자 로그아웃 실패:', error);
      this.metrics.errors++;
      this.emit('userLogoutError', { userId, error });
      throw error;
    }
  }

  /**
   * 사용자 환경설정 적용
   */
  async applyUserSettings(userId) {
    try {
      if (!this.modules.customizationManager) {
        return;
      }

      const preferences = this.modules.customizationManager.getUserPreferences(userId);
      
      if (preferences) {
        // 테마 적용
        if (preferences.theme && this.modules.themeManager) {
          this.modules.themeManager.setActiveTheme(preferences.theme.id);
        }

        // 기타 환경설정 적용
        console.log(`사용자 환경설정 적용: ${userId}`);
        this.emit('userSettingsApplied', { userId, preferences });
      }
      
    } catch (error) {
      console.error('사용자 환경설정 적용 실패:', error);
      this.metrics.errors++;
    }
  }

  /**
   * 차트 생성
   */
  async createChart(chartId, config) {
    try {
      if (!this.modules.chartRenderer) {
        throw new Error('차트 렌더러가 초기화되지 않았습니다');
      }

      // 사용자 커스터마이징 적용
      if (this.state.currentUser && this.modules.customizationManager) {
        const customization = this.modules.customizationManager.getUserChartCustomization(
          this.state.currentUser, 
          chartId
        );
        
        if (customization) {
          config = { ...config, ...customization };
        }
      }

      // 테마 적용
      if (this.modules.themeManager) {
        config = await this.modules.themeManager.applyTheme(config);
      }

      // 차트 렌더링
      const result = await this.modules.chartRenderer.renderChart(config);
      
      if (result.isSuccess()) {
        this.state.loadedCharts.set(chartId, {
          config,
          result,
          createdAt: Date.now()
        });
        
        this.metrics.totalCharts++;
        this.metrics.activeCharts++;
        
        console.log(`차트 생성 성공: ${chartId}`);
        this.emit('chartCreated', { chartId, config, result });
        
        return result;
      } else {
        throw new Error(result.error || '차트 렌더링 실패');
      }
      
    } catch (error) {
      console.error(`차트 생성 실패 [${chartId}]:`, error);
      this.metrics.errors++;
      this.emit('chartCreationError', { chartId, config, error });
      throw error;
    }
  }

  /**
   * 차트 업데이트
   */
  async updateChart(chartId, newConfig) {
    try {
      const chartData = this.state.loadedCharts.get(chartId);
      
      if (!chartData) {
        throw new Error(`차트를 찾을 수 없습니다: ${chartId}`);
      }

      const updatedConfig = { ...chartData.config, ...newConfig };
      const result = await this.createChart(chartId, updatedConfig);
      
      console.log(`차트 업데이트 성공: ${chartId}`);
      this.emit('chartUpdated', { chartId, config: updatedConfig, result });
      
      return result;
      
    } catch (error) {
      console.error(`차트 업데이트 실패 [${chartId}]:`, error);
      this.metrics.errors++;
      this.emit('chartUpdateError', { chartId, config: newConfig, error });
      throw error;
    }
  }

  /**
   * 차트 삭제
   */
  async deleteChart(chartId) {
    try {
      const chartData = this.state.loadedCharts.get(chartId);
      
      if (!chartData) {
        return false;
      }

      // 스트리밍 차트 업데이터에서 해제
      if (this.modules.streamingUpdater) {
        this.modules.streamingUpdater.unregisterChart(chartId);
      }

      // 차트 데이터 제거
      this.state.loadedCharts.delete(chartId);
      this.metrics.activeCharts--;
      
      console.log(`차트 삭제 성공: ${chartId}`);
      this.emit('chartDeleted', { chartId });
      
      return true;
      
    } catch (error) {
      console.error(`차트 삭제 실패 [${chartId}]:`, error);
      this.metrics.errors++;
      this.emit('chartDeleteError', { chartId, error });
      throw error;
    }
  }

  /**
   * 실시간 차트 활성화
   */
  async enableRealtimeChart(chartId, chartInstance, streamId, channel) {
    try {
      if (!this.modules.streamManager || !this.modules.streamingUpdater) {
        throw new Error('스트리밍 모듈이 초기화되지 않았습니다');
      }

      // 차트 업데이터에 등록
      this.modules.streamingUpdater.registerChart(chartId, chartInstance);
      
      // 스트림 구독
      await this.modules.streamManager.subscribe(streamId, channel, (data, timestamp) => {
        this.modules.streamingUpdater.onStreamData(chartId, data, timestamp);
      });

      this.state.activeStreams.set(chartId, { streamId, channel });
      
      console.log(`실시간 차트 활성화: ${chartId}`);
      this.emit('realtimeChartEnabled', { chartId, streamId, channel });
      
      return true;
      
    } catch (error) {
      console.error(`실시간 차트 활성화 실패 [${chartId}]:`, error);
      this.metrics.errors++;
      this.emit('realtimeChartError', { chartId, streamId, channel, error });
      throw error;
    }
  }

  /**
   * 실시간 차트 비활성화
   */
  async disableRealtimeChart(chartId) {
    try {
      const streamInfo = this.state.activeStreams.get(chartId);
      
      if (!streamInfo) {
        return false;
      }

      // 스트림 구독 해제
      if (this.modules.streamManager) {
        await this.modules.streamManager.unsubscribe(streamInfo.streamId, streamInfo.channel);
      }

      // 차트 업데이터에서 해제
      if (this.modules.streamingUpdater) {
        this.modules.streamingUpdater.unregisterChart(chartId);
      }

      this.state.activeStreams.delete(chartId);
      
      console.log(`실시간 차트 비활성화: ${chartId}`);
      this.emit('realtimeChartDisabled', { chartId });
      
      return true;
      
    } catch (error) {
      console.error(`실시간 차트 비활성화 실패 [${chartId}]:`, error);
      this.metrics.errors++;
      this.emit('realtimeChartDisableError', { chartId, error });
      throw error;
    }
  }

  /**
   * 데이터 로드
   */
  async loadData(source, options = {}) {
    try {
      if (!this.modules.dataManager) {
        throw new Error('데이터 매니저가 초기화되지 않았습니다');
      }

      const data = await this.modules.dataManager.loadData(source, options);
      
      this.metrics.dataUpdates++;
      this.emit('dataLoaded', { source, data, options });
      
      return data;
      
    } catch (error) {
      console.error(`데이터 로드 실패 [${source}]:`, error);
      this.metrics.errors++;
      this.emit('dataLoadError', { source, options, error });
      throw error;
    }
  }

  /**
   * 레이아웃 적용
   */
  async applyLayout(layoutId, userId = null) {
    try {
      const targetUserId = userId || this.state.currentUser;
      
      if (!targetUserId || !this.modules.customizationManager) {
        throw new Error('사용자 정보나 커스터마이징 매니저가 없습니다');
      }

      const layout = this.modules.customizationManager.getUserLayout(targetUserId, layoutId);
      
      if (!layout) {
        throw new Error(`레이아웃을 찾을 수 없습니다: ${layoutId}`);
      }

      this.state.activeLayout = layoutId;
      
      console.log(`레이아웃 적용: ${layoutId}`);
      this.emit('layoutApplied', { layoutId, layout, userId: targetUserId });
      
      return layout;
      
    } catch (error) {
      console.error(`레이아웃 적용 실패 [${layoutId}]:`, error);
      this.metrics.errors++;
      this.emit('layoutApplyError', { layoutId, userId, error });
      throw error;
    }
  }

  /**
   * 시스템 상태 조회
   */
  getSystemStatus() {
    return {
      state: this.state,
      metrics: {
        ...this.metrics,
        uptime: Date.now() - this.metrics.startTime,
        memoryUsage: this.estimateMemoryUsage()
      },
      modules: Object.keys(this.modules).reduce((status, name) => {
        status[name] = this.modules[name] ? 'loaded' : 'not_loaded';
        return status;
      }, {})
    };
  }

  /**
   * 메모리 사용량 추정
   */
  estimateMemoryUsage() {
    // 간단한 메모리 사용량 추정
    let usage = 0;
    
    usage += this.state.loadedCharts.size * 1024; // 차트당 1KB 추정
    usage += this.state.activeStreams.size * 512; // 스트림당 512B 추정
    
    return usage;
  }

  /**
   * 성능 메트릭 조회
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.metrics.startTime,
      memoryUsage: this.estimateMemoryUsage(),
      moduleMetrics: Object.entries(this.modules).reduce((metrics, [name, module]) => {
        if (module && module.getMetrics) {
          metrics[name] = module.getMetrics();
        }
        return metrics;
      }, {})
    };
  }

  /**
   * 시스템 리셋
   */
  async resetSystem() {
    try {
      console.log('시스템 리셋 시작...');
      
      // 모든 차트 삭제
      const chartIds = Array.from(this.state.loadedCharts.keys());
      for (const chartId of chartIds) {
        await this.deleteChart(chartId);
      }

      // 모든 스트림 비활성화
      const streamChartIds = Array.from(this.state.activeStreams.keys());
      for (const chartId of streamChartIds) {
        await this.disableRealtimeChart(chartId);
      }

      // 상태 초기화
      this.state.activeLayout = null;
      this.metrics.totalCharts = 0;
      this.metrics.activeCharts = 0;
      this.metrics.dataUpdates = 0;
      this.metrics.errors = 0;
      
      console.log('시스템 리셋 완료');
      this.emit('systemReset');
      
      return true;
      
    } catch (error) {
      console.error('시스템 리셋 실패:', error);
      this.metrics.errors++;
      this.emit('systemResetError', { error });
      throw error;
    }
  }

  /**
   * 애플리케이션 종료
   */
  async destroy() {
    try {
      console.log('애플리케이션 종료 시작...');
      
      // 시스템 리셋
      await this.resetSystem();
      
      // 모든 모듈 정리
      for (const [moduleName, module] of Object.entries(this.modules)) {
        if (module && module.destroy) {
          try {
            await module.destroy();
            console.log(`모듈 정리 완료: ${moduleName}`);
          } catch (error) {
            console.error(`모듈 정리 실패 [${moduleName}]:`, error);
          }
        }
      }
      
      // 이벤트 리스너 제거
      this.removeAllListeners();
      
      // 상태 초기화
      this.state.initialized = false;
      this.state.ready = false;
      this.state.systemStatus = 'destroyed';
      
      console.log('애플리케이션 종료 완료');
      
    } catch (error) {
      console.error('애플리케이션 종료 실패:', error);
      throw error;
    }
  }
}

/**
 * 애플리케이션 팩토리
 */
export class DashboardAppFactory {
  static create(config = {}) {
    return new DashboardApp(config);
  }
  
  static createWithDefaults(overrides = {}) {
    const defaultConfig = {
      environment: 'production',
      debug: false,
      modules: {
        dataManager: true,
        chartRenderer: true,
        streaming: true,
        customization: true,
        themes: true
      },
      dataManager: {
        cacheEnabled: true,
        cacheTTL: 300000,
        maxCacheSize: 100
      },
      chartRenderer: {
        mcpServerUrl: 'http://localhost:3000',
        timeout: 30000,
        retries: 3,
        enableFallback: true
      },
      streaming: {
        maxStreams: 10,
        defaultStreamConfig: {
          reconnectInterval: 3000,
          maxReconnectAttempts: 5
        }
      },
      customization: {
        storageType: 'localStorage',
        autoSave: true,
        versionControl: true
      },
      themes: {
        // 테마 설정
      }
    };
    
    const mergedConfig = this.deepMerge(defaultConfig, overrides);
    return new DashboardApp(mergedConfig);
  }
  
  static deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  }
}

export default DashboardApp;