import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ThreeScene from './components/ThreeScene'
import { batchEvents, initSession, submitExperiment, type EventPayload, type Step } from './lib/api'

type Option = {
  id: string
  label: string
  image?: string
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
  taskDifficulty: string
  coreDifficulties: string[]
  decisionBases: string[]
  noticedEnvironmentChanges: string
  environmentImpact: string
  narrativePresence: string
  feedback: string
}

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const USER_ID_STORAGE_KEY = 'ubik_user_id'

function getOrCreateUserId() {
  const cached = window.localStorage.getItem(USER_ID_STORAGE_KEY)
  if (cached) return cached
  const next = window.crypto.randomUUID()
  window.localStorage.setItem(USER_ID_STORAGE_KEY, next)
  return next
}

const PRACTICE_QUESTION: ItemQuestion = {
  id: 'practice-cube',
  name: '正方体',
  question: '练习题（单选）：正方体有几个面？',
  correctOptionId: 'D',
  options: [
    { id: 'A', label: 'A. 3个' },
    { id: 'B', label: 'B. 4个' },
    { id: 'C', label: 'C. 5个' },
    { id: 'D', label: 'D. 6个' },
  ],
}

const PRACTICE_FEEDBACK_TEXT = {
  correctTitle: '回答正确',
  correctReason: '正确答案是 D（6个）。',
  wrongTitle: '回答错误',
  wrongReason: '正确答案是 D（6个）。',
}

const FORMAL_ITEMS: ItemQuestion[] = [
  {
    id: 'nano-repair-spray',
    name: '纳米修复喷雾',
    question: '纳米修复喷雾（2030_time_spray.glb）最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 现代圆柱形运动水壶（visual）' },
      { id: 'B', label: 'B. 老式马口铁气雾罐（spray）（narrative）' },
      { id: 'C', label: 'C. 游乐场旋转木马（baseline 无关项）' },
      { id: 'D', label: 'D. 带有发光液体的魔法药水瓶（semantic）' },
    ],
  },
  {
    id: 'smart-speaker',
    name: '智能音箱',
    question: '智能音箱（2030_soundbox.glb）最可能退行成哪一项？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 现代头戴式无线耳机（semantic）' },
      { id: 'B', label: 'B. 木质复古相框（baseline 无关项）' },
      { id: 'C', label: 'C. 表面光滑的深灰色圆石（visual）' },
      { id: 'D', label: 'D. 大喇叭铜质留声机（narrative）' },
    ],
  },
  {
    id: 'holographic-projector',
    name: '全息投影仪',
    question: '全息投影仪（2030_projector_02.glb）最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 古董幻灯机（narrative）' },
      { id: 'B', label: 'B. 铁制家用剪刀（baseline 无关项）' },
      { id: 'C', label: 'C. 现代极简透明玻璃立方体/花瓶（visual）' },
      { id: 'D', label: 'D. 宽屏超薄液晶显示器（semantic）' },
    ],
  },
  {
    id: 'smart-environment-lamp',
    name: '智能环境灯',
    question: '智能环境灯（2030_light.glb）最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 强光手电筒（semantic）' },
      { id: 'B', label: 'B. 手提式煤油马灯（narrative）' },
      { id: 'C', label: 'C. 发光的磨砂白色乒乓球（visual）' },
      { id: 'D', label: 'D. 玻璃水杯（baseline 无关项）' },
    ],
  },
  {
    id: 'laptop',
    name: '笔记本电脑',
    question: '笔记本电脑（2030_laptop.glb）最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 传统的木框算盘（semantic）' },
      { id: 'B', label: 'B. 雷明顿机械打字机（narrative）' },
      { id: 'C', label: 'C. 银色不锈钢咖啡托盘（baseline 无关项）' },
      { id: 'D', label: 'D. 折叠式便携梳妆镜（visual）' },
    ],
  },
  {
    id: 'smartphone',
    name: '智能手机',
    question: '智能手机（2030_handphone.glb）最可能退行成哪一项？',
    correctOptionId: 'A',
    options: [
      { id: 'A', label: 'A. 牛皮纸信封（narrative）' },
      { id: 'B', label: 'B. 火柴盒（semantic）' },
      { id: 'C', label: 'C. 陶瓷烟灰缸（baseline 无关项）' },
      { id: 'D', label: 'D. 黑色磨砂石板（visual）' },
    ],
  },
  {
    id: 'digital-wallet',
    name: '数字钱包',
    question: '数字钱包（2030_digital_wallet.glb）最可能退行成哪一项？',
    correctOptionId: 'B',
    options: [
      { id: 'A', label: 'A. 黑色扁平充电宝（visual）' },
      { id: 'B', label: 'B. 磨损的皮革钱袋与银币（narrative）' },
      { id: 'C', label: 'C. 手持雨伞的手柄（baseline 无关项）' },
      { id: 'D', label: 'D. 纸质银行存折（semantic）' },
    ],
  },
  {
    id: 'smart-coffee-machine',
    name: '智能咖啡机',
    question: '智能咖啡机（2030_coffee_machine.glb）最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 金属垃圾桶（visual）' },
      { id: 'B', label: 'B. 旧报纸（baseline 无关项）' },
      { id: 'C', label: 'C. 手摇研磨机、炭火铜炉（narrative）' },
      { id: 'D', label: 'D. 咖啡包装袋（semantic）' },
    ],
  },
  {
    id: 'smart-air-conditioner',
    name: '智能中央空调',
    question: '智能中央空调（2030_air_conditioner.glb）最可能退行成哪一项？',
    correctOptionId: 'D',
    options: [
      { id: 'A', label: 'A. 墙上的白色横梁（visual）' },
      { id: 'B', label: 'B. 绿色盆栽（baseline 无关项）' },
      { id: 'C', label: 'C. 三叶电风扇（semantic）' },
      { id: 'D', label: 'D. 铸铁暖气片（narrative）' },
    ],
  },
  {
    id: 'plasma-lighter',
    name: '电浆打火机',
    question: '电浆打火机（2030_lighter.glb）最可能退行成哪一项？',
    correctOptionId: 'C',
    options: [
      { id: 'A', label: 'A. 塑料美发梳（baseline 无关项）' },
      { id: 'B', label: 'B. 聚光放大镜（semantic）' },
      { id: 'C', label: 'C. 木制火柴盒（narrative）' },
      { id: 'D', label: 'D. 圆柱金属外壳口红（visual）' },
    ],
  },
]

function shuffleOptions(options: Option[]): Option[] {
  return [...options].sort(() => Math.random() - 0.5)
}

function getInitialStepFromQuery(): Step {
  const stepParam = new URLSearchParams(window.location.search).get('step')
  if (stepParam === 'welcome') return 'welcome'
  if (stepParam === 'tutorial') return 'practice'
  if (stepParam === 'practice') return 'practice'
  if (stepParam === 'formal') return 'formal'
  if (stepParam === 'survey') return 'survey'
  return 'welcome'
}

function App() {
  const [step, setStep] = useState<Step>(() => getInitialStepFromQuery())
  const [sessionId, setSessionId] = useState('')
  const [userId] = useState(() => getOrCreateUserId())
  const [participantPhone, setParticipantPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  const [practicePanelOpen, setPracticePanelOpen] = useState(false)
  const [practiceSelected, setPracticeSelected] = useState('')
  const [practiceAnswer, setPracticeAnswer] = useState<PracticeAnswer | null>(null)
  const [showPracticeFeedback, setShowPracticeFeedback] = useState(false)
  const [showEnterFormalButton, setShowEnterFormalButton] = useState(false)
  const [practiceFeedbackShownAt, setPracticeFeedbackShownAt] = useState<number | null>(null)
  const [practiceActiveItemIds, setPracticeActiveItemIds] = useState<string[]>([])

  const [formalPanelItem, setFormalPanelItem] = useState<ItemQuestion | null>(null)
  const [formalSelected, setFormalSelected] = useState('')
  const [formalAnswers, setFormalAnswers] = useState<FormalAnswer[]>([])

  const [surveyData, setSurveyData] = useState<SurveyData>({
    taskDifficulty: '',
    coreDifficulties: [],
    decisionBases: [],
    noticedEnvironmentChanges: '',
    environmentImpact: '',
    narrativePresence: '',
    feedback: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [surveyQuestionDurationsMs, setSurveyQuestionDurationsMs] = useState<Record<string, number>>({})

  const [position, setPosition] = useState({ x: 0, z: 0 })
  const [nowMs, setNowMs] = useState(Date.now())

  const eventsRef = useRef<EventPayload[]>([])
  const practiceFeedbackTimerRef = useRef<number | null>(null)
  const experimentStartAtRef = useRef<number>(0)
  const panelOpenAtRef = useRef<number>(0)
  const formalOrderRef = useRef<number>(0)
  const surveyQuestionOpenAtRef = useRef<Record<string, number>>({})

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
      const session = await initSession(userId)
      setSessionId(session.sessionId)
    })()
  }, [userId])

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
    if (step === 'practice') {
      track('tutorial_view')
      track('practice_scene_loaded')
    }
  }, [sessionId, step])


  useEffect(() => {
    if (step !== 'survey') return
    const openedAt = Date.now()
    surveyQuestionOpenAtRef.current = {
      taskDifficulty: openedAt,
      coreDifficulties: openedAt,
      decisionBases: openedAt,
      noticedEnvironmentChanges: openedAt,
      environmentImpact: openedAt,
      narrativePresence: openedAt,
      feedback: openedAt,
    }
    setSurveyQuestionDurationsMs({})
  }, [step])


  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now())
    }, 200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      if (practiceFeedbackTimerRef.current) {
        window.clearTimeout(practiceFeedbackTimerRef.current)
      }
    }
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
    setPracticeAnswer(null)
    setShowPracticeFeedback(false)
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(null)
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
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
    setShowEnterFormalButton(false)
    setPracticeFeedbackShownAt(Date.now())
    track('practice_answer_submitted', {
      itemId: answer.itemId,
      selectedOptionId: answer.selectedOptionId,
      isCorrect: answer.isCorrect,
      durationMs: answer.durationMs,
    })
    track('practice_feedback_shown', {
      itemId: answer.itemId,
      isCorrect: answer.isCorrect,
    })

    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
    }
    practiceFeedbackTimerRef.current = window.setTimeout(() => {
      setShowEnterFormalButton(true)
    }, 3000)
  }

  const enterFormal = () => {
    if (practiceFeedbackTimerRef.current) {
      window.clearTimeout(practiceFeedbackTimerRef.current)
      practiceFeedbackTimerRef.current = null
    }
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
      track('formal_object_clicked', { itemId: item.id })
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

  const markSurveyAnswered = (questionKey: keyof SurveyData) => {
    const openedAt = surveyQuestionOpenAtRef.current[questionKey]
    if (!openedAt) return
    setSurveyQuestionDurationsMs((prev) => {
      if (prev[questionKey]) return prev
      return {
        ...prev,
        [questionKey]: Date.now() - openedAt,
      }
    })
  }

  const surveyValid =
    Boolean(surveyData.taskDifficulty) &&
    surveyData.coreDifficulties.length > 0 &&
    surveyData.decisionBases.length > 0 &&
    Boolean(surveyData.noticedEnvironmentChanges) &&
    (surveyData.noticedEnvironmentChanges === '否' || Boolean(surveyData.environmentImpact.trim())) &&
    Boolean(surveyData.narrativePresence)

  const submitSurvey = async () => {
    if (!surveyValid || submitting) return
    setSubmitting(true)
    track('survey_submit_click')

    const payload = {
      sessionId,
      userId,
      totalDurationMs: Date.now() - experimentStartAtRef.current,
      practiceAnswer,
      formalAnswers,
      surveyData,
      surveyQuestionDurationsMs,
      eventBufferLength: eventsRef.current.length,
    }

    try {
      await flushEvents()
      await submitExperiment(payload)
      track('survey_submit_success')
      setSubmitSuccess(true)
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
        slotOverride: 14,
      },
    ],
    [],
  )

  const formalSceneItems = useMemo(
    () => {
      const slotOverrides: Record<string, number> = {
        'nano-repair-spray': 9,
        'smart-speaker': 7,
        'holographic-projector': 15,
        'smart-environment-lamp': 14,
        laptop: 6,
        smartphone: 5,
        'digital-wallet': 3,
        'smart-coffee-machine': 1,
        'smart-air-conditioner': 0,
        'plasma-lighter': 14,
      }

      return FORMAL_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        answered: formalAnsweredIds.has(item.id),
        slotOverride: slotOverrides[item.id],
      }))
    },
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


  const navSteps = [
    { key: 'consent', label: 'Step 0 知情同意' },
    { key: 'tutorial', label: 'Step 1 操作教学' },
    { key: 'formal', label: 'Step 2 正式试验' },
    { key: 'survey', label: 'Step 3 问卷与反馈' },
    { key: 'thanks', label: '☑️谢谢参与' },
  ] as const

  const activeNavStepKey = submitSuccess
    ? 'thanks'
    : step === 'welcome'
      ? 'consent'
      : step === 'practice' || step === 'tutorial'
        ? 'tutorial'
        : step === 'formal'
          ? 'formal'
          : 'survey'

  return (
    <div className={isSceneStep ? 'app-shell app-shell--scene' : 'app-shell'}>
      <header className={isSceneStep ? 'global-nav global-nav--overlay' : 'global-nav'}>
        <div className="global-nav__brand">Ubik Experiment</div>
        <nav className="global-nav__steps" aria-label="实验步骤导航">
          {navSteps.map((item, index) => (
            <div key={item.key} className="global-nav__step-item-wrap">
              <span className={item.key === activeNavStepKey ? 'global-nav__step-item active' : 'global-nav__step-item'}>
                {item.label}
                {item.key === 'formal' && step === 'formal' && (
                  <span className="global-nav__progress">（{formalAnswers.length}/10）</span>
                )}
              </span>
              {index < navSteps.length - 1 && <span className="global-nav__step-sep">----</span>}
            </div>
          ))}
        </nav>
      </header>

      {loading && <div className="loading">加载中，请稍候...</div>}

      {!loading && step === 'welcome' && (
        <section className="panel hero">
          <h2>尤比克退行认知匹配实验</h2>
          <p className="hero-intro">
            在著名科幻作家菲利普迪克所著小说《尤比克》的世界观中，现代物品会“退行”为1930年代在功能上对应的物品，你将进入
            2030现代客厅并完成 10 道判断题。
          </p>

          <label className="phone-input-row">
            <span>填写用户ID：请填写你的电话号码</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="请输入电话号码"
              value={participantPhone}
              onChange={(e) => {
                const nextValue = e.target.value.replace(/[^\d]/g, '').slice(0, 20)
                setParticipantPhone(nextValue)
              }}
            />
          </label>

          <button
            className="start-btn"
            disabled={!participantPhone}
            onClick={() => {
              track('start_experiment_click', { participantPhone })
              goToStep('practice')
            }}
          >
            开始
          </button>
        </section>
      )}

      {!loading && step === 'practice' && (
        <section className="scene-wrap">
          {!practicePanelOpen && (
            <div className="scene-overlay-top scene-overlay-top--tutorial">
              <div>
                <p>键盘W,A, S, D 可控制前后左右移动，鼠标可控制视角</p>
              </div>
            </div>
          )}

          <div className="scene scene--practice">
            {!practicePanelOpen && (
              <div className="scene-hud scene-hud--practice">
                <span>
                  {practiceActiveItemIds.length > 0
                    ? '请点击物体'
                    : '请靠近物体直到物体发光'}
                </span>
              </div>
            )}
            <ThreeScene
              items={practiceSceneItems}
              onItemClick={handlePracticeItemClick}
              onActiveItemsChange={setPracticeActiveItemIds}
              scenePreset="practice"
              interactionLocked={practicePanelOpen}
              renderUnusedSlots={false}
              initialCameraPosition={[-1.5, 2.4, 5.6]}
              initialTarget={[-3.2, 1.25, 3.5]}
            />
          </div>

          {practicePanelOpen && (
            <div className="qa-panel qa-panel--practice">
              {showEnterFormalButton ? (
                <>
                  <h3 className="practice-finish-title">恭喜完成操作教学环节！</h3>
                  <div className="bottom-action bottom-action--in-panel">
                    <button onClick={enterFormal}>进入正式实验</button>
                  </div>
                </>
              ) : (
                <>
                  {!showPracticeFeedback && (
                    <>
                      <div className="qa-panel-meta">练习题（单题）</div>
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

                      <button disabled={!practiceSelected} onClick={submitPractice}>
                        确认选择
                      </button>
                    </>
                  )}

                  {showPracticeFeedback && practiceAnswer && (
                    <div className={practiceAnswer.isCorrect ? 'feedback feedback--correct' : 'feedback feedback--wrong'}>
                      <strong>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctTitle
                          : PRACTICE_FEEDBACK_TEXT.wrongTitle}
                      </strong>
                      <p>
                        {practiceAnswer.isCorrect
                          ? PRACTICE_FEEDBACK_TEXT.correctReason
                          : PRACTICE_FEEDBACK_TEXT.wrongReason}
                      </p>
                    </div>
                  )}

                  {showPracticeFeedback && !showEnterFormalButton && practiceFeedbackShownAt && (
                    <div className="practice-delay-tip">
                      {Math.max(0, 3 - Math.floor((nowMs - practiceFeedbackShownAt) / 1000))} 秒后可进入正式实验
                    </div>
                  )}
                </>
              )}
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

      {!loading && step === 'survey' && !submitSuccess && (
        <section className="panel survey">
          <h2>实验完成！感谢你的参与！</h2>
          <p className="survey-intro">针对你刚才交互过的 10 组物品，请根据实际感受打分。</p>

          <label>
            1. 回顾刚才的交互过程，请评估各物品“退行判断”的整体难度（1-7分）
            <select
              value={surveyData.taskDifficulty}
              onChange={(e) => {
                markSurveyAnswered('taskDifficulty')
                setSurveyData((prev) => ({ ...prev, taskDifficulty: e.target.value }))
              }}
            >
              <option value="">请选择</option>
              {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                <option key={score} value={String(score)}>
                  {score}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>2. 对于你认为难度 ≥5 分的物品，主要困难来源于？（可多选）</legend>
            {[
              '视觉干扰项（如形状、颜色）非常有迷惑性',
              '难以联想到100年前对应功能的物理实体（逻辑跨度大）',
              '不确定《尤比克》世界观下的演变规则',
              '选项中没有我认为完全合理的答案',
            ].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="checkbox"
                  checked={surveyData.coreDifficulties.includes(item)}
                  onChange={(e) => {
                    markSurveyAnswered('coreDifficulties')
                    setSurveyData((prev) => ({
                      ...prev,
                      coreDifficulties: e.target.checked
                        ? [...prev.coreDifficulties, item]
                        : prev.coreDifficulties.filter((v) => v !== item),
                    }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>3. 你在判断“应该退化成什么”时，最主要依据是？（可多选）</legend>
            {[
              '视觉匹配（形状、材质、空间比例）',
              '功能外推（用途一致但技术层级属于旧时代）',
              '原著记忆（《尤比克》情节或设定）',
              '直觉驱动（第一反应）',
            ].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="checkbox"
                  checked={surveyData.decisionBases.includes(item)}
                  onChange={(e) => {
                    markSurveyAnswered('decisionBases')
                    setSurveyData((prev) => ({
                      ...prev,
                      decisionBases: e.target.checked
                        ? [...prev.decisionBases, item]
                        : prev.decisionBases.filter((v) => v !== item),
                    }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>4. 你是否察觉到环境中其他细节变化（如灯光、噪声、墙面等）？</legend>
            {['是', '否'].map((item) => (
              <label key={item} className="radio-line">
                <input
                  type="radio"
                  name="noticedEnvironmentChanges"
                  checked={surveyData.noticedEnvironmentChanges === item}
                  onChange={() => {
                    markSurveyAnswered('noticedEnvironmentChanges')
                    setSurveyData((prev) => ({ ...prev, noticedEnvironmentChanges: item }))
                  }}
                />
                {item}
              </label>
            ))}
          </fieldset>

          {surveyData.noticedEnvironmentChanges === '是' && (
            <label>
              若选择“是”，请简述这些变化是否增强了你对“退行逻辑”的理解或影响了你的决策
              <textarea
                maxLength={500}
                value={surveyData.environmentImpact}
                onChange={(e) => {
                  markSurveyAnswered('environmentImpact')
                  setSurveyData((prev) => ({ ...prev, environmentImpact: e.target.value }))
                }}
                rows={4}
                placeholder="请输入你的说明"
              />
            </label>
          )}

          <label>
            5. 你多大程度“进入”了这个正在崩塌的《尤比克》虚拟世界？（1-7分）
            <select
              value={surveyData.narrativePresence}
              onChange={(e) => {
                markSurveyAnswered('narrativePresence')
                setSurveyData((prev) => ({ ...prev, narrativePresence: e.target.value }))
              }}
            >
              <option value="">请选择</option>
              {[1, 2, 3, 4, 5, 6, 7].map((score) => (
                <option key={score} value={String(score)}>
                  {score}
                </option>
              ))}
            </select>
          </label>

          <label>
            6. 请问您对本次试验有什么建议（选填）
            <textarea
              maxLength={500}
              value={surveyData.feedback}
              onChange={(e) => {
                markSurveyAnswered('feedback')
                setSurveyData((prev) => ({ ...prev, feedback: e.target.value }))
              }}
              rows={5}
              placeholder="请输入你的建议"
            />
          </label>

          <button className="survey-submit-btn" disabled={!surveyValid || submitting} onClick={() => void submitSurvey()}>
            {submitting ? '提交中...' : '提交问卷'}
          </button>
        </section>
      )}

      {!loading && step === 'survey' && submitSuccess && (
        <section className="survey-success-only">
          <h2>提交成功！再次感谢您的参与！</h2>
        </section>
      )}

      {toast && !submitSuccess && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
