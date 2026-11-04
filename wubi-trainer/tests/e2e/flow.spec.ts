import { expect, test, type Page } from '@playwright/test'

/**
 * 端到端（任务 6b）：首屏 → 选关卡 → 输入 → 计分 → 错题入本。
 * 输入用 page.keyboard 的物理键位（与真实用户一致），不注入任何内部状态。
 */
test('一级简码关卡：从首屏到错题入本', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home')).toBeVisible()

  // 首屏信息：数据来自 86 版同源码表
  await expect(page.getByTestId('data-meta')).toContainText('3500 字比对 0 差异')

  // 选关卡：一级简码
  await page.getByTestId('lesson-level1').click()
  await expect(page.getByTestId('lesson-page')).toBeVisible()
  await expect(page.getByTestId('target')).toHaveText('一')

  // 键盘高亮下一键（一 → g）
  await expect(page.locator('[data-key="g"].key-next')).toHaveCount(1)

  // 输入：先敲错（h），再敲对（g）
  await page.keyboard.press('KeyH')
  await expect(page.locator('[data-key="h"].key-wrong')).toHaveCount(1)
  await page.keyboard.press('KeyG')
  await expect(page.getByTestId('progress')).toHaveText('1 / 25')

  // 计分：击键数 = 2，错误键 = 1
  await expect(page.getByTestId('stats')).toContainText('2')
  await expect(page.getByTestId('stats')).toContainText('1')

  // 把 25 个一级简码全部打完（每条的最短码从界面读取，独立于实现）
  for (let i = 1; i < 25; i++) {
    const code = (await page.getByTestId('code-line').textContent())?.trim() ?? ''
    expect(code.length).toBeGreaterThanOrEqual(1)
    for (const key of code) {
      await page.keyboard.press(`Key${key.toUpperCase()}`)
    }
    if (i === 24) {
      // 最后一条完成后进入结算页
      await expect(page.getByTestId('lesson-summary')).toBeVisible()
    } else {
      await expect(page.getByTestId('progress')).toHaveText(`${i + 1} / 25`)
    }
  }

  // 完成结算
  await expect(page.getByTestId('lesson-summary')).toBeVisible()

  // 错题入本：刚才敲错的“一”应已进入错题本
  await page.getByRole('button', { name: '← 返回课程' }).click()
  await page.getByTestId('errorbook-entry').click()
  await expect(page.getByTestId('errorbook')).toBeVisible()
  await expect(page.getByTestId('errorbook-table')).toContainText('一')
})

test('文章关卡：词组整打提示与逐字进度', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('lesson-article-daily').click()
  await expect(page.getByTestId('article-text')).toBeVisible()
  const code = (await page.getByTestId('code-line').textContent())?.trim() ?? ''
  // 首个条目应是词组（码长 3–4），整打后进度前进
  expect(code.length).toBeGreaterThanOrEqual(3)
  for (const key of code) {
    await page.keyboard.press(`Key${key.toUpperCase()}`)
  }
  await expect(page.getByTestId('progress')).toContainText('1 / ')
})

/** 单字关卡：识别码面板展示拆解与识别码（任务 6c 的界面侧证据）。 */
test('单字关卡展示识别码拆解', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('lesson-chars-single').click()
  await expect(page.getByTestId('decomposition')).toBeVisible()
  await expect(page.getByTestId('decomposition')).toContainText('识别码')
})

/** 输入处理：拼音 IME 组合事件与修饰键不应干扰判定（任务第 5 条）。 */
test('组合中的按键被忽略', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('lesson-level1').click()
  await expect(page.getByTestId('lesson-page')).toBeVisible()
  // 模拟 IME 组合中的 keydown（isComposing）——不应被计数
  await page.evaluate(() => {
    const target = document.querySelector('[data-testid="lesson-page"]')?.parentElement ?? document.body
    target.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyG', isComposing: true, bubbles: true }),
    )
  })
  await expect(page.getByTestId('progress')).toHaveText('0 / 25')
  // 正常按键仍然有效
  await page.keyboard.press('KeyG')
  await expect(page.getByTestId('progress')).toHaveText('1 / 25')
})

export async function typeCurrentCode(page: Page) {
  const code = (await page.getByTestId('code-line').textContent())?.trim() ?? ''
  for (const key of code) {
    await page.keyboard.press(`Key${key.toUpperCase()}`)
  }
}
