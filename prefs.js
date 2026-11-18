import Adw from 'gi://Adw'
import Gio from 'gi://Gio'

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js'

export default class MonitorBrightnessVolumePreferences extends ExtensionPreferences {
  fillPreferencesWindow(window) {
    const settings = this.getSettings()
    const page = new Adw.PreferencesPage()
    const group = new Adw.PreferencesGroup({title: '显示器控制'})
    const volume = new Adw.SwitchRow({
      title: '显示器音量控制',
      subtitle: '在快捷设置中显示音量滑块，并启用显示器音量快捷键',
    })

    settings.bind('show-volume', volume, 'active', Gio.SettingsBindFlags.DEFAULT)

    group.add(volume)
    page.add(group)
    window.add(page)
  }
}
