/**
 * 사용자 커스터마이징 매니저
 * 사용자별 대시보드 레이아웃, 차트 설정, 테마 등을 관리
 */

import { EventEmitter } from '../core/utils/EventEmitter.js';

export class UserCustomizationManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      storageType: config.storageType || 'localStorage', // localStorage, sessionStorage, indexedDB
      autoSave: config.autoSave !== false,
      autoSaveInterval: config.autoSaveInterval || 5000,
      versionControl: config.versionControl !== false,
      maxVersions: config.maxVersions || 10,
      enableSharing: config.enableSharing !== false,
      compressionEnabled: config.compressionEnabled !== false,
      ...config
    };

    this.users = new Map();
    this.customizations = new Map();
    this.templates = new Map();
    this.preferences = new Map();
    this.layouts = new Map();
    this.currentUser = null;
    this.autoSaveTimer = null;
    
    // 사용자 정의 컴포넌트 레지스트리
    this.customComponents = new Map();
    this.customWidgets = new Map();
    this.customCharts = new Map();
    
    // 버전 관리
    this.versionHistory = new Map();
    
    // 공유 및 협업
    this.sharedConfigs = new Map();
    this.collaborators = new Map();

    this.init();
  }

  /**
   * 초기화
   */
  async init() {
    try {
      console.log('UserCustomizationManager 초기화 중...');
      
      // 저장소 초기화
      await this.initializeStorage();
      
      // 기본 템플릿 설정
      this.setupDefaultTemplates();
      
      // 기본 컴포넌트 등록
      this.registerDefaultComponents();
      
      // 자동 저장 설정
      if (this.config.autoSave) {
        this.setupAutoSave();
      }
      
      console.log('UserCustomizationManager 초기화 완료');
      
    } catch (error) {
      console.error('UserCustomizationManager 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 저장소 초기화
   */
  async initializeStorage() {
    try {
      switch (this.config.storageType) {
        case 'localStorage':
          await this.initLocalStorage();
          break;
        case 'sessionStorage':
          await this.initSessionStorage();
          break;
        case 'indexedDB':
          await this.initIndexedDB();
          break;
        default:
          throw new Error(`지원하지 않는 저장소 타입: ${this.config.storageType}`);
      }
    } catch (error) {
      console.error('저장소 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 등록/로그인
   */
  async loginUser(userId, userProfile = {}) {
    try {
      // 사용자 정보 설정
      const user = {
        id: userId,
        profile: userProfile,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        ...userProfile
      };

      this.users.set(userId, user);
      this.currentUser = userId;
      
      // 사용자 커스터마이징 데이터 로드
      await this.loadUserCustomizations(userId);
      
      console.log(`사용자 로그인: ${userId}`);
      this.emit('userLogin', { userId, user });
      
      return user;
      
    } catch (error) {
      console.error('사용자 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 로그아웃
   */
  async logoutUser(userId = null) {
    const targetUserId = userId || this.currentUser;
    
    if (!targetUserId) {
      return false;
    }

    try {
      // 자동 저장 중지
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
      
      // 사용자 커스터마이징 데이터 저장
      await this.saveUserCustomizations(targetUserId);
      
      // 사용자 정보 정리
      this.users.delete(targetUserId);
      
      if (this.currentUser === targetUserId) {
        this.currentUser = null;
      }
      
      console.log(`사용자 로그아웃: ${targetUserId}`);
      this.emit('userLogout', { userId: targetUserId });
      
      return true;
      
    } catch (error) {
      console.error('사용자 로그아웃 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 커스터마이징 데이터 로드
   */
  async loadUserCustomizations(userId) {
    try {
      const data = await this.loadFromStorage(`user_${userId}`);
      
      if (data) {
        this.customizations.set(userId, data.customizations || {});
        this.preferences.set(userId, data.preferences || {});
        this.layouts.set(userId, data.layouts || {});
        
        if (this.config.versionControl) {
          this.versionHistory.set(userId, data.versionHistory || []);
        }
      } else {
        // 기본 설정 적용
        this.customizations.set(userId, {});
        this.preferences.set(userId, this.getDefaultPreferences());
        this.layouts.set(userId, this.getDefaultLayout());
      }
      
      console.log(`사용자 커스터마이징 데이터 로드: ${userId}`);
      return true;
      
    } catch (error) {
      console.error('사용자 커스터마이징 데이터 로드 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 커스터마이징 데이터 저장
   */
  async saveUserCustomizations(userId) {
    try {
      const data = {
        customizations: this.customizations.get(userId) || {},
        preferences: this.preferences.get(userId) || {},
        layouts: this.layouts.get(userId) || {},
        lastSaved: Date.now()
      };

      if (this.config.versionControl) {
        data.versionHistory = this.versionHistory.get(userId) || [];
      }

      await this.saveToStorage(`user_${userId}`, data);
      
      console.log(`사용자 커스터마이징 데이터 저장: ${userId}`);
      this.emit('userCustomizationsSaved', { userId });
      
      return true;
      
    } catch (error) {
      console.error('사용자 커스터마이징 데이터 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 환경설정 업데이트
   */
  async updateUserPreferences(userId, preferences) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const currentPreferences = this.preferences.get(userId) || {};
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      this.preferences.set(userId, updatedPreferences);
      
      // 버전 관리
      if (this.config.versionControl) {
        this.createVersion(userId, 'preferences', updatedPreferences);
      }
      
      // 자동 저장이 비활성화된 경우 수동 저장
      if (!this.config.autoSave) {
        await this.saveUserCustomizations(userId);
      }
      
      console.log(`사용자 환경설정 업데이트: ${userId}`);
      this.emit('preferencesUpdated', { userId, preferences: updatedPreferences });
      
      return updatedPreferences;
      
    } catch (error) {
      console.error('사용자 환경설정 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 레이아웃 업데이트
   */
  async updateUserLayout(userId, layoutId, layout) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const userLayouts = this.layouts.get(userId) || {};
      userLayouts[layoutId] = {
        ...layout,
        id: layoutId,
        updatedAt: Date.now()
      };
      
      this.layouts.set(userId, userLayouts);
      
      // 버전 관리
      if (this.config.versionControl) {
        this.createVersion(userId, 'layout', { layoutId, layout });
      }
      
      // 자동 저장이 비활성화된 경우 수동 저장
      if (!this.config.autoSave) {
        await this.saveUserCustomizations(userId);
      }
      
      console.log(`사용자 레이아웃 업데이트: ${userId}:${layoutId}`);
      this.emit('layoutUpdated', { userId, layoutId, layout });
      
      return userLayouts[layoutId];
      
    } catch (error) {
      console.error('사용자 레이아웃 업데이트 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 차트 커스터마이징
   */
  async updateChartCustomization(userId, chartId, customization) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const userCustomizations = this.customizations.get(userId) || {};
      
      if (!userCustomizations.charts) {
        userCustomizations.charts = {};
      }
      
      userCustomizations.charts[chartId] = {
        ...customization,
        id: chartId,
        updatedAt: Date.now()
      };
      
      this.customizations.set(userId, userCustomizations);
      
      // 버전 관리
      if (this.config.versionControl) {
        this.createVersion(userId, 'chart', { chartId, customization });
      }
      
      // 자동 저장이 비활성화된 경우 수동 저장
      if (!this.config.autoSave) {
        await this.saveUserCustomizations(userId);
      }
      
      console.log(`사용자 차트 커스터마이징: ${userId}:${chartId}`);
      this.emit('chartCustomizationUpdated', { userId, chartId, customization });
      
      return userCustomizations.charts[chartId];
      
    } catch (error) {
      console.error('사용자 차트 커스터마이징 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 위젯 커스터마이징
   */
  async updateWidgetCustomization(userId, widgetId, customization) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const userCustomizations = this.customizations.get(userId) || {};
      
      if (!userCustomizations.widgets) {
        userCustomizations.widgets = {};
      }
      
      userCustomizations.widgets[widgetId] = {
        ...customization,
        id: widgetId,
        updatedAt: Date.now()
      };
      
      this.customizations.set(userId, userCustomizations);
      
      // 버전 관리
      if (this.config.versionControl) {
        this.createVersion(userId, 'widget', { widgetId, customization });
      }
      
      // 자동 저장이 비활성화된 경우 수동 저장
      if (!this.config.autoSave) {
        await this.saveUserCustomizations(userId);
      }
      
      console.log(`사용자 위젯 커스터마이징: ${userId}:${widgetId}`);
      this.emit('widgetCustomizationUpdated', { userId, widgetId, customization });
      
      return userCustomizations.widgets[widgetId];
      
    } catch (error) {
      console.error('사용자 위젯 커스터마이징 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 테마 설정
   */
  async updateUserTheme(userId, themeId, customTheme = null) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const preferences = this.preferences.get(userId) || {};
      
      preferences.theme = {
        id: themeId,
        custom: customTheme,
        appliedAt: Date.now()
      };
      
      this.preferences.set(userId, preferences);
      
      // 버전 관리
      if (this.config.versionControl) {
        this.createVersion(userId, 'theme', { themeId, customTheme });
      }
      
      // 자동 저장이 비활성화된 경우 수동 저장
      if (!this.config.autoSave) {
        await this.saveUserCustomizations(userId);
      }
      
      console.log(`사용자 테마 설정: ${userId}:${themeId}`);
      this.emit('themeUpdated', { userId, themeId, customTheme });
      
      return preferences.theme;
      
    } catch (error) {
      console.error('사용자 테마 설정 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 커스터마이징 조회
   */
  getUserCustomizations(userId) {
    if (!this.users.has(userId)) {
      return null;
    }

    return {
      customizations: this.customizations.get(userId) || {},
      preferences: this.preferences.get(userId) || {},
      layouts: this.layouts.get(userId) || {}
    };
  }

  /**
   * 사용자 환경설정 조회
   */
  getUserPreferences(userId) {
    if (!this.users.has(userId)) {
      return null;
    }

    return this.preferences.get(userId) || {};
  }

  /**
   * 사용자 레이아웃 조회
   */
  getUserLayouts(userId) {
    if (!this.users.has(userId)) {
      return null;
    }

    return this.layouts.get(userId) || {};
  }

  /**
   * 특정 레이아웃 조회
   */
  getUserLayout(userId, layoutId) {
    const userLayouts = this.getUserLayouts(userId);
    
    if (!userLayouts) {
      return null;
    }

    return userLayouts[layoutId] || null;
  }

  /**
   * 사용자 차트 커스터마이징 조회
   */
  getUserChartCustomizations(userId) {
    const customizations = this.customizations.get(userId) || {};
    return customizations.charts || {};
  }

  /**
   * 특정 차트 커스터마이징 조회
   */
  getUserChartCustomization(userId, chartId) {
    const chartCustomizations = this.getUserChartCustomizations(userId);
    return chartCustomizations[chartId] || null;
  }

  /**
   * 사용자 위젯 커스터마이징 조회
   */
  getUserWidgetCustomizations(userId) {
    const customizations = this.customizations.get(userId) || {};
    return customizations.widgets || {};
  }

  /**
   * 특정 위젯 커스터마이징 조회
   */
  getUserWidgetCustomization(userId, widgetId) {
    const widgetCustomizations = this.getUserWidgetCustomizations(userId);
    return widgetCustomizations[widgetId] || null;
  }

  /**
   * 템플릿 생성
   */
  async createTemplate(templateId, templateData, metadata = {}) {
    try {
      const template = {
        id: templateId,
        data: templateData,
        metadata: {
          name: metadata.name || templateId,
          description: metadata.description || '',
          category: metadata.category || 'custom',
          tags: metadata.tags || [],
          createdAt: Date.now(),
          createdBy: this.currentUser,
          ...metadata
        }
      };

      this.templates.set(templateId, template);
      
      // 저장소에 저장
      await this.saveToStorage(`template_${templateId}`, template);
      
      console.log(`템플릿 생성: ${templateId}`);
      this.emit('templateCreated', { templateId, template });
      
      return template;
      
    } catch (error) {
      console.error('템플릿 생성 실패:', error);
      throw error;
    }
  }

  /**
   * 템플릿 적용
   */
  async applyTemplate(userId, templateId, targetType = 'layout') {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    const template = this.templates.get(templateId);
    
    if (!template) {
      throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`);
    }

    try {
      switch (targetType) {
        case 'layout':
          await this.updateUserLayout(userId, `template_${templateId}`, template.data);
          break;
        case 'preferences':
          await this.updateUserPreferences(userId, template.data);
          break;
        case 'chart':
          if (template.data.chartId) {
            await this.updateChartCustomization(userId, template.data.chartId, template.data);
          }
          break;
        case 'widget':
          if (template.data.widgetId) {
            await this.updateWidgetCustomization(userId, template.data.widgetId, template.data);
          }
          break;
        default:
          throw new Error(`지원하지 않는 타겟 타입: ${targetType}`);
      }
      
      console.log(`템플릿 적용: ${userId}:${templateId}:${targetType}`);
      this.emit('templateApplied', { userId, templateId, targetType });
      
      return true;
      
    } catch (error) {
      console.error('템플릿 적용 실패:', error);
      throw error;
    }
  }

  /**
   * 템플릿 목록 조회
   */
  getTemplates(category = null) {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(template => template.metadata.category === category);
    }
    
    return templates;
  }

  /**
   * 커스터마이징 공유
   */
  async shareCustomization(userId, shareId, customizationType, customizationId, permissions = {}) {
    if (!this.users.has(userId) || !this.config.enableSharing) {
      throw new Error('공유 기능을 사용할 수 없습니다');
    }

    try {
      let sharedData;
      
      switch (customizationType) {
        case 'layout':
          sharedData = this.getUserLayout(userId, customizationId);
          break;
        case 'chart':
          sharedData = this.getUserChartCustomization(userId, customizationId);
          break;
        case 'widget':
          sharedData = this.getUserWidgetCustomization(userId, customizationId);
          break;
        case 'preferences':
          sharedData = this.getUserPreferences(userId);
          break;
        default:
          throw new Error(`지원하지 않는 커스터마이징 타입: ${customizationType}`);
      }

      if (!sharedData) {
        throw new Error('공유할 데이터를 찾을 수 없습니다');
      }

      const sharedConfig = {
        id: shareId,
        type: customizationType,
        customizationId,
        data: sharedData,
        owner: userId,
        permissions: {
          read: permissions.read !== false,
          edit: permissions.edit || false,
          share: permissions.share || false,
          ...permissions
        },
        createdAt: Date.now(),
        accessCount: 0,
        lastAccessed: null
      };

      this.sharedConfigs.set(shareId, sharedConfig);
      
      // 저장소에 저장
      await this.saveToStorage(`shared_${shareId}`, sharedConfig);
      
      console.log(`커스터마이징 공유: ${shareId}`);
      this.emit('customizationShared', { shareId, sharedConfig });
      
      return sharedConfig;
      
    } catch (error) {
      console.error('커스터마이징 공유 실패:', error);
      throw error;
    }
  }

  /**
   * 공유된 커스터마이징 접근
   */
  async accessSharedCustomization(shareId, userId = null) {
    const sharedConfig = this.sharedConfigs.get(shareId);
    
    if (!sharedConfig) {
      throw new Error(`공유된 커스터마이징을 찾을 수 없습니다: ${shareId}`);
    }

    if (!sharedConfig.permissions.read) {
      throw new Error('읽기 권한이 없습니다');
    }

    try {
      // 접근 기록 업데이트
      sharedConfig.accessCount++;
      sharedConfig.lastAccessed = Date.now();
      
      if (userId) {
        if (!sharedConfig.accessHistory) {
          sharedConfig.accessHistory = [];
        }
        sharedConfig.accessHistory.push({
          userId,
          timestamp: Date.now()
        });
      }
      
      console.log(`공유된 커스터마이징 접근: ${shareId}`);
      this.emit('sharedCustomizationAccessed', { shareId, userId });
      
      return sharedConfig;
      
    } catch (error) {
      console.error('공유된 커스터마이징 접근 실패:', error);
      throw error;
    }
  }

  /**
   * 공유된 커스터마이징 적용
   */
  async applySharedCustomization(shareId, userId, targetId = null) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    const sharedConfig = await this.accessSharedCustomization(shareId, userId);
    
    try {
      switch (sharedConfig.type) {
        case 'layout':
          await this.updateUserLayout(userId, targetId || `shared_${shareId}`, sharedConfig.data);
          break;
        case 'chart':
          await this.updateChartCustomization(userId, targetId || sharedConfig.customizationId, sharedConfig.data);
          break;
        case 'widget':
          await this.updateWidgetCustomization(userId, targetId || sharedConfig.customizationId, sharedConfig.data);
          break;
        case 'preferences':
          await this.updateUserPreferences(userId, sharedConfig.data);
          break;
        default:
          throw new Error(`지원하지 않는 공유 타입: ${sharedConfig.type}`);
      }
      
      console.log(`공유된 커스터마이징 적용: ${shareId}:${userId}`);
      this.emit('sharedCustomizationApplied', { shareId, userId, targetId });
      
      return true;
      
    } catch (error) {
      console.error('공유된 커스터마이징 적용 실패:', error);
      throw error;
    }
  }

  /**
   * 버전 생성
   */
  createVersion(userId, type, data) {
    if (!this.config.versionControl) {
      return;
    }

    const userVersions = this.versionHistory.get(userId) || [];
    
    const version = {
      id: this.generateVersionId(),
      type,
      data,
      timestamp: Date.now(),
      description: `${type} 변경`
    };

    userVersions.push(version);
    
    // 최대 버전 수 제한
    if (userVersions.length > this.config.maxVersions) {
      userVersions.shift();
    }
    
    this.versionHistory.set(userId, userVersions);
    
    console.log(`버전 생성: ${userId}:${version.id}`);
    this.emit('versionCreated', { userId, version });
  }

  /**
   * 버전 복원
   */
  async restoreVersion(userId, versionId) {
    if (!this.users.has(userId) || !this.config.versionControl) {
      throw new Error('버전 복원을 사용할 수 없습니다');
    }

    const userVersions = this.versionHistory.get(userId) || [];
    const version = userVersions.find(v => v.id === versionId);
    
    if (!version) {
      throw new Error(`버전을 찾을 수 없습니다: ${versionId}`);
    }

    try {
      switch (version.type) {
        case 'preferences':
          await this.updateUserPreferences(userId, version.data);
          break;
        case 'layout':
          await this.updateUserLayout(userId, version.data.layoutId, version.data.layout);
          break;
        case 'chart':
          await this.updateChartCustomization(userId, version.data.chartId, version.data.customization);
          break;
        case 'widget':
          await this.updateWidgetCustomization(userId, version.data.widgetId, version.data.customization);
          break;
        case 'theme':
          await this.updateUserTheme(userId, version.data.themeId, version.data.customTheme);
          break;
        default:
          throw new Error(`지원하지 않는 버전 타입: ${version.type}`);
      }
      
      console.log(`버전 복원: ${userId}:${versionId}`);
      this.emit('versionRestored', { userId, versionId, version });
      
      return true;
      
    } catch (error) {
      console.error('버전 복원 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 버전 히스토리 조회
   */
  getUserVersionHistory(userId) {
    if (!this.users.has(userId) || !this.config.versionControl) {
      return [];
    }

    return this.versionHistory.get(userId) || [];
  }

  /**
   * 사용자 정의 컴포넌트 등록
   */
  registerCustomComponent(componentId, component, metadata = {}) {
    const componentData = {
      id: componentId,
      component,
      metadata: {
        name: metadata.name || componentId,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        version: metadata.version || '1.0.0',
        author: metadata.author || this.currentUser,
        createdAt: Date.now(),
        ...metadata
      }
    };

    this.customComponents.set(componentId, componentData);
    
    console.log(`사용자 정의 컴포넌트 등록: ${componentId}`);
    this.emit('customComponentRegistered', { componentId, componentData });
    
    return componentData;
  }

  /**
   * 사용자 정의 위젯 등록
   */
  registerCustomWidget(widgetId, widget, metadata = {}) {
    const widgetData = {
      id: widgetId,
      widget,
      metadata: {
        name: metadata.name || widgetId,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        version: metadata.version || '1.0.0',
        author: metadata.author || this.currentUser,
        createdAt: Date.now(),
        ...metadata
      }
    };

    this.customWidgets.set(widgetId, widgetData);
    
    console.log(`사용자 정의 위젯 등록: ${widgetId}`);
    this.emit('customWidgetRegistered', { widgetId, widgetData });
    
    return widgetData;
  }

  /**
   * 사용자 정의 차트 등록
   */
  registerCustomChart(chartId, chart, metadata = {}) {
    const chartData = {
      id: chartId,
      chart,
      metadata: {
        name: metadata.name || chartId,
        description: metadata.description || '',
        category: metadata.category || 'custom',
        version: metadata.version || '1.0.0',
        author: metadata.author || this.currentUser,
        createdAt: Date.now(),
        ...metadata
      }
    };

    this.customCharts.set(chartId, chartData);
    
    console.log(`사용자 정의 차트 등록: ${chartId}`);
    this.emit('customChartRegistered', { chartId, chartData });
    
    return chartData;
  }

  /**
   * 커스터마이징 내보내기
   */
  async exportCustomizations(userId, options = {}) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      const exportData = {
        userId,
        timestamp: Date.now(),
        version: '1.0.0',
        data: {}
      };

      if (options.includePreferences !== false) {
        exportData.data.preferences = this.getUserPreferences(userId);
      }

      if (options.includeLayouts !== false) {
        exportData.data.layouts = this.getUserLayouts(userId);
      }

      if (options.includeCustomizations !== false) {
        exportData.data.customizations = this.customizations.get(userId) || {};
      }

      if (options.includeVersionHistory && this.config.versionControl) {
        exportData.data.versionHistory = this.getUserVersionHistory(userId);
      }

      // 압축 처리
      if (this.config.compressionEnabled) {
        exportData.compressed = true;
        exportData.data = await this.compressData(exportData.data);
      }

      console.log(`커스터마이징 내보내기: ${userId}`);
      this.emit('customizationsExported', { userId, exportData });
      
      return exportData;
      
    } catch (error) {
      console.error('커스터마이징 내보내기 실패:', error);
      throw error;
    }
  }

  /**
   * 커스터마이징 가져오기
   */
  async importCustomizations(userId, importData, options = {}) {
    if (!this.users.has(userId)) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    try {
      let data = importData.data;
      
      // 압축 해제
      if (importData.compressed) {
        data = await this.decompressData(data);
      }

      // 백업 생성
      if (options.createBackup !== false) {
        const backup = await this.exportCustomizations(userId);
        await this.saveToStorage(`backup_${userId}_${Date.now()}`, backup);
      }

      // 데이터 가져오기
      if (data.preferences && options.importPreferences !== false) {
        await this.updateUserPreferences(userId, data.preferences);
      }

      if (data.layouts && options.importLayouts !== false) {
        for (const [layoutId, layout] of Object.entries(data.layouts)) {
          await this.updateUserLayout(userId, layoutId, layout);
        }
      }

      if (data.customizations && options.importCustomizations !== false) {
        if (data.customizations.charts) {
          for (const [chartId, customization] of Object.entries(data.customizations.charts)) {
            await this.updateChartCustomization(userId, chartId, customization);
          }
        }
        
        if (data.customizations.widgets) {
          for (const [widgetId, customization] of Object.entries(data.customizations.widgets)) {
            await this.updateWidgetCustomization(userId, widgetId, customization);
          }
        }
      }

      if (data.versionHistory && options.importVersionHistory && this.config.versionControl) {
        this.versionHistory.set(userId, data.versionHistory);
      }

      console.log(`커스터마이징 가져오기: ${userId}`);
      this.emit('customizationsImported', { userId, importData });
      
      return true;
      
    } catch (error) {
      console.error('커스터마이징 가져오기 실패:', error);
      throw error;
    }
  }

  // === 내부 메소드 ===

  /**
   * 기본 환경설정 조회
   */
  getDefaultPreferences() {
    return {
      theme: {
        id: 'default',
        custom: null
      },
      language: 'ko',
      timezone: 'Asia/Seoul',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: 'HH:mm:ss',
      autoSave: true,
      notifications: {
        enabled: true,
        types: ['system', 'data', 'alerts']
      },
      dashboard: {
        autoRefresh: true,
        refreshInterval: 30000,
        showTooltips: true,
        enableAnimations: true
      }
    };
  }

  /**
   * 기본 레이아웃 조회
   */
  getDefaultLayout() {
    return {
      default: {
        id: 'default',
        name: '기본 레이아웃',
        components: [
          { id: 'header', type: 'header', position: { x: 0, y: 0, w: 12, h: 1 } },
          { id: 'sidebar', type: 'sidebar', position: { x: 0, y: 1, w: 2, h: 10 } },
          { id: 'main', type: 'main', position: { x: 2, y: 1, w: 10, h: 10 } }
        ],
        settings: {
          gridSize: 12,
          margin: 10,
          containerPadding: 10,
          isDraggable: true,
          isResizable: true
        },
        createdAt: Date.now()
      }
    };
  }

  /**
   * 기본 템플릿 설정
   */
  setupDefaultTemplates() {
    const defaultTemplates = [
      {
        id: 'dashboard_simple',
        name: '간단한 대시보드',
        category: 'dashboard',
        data: {
          components: [
            { id: 'chart1', type: 'line', position: { x: 0, y: 0, w: 6, h: 4 } },
            { id: 'chart2', type: 'bar', position: { x: 6, y: 0, w: 6, h: 4 } },
            { id: 'chart3', type: 'pie', position: { x: 0, y: 4, w: 6, h: 4 } },
            { id: 'table1', type: 'table', position: { x: 6, y: 4, w: 6, h: 4 } }
          ]
        }
      },
      {
        id: 'dashboard_analytics',
        name: '분석 대시보드',
        category: 'dashboard',
        data: {
          components: [
            { id: 'kpi1', type: 'kpi', position: { x: 0, y: 0, w: 3, h: 2 } },
            { id: 'kpi2', type: 'kpi', position: { x: 3, y: 0, w: 3, h: 2 } },
            { id: 'kpi3', type: 'kpi', position: { x: 6, y: 0, w: 3, h: 2 } },
            { id: 'kpi4', type: 'kpi', position: { x: 9, y: 0, w: 3, h: 2 } },
            { id: 'chart1', type: 'line', position: { x: 0, y: 2, w: 8, h: 6 } },
            { id: 'chart2', type: 'heatmap', position: { x: 8, y: 2, w: 4, h: 6 } }
          ]
        }
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, {
        ...template,
        metadata: {
          ...template,
          createdAt: Date.now(),
          createdBy: 'system'
        }
      });
    });
  }

  /**
   * 기본 컴포넌트 등록
   */
  registerDefaultComponents() {
    // 기본 컴포넌트들은 실제 구현에서 정의
    console.log('기본 컴포넌트 등록 완료');
  }

  /**
   * 자동 저장 설정
   */
  setupAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    this.autoSaveTimer = setInterval(async () => {
      if (this.currentUser) {
        try {
          await this.saveUserCustomizations(this.currentUser);
        } catch (error) {
          console.error('자동 저장 실패:', error);
        }
      }
    }, this.config.autoSaveInterval);
  }

  /**
   * 버전 ID 생성
   */
  generateVersionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 데이터 압축
   */
  async compressData(data) {
    // 실제 구현에서는 압축 라이브러리 사용
    return JSON.stringify(data);
  }

  /**
   * 데이터 압축 해제
   */
  async decompressData(compressedData) {
    // 실제 구현에서는 압축 해제 라이브러리 사용
    return JSON.parse(compressedData);
  }

  /**
   * 로컬 스토리지 초기화
   */
  async initLocalStorage() {
    if (typeof localStorage === 'undefined') {
      throw new Error('localStorage가 지원되지 않습니다');
    }
    console.log('localStorage 초기화 완료');
  }

  /**
   * 세션 스토리지 초기화
   */
  async initSessionStorage() {
    if (typeof sessionStorage === 'undefined') {
      throw new Error('sessionStorage가 지원되지 않습니다');
    }
    console.log('sessionStorage 초기화 완료');
  }

  /**
   * IndexedDB 초기화
   */
  async initIndexedDB() {
    if (typeof indexedDB === 'undefined') {
      throw new Error('indexedDB가 지원되지 않습니다');
    }
    // IndexedDB 초기화 로직
    console.log('IndexedDB 초기화 완료');
  }

  /**
   * 저장소에서 데이터 로드
   */
  async loadFromStorage(key) {
    try {
      switch (this.config.storageType) {
        case 'localStorage':
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        case 'sessionStorage':
          const sessionData = sessionStorage.getItem(key);
          return sessionData ? JSON.parse(sessionData) : null;
        case 'indexedDB':
          // IndexedDB 로드 로직
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.error('저장소 로드 실패:', error);
      return null;
    }
  }

  /**
   * 저장소에 데이터 저장
   */
  async saveToStorage(key, data) {
    try {
      const serializedData = JSON.stringify(data);
      
      switch (this.config.storageType) {
        case 'localStorage':
          localStorage.setItem(key, serializedData);
          break;
        case 'sessionStorage':
          sessionStorage.setItem(key, serializedData);
          break;
        case 'indexedDB':
          // IndexedDB 저장 로직
          break;
        default:
          throw new Error(`지원하지 않는 저장소 타입: ${this.config.storageType}`);
      }
      
      return true;
    } catch (error) {
      console.error('저장소 저장 실패:', error);
      throw error;
    }
  }

  /**
   * 통계 조회
   */
  getStats() {
    return {
      totalUsers: this.users.size,
      totalCustomizations: this.customizations.size,
      totalTemplates: this.templates.size,
      totalSharedConfigs: this.sharedConfigs.size,
      customComponents: this.customComponents.size,
      customWidgets: this.customWidgets.size,
      customCharts: this.customCharts.size,
      currentUser: this.currentUser,
      autoSaveEnabled: this.config.autoSave,
      versionControlEnabled: this.config.versionControl
    };
  }

  /**
   * 리소스 정리
   */
  async destroy() {
    try {
      // 자동 저장 중지
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
        this.autoSaveTimer = null;
      }
      
      // 현재 사용자 데이터 저장
      if (this.currentUser) {
        await this.saveUserCustomizations(this.currentUser);
      }
      
      // 데이터 정리
      this.users.clear();
      this.customizations.clear();
      this.templates.clear();
      this.preferences.clear();
      this.layouts.clear();
      this.customComponents.clear();
      this.customWidgets.clear();
      this.customCharts.clear();
      this.sharedConfigs.clear();
      this.versionHistory.clear();
      
      // 이벤트 리스너 제거
      this.removeAllListeners();
      
      console.log('UserCustomizationManager 리소스 정리 완료');
      
    } catch (error) {
      console.error('UserCustomizationManager 리소스 정리 실패:', error);
    }
  }
}

export default UserCustomizationManager;