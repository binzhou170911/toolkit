import type { Tool } from '../../types/tool'

export const gomokuTool: Tool = {
  id: 'gomoku',
  name: '五子棋',
  description: '离线双人和人机五子棋小游戏',
  icon: '⚫',
  category: '小游戏',
  keywords: ['五子棋', 'gomoku', '棋类', '游戏', '人机', '对战', '棋盘'],
  inputType: 'text',
  outputType: 'text',
  actions: [{
    id: 'open',
    name: '开始游戏',
    execute: () => '请使用五子棋游戏界面'
  }]
}
