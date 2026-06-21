/**
 * app.ets — 应用入口
 *
 * HarmonyOS Stage 模型入口，拉起主页面。
 * 初始化 ThemeService / I18n 的偏好持久化。
 */

import { UIAbility, Want, AbilityConstant } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import { ThemeService } from './services/ThemeService';
import { I18n } from './i18n/I18n';

export default class MainAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'TUIEditor', 'Application onCreate');

    // 初始化偏好存储
    try {
      ThemeService.getInstance().init(this.context);
      I18n.getInstance().init(this.context);
      hilog.info(0x0000, 'TUIEditor', 'Preferences initialized');
    } catch (e) {
      hilog.warn(0x0000, 'TUIEditor', 'Preferences init failed, using defaults');
    }
  }

  onDestroy(): void {
    hilog.info(0x0000, 'TUIEditor', 'Application onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(0x0000, 'TUIEditor', 'onWindowStageCreate');
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(0x0000, 'TUIEditor', 'Failed to load content: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(0x0000, 'TUIEditor', 'Content loaded successfully');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(0x0000, 'TUIEditor', 'onWindowStageDestroy');
  }
}
