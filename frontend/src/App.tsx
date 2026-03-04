import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ThreeScene from './components/ThreeScene'
import { batchEvents, initSession, submitExperiment, type EventPayload, type Step } from './lib/api'

type Option = {
  id: string
  label: string
}

type ItemQuestion = {
  id: string
  name: string
  question: string
  correctOptionId: string
  options: Option[]
}

type PracticeAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  isCorrect: boolean
}

type FormalAnswer = {
  itemId: string
  selectedOptionId: string
  durationMs: number
  orderIndex: number
}

type SurveyData = {
  hardestQuestion: string
  judgmentBasis: string
  readUbikBefore: string
  feedback: string
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const PRACTICE_QUESTION: ItemQuestion = {
  id: 'practice-led-lamp',
  name: 'LED 台灯',
  question: '这个 LED 台灯退行到 1960 年代后，最可能变成什么？',
  correctOptionId: 'A',
  options: [
    { id: 'A', label: 'A. 煤油灯' },
    { id: 'B', label: 'B. 蜡烛台' },
    { id: 'C', label: 'C. 手电筒' },
    { id: 'D', label: 'D. 霓虹灯管' },
  ],
}

const FORMAL_ITEMS: ItemQuestion[] = [
  {
    id: 'smart-speaker',
    name: '智能音箱',
    question: '如果这个智能音箱退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 留声机' },
      { id: 'B', label: 'B. 收音机' },
      { id: 'C', label: 'C. 传呼机' },
      { id: 'D', label: 'D. 麦克风' },
    ],
  },
  {
    id: 'wireless-charger',
    name: '无线充电器',
    question: '如果这个无线充电器退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 有线充电底座' },
      { id: 'B', label: 'B. 插线板' },
      { id: 'C', label: 'C. 电池盒' },
      { id: 'D', label: 'D. 变压器' },
    ],
  },
  {
    id: 'lcd-tv',
    name: '液晶电视',
    question: '如果这个液晶电视退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 幻灯机' },
      { id: 'B', label: 'B. 投影幕布' },
      { id: 'C', label: 'C. 电影放映机' },
      { id: 'D', label: 'D. CRT 电视' },
    ],
  },
  {
    id: 'air-purifier',
    name: '空气净化器',
    question: '如果这个空气净化器退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 电风扇' },
      { id: 'B', label: 'B. 加湿器' },
      { id: 'C', label: 'C. 机械通风器' },
      { id: 'D', label: 'D. 香薰机' },
    ],
  },
  {
    id: 'robot-vacuum',
    name: '扫地机器人',
    question: '如果这个扫地机器人退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 手推吸尘器' },
      { id: 'B', label: 'B. 鸡毛掸子' },
      { id: 'C', label: 'C. 拖把' },
      { id: 'D', label: 'D. 扫帚' },
    ],
  },
  {
    id: 'smartwatch',
    name: '智能手表',
    question: '如果这个智能手表退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 秒表' },
      { id: 'B', label: 'B. 机械计步器' },
      { id: 'C', label: 'C. 电子表' },
      { id: 'D', label: 'D. 机械腕表' },
    ],
  },
  {
    id: 'tablet',
    name: '平板电脑',
    question: '如果这个平板电脑退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 打字机' },
      { id: 'B', label: 'B. 纸质笔记本' },
      { id: 'C', label: 'C. 电话簿' },
      { id: 'D', label: 'D. 黑板' },
    ],
  },
  {
    id: 'bluetooth-headset',
    name: '蓝牙耳机',
    question: '如果这个蓝牙耳机退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 扩音喇叭' },
      { id: 'B', label: 'B. 收音机天线' },
      { id: 'C', label: 'C. 有线耳机' },
      { id: 'D', label: 'D. 助听器' },
    ],
  },
  {
    id: 'induction-cooker',
    name: '电磁炉',
    question: '如果这个电磁炉退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 电热炉' },
      { id: 'B', label: 'B. 炭火炉' },
      { id: 'C', label: 'C. 酒精炉' },
      { id: 'D', label: 'D. 煤气灶' },
    ],
  },
  {
    id: 'smart-door-lock',
    name: '智能门锁',
    question: '如果这个智能门锁退行到 1960 年代，它最可能变成什么？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 门铃' },
      { id: 'B', label: 'B. 插销' },
      { id: 'C', label: 'C. 门把手' },
      { id: 'D', label: 'D. 机械钥匙锁' },
    ],
  },
]

function shuffleOptions(options: Option[]): Option[] {
  return [...options].sort(() => Math.random() - 0.5)
}

function App() {
  const [step, setStep] = useState<Step>('welcome')
  const [sessionId, setSessionId] = useState('')
  const [consented, setConsented] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const [practicePanelOpen, setPracticePanelOpen] = useState(false)
  const [practiceSelected, setPracticeSelected] = useState('')
  const [practiceAnswer, setPracticeAnswer] = useState<PracticeAnswer | null>(null)
  const [showPracticeFeedback, setShowPracticeFeedback] = useState(false)

  const [formalPanelItem, setFormalPanelItem] = useState<ItemQuestion | null>(null)
  const [formalSelected, setFormalSelected] = useState('')
  const [formalAnswers, setFormalAnswers] = useState<FormalAnswer[]>([])

  const [surveyData, setSurveyData] = useState<SurveyData>({
    hardestQuestion: '',
    judgmentBasis: '',
    readUbikBefore: '',
    feedback: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const [position, setPosition] = useState({ x: 0, z: 0 })
  const [nowMs, setNowMs] = useState(Date.now())

  const eventsRef = useRef<EventPayload[]>([])
  const appStartAtRef = useRef<number>(Date.now())
  const stepStartAtRef = useRef<number>(Date.now())
  const experimentStartAtRef = useRef<number>(0)
  const panelOpenAtRef = useRef<number>(0)
  const formalOrderRef = useRef<number>(0)

  const formalAnsweredIds = useMemo(
    () => new Set(formalAnswers.map((a) => a.itemId)),
    [formalAnswers],
  )

  const formalOptionMap = useMemo(() => {
    return new Map(FORMAL_ITEMS.map((item) => [item.id, shuffleOptions(item.options)]))
  }, [])

  const track = (eventName: string, payload?: Record<string, unknown>) => {
    if (!sessionId) return
    eventsRef.current.push({
      event_id: uid(),
      event_name: eventName,
      event_time: new Date().toISOString(),
      step,
      session_id: sessionId,
      page_url: window.location.pathname,
      payload,
    })
  }

  const flushEvents = async () => {
    if (eventsRef.current.length === 0) return
    const batch = [...eventsRef.current]
    eventsRef.current = []
    try {
      await batchEvents(batch)
    } catch {
      eventsRef.current = [...batch, ...eventsRef.current]
    }
  }

  useEffect(() => {
    void (async () => {
      const session = await initSession()
      setSessionId(session.sessionId)
    })()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void flushEvents()
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const beforeUnload = () => {
      void flushEvents()
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [])

  useEffect(() => {
    if (!sessionId) return
    track(`${step}_view`)
  }, [sessionId, step])

  useEffect(() => {
    stepStartAtRef.current = Date.now()
  }, [step])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (step !== 'practice' && step !== 'formal') return
    const listener = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if (!['w', 'a', 's', 'd'].includes(key)) return
      setPosition((prev) => {
        const delta = 1
        if (key === 'w') return { ...prev, z: prev.z - delta }
        if (key === 's') return { ...prev, z: prev.z + delta }
        if (key === 'a') return { ...prev, x: prev.x - delta }
        return { ...prev, x: prev.x + delta }
      })
      track('movement_key_press', { key })
    }
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [step, sessionId])

  const goToStep = (next: Step) => {
    setLoading(true)
    setTimeout(() => {
      setStep(next)
      setLoading(false)
    }, 500)
  }

  const openPracticePanel = useCallback(() => {
    setPracticePanelOpen(true)
    setPracticeSelected('')
    panelOpenAtRef.current = Date.now()
    track('practice_object_clicked', { itemId: PRACTICE_QUESTION.id })
  }, [sessionId, step])

  const submitPractice = () => {
    if (!practiceSelected) return
    const isCorrect = practiceSelected === PRACTICE_QUESTION.correctOptionId
    const answer: PracticeAnswer = {
      itemId: PRACTICE_QUESTION.id,
      selectedOptionId: practiceSelected,
      isCorrect,
      durationMs: Date.now() - panelOpenAtRef.current,
    }
    setPracticeAnswer(answer)
    setShowPracticeFeedback(true)
    track('practice_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      durationMs: answer.durationMs,
    })
  }

  const enterFormal = () => {
    experimentStartAtRef.current = Date.now()
    goToStep('formal')
    track('enter_formal_experiment_click')
  }

  const openFormalPanel = useCallback(
    (item: ItemQuestion) => {
      if (formalAnsweredIds.has(item.id)) return
      setFormalPanelItem(item)
      setFormalSelected('')
      panelOpenAtRef.current = Date.now()
      track('formal_question_opened', { itemId: item.id })
    },
    [formalAnsweredIds, sessionId, step],
  )

  const submitFormal = () => {
    if (!formalPanelItem || !formalSelected) return
    formalOrderRef.current += 1
    const answer: FormalAnswer = {
      itemId: formalPanelItem.id,
      selectedOptionId: formalSelected,
      durationMs: Date.now() - panelOpenAtRef.current,
      orderIndex: formalOrderRef.current,
    }
    const nextAnswers = [...formalAnswers, answer]
    setFormalAnswers(nextAnswers)
    setFormalPanelItem(null)
    track('formal_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      durationMs: answer.durationMs,
      orderIndex: answer.orderIndex,
    })

    if (nextAnswers.length === FORMAL_ITEMS.length) {
      track('formal_all_completed')
      setTimeout(() => goToStep('survey'), 400)
    }
  }

  const surveyValid =
    Boolean(surveyData.hardestQuestion) &&
    Boolean(surveyData.judgmentBasis) &&
    Boolean(surveyData.readUbikBefore)

  const submitSurvey = async () => {
    if (!surveyValid || submitting) return
    setSubmitting(true)
    track('survey_submit_click')

    const payload = {
      sessionId,
      totalDurationMs: Date.now() - experimentStartAtRef.current,
      practiceAnswer,
      formalAnswers,
      surveyData,
      eventBufferLength: eventsRef.current.length,
    }

    try {
      await flushEvents()
      await submitExperiment(payload)
      track('survey_submit_success')
      setToast('提交成功！再次感谢您的参与！')
    } catch {
      track('survey_submit_failed')
      setToast('提交失败，请检查网络后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const practiceSceneItems = useMemo(
    () => [
      {
        id: PRACTICE_QUESTION.id,
        name: PRACTICE_QUESTION.name,
        answered: false,
      },
    ],
    [],
  )

  const formalSceneItems = useMemo(
    () =>
      FORMAL_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        answered: formalAnsweredIds.has(item.id),
      })),
    [formalAnsweredIds],
  )

  const handlePracticeItemClick = useCallback(() => {
    openPracticePanel()
  }, [])

  const handleFormalItemClick = useCallback((itemId: string) => {
    const item = FORMAL_ITEMS.find((it) => it.id === itemId)
    if (!item) return
    openFormalPanel(item)
  }, [formalAnsweredIds])

  const isSceneStep = step === 'practice' || step === 'formal'

  const formatDuration = (ms: number) => {
    const safeMs = Math.max(0, ms)
    const totalSec = Math.floor(safeMs / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const totalDurationMs = nowMs - appStartAtRef.current
  const stepDurationMs = nowMs - stepStartAtRef.current
  const singleQuestionDurationMs = panelOpenAtRef.current ? nowMs - panelOpenAtRef.current : 0

  return (
    <div className={isSceneStep ? 'app-shell app-shell--scene' : 'app-shell'}>
      {!isSceneStep && (
        <header className="topbar">
          <h1>《尤比克》物品退行认知实验平台</h1>
          {step === 'formal' && (
            <div className="counter">{formalAnswers.length}/10 已完成</div>
          )}
        </header>
      )}

      {loading && <div className="loading">加载中，请稍候...</div>}

      {!loading && step === 'welcome' && (
        <section className="panel hero">
          <h2>物品功能退行认知匹配实验</h2>
          <p>本次实验预计耗时 15 分钟，感谢您的参与。</p>
          <p>
            在《尤比克》的世界观中，现代物品会“退行”为更早时代在功能上对应的物品。你将进入
            2026 现代客厅并完成 10 道判断题。
          </p>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={consented}
              onChange={(e) => {
                setConsented(e.target.checked)
                track('consent_checked', { checked: e.target.checked })
              }}
            />
            我已阅读并同意参与实验
          </label>
          <button
            disabled={!consented}
            onClick={() => {
              track('start_experiment_click')
              goToStep('tutorial')
            }}
          >
            开始实验
          </button>
        </section>
      )}

      {!loading && step === 'tutorial' && (
        <section className="panel tutorial">
          <div>
            <h2>实验操作指南</h2>
            <ol>
              <li>键盘 WASD 控制移动</li>
              <li>移动鼠标控制视角</li>
              <li>点击发光物品弹出问答面板并作答</li>
            </ol>
            <button
              onClick={() => {
                track('enter_practice_click')
                goToStep('practice')
              }}
            >
              进入场景
            </button>
          </div>
        </section>
      )}

      {!loading && step === 'practice' && (
        <section className="scene-wrap">
          <div className="scene-overlay-top">
            <h1>《尤比克》物品退行认知实验平台</h1>
            <button className="ghost-btn" onClick={() => goToStep('tutorial')}>
              返回教学页
            </button>
          </div>

          <div className="scene">
            <div className="scene-hud">
              <span>
                坐标 X:{position.x} Z:{position.z}
              </span>
              <span>点击发光物体开始练习题</span>
            </div>
            <ThreeScene items={practiceSceneItems} onItemClick={handlePracticeItemClick} />
          </div>

          {practicePanelOpen && (
            <div className="qa-panel">
              <h3>{PRACTICE_QUESTION.question}</h3>
              <div className="options-grid">
                {PRACTICE_QUESTION.options.map((opt) => (
                  <button
                    key={opt.id}
                    className={practiceSelected === opt.id ? 'opt selected' : 'opt'}
                    onClick={() => {
                      setPracticeSelected(opt.id)
                      track('practice_option_selected', { optionId: opt.id })
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {!showPracticeFeedback && (
                <button disabled={!practiceSelected} onClick={submitPractice}>
                  确认选择
                </button>
              )}

              {showPracticeFeedback && practiceAnswer && (
                <div className="feedback">
                  {practiceAnswer.isCorrect
                    ? '正确！煤油灯和LED台灯都是桌面局部照明设备，功能结构最为对应。'
                    : '答案是 A 哦！判断核心是「功能对应」，而非外形相似。'}
                </div>
              )}
            </div>
          )}

          {showPracticeFeedback && (
            <div className="bottom-action">
              <button onClick={enterFormal}>进入正式实验</button>
            </div>
          )}
        </section>
      )}

      {!loading && step === 'formal' && (
        <section className="scene-wrap">
          <div className="scene-overlay-top">
            <h1>《尤比克》物品退行认知实验平台</h1>
            <div className="scene-top-actions">
              <div className="counter counter--overlay">{formalAnswers.length}/10 已完成</div>
              <button className="ghost-btn" onClick={() => goToStep('survey')}>
                跳到问卷页
              </button>
            </div>
          </div>

          <div className="scene">
            <div className="scene-hud">
              <span>
                坐标 X:{position.x} Z:{position.z}
              </span>
              <span>自由移动并点击发光物品作答</span>
            </div>
            <ThreeScene items={formalSceneItems} onItemClick={handleFormalItemClick} />
          </div>

          {formalPanelItem && (
            <div className="qa-panel">
              <h3>{formalPanelItem.question}</h3>
              <div className="options-grid">
                {(formalOptionMap.get(formalPanelItem.id) ?? formalPanelItem.options).map((opt) => (
                  <button
                    key={opt.id}
                    className={formalSelected === opt.id ? 'opt selected' : 'opt'}
                    onClick={() => {
                      setFormalSelected(opt.id)
                      track('formal_option_selected', {
                        itemId: formalPanelItem.id,
                        optionId: opt.id,
                      })
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button disabled={!formalSelected} onClick={submitFormal}>
                确认选择
              </button>
            </div>
          )}
        </section>
      )}

      {!loading && step === 'survey' && (
        <section className="panel survey">
          <h2>实验完成！感谢你的参与！</h2>

          <label>
            1. 你觉得哪道题最难做判断？
            <select
              value={surveyData.hardestQuestion}
              onChange={(e) =>
                setSurveyData((prev) => ({ ...prev, hardestQuestion: e.target.value }))
              }
            >
              <option value="">请选择</option>
              {FORMAL_ITEMS.map((_, index) => (
                <option key={index + 1} value={`第${index + 1}题`}>
                  第{index + 1}题
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>2. 你在做判断时主要依据什么？</legend>
            {['物品的功能用途', '物品的外形相似度', '物品的时代感', '直觉'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="basis"
                  checked={surveyData.judgmentBasis === item}
                  onChange={() => setSurveyData((prev) => ({ ...prev, judgmentBasis: item }))}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>3. 你之前是否读过《尤比克》或了解这个世界观？</legend>
            {['是', '否'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="ubik"
                  checked={surveyData.readUbikBefore === item}
                  onChange={() => setSurveyData((prev) => ({ ...prev, readUbikBefore: item }))}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <label>
            4. 任何想补充的反馈？（选填）
            <textarea
              maxLength={500}
              value={surveyData.feedback}
              onChange={(e) => setSurveyData((prev) => ({ ...prev, feedback: e.target.value }))}
              rows={5}
              placeholder="请输入你的反馈（最多500字）"
            />
          </label>

          <button disabled={!surveyValid || submitting} onClick={() => void submitSurvey()}>
            {submitting ? '提交中...' : '提交问卷'}
          </button>
        </section>
      )}

      <div className="timer-bar">
        <span>总时长：{formatDuration(totalDurationMs)}</span>
        <span>当前步骤时长：{formatDuration(stepDurationMs)}</span>
        <span>单题时长：{formatDuration(singleQuestionDurationMs)}</span>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
