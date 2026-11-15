import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8')

// 隔离 GNOME 依赖，测试真实扩展类中的快捷键和 OSD 调用。
async function loadExtension(manager) {
  const context = vm.createContext({})
  const main = new vm.SyntheticModule(['osdWindowManager'], function () {
    this.setExport('osdWindowManager', manager)
  }, {context})
  const names = [
    'default', 'Extension', 'InjectionManager', 'MVBrightnessItem', 'MVVolumeItem',
    'LOG', 'castInt', 'isEmpty', 'avgVM', 'sleep', 'clearAllTimeouts',
    'Lock', 'SetValueIntent', 'DdcutilWrapper', 'DdcutilHelper',
  ]
  const dependencies = new vm.SyntheticModule(names, function () {
    for (const name of names)
      this.setExport(name, name === 'Extension' ? class {} : undefined)
  }, {context})
  const extension = new vm.SourceTextModule(source, {context})
  await extension.link(specifier =>
    specifier === 'resource:///org/gnome/shell/ui/main.js' ? main : dependencies)
  await extension.evaluate()
  const instance = new extension.namespace.default()
  instance._brightness = {slider: {value: 0.5}, gicon: Symbol('brightness')}
  instance._volume = {slider: {value: 0.5}, gicon: Symbol('volume')}
  return instance
}

const actions = [
  ['brightnessUpKey', '_brightness', 0.52],
  ['brightnessDownKey', '_brightness', 0.48],
  ['volumeUpKey', '_volume', 0.52],
  ['volumeDownKey', '_volume', 0.48],
]

for (const modern of [true, false]) {
  for (const [method, field, expected] of actions) {
    test(`${modern ? 'GNOME 50/51 接口' : '旧版接口'}：${method}`, async () => {
      const calls = []
      const manager = modern
        ? {
            showAll: (...args) => calls.push(args),
            show: () => assert.fail('应优先使用 showAll'),
          }
        : {show: (...args) => calls.push(args)}
      const extension = await loadExtension(manager)
      await extension[method]()
      assert.equal(extension[field].slider.value, expected)
      const argumentsExpected = [extension[field].gicon, 'Monitor', expected, 1]
      if (!modern)
        argumentsExpected.unshift(-1)
      assert.deepEqual(calls, [argumentsExpected])
    })
  }
}

for (const [method, field] of actions) {
  test(`快捷键保持滑块范围：${method}`, async () => {
    const extension = await loadExtension({showAll() {}})
    const increasing = method.endsWith('UpKey')
    extension[field].slider.value = increasing ? 0.99 : 0.01
    await extension[method]()
    assert.equal(extension[field].slider.value, increasing ? 1 : 0)
  })
}
